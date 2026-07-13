// PlayerEventModal — fenêtres centrées stylisées pour les événements personnels
// du joueur : mort, prison, exécution, libération, morsure de vampire.
//
// S'abonne à la table `notifications` filtrée sur `player_id = me.id`, met les
// événements pertinents en file d'attente, et les affiche un par un. Pour ne
// pas chevaucher les overlays de transition de phase (T1/T2/T3 qui durent
// INTRO_MS depuis `phase_started_at`), on diffère l'affichage tant que la
// fenêtre d'intro n'est pas terminée.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow } from "@/lib/game";
import type { RoleRow } from "@/engine/actions";
import { RoleIcon } from "@/components/RoleIcon";
import { introMsFor } from "@/lib/phaseTiming";
import { serverNow } from "@/lib/serverTime";
import {
  BoardPin,
  BoardStringArc,
  BoardEmojiBadge,
  BoardStamp,
  PAPER,
  PAPER_BORDER,
  INK_SOFT,
  INK_BODY,
} from "@/components/boardChrome";

export type EventKind = "killed" | "executed" | "imprisoned" | "released" | "bitten";

export interface QueuedEvent {
  id: string;
  kind: EventKind;
  /** Slug du rôle "responsable" à afficher (tueur, exécuteur, juge, vampire, ou origine d'arme). */
  byRoleSlug?: string | null;
  /** Raison brute pour debug / sous-titre. */
  reason?: string | null;
  createdAt: number;
}

type NotificationRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export function PlayerEventModal({
  game,
  me,
  players,
  roles,
}: {
  game: GameRow;
  me: PlayerRow;
  players: PlayerRow[];
  roles: Map<string, RoleRow>;
}) {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  // Pour éviter de re-déclencher un modal "tu as été ..." sur d'anciennes
  // notifications quand on rejoint la partie, on capture le timestamp de
  // montage et on n'ouvre des modals que pour les notifs créées après.
  const mountedAtRef = useRef<number>(Date.now());

  // ─── Hydrate "déjà vu" depuis le localStorage ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`event-modal-seen-${game.id}-${me.id}`);
      if (raw) {
        for (const id of JSON.parse(raw) as string[]) seenRef.current.add(id);
      }
    } catch {
      /* localStorage indisponible (mode privé) — sans effet sur la partie */
    }
  }, [game.id, me.id]);

  const persistSeen = () => {
    try {
      localStorage.setItem(
        `event-modal-seen-${game.id}-${me.id}`,
        JSON.stringify(Array.from(seenRef.current).slice(-200)),
      );
    } catch {
      /* localStorage indisponible (mode privé) — sans effet sur la partie */
    }
  };

  // ─── Helpers de résolution ───
  const playersById = useMemo(() => {
    const m = new Map<string, PlayerRow>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  const resolveEvent = (row: NotificationRow): QueuedEvent | null => {
    const p = row.payload ?? {};
    if (row.type === "death") {
      // On ignore les morts d'autres joueurs (le broadcast death va à tous,
      // mais la modal centrée n'est destinée qu'à la cible).
      if ((p.target_id as string | undefined) !== me.id) return null;
      const reason = (p.reason as string | undefined) ?? "";
      const isExecution = reason === "exécution" || reason === "execution";
      const weaponFromSlug = (p.weapon_from_slug as string | null | undefined) ?? null;
      const attackerId = (p.attacker_id as string | null | undefined) ?? null;
      const attackerSlug = attackerId ? (playersById.get(attackerId)?.role_slug ?? null) : null;
      // Mapping des raisons "rôle" : on essaie d'abord le slug de l'attaquant
      // (cas direct : tueur, croque-mitaine, vengeur, etc.), puis l'origine
      // de l'arme (couteau du Cuisinier / Vengeur / Stratège).
      let byRoleSlug: string | null = null;
      if (isExecution) byRoleSlug = "executeur";
      else if (weaponFromSlug) byRoleSlug = weaponFromSlug;
      else if (attackerSlug) byRoleSlug = attackerSlug;
      else if (reason && reason.startsWith("role:")) byRoleSlug = reason.slice(5);
      return {
        id: row.id,
        kind: isExecution ? "executed" : "killed",
        byRoleSlug,
        reason,
        createdAt: new Date(row.created_at).getTime(),
      };
    }
    if (row.type === "imprisoned") {
      return { id: row.id, kind: "imprisoned", createdAt: new Date(row.created_at).getTime() };
    }
    if (row.type === "released") {
      return {
        id: row.id,
        kind: "released",
        byRoleSlug: "juge",
        createdAt: new Date(row.created_at).getTime(),
      };
    }
    if (row.type === "bitten" || row.type === "vampire_bite") {
      return {
        id: row.id,
        kind: "bitten",
        byRoleSlug: "vampire",
        createdAt: new Date(row.created_at).getTime(),
      };
    }
    return null;
  };

  const enqueue = (row: NotificationRow) => {
    if (seenRef.current.has(row.id)) return;
    const ev = resolveEvent(row);
    if (!ev) return;
    seenRef.current.add(row.id);
    persistSeen();
    setQueue((q) => [...q, ev]);
  };

  // ─── Abonnement realtime + chargement initial ───
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, payload, created_at")
        .eq("game_id", game.id)
        .eq("player_id", me.id)
        .in("type", ["death", "imprisoned", "released", "bitten", "vampire_bite"])
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as NotificationRow[];
      // À l'hydratation : on marque les vieilles notifs comme vues sans les
      // afficher (sauf si jamais affichées et survenues très récemment).
      for (const r of rows) {
        if (seenRef.current.has(r.id)) continue;
        const ageMs = serverNow() - new Date(r.created_at).getTime();
        if (ageMs > 30_000) {
          seenRef.current.add(r.id);
          continue;
        }
        enqueue(r);
      }
      persistSeen();
    }
    void load();
    const ch = supabase
      .channel(`evt-modal-${game.id}-${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `player_id=eq.${me.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          enqueue(row);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, me.id]);

  // ─── Affichage différé : on attend la fin de la frame de transition. ───
  const current = queue[0];
  const phaseStart = game.phase_started_at ? new Date(game.phase_started_at).getTime() : 0;
  const introEnd = phaseStart + introMsFor(game.current_phase);
  const [nowTick, setNowTick] = useState(serverNow());
  useEffect(() => {
    if (!current) return;
    const wait = introEnd - serverNow();
    if (wait <= 0) return;
    const t = setTimeout(() => setNowTick(serverNow()), wait + 50);
    return () => clearTimeout(t);
  }, [current, introEnd]);

  if (!current) return null;
  if (nowTick < introEnd) return null;

  const role = current.byRoleSlug ? (roles.get(current.byRoleSlug) ?? null) : null;
  const close = () => setQueue((q) => q.slice(1));

  return createPortal(<EventCard ev={current} role={role} onClose={close} />, document.body);
}

