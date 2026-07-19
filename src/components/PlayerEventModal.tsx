// PlayerEventModal — fenêtres centrées stylisées pour les événements personnels
// du joueur : mort, prison, exécution, libération, morsure de vampire, éveil du
// Chasseur — plus les sollicitations ciblées : parloir du Geôlier (prisonnier
// invité à chatter) et pacte du Conjuré (complice sommé de choisir).
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
import { respondPact } from "@/engine/actions";
import { RoleIcon } from "@/components/RoleIcon";
import { AvatarImg } from "@/components/AvatarImg";
import { avatarOf } from "@/lib/avatars";
import { introMsFor } from "@/lib/phaseTiming";
import { serverNow } from "@/lib/serverTime";
import { vibrate, VIBES } from "@/lib/vibrate";
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

export type EventKind =
  | "killed"
  | "executed"
  | "imprisoned"
  | "released"
  | "bitten"
  | "chasseur"
  | "survived";
/** Kinds affichés par la file (EventKind « board » + sollicitations ciblées). */
type ModalKind = EventKind | "parloir" | "pact";

export interface QueuedEvent {
  id: string;
  kind: ModalKind;
  /** Slug du rôle "responsable" à afficher (tueur, exécuteur, juge, vampire, ou origine d'arme). */
  byRoleSlug?: string | null;
  /** Raison brute pour debug / sous-titre. */
  reason?: string | null;
  /** Corps personnalisé (remplace le corps par défaut de BOARD_LOOK) — ex. la
   *  phrase flavorée de la notif de survie (Croque-mitaine / Chat / Bretteur). */
  body?: string | null;
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
  onGoPrison,
}: {
  game: GameRow;
  me: PlayerRow;
  players: PlayerRow[];
  roles: Map<string, RoleRow>;
  /** Bascule vers l'onglet Prison (parloir du Geôlier). */
  onGoPrison?: () => void;
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
      // de l'arme (cas couteau de l'Armurier).
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
    // "converted" est le type réellement émis par applyVampireConversion ;
    // "bitten"/"vampire_bite" sont gardés pour compat (DevGallery, anciens rows).
    // Sans ce mapping, la carte Morsure n'apparaissait JAMAIS en live (audit 2026-07-16).
    if (row.type === "converted" || row.type === "bitten" || row.type === "vampire_bite") {
      return {
        id: row.id,
        kind: "bitten",
        byRoleSlug: "vampire",
        createdAt: new Date(row.created_at).getTime(),
      };
    }
    // Émis uniquement par l'émergence du Chasseur (1ère morsure de la partie).
    if (row.type === "role_swap") {
      return {
        id: row.id,
        kind: "chasseur",
        byRoleSlug: "chasseur_de_vampire",
        createdAt: new Date(row.created_at).getTime(),
      };
    }
    // Geôlier : le prisonnier est invité au parloir (chat dans l'onglet Prison).
    if (row.type === "parloir_open") {
      return { id: row.id, kind: "parloir", createdAt: new Date(row.created_at).getTime() };
    }
    // Conjuré : le complice doit trancher — la victime meurt-elle ? La carte lit
    // l'offre fraîche dans me.role_meta.pact_offer (pas le payload) : si le
    // joueur a déjà répondu depuis l'onglet Capacité, la carte se saute seule.
    if (row.type === "pact_offer") {
      return { id: row.id, kind: "pact", createdAt: new Date(row.created_at).getTime() };
    }
    // Survie à un danger : un joueur a été visé mais s'en est sorti — Croque-mitaine
    // qui épargne (boogey_breath), Chat du Manoir qui perd une vie (chat_life_lost),
    // Bretteur qui pare (bretteur_parry). Même carte « Tu as survécu à un danger »,
    // avec le corps flavoré de la notif. On NE montre PAS de rôle responsable
    // (pas de fuite d'identité — la cible sait juste qu'elle a frôlé la mort).
    if (
      row.type === "boogey_breath" ||
      row.type === "chat_life_lost" ||
      row.type === "bretteur_parry"
    ) {
      return {
        id: row.id,
        kind: "survived",
        body: row.body,
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
        .in("type", [
          "death",
          "imprisoned",
          "released",
          "bitten",
          "vampire_bite",
          "converted",
          "role_swap",
          "parloir_open",
          "pact_offer",
          "boogey_breath",
          "chat_life_lost",
          "bretteur_parry",
        ])
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

  const visible = !!current && nowTick >= introEnd;

  // Retour haptique à CHAQUE carte qui apparaît (mort, prison, parloir, pacte…).
  const vibratedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!visible || !current) return;
    if (vibratedForRef.current === current.id) return;
    vibratedForRef.current = current.id;
    vibrate(VIBES.modal);
  }, [visible, current]);

  const meMeta = (me.role_meta ?? {}) as Record<string, unknown>;
  const pactOffer = meMeta.pact_offer as
    | { target_id: string; target_pseudo: string; tour: number }
    | null
    | undefined;

  // Cartes devenues sans objet → on les saute (hors rendu, jamais pendant) :
  //  · pacte déjà répondu depuis l'onglet Capacité (pact_offer effacé) ;
  //  · parloir d'un tour révolu, ou joueur plus en prison (libéré/mort).
  const parloirStale =
    current?.kind === "parloir" &&
    (!me.is_imprisoned ||
      !me.is_alive ||
      (meMeta.parloir_open_cycle as number | undefined) !== game.current_tour);
  const pactStale = current?.kind === "pact" && !pactOffer;
  useEffect(() => {
    if (parloirStale || pactStale) setQueue((q) => q.slice(1));
  }, [parloirStale, pactStale]);

  if (!current || !visible || parloirStale || pactStale) return null;

  const role = current.byRoleSlug ? (roles.get(current.byRoleSlug) ?? null) : null;
  const close = () => setQueue((q) => q.slice(1));

  if (current.kind === "parloir") {
    return createPortal(
      <ParloirCard
        onClose={close}
        onGo={() => {
          onGoPrison?.();
          close();
        }}
      />,
      document.body,
    );
  }
  if (current.kind === "pact") {
    const target = pactOffer ? (players.find((p) => p.id === pactOffer.target_id) ?? null) : null;
    return createPortal(
      <PactCard
        offer={pactOffer!}
        target={target}
        onAnswer={(accept) => respondPact(game.id, me.id, accept)}
        onClose={close}
      />,
      document.body,
    );
  }
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
  chasseur: {
    header: "— BULLETIN CONFIDENTIEL —",
    title: "Tu sens l'appel",
    stamp: "CHASSEUR ÉVEILLÉ",
    body: "Un vampire rôde. Tu deviens Chasseur de Vampire — traque-les avant qu'il ne soit trop tard.",
    emoji: "🩸",
    emojiBg: "radial-gradient(circle at 36% 30%,#8fb4d8,#2f4d7d 72%)",
    ink: "#33507e",
    paper: PAPER,
    border: PAPER_BORDER,
    rotate: -1,
    btnLabel: "Prendre les armes",
    btnVariant: "fill",
    showRole: true,
  },
  survived: {
    header: "— TU L'AS ÉCHAPPÉ BELLE —",
    title: "Tu as survécu à un danger",
    stamp: "SAIN ET SAUF",
    // Corps par défaut : remplacé par le corps flavoré de la notif (ev.body).
    body: "La mort t'a frôlé cette nuit… mais tu es toujours là.",
    emoji: "😮‍💨",
    emojiBg: "radial-gradient(circle at 36% 30%,#7fd0a0,#2f7d4a 72%)",
    ink: "#2f7d4a",
    paper: PAPER,
    border: PAPER_BORDER,
    rotate: -1,
    btnLabel: "Ouf !",
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
  // Les kinds "parloir"/"pact" ont leurs cartes dédiées (ParloirCard/PactCard),
  // jamais routés ici — le cast est sûr.
  const look = BOARD_LOOK[ev.kind as EventKind];
  const showRole = !!look.showRole && !!role;

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[200] flex items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))] pb-[max(1.5rem,var(--safe-bottom))] animate-in fade-in duration-300`}
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
          {ev.body ?? look.body}
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

// ────────────────────────────────────────────────────────────────────────
// Cartes de sollicitation — même grammaire « dossier » Board que EventCard,
// mais avec une ACTION (pas un simple accusé de réception). Encres/papiers
// réutilisés depuis BOARD_LOOK (ambre prison, rouge décès) — zéro teinte neuve.
// ────────────────────────────────────────────────────────────────────────

/** Coquille commune : voile sombre + papier épinglé incliné. */
function BoardShell({
  rotate,
  emoji,
  emojiBg,
  onBackdrop,
  embedded = false,
  children,
}: {
  rotate: number;
  emoji: string;
  emojiBg: string;
  onBackdrop: () => void;
  /** Galerie /dev : rendu dans un cadre téléphone (absolute) au lieu du viewport. */
  embedded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[200] flex items-center justify-center p-6 pt-[max(1.5rem,var(--safe-top))] pb-[max(1.5rem,var(--safe-bottom))] animate-in fade-in duration-300`}
      style={{ background: "rgba(6,5,8,.78)", backdropFilter: "blur(3px)" }}
      onClick={onBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[340px] text-center animate-in zoom-in-95 duration-300"
        style={{
          background: PAPER,
          border: `1px solid ${PAPER_BORDER}`,
          borderRadius: 3,
          padding: "26px 20px 22px",
          transform: `rotate(${rotate}deg)`,
          boxShadow: "0 22px 50px -16px rgba(0,0,0,.85)",
        }}
      >
        <span
          style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}
        >
          <BoardPin size={15} />
        </span>
        <BoardEmojiBadge emoji={emoji} bg={emojiBg} corner="tr" size={44} />
        {children}
      </div>
    </div>
  );
}

