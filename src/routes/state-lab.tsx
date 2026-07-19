// /state-lab — Vue d'ensemble des 3 ÉTATS du joueur, côte à côte.
//
// Pourquoi un écran dédié : la galerie /dev rend des frames ISOLÉES (une par
// une), alors que la colorimétrie d'état (fond, header de phase, bandeau de
// statuts, barre d'onglets) vit dans le PlayerShell. Ce lab monte donc le VRAI
// PlayerShell — le même composant qu'en live — dans trois cadres téléphone :
// Vivant · Prison · Mort. Ce que le lab montre = ce que voit le joueur.
//
// Le joueur incarné est le MÊME dans les trois (même pseudo, même rôle, même
// roster) : seul `is_alive` / `is_imprisoned` change. Toute différence visible
// entre deux téléphones est donc imputable à l'état, et à rien d'autre.
//
// Écran de REVUE de la colorimétrie d'état retenue (cf. lib/statePalette). Le
// sélecteur de phase permet de vérifier que l'état continue de primer par-dessus
// l'ambiance de phase, à tous les onglets.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow, RoleRow } from "@/engine/actions";
import type { GameRow as ShellGameRow, PlayerRow as ShellPlayerRow } from "@/lib/game";
import { PlayerShell } from "@/components/PlayerShell";
import { baseGame, buildRoster, PREVIEW_INVENTORY } from "@/lib/devFixtures";
import { collectAnnouncements, eventId } from "@/components/frames/screens/PA6Announces";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";
import { serverNow } from "@/lib/serverTime";
import { introMsFor } from "@/lib/phaseTiming";
import { Skull, Lock, Heart } from "lucide-react";

export const Route = createFileRoute("/state-lab")({
  // Lab d'états synthétiques : accessible uniquement via `vite dev`.
  beforeLoad: requireLocalDevelopment,
  component: StateLab,
});

type Tab = "journal" | "suspicions" | "cemetery" | "capacity" | "testament";
type StateKey = "alive" | "prison" | "dead";

const PHASES: { key: GameRow["current_phase"]; label: string }[] = [
  { key: "free", label: "Enquête" },
  { key: "annonce", label: "Annonce" },
  { key: "gathering", label: "Débat" },
  { key: "vote", label: "Vote" },
];

const TABS: { key: Tab; label: string }[] = [
  { key: "journal", label: "Inventaire" },
  { key: "suspicions", label: "Suspicions" },
  { key: "cemetery", label: "Annonces" },
  { key: "testament", label: "Testament / Conseil" },
  { key: "capacity", label: "Capacité / Prison" },
];

const ZOOMS = [0.55, 0.7, 0.85, 1];

const STATES: {
  key: StateKey;
  label: string;
  hint: string;
  icon: typeof Heart;
  accent: string;
}[] = [
  {
    key: "alive",
    label: "Vivant",
    hint: "Joue normalement : capacité active, vote ouvert.",
    icon: Heart,
    accent: "var(--success)",
  },
  {
    key: "prison",
    label: "Prison",
    hint: "En vie mais neutralisé : capacité et vote coupés.",
    icon: Lock,
    accent: "oklch(0.77 0.15 70)",
  },
  {
    key: "dead",
    label: "Mort",
    hint: "Hors-jeu : bascule sur le Conseil des morts.",
    icon: Skull,
    accent: "var(--destructive)",
  },
];

// Un joueur VIVANT du roster sert de base commune aux trois états. Alice est
// Civile avec un rôle actif : c'est le cas le plus représentatif (une capacité
// à couper en prison, une fiche à consulter une fois morte).
const BASE_PSEUDO = "Alice";

// Marque toutes les annonces de la partie synthétique comme DÉJÀ LUES, avant que
// le PlayerShell ne se monte et ne les découvre.
//
// Sans ça : chaque changement de phase fabrique une partie neuve (id frais →
// clé de stockage vierge), donc les annonces du tour 2 passent pour fraîches et
// les trois shells tirent chacun un toast « Nouvelle annonce ». Ces toasts sont
// des portals sur `document.body` : ils sortent des cadres téléphone, se
// superposent et recouvrent la barre de contrôle.
//
// C'est aussi plus juste : on dépeint un joueur au tour 2, qui a forcément déjà
// lu les annonces des tours précédents.
function markAnnouncementsSeen(gameId: string, meId: string, players: PlayerRow[]) {
  try {
    const ids = collectAnnouncements(players).map(eventId);
    localStorage.setItem(`pa6-seen-${gameId}-${meId}`, JSON.stringify(ids));
  } catch {
    /* localStorage indisponible : au pire on revoit les toasts, rien de critique. */
  }
}

