// PlayerShell — shell joueur unique, partagé entre /g/$code et /demo.
// Rend EXACTEMENT ce que voit un joueur sur son téléphone : header phase,
// O5 reveal, MJ dashboard, Vote plein écran, body avec tabs, overlay Méchants,
// menu d'aide, transition de Débat. Aucune logique spécifique à la démo.
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { tickPhase, beginGame } from "@/engine/actions";
import { defaultBotConfig, startBotDriver, stopBotDriver } from "@/engine/bots";
import { BOTS_ENABLED } from "@/lib/botsEnabled";
import type { GameRow, PlayerRow } from "@/lib/game";
import type { RoleRow } from "@/engine/actions";
import type { FrameContext } from "@/components/frames/registry";
import { phasePalette } from "@/lib/avatars";
import { playerState, stateTheme, type Atmosphere } from "@/lib/statePalette";
import { Check, Clock, Hourglass, Lock, Pause, Settings, Skull } from "lucide-react";
import {
  AnnoncesIcon,
  CapaciteIcon,
  InventaireIcon,
  SuspicionsIcon,
  TestamentIcon,
} from "@/components/icons/tabIcons";
import { BrandHeader } from "@/components/BrandHeader";
import { StatusBandeau } from "@/components/StatusBandeau";
import { useServerTimeOffset, serverNow } from "@/lib/serverTime";
import { usePhaseDriver } from "@/lib/phaseDriver";
import { VOTE_RESULT_S, introSFor, introMsFor } from "@/lib/phaseTiming";
import { KillerTargetBanner } from "@/components/KillerTargetBanner";
import { HoldToReveal } from "@/components/HoldToReveal";
import { Sigil } from "@/components/Sigil";

import { P1Garde } from "@/components/frames/screens/P1Garde";
import { PA2Capability as P6Capability } from "@/components/frames/screens/PA2Capability";
import { PA3Suspicions as P4Suspicions } from "@/components/frames/screens/PA3Suspicions";
import { PA4Notebook as P3Journal } from "@/components/frames/screens/PA4Notebook";
import { P15Testament } from "@/components/frames/screens/P15Testament";
import { PA6Announces, useAnnouncementsUnread } from "@/components/frames/screens/PA6Announces";
import { readInventory } from "@/engine/items";
import { vibrate, VIBES } from "@/lib/vibrate";

import { P11HelpMenu } from "@/components/frames/screens/P11HelpMenu";
import { V1Vote as P7Vote } from "@/components/frames/screens/V1Vote";
import { V1VoteSuspicion } from "@/components/frames/screens/V1VoteSuspicion";
import { P1Prison as P13Prison } from "@/components/frames/screens/P1Prison";
import { C1Council as P14Council } from "@/components/frames/screens/C1Council";
// CH1LoupsChat retiré du shell : le chat Méchants vit dans l'onglet Capacité (PA2).
import { GM1Dashboard as M1Dashboard } from "@/components/frames/screens/GM1Dashboard";
import { E1EndGame } from "@/components/frames/screens/E1EndGame";
import {
  T1Transition,
  T2VoteIntro,
  VoteOutro,
  FreeEntry,
  AnnonceScreen,
} from "@/components/frames/screens/T1Transition";
import { O5Reveal } from "@/components/frames/screens/O5Reveal";
import { PlayerEventModal } from "@/components/PlayerEventModal";
import { DiceDuelModal } from "@/components/DiceDuelModal";

type Tab = "journal" | "suspicions" | "cemetery" | "capacity" | "testament";

function hasPostMortemAction(role: RoleRow | null): boolean {
  if (!role) return false;
  if (role.phase_activation === "MORT") return true;
  return ["vengeur"].includes(role.slug);
}

export interface PlayerShellProps {
  game: GameRow;
  me: PlayerRow;
  players: PlayerRow[];
  /** En démo on est dans une frame iPhone, pas dans le viewport global. */
  embedded?: boolean;
  /** Désactive le bot driver / tickPhase auto (la démo a déjà les siens). */
  disableHostDrivers?: boolean;
  /** Tab forcé depuis l'extérieur (sélecteur démo). */
  forcedTab?: Tab;
  /** Notifie l'extérieur quand l'onglet change (sync sélecteur démo). */
  onTabChange?: (t: Tab) => void;
  /** Skip l'écran O5 reveal (utile pour la démo qui zappe entre joueurs). */
  skipReveal?: boolean;
}

