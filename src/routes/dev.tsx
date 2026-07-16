// /dev — Galerie de situations.
// Chaque frame ACTIVE du jeu (les mêmes composants que PlayerShell / /g/$code)
// est rendue ici dans un état SYNTHÉTIQUE choisi (victoire par faction, prison,
// mort, vote, etc.). Aucune partie réelle : l'état est fabriqué à la volée, donc
// on peut atteindre des situations impossibles à forcer en live.
//
// Robustesse : chaque scène est montée avec un `key` unique (remount propre des
// hooks à chaque changement) et enveloppée dans un ErrorBoundary, donc une frame
// qui plante affiche une carte d'erreur isolée au lieu de tuer toute la page.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow, RoleRow } from "@/engine/actions";
import type { FrameContext } from "@/components/frames/registry";

import { P1Garde } from "@/components/frames/screens/P1Garde";
import { PA2Capability } from "@/components/frames/screens/PA2Capability";
import { PA3Suspicions } from "@/components/frames/screens/PA3Suspicions";
import { PA4Notebook } from "@/components/frames/screens/PA4Notebook";
import { PA6Announces } from "@/components/frames/screens/PA6Announces";
import { PA5Players } from "@/components/frames/screens/PA5Players";
import { P10Roles } from "@/components/frames/screens/P10Roles";
import { P15Testament } from "@/components/frames/screens/P15Testament";
import { P1Prison } from "@/components/frames/screens/P1Prison";
import { C1Council } from "@/components/frames/screens/C1Council";
import { V1Vote } from "@/components/frames/screens/V1Vote";
import { V1VoteSuspicion } from "@/components/frames/screens/V1VoteSuspicion";
import {
  INTRO_MS,
  VOTE_RESULT_MS,
  T1Transition,
  T2VoteIntro,
  T3FreeIntro,
  VoteOutro,
  AnnonceScreen,
} from "@/components/frames/screens/T1Transition";
import { O5Reveal } from "@/components/frames/screens/O5Reveal";
import { GM1Dashboard } from "@/components/frames/screens/GM1Dashboard";
import { P11HelpMenu } from "@/components/frames/screens/P11HelpMenu";
import { E1EndGame } from "@/components/frames/screens/E1EndGame";
import { EventCard, type EventKind, type QueuedEvent } from "@/components/PlayerEventModal";
import { DuelScene } from "@/components/DiceDuelModal";
import { serverNow } from "@/lib/serverTime";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";
import { uid, baseGame, buildRoster, PREVIEW_INVENTORY, type Roster } from "@/lib/devFixtures";

export const Route = createFileRoute("/dev")({
  // Galerie d'écrans en états synthétiques : accessible uniquement via `vite dev`.
  beforeLoad: requireLocalDevelopment,
  component: DevGallery,
});

// ──────────────────────────────────────────────────────────────────────────
// Scènes
// ──────────────────────────────────────────────────────────────────────────

type Scene = { id: string; group: string; label: string; render: () => ReactNode };

