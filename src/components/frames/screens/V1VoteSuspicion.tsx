// Variante Suspicion : pas d'interaction. On rejoue visuellement, joueur par
// joueur, le dépouillement des tableaux de suspicions de chaque participant
// (vivant ou en prison). Pour chaque "Suspect" coché, on incrémente +1 sur
// l'avatar de la cible. Le joueur qui cumule le plus de marques est emprisonné.
// Égalité → personne. Le résultat réel (emprisonnement) est calculé côté
// serveur par closeVote → tallySuspicionVote ; cette vue est purement live.
import { useEffect, useMemo, useState } from "react";
import type { FrameContext } from "../registry";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { Ban, Lock, Scale, Vote } from "lucide-react";

const STEP_MS = 1400; // durée par "tableau" de suspicions dépouillé
const BUMP_MS = 600; // durée de l'animation +1
const REVEAL_DELAY_MS = 800; // pause finale avant d'afficher le verdict

function voteColor(count: number, maxCount: number): string {
  if (maxCount === 0) return "oklch(0.95 0.01 90)";
  const t = count / maxCount;
  const l = 0.95 - t * 0.37; // 0.95 → 0.58
  const c = 0.05 + t * 0.17; // 0.05 → 0.22
  const h = 80 - t * 55; // 80 → 25
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

export function V1VoteSuspicion({ me, players, game }: FrameContext) {
  // Univers : joueurs non-MJ (vivants ou en prison) — leurs tableaux comptent.
  const boards = useMemo(() => {
    return players
      .filter((p) => !p.is_mj && (p.is_alive || p.is_imprisoned))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => {
        const board =
          ((p.role_meta as Record<string, unknown> | null)?.suspicion_board as
            | Record<string, number>
            | undefined) ?? {};
        const suspects = Object.entries(board)
          .filter(([tid, lvl]) => lvl === 3 && tid !== p.id)
          .map(([tid]) => tid);
        return { suspects };
      });
  }, [players]);

  // Univers des cibles affichées : joueurs vivants non-MJ (seuls éliminables).
  const targets = useMemo(
    () =>
      players
        .filter((p) => !p.is_mj && p.is_alive)
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id)),
    [players],
  );
  const targetIds = useMemo(() => new Set(targets.map((p) => p.id)), [targets]);

  const [stepIndex, setStepIndex] = useState(0); // nombre de tableaux déjà dépouillés
  const [bumping, setBumping] = useState<Set<string>>(new Set());
  const [revealVerdict, setRevealVerdict] = useState(false);

  // Animation : dépouille un tableau toutes les STEP_MS millisecondes.
  useEffect(() => {
    setStepIndex(0);
    setBumping(new Set());
    setRevealVerdict(false);
  }, [game.current_tour]);

  useEffect(() => {
    if (stepIndex < boards.length) {
      const t = setTimeout(() => {
        const cur = boards[stepIndex];
        const flash = new Set(cur.suspects.filter((id) => targetIds.has(id)));
        setBumping(flash);
        setTimeout(() => setBumping(new Set()), BUMP_MS);
        setStepIndex((i) => i + 1);
      }, STEP_MS);
      return () => clearTimeout(t);
    }
    // Tous les tableaux dépouillés → on attend, puis on révèle le verdict.
    const t = setTimeout(() => setRevealVerdict(true), REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [stepIndex, boards, targetIds]);

  // Compteurs cumulés jusqu'au stepIndex courant.
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (let i = 0; i < Math.min(stepIndex, boards.length); i++) {
      for (const sid of boards[i].suspects) {
        if (!targetIds.has(sid)) continue;
        c[sid] = (c[sid] ?? 0) + 1;
      }
    }
    return c;
  }, [stepIndex, boards, targetIds]);

  // Verdict (purement visuel — le serveur fait foi via closeVote).
  const verdict = useMemo(() => {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return { eliminatedId: null as string | null, tied: false, max: 0 };
    const max = entries[0][1];
    const tops = entries.filter(([, n]) => n === max).map(([id]) => id);
    return { eliminatedId: tops.length === 1 ? tops[0] : null, tied: tops.length > 1, max };
  }, [counts]);

  const maxCount = useMemo(
    () => Math.max(0, ...targets.map((p) => counts[p.id] ?? 0)),
    [counts, targets],
  );

  const totalSuspectsCast = useMemo(
    () => boards.reduce((acc, b) => acc + b.suspects.filter((id) => targetIds.has(id)).length, 0),
    [boards, targetIds],
  );

  // Soupçons "Suspect" du joueur courant (pour colorer ses cibles en rouge sur son écran).
  const mySuspectIds = useMemo(() => {
    if (!me) return new Set<string>();
    const board =
      ((me.role_meta as Record<string, unknown> | null)?.suspicion_board as
        | Record<string, number>
        | undefined) ?? {};
    return new Set(
      Object.entries(board)
        .filter(([tid, lvl]) => lvl === 3 && tid !== me.id)
        .map(([tid]) => tid),
    );
  }, [me]);

  return (
    <div className="h-full flex flex-col bg-background p-5 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-destructive flex items-center gap-1.5">
          <Vote className="size-3.5" aria-hidden /> Vote — Variante Suspicion
        </div>
        <div className="text-[11px] text-muted-foreground font-mono">
          {Math.min(stepIndex, boards.length)}/{boards.length} tableaux
        </div>
      </div>
      <h2 className="text-xl font-bold mt-1">Dépouillement automatique</h2>
      <p className="text-[11px] text-muted-foreground mt-1">
        On parcourt les soupçons de chaque joueur. Le plus marqué « Suspect » est emprisonné.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {targets.map((p) => {
          const c = counts[p.id] ?? 0;
          const isBump = bumping.has(p.id);
          const av = avatarOf(
            (p.role_meta as Record<string, unknown>)?.avatar as string | undefined,
            p.id,
          );
          const isVerdictTarget = revealVerdict && verdict.eliminatedId === p.id;
          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-2 rounded-xl bg-card p-3 transition ${
                isVerdictTarget ? "ring-2 ring-destructive shadow-glow" : ""
              }`}
            >
              <div className="relative size-16">
                <div className="size-16 rounded-full bg-background overflow-hidden ring-4 ring-offset-2 ring-offset-card ring-white/30">
                  <AvatarImg avatar={av} fill rounded="full" />
                </div>
                {/* Ellipse noire bien opaque pour faire ressortir le chiffre */}
                <div
                  className={`absolute inset-0 rounded-full flex items-center justify-center font-bold transition ${
                    c > 0 ? "bg-black/80" : "bg-black/60"
                  } ${isBump ? "scale-110" : "scale-100"}`}
                  style={{ transitionDuration: "250ms" }}
                >
                  <span
                    className="text-2xl drop-shadow font-extrabold"
                    style={{ color: voteColor(c, maxCount), transition: "color 300ms ease" }}
                  >
                    {c}
                  </span>
                </div>
                {isBump && (
                  <div className="absolute -top-2 -right-1 text-sm font-bold text-destructive animate-bounce">
                    +1
                  </div>
                )}
              </div>
              <div
                className={`text-xs font-medium truncate w-full text-center ${
                  me && p.id === me.id
                    ? "text-yellow-400 font-bold"
                    : mySuspectIds.has(p.id)
                      ? "text-destructive font-bold"
                      : ""
                }`}
              >
                {p.pseudo}
              </div>
              {isVerdictTarget && (
                <div className="text-[10px] uppercase tracking-wider text-destructive font-semibold">
                  Emprisonné
                </div>
              )}
            </div>
          );
        })}
      </div>

      {revealVerdict && (
        <div
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            verdict.tied || !verdict.eliminatedId
              ? "border-muted/40 bg-muted/10 text-muted-foreground"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {totalSuspectsCast === 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Ban className="size-3.5 shrink-0" aria-hidden /> Aucun « Suspect » n'a été coché.
              Personne n'est emprisonné.
            </span>
          ) : verdict.tied ? (
            <span className="inline-flex items-center gap-1.5">
              <Scale className="size-3.5 shrink-0" aria-hidden /> Égalité ({verdict.max} marque
              {verdict.max > 1 ? "s" : ""}) — personne n'est emprisonné.
            </span>
          ) : verdict.eliminatedId ? (
            <>
              <Lock className="size-3.5 inline align-text-bottom mr-0.5" aria-hidden />{" "}
              <span className="font-semibold">
                {targets.find((p) => p.id === verdict.eliminatedId)?.pseudo}
              </span>{" "}
              part en prison avec {verdict.max} marque{verdict.max > 1 ? "s" : ""} « Suspect ».
            </>
          ) : (
            <>Aucun emprisonnement.</>
          )}
        </div>
      )}
    </div>
  );
}