export function PlayerShell({
  game,
  me,
  players,
  embedded = false,
  disableHostDrivers = false,
  forcedTab,
  onTabChange,
  skipReveal = false,
}: PlayerShellProps) {
  const [roles, setRoles] = useState<Map<string, RoleRow>>(new Map());
  const [tab, setTabState] = useState<Tab>("capacity");
  const [unread, setUnread] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [voteOverlayClosed, setVoteOverlayClosed] = useState(false);

  // Handlers du menu Paramètres : disponibles uniquement hors démo.
  // NB : le piège du bouton retour (plus bas) empile des entrées d'historique
  // via `pushState`, ce qui désynchronise l'index interne de TanStack Router et
  // fait avaler un `navigate({ to: "/" })` (seul `setHelpOpen(false)` reste
  // visible). Comme quitter/sortir est une sortie franche, on force une vraie
  // navigation plein-écran : elle contourne l'historique corrompu et démonte
  // proprement tous les abonnements temps réel de la partie.
  const handleLeave = embedded
    ? undefined
    : () => {
        setHelpOpen(false);
        window.location.assign("/");
      };
  const handleQuit = embedded
    ? undefined
    : () => {
        if (
          !confirm(
            "Quitter définitivement la partie ? Tu ne pourras pas la reprendre automatiquement.",
          )
        )
          return;
        try {
          window.localStorage.removeItem("mp_last_game");
        } catch {
          /* noop */
        }
        setHelpOpen(false);
        window.location.assign("/");
      };

  const setTab = (t: Tab) => {
    setTabState(t);
    onTabChange?.(t);
  };
  const tabRef = useRef<Tab>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  // Miroir de `helpOpen` pour que le piège du bouton retour lise l'état courant
  // sans avoir `helpOpen` dans ses dépendances (sinon l'effet se ré-exécute à
  // chaque ouverture/fermeture des Paramètres et ré-empile des sentinelles).
  const helpOpenRef = useRef(helpOpen);
  useEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);

  // ─── Piège du bouton retour (Android / iOS) ───
  // Tant qu'on est en partie, le retour système ne doit JAMAIS faire quitter
  // la partie — même après plusieurs pressions consécutives. Invariant : on
  // garde EXACTEMENT une sentinelle au sommet de l'historique. On en pousse une
  // au montage, et à chaque popstate (= un retour l'a dépilée) on en re-pousse
  // une seule. Si l'aide est ouverte → on la ferme. Sinon → on bascule sur
  // l'onglet « Annonces » (= cemetery). On reste piégé indéfiniment.
  // NB : `helpOpen` est lu via `helpOpenRef` pour ne pas figurer dans les deps
  // (sinon l'effet se ré-exécute et ré-empile à chaque toggle des Paramètres).
  useEffect(() => {
    if (embedded) return;
    if (game.status !== "in_progress" && game.status !== "awaiting_players") return;
    if (typeof window === "undefined") return;
    const pushTrap = () => {
      try {
        window.history.pushState({ __mpGameTrap: true }, "");
      } catch {
        /* noop */
      }
    };
    pushTrap();
    const onPop = () => {
      // Re-pousse aussitôt l'unique sentinelle dépilée par le retour.
      pushTrap();
      if (helpOpenRef.current) {
        setHelpOpen(false);
        return;
      }
      if (tabRef.current !== "cemetery") {
        setTab("cemetery");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, game.status]);

  // Pilote élu de la partie (avancement des phases + bots). Élection déterministe
  // parmi les clients présents (cf. usePhaseDriver) : un seul pilote à la fois,
  // bascule automatique si le pilote se déconnecte. En démo, le pilotage est géré
  // par la route elle-même → on désactive l'élection ici (disableHostDrivers).
  const isDriver = usePhaseDriver(game.id, me.id, !disableHostDrivers);

  // Sync de démarrage : on attend que tous les humains vivants aient cliqué
  // « Entrer dans la partie » (revealed_at). Les bots sont considérés prêts.
  const { pendingReveals, totalToReveal, totalPlayers } = useMemo(() => {
    let pending = 0;
    let total = 0; // humains uniquement (ce qui gèle/débloque le démarrage)
    let everyone = 0; // tous les joueurs vivants, bots inclus → pour l'affichage « N/total »
    for (const p of players) {
      if (p.is_mj || !p.is_alive) continue;
      everyone++;
      if (p.pseudo.startsWith("Bot ")) continue;
      total++;
      const revealed = (p.role_meta as Record<string, unknown> | null)?.revealed_at;
      if (!revealed) pending++;
    }
    return { pendingReveals: pending, totalToReveal: total, totalPlayers: everyone };
  }, [players]);
  // Salle d'attente : état de PREMIER NIVEAU (statut dédié), plus un drapeau
  // composite bricolé par-dessus la phase Enquête. Tant qu'on y est, aucun
  // chrono n'est armé (`phase_started_at` reste nul côté serveur).
  const waitingStart = game.status === "awaiting_players";

  // Dès que tout le monde est entré, on arme la partie. Bascule ATOMIQUE côté
  // serveur (garde `status = awaiting_players`) : n'importe quel client mounté
  // peut la déclencher, un seul l'emporte — plus de dépendance à l'host, plus de
  // temps grignoté pendant l'attente. Le chrono d'Enquête part à cet instant.
  const armingRef = useRef(false);
  useEffect(() => {
    if (game.status !== "awaiting_players") return;
    if (pendingReveals > 0) return;
    if (armingRef.current) return;
    armingRef.current = true;
    void beginGame(game.id);
  }, [game.status, pendingReveals, game.id]);

  // Auto-tick + bot driver — pilotés par le PILOTE ÉLU (plus l'host en dur),
  // sauf en démo (route dédiée). En Mode MJ, AUCUN avancement automatique : le MJ
  // déclenche chaque phase à la main. Le tick auto ne vaut qu'en Mode Joueur Only.
  const autoAdvance = game.mode_detective_player;

  // Avancement des phases — piloté par TOUT client au premier plan (plus de
  // pilote unique élu qui gelait la partie quand son téléphone dormait). Le
  // verrou SERVEUR (claim_phase_tick, cf. tickPhase) garantit qu'un seul client
  // exécute réellement la transition, donc plusieurs déclencheurs sont sans
  // danger. On programme un réveil calé PILE sur la frontière (INTRO + durée
  // [+ résultat pour le Vote]) lu sur l'horloge serveur, doublé d'un intervalle
  // de sécurité. Un client en arrière-plan a ses timers suspendus : on ne
  // planifie donc rien pour lui et on RATTRAPE au réveil (visibilitychange).
  useEffect(() => {
    if (disableHostDrivers) return;
    if (!autoAdvance) return;
    if (waitingStart) return;
    if (game.status !== "in_progress" || game.paused) return;
    if (!game.phase_started_at || !game.phase_duration_s) return;

    const started = new Date(game.phase_started_at).getTime();
    // Frontières à franchir, en secondes depuis phase_started_at. Le Vote en a
    // DEUX : la fin de la fenêtre de vote (INTRO + durée → closeVote + verdict)
    // PUIS la fin de l'écran de résultat (+ VOTE_RESULT_S → tour suivant). Sans le
    // 1er réveil, closeVote n'était déclenché que par le sondage de sécurité (≤3 s
    // de retard) → l'écran de résultat restait « à 0 » sans verdict un instant.
    const endS = introSFor(game.current_phase) + game.phase_duration_s;
    const boundariesS = game.current_phase === "vote" ? [endS, endS + VOTE_RESULT_S] : [endS];

    let boundaryTimers: ReturnType<typeof setTimeout>[] = [];
    const scheduleBoundaries = () => {
      boundaryTimers.forEach(clearTimeout);
      boundaryTimers = boundariesS.map((bS) => {
        // +200 ms de coussin pour que la frontière soit franchie côté serveur.
        const delay = Math.max(0, started + bS * 1000 - serverNow()) + 200;
        return setTimeout(() => void tickPhase(game.id), delay);
      });
    };

    scheduleBoundaries();
    // Filet de sécurité : re-tente au cas où un réveil calé rate. On ne sonde la
    // base QUE si la frontière est réellement franchie — le test se fait ici, en
    // mémoire, sur des valeurs qu'on a déjà (`started`/`boundariesS` viennent du
    // Realtime, cf. deps). Sans ce garde, chaque client appelait tickPhase toutes
    // les 3 s pendant TOUTE la phase, et chaque appel coûtait un SELECT `games`
    // pour s'entendre répondre « pas encore » (≈940 k requêtes en 12 j).
    const safety = setInterval(() => {
      if (serverNow() >= started + boundariesS[0] * 1000) void tickPhase(game.id);
    }, 3000);
    // Au retour de veille / bascule d'onglet : les timers ont pu être gelés — on
    // ré-arme les frontières et on rattrape immédiatement.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleBoundaries();
        void tickPhase(game.id);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      boundaryTimers.forEach(clearTimeout);
      clearInterval(safety);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [
    disableHostDrivers,
    autoAdvance,
    waitingStart,
    game.status,
    game.paused,
    game.current_phase,
    game.phase_started_at,
    game.phase_duration_s,
    game.id,
  ]);

  useEffect(() => {
    // Bots hors `vite dev` : rien à piloter (cf. lib/botsEnabled).
    if (!BOTS_ENABLED) return;
    if (disableHostDrivers || !isDriver) return;
    if (game.status !== "in_progress") return;
    if (waitingStart) return;
    const d = startBotDriver({
      gameId: game.id,
      getConfig: () => defaultBotConfig,
      embodiedPlayerId: () => me.id,
    });
    return () => {
      d?.stop();
      stopBotDriver();
    };
  }, [disableHostDrivers, isDriver, game.status, game.id, me.id, waitingStart]);

  // `roles` est une table de RÉFÉRENCE quasi statique (44 lignes, modifiées
  // uniquement par migration) : un chargement au montage suffit. Il y avait ici
  // un canal Realtime `roles-live` — mais `roles` n'est pas dans la publication
  // `supabase_realtime`, donc il ne s'est JAMAIS déclenché : un canal WebSocket
  // par client, pour rien. Personne ne réécrit un texte de rôle pendant une
  // partie ; le cas échéant, un rechargement de page suffit.
  useEffect(() => {
    async function loadRoles() {
      const { data } = await supabase.from("roles").select().eq("set_id", "set1");
      const m = new Map<string, RoleRow>();
      for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
      setRoles(m);
    }
    void loadRoles();
  }, []);

  useEffect(() => {
    if (skipReveal) {
      setShowReveal(false);
      return;
    }
    if (!me.role_slug) return;
    const meta = me.role_meta as Record<string, unknown>;
    if (!meta?.revealed_at) setShowReveal(true);
  }, [me.role_slug, me.role_meta, skipReveal]);

  useEffect(() => {
    if (game.current_phase === "vote") setVoteOverlayClosed(false);
  }, [game.current_phase, game.current_tour]);

  useEffect(() => {
    const ff = game.forced_frame;
    if (
      ff === "capacity" ||
      ff === "journal" ||
      ff === "suspicions" ||
      ff === "cemetery" ||
      ff === "testament"
    ) {
      setTab(ff as Tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.forced_frame]);

  useEffect(() => {
    if (forcedTab) setTabState(forcedTab);
  }, [forcedTab]);

  // À CHAQUE début de phase, on ramène les joueurs VIVANTS sur l'onglet
  // « Annonces » (cemetery) : l'annonce est le point central de l'app, on la
  // veut sous les yeux dès la nouvelle phase. `phase_started_at` est LE signal
  // canonique d'un changement de phase (mis à jour à chaque transition serveur).
  // Le basculement se produit DERRIÈRE les écrans plein-écran de transition /
  // vote / annonce (qui priment) → aucun saut d'onglet brusque n'est visible.
  // On ne touche pas aux morts (layout Conseil différent), ni pendant l'attente
  // du départ, ni en démo (l'onglet y est piloté par le sélecteur via forcedTab).
  useEffect(() => {
    if (forcedTab) return;
    if (waitingStart) return;
    if (!me.is_alive) return;
    setTab("cemetery");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase_started_at]);

  // Badge Inventaire = nombre d'objets non consommés dans l'inventaire du joueur.
  useEffect(() => {
    const meta = (me.role_meta ?? {}) as Record<string, unknown>;
    const inv = (meta.inventory as Array<{ consumed?: boolean }> | undefined) ?? [];
    const count = inv.filter((it) => !it.consumed).length;
    setUnread(count);
  }, [me.role_meta]);

  // Badge Capacité : ✓ verte si utilisée ce tour, ● orange sinon (rôles actifs uniquement).
  const [capacityUsedThisTour, setCapacityUsedThisTour] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data } = await supabase
        .from("role_actions")
        .select("id")
        .eq("game_id", game.id)
        .eq("actor_player_id", me.id)
        .eq("tour", game.current_tour)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setCapacityUsedThisTour(!!data);
    }
    void check();
    const ch = supabase
      .channel(`cap-used-${me.id}-${game.current_tour}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_actions",
          filter: `actor_player_id=eq.${me.id}`,
        },
        () => void check(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [game.id, me.id, game.current_tour]);

  // Badge « Annonces » (pastille sur l'onglet). Les toasts volants d'annonce ont
  // été SUPPRIMÉS (audit 2026-07-19) : tout ce qu'ils montraient vit déjà dans
  // l'onglet Annonces, sur lequel chaque début de phase ramène le joueur — le
  // badge suffit comme rappel persistant.
  const announcesUnread = useAnnouncementsUnread(game.id, me.id, players);

  // Vibration quand un NOUVEL objet arrive dans l'inventaire (le toast volant a
  // été remplacé par la pastille rouge de l'onglet Inventaire + ce retour
  // haptique). Le kit de départ (révélation / attente) est marqué vu en silence.
  const seenItemsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const inv = readInventory(me.role_meta as Record<string, unknown> | null);
    const ids = new Set(inv.map((i) => i.id));
    const prev = seenItemsRef.current;
    seenItemsRef.current = ids;
    if (prev === null) return; // montage : rien de « nouveau »
    if (showReveal || waitingStart) return;
    for (const id of ids) {
      if (!prev.has(id)) {
        vibrate(VIBES.item);
        return;
      }
    }
  }, [me.role_meta, showReveal, waitingStart]);

  const myRole = me.role_slug ? (roles.get(me.role_slug) ?? null) : null;

  // Vibration au début de chaque Enquête si le joueur a une capacité ACTIVE à
  // jouer (même condition que le point « usable » de l'onglet Capacité). On ne
  // vibre que sur une vraie TRANSITION de phase — pas au montage/reload, sinon
  // chaque retour dans l'app en pleine Enquête revibrerait.
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.current_phase;
    if (prev === null || prev === game.current_phase) return;
    if (game.current_phase !== "free") return;
    if (waitingStart || !me.is_alive || me.is_imprisoned) return;
    if (!myRole || (myRole.target_mode ?? "single") === "none") return;
    vibrate(VIBES.capacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.current_phase]);
  const ctx = useMemo(
    () => ({ game, me, myRole, players, roles, gameId: game.id }) as unknown as FrameContext,
    [game, me, myRole, players, roles],
  );
  const isLoup = myRole?.faction === "Méchant";
  const isJour = game.current_phase === "free";
  const isAnnonce = game.current_phase === "annonce";
  const isDebat = game.current_phase === "gathering";
  const isVote = game.current_phase === "vote";

  // Wrapper inline — NE PAS définir comme composant local, sinon React voit
  // un nouveau type à chaque render et démonte tout le sous-arbre (ferme le
  // clavier en plein milieu d'un testament, perd le focus des inputs, etc.).
  const rootClass = `${embedded ? "h-full" : "h-dvh"} flex flex-col bg-background relative overflow-hidden isolate`;

  // Colorimétrie d'ÉTAT (vivant / prison / mort). `theme.vars` redéfinit des
  // tokens CSS sur cette racine ; tout ce qui est dessous (en-tête, bandeau de
  // statuts, fonds d'onglets, barre du bas) suit sans le savoir. Vivant = DA
  // principale, donc `vars` est vide et rien ne change. Cf. lib/statePalette.
  const theme = stateTheme(playerState(me));
  // Le décor d'état (barreaux / volutes) est peint UNE SEULE FOIS, dans le fond
  // de la racine — donc derrière tout le contenu, à position/échelle/teinte
  // identiques sur tous les onglets. Le liège des onglets, opaque, masquerait ce
  // fond : `data-cork="off"` (posé sur les racines quand `theme.corkOff`)
  // l'efface entièrement. Les propriétés vont ENSEMBLE : sans `size`/`repeat` la
  // texture se carrellerait à sa taille native, sans `position` elle resterait
  // collée en haut à gauche.
  const rootStyle = {
    ...theme.vars,
    backgroundImage: "var(--surface-pattern, none)",
    backgroundSize: "var(--surface-size, auto)",
    backgroundPosition: "var(--surface-position, 0 0)",
    backgroundRepeat: "var(--surface-repeat, repeat)",
    backgroundBlendMode: "var(--surface-blend, normal)",
  };

  if (game.status === "ended") {
    return (
      <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
        {embedded ? null : <BrandHeader subtitle="Partie terminée" />}
        <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
          <E1EndGame {...ctx} />
        </div>
      </div>
    );
  }

  // Révélation + attente réunies sur UN SEUL écran (la fiche de rôle) : plus de
  // « Salle d'attente » séparée. Un joueur qui n'a pas encore validé voit le
  // décompte + sa fiche ; après validation (ou s'il a déjà validé, ex. reload) il
  // reste sur la fiche en mode « En attente des autres… » jusqu'au démarrage réel
  // (statut ≠ awaiting_players), puis enchaîne directement sur la 1ʳᵉ transition.
  if ((showReveal || waitingStart) && myRole && !embedded) {
    const alreadyAck = !showReveal && waitingStart;
    return (
      <O5Reveal
        player={me}
        role={myRole}
        onDone={() => setShowReveal(false)}
        skipCountdown={alreadyAck}
        alreadyAck={alreadyAck}
        readyCount={Math.max(0, totalPlayers - pendingReveals)}
        total={totalPlayers}
        helpCtx={ctx}
      />
    );
  }

  const PhaseIntros = waitingStart ? null : (
    <>
      {isDebat && <T1Transition {...ctx} />}
      {isVote && <T2VoteIntro {...ctx} />}
      {isVote && <VoteOutro {...ctx} />}
      {isJour && <FreeEntry {...ctx} />}
    </>
  );

  // Modal centrée pour les événements perso (mort, prison, exécution,
  // libération, morsure) + duel de dés du Parieur tricheur. Chaque composant
  // gère son rendu en portal au-dessus de tout, et se diffère pendant les
  // frames de transition.
  const EventModal = (
    <>
      <PlayerEventModal
        game={game}
        me={me}
        players={players}
        roles={roles}
        onGoPrison={() => setTab("capacity")}
      />
      <DiceDuelModal game={game} me={me} players={players} />
    </>
  );

  const headerProps = {
    game,
    onHelp: () => setHelpOpen(true),
    waitingCount: pendingReveals,
    waitingTotal: totalToReveal,
    stateWash: theme.wash,
    stateAccent: theme.accent,
  };

  // ── Attente du départ (cas SANS fiche de rôle) ────────────────────────────
  // Les JOUEURS patientent désormais sur leur fiche de rôle (écran de révélation
  // en mode « En attente des autres… », géré plus haut) — il n'y a plus de
  // « Salle d'attente » séparée. Ce garde-fou ne concerne que les cas sans fiche
  // (MJ, ou rôle pas encore chargé) : on évite d'afficher le jeu en direct avant
  // que la partie ne soit réellement lancée (le chrono n'est pas armé). En démo
  // (`embedded`) la bascule est instantanée, on garde le shell.
  if (waitingStart && !embedded) {
    return (
      <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
        <ShellHeader {...headerProps} />
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-4 px-5 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
            <span
              className="absolute inset-0 rounded-full border border-gold/30 animate-ping"
              aria-hidden
            />
            <Hourglass className="size-7 text-gold" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            La partie commence dès que tout le monde est entré.
          </p>
        </div>
        {helpOpen && (
          <P11HelpMenu
            ctx={ctx}
            onClose={() => setHelpOpen(false)}
            onLeave={handleLeave}
            onQuit={handleQuit}
          />
        )}
      </div>
    );
  }

  const isMjView = me.is_mj && !game.mode_detective_player;
  if (isMjView) {
    return (
      <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
        <ShellHeader {...headerProps} />
        <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
          <M1Dashboard {...ctx} />
        </div>
        {helpOpen && (
          <P11HelpMenu
            ctx={ctx}
            onClose={() => setHelpOpen(false)}
            onLeave={handleLeave}
            onQuit={handleQuit}
          />
        )}
        {PhaseIntros}
        {EventModal}
      </div>
    );
  }

  if (isAnnonce) {
    return (
      <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
        <ShellHeader {...headerProps} />
        <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
          <AnnonceScreen {...ctx} />
        </div>
        {helpOpen && (
          <P11HelpMenu
            ctx={ctx}
            onClose={() => setHelpOpen(false)}
            onLeave={handleLeave}
            onQuit={handleQuit}
          />
        )}
        {EventModal}
      </div>
    );
  }

  if (isVote && me.is_alive && !me.is_imprisoned && !voteOverlayClosed) {
    const isSuspicionVariant =
      (game as unknown as { variant?: string | null }).variant === "suspicion";
    return (
      <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
        <ShellHeader {...headerProps} />
        <div className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
          {isSuspicionVariant ? <V1VoteSuspicion {...ctx} /> : <P7Vote {...ctx} />}
        </div>
        {helpOpen && (
          <P11HelpMenu
            ctx={ctx}
            onClose={() => setHelpOpen(false)}
            onLeave={handleLeave}
            onQuit={handleQuit}
          />
        )}
        {PhaseIntros}
        {EventModal}
      </div>
    );
  }

  const renderBody = () => {
    if (!me.is_alive) {
      // Onglet "Conseil" (anciennement testament) → C1Council ; Capacité reste accessible
      // pour consulter l'historique des infos récoltées (mode lecture seule).
      if (tab === "testament") return <P14Council {...ctx} />;
      if (tab === "capacity")
        return (
          <HoldToReveal>
            <P6Capability {...ctx} />
          </HoldToReveal>
        );
      if (tab === "cemetery") return <PA6Announces {...ctx} />;
      if (tab === "journal") return <P3Journal {...ctx} />;
      if (tab === "suspicions") return <P4Suspicions {...ctx} />;
      return <P14Council {...ctx} />;
    }
    if (me.is_imprisoned) {
      if (tab === "capacity")
        return (
          <HoldToReveal label="Prison" subtitle="registre d'écrou">
            <P13Prison {...ctx} />
          </HoldToReveal>
        );
      if (tab === "cemetery") return <PA6Announces {...ctx} />;
      if (tab === "journal") return <P3Journal {...ctx} />;
      if (tab === "suspicions") return <P4Suspicions {...ctx} />;
      if (tab === "testament") return <P15Testament {...ctx} />;
    }
    if (tab === "capacity")
      return (
        <HoldToReveal>
          <P6Capability {...ctx} />
        </HoldToReveal>
      );
    if (tab === "journal") return <P3Journal {...ctx} />;
    if (tab === "suspicions") return <P4Suspicions {...ctx} />;
    if (tab === "cemetery") return <PA6Announces {...ctx} />;
    if (tab === "testament") return <P15Testament {...ctx} />;
    return <P1Garde {...ctx} />;
  };

  // Pour les morts, l'onglet "testament" est réutilisé comme bouton "Conseil" (icône 💀).

  // Couleur d'accent par onglet — source UNIQUE consommée par le trait actif (qui
  // glisse) ET par chaque TabBtn, pour qu'ils restent toujours synchrones.
  const TAB_ORDER: Tab[] = ["journal", "suspicions", "cemetery", "testament", "capacity"];
  const tabAccent = (t: Tab): string => {
    if (t === "journal") return "oklch(0.78 0.15 55)"; // Inventaire — ambre chaud
    if (t === "suspicions") return "var(--destructive)"; // Suspicions — rouge
    if (t === "cemetery") return "var(--citoyens)"; // Annonces — bleu
    if (t === "testament") return me.is_alive ? "oklch(0.74 0.15 300)" : "var(--success)"; // Testament violet / Conseil vert
    return "var(--primary)"; // Capacité — or
  };
  const activeAccent = tabAccent(tab);

  return (
    <div className={rootClass} style={rootStyle} data-cork={theme.corkOff ? "off" : undefined}>
      <AmbientTint phase={game.current_phase} stateWash={theme.wash} />
      <ShellHeader {...headerProps} />
      <StatusBandeau me={me} tour={game.current_tour} players={players} />
      {isLoup && me.is_alive && <KillerTargetBanner game={game} players={players} />}

      {/* L'atmosphère est confinée au CORPS — pas au chrome. En couvrant toute la
          racine, son gel de lumière passait au-dessus de l'en-tête (z-20), du
          bandeau de statuts et de la barre d'onglets : les tampons de phase et
          les badges se retrouvaient lavés par la lampe et ne ressortaient plus.
          La lumière appartient au décor ; les contrôles n'en font pas partie. */}
      <div className="relative flex-1 min-h-0 flex flex-col isolate">
        <div
          key={tab}
          className="anim-tab-in flex-1 min-h-0 max-w-md mx-auto w-full overflow-y-auto overscroll-contain"
        >
          {renderBody()}
        </div>
        <StateAtmosphere atmosphere={theme.atmosphere} />
      </div>

      <nav
        aria-label="Navigation du joueur"
        className="relative border-t border-border bg-card/95 backdrop-blur grid grid-cols-5 max-w-md mx-auto w-full pb-[max(0.25rem,var(--safe-bottom))] select-none"
      >
        {/* Indicateur actif unique qui glisse entre les onglets. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-0.5 w-1/5 flex justify-center transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${TAB_ORDER.indexOf(tab) * 100}%)` }}
        >
          <span
            className="h-0.5 w-8 rounded-full transition-colors duration-300"
            style={{
              background: activeAccent,
              boxShadow: `0 0 10px 2px color-mix(in oklab, ${activeAccent} 55%, transparent)`,
            }}
          />
        </span>
        <TabBtn
          active={tab === "journal"}
          onClick={() => setTab("journal")}
          icon={<InventaireIcon className="size-7" />}
          label="Inventaire"
          accent={tabAccent("journal")}
          badge={unread}
        />
        <TabBtn
          active={tab === "suspicions"}
          onClick={() => setTab("suspicions")}
          icon={<SuspicionsIcon className="size-7" />}
          label="Suspicions"
          accent={tabAccent("suspicions")}
        />
        <TabBtn
          active={tab === "cemetery"}
          onClick={() => setTab("cemetery")}
          icon={<AnnoncesIcon className="size-7" />}
          label="Annonces"
          accent={tabAccent("cemetery")}
          badge={announcesUnread}
        />
        {me.is_alive ? (
          <TabBtn
            active={tab === "testament"}
            onClick={() => setTab("testament")}
            icon={<TestamentIcon className="size-7" />}
            label="Testament"
            accent={tabAccent("testament")}
          />
        ) : (
          <TabBtn
            active={tab === "testament"}
            onClick={() => setTab("testament")}
            icon={<Skull className="size-7" />}
            label="Conseil"
            accent={tabAccent("testament")}
          />
        )}
        <TabBtn
          active={tab === "capacity"}
          onClick={() => setTab("capacity")}
          icon={
            me.is_alive && me.is_imprisoned ? (
              <Lock className="size-7" />
            ) : (
              <CapaciteIcon className="size-7" />
            )
          }
          accent={tabAccent("capacity")}
          label={!me.is_alive ? "Capacité" : me.is_imprisoned ? "Prison" : "Capacité"}
          shimmer={isJour && me.is_alive && !me.is_imprisoned}
          dim={!me.is_alive && !hasPostMortemAction(myRole)}
          statusDot={
            // Prisonnier : notif ambre quand le Geôlier lui ouvre le parloir.
            me.is_alive &&
            me.is_imprisoned &&
            (me.role_meta as Record<string, unknown> | null)?.parloir_open_cycle ===
              game.current_tour
              ? "notif"
              : me.is_alive &&
                  !me.is_imprisoned &&
                  myRole &&
                  (myRole.target_mode ?? "single") !== "none"
                ? capacityUsedThisTour
                  ? "done"
                  : isJour
                    ? "usable"
                    : "waiting"
                : null
          }
        />
      </nav>

      {helpOpen && (
        <P11HelpMenu
          ctx={ctx}
          onClose={() => setHelpOpen(false)}
          onLeave={handleLeave}
          onQuit={handleQuit}
        />
      )}
      {PhaseIntros}
      {EventModal}
    </div>
  );
}