const PARLOIR_INK = "#a8772a"; // même encre que la carte « Prison »
const PACT_INK = "#c2202f"; // même encre que la carte « Mise à mort »

/** Geôlier → prisonnier : invitation au parloir, bouton vers l'onglet Prison. */
export function ParloirCard({
  onClose,
  onGo,
  embedded,
}: {
  onClose: () => void;
  onGo: () => void;
  embedded?: boolean;
}) {
  return (
    <BoardShell
      rotate={-1.1}
      emoji="🔐"
      emojiBg="radial-gradient(circle at 36% 30%,#f0c46a,#a8772a 72%)"
      onBackdrop={onClose}
      embedded={embedded}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 9,
          letterSpacing: ".22em",
          color: INK_SOFT,
        }}
      >
        — REGISTRE DU PARLOIR —
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 21,
          color: PARLOIR_INK,
          marginTop: 9,
          lineHeight: 1.1,
        }}
      >
        Le Geôlier te convoque
      </h2>
      <div style={{ margin: "10px 0 2px", display: "flex", justifyContent: "center" }}>
        <BoardStamp
          color={PARLOIR_INK}
          bg={`color-mix(in srgb, ${PARLOIR_INK} 6%, transparent)`}
          rotate={-2.2}
        >
          PARLOIR
        </BoardStamp>
      </div>
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
        On t'accorde un parloir : quelqu'un veut te parler. Le chat est ouvert pour ce tour
        seulement.
      </p>
      <button
        onClick={onGo}
        className="active:scale-[0.97] transition"
        style={{
          marginTop: 16,
          width: "100%",
          padding: 11,
          borderRadius: 8,
          fontFamily: "var(--font-display)",
          fontSize: 13,
          letterSpacing: ".04em",
          color: "#fff",
          background: PARLOIR_INK,
          boxShadow: `0 6px 14px -5px ${PARLOIR_INK}`,
        }}
      >
        Aller au parloir
      </button>
      <button
        onClick={onClose}
        className="active:scale-[0.97] transition"
        style={{
          marginTop: 8,
          width: "100%",
          padding: 8,
          fontFamily: "var(--font-display)",
          fontSize: 11,
          letterSpacing: ".04em",
          color: INK_SOFT,
          background: "transparent",
        }}
      >
        Plus tard
      </button>
    </BoardShell>
  );
}

