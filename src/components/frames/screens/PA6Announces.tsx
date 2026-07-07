// PA6 — Onglet "Annonces" : timeline visuelle des événements majeurs du manoir.
// Marque automatiquement comme "lues" les annonces quand l'onglet est ouvert,
// et expose un hook pour afficher un badge / des toasts ailleurs dans l'app.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
import { PA5Players } from "./PA5Players";

export type Event =
  | { kind: "death"; tour: number; phase: string; player: AnyPlayer; reason?: string }
  | { kind: "prison"; tour: number; player: AnyPlayer }
  | { kind: "special"; tour: number; icon: ReactNode; text: string };

// ---------- Helpers ----------
function eventId(e: Event): string {
  if (e.kind === "special") return `s-${e.tour}-${e.text}`;
  if (e.kind === "death") return `d-${e.tour}-${e.player.id}`;
  return `p-${e.tour}-${e.player.id}`;
}

// Accent unique de la DA pour TOUS les tours — l'or « détective » de la
// chronique (plus de dégradé multicolore, qui n'avait pas de sens sémantique).
// La hiérarchie temporelle est portée par la timeline (position + opacité), pas
// par la teinte : chaque tour partage la même grammaire visuelle.
export function tourAccent(_tour: number) {
  return {
    text: "oklch(0.82 0.13 82)", // or parchemin
    border: "oklch(0.62 0.12 80 / 0.45)",
    bg: "oklch(0.30 0.06 70 / 0.18)",
    dot: "oklch(0.78 0.15 78)",
  };
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
      icon: <Droplet className="size-5" aria-hidden />,
      text: "Un joueur a été mordu cette nuit..",
    });
  }
  for (const tour of chasseurCycles) {
    events.push({
      kind: "special",
      tour,
      icon: <Crosshair className="size-5" aria-hidden />,
      text: "Un joueur devient Chasseur de Vampire..",
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
  } catch {}
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
  const [showPlayers, setShowPlayers] = useState(false);
  const [filter, setFilter] = useState<"alive" | "prison" | "dead">("alive");

  // Marquer "vu" tout ce qui est affiché à l'ouverture (et à l'arrivée de nouveaux events).
  const [seenAtMount, setSeenAtMount] = useState<Set<string>>(() =>
    readSeen(ctx.game.id, ctx.me.id),
  );
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
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Hero */}
      <div className="relative px-5 pt-5 pb-4 border-b border-border bg-gradient-to-b from-card/60 to-transparent">
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
            onClick={() => setShowPlayers(true)}
            className="shrink-0 h-10 pl-3 pr-3.5 rounded-xl border border-border bg-gradient-to-b from-card/80 to-card/50 hover:from-card hover:to-card/80 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm hover:shadow"
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
          </button>
        </div>

        {/* Vitalité */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <span>Survivants</span>
            <span className="tabular-nums">
              {alive.length}/{totalPlayers}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-card overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400 transition-all"
              style={{ width: `${alivePct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat
            Icon={Sprout}
            label="En vie"
            value={alive.length}
            tone="emerald"
            active={filter === "alive"}
            onClick={() => setFilter("alive")}
          />
          <Stat
            Icon={Lock}
            label="Prison"
            value={imprisoned.length}
            tone="amber"
            active={filter === "prison"}
            onClick={() => setFilter("prison")}
          />
          <Stat
            Icon={Skull}
            label="Morts"
            value={dead.length}
            tone="rose"
            active={filter === "dead"}
            onClick={() => setFilter("dead")}
          />
        </div>

        {/* Récap joueurs filtrés */}
        <div className="mt-3">
          <PlayersRecap
            players={filter === "alive" ? alive : filter === "prison" ? imprisoned : dead}
            roles={ctx.roles}
            filter={filter}
            onPlayerClick={(pid) => setOpenPlayerId(pid)}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4 flex-1">
        {tours.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
            <Flame className="size-7 mx-auto opacity-60" aria-hidden />
            <p className="mt-2 text-xs text-muted-foreground italic">
              Le manoir est silencieux… Aucune annonce pour le moment.
            </p>
          </div>
        ) : (
          <div className="relative pl-5">
            {/* Ligne verticale */}
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gradient-to-b from-border via-border/60 to-transparent" />
            <div className="space-y-5">
              {tours.map((tour) => {
                const accent = tourAccent(tour);
                const list = sortTourEvents(byTour.get(tour)!);
                return (
                  <section key={tour} className="relative">
                    {/* Dot */}
                    <span
                      className="absolute -left-[18px] top-1.5 size-3 rounded-full ring-2 ring-background"
                      style={{ background: accent.dot, boxShadow: `0 0 12px ${accent.dot}` }}
                    />
                    <div className="flex items-baseline gap-2">
                      <h3
                        className="font-display text-sm font-bold uppercase tracking-widest"
                        style={{ color: accent.text }}
                      >
                        Tour {tour}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">
                        · {list.length} événement{list.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-2 stagger">
                      {list.map((e, i) => {
                        const id = eventId(e);
                        const isNew = !seenAtMount.has(id);
                        return (
                          <EventCard
                            key={`${tour}-${i}`}
                            event={e}
                            roles={ctx.roles}
                            accent={accent}
                            isNew={isNew}
                            onPlayerClick={(pid) => setOpenPlayerId(pid)}
                          />
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}
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

      {/* Modal joueurs */}
      {showPlayers && (
        <div className="fixed inset-0 z-40 bg-background flex flex-col max-w-md mx-auto">
          <button
            onClick={() => setShowPlayers(false)}
            className="self-start p-4 text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← retour
          </button>
          <div className="flex-1 overflow-y-auto">
            <PA5Players {...ctx} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Event card ----------
export function EventCard({
  event,
  roles,
  accent,
  isNew,
  onPlayerClick,
  className = "",
}: {
  event: Event;
  roles: Map<string, RoleRow>;
  accent: { text: string; border: string; bg: string; dot: string };
  isNew: boolean;
  onPlayerClick?: (id: string) => void;
  className?: string;
}) {
  if (event.kind === "special") {
    return (
      <li
        className={`elevate rounded-lg border p-3 flex items-center gap-3 relative ${className}`}
        style={{ borderColor: accent.border, background: accent.bg }}
      >
        <div className="grid size-9 shrink-0 place-items-center" style={{ color: accent.text }}>
          {event.icon}
        </div>
        <div className="flex-1 text-sm font-medium italic">{event.text}</div>
        {isNew && <NewPill />}
      </li>
    );
  }
  const meta = (event.player.role_meta ?? {}) as Record<string, unknown>;
  const av = avatarOf(meta.avatar as string | undefined, event.player.id);

  if (event.kind === "death") {
    const cleaned = !!meta.death_cleaned;
    const role = roles.get(event.player.role_slug ?? "");
    const faction = cleaned ? "Effacé" : (role?.faction ?? "Inconnue");
    const color = cleaned ? "var(--muted-foreground)" : roleColor(role);
    const hasTestament =
      typeof meta.testament === "string" && (meta.testament as string).length > 0;
    return (
      <li
        className={`elevate rounded-lg border border-destructive/30 bg-destructive/5 p-3 relative ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-10 rounded-full bg-card flex items-center justify-center overflow-hidden grayscale opacity-80">
              <AvatarImg avatar={av} size={40} />
            </div>
            <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center ring-2 ring-background">
              <Skull className="size-3" aria-hidden />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate">{event.player.pseudo}</span>
              {isNew && <NewPill />}
            </div>
            <div className="text-[11px] text-muted-foreground">
              n'est plus en vie{" "}
              <span className="font-medium" style={{ color }}>
                · {faction}
              </span>
            </div>
          </div>
          {hasTestament && (
            <button
              onClick={() => onPlayerClick?.(event.player.id)}
              className="shrink-0 h-9 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition flex items-center gap-1.5 text-xs font-medium active:scale-95"
              title="Lire le testament"
            >
              <Pen size={12} /> Testament
            </button>
          )}
        </div>
      </li>
    );
  }

  // prison
  return (
    <li
      className={`elevate rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 relative ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="size-10 rounded-full bg-card flex items-center justify-center overflow-hidden">
            <AvatarImg avatar={av} size={40} />
          </div>
          <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-amber-500 text-amber-50 flex items-center justify-center ring-2 ring-background">
            <Lock className="size-3" aria-hidden />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold truncate">{event.player.pseudo}</span>
            {isNew && <NewPill />}
          </div>
          <div className="text-[11px] text-muted-foreground">part en prison</div>
        </div>
      </div>
    </li>
  );
}

function NewPill() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gold/20 text-gold text-[9px] font-bold uppercase tracking-wider ring-1 ring-gold/40 animate-pulse">
      <span className="size-1 rounded-full bg-gold" /> Nouveau
    </span>
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
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    rose: "border-destructive/30 bg-destructive/5 text-destructive",
  }[tone];
  const activeRing = active
    ? {
        emerald: "ring-2 ring-emerald-400/70",
        amber: "ring-2 ring-amber-400/70",
        rose: "ring-2 ring-destructive/70",
      }[tone]
    : "opacity-70 hover:opacity-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press w-full rounded-lg border px-2 py-2 ${styles} ${activeRing}`}
    >
      <div className="flex items-center justify-center gap-1.5">
        <Icon className="size-4" aria-hidden />
        <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
      </div>
      <div className="mt-1 text-center text-[9px] uppercase tracking-wider opacity-80">{label}</div>
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
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/30 p-3 text-center text-[11px] text-muted-foreground italic">
        {empty}
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-1.5">
      {players.map((p) => {
        const meta = (p.role_meta ?? {}) as Record<string, unknown>;
        const av = avatarOf(meta.avatar as string | undefined, p.id);
        const cleaned = !!meta.death_cleaned;
        const role = roles.get(p.role_slug ?? "");
        let color = "var(--foreground)";
        if (filter === "dead") {
          color = cleaned ? "var(--muted-foreground)" : roleColor(role);
        }
        const hasTestament =
          filter === "dead" &&
          typeof meta.testament === "string" &&
          (meta.testament as string).length > 0;
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => hasTestament && onPlayerClick(p.id)}
              disabled={!hasTestament}
              className={`w-full flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2 py-1.5 ${hasTestament ? "hover:bg-card/70 active:scale-95 transition" : "cursor-default"}`}
            >
              <span
                className={`inline-flex size-7 rounded-full overflow-hidden bg-background border border-border shrink-0 ${filter === "dead" ? "grayscale opacity-80" : ""}`}
              >
                <AvatarImg avatar={av} size={28} />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[12px] font-semibold truncate" style={{ color }}>
                  {p.pseudo}
                </span>
              </span>
              {hasTestament && <Pen size={11} className="text-amber-400 shrink-0" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