// ────────────────────────────────────────────────────────────────────────
// Présentation — fenêtres « dossier » The Board (cf. design page 11)
// ────────────────────────────────────────────────────────────────────────

// Habillage board de chaque type d'événement : entête tamponné, tampon de
// catégorie, corps manuscrit, pastille emoji d'angle. Les couleurs sont des
// teintes papier/encre figées (la DA Board travaille en hex chauds).
type BoardLook = {
  header: string; // « — AVIS DE DANGER — »
  title: string; // titre Special Elite
  stamp?: string; // mot de catégorie encadré
  body: string; // corps manuscrit (peut contenir {role})
  emoji: string; // pastille d'angle
  emojiBg: string; // dégradé de la pastille
  ink: string; // couleur titre + tampon
  paper: string; // fond de la carte
  border: string; // bord de la carte
  glow?: string; // halo extérieur additionnel
  redString?: boolean; // arc de ficelle en haut
  rotate: number; // inclinaison de la carte
  btnLabel: string;
  btnVariant: "fill" | "outline";
  showRole?: boolean; // affiche un jeton rond du rôle responsable
};

const BOARD_LOOK: Record<EventKind, BoardLook> = {
  killed: {
    header: "— AVIS DE DÉCÈS —",
    title: "Mise à mort",
    stamp: "DÉCÈS",
    body: "Tu n'as pas survécu à ce tour.",
    emoji: "🎯",
    emojiBg: "radial-gradient(circle at 36% 30%,#e0563f,#9e1f2e 72%)",
    ink: "#c2202f",
    paper: "linear-gradient(180deg,#f4e9d2,#e6d6b4)",
    border: "#d2bf95",
    glow: "0 0 40px -12px rgba(209,43,61,.45)",
    redString: true,
    rotate: -1.2,
    btnLabel: "J'ai compris",
    btnVariant: "outline",
    showRole: true,
  },
  executed: {
    header: "— SENTENCE CAPITALE —",
    title: "Exécution",
    stamp: "EXÉCUTÉ",
    body: "La sentence tombe : tu quittes la partie.",
    emoji: "🪓",
    emojiBg: "radial-gradient(circle at 36% 30%,#e0853f,#9e4a1f 72%)",
    ink: "#b5531c",
    paper: "linear-gradient(180deg,#f4e9d2,#e6d6b4)",
    border: "#d2bf95",
    glow: "0 0 40px -12px rgba(181,83,28,.4)",
    redString: true,
    rotate: 1,
    btnLabel: "J'ai compris",
    btnVariant: "outline",
    showRole: true,
  },
  imprisoned: {
    header: "— VERDICT DU TRIBUNAL —",
    title: "Direction la prison",
    stamp: "PRISON",
    body: "Écarté ce tour, mais bien en vie.",
    emoji: "🔒",
    emojiBg: "radial-gradient(circle at 36% 30%,#f0c46a,#a8772a 72%)",
    ink: "#a8772a",
    paper: PAPER,
    border: PAPER_BORDER,
    rotate: -1.1,
    btnLabel: "J'ai compris",
    btnVariant: "fill",
  },
  released: {
    header: "— LIBÉRATION —",
    title: "Te voilà libre",
    stamp: "LIBÉRÉ",
    body: "Tu rejoues ce tour.",
    emoji: "🕊️",
    emojiBg: "radial-gradient(circle at 36% 30%,#7fd0a0,#2f7d4a 72%)",
    ink: "#2f7d4a",
    paper: PAPER,
    border: PAPER_BORDER,
    rotate: 1.1,
    btnLabel: "Enfin libre",
    btnVariant: "fill",
    showRole: true,
  },
  bitten: {
    header: "— BULLETIN CONFIDENTIEL —",
    title: "Tu as été mordu",
    stamp: "CONVERTI · VAMPIRE",
    body: "Tu rejoins les Vampires. Ton rôle d'origine reste actif.",
    emoji: "🦇",
    emojiBg: "radial-gradient(circle at 36% 30%,#e58ab8,#7e2a52 72%)",
    ink: "#8a2f55",
    paper: PAPER,
    border: PAPER_BORDER,
    rotate: 1,
    btnLabel: "Compris",
    btnVariant: "fill",
  },
};

