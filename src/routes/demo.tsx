// /demo — Sandbox MJ. Le rendu joueur est strictement le même que /g/$code
// (composant PlayerShell partagé). Aucun écran spécifique à la démo : ce qui
// est testé ici, c'est exactement ce que voient les vrais joueurs en live.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { createGame } from "@/lib/game";
import {
  startGame,
  rollRoles,
  ringGathering,
  openVote,
  closeVote,
  killPlayer,
  imprisonPlayer,
  releasePlayer,
  resetGame,
  tickPhase,
  setPaused,
  type GameRow,
  type PlayerRow,
  type RoleRow,
} from "@/engine/actions";
import { defaultBotConfig, startBotDriver, stopBotDriver } from "@/engine/bots";
import { introSFor } from "@/lib/phaseTiming";
import { serverNow, serverNowISO } from "@/lib/serverTime";
import { initReport, onFindingsChange, clearFindings } from "@/engine/qa/report";
import { runStaticRoleAudit, runInvariantSweep } from "@/engine/qa/driver";
import { runEndGameAudit } from "@/engine/qa/endAudit";
import { QASeverityCounts, QAReport } from "@/components/QAReport";
import type { QAFinding } from "@/engine/qa/types";
import { RegieView } from "@/components/RegieView";
import { PlayerShell } from "@/components/PlayerShell";
import { RolePoolEditor } from "@/components/RolePoolEditor";
import {
  ChevronLeft,
  RefreshCw,
  Play,
  Pause,
  Skull,
  Lock,
  Unlock,
  Vote,
  Bell,
  Dices,
  X,
  UserPlus,
  UserMinus,
  Ban,
  Search,
  Bot,
  BotOff,
  Drama,
  Timer,
  RotateCcw,
  Plus,
  Radio,
} from "lucide-react";
import { RoleIcon } from "@/components/RoleIcon";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";

export const Route = createFileRoute("/demo")({
  // Bac à sable MJ god-mode + QA : accessible uniquement via `vite dev`.
  beforeLoad: requireLocalDevelopment,
  component: DemoMenu,
});

const DEMO_GAME_KEY = "mp_demo_game_id";
const BOT_PSEUDOS = [
  "Alice",
  "Bob",
  "Cleo",
  "Dré",
  "Émile",
  "Faye",
  "Gus",
  "Hana",
  "Ivo",
  "Jin",
  "Kya",
  "Léo",
  "Mia",
  "Noé",
  "Otto",
];
const DEFAULT_BOTS = 8;
const MIN_BOTS = 6;
// Démo : durées par défaut confortables pour avoir le temps de gérer. On peut
// toujours raccourcir via ⏱️ Durées, mettre en pause, prolonger ou relancer le
// minuteur en direct depuis la barre de contrôle.
const DEMO_PHASE_DURATIONS = {
  phase_duration_free_s: 30,
  phase_duration_gathering_s: 30,
  phase_duration_vote_s: 30,
};
const MAX_BOTS = 15;

type Tab = "journal" | "suspicions" | "cemetery" | "capacity" | "testament";
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "capacity", icon: "⚡", label: "Capacité / Prison / Conseil" },
  { id: "journal", icon: "📓", label: "Journal" },
  { id: "suspicions", icon: "🎯", label: "Suspicions" },
  { id: "cemetery", icon: "💀", label: "Cimetière" },
  { id: "testament", icon: "✒️", label: "Testament" },
];

