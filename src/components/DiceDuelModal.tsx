// DiceDuelModal — écran plein écran du duel de dés du Parieur tricheur.
//
// S'abonne à la table `notifications` (type `dice_duel`) filtrée sur
// `player_id = me.id`. Le résultat est déjà calculé côté serveur (rolls dans le
// payload) ; cet écran ne fait que DRAMATISER des dés déjà décidés, à l'identique
// chez le parieur et chez la cible. Le parieur lance 3 dés à 6 faces et garde le
// MEILLEUR ; la cible lance 1 dé. Une égalité relance un round complet.
//
// Perspective : `iAmActor = me.id === payload.actorId`. La cible doit appuyer sur
// « Lancer mon dé » pour révéler son lancer (premier round) ; les relances
// s'enchaînent ensuite automatiquement.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow } from "@/lib/game";
import { AvatarImg } from "@/components/AvatarImg";
import { avatarOf } from "@/lib/avatars";
import { BoardPin, BoardStringArc, BoardEmojiBadge, BoardStamp, PAPER, PAPER_BORDER, INK_SOFT, INK_BODY } from "@/components/boardChrome";
import { Skull, Trophy } from "lucide-react";

type DuelRound = { a: number; b: number; c: number; best: number; them: number };
type DuelPayload = {
  duelId: string;
  actorId: string; actorPseudo: string;
  targetId: string; targetPseudo: string;
  rounds: DuelRound[];
  loserId: string; winnerId: string;
};

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export function DiceDuelModal({
  game, me, players,
}: {
  game: GameRow;
  me: PlayerRow;
  players: PlayerRow[];
}) {
  const [queue, setQueue] = useState<DuelPayload[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const mountedAtRef = useRef<number>(Date.now());

  // ─── Hydrate « déjà vu » depuis le localStorage (clé par duelId) ───
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`dice-duel-seen-${game.id}-${me.id}`);
      if (raw) for (const id of JSON.parse(raw) as string[]) seenRef.current.add(id);
    } catch { /* ignore */ }
  }, [game.id, me.id]);

  const persistSeen = () => {
    try {
      localStorage.setItem(
        `dice-duel-seen-${game.id}-${me.id}`,
        JSON.stringify(Array.from(seenRef.current).slice(-100)),
      );
    } catch { /* ignore */ }
  };

  const enqueue = (row: NotificationRow) => {
    if (row.type !== "dice_duel") return;
    const p = (row.payload ?? {}) as Partial<DuelPayload> & { mj_view?: boolean };
    if (p.mj_view) return; // ligne MJ : pas d'overlay joueur
    const duelId = p.duelId;
    if (!duelId || !Array.isArray(p.rounds) || !p.actorId || !p.targetId) return;
    if (seenRef.current.has(duelId)) return;
    seenRef.current.add(duelId);
    persistSeen();
    setQueue((q) => [...q, p as DuelPayload]);
  };

  // ─── Abonnement realtime + chargement initial ───
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, payload, created_at")
        .eq("game_id", game.id)
        .eq("player_id", me.id)
        .eq("type", "dice_duel")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as NotificationRow[];
      // Hydratation : on marque les vieux duels comme vus sans rejouer
      // l'animation (sauf s'ils sont survenus très récemment, < 30 s).
      for (const r of rows) {
        const pid = (r.payload as { duelId?: string } | null)?.duelId;
        if (pid && seenRef.current.has(pid)) continue;
        const ageMs = Date.now() - new Date(r.created_at).getTime();
        if (ageMs > 30_000) {
          if (pid) seenRef.current.add(pid);
          continue;
        }
        enqueue(r);
      }
      persistSeen();
    }
    void load();
    const ch = supabase
      .channel(`dice-duel-${game.id}-${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `player_id=eq.${me.id}` },
        (payload) => enqueue(payload.new as NotificationRow),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, me.id]);

  const current = queue[0];
  if (!current) return null;

  const close = () => setQueue((q) => q.slice(1));
  return createPortal(
    <DuelScene key={current.duelId} duel={current} meId={me.id} players={players} onClose={close} />,
    document.body,
  );
}

// ────────────────────────────────────────────────────────────────────────
// Dé à 6 faces (SVG avec pips)
// ────────────────────────────────────────────────────────────────────────

const PIP_LAYOUT: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]],
};

function Die({
  value, size = 76, accent, dim, dieRef,
}: {
  value: number;
  size?: number;
  accent: string;
  dim?: boolean;
  dieRef?: (el: HTMLDivElement | null) => void;
}) {
  const pips = PIP_LAYOUT[Math.min(6, Math.max(1, value)) as 1 | 2 | 3 | 4 | 5 | 6];
  return (
    <div
      ref={dieRef}
      style={{
        width: size, height: size,
        transformStyle: "preserve-3d",
        willChange: "transform",
        opacity: dim ? 0.45 : 1,
        transition: "opacity 0.3s",
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Dé ${value}`}>
        <rect x="4" y="4" width="92" height="92" rx="20" fill="#fbf4e2" stroke={accent} strokeWidth="3" />
        {pips.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill="#2b1d14" />
        ))}
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Scène animée du duel
// ────────────────────────────────────────────────────────────────────────

