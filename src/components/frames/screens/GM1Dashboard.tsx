// GM Dashboard — Refonte « poste de pilotage » en 3 zones :
//   • PONT — situational awareness + pacing intelligent + checklist de retardataires
//            + jauge de proximité de victoire + tension-mètre + KPI cards
//   • RÉCIT — téléprompteur (annonces) · journal d'événements · pipeline de résolution
//   • TABLE — roster omniscient + fiche joueur (Rôle · État · Journal · Historique)
//   • NOTES — cahier d'analyse du MJ (notifications type=mj_note) avec tags joueurs
// Toute la logique métier (loadFeed, run, queries) est préservée.
import { Fragment, useEffect, useMemo, useState } from "react";
import type { FrameContext } from "../registry";
import {
  ringGathering,
  openGathering,
  openVote,
  closeVote,
  nextCycle,
  setPhase,
  setPaused,
  killPlayer,
  imprisonPlayer,
  releasePlayer,
  type RoleRow,
} from "@/engine/actions";
import { supabase } from "@/integrations/supabase/client";
import { phaseLabel, avatarOf } from "@/lib/avatars";
import { RoleIcon } from "@/components/RoleIcon";
import { AvatarImg } from "@/components/AvatarImg";
import { Sigil } from "@/components/Sigil";
import { colorize, roleColor } from "@/lib/factionText";
import { CapabilityCard } from "./PA2Capability";
import { INTRO_MS } from "./T1Transition";
import { useServerTimeOffset } from "@/lib/serverTime";
import { toast } from "sonner";
import {
  Activity,
  ArrowRight,
  Backpack,
  Bell,
  Biohazard,
  Calculator,
  Check,
  ChevronRight,
  Circle,
  Clock,
  Cog,
  Cross,
  Crown,
  Dna,
  Drama,
  Droplet,
  Eye,
  FlaskConical,
  Gavel,
  Hand,
  Heart,
  History,
  ListChecks,
  Lock,
  LockOpen,
  type LucideIcon,
  Mail,
  Megaphone,
  Notebook,
  NotebookPen,
  Pause,
  PencilLine,
  Play,
  Radar,
  ScrollText,
  Search,
  Send,
  Shield,
  SkipForward,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Swords,
  Thermometer,
  Trophy,
  Users,
  Wine,
  Zap,
} from "lucide-react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  player_id: string | null;
  payload?: Record<string, unknown> | null;
};
type Action = {
  id: string;
  tour: number;
  phase: string;
  actor_player_id: string;
  created_at: string;
};
// 3 zones de pilotage + cahier de notes.
type GMTab = "pont" | "recit" | "table" | "notes";
// Sous-vues de la zone RÉCIT.
type RecitView = "announces" | "events" | "resolve" | "results";

const phaseFr = (p: string) =>
  p === "free"
    ? "Enquête"
    : p === "annonce"
      ? "Annonce"
      : p === "gathering"
        ? "Débat"
        : p === "vote"
          ? "Vote"
          : p;