export function EventCard({
  ev,
  role,
  onClose,
  embedded = false,
}: {
  ev: QueuedEvent;
  role: RoleRow | null;
  onClose: () => void;
  embedded?: boolean;
}) {
  const look = BOARD_LOOK[ev.kind];
  const showRole = !!look.showRole && !!role;

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[200] flex items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in fade-in duration-300`}
      style={{ background: "rgba(6,5,8,.78)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[340px] text-center animate-in zoom-in-95 duration-300"
        style={{
          background: look.paper,
          border: `1px solid ${look.border}`,
          borderRadius: 3,
          padding: "26px 20px 22px",
          transform: `rotate(${look.rotate}deg)`,
          boxShadow: `0 22px 50px -16px rgba(0,0,0,.85)${look.glow ? `,${look.glow}` : ""}`,
        }}
      >
        {/* Épinglage : ficelle tendue ou simple punaise */}
        {look.redString ? (
          <BoardStringArc />
        ) : (
          <span
            style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}
          >
            <BoardPin size={15} />
          </span>
        )}
        <BoardEmojiBadge
          emoji={look.emoji}
          bg={look.emojiBg}
          corner={look.redString ? "br" : "tr"}
          size={44}
        />

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: ".22em",
            color: INK_SOFT,
          }}
        >
          {look.header}
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 21,
            color: look.ink,
            marginTop: 9,
            lineHeight: 1.1,
          }}
        >
          {look.title}
        </h2>

        {look.stamp && (
          <div style={{ margin: "10px 0 2px", display: "flex", justifyContent: "center" }}>
            <BoardStamp
              color={look.ink}
              bg={`color-mix(in srgb, ${look.ink} 6%, transparent)`}
              rotate={ev.kind === "killed" ? 2 : -2.2}
            >
              {look.stamp}
            </BoardStamp>
          </div>
        )}

        {/* Jeton rond du rôle responsable (les icônes de rôle sont rondes — règle DA) */}
        {showRole && role && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                overflow: "hidden",
                borderRadius: "50%",
                background: "#fbf4e2",
                boxShadow: `0 0 0 2.5px ${look.ink}, 0 6px 12px -5px rgba(0,0,0,.5)`,
              }}
            >
              <RoleIcon role={role} size={58} />
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 10,
                letterSpacing: ".06em",
                color: look.ink,
              }}
            >
              par {role.name_fr}
            </span>
          </div>
        )}

        <p
          style={{
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 17,
            color: INK_BODY,
            lineHeight: 1.2,
            margin: "12px 4px 0",
          }}
        >
          {look.body}
        </p>

        {/* Bouton */}
        <button
          onClick={onClose}
          className="active:scale-[0.97] transition"
          style={
            look.btnVariant === "fill"
              ? {
                  marginTop: 16,
                  width: "100%",
                  padding: 11,
                  borderRadius: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  letterSpacing: ".04em",
                  color: "#fff",
                  background: look.ink,
                  boxShadow: `0 6px 14px -5px ${look.ink}`,
                }
              : {
                  marginTop: 16,
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: ".04em",
                  color: look.ink,
                  background: "transparent",
                  border: `2px solid ${look.ink}`,
                }
          }
        >
          {look.btnLabel}
        </button>
      </div>
    </div>
  );
}