function buildScenes(roles: Map<string, RoleRow>): Scene[] {
  if (roles.size === 0) return [];

  // Contexte de base réutilisé. On clone le joueur incarné par scène pour
  // ajuster son état (mort / prison) sans casser la cohérence du roster.
  const ctxFor = (
    meOf: (r: Roster) => PlayerRow,
    gameOver: Partial<GameRow> = {},
    meOver: Partial<PlayerRow> = {},
    extra: Partial<FrameContext> = {},
  ): FrameContext => {
    const game = baseGame(gameOver);
    const roster = buildRoster(game, roles);
    const base = meOf(roster);
    const me = { ...base, ...meOver } as PlayerRow;
    const players = roster.players.map((p) => (p.id === me.id ? me : p));
    const myRole = me.role_slug ? (roles.get(me.role_slug) ?? null) : null;
    return { game, me, myRole, players, roles, gameId: game.id, ...extra };
  };

  const civil = (r: Roster) => r.byPseudo("Alice");
  const tueur = (r: Roster) => r.byPseudo("Bob");
  const phasePreview = (phase: GameRow["current_phase"], over: Partial<GameRow> = {}) => ({
    current_phase: phase,
    // Horloge SERVEUR : les bascules d'intro (PhaseIntro) lisent leur fenêtre
    // de visibilité avec `serverNow()`. Écrire ce timestamp en heure locale
    // désaligne la fenêtre dès que l'offset serveur n'est pas nul (base live) →
    // la frame se croit expirée et n'affiche rien.
    phase_started_at: new Date(serverNow() - 150).toISOString(),
    phase_duration_s: 3,
    phase_duration_free_s: 3,
    phase_duration_gathering_s: 3,
    phase_duration_vote_s: 3,
    ...over,
  });
  const voteResultCtx = (): FrameContext => {
    const phaseDurationS = 0;
    const ctx = ctxFor(civil, {
      ...phasePreview("vote", {
        current_tour: 3,
        phase_duration_s: phaseDurationS,
        phase_duration_vote_s: phaseDurationS,
        phase_started_at: new Date(Date.now() - INTRO_MS - 250).toISOString(),
      }),
    });
    const target = ctx.players.find((p) => p.pseudo === "Bob") ?? ctx.players.find((p) => !p.is_mj);
    if (!target) return ctx;
    const players = ctx.players.map((p) =>
      p.id === target.id
        ? ({
            ...p,
            is_imprisoned: true,
            role_meta: {
              ...((p.role_meta ?? {}) as Record<string, unknown>),
              imprisoned_since_cycle: ctx.game.current_tour,
            },
          } as PlayerRow)
        : p,
    );
    return {
      ...ctx,
      players,
      devVoteVerdict: {
        target_id: target.id,
        tour: ctx.game.current_tour,
        tied: false,
        counts: { [target.id]: 5 },
      },
    };
  };

  const scenes: Scene[] = [];
  const add = (s: Scene) => scenes.push(s);

  // ── Joueur vivant
  add({
    id: "P1",
    group: "Joueur — vivant",
    label: "Écran de garde",
    render: () => <Frame node={<P1Garde {...ctxFor(civil)} />} />,
  });
  add({
    id: "PA2",
    group: "Joueur — vivant",
    label: "Capacité (rôle courant)",
    render: () => <Frame node={<PA2Capability {...ctxFor(tueur)} />} />,
  });
  add({
    id: "PA3",
    group: "Joueur — vivant",
    label: "Suspicions",
    render: () => <Frame node={<PA3Suspicions {...ctxFor(civil)} />} />,
  });
  add({
    id: "PA4",
    group: "Joueur — vivant",
    label: "Inventaire / Journal",
    render: () => (
      <Frame
        node={
          <PA4Notebook
            {...ctxFor(
              civil,
              {},
              {
                role_meta: { inventory: PREVIEW_INVENTORY } as PlayerRow["role_meta"],
              },
            )}
          />
        }
      />
    ),
  });
  add({
    id: "PA6",
    group: "Joueur — vivant",
    label: "Annonces / Cimetière",
    render: () => {
      // Aperçu dev : on injecte aussi les cadres illustrés Morsure + éveil du
      // Chasseur (déduits du role_meta d'un joueur converti et du Chasseur),
      // pour exposer tous les types d'annonce. Portée locale à la scène.
      const ctx = ctxFor(civil);
      const tour = ctx.game.current_tour;
      const players = ctx.players.map((p) => {
        if (p.pseudo === "Dré")
          return {
            ...p,
            role_meta: {
              ...((p.role_meta ?? {}) as Record<string, unknown>),
              converted: true,
              converted_cycle: tour,
            },
          } as PlayerRow;
        if (p.pseudo === "Léo")
          return {
            ...p,
            role_meta: {
              ...((p.role_meta ?? {}) as Record<string, unknown>),
              chasseur_awakened_cycle: tour,
            },
          } as PlayerRow;
        // Sortie de prison (le Juge a libéré Gus au tour courant).
        if (p.pseudo === "Gus")
          return {
            ...p,
            is_imprisoned: false,
            role_meta: {
              ...((p.role_meta ?? {}) as Record<string, unknown>),
              imprisoned_since_cycle: tour - 1,
              released_at_cycle: tour,
            },
          } as PlayerRow;
        return p;
      });
      return <Frame node={<PA6Announces {...ctx} players={players} />} />;
    },
  });
  add({
    id: "P15",
    group: "Joueur — vivant",
    label: "Testament",
    render: () => <Frame node={<P15Testament {...ctxFor(civil)} />} />,
  });

  // ── Écrans de référence (dossier 10) — annuaire, cimetière, codex des rôles.
  add({
    id: "PA5",
    group: "Référence",
    label: "Liste des joueurs",
    render: () => <Frame node={<PA5Players {...ctxFor(civil, {}, {}, {})} />} />,
  });
  add({
    id: "P10",
    group: "Référence",
    label: "Les rôles (codex)",
    render: () => <Frame node={<P10Roles {...ctxFor(civil)} />} />,
  });

  // ── États particuliers
  add({
    id: "P1Prison",
    group: "Joueur — états",
    label: "Prison (emprisonné)",
    render: () => (
      <Frame
        node={<P1Prison {...ctxFor((r) => r.byPseudo("Jin"), {}, { is_imprisoned: true })} />}
      />
    ),
  });
  add({
    id: "C1",
    group: "Joueur — états",
    label: "Conseil des morts",
    render: () => (
      <Frame node={<C1Council {...ctxFor((r) => r.byPseudo("Faye"), {}, { is_alive: false })} />} />
    ),
  });

  // ── Phases & transitions
  add({
    id: "T3",
    group: "Phases",
    label: "Intro — Enquête",
    render: () => (
      <ReplayPreview
        replayMs={INTRO_MS + 400}
        makeNode={() => <T3FreeIntro {...ctxFor(civil, phasePreview("free"))} />}
      />
    ),
  });
  add({
    id: "T0",
    group: "Phases",
    label: "Annonce (dénouement)",
    render: () => <Frame node={<AnnonceScreen {...ctxFor(civil, phasePreview("annonce"))} />} />,
  });
  add({
    id: "T1",
    group: "Phases",
    label: "Débat",
    render: () => (
      <ReplayPreview
        replayMs={INTRO_MS + 400}
        makeNode={() => <T1Transition {...ctxFor(civil, phasePreview("gathering"))} />}
      />
    ),
  });
  add({
    id: "T2",
    group: "Phases",
    label: "Intro — Vote",
    render: () => (
      <ReplayPreview
        replayMs={INTRO_MS + 400}
        makeNode={() => <T2VoteIntro {...ctxFor(civil, phasePreview("vote"))} />}
      />
    ),
  });
  add({
    id: "VROutro",
    group: "Phases",
    label: "Résultat du vote",
    render: () => <VoteResultDevPreview makeCtx={voteResultCtx} />,
  });
  add({
    id: "V1",
    group: "Phases",
    label: "Vote",
    render: () => <Frame node={<V1Vote {...ctxFor(civil, phasePreview("vote"))} />} />,
  });
  add({
    id: "V1s",
    group: "Phases",
    label: "Vote — variante Suspicion",
    render: () => (
      <Frame
        node={
          <V1VoteSuspicion {...ctxFor(civil, phasePreview("vote", { variant: "suspicion" }))} />
        }
      />
    ),
  });

  // ── Modales d'événement (fenêtres « dossier » The Board) — rendues `embedded`
  // pour tenir dans le cadre téléphone (en jeu elles s'affichent en plein écran).
  const evt = (kind: EventKind, byRoleSlug?: string | null): QueuedEvent => ({
    id: uid(),
    kind,
    byRoleSlug,
    createdAt: Date.now(),
  });
  const tueurRole = roles.get("tueur") ?? null;
  const vampRole = roles.get("vampire") ?? null;
  const modal = (node: ReactNode) => (
    <Frame node={<div className="relative h-full w-full bg-background">{node}</div>} />
  );
  add({
    id: "M-duel",
    group: "Modales",
    label: "Duel de dés",
    render: () =>
      modal(
        <DuelScene
          embedded
          meId="dev-actor"
          players={[]}
          onClose={() => {}}
          duel={{
            duelId: uid(),
            actorId: "dev-actor",
            actorPseudo: "Dany",
            targetId: "dev-target",
            targetPseudo: "Marco",
            rounds: [{ a: 6, b: 4, c: 2, best: 6, them: 3 }],
            winnerId: "dev-actor",
            loserId: "dev-target",
          }}
        />,
      ),
  });
  add({
    id: "M-mordu",
    group: "Modales",
    label: "Tu as été mordu",
    render: () =>
      modal(
        <EventCard embedded ev={evt("bitten", "vampire")} role={vampRole} onClose={() => {}} />,
      ),
  });
  add({
    id: "M-chasseur",
    group: "Modales",
    label: "Éveil du Chasseur",
    render: () =>
      modal(
        <EventCard
          embedded
          ev={evt("chasseur", "chasseur_de_vampire")}
          role={roles.get("chasseur_de_vampire") ?? null}
          onClose={() => {}}
        />,
      ),
  });
  add({
    id: "M-cible",
    group: "Modales",
    label: "Mort (avis de décès)",
    render: () =>
      modal(<EventCard embedded ev={evt("killed", "tueur")} role={tueurRole} onClose={() => {}} />),
  });
  add({
    id: "M-prison",
    group: "Modales",
    label: "Prison",
    render: () =>
      modal(<EventCard embedded ev={evt("imprisoned")} role={null} onClose={() => {}} />),
  });
  // ── Capacité de chaque rôle : on incarne un joueur vivant à qui on assigne
  // le rôle, et on rend l'onglet Capacité réel. Groupé par faction.
  const factionRank = (f: string) =>
    f === "Civil" ? 0 : f === "Méchant" ? 1 : f === "Neutre" ? 2 : 3;
  const capRoles = [...roles.values()]
    .filter((r) => !r.is_special)
    .sort(
      (a, b) =>
        factionRank(a.faction) - factionRank(b.faction) || a.name_fr.localeCompare(b.name_fr),
    );
  for (const r of capRoles) {
    add({
      id: `CAP-${r.slug}`,
      group: `Capacité — ${r.faction}`,
      label: r.name_fr,
      render: () => (
        <Frame
          node={
            <PA2Capability
              {...ctxFor(civil, {}, { role_slug: r.slug, is_alive: true, is_imprisoned: false })}
            />
          }
        />
      ),
    });
  }

  // ── Révélation de rôle (O5) — une carte « dossier confidentiel » par rôle,
  // groupée par faction. Décompte sauté pour aller droit au dossier.
  for (const r of capRoles) {
    add({
      id: `O5-${r.slug}`,
      group: `Révélation — ${r.faction}`,
      label: r.name_fr,
      render: () => {
        const ctx = ctxFor(civil, {}, { role_slug: r.slug });
        return (
          <O5Reveal
            player={ctx.me as unknown as { id: string; role_meta: Record<string, unknown> | null }}
            role={r}
            onDone={() => {}}
            skipCountdown
          />
        );
      },
    });
  }

  // ── MJ & aide
  add({
    id: "GM1",
    group: "MJ & aide",
    label: "Dashboard MJ",
    render: () => <Frame node={<GM1Dashboard {...ctxFor((r) => r.mj)} />} />,
  });
  add({
    id: "P11",
    group: "MJ & aide",
    label: "Menu d'aide / Paramètres",
    render: () => <Frame node={<P11HelpMenu ctx={ctxFor(civil)} onClose={() => {}} />} />,
  });

  // ── Fin de partie — une scène par camp gagnant
  const winners: Array<[string, string]> = [
    ["Civil", "Victoire — Civils"],
    ["Méchants", "Victoire — Méchants"],
    ["Vampires", "Victoire — Vampires"],
    ["Neutres", "Victoire — Neutres"],
    ["Amoureux", "Victoire — Amoureux"],
    ["Empoisonneur", "Victoire — Empoisonneur"],
    ["Veuve noire", "Victoire — Veuve noire"],
    ["Parieur tricheur", "Victoire — Parieur tricheur"],
    ["Conservateur", "Victoire — Conservateur"],
  ];
  for (const [winner, label] of winners) {
    add({
      id: `E1-${winner}`,
      group: "Fin de partie",
      label,
      render: () => (
        <Frame
          node={
            <E1EndGame
              {...ctxFor(
                civil,
                { status: "ended", current_phase: "ended" },
                {},
                { devWinner: winner },
              )}
            />
          }
        />
      ),
    });
  }

  return scenes;
}