const ACTOR_ACCENT = "#b5841c"; // or détective
const TARGET_ACCENT = "#9a8b78"; // bois patiné

function playerAvatar(p: PlayerRow | undefined) {
  const meta = (p?.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}) as Record<string, unknown>;
  return avatarOf(meta.avatar as string | undefined, p?.id);
}

export function DuelScene({
  duel, meId, players, onClose, embedded = false,
}: {
  duel: DuelPayload;
  meId: string;
  players: PlayerRow[];
  onClose: () => void;
  embedded?: boolean;
}) {
  const iAmActor = meId === duel.actorId;
  const lastRound = duel.rounds[duel.rounds.length - 1];

  // Faces affichées (pilotées par l'animation)
  const [faceA, setFaceA] = useState(1);
  const [faceB, setFaceB] = useState(1);
  const [faceC, setFaceC] = useState(1);
  const [faceThem, setFaceThem] = useState(1);
  const [bestSide, setBestSide] = useState<0 | 1 | 2 | null>(null); // quel dé du parieur est le meilleur
  const [banner, setBanner] = useState<string | null>(null);
  const [showRollBtn, setShowRollBtn] = useState(false);
  const [phase, setPhase] = useState<"intro" | "duel" | "final">("intro");

  const dieARef = useRef<HTMLDivElement | null>(null);
  const dieBRef = useRef<HTMLDivElement | null>(null);
  const dieCRef = useRef<HTMLDivElement | null>(null);
  const dieThemRef = useRef<HTMLDivElement | null>(null);
  const targetGateRef = useRef<(() => void) | null>(null);
  const reducedRef = useRef(false);

  const iWon = duel.winnerId === meId;
  const iLost = duel.loserId === meId;
  const loserPseudo = duel.loserId === duel.actorId ? duel.actorPseudo : duel.targetPseudo;

  // ─── Orchestration de l'animation ───
  useEffect(() => {
    let alive = true;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // Lance un dé : culbute GSAP + cycle de faces aléatoires, puis se fige.
    async function rollDie(
      el: HTMLDivElement | null,
      setFace: (v: number) => void,
      finalValue: number,
    ): Promise<void> {
      if (reducedRef.current || !el) {
        setFace(finalValue);
        if (el) gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2)" });
        return;
      }
      const dur = 0.85;
      gsap.killTweensOf(el);
      gsap.set(el, { rotation: 0, y: 0, scale: 1 });
      const tl = gsap.timeline();
      tl.to(el, { rotation: 720, duration: dur, ease: "power3.out" }, 0)
        .to(el, { y: -34, duration: dur * 0.45, ease: "power2.out" }, 0)
        .to(el, { y: 0, duration: dur * 0.55, ease: "bounce.out" }, dur * 0.45);
      // Cycle de faces aléatoires pendant la culbute
      const iv = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
      await wait(dur * 1000);
      clearInterval(iv);
      if (!alive) return;
      setFace(finalValue);
      gsap.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.3, ease: "back.out(2.5)" });
    }

    async function playRound(idx: number, gateTarget: boolean) {
      const r = duel.rounds[idx];
      setBestSide(null);
      if (duel.rounds.length > 1) setBanner(`Manche ${idx + 1}`);

      // 1) Les 3 dés du parieur (en parallèle)
      await Promise.all([
        rollDie(dieARef.current, setFaceA, r.a),
        rollDie(dieBRef.current, setFaceB, r.b),
        rollDie(dieCRef.current, setFaceC, r.c),
      ]);
      if (!alive) return;

      // 2) Mise en avant du MEILLEUR dé (parmi les 3)
      const best: 0 | 1 | 2 = r.a >= r.b && r.a >= r.c ? 0 : r.b >= r.c ? 1 : 2;
      setBestSide(best);
      const bestEl = best === 0 ? dieARef.current : best === 1 ? dieBRef.current : dieCRef.current;
      if (bestEl && !reducedRef.current) {
        gsap.fromTo(bestEl, { scale: 1 }, { scale: 1.18, duration: 0.35, ease: "back.out(3)", yoyo: true, repeat: 1 });
      }
      await wait(reducedRef.current ? 200 : 650);
      if (!alive) return;

      // 3) Le dé de la cible — gate « Lancer mon dé » uniquement côté cible, 1er round
      if (gateTarget) {
        setShowRollBtn(true);
        await new Promise<void>((resolve) => { targetGateRef.current = resolve; });
        setShowRollBtn(false);
        if (!alive) return;
      }
      await rollDie(dieThemRef.current, setFaceThem, r.them);
      if (!alive) return;

      // 4) Égalité ?
      if (r.best === r.them && idx < duel.rounds.length - 1) {
        setBanner("ÉGALITÉ — on relance !");
        await wait(reducedRef.current ? 300 : 950);
        return playRound(idx + 1, false); // relances auto
      }
    }

    async function run() {
      setPhase("intro");
      await wait(reducedRef.current ? 100 : 600);
      if (!alive) return;
      setPhase("duel");
      // Gate seulement chez la cible (le parieur a déjà « parié » pour lancer).
      await playRound(0, !iAmActor);
      if (!alive) return;
      setBanner(null);
      setPhase("final");
    }

    void run();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actorP = players.find((p) => p.id === duel.actorId);
  const targetP = players.find((p) => p.id === duel.targetId);

  const winnerPseudo = duel.winnerId === duel.actorId ? duel.actorPseudo : duel.targetPseudo;

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-[210] flex items-center justify-center p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      style={{ background: "rgba(6,5,8,.82)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-[360px] text-center"
        style={{
          background: PAPER,
          border: `1px solid ${PAPER_BORDER}`,
          borderRadius: 3,
          padding: "26px 20px 22px",
          transform: "rotate(-1.1deg)",
          boxShadow: "0 22px 50px -16px rgba(0,0,0,.85)",
        }}
      >
        <BoardStringArc />
        <BoardEmojiBadge emoji="🎲" bg="radial-gradient(circle at 36% 30%,#f0c46a,#a8772a 72%)" corner="br" size={42} />

        {/* En-tête */}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: ".22em", color: INK_SOFT }}>— LE PARI DU TRICHEUR —</div>
        <div style={{ margin: "9px 0 2px", display: "flex", justifyContent: "center" }}>
          <BoardStamp color={ACTOR_ACCENT} rotate={-1.8}>🎲 DUEL DE DÉS</BoardStamp>
        </div>

        {/* Bannière de manche / égalité */}
        <div style={{ height: 22, marginTop: 8 }}>
          {banner && (
            <span
              className="animate-pulse"
              style={{ display: "inline-block", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: ".1em", color: "#a8772a", background: "#f2d35e", padding: "2px 10px", transform: "rotate(-1.5deg)", boxShadow: "0 4px 9px rgba(0,0,0,.35)" }}
            >
              {banner}
            </span>
          )}
        </div>

        {/* Arène */}
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          {/* Côté parieur : 3 dés */}
          <Side pseudo={duel.actorPseudo} avatar={playerAvatar(actorP)} accent={ACTOR_ACCENT} isMe={iAmActor} sub="garde le meilleur (3 dés)">
            <div className="flex items-end justify-center gap-1.5">
              <div className="relative"><DieHolder><Die value={faceA} size={44} accent={ACTOR_ACCENT} dim={bestSide !== null && bestSide !== 0} dieRef={(el) => (dieARef.current = el)} /></DieHolder>
                {phase === "final" && bestSide === 0 && <BestBadge />}
              </div>
              <div className="relative"><DieHolder><Die value={faceB} size={44} accent={ACTOR_ACCENT} dim={bestSide !== null && bestSide !== 1} dieRef={(el) => (dieBRef.current = el)} /></DieHolder>
                {phase === "final" && bestSide === 1 && <BestBadge />}
              </div>
              <div className="relative"><DieHolder><Die value={faceC} size={44} accent={ACTOR_ACCENT} dim={bestSide !== null && bestSide !== 2} dieRef={(el) => (dieCRef.current = el)} /></DieHolder>
                {phase === "final" && bestSide === 2 && <BestBadge />}
              </div>
            </div>
          </Side>

          <div className="self-center pt-12" style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#c2202f" }}>VS</div>

          {/* Côté cible : 1 dé */}
          <Side pseudo={duel.targetPseudo} avatar={playerAvatar(targetP)} accent={TARGET_ACCENT} isMe={!iAmActor} sub="un seul dé">
            <div className="flex items-end justify-center" style={{ minHeight: 66 }}>
              <DieHolder><Die value={faceThem} size={54} accent={TARGET_ACCENT} dieRef={(el) => (dieThemRef.current = el)} /></DieHolder>
            </div>
          </Side>
        </div>

        {/* Bouton « Lancer mon dé » (cible, 1er round) */}
        {showRollBtn && (
          <button
            onClick={() => { targetGateRef.current?.(); targetGateRef.current = null; }}
            className="mt-5 w-full active:scale-[0.97] transition"
            style={{ padding: 11, borderRadius: 8, fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: ".04em", color: "#fff", background: "#a8772a", boxShadow: "0 6px 14px -5px rgba(168,119,42,.7)" }}
          >
            🎲 Lancer mon dé
          </button>
        )}

        {/* Texte de règle (avant résultat) */}
        {phase !== "final" && !showRollBtn && (
          <p style={{ fontFamily: "Caveat,cursive", fontWeight: 700, fontSize: 16, color: INK_BODY, lineHeight: 1.25, margin: "14px 6px 0" }}>
            Le plus petit nombre meurt à la prochaine annonce — sauf protection d'ici là.
          </p>
        )}

        {/* Résultat final — verdict tamponné */}
        {phase === "final" && (
          <div className="mt-4 animate-in fade-in zoom-in-95 duration-300">
            <div
              style={{
                borderRadius: 3,
                border: `1.5px solid ${iLost ? "#c2202f" : iWon ? "#2f7d4a" : "#9a7b52"}`,
                background: `color-mix(in srgb, ${iLost ? "#c2202f" : iWon ? "#2f7d4a" : "#9a7b52"} 8%, #fbf6e9)`,
                padding: "12px 13px",
              }}
            >
              <div className="inline-flex items-center gap-2" style={{ fontFamily: "var(--font-display)", fontSize: 14, color: iLost ? "#c2202f" : iWon ? "#2f7d4a" : INK_BODY }}>
                {iLost ? <><Skull className="size-4 shrink-0" aria-hidden /> Tu perds le pari</>
                  : iWon ? <><Trophy className="size-4 shrink-0" aria-hidden /> Tu remportes le pari</>
                  : <>🎲 {winnerPseudo} l'emporte</>}
              </div>
              <div style={{ fontSize: 13, marginTop: 4, color: INK_BODY }}>
                <b>{lastRound.best}</b> contre <b>{lastRound.them}</b> — {iLost ? "tu ne survivras pas" : `${loserPseudo} ne survivra pas`} à la prochaine annonce.
              </div>
              {iLost && (
                <div style={{ fontSize: 11.5, marginTop: 5, fontStyle: "italic", color: "#6a5444" }}>
                  À moins qu'une protection ne te sauve d'ici là…
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full active:scale-[0.97] transition"
              style={{ padding: 11, borderRadius: 8, fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: ".04em", color: "#fff", background: "#a8772a", boxShadow: "0 6px 14px -5px rgba(168,119,42,.7)" }}
            >
              J'ai compris
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Coupelle de feutrine qui reçoit un dé. */
function DieHolder({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", background: "#dcc8a2", borderRadius: 9, padding: 6, boxShadow: "inset 0 2px 6px rgba(0,0,0,.28)" }}>
      {children}
    </span>
  );
}

function Side({
  pseudo, avatar, accent, isMe, sub, children,
}: {
  pseudo: string;
  avatar: ReturnType<typeof avatarOf>;
  accent: string;
  isMe: boolean;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-flex rounded-full" style={{ boxShadow: `0 0 0 2px ${accent}` }}>
          <AvatarImg avatar={avatar} size={30} />
        </span>
        <div style={{ fontFamily: "Caveat,cursive", fontWeight: 700, fontSize: 17, color: INK_BODY, lineHeight: 1.05, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isMe ? "Toi" : pseudo}
        </div>
        <div style={{ fontSize: 9, color: INK_SOFT }}>{sub}</div>
      </div>
    </div>
  );
}

function BestBadge() {
  return (
    <span
      style={{ position: "absolute", top: -8, right: -6, fontFamily: "var(--font-display)", fontSize: 7, letterSpacing: ".04em", color: "#fff", background: "#a8772a", padding: "2px 6px", borderRadius: 3, transform: "rotate(6deg)", boxShadow: "0 2px 6px rgba(0,0,0,.4)" }}
    >
      MEILLEUR
    </span>
  );
}
