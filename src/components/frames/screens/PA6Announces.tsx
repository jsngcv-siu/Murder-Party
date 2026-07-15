// PA6 — Onglet "Annonces" : timeline visuelle des événements majeurs du manoir.
// Marque automatiquement comme "lues" les annonces quand l'onglet est ouvert,
// et expose un hook pour afficher un badge / des toasts ailleurs dans l'app.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Crosshair,
  Droplet,
  Flame,
  Lock,
  Pen,
  Scroll,
  Skull,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FrameContext } from "../registry";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { roleColor } from "@/lib/factionText";
import type { RoleRow } from "@/engine/actions";

// Type structurel pour accepter PlayerRow venant aussi bien de lib/game que de engine/actions
type AnyPlayer = {
  id: string;
  pseudo: string;
  is_mj: boolean;
  is_alive: boolean;
  is_imprisoned: boolean;
  role_slug: string | null;
  role_meta: unknown;
};
import { GazetteCard } from "./T1Transition";

export type Event =
  | { kind: "death"; tour: number; phase: string; player: AnyPlayer; reason?: string }
  | { kind: "prison"; tour: number; player: AnyPlayer }
  | {
      kind: "special";
      tour: number;
      icon: ReactNode;
      text: string;
      // Cadre illustré dédié (Morsure de vampire / éveil du Chasseur).
      variant?: "bite" | "chasseur";
      heading?: string;
    };

// ---------- Helpers ----------
function eventId(e: Event): string {
  if (e.kind === "special") return `s-${e.tour}-${e.text}`;
  if (e.kind === "death") return `d-${e.tour}-${e.player.id}`;
  return `p-${e.tour}-${e.player.id}`;
}

export function collectAnnouncements(players: AnyPlayer[]): Event[] {
  const events: Event[] = [];
  // Annonces ANONYMES (on ne révèle jamais QUI), une par tour concerné :
  //  • morsure de vampire → via `converted_cycle`
  //  • émergence du Chasseur → via `chasseur_awakened_cycle`
  const biteCycles = new Set<number>();
  const chasseurCycles = new Set<number>();
  for (const p of players) {
    if (p.is_mj) continue;
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    if (!p.is_alive && typeof m.death_cycle === "number") {
      events.push({
        kind: "death",
        tour: m.death_cycle as number,
        phase: (m.death_phase as string) ?? "",
        player: p,
        reason: m.death_reason as string | undefined,
      });
    }
    if (p.is_imprisoned && typeof m.imprisoned_since_cycle === "number") {
      events.push({ kind: "prison", tour: m.imprisoned_since_cycle as number, player: p });
    }
    if (m.converted === true && typeof m.converted_cycle === "number") {
      biteCycles.add(m.converted_cycle as number);
    }
    if (p.role_slug === "chasseur_de_vampire" && typeof m.chasseur_awakened_cycle === "number") {
      chasseurCycles.add(m.chasseur_awakened_cycle as number);
    }
  }
  for (const tour of biteCycles) {
    events.push({
      kind: "special",
      tour,
      variant: "bite",
      icon: <Droplet className="size-5" aria-hidden />,
      heading: "★ MORSURE D'UN VAMPIRE",
      text: "Un joueur a été mordu..",
    });
  }
  for (const tour of chasseurCycles) {
    events.push({
      kind: "special",
      tour,
      variant: "chasseur",
      icon: <Crosshair className="size-5" aria-hidden />,
      heading: "★ UN CHASSEUR DE VAMPIRE S'ÉVEILLE",
      text: "Un joueur devient Chasseur..",
    });
  }
  // Indices distribués au setup → annonce générique au tour 1 (jamais QUI).
  const hasIndices = players.some((p) => {
    if (p.is_mj) return false;
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    const inv = (m.inventory as Array<{ slug?: string }> | undefined) ?? [];
    return inv.some((it) => it?.slug === "indice");
  });
  if (hasIndices) {
    events.push({
      kind: "special",
      tour: 1,
      icon: <Scroll className="size-5" aria-hidden />,
      text: "Certains invités ont reçu des indices. Enquêtez.",
    });
  }
  return events;
}

// ---------- Chronologie intra-tour ----------
// Rang de récence d'un événement DANS un tour (plus grand = plus récent).
// Un tour se déroule free → annonce → gathering → vote : la prison (verdict du
// vote) clôt donc le tour, tandis que les événements « de nuit » (morsures) le
// précèdent. Sans ce tri, les événements sortaient dans l'ordre de découverte
// (morts, puis prisons, puis specials), ce qui inversait la chronologie.
const PHASE_RANK: Record<string, number> = { free: 0, annonce: 1, gathering: 2, vote: 3 };
function eventRecency(e: Event): number {
  if (e.kind === "prison") return PHASE_RANK.vote; // le verdict ferme le tour
  if (e.kind === "death") return PHASE_RANK[e.phase] ?? PHASE_RANK.gathering;
  return -1; // annonces « de nuit »/setup en premier
}