async function resolveGameByCode(codeRaw: string): Promise<string | null> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;
  const { data } = await supabase.from("games").select("id").eq("code", code).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function DemoMenu() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [gameId, setGameId] = useState<string | null>(null);
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [roles, setRoles] = useState<Map<string, RoleRow>>(new Map());
  const [embodiedId, setEmbodiedId] = useState<string | null>(null);
  const [forcedTab, setForcedTab] = useState<Tab>("capacity");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [showTrios, setShowTrios] = useState(false);
  const [rolePickerPlayerId, setRolePickerPlayerId] = useState<string | null>(null);
  const [activity, setActivity] = useState<
    Array<{ id: string; title: string; body: string | null; type: string; created_at: string }>
  >([]);
  const [qaFindings, setQaFindings] = useState<QAFinding[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showRegie, setShowRegie] = useState(false);
  const [botsActive, setBotsActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("mp_demo_bots_active");
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("mp_demo_bots_active", botsActive ? "1" : "0");
  }, [botsActive]);

  useEffect(() => {
    void supabase
      .from("roles")
      .select()
      .eq("set_id", "set1")
      .then(({ data }) => {
        const m = new Map<string, RoleRow>();
        for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
        setRoles(m);
      });
  }, []);

  // Bootstrap démo (crée une partie + 8 bots si pas déjà fait)
  // Garde anti-double-exécution (StrictMode lance les effets 2x en dev).
  const bootstrapStarted = useRef(false);
  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    // Hard timeout — au pire l'utilisateur voit l'écran d'erreur avec un bouton
    // « Repartir à zéro » plutôt qu'un spinner infini.
    const timeout = setTimeout(() => {
      setBootstrapError(
        (prev) => prev ?? "La préparation prend trop de temps. Réseau ou base injoignable ?",
      );
      setBootstrapping(false);
    }, 15000);
    void (async () => {
      try {
        const stored = localStorage.getItem(DEMO_GAME_KEY);
        if (stored) {
          const { data } = await supabase.from("games").select().eq("id", stored).maybeSingle();
          if (data) {
            const g = data as GameRow;
            const isLegacyFast =
              g.phase_duration_free_s === 3 &&
              g.phase_duration_gathering_s === 3 &&
              g.phase_duration_vote_s === 3;
            if (g.phase_duration_free_s == null || isLegacyFast) {
              const patch: Record<string, unknown> = { ...DEMO_PHASE_DURATIONS };
              const liveDur: Record<string, number> = {
                free: DEMO_PHASE_DURATIONS.phase_duration_free_s,
                gathering: DEMO_PHASE_DURATIONS.phase_duration_gathering_s,
                vote: DEMO_PHASE_DURATIONS.phase_duration_vote_s,
              };
              if (isLegacyFast && g.status === "in_progress" && liveDur[g.current_phase] != null) {
                patch.phase_duration_s = liveDur[g.current_phase];
                patch.phase_started_at = serverNowISO();
              }
              await supabase
                .from("games")
                .update(patch as never)
                .eq("id", g.id);
            }
            clearTimeout(timeout);
            setGameId(g.id);
            setBootstrapping(false);
            return;
          }
          localStorage.removeItem(DEMO_GAME_KEY);
        }
        const { game } = await createGame({ mjPseudo: "Démo MJ", modeDetectivePlayer: false });
        await supabase.from("games").update(DEMO_PHASE_DURATIONS).eq("id", game.id);
        // Inserts en parallèle pour démarrer plus vite (avant : 8 round-trips séquentiels).
        const inserts = BOT_PSEUDOS.slice(0, DEFAULT_BOTS).map((pseudo) =>
          supabase.from("players").insert({
            game_id: game.id,
            session_id: crypto.randomUUID(),
            pseudo,
            is_mj: false,
          }),
        );
        const results = await Promise.all(inserts);
        const firstErr = results.find((r) => r.error)?.error;
        if (firstErr) throw firstErr;
        localStorage.setItem(DEMO_GAME_KEY, game.id);
        clearTimeout(timeout);
        setGameId(game.id);
        setBootstrapping(false);
      } catch (err) {
        clearTimeout(timeout);
        console.error("[demo] bootstrap failed", err);
        setBootstrapError(err instanceof Error ? err.message : "Erreur inconnue");
        setBootstrapping(false);
      }
    })();
    return () => clearTimeout(timeout);
  }, []);

  // Realtime — la démo écoute la même partie que /g/$code
  useEffect(() => {
    if (!gameId) return;
    void supabase
      .from("games")
      .select()
      .eq("id", gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setGame(data as GameRow);
      });
    void supabase
      .from("players")
      .select()
      .eq("game_id", gameId)
      .order("joined_at")
      .then(({ data }) => {
        const list = (data ?? []) as PlayerRow[];
        setPlayers(list);
        setEmbodiedId((cur) => {
          if (cur && list.some((p) => p.id === cur)) return cur;
          const firstAlive = list.find((p) => p.is_alive && !p.is_mj) ?? list[0];
          return firstAlive?.id ?? null;
        });
      });
    void supabase
      .from("notifications")
      .select("id, title, body, type, created_at")
      .eq("game_id", gameId)
      .is("player_id", null)
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data }) => {
        setActivity(
          (data ?? []) as Array<{
            id: string;
            title: string;
            body: string | null;
            type: string;
            created_at: string;
          }>,
        );
      });
    const ch = supabase
      .channel(`demo-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        async () => {
          const { data } = await supabase
            .from("players")
            .select()
            .eq("game_id", gameId)
            .order("joined_at");
          setPlayers((data ?? []) as PlayerRow[]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (p) => setGame(p.new as GameRow),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `game_id=eq.${gameId}`,
        },
        (p) => {
          const row = p.new as {
            id: string;
            player_id: string | null;
            title: string;
            body: string | null;
            type: string;
            created_at: string;
          };
          if (row.player_id !== null) return; // MJ-only feed
          setActivity((prev) =>
            [
              {
                id: row.id,
                title: row.title,
                body: row.body,
                type: row.type,
                created_at: row.created_at,
              },
              ...prev,
            ].slice(0, 80),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId]);

  async function connectToCode(codeRaw: string) {
    const id = await resolveGameByCode(codeRaw);
    if (!id) {
      alert(`Aucune partie trouvée avec le code "${codeRaw.toUpperCase()}".`);
      return;
    }
    stopBotDriver();
    localStorage.setItem(DEMO_GAME_KEY, id);
    setGameId(id);
    setEmbodiedId(null);
    setGame(null);
    setPlayers([]);
  }

  // ── Agents QA : rapport + sweeps d'invariants + audit de fin ───────────────
  // Refs pour un intervalle STABLE (game/players changent à chaque event realtime,
  // sinon l'intervalle serait reset en boucle et les sweeps ne se déclencheraient pas).
  const gameRef = useRef<GameRow | null>(null);
  gameRef.current = game;
  const playersRef = useRef<PlayerRow[]>([]);
  playersRef.current = players;
  const rolesRef = useRef<Map<string, RoleRow>>(roles);
  rolesRef.current = roles;
  const embodiedIdRef = useRef<string | null>(null);
  embodiedIdRef.current = embodiedId;
  const endHandledRef = useRef<string | null>(null);

  // Bot driver + tickPhase auto pilotés ici, pas par le PlayerShell embarqué.
  // Le tick est volontairement isolé du driver : l'objet game change souvent via realtime.
  useEffect(() => {
    if (!gameId) return;
    const tick = setInterval(() => {
      const current = gameRef.current;
      if (!current || current.status !== "in_progress" || current.paused) return;
      // Ne sonder la base QUE si la frontière est franchie : le test se fait ici,
      // en mémoire, sur l'état déjà reçu par realtime. Sinon chaque tour de boucle
      // coûtait un SELECT `games` pour s'entendre répondre « pas encore ».
      if (!current.phase_started_at || !current.phase_duration_s) return;
      const started = new Date(current.phase_started_at).getTime();
      const dueS = introSFor(current.current_phase) + current.phase_duration_s;
      if (serverNow() < started + dueS * 1000) return;
      void tickPhase(gameId);
    }, 1000);
    return () => clearInterval(tick);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || game?.status !== "in_progress" || !botsActive) {
      stopBotDriver();
      return;
    }
    const d = startBotDriver({
      gameId,
      getConfig: () => ({ ...defaultBotConfig, timeMultiplier: 5, qa: true }),
      embodiedPlayerId: () => embodiedIdRef.current,
    });
    return () => {
      d?.stop();
      stopBotDriver();
    };
  }, [gameId, game?.status, botsActive]);

  useEffect(() => {
    if (!gameId) return;
    initReport(gameId);
    const unsub = onFindingsChange(setQaFindings);
    return () => {
      unsub();
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    const iv = setInterval(() => {
      const g = gameRef.current;
      const ps = playersRef.current;
      const rs = rolesRef.current;
      if (!g || g.status !== "in_progress" || rs.size === 0) return;
      const pc = ps.filter((p) => !p.is_mj).length;
      if (ps.some((p) => p.role_slug)) runStaticRoleAudit(ps, rs, pc, g.id, g.code);
      void runInvariantSweep(g, ps, rs);
    }, 4000);
    return () => clearInterval(iv);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game) return;
    if (game.status === "ended") {
      if (endHandledRef.current === gameId) return;
      endHandledRef.current = gameId;
      void runEndGameAudit(gameId).then(() => setShowReport(true));
    } else if (game.status === "in_progress" && endHandledRef.current === gameId) {
      endHandledRef.current = null; // ré-armer après un reset + relance
    }
  }, [gameId, game?.status, game]);

  // Auto-prêt : en démo tous les joueurs (l'opérateur incarne un bot) sont
  // considérés "entrés dans la partie". Sans ça, PlayerShell attend
  // indéfiniment les clics « Entrer » sur les non-bots.
  useEffect(() => {
    if (!gameId || !game) return;
    // La démo n'a que des bots : on les marque « entrés » aussi bien pendant la
    // salle d'attente (`awaiting_players`) qu'au tour 1 en Enquête — PlayerShell
    // bascule alors la partie en `in_progress` (chrono armé) de façon atomique.
    if (game.status !== "in_progress" && game.status !== "awaiting_players") return;
    if (game.current_tour !== 1 || game.current_phase !== "free") return;
    const toStamp = players.filter((p) => {
      if (p.is_mj) return false;
      const meta = (p.role_meta ?? {}) as Record<string, unknown>;
      return !meta.revealed_at;
    });
    if (toStamp.length === 0) return;
    const now = new Date().toISOString();
    void (async () => {
      for (const p of toStamp) {
        const meta = (p.role_meta ?? {}) as Record<string, unknown>;
        await supabase
          .from("players")
          .update({
            role_meta: { ...meta, revealed_at: now } as never,
          })
          .eq("id", p.id);
      }
    })();
  }, [gameId, game?.status, game?.current_tour, game?.current_phase, game, players]);

  const me = players.find((p) => p.id === embodiedId) ?? null;

  async function reset() {
    if (!gameId) return;
    if (!confirm("Réinitialiser la démo (rôles, états, votes) ?")) return;
    stopBotDriver();
    await resetGame(gameId);
  }
  async function newDemo() {
    if (!confirm("Créer une toute nouvelle partie démo ?")) return;
    if (gameId) {
      stopBotDriver();
      await resetGame(gameId);
    }
    localStorage.removeItem(DEMO_GAME_KEY);
    location.reload();
  }
  async function start() {
    if (gameId) await startGame(gameId);
  }
  async function roll() {
    if (!gameId || !game) return;
    if (game.status === "in_progress") {
      if (!confirm("Re-tirer les rôles ? Cela réinitialise la partie d'abord.")) return;
      stopBotDriver();
      await resetGame(gameId);
    }
    try {
      await rollRoles(gameId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur de tirage");
    }
  }
  async function ring() {
    if (gameId) await ringGathering(gameId, "Démo");
  }
  async function openV() {
    if (gameId) await openVote(gameId);
  }
  async function closeV() {
    if (gameId) await closeVote(gameId);
  }

  // ── Contrôle du minuteur de phase en direct ──────────────────────────────
  // Pause : on gèle l'avancement auto (tickPhase respecte `paused`). À la
  // reprise, on décale `phase_started_at` du temps passé en pause pour ne PAS
  // perdre le temps restant. Si on ignore depuis quand c'était en pause
  // (reload), on redonne simplement la phase complète.
  const pausedAtRef = useRef<{ at: number; startedAt: string | null } | null>(null);
  async function togglePause() {
    if (!gameId || !game) return;
    if (game.paused) {
      const info = pausedAtRef.current;
      let newStart = game.phase_started_at;
      if (info && game.phase_started_at) {
        const delta = Date.now() - info.at; // durée écoulée (insensible au décalage d'horloge)
        newStart = new Date(new Date(game.phase_started_at).getTime() + delta).toISOString();
      } else {
        newStart = serverNowISO();
      }
      pausedAtRef.current = null;
      await supabase
        .from("games")
        .update({ paused: false, phase_started_at: newStart })
        .eq("id", gameId);
    } else {
      pausedAtRef.current = { at: Date.now(), startedAt: game.phase_started_at };
      await setPaused(gameId, true);
    }
  }
  async function extendPhase(sec: number) {
    if (!gameId || !game || !game.phase_duration_s) return;
    await supabase
      .from("games")
      .update({ phase_duration_s: Math.max(2, game.phase_duration_s + sec) })
      .eq("id", gameId);
  }
  async function restartTimer() {
    if (!gameId) return;
    await supabase.from("games").update({ phase_started_at: serverNowISO() }).eq("id", gameId);
  }

  async function addBot() {
    if (!gameId) return;
    const botCount = players.filter((p) => !p.is_mj).length;
    if (botCount >= MAX_BOTS) return;
    const used = new Set(players.map((p) => p.pseudo));
    const pseudo = BOT_PSEUDOS.find((n) => !used.has(n)) ?? `Bot${botCount + 1}`;
    await supabase.from("players").insert({
      game_id: gameId,
      session_id: crypto.randomUUID(),
      pseudo,
      is_mj: false,
    });
  }
  async function removeBot() {
    if (!gameId) return;
    const bots = players.filter((p) => !p.is_mj && p.id !== embodiedId);
    const last = bots[bots.length - 1];
    if (!last) return;
    if (players.filter((p) => !p.is_mj).length <= MIN_BOTS) return;
    await supabase.from("players").delete().eq("id", last.id);
  }

  async function killEmbodied() {
    if (gameId && me) await killPlayer(gameId, me.id, "démo");
  }
  async function imprisonEmbodied() {
    if (gameId && me) await imprisonPlayer(gameId, me.id, "démo");
  }
  async function releaseEmbodied() {
    if (gameId && me) await releasePlayer(gameId, me.id);
  }

  // Force la frame courante via game.forced_frame (sync via le shell)
  async function forceFrame(tab: Tab) {
    setForcedTab(tab);
    if (gameId) await supabase.from("games").update({ forced_frame: tab }).eq("id", gameId);
  }

  if (!mounted || bootstrapping || !gameId || !game) {
    if (bootstrapError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-foreground gap-4 px-6 text-center">
          <div className="text-destructive font-semibold">Préparation de la démo impossible</div>
          <div className="text-xs text-muted-foreground max-w-md break-words">{bootstrapError}</div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem(DEMO_GAME_KEY);
              } catch {
                // La démo peut repartir même si le stockage local est indisponible.
              }
              location.reload();
            }}
            className="px-4 py-2 text-sm rounded bg-gold text-primary-foreground font-semibold"
          >
            Repartir à zéro
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-gold">
            ← Accueil
          </Link>
        </div>
      );
    }
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-muted-foreground gap-4">
        <div className="flex items-center">
          <RefreshCw className="size-5 animate-spin mr-3" /> Préparation de la démo…
        </div>
        <button
          onClick={() => {
            try {
              localStorage.removeItem(DEMO_GAME_KEY);
            } catch {
              // La démo peut repartir même si le stockage local est indisponible.
            }
            location.reload();
          }}
          className="text-xs text-muted-foreground hover:text-gold underline"
        >
          Ça bloque ? Repartir à zéro
        </button>
      </div>
    );
  }

  const factionColor = (role: RoleRow | null | undefined): string => {
    if (!role) return "var(--muted-foreground)";
    const f = role.faction;
    const t = role.type ?? "";
    if (f === "Civil") return "var(--citoyens)";
    if (f === "Méchant") return "var(--mechants)";
    if (f === "Neutre") {
      // Neutre Subversif → violet vif ; autres neutres → violet pastel
      return /subversif/i.test(t) ? "oklch(0.60 0.22 305)" : "oklch(0.78 0.10 305)";
    }
    return "var(--muted-foreground)";
  };

  // Ordre de tri : MJ d'abord, puis par faction (Citoyens → Méchants → Vampires → Neutres → sans rôle), puis pseudo.
  const factionOrder = (r: RoleRow | null): number => {
    if (!r) return 99;
    if (r.faction === "Civil") return 1;
    if (r.faction === "Méchant") return 3;
    if (r.slug === "vampire") return 4;
    if (r.faction === "Neutre") return /subversif/i.test(r.type ?? "") ? 5 : 6;
    return 10;
  };
  const playerCards = players
    .map((p) => ({ player: p, role: p.role_slug ? (roles.get(p.role_slug) ?? null) : null }))
    .sort((a, b) => {
      if (a.player.is_mj !== b.player.is_mj) return a.player.is_mj ? -1 : 1;
      const fa = factionOrder(a.role);
      const fb = factionOrder(b.role);
      if (fa !== fb) return fa - fb;
      return a.player.pseudo.localeCompare(b.player.pseudo);
    });

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      {/* Top bar — contrôles MJ globaux (2 tiers : navigation + contrôle live) */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
        {/* Ligne 1 — navigation, état de la partie, utilitaires */}
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold shrink-0"
          >
            <ChevronLeft className="size-4" /> Accueil
          </Link>
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span
              className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold shrink-0"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sandbox live
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs">{game.code}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs whitespace-nowrap">
              {game.current_phase} / tour {game.current_tour}
            </span>
            <span className="text-muted-foreground hidden sm:inline">·</span>
            <div className="hidden sm:block">
              <ConnectForm onConnect={connectToCode} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPool(true)}
              className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
              title="Pool de rôles bannis"
            >
              <Ban className="size-3.5" /> Pool
            </button>
            <button
              onClick={() => setShowTrios(true)}
              className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
              title="Trios Détective : pool des civils pouvant apparaître"
            >
              <Search className="size-3.5" /> Trios
            </button>
            <button
              onClick={() => setShowRegie(true)}
              className="px-2.5 py-1.5 text-xs rounded border border-gold/40 text-gold hover:bg-gold/10 flex items-center gap-1.5"
              title="Régie : voir tous les joueurs et ce qu'ils reçoivent, en direct"
            >
              <Radio className="size-3.5" /> Régie
            </button>
            <button
              onClick={() => setBotsActive((v) => !v)}
              className={`px-2.5 py-1.5 text-xs rounded border flex items-center gap-1.5 ${botsActive ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" : "border-border text-muted-foreground hover:bg-card"}`}
              title={
                botsActive
                  ? "Bots actifs — clique pour les figer"
                  : "Bots figés — clique pour les réactiver"
              }
            >
              {botsActive ? <Bot className="size-3.5" /> : <BotOff className="size-3.5" />}
              {botsActive ? "Bots ON" : "Bots OFF"}
            </button>
            <button
              onClick={reset}
              className="px-2.5 py-1.5 text-xs rounded border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
            >
              <RefreshCw className="size-3.5" /> Reset
            </button>
            <button
              onClick={newDemo}
              className="px-2.5 py-1.5 text-xs rounded border border-border text-muted-foreground hover:bg-card"
            >
              Nouvelle
            </button>
          </div>
        </div>

        {/* Ligne 2 — barre de contrôle de la partie (lobby = préparation, en jeu = minuteur) */}
        <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/60 flex items-center gap-2 flex-wrap">
          {game.status === "lobby" ? (
            <>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-card/50"
                title="Nombre de bots (hors MJ)"
              >
                <button
                  onClick={removeBot}
                  className="p-0.5 rounded hover:bg-secondary/40 disabled:opacity-30"
                  disabled={players.filter((p) => !p.is_mj).length <= MIN_BOTS}
                >
                  <UserMinus className="size-3.5" />
                </button>
                <span className="text-xs font-mono w-5 text-center">
                  {players.filter((p) => !p.is_mj).length}
                </span>
                <button
                  onClick={addBot}
                  className="p-0.5 rounded hover:bg-secondary/40 disabled:opacity-30"
                  disabled={players.filter((p) => !p.is_mj).length >= MAX_BOTS}
                >
                  <UserPlus className="size-3.5" />
                </button>
              </div>
              <button
                onClick={roll}
                className="px-2.5 py-1.5 text-xs rounded border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5"
                title="Tirer les rôles (sans lancer)"
              >
                <Dices className="size-3.5" /> Roll
              </button>
              <PhaseDurationsEditor game={game} />
              <button
                onClick={start}
                className="px-3 py-1.5 text-xs rounded bg-gold text-primary-foreground font-semibold flex items-center gap-1.5"
              >
                <Play className="size-3.5" /> Lancer
              </button>
            </>
          ) : (
            <>
              {/* Minuteur live + contrôles de temps */}
              <PhaseTimer game={game} />
              <button
                onClick={() => void togglePause()}
                className={`px-2.5 py-1.5 text-xs rounded border flex items-center gap-1.5 ${game.paused ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10" : "border-amber-500/50 text-amber-300 hover:bg-amber-500/10"}`}
                title={game.paused ? "Reprendre le minuteur" : "Mettre la phase en pause"}
              >
                {game.paused ? (
                  <>
                    <Play className="size-3.5" /> Reprendre
                  </>
                ) : (
                  <>
                    <Pause className="size-3.5" /> Pause
                  </>
                )}
              </button>
              <button
                onClick={() => void extendPhase(30)}
                className="px-2 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1"
                title="Ajouter 30 secondes à la phase en cours"
              >
                <Plus className="size-3" /> 30s
              </button>
              <button
                onClick={() => void extendPhase(60)}
                className="px-2 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1"
                title="Ajouter 60 secondes à la phase en cours"
              >
                <Plus className="size-3" /> 60s
              </button>
              <button
                onClick={() => void restartTimer()}
                className="px-2 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
                title="Redémarrer le minuteur (redonne toute la durée)"
              >
                <RotateCcw className="size-3.5" /> Relancer
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              {/* Passage de phase manuel */}
              <button
                onClick={ring}
                className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
                title="Forcer le Débat"
              >
                <Bell className="size-3.5" /> Débat
              </button>
              <button
                onClick={openV}
                className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
                title="Ouvrir le vote"
              >
                <Vote className="size-3.5" /> Vote
              </button>
              <button
                onClick={closeV}
                className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
                title="Clore le vote"
              >
                Clore
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <PhaseDurationsEditor game={game} />
            </>
          )}
        </div>
      </header>

      {showPool && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPool(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Pool de rôles
                </div>
                <div className="text-sm">
                  Bannis ce que tu veux exclure du tirage et relance la partie pour tester.
                </div>
              </div>
              <button
                onClick={() => setShowPool(false)}
                className="p-1.5 rounded hover:bg-secondary/40"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <RolePoolEditor game={game as unknown as import("@/lib/game").GameRow} />
              <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                💡 Astuce test : ouvre cette modale, banni des rôles, ferme, puis{" "}
                <strong>Reset</strong> + <strong>Lancer</strong> pour vérifier que la génération les
                exclut bien. Tous les rôles assignés sont listés dans le panneau de droite après
                lancement.
              </div>
            </div>
          </div>
        </div>
      )}

      {showTrios && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTrios(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Trios Détective
                </div>
                <div className="text-sm">
                  Pool des rôles civils pouvant apparaître dans un trio.
                </div>
              </div>
              <button
                onClick={() => setShowTrios(false)}
                className="p-1.5 rounded hover:bg-secondary/40"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {Array.from(roles.values())
                  .filter((r) => r.faction === "Civil" && !r.emergent)
                  .sort((a, b) => a.name_fr.localeCompare(b.name_fr))
                  .map((r) => (
                    <div
                      key={r.slug}
                      className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/60 bg-background/40 text-xs"
                    >
                      <RoleIcon role={r} size={16} />
                      <span className="font-medium">{r.name_fr}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-4 text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                💡 Le Détective (ou l'Assistant) voit un trio composé du vrai rôle de la cible + 2
                leurres tirés au hasard dans cette liste. Si la cible est le Tueur, son rôle est
                remplacé par un civil aléatoire avant le tirage du trio.
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegie && (
        <RegieView
          gameId={gameId}
          gameCode={game.code}
          players={players}
          roles={roles}
          onClose={() => setShowRegie(false)}
        />
      )}

      {showReport && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div
                  className="text-[10px] uppercase tracking-widest text-gold font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Rapport QA — agents bots
                </div>
                <div className="text-sm">
                  Problèmes rencontrés durant la partie{" "}
                  {game.status === "ended" ? "· partie terminée" : "· en cours"}
                </div>
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="p-1.5 rounded hover:bg-secondary/40"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <QAReport
                findings={qaFindings}
                onClear={() => {
                  clearFindings();
                  setQaFindings([]);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-[1400px] mx-auto w-full grid grid-cols-[260px_1fr_300px] gap-4 p-4">
        {/* LEFT — sélecteur d'onglet (sync game.forced_frame) + suivi d'activité */}
        <aside className="bg-card/40 rounded-lg border border-border overflow-hidden max-h-[calc(100dvh-140px)] flex flex-col">
          <div className="px-3 py-2.5 border-b border-border shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Onglets du joueur
            </div>
            <div className="text-xs text-foreground/80 mt-0.5">
              Force l'onglet affiché pour tous
            </div>
          </div>
          <div className="p-2 space-y-0.5 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => void forceFrame(t.id)}
                className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition ${
                  forcedTab === t.id
                    ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                    : "hover:bg-secondary/40 text-foreground/80"
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="px-2 py-2 border-t border-border shrink-0">
            <QASeverityCounts findings={qaFindings} onOpen={() => setShowReport(true)} />
          </div>
          <div className="px-3 py-2 border-t border-b border-border flex items-center justify-between shrink-0">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Suivi des actions
              </div>
              <div className="text-[10px] text-foreground/60">Ce que l'app vient de faire</div>
            </div>
            {activity.length > 0 && (
              <button
                onClick={() => setActivity([])}
                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-secondary/40"
                title="Effacer le suivi (visuel uniquement)"
              >
                Vider
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {activity.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic px-2 py-3 text-center">
                En attente d'événements…
              </div>
            ) : (
              activity.map((a) => (
                <div
                  key={a.id}
                  className="rounded border border-border/40 bg-background/40 px-2 py-1.5 text-[11px] leading-snug"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-foreground/90 truncate">{a.title}</div>
                    <div className="text-[9px] text-muted-foreground font-mono shrink-0">
                      {new Date(a.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                  {a.body && (
                    <div className="text-foreground/70 mt-0.5 whitespace-pre-wrap break-words">
                      {a.body}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CENTER — iPhone frame avec le VRAI PlayerShell */}
        <main className="flex flex-col items-center justify-start gap-3 min-h-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            {me ? (
              <>
                <span>
                  incarne <strong className="text-gold">{me.pseudo}</strong>
                </span>
                {me.role_slug && roles.get(me.role_slug) && (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    — <RoleIcon role={roles.get(me.role_slug)!} size={14} />{" "}
                    {roles.get(me.role_slug)!.name_fr}
                  </span>
                )}
              </>
            ) : (
              <span>Sélectionne un joueur à droite</span>
            )}
          </div>
          <div className="aspect-[390/780] h-[clamp(420px,calc(100dvh-210px),780px)] w-auto bg-background overflow-hidden rounded-[36px] shadow-2xl border-4 border-zinc-800 relative shrink-0">
            {me ? (
              <PlayerShell
                key={me.id}
                game={game as unknown as import("@/lib/game").GameRow}
                me={me as unknown as import("@/lib/game").PlayerRow}
                players={players as unknown as import("@/lib/game").PlayerRow[]}
                embedded
                disableHostDrivers
                forcedTab={forcedTab}
                onTabChange={setForcedTab}
                skipReveal
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Aucun joueur sélectionné
              </div>
            )}
          </div>
          {me && game.status === "in_progress" && (
            <div className="flex items-center gap-2 text-xs">
              {me.is_alive ? (
                <button
                  onClick={killEmbodied}
                  className="px-2.5 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-1"
                >
                  <Skull className="size-3" /> Tuer
                </button>
              ) : (
                <span className="text-destructive/70">💀 Mort</span>
              )}
              {me.is_alive && !me.is_imprisoned && (
                <button
                  onClick={imprisonEmbodied}
                  className="px-2.5 py-1 rounded border border-[oklch(0.55_0.20_55)/_0.4] text-[oklch(0.85_0.18_60)] hover:bg-[oklch(0.20_0.10_55)/_0.3] flex items-center gap-1"
                >
                  <Lock className="size-3" /> Emprisonner
                </button>
              )}
              {me.is_imprisoned && (
                <button
                  onClick={releaseEmbodied}
                  className="px-2.5 py-1 rounded border border-border hover:bg-card flex items-center gap-1"
                >
                  <Unlock className="size-3" /> Libérer
                </button>
              )}
            </div>
          )}
        </main>

        {/* RIGHT — incarner un joueur */}
        <aside className="bg-card/40 rounded-lg border border-border overflow-y-auto max-h-[calc(100dvh-140px)]">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Incarner un joueur
            </div>
            <div className="text-xs text-foreground/80 mt-0.5">
              {players.filter((p) => p.is_alive).length} vivants ·{" "}
              {players.filter((p) => p.is_imprisoned).length} prison ·{" "}
              {players.filter((p) => !p.is_alive).length} morts
            </div>
          </div>
          <div className="p-2 space-y-1">
            {playerCards.map(({ player: p, role: r }) => {
              const active = p.id === embodiedId;
              const status = !p.is_alive ? "💀" : p.is_imprisoned ? "🔒" : "✓";
              const canPickRole = game.status === "lobby" && !p.is_mj;
              return (
                <div
                  key={p.id}
                  className={`flex items-stretch rounded text-xs transition ${
                    active ? "bg-gold/20 ring-1 ring-gold/40" : "hover:bg-secondary/40"
                  }`}
                >
                  {canPickRole && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRolePickerPlayerId(p.id);
                      }}
                      title="Assigner manuellement un rôle"
                      className="px-2 flex items-center justify-center text-muted-foreground hover:text-gold border-r border-border/40"
                    >
                      <Drama className="size-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setEmbodiedId(p.id)}
                    className="flex-1 text-left px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1.5">
                        {p.pseudo}
                        {p.is_mj && <span className="text-[9px] uppercase text-gold">MJ</span>}
                      </span>
                      <span>{status}</span>
                    </div>
                    {r ? (
                      <div
                        className="text-[10px] mt-0.5 inline-flex items-center gap-1"
                        style={{ color: factionColor(r) }}
                      >
                        <RoleIcon role={r} size={12} /> {r.name_fr}
                      </div>
                    ) : (
                      <div className="text-[10px] mt-0.5 text-muted-foreground italic">
                        — pas encore de rôle —
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-border text-[10px] text-muted-foreground/80 leading-relaxed">
            🎯 Toute modif d'UI joueur faite dans le code apparaît ici immédiatement — c'est le même
            composant.
          </div>
        </aside>
      </div>

      {rolePickerPlayerId &&
        (() => {
          const target = players.find((p) => p.id === rolePickerPlayerId);
          if (!target) return null;
          const close = () => setRolePickerPlayerId(null);
          const assign = async (slug: string | null) => {
            await supabase.from("players").update({ role_slug: slug }).eq("id", target.id);
            close();
          };
          const all = Array.from(roles.values()).filter((r) => !r.emergent);
          const groups: { label: string; items: RoleRow[] }[] = [
            {
              label: "Civils",
              items: all
                .filter((r) => r.faction === "Civil")
                .sort((a, b) => a.name_fr.localeCompare(b.name_fr)),
            },
            {
              label: "Méchants",
              items: all
                .filter((r) => r.faction === "Méchant" && r.slug !== "vampire")
                .sort((a, b) => a.name_fr.localeCompare(b.name_fr)),
            },
            { label: "Vampire", items: all.filter((r) => r.slug === "vampire") },
            {
              label: "Neutres",
              items: all
                .filter((r) => r.faction === "Neutre")
                .sort((a, b) => a.name_fr.localeCompare(b.name_fr)),
            },
          ].filter((g) => g.items.length > 0);
          return (
            <div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={close}
            >
              <div
                className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Assigner un rôle
                    </div>
                    <div className="text-sm">
                      Joueur : <strong className="text-gold">{target.pseudo}</strong>
                    </div>
                  </div>
                  <button onClick={close} className="p-1.5 rounded hover:bg-secondary/40">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-4">
                  <button
                    onClick={() => void assign(null)}
                    className="w-full px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:bg-secondary/40 text-left"
                  >
                    — Aucun rôle (laisser le tirage automatique) —
                  </button>
                  {groups.map((g) => (
                    <div key={g.label}>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                        {g.label}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {g.items.map((r) => {
                          const selected = target.role_slug === r.slug;
                          return (
                            <button
                              key={r.slug}
                              onClick={() => void assign(r.slug)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs text-left transition ${
                                selected
                                  ? "border-gold/60 bg-gold/10"
                                  : "border-border/60 bg-background/40 hover:bg-secondary/40"
                              }`}
                              style={{ color: factionColor(r) }}
                            >
                              <RoleIcon role={r} size={16} />
                              <span className="font-medium truncate">{r.name_fr}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
                    💡 Les rôles assignés manuellement seront conservés si tu lances la partie
                    directement. Un <strong>Roll</strong> ou <strong>Reset</strong> écrasera tes
                    choix.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function ConnectForm({ onConnect }: { onConnect: (code: string) => void | Promise<void> }) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) void onConnect(code);
      }}
      className="flex items-center gap-1"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
        placeholder="CODE"
        className="h-7 w-20 px-2 rounded bg-background border border-border text-xs font-mono uppercase tracking-wider"
      />
      <button
        type="submit"
        className="h-7 px-2 rounded border border-gold/40 text-gold text-[10px] uppercase hover:bg-gold/10"
      >
        Brancher
      </button>
    </form>
  );
}

// Minuteur live de la phase en cours. Recalcule le temps restant à partir de
// `phase_started_at` + `phase_duration_s` (mêmes champs que le compteur joueur),
// et affiche « EN PAUSE » quand l'avancement auto est gelé.
function PhaseTimer({ game }: { game: GameRow }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => (n + 1) % 1e6), 250);
    return () => clearInterval(t);
  }, []);
  const dur = game.phase_duration_s ?? 0;
  const started = game.phase_started_at ? new Date(game.phase_started_at).getTime() : 0;
  const elapsed = started ? (serverNow() - started) / 1000 - introSFor(game.current_phase) : 0;
  const inIntro = started > 0 && elapsed < 0;
  const remaining = Math.max(0, dur - Math.max(0, elapsed));
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);
  const value = `${mm}:${String(ss).padStart(2, "0")}`;
  const danger = !game.paused && !inIntro && remaining <= 10;
  const cls = game.paused
    ? "border-amber-500/50 text-amber-300 bg-amber-500/10"
    : danger
      ? "border-destructive/50 text-destructive bg-destructive/10 animate-pulse"
      : "border-gold/40 text-gold bg-gold/10";
  return (
    <div
      className={`px-2.5 py-1.5 rounded border flex items-center gap-1.5 font-mono text-sm tabular-nums ${cls}`}
      title="Temps restant sur la phase en cours"
    >
      <Timer className="size-3.5" />
      <span>{game.paused ? "EN PAUSE" : inIntro ? "intro…" : value}</span>
      <span className="text-[10px] font-sans uppercase tracking-wider opacity-70 ml-0.5">
        {game.current_phase}
      </span>
    </div>
  );
}

function PhaseDurationsEditor({ game }: { game: GameRow }) {
  const [open, setOpen] = useState(false);
  const [free, setFree] = useState<number>(game.phase_duration_free_s ?? 30);
  const [gath, setGath] = useState<number>(game.phase_duration_gathering_s ?? 30);
  const [vote, setVote] = useState<number>(game.phase_duration_vote_s ?? 30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFree(game.phase_duration_free_s ?? 30);
    setGath(game.phase_duration_gathering_s ?? 30);
    setVote(game.phase_duration_vote_s ?? 30);
  }, [game.phase_duration_free_s, game.phase_duration_gathering_s, game.phase_duration_vote_s]);

  async function save() {
    setSaving(true);
    try {
      await supabase
        .from("games")
        .update({
          phase_duration_free_s: Math.max(2, Math.min(3600, Math.round(free))),
          phase_duration_gathering_s: Math.max(2, Math.min(3600, Math.round(gath))),
          phase_duration_vote_s: Math.max(2, Math.min(600, Math.round(vote))),
        })
        .eq("id", game.id);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function update() {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-1.5 text-xs rounded border border-border hover:bg-card flex items-center gap-1.5"
        title="Régler la durée des phases avant de lancer"
      >
        ⏱️ Durées
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[9999] w-64 rounded-lg border border-border bg-card shadow-xl p-3 space-y-2"
              style={{ top: pos.top, right: pos.right }}
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Durées des phases (s)
              </div>
              <Row label="Enquête" value={free} setValue={setFree} min={2} max={3600} />
              <Row label="Débat" value={gath} setValue={setGath} min={2} max={3600} />
              <Row label="Vote" value={vote} setValue={setVote} min={2} max={600} />
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => setOpen(false)}
                  className="px-2 py-1 text-[11px] rounded border border-border hover:bg-secondary/30"
                >
                  Annuler
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-2 py-1 text-[11px] rounded bg-gold text-primary-foreground font-semibold disabled:opacity-60"
                >
                  {saving ? "…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function Row({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-7 w-20 px-2 rounded bg-background border border-border text-xs font-mono text-right"
      />
    </label>
  );
}