// Calque d'ambiance derrière le contenu : une teinte douce qui change selon
// la phase (Enquête = chaud doré, Débat = violet nuit, vote = rouge tension).
//
// `stateWash` (prison / mort) PRIME sur la phase : l'état doit primer sur le
// moment de la partie. On ne perd pas la phase pour autant — le stepper de
// l'en-tête garde la couleur propre à chaque phase.
// Atmosphère d'état — uniquement de la LUMIÈRE et de l'OMBRE, jamais de la
// matière. Les barreaux et la brume sont peints dans le FOND des surfaces
// (`--surface-pattern`) : en avant-plan ils striaient le papier et lisaient
// comme de la saleté plutôt que comme un décor.
//
// Ces deux calques-ci restent devant parce que la lumière tombe bel et bien SUR
// le dossier qu'on tient, et parce que le liège des onglets est opaque (un
// calque derrière serait masqué dès qu'on ouvre un onglet).
//
// Sans manger la lisibilité :
//  · `light` est en `soft-light` — il éclaire les valeurs claires mais laisse
//    les noirs noirs, au lieu d'un voile qui aplatirait tout ;
//  · `vignette` est SOMBRE : elle augmente le contraste du texte crème.
// Tout est inerte au clic, et l'`isolate` de la racine confine le blend au shell.
function StateAtmosphere({ atmosphere }: { atmosphere: Atmosphere }) {
  const { light, fog, vignette } = atmosphere;
  if (!light && !fog && !vignette) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {light && (
        <div
          className="absolute inset-0"
          style={{ background: light, mixBlendMode: "soft-light" }}
        />
      )}
      {fog && <div className="absolute inset-0" style={{ background: fog }} />}
      {vignette && <div className="absolute inset-0" style={{ background: vignette }} />}
    </div>
  );
}