/** Trie les événements d'un même tour du plus récent (haut) au plus ancien (bas). */
export function sortTourEvents(list: Event[]): Event[] {
  return list
    .map((e, i) => [e, i] as const)
    .sort((a, b) => eventRecency(b[0]) - eventRecency(a[0]) || a[1] - b[1]) // stable
    .map(([e]) => e);
}

// ---------- "Unread" tracking via localStorage ----------
function storageKey(gameId: string, meId: string) {
  return `pa6-seen-${gameId}-${meId}`;
}

function readSeen(gameId: string, meId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(gameId, meId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(gameId: string, meId: string, seen: Set<string>) {
  try {
    localStorage.setItem(storageKey(gameId, meId), JSON.stringify(Array.from(seen)));
  } catch {
    // Le suivi de lecture reste optionnel si le stockage local est indisponible.
  }
}

/** Hook utilisé par PlayerShell pour afficher un badge sur l'onglet Annonces. */
export function useAnnouncementsUnread(gameId: string, meId: string, players: AnyPlayer[]) {
  const events = useMemo(() => collectAnnouncements(players), [players]);
  const ids = useMemo(() => events.map(eventId), [events]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const seen = readSeen(gameId, meId);
    let n = 0;
    for (const id of ids) if (!seen.has(id)) n++;
    setUnread(n);
    const onStorage = () => {
      const s = readSeen(gameId, meId);
      let k = 0;
      for (const id of ids) if (!s.has(id)) k++;
      setUnread(k);
    };
    window.addEventListener("pa6-seen-changed", onStorage);
    return () => window.removeEventListener("pa6-seen-changed", onStorage);
  }, [gameId, meId, ids]);

  return unread;
}

// ---------- Main ----------
export function PA6Announces(ctx: FrameContext) {
  const { players, game } = ctx;
  const all = players.filter((p) => !p.is_mj);
  const alive = all.filter((p) => p.is_alive && !p.is_imprisoned);
  const imprisoned = all.filter((p) => p.is_alive && p.is_imprisoned);
  const dead = all.filter((p) => !p.is_alive);

  const events = collectAnnouncements(players);
  const byTour = new Map<number, Event[]>();
  for (const e of events) {
    if (!byTour.has(e.tour)) byTour.set(e.tour, []);
    byTour.get(e.tour)!.push(e);
  }
  const tours = Array.from(byTour.keys()).sort((a, b) => b - a);

  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  // Le suivi des joueurs est replié par défaut : les faits du tour passent avant
  // la grille (cf. ART_DIRECTION). Le bouton « Joueurs » de l'en-tête le déplie.
  const [showLedger, setShowLedger] = useState(false);
  const [filter, setFilter] = useState<"alive" | "prison" | "dead">("alive");

  // Marquer "vu" tout ce qui est affiché à l'ouverture (et à l'arrivée de nouveaux events).
  useEffect(() => {
    const seen = readSeen(ctx.game.id, ctx.me.id);
    let changed = false;
    for (const e of events) {
      const id = eventId(e);
      if (!seen.has(id)) {
        seen.add(id);
        changed = true;
      }
    }
    if (changed) {
      writeSeen(ctx.game.id, ctx.me.id, seen);
      window.dispatchEvent(new Event("pa6-seen-changed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, ctx.game.id, ctx.me.id]);

  const openPlayer = openPlayerId ? players.find((p) => p.id === openPlayerId) : null;
  const openMeta = (openPlayer?.role_meta ?? {}) as Record<string, unknown>;
  const openAv = avatarOf(openMeta.avatar as string | undefined, openPlayer?.id);
  const openTestament =
    typeof openMeta.testament === "string" && (openMeta.testament as string).length > 0
      ? (openMeta.testament as string)
      : null;

  const totalPlayers = all.length;
  const alivePct = totalPlayers ? Math.round((alive.length / totalPlayers) * 100) : 0;

  return (
    <div className="cork-surface h-full overflow-y-auto">
      <div className="px-4 pb-7 pt-5 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Scroll size={12} /> Chroniques du manoir
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold leading-tight">
              Tour {game.current_tour}
            </h2>
          </div>
          <button
            onClick={() => setShowLedger((v) => !v)}
            aria-expanded={showLedger}
            aria-controls="presence-ledger"
            className={`press flex h-10 shrink-0 items-center gap-2 rounded-lg border pl-3 pr-2.5 text-xs font-semibold text-[#ecd7b0] transition ${
              showLedger
                ? "border-[#a77c42] bg-[#24100c]"
                : "border-[#6a3b27] bg-[#1d0c08] hover:border-[#a77c42]"
            }`}
          >
            <div className="flex items-center justify-center -space-x-1">
              {all.slice(0, 3).map((p, idx) => {
                const m = (p.role_meta ?? {}) as Record<string, unknown>;
                const a = avatarOf(m.avatar as string | undefined, p.id);
                return (
                  <span
                    key={p.id}
                    className="relative inline-flex size-5 items-center justify-center rounded-full bg-background border border-border overflow-hidden"
                    style={{ zIndex: 3 - idx }}
                  >
                    <AvatarImg avatar={a} size={18} />
                  </span>
                );
              })}
              {all.length > 3 && (
                <span
                  className="relative inline-flex size-5 items-center justify-center rounded-full bg-border/60 border border-border text-[8px] font-bold text-muted-foreground"
                  style={{ zIndex: 0 }}
                >
                  +{all.length - 3}
                </span>
              )}
            </div>
            <span>Joueurs</span>
            <ChevronDown
              className={`size-4 text-[#bda57d] transition-transform ${showLedger ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        {showLedger && (
          <div id="presence-ledger" className="anim-tab-in">
            <PresenceLedger
              alive={alive}
              imprisoned={imprisoned}
              dead={dead}
              totalPlayers={totalPlayers}
              alivePct={alivePct}
              filter={filter}
              roles={ctx.roles}
              onFilter={setFilter}
              onPlayerClick={setOpenPlayerId}
            />
          </div>
        )}

        <section className="mt-6" aria-labelledby="announcements-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-hand text-base leading-none text-[#e8b44a]">
                les faits du manoir
              </div>
              <h3
                id="announcements-title"
                className="mt-1 font-display text-xl leading-tight text-foreground"
              >
                Annonces
              </h3>
            </div>
            {tours.length > 0 && (
              <span className="pb-0.5 text-xs tabular-nums text-muted-foreground">
                {events.length} fait{events.length > 1 ? "s" : ""} consigné
                {events.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-4">
            {tours.length === 0 ? (
              <div className="paper pin mx-auto max-w-[300px] border border-[#d7c493]/70 px-5 py-8 text-center">
                <Flame className="mx-auto size-7 text-[#8b6b36]" aria-hidden />
                <p className="mt-2 text-sm italic text-[#6f573b]">
                  Le manoir est silencieux… Aucune annonce pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {tours.map((tour) => {
                  const list = sortTourEvents(byTour.get(tour)!);

                  return (
                    <section key={tour} aria-labelledby={`tour-${tour}-title`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h4
                          id={`tour-${tour}-title`}
                          className="font-display text-sm uppercase tracking-[0.12em] text-[#e8b44a]"
                        >
                          Tour {tour}
                        </h4>
                        <span className="text-[11px] text-[#e7d6ad]/75">
                          {list.length} événement{list.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="stagger mt-3 flex flex-col gap-3.5">
                        {list.map((event) => (
                          <GazetteCard
                            key={eventId(event)}
                            event={event}
                            roles={ctx.roles}
                            onOpenTestament={setOpenPlayerId}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal testament */}
      {openPlayerId && openPlayer && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-6 max-w-md mx-auto">
          <button
            onClick={() => setOpenPlayerId(null)}
            className="self-start text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← retour
          </button>
          <div className="mt-4 text-center">
            <div className="flex justify-center drop-shadow-lg">
              <AvatarImg avatar={openAv} size={80} />
            </div>
            <h2 className="mt-3 text-2xl font-bold font-display">{openPlayer.pseudo}</h2>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Skull className="size-3.5" aria-hidden /> Défunt
            </div>
          </div>
          {openTestament ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm italic relative">
              <div className="absolute -top-2 left-3 px-2 bg-background text-[10px] uppercase tracking-widest text-amber-400">
                Testament
              </div>
              « {openTestament} »
            </div>
          ) : (
            <p className="mt-6 text-center text-xs text-muted-foreground italic">
              Aucun testament laissé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PresenceLedger({
  alive,
  imprisoned,
  dead,
  totalPlayers,
  alivePct,
  filter,
  roles,
  onFilter,
  onPlayerClick,
}: {
  alive: AnyPlayer[];
  imprisoned: AnyPlayer[];
  dead: AnyPlayer[];
  totalPlayers: number;
  alivePct: number;
  filter: "alive" | "prison" | "dead";
  roles: Map<string, RoleRow>;
  onFilter: (filter: "alive" | "prison" | "dead") => void;
  onPlayerClick: (id: string) => void;
}) {
  const selected = filter === "alive" ? alive : filter === "prison" ? imprisoned : dead;
  const label = filter === "alive" ? "En vie" : filter === "prison" ? "En prison" : "Morts";

  return (
    <section
      className="mt-4 rounded-lg border border-[#6a3b27] bg-[#1b0c08] p-3"
      aria-labelledby="presence-title"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-[#e8b44a]" aria-hidden />
          <h3
            id="presence-title"
            className="font-display text-xs uppercase tracking-[0.12em] text-[#ecd7b0]"
          >
            Suivi des joueurs
          </h3>
        </div>
        <span className="text-[11px] tabular-nums text-[#bda57d]">{totalPlayers} à la table</span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#080302]">
        <div
          className="h-full bg-[#8ea96e] transition-[width] duration-200"
          style={{ width: `${alivePct}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Stat
          Icon={Sprout}
          label="En vie"
          value={alive.length}
          tone="emerald"
          active={filter === "alive"}
          onClick={() => onFilter("alive")}
        />
        <Stat
          Icon={Lock}
          label="Prison"
          value={imprisoned.length}
          tone="amber"
          active={filter === "prison"}
          onClick={() => onFilter("prison")}
        />
        <Stat
          Icon={Skull}
          label="Morts"
          value={dead.length}
          tone="rose"
          active={filter === "dead"}
          onClick={() => onFilter("dead")}
        />
      </div>

      <div className="mt-3 border-t border-[#6a3b27] pt-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-hand text-base leading-none text-[#e8b44a]">{label}</span>
          <span className="text-[11px] text-[#bda57d]">
            {selected.length} joueur{selected.length > 1 ? "s" : ""}
          </span>
        </div>
        <PlayersRecap
          players={selected}
          roles={roles}
          filter={filter}
          onPlayerClick={onPlayerClick}
        />
      </div>
    </section>
  );
}

function Stat({
  Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
  active?: boolean;
  onClick?: () => void;
}) {
  const styles = {
    emerald: "border-[#6f8b55] text-[#b6d39a]",
    amber: "border-[#a87935] text-[#e5bb68]",
    rose: "border-[#9b372f] text-[#e37466]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`press min-h-14 rounded-md border bg-[#24100c] px-1.5 py-2 text-center transition ${styles} ${active ? "ring-1 ring-current" : "opacity-70 hover:opacity-100"}`}
    >
      <div className="flex items-center justify-center gap-1">
        <Icon className="size-3.5" aria-hidden />
        <span className="font-display text-lg tabular-nums leading-none">{value}</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.08em]">{label}</div>
    </button>
  );
}

function PlayersRecap({
  players,
  roles,
  filter,
  onPlayerClick,
}: {
  players: AnyPlayer[];
  roles: Map<string, RoleRow>;
  filter: "alive" | "prison" | "dead";
  onPlayerClick: (id: string) => void;
}) {
  if (players.length === 0) {
    const empty =
      filter === "alive"
        ? "Aucun survivant."
        : filter === "prison"
          ? "Personne en prison."
          : "Aucun mort.";
    return <p className="py-1 text-[11px] italic text-[#bda57d]">{empty}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {players.map((player) => {
        const meta = (player.role_meta ?? {}) as Record<string, unknown>;
        const avatar = avatarOf(meta.avatar as string | undefined, player.id);
        const cleaned = !!meta.death_cleaned;
        const role = roles.get(player.role_slug ?? "");
        const textColor = filter === "dead" ? (cleaned ? "#bda57d" : roleColor(role)) : "#ecd7b0";
        const hasTestament =
          filter === "dead" &&
          typeof meta.testament === "string" &&
          (meta.testament as string).length > 0;
        const content = (
          <>
            <span
              className={`inline-flex size-5 overflow-hidden rounded-full border border-[#6a3b27] ${filter === "dead" ? "grayscale opacity-80" : ""}`}
            >
              <AvatarImg avatar={avatar} size={20} />
            </span>
            <span className="max-w-20 truncate">{player.pseudo}</span>
            {hasTestament && <Pen className="size-3 text-[#e8b44a]" />}
          </>
        );

        return (
          <li key={player.id}>
            {hasTestament ? (
              <button
                type="button"
                onClick={() => onPlayerClick(player.id)}
                className="press inline-flex h-7 items-center gap-1 rounded-md border border-[#6a3b27] bg-[#24100c] px-1.5 text-[11px] font-medium"
                style={{ color: textColor }}
              >
                {content}
              </button>
            ) : (
              <span
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#6a3b27] bg-[#24100c] px-1.5 text-[11px] font-medium"
                style={{ color: textColor }}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