// ──────────────────────────────────────────────────────────────────────────
// Rendu
// ──────────────────────────────────────────────────────────────────────────

function Frame({ node }: { node: ReactNode }) {
  // Cadre téléphone : chaque frame est conçue pour un viewport ~390px.
  return <div className="h-full w-full bg-background overflow-hidden">{node}</div>;
}

function VoteResultDevPreview({ makeCtx }: { makeCtx: () => FrameContext }) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const replayMs = Math.max(4500, VOTE_RESULT_MS - 350);
    const interval = window.setInterval(() => setCycle((n) => n + 1), replayMs);
    return () => window.clearInterval(interval);
  }, []);

  return <Frame node={<VoteOutro key={cycle} {...makeCtx()} />} />;
}

// Les bascules d'intro de phase (PhaseIntro) ne s'affichent que pendant leur
// fenêtre `INTRO_MS` après `phase_started_at`, puis se masquent d'elles-mêmes.
// Dans la galerie, on les rejoue en boucle : chaque cycle remonte le nœud avec
// un `phase_started_at` frais (via `makeNode`) pour relancer l'animation.
function ReplayPreview({ makeNode, replayMs }: { makeNode: () => ReactNode; replayMs: number }) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCycle((n) => n + 1), replayMs);
    return () => window.clearInterval(id);
  }, [replayMs]);
  return <Frame key={cycle} node={makeNode()} />;
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3 bg-zinc-950 text-zinc-300">
          <div className="text-5xl">⚠️</div>
          <div className="text-sm font-semibold text-red-400">Cette frame a planté</div>
          <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function DevGallery() {
  const [roles, setRoles] = useState<Map<string, RoleRow>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoadTimeout(true), 10000);
    void supabase
      .from("roles")
      .select()
      .eq("set_id", "set1")
      .then(({ data, error }) => {
        clearTimeout(t);
        if (error) {
          setLoadError(error.message);
          return;
        }
        const m = new Map<string, RoleRow>();
        for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
        setRoles(m);
      });
    return () => clearTimeout(t);
  }, []);

  const scenes = useMemo(() => buildScenes(roles), [roles]);
  useEffect(() => {
    if (!activeId && scenes.length > 0) setActiveId(scenes[0].id);
  }, [scenes, activeId]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Scene[]>();
    for (const s of scenes) {
      if (
        !s.label.toLowerCase().includes(search.toLowerCase()) &&
        !s.group.toLowerCase().includes(search.toLowerCase())
      )
        continue;
      if (!map.has(s.group)) {
        map.set(s.group, []);
        order.push(s.group);
      }
      map.get(s.group)!.push(s);
    }
    return order.map((g) => ({ group: g, items: map.get(g)! }));
  }, [scenes, search]);

  const active = scenes.find((s) => s.id === activeId) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = scenes.findIndex((s) => s.id === activeId);
      if (i < 0) return;
      const next =
        e.key === "ArrowRight" ? (i + 1) % scenes.length : (i - 1 + scenes.length) % scenes.length;
      setActiveId(scenes[next].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scenes, activeId]);

  if (roles.size === 0) {
    return (
      <div
        className="min-h-dvh bg-background text-muted-foreground p-8 flex flex-col items-center justify-center gap-4 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {loadError ? (
          <>
            <div className="text-destructive text-sm">Impossible de charger les rôles</div>
            <div className="text-[11px] max-w-md break-words">{loadError}</div>
          </>
        ) : loadTimeout ? (
          <>
            <div className="text-sm">Le chargement prend trop de temps.</div>
            <div className="text-[11px] max-w-md">Vérifie ta connexion ou recharge la page.</div>
          </>
        ) : (
          <>Chargement des rôles…</>
        )}
        <button
          onClick={() => location.reload()}
          className="px-3 py-1.5 text-xs rounded border border-border hover:border-gold"
        >
          Recharger
        </button>
        <Link to="/" className="text-[11px] text-muted-foreground hover:text-gold">
          ← Accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground text-sm flex">
      {/* Sélecteur de scènes */}
      <aside className="w-[268px] border-r border-border flex flex-col h-dvh bg-card/30">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
          <Link to="/" className="text-muted-foreground hover:text-gold transition-colors">
            ← exit
          </Link>
          <span
            className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Galerie · Dossier
          </span>
        </div>
        {/* Écrans dédiés : routes séparées de la galerie (labs, démo). Regroupés
            ici pour que tout l'outillage dev soit accessible d'un seul endroit. */}
        <div className="px-2 pt-2 shrink-0">
          <div
            className="px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Écrans dédiés
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <Link
              to="/state-lab"
              className="col-span-2 rounded-md border border-gold/40 px-2.5 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
              title="Vivant · Prison · Mort côte à côte, dans le vrai shell joueur"
            >
              State Lab — états joueur
            </Link>
            <Link
              to="/result-lab"
              className="rounded-md border border-border/40 px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-card/60 hover:text-gold"
            >
              Result Lab
            </Link>
            <Link
              to="/demo"
              className="rounded-md border border-border/40 px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-card/60 hover:text-gold"
            >
              Démo (bots)
            </Link>
          </div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filtrer…"
          className="m-2 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring shrink-0"
        />
        <div className="flex-1 overflow-y-auto pb-6">
          {groups.map(({ group, items }) => (
            <div key={group} className="mt-3">
              <div
                className="px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {group}
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${activeId === s.id ? "bg-card text-gold" : "text-foreground/80 hover:bg-card/60 hover:text-foreground"}`}
                  style={activeId === s.id ? { fontFamily: "var(--font-display)" } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground shrink-0">
          ←→ scène · {scenes.length} situations
        </div>
      </aside>

      {/* Aperçu */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
        <div
          className="mb-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {active?.group} · <span className="text-gold">{active?.label}</span>
        </div>
        {/* transform-gpu : fait du cadre le bloc conteneur des `position:fixed`
            internes (O5 révélation, menu d'aide…), donc les overlays plein écran
            des frames restent confinés au téléphone — rendu identique au live. */}
        <div className="w-[390px] h-[844px] shrink-0 bg-background overflow-hidden rounded-[40px] shadow-2xl border border-zinc-800 relative transform-gpu">
          {active ? <SceneBoundary key={active.id}>{active.render()}</SceneBoundary> : null}
        </div>
      </main>
    </div>
  );
}