function AmbientTint({ phase, stateWash }: { phase: string; stateWash?: string | null }) {
  const wash = stateWash ?? phasePalette(phase).wash;
  const bg =
    wash === "transparent"
      ? "transparent"
      : `radial-gradient(ellipse 120% 70% at 50% 0%, ${wash}, transparent 65%)`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-700"
      style={{ background: bg }}
    />
  );
}

function ShellHeader({
  game,
  onHelp,
  waitingCount = 0,
  waitingTotal = 0,
  stateWash,
  stateAccent,
}: {
  game: GameRow;
  onHelp: () => void;
  waitingCount?: number;
  waitingTotal?: number;
  /** Prison / mort : prime sur la teinte de phase (cf. lib/statePalette). */
  stateWash?: string | null;
  stateAccent?: string | null;
}) {
  // Mode MJ : le MJ pilote les phases à la main → chrono qui MONTE (temps écoulé,
  // informatif), pas de compte à rebours qui déclenche la phase suivante.
  // Mode Joueur Only : compte à rebours classique (déclenche l'avancement auto).
  const isMjMode = !game.mode_detective_player;
  const startedRaw = game.phase_started_at ? new Date(game.phase_started_at).getTime() : null;
  const started = startedRaw ? startedRaw + introMsFor(game.current_phase) : null;
  const dur = game.phase_duration_s ?? 0;
  const isWaiting = waitingCount > 0;
  const timerActive =
    !!started && game.status !== "ended" && !isWaiting && !game.paused && (isMjMode || dur > 0);

  const offset = useServerTimeOffset();
  const [now, setNow] = useState(() => Date.now() + (typeof offset === "number" ? offset : 0));
  useEffect(() => {
    if (!timerActive) return; // ne fait PAS tourner setInterval inutilement
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [timerActive, offset]);

  // Valeur affichée : temps écoulé (Mode MJ) ou temps restant (Joueur Only).
  const elapsed = timerActive && started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
  const remaining =
    timerActive && started ? Math.max(0, Math.ceil((started + dur * 1000 - now) / 1000)) : 0;
  const displayedRemaining = timerActive ? Math.min(remaining, dur) : 0;
  const shown = isMjMode ? elapsed : displayedRemaining;
  const mm = Math.floor(shown / 60)
    .toString()
    .padStart(2, "0");
  const ss = (shown % 60).toString().padStart(2, "0");
  const showTimer = timerActive;
  const urgent = !isMjMode && displayedRemaining <= 10;
  const phasePal = phasePalette(game.current_phase);
  // L'état (prison / mort) prime sur la phase pour la teinte de fond et le
  // liseré. Le stepper plus bas garde, lui, la couleur propre à chaque phase :
  // on lit donc l'état ET le moment de la partie.
  const pal = {
    accent: stateAccent ?? phasePal.accent,
    wash: stateWash ?? phasePal.wash,
  };
  const ready = Math.max(0, waitingTotal - waitingCount);

  // Progression de la barre : Joueur Only = temps restant / durée (se vide) ;
  // Mode MJ = temps écoulé / repère (se remplit ; ambre si le repère est dépassé).
  const over = isMjMode && dur > 0 && elapsed > dur;
  const frac =
    !timerActive || dur <= 0
      ? 0
      : isMjMode
        ? Math.min(1, elapsed / dur)
        : Math.max(0, Math.min(1, displayedRemaining / dur));
  const fillColor = urgent ? "var(--destructive)" : over ? "var(--warning)" : pal.accent;

  // Stepper de phase — toujours droit, contenu fixe : ENQUÊTE · ANNONCE · DÉBAT · VOTE.
  const STEPS: { key: string; label: string }[] = [
    { key: "free", label: "Enquête" },
    { key: "annonce", label: "Annonce" },
    { key: "gathering", label: "Débat" },
    { key: "vote", label: "Vote" },
  ];

  return (
    <header
      className="border-b backdrop-blur sticky top-0 z-20 transition-colors"
      style={{
        // Wash de phase posé sur une base OPAQUE : empêche le contenu qui défile
        // de transparaître sous l'en-tête (sinon on voit un « rectangle » en haut).
        background: `linear-gradient(0deg, ${pal.wash}, ${pal.wash}), var(--background)`,
        borderColor: `color-mix(in oklab, ${pal.accent} 38%, transparent)`,
      }}
    >
      <div className="max-w-md mx-auto w-full pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-[calc(var(--safe-top)+0.5rem)] pb-2">
        {/* Ligne 1 — TOUR N (gauche) · chrono (droite) · paramètres */}
        <div className="flex items-center justify-between gap-2.5">
          <span
            className="font-bold uppercase text-foreground shrink-0"
            style={{ fontFamily: "var(--font-display)", fontSize: 15, letterSpacing: "0.14em" }}
          >
            Tour {game.current_tour}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {isWaiting ? (
              <span
                role="status"
                aria-live="polite"
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-amber-300"
              >
                <span
                  className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse"
                  aria-hidden
                />
                {ready}/{waitingTotal}
              </span>
            ) : game.paused ? (
              <span className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.16em] font-semibold text-amber-300">
                <Pause className="size-4" aria-hidden /> Pause
              </span>
            ) : showTimer ? (
              <span
                role="timer"
                aria-live="off"
                className={`font-bold tabular-nums leading-none flex items-center gap-1 ${urgent ? "text-destructive animate-pulse" : "text-foreground"}`}
                style={{ fontFamily: "var(--font-display)", fontSize: 24 }}
              >
                {isMjMode && <Clock className="size-4 opacity-50" aria-hidden />}
                {mm}:{ss}
              </span>
            ) : null}

            <button
              onClick={onHelp}
              className="press tap-target h-11 w-11 rounded-full bg-background/40 border border-border flex items-center justify-center text-muted-foreground hover:text-gold"
              aria-label="Paramètres"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>

        {/* Ligne 2 — stepper de phase : Enquête · Annonce · Débat · Vote */}
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((s) => {
            const active = game.current_phase === s.key;
            const acc = phasePalette(s.key).accent;
            return (
              <span
                key={s.key}
                className="flex-1 text-center rounded-md py-[3px] uppercase"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 8,
                  letterSpacing: "0.06em",
                  fontWeight: active ? 700 : 500,
                  background: active ? acc : "oklch(1 0 0 / 0.06)",
                  color: active ? "oklch(0.18 0.02 40)" : "var(--muted-foreground)",
                  boxShadow: active ? `0 0 14px -4px ${acc}` : "none",
                }}
              >
                {s.label}
              </span>
            );
          })}
        </div>

        {/* Ligne 3 — barre de progression de la phase (conservée ; cachée en attente / pause) */}
        {!isWaiting && !game.paused && (
          <div
            className="mt-1.5 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? "animate-pulse" : ""}`}
              style={{ width: `${Math.round(frac * 100)}%`, background: fillColor }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
  shimmer,
  dim,
  disabled,
  statusDot,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  accent?: string;
  badge?: number;
  shimmer?: boolean;
  dim?: boolean;
  disabled?: boolean;
  statusDot?: "done" | "usable" | "waiting" | "notif" | null;
}) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`relative pt-2.5 pb-2 flex flex-col items-center justify-center gap-0.5 text-[10px] uppercase tracking-wider transition touch-manipulation active:scale-[0.94] min-h-[60px] ${
        disabled
          ? "opacity-30"
          : active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
      } ${dim ? "opacity-50" : ""}`}
    >
      <Sigil
        active={active}
        size={38}
        accent={accent}
        className={`${active ? "-translate-y-0.5 scale-105" : ""} ${shimmer ? "animate-pulse" : ""}`}
      >
        {icon}
      </Sigil>
      <span
        className={`truncate font-medium transition-opacity ${active ? "opacity-100" : "opacity-80"}`}
        style={active && accent ? { color: accent } : undefined}
      >
        {label}
      </span>
      {badge && badge > 0 ? (
        <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {statusDot && !badge ? (
        <span
          className={`absolute top-1 right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-card ${
            statusDot === "usable" || statusDot === "notif" ? "animate-pulse" : ""
          }`}
          style={
            statusDot === "usable"
              ? { background: "var(--success)", color: "var(--success-foreground)" }
              : statusDot === "notif"
                ? { background: "oklch(0.70 0.19 45)", color: "oklch(0.16 0.03 40)" }
                : statusDot === "waiting"
                  ? { background: "oklch(0.72 0.17 55)", color: "oklch(0.20 0.03 40)" }
                  : { background: "var(--muted)", color: "var(--muted-foreground)" }
          }
          title={
            statusDot === "usable"
              ? "Capacité utilisable maintenant"
              : statusDot === "notif"
                ? "Le Geôlier t'ouvre le parloir"
                : statusDot === "waiting"
                  ? "Capacité dispo — pas ce tour"
                  : "Capacité utilisée ce tour"
          }
        >
          {statusDot === "done" ? (
            <Check className="size-3" strokeWidth={3} />
          ) : (
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
          )}
        </span>
      ) : null}
    </button>
  );
}