function StateLab() {
  const [roles, setRoles] = useState<Map<string, RoleRow>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GameRow["current_phase"]>("free");
  // « Annonces » par défaut : c'est l'onglet sur lequel le jeu ramène les
  // joueurs à chaque début de phase, et le seul qui n'est pas masqué par le
  // voile « Maintiens pour révéler » (lequel cacherait ce qu'on vient comparer).
  const [tab, setTab] = useState<Tab>("cemetery");
  const [zoom, setZoom] = useState(0.7);

  useEffect(() => {
    void supabase
      .from("roles")
      .select()
      .eq("set_id", "set1")
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          return;
        }
        const m = new Map<string, RoleRow>();
        for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
        setRoles(m);
      });
  }, []);

  // Une partie + un roster PAR téléphone. Le casting est déterministe (même
  // `CAST`, même tirage de rôles), donc les trois restent visuellement
  // identiques — seuls les identifiants, invisibles à l'écran, diffèrent.
  //
  // Cette isolation n'est pas cosmétique : les PlayerShell s'abonnent au
  // Realtime sur des topics dérivés des ids (`cap-used-<playerId>-<tour>`,
  // `statuses-<playerId>`…). Avec un id partagé, les 2ᵉ et 3ᵉ téléphones
  // tentaient de souscrire à un topic déjà souscrit et plantaient
  // (« cannot add postgres_changes callbacks after subscribe() »).
  //
  // `phase_started_at` est reculé au-delà de la fenêtre d'intro (T1/T2/T3, lue
  // sur l'horloge SERVEUR) : sans ça les trois téléphones afficheraient l'écran
  // de transition plein cadre au lieu de la vue de jeu qu'on veut comparer.
  const phones = useMemo(() => {
    if (roles.size === 0) return [];

    // Le meta narratif que l'état implique en vrai (depuis quand en prison, mort
    // de quoi). L'inventaire est le même partout pour que l'onglet Inventaire
    // reste comparable d'un état à l'autre.
    const metaFor = (key: StateKey, tour: number): Record<string, unknown> => {
      // Prison : on ouvre AUSSI le parloir du Geôlier (parloir_open_cycle = tour)
      // pour visualiser le cadre chat actif + la notif de l'onglet Prison.
      if (key === "prison")
        return {
          inventory: PREVIEW_INVENTORY,
          imprisoned_since_cycle: tour,
          parloir_open_cycle: tour,
        };
      if (key === "dead")
        return {
          inventory: PREVIEW_INVENTORY,
          death_cycle: tour,
          death_phase: "annonce",
          death_reason: "Retrouvée au petit matin — aucune trace de l'arme.",
          testament: "Cherchez du côté de la bibliothèque.",
        };
      return { inventory: PREVIEW_INVENTORY };
    };

    return STATES.map((s) => {
      const game = baseGame({
        current_phase: phase,
        phase_started_at: new Date(serverNow() - introMsFor(phase) - 1000).toISOString(),
      });
      const roster = buildRoster(game, roles);
      const base = roster.byPseudo(BASE_PSEUDO);
      const me = {
        ...base,
        is_alive: s.key !== "dead",
        is_imprisoned: s.key === "prison",
        role_meta: {
          ...((base.role_meta ?? {}) as Record<string, unknown>),
          ...metaFor(s.key, game.current_tour),
        },
      } as PlayerRow;
      // Le roster vu par CE téléphone reflète l'état du joueur incarné (sinon la
      // liste des joueurs le montrerait vivant alors qu'il est mort).
      const players = roster.players.map((p) => (p.id === me.id ? me : p));
      const role = me.role_slug ? (roles.get(me.role_slug) ?? null) : null;
      // Pendant le rendu du parent, donc AVANT que les effets du shell enfant ne
      // lisent les « déjà vues ».
      markAnnouncementsSeen(game.id, me.id, players);
      return { ...s, game, me, players, role };
    });
  }, [roles, phase]);

  const myRole = phones[0]?.role ?? null;

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
        ) : (
          <>Chargement des rôles…</>
        )}
        <Link to="/dev" className="text-[11px] text-muted-foreground hover:text-gold">
          ← Galerie
        </Link>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      {/* Barre de contrôle — phase, onglet, zoom. Ces trois réglages s'appliquent
          aux TROIS téléphones à la fois : on compare toujours à contexte égal. */}
      <header className="border-b border-border bg-card/50 backdrop-blur shrink-0">
        <div className="px-4 h-12 flex items-center gap-3 border-b border-border/50">
          <Link to="/dev" className="text-sm text-muted-foreground hover:text-gold shrink-0">
            ← Galerie
          </Link>
          <span
            className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold shrink-0"
            style={{ fontFamily: "var(--font-display)" }}
          >
            State Lab
          </span>
          <span className="text-xs text-muted-foreground truncate">
            Vivant · Prison · Mort — même joueur ({BASE_PSEUDO}
            {myRole ? `, ${myRole.name_fr}` : ""}), seul l'état change
          </span>
        </div>

        <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
          <Segmented
            title="Phase"
            options={PHASES.map((p) => ({ key: p.key, label: p.label }))}
            value={phase}
            onChange={(k) => setPhase(k as GameRow["current_phase"])}
          />
          <Segmented
            title="Onglet"
            options={TABS.map((t) => ({ key: t.key, label: t.label }))}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
          />
          <Segmented
            title="Zoom"
            options={ZOOMS.map((z) => ({ key: String(z), label: `${Math.round(z * 100)}%` }))}
            value={String(zoom)}
            onChange={(k) => setZoom(Number(k))}
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-start justify-center gap-6 flex-wrap">
          {phones.map((p) => (
            <figure key={p.key} className="flex flex-col items-center gap-2.5 m-0">
              <figcaption className="flex flex-col items-center gap-1 text-center">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: p.accent, fontFamily: "var(--font-display)" }}
                >
                  <p.icon className="size-3.5" aria-hidden /> {p.label}
                </span>
                <span className="text-[10px] text-muted-foreground max-w-[220px] leading-snug">
                  {p.hint}
                </span>
              </figcaption>

              {/* Cadre téléphone à l'échelle 1 (390×844 = le viewport cible),
                  puis mis à l'échelle. Le wrapper porte les dimensions RÉDUITES
                  pour que la mise en page ne réserve pas la place du cadre plein
                  format. `transform` fait aussi du cadre le bloc conteneur des
                  `position:fixed` internes → les overlays restent confinés au
                  téléphone, comme dans la galerie. */}
              <div
                style={{ width: 390 * zoom, height: 844 * zoom }}
                className="shrink-0 overflow-hidden"
              >
                <div
                  style={{
                    width: 390,
                    height: 844,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                  className="bg-background overflow-hidden rounded-[40px] shadow-2xl border border-zinc-800 relative"
                >
                  <SceneBoundary key={`${p.key}-${phase}`}>
                    <PlayerShell
                      game={p.game as unknown as ShellGameRow}
                      me={p.me as unknown as ShellPlayerRow}
                      players={p.players as unknown as ShellPlayerRow[]}
                      embedded
                      disableHostDrivers
                      forcedTab={tab}
                      skipReveal
                    />
                  </SceneBoundary>
                </div>
              </div>
            </figure>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-gold">Vivant</strong> = manoir bordeaux (la DA de base) ·{" "}
          <strong className="text-gold">Prison</strong> = cellule de pierre froide + barreaux ·{" "}
          <strong className="text-gold">Mort</strong> = teal spectral + volutes d'âmes.
          <br />
          Partout : le sceau rouge du « Maintiens pour révéler » et les couleurs d'onglets restent
          intacts — l'état colore le monde, pas l'action. Barreaux et volutes sont dans le fond,
          sous le contenu.
        </p>
      </main>
    </div>
  );
}

function Segmented({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground shrink-0"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background/60 p-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
              value === o.key
                ? "bg-gold/20 text-gold ring-1 ring-gold/40"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Un téléphone qui plante affiche une carte d'erreur isolée au lieu de tuer la
// page — les deux autres restent comparables.
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
          <div className="text-sm font-semibold text-red-400">Cet état a planté</div>
          <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