export function GM1Dashboard(ctx: FrameContext) {
  const { game, players, roles, gameId } = ctx;
  const [tab, setTab] = useState<GMTab>("pont");
  const [busy, setBusy] = useState(false);
  const paused = !!game.paused;
  const [selected, setSelected] = useState<string | null>(null);
  const [feed, setFeed] = useState<Notif[]>([]);
  const [acted, setActed] = useState<Set<string>>(new Set());

  const livePlayers = players.filter((p) => !p.is_mj);
  const alive = livePlayers.filter((p) => p.is_alive && !p.is_imprisoned);
  const imp = livePlayers.filter((p) => p.is_imprisoned);
  const dead = livePlayers.filter((p) => !p.is_alive);

  async function loadFeed() {
    const [{ data: n }, { data: a }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("game_id", gameId)
        .is("player_id", null)
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("role_actions")
        .select("id, tour, phase, actor_player_id, created_at")
        .eq("game_id", gameId)
        .eq("tour", game.current_tour),
    ]);
    setFeed((n ?? []) as Notif[]);
    setActed(new Set(((a ?? []) as Action[]).map((x) => x.actor_player_id)));
  }
  useEffect(() => {
    void loadFeed();
    const ch = supabase
      .channel(`mj-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `game_id=eq.${gameId}` },
        () => void loadFeed(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_actions", filter: `game_id=eq.${gameId}` },
        () => void loadFeed(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, game.current_tour]);

  const expectedActors = useMemo(
    () =>
      alive.filter((p) => {
        const r = roles.get(p.role_slug ?? "");
        return (
          r &&
          r.phase_activation &&
          r.phase_activation !== "passive" &&
          r.phase_activation !== "passif"
        );
      }),
    [alive, roles],
  );
  const missingActions = expectedActors.filter((p) => !acted.has(p.id)).length;
  const totalActions = expectedActors.length;

  async function run(_label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    // Pas de toast de confirmation pour le pacing de phase (« Vote ouvert » etc.) :
    // le changement est déjà visible dans le cockpit (chrono, CTA). On ne garde que
    // le toast d'ERREUR. Les notifs de jeu utiles passent par la carte GameToast.
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }
  async function tryRing() {
    if (missingActions > 0) {
      const ok = window.confirm(
        `${missingActions} / ${totalActions} actions encore manquantes. Forcer ? Les retardataires auront des actions aléatoires.`,
      );
      if (!ok) return;
    }
    await run("Annonce", () => ringGathering(gameId, "MJ"));
  }

  const selectedPlayer = livePlayers.find((p) => p.id === selected) ?? null;
  const isFree = game.current_phase === "free";
  const isAnnonce = game.current_phase === "annonce";
  const isGathering = game.current_phase === "gathering";
  const isVote = game.current_phase === "vote";
  const [recitView, setRecitView] = useState<RecitView>("announces");

  const announcements = feed.filter((n) => n.type === "mj_announce");
  const events = feed.filter((n) => n.type !== "mj_announce" && n.type !== "mj_note");
  const notes = feed.filter((n) => n.type === "mj_note");

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at top, oklch(0.20 0.06 40 / 0.6), transparent 55%), radial-gradient(ellipse at bottom, oklch(0.16 0.05 320 / 0.4), transparent 60%), oklch(0.14 0.02 35)",
      }}
    >
      {/* ── Hero ── */}
      <header
        className="relative px-5 pt-5 pb-4 border-b"
        style={{
          borderColor: "oklch(0.30 0.04 35 / 0.6)",
          background:
            "linear-gradient(180deg, oklch(0.20 0.07 40 / 0.55), oklch(0.16 0.04 35 / 0.2))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="size-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.30 0.10 80), oklch(0.22 0.08 22))",
                boxShadow:
                  "0 0 0 1px oklch(0.78 0.16 75 / 0.4), 0 8px 24px -8px oklch(0.78 0.16 75 / 0.45)",
              }}
            >
              <Crown className="size-6" style={{ color: "var(--primary-glow)" }} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-gold">
                Détective — Maître du Jeu
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Manoir</span>
                <span className="opacity-50">·</span>
                <span
                  className="font-mono px-1.5 py-0.5 rounded-md text-foreground/90"
                  style={{
                    background: "oklch(0.22 0.03 35 / 0.7)",
                    border: "1px solid oklch(0.32 0.04 35 / 0.6)",
                  }}
                >
                  {game.code}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => run(paused ? "Reprise" : "Pause", () => setPaused(gameId, !paused))}
            className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition active:scale-95 ${
              paused
                ? "bg-amber-500/15 text-amber-300 border-amber-400/50 shadow-[0_0_12px_-4px_oklch(0.78_0.16_60/0.6)]"
                : "bg-card/60 text-foreground border-border hover:bg-card"
            }`}
          >
            {paused ? (
              <Play className="size-3.5" aria-hidden />
            ) : (
              <Pause className="size-3.5" aria-hidden />
            )}
            {paused ? "Reprendre" : "Pause"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <div
            className="text-gold uppercase"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textShadow: "0 0 24px oklch(0.78 0.16 75 / 0.35)",
            }}
          >
            {phaseLabel(game.current_phase, game.current_tour)}
          </div>
          <div className="mt-1 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <KpiDot tone="emerald" label={`${alive.length} vivants`} />
            <KpiDot tone="amber" label={`${imp.length} prison`} />
            <KpiDot tone="rose" label={`${dead.length} morts`} />
          </div>
        </div>
      </header>

      {/* ── Zones de pilotage ── */}
      <nav
        className="grid grid-cols-4 border-b text-[10px] uppercase tracking-wider"
        style={{
          borderColor: "oklch(0.30 0.04 35 / 0.5)",
          background:
            "linear-gradient(180deg, oklch(0.18 0.03 35 / 0.5), oklch(0.16 0.02 35 / 0.2))",
        }}
      >
        <GMTabBtn
          active={tab === "pont"}
          onClick={() => setTab("pont")}
          icon={<Radar className="size-[18px]" />}
          label="Pont"
          accent="var(--primary)"
          badge={isFree && missingActions > 0 ? missingActions : undefined}
        />
        <GMTabBtn
          active={tab === "recit"}
          onClick={() => setTab("recit")}
          icon={<Megaphone className="size-[18px]" />}
          label="Récit"
          accent="var(--citoyens)"
          badge={events.length || undefined}
        />
        <GMTabBtn
          active={tab === "table"}
          onClick={() => setTab("table")}
          icon={<Users className="size-[18px]" />}
          label="Table"
          accent="oklch(0.74 0.15 300)"
        />
        <GMTabBtn
          active={tab === "notes"}
          onClick={() => setTab("notes")}
          icon={<NotebookPen className="size-[18px]" />}
          label="Notes"
          accent="var(--success)"
          badge={notes.length || undefined}
        />
      </nav>

      <div className="flex-1 min-h-0">
        {tab === "pont" && (
          <PontTab
            alive={alive}
            imp={imp}
            dead={dead}
            roles={roles}
            players={livePlayers}
            busy={busy}
            phase={game.current_phase}
            isFree={isFree}
            isAnnonce={isAnnonce}
            isGathering={isGathering}
            isVote={isVote}
            missingActions={missingActions}
            totalActions={totalActions}
            expectedActors={expectedActors}
            acted={acted}
            phaseStartedAt={game.phase_started_at}
            plannedDur={game.phase_duration_s ?? 0}
            paused={paused}
            events={events}
            tour={game.current_tour}
            gameId={gameId}
            onRing={tryRing}
            onOpenGathering={() => run("Débat ouvert", () => openGathering(gameId))}
            onOpenVote={() => run("Vote ouvert", () => openVote(gameId))}
            onCloseVote={() => run("Vote clôturé", () => closeVote(gameId))}
            onFree={() => run("Enquête", () => setPhase(gameId, "free"))}
            onNext={() => run("Tour suivant", () => nextCycle(gameId))}
            onSelect={setSelected}
          />
        )}
        {tab === "recit" && (
          <RecitZone
            view={recitView}
            setView={setRecitView}
            announcements={announcements}
            events={events}
            game={game}
            gameId={gameId}
            players={livePlayers}
            roles={roles}
          />
        )}
        {tab === "table" && (
          <RosterTab
            livePlayers={livePlayers}
            roles={roles}
            acted={acted}
            tour={game.current_tour}
            onSelect={setSelected}
          />
        )}
        {tab === "notes" && (
          <NotesTab
            gameId={gameId}
            notes={notes}
            players={livePlayers}
            tour={game.current_tour}
            phase={game.current_phase}
          />
        )}
      </div>

      {selectedPlayer && (
        <PlayerSheet
          player={selectedPlayer}
          role={roles.get(selectedPlayer.role_slug ?? "") ?? null}
          gameId={gameId}
          players={players}
          rolesMap={roles}
          tour={game.current_tour}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ═════════════════════════ Zone 1 — PONT DE COMMANDE ═════════════════════════
function PontTab({
  alive,
  imp,
  dead,
  roles,
  players,
  busy,
  phase,
  isFree,
  isAnnonce,
  isGathering,
  isVote,
  missingActions,
  totalActions,
  expectedActors,
  acted,
  phaseStartedAt,
  plannedDur,
  paused,
  events,
  tour,
  gameId,
  onRing,
  onOpenGathering,
  onOpenVote,
  onCloseVote,
  onFree,
  onNext,
  onSelect,
}: {
  alive: PlayerLite[];
  imp: PlayerLite[];
  dead: PlayerLite[];
  roles: Map<string, RoleRow>;
  players: PlayerLite[];
  busy: boolean;
  phase: string;
  isFree: boolean;
  isAnnonce: boolean;
  isGathering: boolean;
  isVote: boolean;
  missingActions: number;
  totalActions: number;
  expectedActors: PlayerLite[];
  acted: Set<string>;
  phaseStartedAt: string | null;
  plannedDur: number;
  paused: boolean;
  events: Notif[];
  tour: number;
  gameId: string;
  onRing: () => void;
  onOpenGathering: () => void;
  onOpenVote: () => void;
  onCloseVote: () => void;
  onFree: () => void;
  onNext: () => void;
  onSelect: (id: string) => void;
}) {
  const camps = useMemo(() => analyzeCamps(alive, roles), [alive, roles]);
  const deathsThisTour = events.filter(
    (e) =>
      ["death", "killed", "linked_death"].includes(e.type) &&
      Number((e.payload as Record<string, unknown> | null | undefined)?.tour ?? tour) === tour,
  ).length;
  const totalDeaths = events.filter((e) =>
    ["death", "killed", "linked_death"].includes(e.type),
  ).length;
  const survivalRate =
    players.length > 0
      ? Math.round((players.filter((p) => p.is_alive).length / players.length) * 100)
      : 0;

  return (
    <div className="p-4 space-y-5">
      {/* ① Pacing contextuel — le geste à faire MAINTENANT */}
      <PacingPanel
        busy={busy}
        phase={phase}
        isFree={isFree}
        isAnnonce={isAnnonce}
        isGathering={isGathering}
        isVote={isVote}
        missingActions={missingActions}
        totalActions={totalActions}
        phaseStartedAt={phaseStartedAt}
        plannedDur={plannedDur}
        paused={paused}
        onRing={onRing}
        onOpenGathering={onOpenGathering}
        onOpenVote={onOpenVote}
        onCloseVote={onCloseVote}
        onFree={onFree}
        onNext={onNext}
      />

      {/* ② Checklist « prêt à avancer » — en Enquête uniquement */}
      {isFree && totalActions > 0 && (
        <ReadyChecklist
          expectedActors={expectedActors}
          acted={acted}
          roles={roles}
          gameId={gameId}
          tour={tour}
          phase={phase}
          onSelect={onSelect}
        />
      )}

      {/* ②bis Aperçu de résolution — ce qui va se passer à l'Annonce */}
      {(isFree || isGathering) && (
        <ResolutionPreview gameId={gameId} tour={tour} players={players} onSelect={onSelect} />
      )}

      {/* ③ Proximité de victoire (estimation) */}
      <VictoryGauge camps={camps} />

      {/* ④ Tension-mètre + directive */}
      <TensionMeter
        camps={camps}
        deathsThisTour={deathsThisTour}
        totalDeaths={totalDeaths}
        survivalRate={survivalRate}
        tour={tour}
      />

      {/* ⑤ Effectifs */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          label="Vivants"
          count={alive.length}
          tone="emerald"
          players={alive}
          roles={roles}
          onSelect={onSelect}
        />
        <StatCard
          label="Prison"
          count={imp.length}
          tone="amber"
          players={imp}
          roles={roles}
          onSelect={onSelect}
        />
        <StatCard
          label="Morts"
          count={dead.length}
          tone="rose"
          players={dead}
          roles={roles}
          onSelect={onSelect}
          dead
        />
      </div>

      {/* ⑥ Analyse rapide */}
      <QuickAnalysis players={players} events={events} tour={tour} />
    </div>
  );
}

// ─── ① Pacing contextuel ───────────────────────────────────────────────
// Un seul grand bouton : le geste pertinent pour la phase courante. En phase
// libre, il s'illumine en « prêt » quand tout le monde a agi, sinon il prévient
// du nombre d'actions manquantes (clic = confirmation avant de forcer).
function PacingPanel({
  busy,
  phase,
  isFree,
  isAnnonce,
  isGathering,
  isVote,
  missingActions,
  totalActions,
  phaseStartedAt,
  plannedDur,
  paused,
  onRing,
  onOpenGathering,
  onOpenVote,
  onCloseVote,
  onFree,
  onNext,
}: {
  busy: boolean;
  phase: string;
  isFree: boolean;
  isAnnonce: boolean;
  isGathering: boolean;
  isVote: boolean;
  missingActions: number;
  totalActions: number;
  phaseStartedAt: string | null;
  plannedDur: number;
  paused: boolean;
  onRing: () => void;
  onOpenGathering: () => void;
  onOpenVote: () => void;
  onCloseVote: () => void;
  onFree: () => void;
  onNext: () => void;
}) {
  const ready = isFree && totalActions > 0 && missingActions === 0;
  const step = isFree
    ? {
        label: (
          <>
            <Megaphone className="size-4" /> Lancer le dénouement
          </>
        ),
        action: onRing,
        badge: totalActions > 0 ? `${totalActions - missingActions} / ${totalActions}` : undefined,
        warn: missingActions > 0,
        hint:
          totalActions === 0
            ? "Aucune capacité active ce tour — tu peux résoudre quand tu veux."
            : ready
              ? "Tout le monde a agi — prêt pour l'annonce."
              : `${missingActions} joueur(s) n'ont pas encore agi.`,
      }
    : isAnnonce
      ? {
          label: (
            <>
              <Bell className="size-4" /> Ouvrir le Débat
            </>
          ),
          action: onOpenGathering,
          badge: undefined,
          warn: false,
          hint: "Le dénouement est résolu et annoncé — ouvre le débat.",
        }
      : isGathering
        ? {
            label: (
              <>
                <Gavel className="size-4" /> Lancer le vote
              </>
            ),
            action: onOpenVote,
            badge: undefined,
            warn: false,
            hint: "Le débat est terminé — place au vote.",
          }
        : isVote
          ? {
              label: (
                <>
                  <Check className="size-4" /> Clore le vote
                </>
              ),
              action: onCloseVote,
              badge: undefined,
              warn: false,
              hint: "Clôture le vote pour appliquer le verdict et passer au tour suivant.",
            }
          : {
              label: (
                <>
                  <SkipForward className="size-4" /> Tour suivant
                </>
              ),
              action: onNext,
              badge: undefined,
              warn: false,
              hint: "Partie figée — relance un nouveau tour.",
            };

  // Stepper de phase — ordre canonique DA « Enquête › Annonce › Débat › Vote ».
  const activeIdx = PHASE_STEPS.findIndex((p) => p.key === phase);
  const activeColor = PHASE_STEPS[activeIdx]?.color ?? "var(--accent)";

  return (
    <section>
      <div
        className="rounded-2xl border p-3.5 space-y-3"
        style={{
          background: ready
            ? "linear-gradient(135deg, oklch(0.24 0.10 145 / 0.4), oklch(0.16 0.03 35 / 0.55))"
            : "linear-gradient(135deg, oklch(0.20 0.05 40 / 0.5), oklch(0.16 0.03 35 / 0.55))",
          borderColor: ready ? "oklch(0.55 0.18 145 / 0.55)" : "oklch(0.32 0.04 35 / 0.6)",
          boxShadow: ready
            ? "0 0 28px -8px oklch(0.55 0.18 145 / 0.5)"
            : "0 8px 24px -12px oklch(0.20 0.10 22 / 0.6)",
        }}
      >
        {/* En-tête : « PHASE EN COURS » (teinte de la phase) + chrono inline */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[11px] uppercase tracking-[0.2em] font-bold inline-flex items-center gap-1.5 min-w-0"
            style={{ color: activeColor, fontFamily: "var(--font-display)" }}
          >
            <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">Phase en cours</span>
          </span>
          <PhaseChrono startedAt={phaseStartedAt} plannedDur={plannedDur} paused={paused} compact />
        </div>

        {/* Stepper Enquête → Annonce → Débat → Vote */}
        <div className="flex items-center gap-0.5">
          {PHASE_STEPS.map((p, i) => (
            <Fragment key={p.key}>
              {i > 0 && (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              <PhaseStep label={p.label} color={p.color} active={i === activeIdx} />
            </Fragment>
          ))}
        </div>

        <BigBtn
          disabled={busy}
          onClick={step.action}
          primary
          badge={step.badge}
          badgeRed={step.warn}
          arrow={!isVote}
        >
          {step.label}
        </BigBtn>
        <p
          className={`text-[11px] leading-snug text-center ${step.warn ? "text-amber-300" : ready ? "text-emerald-300" : "text-muted-foreground"}`}
        >
          {step.hint}
        </p>
        <div
          className="grid grid-cols-2 gap-2 pt-1 border-t"
          style={{ borderColor: "oklch(0.30 0.04 35 / 0.4)" }}
        >
          <SmallBtn disabled={busy} onClick={onFree}>
            <Sun className="size-3.5" /> Enquête
          </SmallBtn>
          <SmallBtn disabled={busy} onClick={onNext}>
            <SkipForward className="size-3.5" /> Tour +1
          </SmallBtn>
        </div>
      </div>
    </section>
  );
}

// Ordre canonique des phases (DA « tableau d'enquête ») + teinte d'identité.
const PHASE_STEPS = [
  { key: "free", label: "Enquête", color: "var(--phase-enquete)" },
  { key: "annonce", label: "Annonce", color: "var(--phase-annonce)" },
  { key: "gathering", label: "Débat", color: "var(--phase-debat)" },
  { key: "vote", label: "Vote", color: "var(--phase-vote)" },
] as const;

// Pastille d'une étape de phase : remplie (active) ou teintée en sourdine (à venir/passée).
function PhaseStep({ label, color, active }: { label: string; color: string; active: boolean }) {
  return (
    <span
      className="flex-1 text-center text-[9px] font-bold uppercase tracking-wider py-1 rounded-md truncate transition"
      style={
        active
          ? {
              background: color,
              color: "oklch(0.18 0.03 35)",
              boxShadow: `0 0 14px -2px color-mix(in oklab, ${color} 70%, transparent)`,
            }
          : {
              color: `color-mix(in oklab, ${color} 60%, var(--muted-foreground))`,
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
            }
      }
    >
      {label}
    </span>
  );
}

// ─── Chrono de phase (compte-MONTANT) ──────────────────────────────────
// En Mode MJ il n'y a pas d'avancement auto : ce chrono est purement indicatif.
// Il affiche le temps écoulé depuis le début de la phase, avec la durée prévue
// en repère. Au-delà du repère, l'affichage passe en ambre (sans rien forcer).
function PhaseChrono({
  startedAt,
  plannedDur,
  paused,
  compact,
}: {
  startedAt: string | null;
  plannedDur: number;
  paused: boolean;
  compact?: boolean;
}) {
  // Aligné sur l'horloge serveur (comme le chrono joueur de ShellHeader), sinon
  // l'écoulé du pilotage dérive du temps réel du tour selon le décalage client.
  const offset = useServerTimeOffset();
  const [now, setNow] = useState(() => Date.now() + (typeof offset === "number" ? offset : 0));
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [paused, offset]);
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime() + INTRO_MS;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const mm = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");
  const over = plannedDur > 0 && elapsed > plannedDur;
  const ref =
    plannedDur > 0
      ? `${Math.floor(plannedDur / 60)}:${(plannedDur % 60).toString().padStart(2, "0")}`
      : null;
  if (compact) {
    return (
      <span
        className={`shrink-0 font-mono text-base font-bold tabular-nums inline-flex items-center gap-1.5 ${paused ? "text-amber-300" : over ? "text-amber-300" : "text-foreground"}`}
      >
        {paused ? (
          <Pause className="size-4" aria-hidden />
        ) : (
          <Clock className="size-4" aria-hidden />
        )}
        {mm}:{ss}
      </span>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        <Clock className="size-3" aria-hidden /> Écoulé
      </span>
      <span
        className={`font-mono text-xl font-bold tabular-nums inline-flex items-center ${paused ? "text-amber-300" : over ? "text-amber-300" : "text-foreground"}`}
      >
        {paused ? <Pause className="size-4 mr-1" aria-hidden /> : null}
        {mm}:{ss}
      </span>
      {ref && <span className="text-[10px] text-muted-foreground">/ repère {ref}</span>}
    </div>
  );
}

// ─── ② Checklist « prêt à avancer » ────────────────────────────────────
// Liste des joueurs censés agir ce tour. Les retardataires peuvent être
// « relancés » en 1 tap (notification privée = ping côté joueur).
function ReadyChecklist({
  expectedActors,
  acted,
  roles,
  gameId,
  tour,
  phase,
  onSelect,
}: {
  expectedActors: PlayerLite[];
  acted: Set<string>;
  roles: Map<string, RoleRow>;
  gameId: string;
  tour: number;
  phase: string;
  onSelect: (id: string) => void;
}) {
  const [nudged, setNudged] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);
  const pending = expectedActors.filter((p) => !acted.has(p.id));
  const doneCount = expectedActors.length - pending.length;
  const pct =
    expectedActors.length === 0 ? 100 : Math.round((doneCount / expectedActors.length) * 100);

  async function nudge(p: PlayerLite) {
    if (nudged.has(p.id)) return;
    setNudged((s) => new Set(s).add(p.id));
    const { error } = await supabase.from("notifications").insert({
      game_id: gameId,
      player_id: p.id,
      type: "mj_nudge",
      title: "⏰ Le Détective t'attend",
      body: "L'Enquête se termine bientôt — pense à utiliser ta capacité.",
      payload: { tour, phase, nudge: true } as never,
    });
    if (error) {
      toast.error("Relance impossible");
      setNudged((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    } else {
      toast.success(`⏰ ${p.pseudo} relancé`);
    }
  }

  async function nudgeAll() {
    for (const p of pending) await nudge(p);
  }

  return (
    <section>
      <SectionLabel
        icon={<ListChecks className="size-3.5" />}
        text="Prêt à avancer ?"
        right={`${doneCount} / ${expectedActors.length}`}
      />
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "oklch(0.18 0.03 35 / 0.5)",
          borderColor: "oklch(0.32 0.04 35 / 0.55)",
        }}
      >
        {/* Barre de progression */}
        <button onClick={() => setOpen((v) => !v)} className="w-full px-3 pt-3 pb-2.5 text-left">
          <div className="relative h-2.5 rounded-full overflow-hidden bg-background/60 border border-border/50">
            <div
              className="absolute inset-y-0 left-0 transition-all"
              style={{
                width: `${pct}%`,
                background:
                  pending.length === 0
                    ? "linear-gradient(90deg, oklch(0.55 0.18 145), oklch(0.72 0.16 145))"
                    : "linear-gradient(90deg, oklch(0.65 0.18 60), oklch(0.78 0.16 70))",
              }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            <span
              className={
                pending.length === 0
                  ? "text-emerald-300 font-semibold"
                  : "text-amber-300 font-semibold"
              }
            >
              {pending.length === 0 ? "Tout le monde a joué" : `${pending.length} en attente`}
            </span>
            <span className="text-muted-foreground">{open ? "▲ replier" : "▼ déplier"}</span>
          </div>
        </button>

        {open && (
          <div className="px-2 pb-2.5 space-y-1">
            {pending.length > 1 && (
              <button
                onClick={() => void nudgeAll()}
                className="w-full mb-1 text-[10px] uppercase tracking-wider py-1.5 rounded-lg border border-amber-400/40 text-amber-300 hover:bg-amber-500/10 transition"
              >
                Relancer tous les retardataires
              </button>
            )}
            {expectedActors.map((p) => {
              const r = roles.get(p.role_slug ?? "");
              const m = (p.role_meta ?? {}) as Record<string, unknown>;
              const av = avatarOf(m.avatar as string | undefined, p.id);
              const done = acted.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] border ${
                    done
                      ? "border-emerald-400/20 bg-emerald-500/5"
                      : "border-amber-400/20 bg-amber-500/5"
                  }`}
                >
                  <button
                    onClick={() => onSelect(p.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left"
                  >
                    <AvatarImg avatar={av} size={22} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium" style={{ color: roleColor(r) }}>
                        {p.pseudo}
                      </span>
                      <span className="block truncate text-[9px] text-muted-foreground">
                        {r?.name_fr ?? "—"}
                      </span>
                    </span>
                  </button>
                  {done ? (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
                      ✓ a joué
                    </span>
                  ) : (
                    <button
                      onClick={() => void nudge(p)}
                      disabled={nudged.has(p.id)}
                      className="shrink-0 text-[9px] px-2 py-0.5 rounded-full border border-amber-400/50 text-amber-300 hover:bg-amber-500/15 disabled:opacity-40 transition"
                    >
                      {nudged.has(p.id) ? "relancé" : "relancer"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

type PlayerLite = {
  id: string;
  pseudo: string;
  is_alive: boolean;
  is_imprisoned: boolean;
  role_slug: string | null;
  role_meta: unknown;
};

function StatCard({
  label,
  count,
  tone,
  players,
  roles,
  onSelect,
  dead,
}: {
  label: string;
  count: number;
  tone: "emerald" | "amber" | "rose";
  players: PlayerLite[];
  roles: Map<string, RoleRow>;
  onSelect: (id: string) => void;
  dead?: boolean;
}) {
  const palette = {
    emerald: {
      ring: "oklch(0.55 0.18 145 / 0.5)",
      num: "oklch(0.85 0.18 145)",
      bg: "linear-gradient(135deg, oklch(0.22 0.10 145 / 0.35), oklch(0.16 0.04 35 / 0.5))",
    },
    amber: {
      ring: "oklch(0.65 0.18 60 / 0.5)",
      num: "oklch(0.88 0.18 70)",
      bg: "linear-gradient(135deg, oklch(0.22 0.10 60 / 0.35), oklch(0.16 0.04 35 / 0.5))",
    },
    rose: {
      ring: "oklch(0.55 0.22 22 / 0.5)",
      num: "oklch(0.78 0.22 22)",
      bg: "linear-gradient(135deg, oklch(0.22 0.10 22 / 0.35), oklch(0.16 0.04 35 / 0.5))",
    },
  }[tone];
  return (
    <div
      className="rounded-2xl border p-2.5"
      style={{
        borderColor: palette.ring,
        background: palette.bg,
        boxShadow: `0 8px 24px -10px ${palette.ring}`,
      }}
    >
      <div className="text-center">
        <div
          className="text-2xl font-bold tabular-nums"
          style={{ color: palette.num, fontFamily: "var(--font-display)" }}
        >
          {count}
        </div>
        <div className="text-[9px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">
          {label}
        </div>
      </div>
      <ul className="mt-2 space-y-0.5">
        {players.length === 0 && (
          <li className="text-[10px] text-muted-foreground italic text-center">—</li>
        )}
        {players.slice(0, 6).map((p) => {
          const r = roles.get(p.role_slug ?? "");
          const meta = (p.role_meta ?? {}) as Record<string, unknown>;
          const av = avatarOf(meta.avatar as string | undefined, p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() => onSelect(p.id)}
                className="w-full text-left text-[11px] px-1.5 py-0.5 rounded-md hover:bg-card/60 transition flex items-center gap-1.5 min-w-0"
              >
                <AvatarImg avatar={av} size={16} />
                <span
                  className={`truncate ${dead ? "line-through opacity-70" : ""}`}
                  style={{ color: roleColor(r) }}
                >
                  {p.pseudo}
                </span>
              </button>
            </li>
          );
        })}
        {players.length > 6 && (
          <li className="text-[9px] text-center text-muted-foreground">
            +{players.length - 6} autres
          </li>
        )}
      </ul>
    </div>
  );
}

// ─── ③ Analyse des camps (estimation live, miroir simplifié de evaluateWin) ───
type CampStats = {
  total: number;
  mechants: number;
  vampires: number;
  civils: number;
  blocking: number;
  benign: number;
  loversActive: boolean;
  subversifs: string[];
  /** Morts d'opposants pour que les Méchants atteignent la parité. */
  mechGap: number;
  /** Ennemis des Civils encore en vie (tous doivent tomber). */
  civilGap: number;
  /** Non-vampires encore en vie. */
  vampGap: number;
};
function analyzeCamps(alive: PlayerLite[], roles: Map<string, RoleRow>): CampStats {
  let mechants = 0,
    vampires = 0,
    civils = 0,
    blocking = 0,
    benign = 0,
    loverCount = 0;
  const subversifs: string[] = [];
  for (const p of alive) {
    const r = roles.get(p.role_slug ?? "");
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    if (p.role_slug === "vampire" || m.converted) {
      vampires += 1;
      if (m.infected) subversifs.push(p.pseudo);
      continue;
    }
    if (m.infected) subversifs.push(p.pseudo);
    if (m.linked_with) loverCount += 1;
    if (!r) continue;
    if (r.faction === "Civil") {
      civils += 1;
      continue;
    }
    if (r.faction === "Méchant") {
      mechants += 1;
      continue;
    }
    if (r.faction === "Neutre") {
      const t = (r.type ?? "").toUpperCase();
      if (t === "BÉNIN") benign += 1;
      else if (p.role_slug === "chasseur_de_vampire")
        civils += 0; // allié des Civils
      else {
        blocking += 1;
        if (/subversif/i.test(r.type ?? "")) subversifs.push(p.pseudo);
      }
    }
  }
  const total = alive.length;
  const loversActive = loverCount >= 2;
  const mechOpponents = total - mechants - benign; // bénins ne comptent pas comme opposants
  const mechGap = Math.max(0, mechOpponents - mechants);
  const civilGap = mechants + vampires + blocking + (loversActive ? 1 : 0);
  const vampGap = total - vampires;
  return {
    total,
    mechants,
    vampires,
    civils,
    blocking,
    benign,
    loversActive,
    subversifs,
    mechGap,
    civilGap,
    vampGap,
  };
}

// ─── ③ Jauge de proximité de victoire ──────────────────────────────────
function VictoryGauge({ camps }: { camps: CampStats }) {
  type Row = {
    key: string;
    label: string;
    icon: LucideIcon;
    gap: number;
    color: string;
    present: boolean;
  };
  const rows: Row[] = [
    {
      key: "civil",
      label: "Citoyens",
      icon: Shield,
      gap: camps.civilGap,
      color: "oklch(0.70 0.16 230)",
      present: camps.civils > 0,
    },
    {
      key: "mechant",
      label: "Méchants",
      icon: Swords,
      gap: camps.mechGap,
      color: "oklch(0.65 0.22 22)",
      present: camps.mechants > 0,
    },
    {
      key: "vampire",
      label: "Vampires",
      icon: Droplet,
      gap: camps.vampGap,
      color: "oklch(0.62 0.22 320)",
      present: camps.vampires > 0,
    },
  ].filter((r) => r.present);

  const closest = rows.reduce<Row | null>(
    (best, r) => (best === null || r.gap < best.gap ? r : best),
    null,
  );

  return (
    <section>
      <SectionLabel
        icon={<Trophy className="size-3.5" />}
        text="Proximité de victoire"
        right="estimation"
      />
      <div
        className="rounded-2xl border p-3.5 space-y-2.5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.20 0.05 40 / 0.55), oklch(0.16 0.03 35 / 0.5))",
          borderColor: "oklch(0.32 0.04 35 / 0.55)",
          boxShadow: "0 8px 24px -10px oklch(0.20 0.10 22 / 0.6)",
        }}
      >
        {rows.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic text-center py-1">
            Aucun camp évaluable.
          </div>
        )}
        {rows.map((r) => {
          const lead = closest?.key === r.key && rows.length > 1;
          // Remplissage : plus la jauge est pleine, plus le camp est proche de gagner.
          const fill =
            camps.total > 0 ? Math.max(6, Math.round((1 - r.gap / camps.total) * 100)) : 0;
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span
                  className="font-semibold inline-flex items-center gap-1"
                  style={{ color: r.color }}
                >
                  <r.icon className="size-3.5" /> {r.label}
                  {lead && <span className="ml-1.5 text-gold">★ en tête</span>}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {r.gap === 0
                    ? "victoire imminente"
                    : `à ${r.gap} ${r.key === "mechant" ? "mort(s) de la parité" : "élimination(s)"}`}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden border border-border/40 bg-background/60">
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{ width: `${fill}%`, background: r.color }}
                />
              </div>
            </div>
          );
        })}
        {camps.subversifs.length > 0 && (
          <div
            className="flex items-center gap-2 text-[11px] text-fuchsia-300 px-2 py-1 rounded-lg"
            style={{
              background: "oklch(0.20 0.10 320 / 0.25)",
              border: "1px solid oklch(0.55 0.20 320 / 0.4)",
            }}
          >
            <Droplet className="size-3.5 shrink-0" aria-hidden />
            <span className="font-semibold">Menace subversive</span>
            <span className="opacity-80 truncate">
              · {camps.subversifs.length} ({camps.subversifs.join(", ")})
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── ④ Tension-mètre + directive de mise en scène ──────────────────────
function TensionMeter({
  camps,
  deathsThisTour,
  totalDeaths,
  survivalRate,
  tour,
}: {
  camps: CampStats;
  deathsThisTour: number;
  totalDeaths: number;
  survivalRate: number;
  tour: number;
}) {
  // Heuristique simple : morts récentes + déséquilibre + faible survie + avancée du temps.
  const closestGap = Math.min(camps.civilGap || 99, camps.mechGap || 99, camps.vampGap || 99);
  const imminence = closestGap <= 1 ? 30 : closestGap === 2 ? 18 : closestGap === 3 ? 8 : 0;
  const raw =
    20 +
    deathsThisTour * 20 +
    imminence +
    Math.max(0, 70 - survivalRate) * 0.4 +
    Math.min(12, tour * 1.5);
  const tension = Math.max(5, Math.min(98, Math.round(raw)));

  const band =
    tension >= 66
      ? {
          label: "Sous haute tension",
          color: "oklch(0.68 0.22 22)",
          text: "text-rose-300",
          directive: "Laisse mariner — le drame est mûr, ne précipite rien.",
        }
      : tension >= 36
        ? {
            label: "Rythme sain",
            color: "oklch(0.78 0.16 75)",
            text: "text-gold",
            directive: "Bon tempo — laisse les joueurs manœuvrer.",
          }
        : {
            label: "Calme plat",
            color: "oklch(0.70 0.16 145)",
            text: "text-emerald-300",
            directive: "Pimente : pousse une rumeur, accélère, ou force un rebondissement.",
          };

  return (
    <section>
      <SectionLabel
        icon={<Thermometer className="size-3.5" />}
        text="Tension"
        right={`${tension}`}
      />
      <div
        className="rounded-2xl border p-3.5 space-y-2"
        style={{
          background: "oklch(0.18 0.03 35 / 0.5)",
          borderColor: "oklch(0.32 0.04 35 / 0.55)",
        }}
      >
        <div className="relative h-2.5 rounded-full overflow-hidden border border-border/40 bg-background/60">
          <div
            className="absolute inset-y-0 left-0 transition-all"
            style={{
              width: `${tension}%`,
              background: `linear-gradient(90deg, oklch(0.70 0.16 145), oklch(0.78 0.16 75), ${band.color})`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className={`font-semibold uppercase tracking-wider ${band.text}`}>
            {band.label}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {deathsThisTour} mort(s) ce tour · {totalDeaths} au total
          </span>
        </div>
        <p className="text-[11px] text-foreground/85 leading-snug">{band.directive}</p>
      </div>
    </section>
  );
}

// ─── Mini analyse rapide (proto) ───
function QuickAnalysis({
  players,
  events,
  tour,
}: {
  players: PlayerLite[];
  events: Notif[];
  tour: number;
}) {
  // Stats simples dérivées des notifications
  const deathsThisTour = events.filter(
    (e) =>
      ["death", "killed", "linked_death"].includes(e.type) &&
      Number((e.payload as Record<string, unknown> | null | undefined)?.tour ?? tour) === tour,
  ).length;
  const totalDeaths = events.filter((e) =>
    ["death", "killed", "linked_death"].includes(e.type),
  ).length;
  const investigations = events.filter((e) =>
    ["autopsy", "mouchard_info", "temoin_reveal"].includes(e.type),
  ).length;
  const protections = events.filter((e) =>
    ["protected", "shielded", "saved", "ward", "defended"].includes(e.type),
  ).length;
  const survivalRate =
    players.length > 0
      ? Math.round((players.filter((p) => p.is_alive).length / players.length) * 100)
      : 0;

  const items = [
    { icon: Skull, label: "Morts ce tour", value: deathsThisTour, tone: "rose" as const },
    { icon: Cross, label: "Morts totales", value: totalDeaths, tone: "rose" as const },
    { icon: Search, label: "Enquêtes", value: investigations, tone: "sky" as const },
    { icon: Shield, label: "Protections", value: protections, tone: "emerald" as const },
  ];

  return (
    <section>
      <SectionLabel
        icon={<Activity className="size-3.5" />}
        text="Analyse rapide"
        right={`Survie ${survivalRate}%`}
      />
      <div className="grid grid-cols-4 gap-1.5">
        {items.map((it) => {
          const palette = {
            rose: {
              c: "oklch(0.75 0.22 22)",
              b: "oklch(0.55 0.22 22 / 0.35)",
              bg: "oklch(0.22 0.08 22 / 0.3)",
            },
            sky: {
              c: "oklch(0.78 0.16 230)",
              b: "oklch(0.55 0.16 230 / 0.35)",
              bg: "oklch(0.20 0.07 230 / 0.3)",
            },
            emerald: {
              c: "oklch(0.80 0.18 145)",
              b: "oklch(0.55 0.18 145 / 0.35)",
              bg: "oklch(0.20 0.08 145 / 0.3)",
            },
          }[it.tone];
          return (
            <div
              key={it.label}
              className="rounded-xl border p-2 text-center"
              style={{ borderColor: palette.b, background: palette.bg }}
            >
              <div className="leading-none flex justify-center">
                <it.icon className="size-4" />
              </div>
              <div
                className="text-lg font-bold tabular-nums mt-0.5"
                style={{ color: palette.c, fontFamily: "var(--font-display)" }}
              >
                {it.value}
              </div>
              <div className="text-[8.5px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-tight">
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── ②bis Aperçu de résolution ─────────────────────────────────────────
// Lit les intentions en attente du tour courant (resolved_at IS NULL) et
// prédit l'issue : qui est menacé (ATTACK) et qui est couvert (PROTECT/CURE
// sur la même cible). Aide le MJ à narrer le suspense AVANT de sonner.
type PreviewIntent = {
  id: string;
  category: string | null;
  source: string | null;
  actor_player_id: string;
  target_player_id: string | null;
};
function ResolutionPreview({
  gameId,
  tour,
  players,
  onSelect,
}: {
  gameId: string;
  tour: number;
  players: PlayerLite[];
  onSelect: (id: string) => void;
}) {
  const [rows, setRows] = useState<PreviewIntent[]>([]);
  const name = (id: string | null) =>
    id ? (players.find((p) => p.id === id)?.pseudo ?? "?") : "—";

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("role_actions")
        .select("id, category, source, actor_player_id, target_player_id")
        .eq("game_id", gameId)
        .eq("tour", tour)
        .not("category", "is", null)
        .is("resolved_at", null)
        .limit(80);
      setRows((data ?? []) as PreviewIntent[]);
    };
    void load();
    const ch = supabase
      .channel(`mj-preview-${gameId}-${tour}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_actions", filter: `game_id=eq.${gameId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, tour]);

  const attacks = rows.filter((r) => r.category === "ATTACK");
  const shields = rows.filter((r) => r.category === "PROTECT" || r.category === "CURE");
  const protectedIds = new Set(shields.map((s) => s.target_player_id).filter(Boolean) as string[]);

  // Cibles attaquées, dédupliquées, avec statut couvert/menacé.
  const targetsMap = new Map<string, { covered: boolean }>();
  for (const a of attacks) {
    if (!a.target_player_id) continue;
    const cur = targetsMap.get(a.target_player_id) ?? { covered: false };
    if (protectedIds.has(a.target_player_id)) cur.covered = true;
    targetsMap.set(a.target_player_id, cur);
  }
  const threats = [...targetsMap.entries()];
  const otherPending = rows.filter(
    (r) => r.category !== "ATTACK" && r.category !== "PROTECT" && r.category !== "CURE",
  ).length;

  return (
    <section>
      <SectionLabel
        icon={<Eye className="size-3.5" />}
        text="Aperçu de résolution"
        right={rows.length ? `${rows.length} en file` : "—"}
      />
      <div
        className="rounded-2xl border p-3.5 space-y-2"
        style={{
          background: "oklch(0.18 0.03 35 / 0.5)",
          borderColor: "oklch(0.32 0.04 35 / 0.55)",
        }}
      >
        {rows.length === 0 ? (
          <div className="text-[11px] text-muted-foreground italic text-center py-1">
            Aucune intention en attente — rien ne se résoudra à l'Annonce.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="text-rose-300 font-semibold inline-flex items-center gap-1">
                <Swords className="size-3" /> {attacks.length} attaque(s)
              </span>
              <span className="text-sky-300 font-semibold inline-flex items-center gap-1">
                <Shield className="size-3" /> {shields.length} protection(s)
              </span>
              {otherPending > 0 && <span>· {otherPending} autre(s)</span>}
            </div>
            {threats.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic">
                Aucune attaque ciblée pour l'instant.
              </div>
            ) : (
              <ul className="space-y-1">
                {threats.map(([tid, st]) => (
                  <li key={tid}>
                    <button
                      onClick={() => onSelect(tid)}
                      className={`w-full text-left flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] border ${
                        st.covered
                          ? "border-sky-400/30 bg-sky-500/5"
                          : "border-rose-400/30 bg-rose-500/5"
                      }`}
                    >
                      <span className="font-medium truncate">{name(tid)}</span>
                      {st.covered ? (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/40 inline-flex items-center gap-1">
                          <Shield className="size-2.5" /> couvert — survit ?
                        </span>
                      ) : (
                        <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-400/40 inline-flex items-center gap-1">
                          <Skull className="size-2.5" /> en danger
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[9px] text-muted-foreground italic">
              Prévision indicative — l'ordre des couches peut modifier l'issue réelle.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ═════════════════════════ Zone 2 — RÉCIT ═════════════════════════
// Regroupe ce que le MJ raconte/observe : téléprompteur d'annonces, journal
// d'événements, et pipeline de résolution. Une seule zone, sous-onglets internes.
function RecitZone({
  view,
  setView,
  announcements,
  events,
  game,
  gameId,
  players,
  roles,
}: {
  view: RecitView;
  setView: (v: RecitView) => void;
  announcements: Notif[];
  events: Notif[];
  game: { current_tour: number; current_phase: string };
  gameId: string;
  players: PlayerLite[];
  roles: Map<string, RoleRow>;
}) {
  const seg = (key: RecitView, icon: React.ReactNode, label: string, count?: number) => (
    <button
      onClick={() => setView(key)}
      className={`flex-1 py-2 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition flex items-center justify-center gap-1 ${
        view === key
          ? "bg-gold/20 text-gold ring-1 ring-gold/40"
          : "bg-card/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count ? (
        <span className="text-[8px] px-1 rounded-full bg-card/60 border border-border">
          {count}
        </span>
      ) : null}
    </button>
  );
  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex gap-1.5 p-2 shrink-0 border-b"
        style={{ borderColor: "oklch(0.30 0.04 35 / 0.4)" }}
      >
        {seg(
          "announces",
          <Megaphone className="size-3.5" />,
          "Annonces",
          announcements.length || undefined,
        )}
        {seg("events", <ScrollText className="size-3.5" />, "Journal", events.length || undefined)}
        {seg("results", <Zap className="size-3.5" />, "Résultats")}
        {seg("resolve", <Calculator className="size-3.5" />, "Résol.")}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {view === "announces" && (
          <RingTab announcements={announcements} game={game} gameId={gameId} players={players} />
        )}
        {view === "events" && <EventsTab events={events} players={players} roles={roles} />}
        {view === "results" && <ResultsFeed gameId={gameId} players={players} roles={roles} />}
        {view === "resolve" && (
          <ResolveTab gameId={gameId} tour={game.current_tour} players={players} />
        )}
      </div>
    </div>
  );
}

// ─── Fil « Résultats » du MJ ──────────────────────────────────────────────
// Miroir omniscient de ce que voient les joueurs : chaque capacité jouée est
// rendue avec la MÊME carte que côté joueur (CapabilityCard → bloc résultat),
// précédée d'un en-tête « acteur ». Lecture SEULE : aucune écriture, aucun
// déclenchement — le mode sans MJ n'est en rien affecté. Le MJ a déjà le droit
// (RLS) de lire toutes les lignes `role_actions` de sa partie.
type ResultRow = {
  id: string;
  tour: number;
  phase: string;
  actor_player_id: string;
  target_player_id: string | null;
  target_player_id_2: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  created_at: string;
};

function ResultsFeed({
  gameId,
  players,
  roles,
}: {
  gameId: string;
  players: PlayerLite[];
  roles: Map<string, RoleRow>;
}) {
  const [rows, setRows] = useState<ResultRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("role_actions")
        .select(
          "id, tour, phase, actor_player_id, target_player_id, target_player_id_2, payload, result, created_at",
        )
        .eq("game_id", gameId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) setRows((data ?? []) as ResultRow[]);
    };
    void load();
    const ch = supabase
      .channel(`mj-results-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_actions", filter: `game_id=eq.${gameId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [gameId]);

  // CapabilityCard n'a besoin que de { id, pseudo, role_meta } pour les cibles.
  const cardPlayers = useMemo(
    () => players.map((p) => ({ id: p.id, pseudo: p.pseudo, role_meta: p.role_meta })),
    [players],
  );

  if (rows.length === 0) {
    return (
      <div className="p-2">
        <EmptyState
          icon={<Zap className="size-6 mx-auto" />}
          text="Aucune capacité jouée pour l'instant."
        />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2.5">
      {rows.map((r) => {
        const actor = players.find((p) => p.id === r.actor_player_id);
        const actorRole = actor ? roles.get(actor.role_slug ?? "") : undefined;
        const actorMeta = (
          actor?.role_meta && typeof actor.role_meta === "object" ? actor.role_meta : {}
        ) as Record<string, unknown>;
        const isItem = !!(r.payload as Record<string, unknown> | null)?.item;
        return (
          <div key={r.id}>
            <div className="flex items-center gap-1.5 mb-1 px-0.5">
              <AvatarImg
                id={actor?.id}
                avatar={avatarOf(
                  actorMeta.avatar as string | undefined,
                  actor?.id ?? r.actor_player_id,
                )}
                size={18}
              />
              <span
                className="text-xs font-semibold truncate"
                style={{ color: roleColor(actorRole ?? null) }}
              >
                {actor?.pseudo ?? "Joueur inconnu"}
              </span>
              {actorRole && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <RoleIcon role={actorRole} size={12} /> {actorRole.name_fr}
                </span>
              )}
            </div>
            <CapabilityCard
              tour={r.tour}
              phase={r.phase}
              created_at={r.created_at}
              payload={(r.payload ?? {}) as Record<string, unknown>}
              result={r.result}
              target_player_id={r.target_player_id}
              target_player_id_2={r.target_player_id_2}
              players={cardPlayers}
              roles={roles}
              kind={isItem ? "item" : "capability"}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Compositeur de diffusion ──────────────────────────────────────────
// Deux modes : « téléprompteur » (note privée que le MJ lira à voix haute,
// type mj_announce, player_id null) et « diffusion » (push réel sur tous les
// téléphones vivants, une notification mj_broadcast par joueur).
function BroadcastComposer({
  gameId,
  players,
  tour,
  phase,
}: {
  gameId: string;
  players: PlayerLite[];
  tour: number;
  phase: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const aliveTargets = players.filter((p) => p.is_alive);

  async function pushTeleprompter() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        game_id: gameId,
        player_id: null,
        type: "mj_announce",
        title: "Annonce du Détective",
        body: text.trim(),
        payload: { tour, phase, mj_view: true } as never,
      });
      if (error) throw error;
      toast.success("Ajouté au téléprompteur");
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function broadcast() {
    if (!text.trim() || busy) return;
    if (
      !window.confirm(
        `Diffuser ce message sur les téléphones de ${aliveTargets.length} joueur(s) vivant(s) ?`,
      )
    )
      return;
    setBusy(true);
    try {
      const rows = aliveTargets.map((p) => ({
        game_id: gameId,
        player_id: p.id,
        type: "mj_broadcast",
        title: "Annonce du Détective",
        body: text.trim(),
        payload: { tour, phase, broadcast: true } as never,
      }));
      // Ligne MJ pour archiver la diffusion dans le téléprompteur aussi.
      rows.push({
        game_id: gameId,
        player_id: null as never,
        type: "mj_announce",
        title: "Diffusé aux joueurs",
        body: text.trim(),
        payload: { tour, phase, mj_view: true, broadcast: true } as never,
      });
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success(`Diffusé à ${aliveTargets.length} joueur(s)`);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed py-2.5 text-[11px] font-semibold text-gold/90 hover:bg-gold/10 transition flex items-center justify-center gap-1.5"
        style={{ borderColor: "oklch(0.65 0.18 75 / 0.4)" }}
      >
        <PencilLine className="size-3.5" /> Composer une annonce / diffusion
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl border p-3 space-y-2.5"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.22 0.10 75 / 0.15), oklch(0.16 0.04 35 / 0.55))",
        borderColor: "oklch(0.65 0.18 75 / 0.4)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gold flex items-center gap-1.5">
          <PencilLine className="size-3.5" />
          <span>Composer</span>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setText("");
          }}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Fermer
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="« Un cri déchire le manoir… quelqu'un a disparu. »"
        className="w-full bg-background/60 border border-border/60 rounded-lg p-2.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => void pushTeleprompter()}
          disabled={busy || !text.trim()}
          className="h-10 rounded-xl border border-border bg-card/60 text-[11px] font-semibold hover:bg-card transition active:scale-95 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
        >
          <Megaphone className="size-3.5" /> Téléprompteur
        </button>
        <button
          onClick={() => void broadcast()}
          disabled={busy || !text.trim()}
          className="h-10 rounded-xl text-[11px] font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          style={{
            background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.86 0.18 80))",
          }}
        >
          <Send className="size-3.5" /> Diffuser ({aliveTargets.length})
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        <strong className="text-foreground/80">Téléprompteur</strong> : note privée que tu liras à
        voix haute. <strong className="text-foreground/80">Diffuser</strong> : pousse le message sur
        les téléphones des joueurs vivants.
      </p>
    </div>
  );
}

function RingTab({
  announcements,
  game,
  gameId,
  players,
}: {
  announcements: Notif[];
  game: { current_tour: number; current_phase: string };
  gameId: string;
  players: PlayerLite[];
}) {
  const grouped = new Map<number, Notif[]>();
  for (const n of announcements) {
    const cy = Number(
      (n.payload as Record<string, unknown> | null | undefined)?.tour ?? game.current_tour,
    );
    const list = grouped.get(cy) ?? [];
    list.push(n);
    grouped.set(cy, list);
  }
  const days = Array.from(grouped.keys()).sort((a, b) => b - a);

  return (
    <div className="p-4 space-y-4">
      <BroadcastComposer
        gameId={gameId}
        players={players}
        tour={game.current_tour}
        phase={game.current_phase}
      />
      <CalloutCard
        tone="gold"
        icon={<Megaphone className="size-3.5" />}
        title="Lecture du Détective"
      >
        Lis ces phrases à voix haute aux joueurs. Tour {game.current_tour} ·{" "}
        {phaseFr(game.current_phase)}.
      </CalloutCard>
      {announcements.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="size-6 mx-auto" />}
          text="Aucune annonce. Les phrases apparaîtront ici dès la prochaine Annonce."
        />
      ) : (
        <div className="space-y-5">
          {days.map((cy) => {
            const items = grouped.get(cy) ?? [];
            return (
              <section key={cy}>
                <TourDivider tour={cy} tone="gold" />
                <ul className="space-y-2.5">
                  {items.map((n, idx) => (
                    <li
                      key={n.id}
                      className="rounded-2xl border-2 px-3.5 py-3"
                      style={{
                        borderColor: "oklch(0.65 0.18 75 / 0.45)",
                        background:
                          "linear-gradient(135deg, oklch(0.22 0.10 75 / 0.18), oklch(0.16 0.04 35 / 0.5))",
                        boxShadow: "0 8px 24px -10px oklch(0.78 0.16 75 / 0.35)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-gold/80 font-semibold">
                          Annonce #{items.length - idx}
                        </span>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {new Date(n.created_at).toLocaleTimeString().slice(0, 5)}
                        </span>
                      </div>
                      <div
                        className="text-sm font-semibold text-gold mt-1.5"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-sm mt-1.5 italic leading-snug text-foreground/90">
                          « {n.body} »
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════ Onglet — Résolution ═════════════════════════
type ResolveRow = {
  id: string;
  tour: number;
  category: string | null;
  timing: string | null;
  source: string | null;
  actor_player_id: string;
  target_player_id: string | null;
  layer: number | null;
  created_at: string;
  resolved_at: string | null;
  resolution: Record<string, unknown> | null;
};
function ResolveTab({
  gameId,
  tour,
  players,
}: {
  gameId: string;
  tour: number;
  players: PlayerLite[];
}) {
  const [rows, setRows] = useState<ResolveRow[]>([]);
  const name = (id: string | null) =>
    id ? (players.find((p) => p.id === id)?.pseudo ?? "?") : "—";

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("role_actions")
        .select(
          "id, tour, category, timing, source, actor_player_id, target_player_id, layer, created_at, resolved_at, resolution",
        )
        .eq("game_id", gameId)
        .not("category", "is", null)
        .order("tour", { ascending: false })
        .order("layer", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(120);
      setRows((data ?? []) as ResolveRow[]);
    };
    void load();
    const ch = supabase
      .channel(`mj-resolve-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_actions", filter: `game_id=eq.${gameId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId]);

  const byTour = new Map<number, ResolveRow[]>();
  for (const r of rows) {
    const list = byTour.get(r.tour) ?? [];
    list.push(r);
    byTour.set(r.tour, list);
  }
  const tours = Array.from(byTour.keys()).sort((a, b) => b - a);

  const badge = (r: ResolveRow) => {
    if (!r.resolved_at)
      return { txt: "en attente", cls: "bg-muted/40 text-muted-foreground border-border" };
    const st = (r.resolution as Record<string, unknown> | null)?.status as string | undefined;
    if (st === "applied")
      return { txt: "appliqué", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40" };
    if (st === "protected")
      return { txt: "protégé", cls: "bg-sky-500/15 text-sky-300 border-sky-400/40" };
    if (st === "cancelled")
      return { txt: "annulé", cls: "bg-rose-500/15 text-rose-300 border-rose-400/40" };
    return { txt: st ?? "?", cls: "bg-muted/40" };
  };

  return (
    <div className="p-4 space-y-4">
      <CalloutCard
        tone="primary"
        icon={<Calculator className="size-3.5" />}
        title="Pipeline de résolution (v2)"
      >
        Intentions catégorisées par couches. L'Annonce déclenche le resolver : L1 protect/cure → L2
        attack → L3 cascade. Tour courant : {tour}.
      </CalloutCard>
      {rows.length === 0 && (
        <EmptyState
          icon={<Calculator className="size-6 mx-auto" />}
          text="Aucune intention enregistrée pour l'instant."
        />
      )}
      {tours.map((cy) => {
        const items = byTour.get(cy) ?? [];
        const pending = items.filter((i) => !i.resolved_at).length;
        return (
          <section key={cy}>
            <TourDivider
              tour={cy}
              tone="primary"
              sub={`${items.length} intention(s)${pending > 0 ? ` · ${pending} en attente` : ""}`}
            />
            <ul className="space-y-1.5">
              {items.map((r) => {
                const b = badge(r);
                const res = (r.resolution ?? {}) as Record<string, unknown>;
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                          L{r.layer ?? "?"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-muted/50 text-[10px] uppercase tracking-wider">
                          {r.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{r.timing}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${b.cls}`}>
                        {b.txt}
                      </span>
                    </div>
                    <div className="mt-1 text-foreground/85">
                      <span className="font-medium">{name(r.actor_player_id)}</span>
                      <span className="text-muted-foreground"> · {r.source ?? "?"} → </span>
                      <span className="font-medium">{name(r.target_player_id)}</span>
                    </div>
                    {res.reason ? (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        raison : {String(res.reason)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ═════════════════════════ Onglet 3 — Roster ═════════════════════════
function RosterTab({
  livePlayers,
  roles,
  acted,
  tour,
  onSelect,
}: {
  livePlayers: PlayerLite[];
  roles: Map<string, RoleRow>;
  acted: Set<string>;
  tour: number;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "alive" | "prison" | "dead" | "mechant" | "neutre">(
    "all",
  );
  const filtered = livePlayers.filter((p) => {
    const r = roles.get(p.role_slug ?? "");
    if (filter === "alive") return p.is_alive && !p.is_imprisoned;
    if (filter === "prison") return p.is_imprisoned;
    if (filter === "dead") return !p.is_alive;
    if (filter === "mechant") return r?.faction === "Méchant";
    if (filter === "neutre") return r?.faction === "Neutre";
    return true;
  });

  const chip = (key: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${
        filter === key
          ? "bg-gold/20 text-gold border-gold/50 shadow-[0_0_12px_-4px_oklch(0.78_0.16_75/0.6)]"
          : "bg-card/40 text-muted-foreground border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel icon={<Users className="size-3.5" />} text="Roster · vue omnisciente" />
        <span className="text-[10px] text-muted-foreground">
          {filtered.length}/{livePlayers.length}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {chip("all", "Tous")}
        {chip("alive", "Vivants")}
        {chip("prison", "Prison")}
        {chip("dead", "Morts")}
        {chip("mechant", "Méchants")}
        {chip("neutre", "Neutres")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((p) => {
          const role = roles.get(p.role_slug ?? "");
          const meta = (p.role_meta as Record<string, unknown>) ?? {};
          const av = avatarOf(meta.avatar as string | undefined, p.id);
          const validated = acted.has(p.id);
          const status: { Icon: LucideIcon; label: string; tone: string } = !p.is_alive
            ? { Icon: Skull, label: "Mort", tone: "oklch(0.55 0.22 22 / 0.5)" }
            : p.is_imprisoned
              ? { Icon: Lock, label: "Prison", tone: "oklch(0.65 0.18 60 / 0.5)" }
              : { Icon: Circle, label: "Vivant", tone: "oklch(0.55 0.18 145 / 0.5)" };
          const factionColor = roleColor(role);
          // Indicateurs exclusifs MJ
          const flags: Array<{ Icon: LucideIcon; label: string }> = [];
          if (meta.converted) flags.push({ Icon: Droplet, label: "Converti" });
          if (meta.poisoned) flags.push({ Icon: FlaskConical, label: "Empoisonné" });
          if (meta.infected) flags.push({ Icon: Biohazard, label: "Infecté" });
          if (
            typeof meta.blackmail_until_cycle === "number" &&
            (meta.blackmail_until_cycle as number) >= tour &&
            ((meta.blackmail_from_cycle as number | undefined) ?? -Infinity) <= tour
          )
            flags.push({ Icon: Hand, label: "Chantage" });
          if (
            typeof meta.drunk_until_cycle === "number" &&
            (meta.drunk_until_cycle as number) >= tour
          )
            flags.push({ Icon: Wine, label: "Ivre" });
          if (
            typeof meta.blessed_until_cycle === "number" &&
            (meta.blessed_until_cycle as number) >= tour
          )
            flags.push({ Icon: Sparkles, label: "Béni" });
          if (meta.linked_with || meta.linked_to) flags.push({ Icon: Heart, label: "Amoureux" });

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="text-left rounded-2xl border p-2.5 transition active:scale-[0.98] hover:bg-card/60"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.20 0.04 35 / 0.55), oklch(0.16 0.03 35 / 0.6))",
                borderColor: "oklch(0.32 0.04 35 / 0.6)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <div
                    className="size-12 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: "oklch(0.20 0.04 35 / 0.9)",
                      boxShadow: `0 0 0 2px ${status.tone}`,
                    }}
                  >
                    <AvatarImg avatar={av} size={48} rounded="lg" />
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center border"
                    style={{ background: "oklch(0.14 0.02 35)", borderColor: status.tone }}
                  >
                    <status.Icon className="size-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: factionColor }}>
                    {p.pseudo}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <RoleIcon role={role} size={12} /> {role?.name_fr ?? "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px]">
                <span
                  className="uppercase tracking-wider font-semibold"
                  style={{ color: factionColor }}
                >
                  {role?.faction ?? "—"}
                </span>
                {validated ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
                    ✓ capa
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border">
                    —
                  </span>
                )}
              </div>
              {flags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {flags.slice(0, 3).map((f) => {
                    const I = f.Icon;
                    return (
                      <span
                        key={f.label}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-400/30 leading-none inline-flex items-center gap-1"
                      >
                        <I className="size-2.5" /> {f.label}
                      </span>
                    );
                  })}
                  {flags.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{flags.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════ Onglet 4 — Événements ═════════════════════════
function EventsTab({
  events,
  players,
  roles,
}: {
  events: Notif[];
  players: PlayerLite[];
  roles: Map<string, RoleRow>;
}) {
  const groups: Array<{
    title: string;
    types: string[];
    tone: string;
    Icon: LucideIcon;
    accent: string;
  }> = [
    {
      title: "Morts & attaques",
      types: ["death", "killed", "succession", "vengeance", "linked_death", "pari_perdu"],
      tone: "border-l-destructive",
      accent: "oklch(0.62 0.24 22)",
      Icon: Skull,
    },
    {
      title: "Votes & justice",
      types: ["vote_result", "juge_verdict"],
      tone: "border-l-gold",
      accent: "oklch(0.78 0.16 75)",
      Icon: Gavel,
    },
    {
      title: "Prison & protection",
      types: ["imprisoned", "defended", "shielded", "saved", "ward"],
      tone: "border-l-amber-400",
      accent: "oklch(0.78 0.16 60)",
      Icon: Shield,
    },
    {
      title: "Enquêtes & informations",
      types: ["autopsy", "mouchard_info", "temoin_reveal", "oracle_vision"],
      tone: "border-l-sky-400",
      accent: "oklch(0.70 0.16 230)",
      Icon: Search,
    },
    {
      title: "Liens & couvertures",
      types: ["link", "etre_cher", "cover", "imitate", "rumor", "stratege_setup", "linked_partner"],
      tone: "border-l-fuchsia-400",
      accent: "oklch(0.65 0.22 320)",
      Icon: Drama,
    },
    {
      title: "Système & fin",
      types: ["engine", "system", "game_end", "pilgrim_win"],
      tone: "border-l-muted-foreground",
      accent: "oklch(0.50 0.02 35)",
      Icon: Cog,
    },
  ];
  const used = new Set<string>(groups.flatMap((g) => g.types));
  const others = events.filter((e) => !used.has(e.type));

  return (
    <div className="p-4 space-y-5">
      {events.length === 0 && (
        <EmptyState
          icon={<ScrollText className="size-6 mx-auto" />}
          text="Aucun événement encore."
        />
      )}
      {groups.map((g) => {
        const items = events.filter((e) => g.types.includes(e.type));
        if (items.length === 0) return null;
        return (
          <section key={g.title}>
            <SectionLabel
              icon={<g.Icon className="size-3.5" />}
              text={g.title}
              right={String(items.length)}
            />
            <ul className="space-y-1.5">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border-l-4 px-3 py-2 text-xs ${g.tone}`}
                  style={{
                    background: "oklch(0.18 0.03 35 / 0.55)",
                    boxShadow: `0 0 0 1px oklch(0.30 0.04 35 / 0.4), inset 4px 0 12px -8px ${g.accent}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate" style={{ color: g.accent }}>
                      {n.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(n.created_at).toLocaleTimeString().slice(0, 5)}
                    </span>
                  </div>
                  {n.body && (
                    <div className="text-[11px] text-foreground/85 mt-0.5">
                      {colorize(n.body, roles)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {others.length > 0 && (
        <section>
          <SectionLabel icon="•" text="Divers" right={String(others.length)} />
          <ul className="space-y-1.5">
            {others.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border-l-4 border-l-border bg-card/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{n.title}</span>
                  <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                    {new Date(n.created_at).toLocaleTimeString().slice(0, 5)}
                  </span>
                </div>
                {n.body && (
                  <div className="text-[11px] text-foreground/85 mt-0.5">
                    {colorize(n.body, roles)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ═════════════════════════ Onglet 6 — Notes / Analyses ═════════════════════════
function NotesTab({
  gameId,
  notes,
  players,
  tour,
  phase,
}: {
  gameId: string;
  notes: Notif[];
  players: PlayerLite[];
  tour: number;
  phase: string;
}) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        game_id: gameId,
        type: "mj_note",
        title: `Note — Tour ${tour} (${phaseFr(phase)})`,
        body: text.trim(),
        payload: { tour, phase, tags } as never,
      });
      if (error) throw error;
      setText("");
      setTags([]);
      toast.success("Note enregistrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette note ?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Note supprimée");
  }

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <div className="p-4 space-y-4">
      <CalloutCard
        tone="primary"
        icon={<NotebookPen className="size-3.5" />}
        title="Cahier d'analyse (proto)"
      >
        Note tes hypothèses, contradictions, comportements suspects. Les notes sont horodatées et
        taguables par joueur — idéal pour le débrief.
      </CalloutCard>

      {/* Composer */}
      <div
        className="rounded-2xl border p-3 space-y-2.5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.20 0.05 40 / 0.5), oklch(0.16 0.03 35 / 0.6))",
          borderColor: "oklch(0.32 0.04 35 / 0.6)",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="« Bot Eden a hésité 12s avant de voter pour Léo, alors qu'ils sont co-vivants depuis le tour 1… »"
          className="w-full bg-background/60 border border-border/60 rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50 resize-none"
        />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
            Taguer des joueurs
          </div>
          <div className="flex flex-wrap gap-1">
            {players.map((p) => {
              const meta = (p.role_meta as Record<string, unknown>) ?? {};
              const av = avatarOf(meta.avatar as string | undefined, p.id);
              const on = tags.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleTag(p.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                    on
                      ? "bg-gold/20 text-gold border-gold/50"
                      : "bg-card/40 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <AvatarImg avatar={av} size={14} />
                  <span>{p.pseudo}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Tour {tour} · {phaseFr(phase)}
          </span>
          <button
            onClick={save}
            disabled={busy || !text.trim()}
            className="h-9 px-4 rounded-full text-xs font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.86 0.18 80))",
              boxShadow: "0 4px 16px -4px oklch(0.78 0.16 75 / 0.5)",
            }}
          >
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-6 mx-auto" />}
          text="Aucune note pour l'instant. Commence par observer."
        />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => {
            const payload = (n.payload ?? {}) as Record<string, unknown>;
            const noteTags = (payload.tags as string[] | undefined) ?? [];
            const noteTour = payload.tour as number | undefined;
            return (
              <li
                key={n.id}
                className="rounded-2xl border p-3"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.20 0.05 35 / 0.4), oklch(0.16 0.03 35 / 0.55))",
                  borderColor: "oklch(0.32 0.04 35 / 0.55)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-semibold"
                      style={{
                        background: "oklch(0.30 0.10 80 / 0.25)",
                        color: "oklch(0.88 0.16 75)",
                        border: "1px solid oklch(0.55 0.16 75 / 0.4)",
                      }}
                    >
                      Tour {noteTour ?? "?"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleTimeString().slice(0, 5)}
                    </span>
                  </div>
                  <button
                    onClick={() => void remove(n.id)}
                    className="text-[10px] text-destructive/80 hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10"
                  >
                    ✕
                  </button>
                </div>
                {n.body && (
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-snug">
                    {n.body}
                  </div>
                )}
                {noteTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {noteTags.map((id) => {
                      const p = players.find((pp) => pp.id === id);
                      if (!p) return null;
                      const meta = (p.role_meta as Record<string, unknown>) ?? {};
                      const av = avatarOf(meta.avatar as string | undefined, p.id);
                      return (
                        <span
                          key={id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/40 flex items-center gap-1"
                        >
                          <AvatarImg avatar={av} size={14} />
                          <span>{p.pseudo}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ═════════════════════════ Fiche joueur (overlay omniscient) ═════════════════════════
function PlayerSheet({
  player,
  role,
  gameId,
  players,
  rolesMap,
  tour,
  onClose,
}: {
  player: PlayerLite;
  role: RoleRow | null;
  gameId: string;
  players: { id: string; pseudo: string }[];
  rolesMap: Map<string, RoleRow>;
  tour: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"role" | "state" | "journal" | "history">("role");
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [acts, setActs] = useState<
    Array<{
      id: string;
      tour: number;
      phase: string;
      created_at: string;
      target_player_id: string | null;
      target_player_id_2: string | null;
      payload: Record<string, unknown>;
      result: Record<string, unknown> | null;
    }>
  >([]);
  const [actBusy, setActBusy] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState("");

  async function runAct(label: string, fn: () => Promise<unknown>) {
    if (actBusy) return;
    setActBusy(true);
    try {
      await fn();
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActBusy(false);
    }
  }
  const doKill = () => {
    if (!window.confirm(`Tuer ${player.pseudo} ? Action immédiate et visible côté joueur.`)) return;
    void runAct(`${player.pseudo} éliminé`, () => killPlayer(gameId, player.id, "MJ"));
  };
  const doImprison = () => {
    if (!window.confirm(`Emprisonner ${player.pseudo} ?`)) return;
    void runAct(`${player.pseudo} emprisonné`, () => imprisonPlayer(gameId, player.id, "MJ"));
  };
  const doRelease = () =>
    void runAct(`${player.pseudo} libéré`, () => releasePlayer(gameId, player.id));
  async function sendMsg() {
    if (!msg.trim() || actBusy) return;
    setActBusy(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        game_id: gameId,
        player_id: player.id,
        type: "mj_message",
        title: "Message du Détective",
        body: msg.trim(),
        payload: { tour, mj_message: true } as never,
      });
      if (error) throw error;
      toast.success(`Envoyé à ${player.pseudo}`);
      setMsg("");
      setMsgOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setActBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const [{ data: n }, { data: a }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("game_id", gameId)
          .eq("player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("role_actions")
          .select(
            "id, tour, phase, created_at, target_player_id, target_player_id_2, payload, result",
          )
          .eq("game_id", gameId)
          .eq("actor_player_id", player.id)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      setNotifs((n ?? []) as Notif[]);
      setActs((a ?? []) as typeof acts);
    })();
  }, [player.id, gameId]);

  const meta = (player.role_meta as Record<string, unknown>) ?? {};
  const av = avatarOf(meta.avatar as string | undefined, player.id);
  const factionColor = roleColor(role);

  const status = !player.is_alive
    ? { Icon: Skull, label: "Mort" }
    : player.is_imprisoned
      ? { Icon: Lock, label: "Prison" }
      : { Icon: Circle, label: "Vivant" };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, oklch(0.20 0.05 40 / 0.96), oklch(0.14 0.02 35))",
          borderColor: "oklch(0.32 0.04 35 / 0.6)",
          boxShadow: "0 24px 64px -16px oklch(0 0 0 / 0.7)",
        }}
      >
        {/* Header sticky */}
        <div
          className="sticky top-0 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3 z-10"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.20 0.05 40 / 0.95), oklch(0.18 0.04 35 / 0.85))",
            borderColor: "oklch(0.30 0.04 35 / 0.6)",
          }}
        >
          <div className="relative shrink-0">
            <div
              className="size-12 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: "oklch(0.22 0.05 35 / 0.9)",
                boxShadow: `0 0 0 2px ${factionColor === "var(--foreground)" ? "oklch(0.40 0.04 35)" : factionColor}`,
              }}
            >
              <AvatarImg avatar={av} size={48} rounded="lg" />
            </div>
            <div className="absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center bg-[oklch(0.14_0.02_280)] border border-border">
              <status.Icon className="size-3" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate"
              style={{ color: factionColor, fontFamily: "var(--font-display)" }}
            >
              {player.pseudo}
            </div>
            <div
              className="text-[11px] flex items-center gap-1 truncate"
              style={{ color: factionColor }}
            >
              <RoleIcon role={role} size={14} /> {role?.name_fr ?? "—"} · {role?.faction ?? ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-full bg-muted/40 hover:bg-muted/60 transition"
          >
            Fermer
          </button>
        </div>

        {/* Leviers MJ — actions live sur ce joueur */}
        <div className="px-4 pt-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            <span>Leviers du Détective</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {player.is_alive && !player.is_imprisoned && (
              <LeverBtn tone="rose" disabled={actBusy} onClick={doKill}>
                <Skull className="size-3.5" /> Tuer
              </LeverBtn>
            )}
            {player.is_alive && !player.is_imprisoned && (
              <LeverBtn tone="amber" disabled={actBusy} onClick={doImprison}>
                <Lock className="size-3.5" /> Emprisonner
              </LeverBtn>
            )}
            {player.is_alive && player.is_imprisoned && (
              <>
                <LeverBtn tone="emerald" disabled={actBusy} onClick={doRelease}>
                  <LockOpen className="size-3.5" /> Libérer
                </LeverBtn>
                <LeverBtn tone="rose" disabled={actBusy} onClick={doKill}>
                  <Skull className="size-3.5" /> Tuer
                </LeverBtn>
              </>
            )}
            {!player.is_alive && (
              <span className="text-[10px] text-muted-foreground italic px-1 py-1">
                Joueur mort — actions indisponibles.
              </span>
            )}
            <LeverBtn tone="sky" disabled={actBusy} onClick={() => setMsgOpen((v) => !v)}>
              <Mail className="size-3.5" /> Message privé
            </LeverBtn>
          </div>
          {msgOpen && (
            <div className="mt-2 space-y-1.5">
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={2}
                placeholder={`Mot secret pour ${player.pseudo}… (indice, ambiance, relance)`}
                className="w-full bg-background/60 border border-border/60 rounded-lg p-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-400/50 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setMsgOpen(false);
                    setMsg("");
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/40"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void sendMsg()}
                  disabled={actBusy || !msg.trim()}
                  className="text-[10px] px-3 py-1 rounded-full font-semibold text-sky-950 disabled:opacity-40"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.78 0.14 230), oklch(0.85 0.14 220))",
                  }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 grid grid-cols-4 gap-1 text-[10px]">
          {(["role", "state", "journal", "history"] as const).map((t) => {
            const labels = {
              role: "Rôle",
              state: "État",
              journal: "Journal",
              history: "Historique",
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-1.5 rounded-lg uppercase tracking-wider font-semibold transition ${
                  tab === t
                    ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                    : "bg-card/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {tab === "role" && (
            <div className="space-y-3">
              <CalloutCard
                tone="gold"
                icon={<Drama className="size-3.5" />}
                title="Capacité du rôle"
              >
                <span className="whitespace-pre-wrap text-foreground/90">
                  {role?.capacite_full_text ?? role?.carte_app ?? "—"}
                </span>
              </CalloutCard>
              {role?.description && (
                <div className="text-[11px] text-muted-foreground italic leading-relaxed">
                  {role.description}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <KvCell k="Type" v={role?.type ?? "—"} />
                <KvCell k="Phase" v={role?.phase_activation ?? "—"} />
                <KvCell k="Cible" v={role?.target_mode ?? "—"} />
                <KvCell k="Usage" v={role?.usage_label ?? "—"} />
              </div>
            </div>
          )}

          {tab === "state" && (
            <div className="space-y-3">
              <CalloutCard
                tone="primary"
                icon={<Dna className="size-3.5" />}
                title="État omniscient"
              >
                Vue brute du{" "}
                <code className="text-[10px] bg-card/60 px-1 py-0.5 rounded">role_meta</code> et
                flags système — réservé MJ.
              </CalloutCard>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <KvCell k="Statut" v={status.label} />
                <KvCell k="Tour" v={String(tour)} />
              </div>
              <MetaKvList meta={meta} players={players} />
            </div>
          )}

          {tab === "journal" && (
            <ul className="space-y-1.5 text-xs">
              {notifs.length === 0 && (
                <li className="text-muted-foreground text-center italic py-4">
                  Aucune notification.
                </li>
              )}
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    background: "oklch(0.18 0.03 35 / 0.55)",
                    borderColor: "oklch(0.30 0.04 35 / 0.55)",
                  }}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{n.title}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleTimeString().slice(0, 5)}
                    </span>
                  </div>
                  {n.body && (
                    <div className="text-muted-foreground mt-0.5">{colorize(n.body, rolesMap)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {tab === "history" &&
            (() => {
              const caps = acts.filter((a) => !(a.payload as Record<string, unknown>)?.item);
              const itemActs = acts.filter((a) => !!(a.payload as Record<string, unknown>)?.item);
              // Même carte que côté joueur (bloc résultat via CapabilityCard),
              // pour une lecture MJ identique à celle du joueur concerné.
              const renderRow = (a: (typeof acts)[number]) => {
                const isItem = !!(a.payload as Record<string, unknown> | null)?.item;
                return (
                  <li key={a.id}>
                    <CapabilityCard
                      tour={a.tour}
                      phase={a.phase}
                      created_at={a.created_at}
                      payload={(a.payload ?? {}) as Record<string, unknown>}
                      result={a.result}
                      target_player_id={a.target_player_id}
                      target_player_id_2={a.target_player_id_2}
                      players={players}
                      roles={rolesMap}
                      kind={isItem ? "item" : "capability"}
                    />
                  </li>
                );
              };
              return (
                <div className="space-y-4">
                  <section>
                    <SectionLabel
                      icon={<Zap className="size-3.5" />}
                      text="Capacités utilisées"
                      right={String(caps.length)}
                    />
                    {caps.length === 0 ? (
                      <EmptyState
                        icon={<Zap className="size-6 mx-auto" />}
                        text="Aucune capacité utilisée."
                        compact
                      />
                    ) : (
                      <ul className="space-y-1.5 text-xs">{caps.map(renderRow)}</ul>
                    )}
                  </section>
                  <section>
                    <SectionLabel
                      icon={<Backpack className="size-3.5" />}
                      text="Objets utilisés"
                      right={String(itemActs.length)}
                    />
                    {itemActs.length === 0 ? (
                      <EmptyState
                        icon={<Backpack className="size-6 mx-auto" />}
                        text="Aucun objet utilisé."
                        compact
                      />
                    ) : (
                      <ul className="space-y-1.5 text-xs">{itemActs.map(renderRow)}</ul>
                    )}
                  </section>
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════ Helpers visuels ═════════════════════════
function SectionLabel({
  icon,
  text,
  right,
}: {
  icon: React.ReactNode;
  text: string;
  right?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{text}</span>
      </div>
      {right && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-card/60 border border-border text-muted-foreground font-bold">
          {right}
        </span>
      )}
    </div>
  );
}

function CalloutCard({
  tone,
  icon,
  title,
  children,
}: {
  tone: "gold" | "primary";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const palette =
    tone === "gold"
      ? {
          border: "oklch(0.65 0.18 75 / 0.45)",
          glow: "oklch(0.78 0.16 75 / 0.25)",
          text: "oklch(0.88 0.16 75)",
          bg: "linear-gradient(135deg, oklch(0.22 0.10 75 / 0.18), oklch(0.16 0.04 35 / 0.5))",
        }
      : {
          border: "oklch(0.55 0.16 22 / 0.45)",
          glow: "oklch(0.65 0.18 22 / 0.25)",
          text: "oklch(0.85 0.14 22)",
          bg: "linear-gradient(135deg, oklch(0.22 0.08 22 / 0.3), oklch(0.16 0.04 35 / 0.5))",
        };
  return (
    <div
      className="rounded-2xl border px-3.5 py-2.5"
      style={{
        background: palette.bg,
        borderColor: palette.border,
        boxShadow: `0 0 24px -8px ${palette.glow}`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5"
        style={{ color: palette.text }}
      >
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="mt-1 text-[11px] text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  compact,
}: {
  icon: React.ReactNode;
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`text-center text-xs text-muted-foreground italic rounded-xl border border-dashed ${compact ? "py-4" : "py-8"}`}
      style={{ borderColor: "oklch(0.30 0.04 35 / 0.5)" }}
    >
      <div className="text-xl mb-1 opacity-70">{icon}</div>
      {text}
    </div>
  );
}

function TourDivider({
  tour,
  tone,
  sub,
}: {
  tour: number;
  tone: "gold" | "primary";
  sub?: string;
}) {
  const color = tone === "gold" ? "oklch(0.78 0.16 75 / 0.5)" : "oklch(0.65 0.18 22 / 0.5)";
  const txt = tone === "gold" ? "text-gold/80" : "text-primary/80";
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-px flex-1" style={{ background: color }} />
      <div className={`text-[10px] uppercase tracking-[0.22em] font-semibold px-2 ${txt}`}>
        Tour {tour}
        {sub ? ` · ${sub}` : ""}
      </div>
      <div className="h-px flex-1" style={{ background: color }} />
    </div>
  );
}

function KpiDot({ tone, label }: { tone: "emerald" | "amber" | "rose"; label: string }) {
  const c =
    tone === "emerald"
      ? "oklch(0.80 0.18 145)"
      : tone === "amber"
        ? "oklch(0.85 0.18 70)"
        : "oklch(0.75 0.22 22)";
  return (
    <span className="flex items-center gap-1 font-semibold" style={{ color: c }}>
      <span
        className="size-1.5 rounded-full"
        style={{ background: c, boxShadow: `0 0 8px ${c}` }}
      />
      {label}
    </span>
  );
}

function KvCell({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="rounded-lg border px-2 py-1.5"
      style={{ background: "oklch(0.18 0.03 35 / 0.55)", borderColor: "oklch(0.30 0.04 35 / 0.5)" }}
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-[11px] text-foreground/90 mt-0.5 break-words">{v}</div>
    </div>
  );
}

function MetaKvList({
  meta,
  players,
}: {
  meta: Record<string, unknown>;
  players: { id: string; pseudo: string }[];
}) {
  const entries = Object.entries(meta).filter(
    ([, v]) =>
      v !== null && v !== undefined && v !== false && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0)
    return (
      <EmptyState
        icon={<Dna className="size-6 mx-auto" />}
        text="Aucune donnée d'état pour ce joueur."
        compact
      />
    );
  const renderVal = (v: unknown): string => {
    if (typeof v === "string") {
      const p = players.find((pp) => pp.id === v);
      return p ? `${p.pseudo} (joueur)` : v;
    }
    if (typeof v === "boolean") return v ? "✓ true" : "✗ false";
    if (typeof v === "number") return String(v);
    if (Array.isArray(v))
      return `[${v.length}] ${v
        .slice(0, 3)
        .map((x) =>
          typeof x === "string"
            ? (players.find((pp) => pp.id === x)?.pseudo ?? x)
            : JSON.stringify(x),
        )
        .join(", ")}${v.length > 3 ? "…" : ""}`;
    if (typeof v === "object" && v !== null) return JSON.stringify(v).slice(0, 80);
    return String(v);
  };
  return (
    <ul className="space-y-1">
      {entries.map(([k, v]) => (
        <li
          key={k}
          className="flex items-start justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]"
          style={{
            background: "oklch(0.18 0.03 35 / 0.5)",
            borderColor: "oklch(0.30 0.04 35 / 0.45)",
          }}
        >
          <code className="text-muted-foreground font-mono text-[10px] shrink-0">{k}</code>
          <span className="text-right text-foreground/90 break-words">{renderVal(v)}</span>
        </li>
      ))}
    </ul>
  );
}

// ═════════════════════════ Boutons ═════════════════════════
function GMTabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2 flex flex-col items-center gap-1 transition relative ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Sigil active={active} size={30} accent={accent}>
        {icon}
      </Sigil>
      <span
        className="text-[9px] font-semibold"
        style={active && accent ? { color: accent } : undefined}
      >
        {label}
      </span>
      {active && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
          style={{
            background: accent ?? "var(--primary)",
            boxShadow: `0 0 12px ${accent ? `color-mix(in oklab, ${accent} 60%, transparent)` : "oklch(0.78 0.16 75 / 0.7)"}`,
          }}
        />
      )}
      {badge !== undefined && (
        <span className="absolute top-1 right-2 text-[8px] px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-bold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function BigBtn({
  children,
  onClick,
  disabled,
  primary,
  badge,
  badgeRed,
  arrow,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  badge?: string;
  badgeRed?: boolean;
  arrow?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 rounded-xl border text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2 ${
        primary
          ? "text-primary-foreground"
          : "border-border bg-card/60 hover:bg-card text-foreground"
      }`}
      style={
        primary
          ? {
              background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.86 0.18 80))",
              borderColor: "oklch(0.78 0.16 75 / 0.5)",
              boxShadow: "0 8px 24px -8px oklch(0.78 0.16 75 / 0.5)",
            }
          : undefined
      }
    >
      <span className="inline-flex items-center gap-2">{children}</span>
      {arrow && <ArrowRight className="size-4 shrink-0" aria-hidden />}
      {badge && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            badgeRed
              ? "bg-destructive text-destructive-foreground"
              : "bg-emerald-500/25 text-emerald-200 border border-emerald-400/40"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function LeverBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "rose" | "amber" | "emerald" | "sky";
}) {
  const palette = {
    rose: {
      c: "oklch(0.78 0.20 22)",
      b: "oklch(0.55 0.22 22 / 0.5)",
      bg: "oklch(0.22 0.08 22 / 0.3)",
    },
    amber: {
      c: "oklch(0.86 0.16 70)",
      b: "oklch(0.65 0.18 60 / 0.5)",
      bg: "oklch(0.22 0.08 60 / 0.3)",
    },
    emerald: {
      c: "oklch(0.82 0.16 145)",
      b: "oklch(0.55 0.18 145 / 0.5)",
      bg: "oklch(0.20 0.08 145 / 0.3)",
    },
    sky: {
      c: "oklch(0.80 0.14 230)",
      b: "oklch(0.55 0.16 230 / 0.5)",
      bg: "oklch(0.20 0.07 230 / 0.3)",
    },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition active:scale-95 disabled:opacity-40"
      style={{ color: palette.c, borderColor: palette.b, background: palette.bg }}
    >
      {children}
    </button>
  );
}

function SmallBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-10 rounded-xl border border-border bg-card/60 text-xs font-medium hover:bg-card transition active:scale-95 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
    >
      {children}
    </button>
  );
}