/** Conjuré → complice : accepter ou refuser la mort de la victime désignée. */
export function PactCard({
  offer,
  target,
  onAnswer,
  onClose,
  embedded,
}: {
  offer: { target_id: string; target_pseudo: string; tour: number };
  target: PlayerRow | null;
  onAnswer: (accept: boolean) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
  embedded?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const targetMeta = (target?.role_meta ?? {}) as Record<string, unknown>;
  const av = avatarOf(targetMeta.avatar as string | undefined, target?.id ?? offer.target_id);
  const answer = async (accept: boolean) => {
    setBusy(true);
    const r = await onAnswer(accept);
    setMsg(r.message);
    setBusy(false);
  };
  return (
    <BoardShell
      rotate={1.1}
      emoji="🗡️"
      emojiBg="radial-gradient(circle at 36% 30%,#e0563f,#9e1f2e 72%)"
      onBackdrop={() => {
        if (!busy) onClose();
      }}
      embedded={embedded}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 9,
          letterSpacing: ".22em",
          color: INK_SOFT,
        }}
      >
        — PACTE MURMURÉ —
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 21,
          color: PACT_INK,
          marginTop: 9,
          lineHeight: 1.1,
        }}
      >
        Une proposition murmurée
      </h2>
      {msg ? (
        <>
          <p
            style={{
              fontFamily: "Caveat,cursive",
              fontWeight: 700,
              fontSize: 17,
              color: INK_BODY,
              lineHeight: 1.2,
              margin: "14px 4px 0",
            }}
          >
            {msg}
          </p>
          <button
            onClick={onClose}
            className="active:scale-[0.97] transition"
            style={{
              marginTop: 16,
              width: "100%",
              padding: 10,
              borderRadius: 8,
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: ".04em",
              color: PACT_INK,
              background: "transparent",
              border: `2px solid ${PACT_INK}`,
            }}
          >
            Fermer
          </button>
        </>
      ) : (
        <>
          <div style={{ margin: "10px 0 2px", display: "flex", justifyContent: "center" }}>
            <BoardStamp
              color={PACT_INK}
              bg={`color-mix(in srgb, ${PACT_INK} 6%, transparent)`}
              rotate={2}
            >
              PACTE
            </BoardStamp>
          </div>
          {/* La victime désignée : avatar + pseudo, cerclés de l'encre rouge. */}
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
                boxShadow: `0 0 0 2.5px ${PACT_INK}, 0 6px 12px -5px rgba(0,0,0,.5)`,
              }}
            >
              <AvatarImg avatar={av} size={58} />
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: ".06em",
                color: PACT_INK,
              }}
            >
              {offer.target_pseudo}
            </span>
          </div>
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
            Quelqu'un — tu ne sauras jamais qui — te propose un pacte : la mort de{" "}
            {offer.target_pseudo}. Si tu acceptes, le crime sera commis à l'Annonce.
          </p>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              disabled={busy}
              onClick={() => void answer(true)}
              className="active:scale-[0.97] transition disabled:opacity-40"
              style={{
                padding: 11,
                borderRadius: 8,
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: ".04em",
                color: "#fff",
                background: PACT_INK,
                boxShadow: `0 6px 14px -5px ${PACT_INK}`,
              }}
            >
              🗡️ Accepter
            </button>
            <button
              disabled={busy}
              onClick={() => void answer(false)}
              className="active:scale-[0.97] transition disabled:opacity-40"
              style={{
                padding: 11,
                borderRadius: 8,
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: ".04em",
                color: INK_BODY,
                background: "transparent",
                border: `2px solid ${PAPER_BORDER}`,
              }}
            >
              Refuser
            </button>
          </div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: ".08em",
              color: INK_SOFT,
              marginTop: 10,
            }}
          >
            Tu peux aussi répondre plus tard depuis ton onglet Capacité.
          </p>
        </>
      )}
    </BoardShell>
  );
}
