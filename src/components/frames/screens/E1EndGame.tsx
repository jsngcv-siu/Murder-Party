import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import type { FrameContext } from "../registry";
import { evaluateWin, type WinResult } from "@/engine/winConditions";
import { supabase } from "@/integrations/supabase/client";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { RoleIcon } from "@/components/RoleIcon";
import type { PlayerRow, RoleRow } from "@/engine/actions";

gsap.registerPlugin(SplitText);

// Faction prophétisée par l'Oracle → label de la faction gagnante correspondante
const ORACLE_FACTION_TO_WINNER: Record<string, string> = {
  Civil: "Civil",
  Méchant: "Méchants",
  Neutre: "Neutres",
};

type WinnerGroup = { label: string; players: PlayerRow[]; tone: string };

// ─────────────────────────────────────────────────────────────────────────────
// Thèmes visuels par camp gagnant. Seules les COULEURS / l'ambiance lumineuse
// sont définies ici ; les visuels (emblème + particules) sont construits à partir
// des ICÔNES PNG des rôles du camp (et des rôles uniques) via emblemRolesFor().
// ─────────────────────────────────────────────────────────────────────────────
type Motion = "rise" | "fall" | "float";
type VictoryTheme = {
  title: string; // titre court affiché au-dessus de VICTOIRE
  accent: string; // couleur d'accent (oklch)
  accentSoft: string; // accent translucide
  titleColor: string; // couleur du mot VICTOIRE
  pageBg: string; // fond plein écran
  headerBg: string; // fond de l'en-tête
  motion: Motion;
  // Effets renforcés (optionnels) pour les ambiances les plus marquées :
  pulse?: "heartbeat" | "breathe"; // halo pulsant derrière l'emblème
  glow?: string; // couleur du halo pulsant
  vignette?: string; // teinte du vignettage sombre sur les bords
  particleCount?: number; // densité de particules (défaut 16)
};

const NEUTRAL_THEME: VictoryTheme = {
  title: "Partie terminée",
  accent: "oklch(0.78 0.16 75)",
  accentSoft: "oklch(0.78 0.16 75 / 0.14)",
  titleColor: "oklch(0.86 0.16 80)",
  pageBg: "radial-gradient(ellipse at top, oklch(0.20 0.05 40 / 0.7), oklch(0.12 0.02 35) 70%)",
  headerBg: "linear-gradient(to bottom, oklch(0.22 0.05 40 / 0.5), transparent)",
  motion: "float",
};

const THEMES: Record<string, VictoryTheme> = {
  Civil: {
    title: "Les Civils l'emportent",
    accent: "oklch(0.72 0.16 230)",
    accentSoft: "oklch(0.72 0.16 230 / 0.16)",
    titleColor: "oklch(0.82 0.14 230)",
    pageBg:
      "radial-gradient(ellipse at top, oklch(0.30 0.10 235 / 0.55), oklch(0.13 0.03 260) 70%)",
    headerBg: "linear-gradient(to bottom, oklch(0.34 0.12 235 / 0.45), transparent)",
    motion: "rise",
  },
  Méchants: {
    title: "Les Méchants triomphent",
    accent: "oklch(0.62 0.24 22)",
    accentSoft: "oklch(0.62 0.24 22 / 0.18)",
    titleColor: "oklch(0.70 0.23 24)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.32 0.16 20 / 0.6), oklch(0.10 0.03 18) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.34 0.18 20 / 0.55), transparent)",
    motion: "rise",
  },
  Vampires: {
    title: "Le clan des Vampires règne",
    // Rouge sang profond / bordeaux (hue ~4, froid et sombre) — nettement distinct
    // du rouge chaud orangé des Méchants (hue ~22) et du rose des Amoureux.
    accent: "oklch(0.50 0.23 4)",
    accentSoft: "oklch(0.50 0.23 4 / 0.22)",
    titleColor: "oklch(0.58 0.26 5)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.24 0.17 6 / 0.7), oklch(0.06 0.05 360) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.26 0.19 6 / 0.6), transparent)",
    motion: "fall",
    pulse: "heartbeat",
    glow: "oklch(0.48 0.26 6 / 0.6)",
    vignette: "oklch(0.05 0.06 2)",
    particleCount: 6,
  },
  Amoureux: {
    title: "Les Amoureux survivent ensemble",
    accent: "oklch(0.76 0.18 350)",
    accentSoft: "oklch(0.76 0.18 350 / 0.16)",
    titleColor: "oklch(0.82 0.16 350)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.34 0.14 350 / 0.5), oklch(0.13 0.04 340) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.36 0.16 350 / 0.45), transparent)",
    motion: "float",
  },
  Empoisonneur: {
    title: "L'Empoisonneur a tout corrompu",
    accent: "oklch(0.78 0.19 140)",
    accentSoft: "oklch(0.78 0.19 140 / 0.16)",
    titleColor: "oklch(0.84 0.19 140)",
    pageBg:
      "radial-gradient(ellipse at top, oklch(0.30 0.14 145 / 0.55), oklch(0.11 0.04 150) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.32 0.16 145 / 0.5), transparent)",
    motion: "rise",
  },
  "Veuve noire": {
    title: "La Veuve noire reste seule",
    accent: "oklch(0.64 0.18 300)",
    accentSoft: "oklch(0.64 0.18 300 / 0.18)",
    titleColor: "oklch(0.72 0.18 300)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.26 0.14 300 / 0.6), oklch(0.10 0.04 295) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.28 0.16 300 / 0.5), transparent)",
    motion: "fall",
  },
  "Parieur tricheur": {
    title: "Le Parieur a raflé la mise",
    accent: "oklch(0.82 0.17 88)",
    accentSoft: "oklch(0.82 0.17 88 / 0.18)",
    titleColor: "oklch(0.86 0.17 88)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.30 0.12 90 / 0.55), oklch(0.11 0.03 70) 72%)",
    headerBg: "linear-gradient(to bottom, oklch(0.33 0.14 88 / 0.5), transparent)",
    motion: "fall",
  },
  Conservateur: {
    title: "Le Conservateur garde le Manoir",
    accent: "oklch(0.80 0.15 70)",
    accentSoft: "oklch(0.80 0.15 70 / 0.16)",
    titleColor: "oklch(0.86 0.16 72)",
    pageBg: "radial-gradient(ellipse at top, oklch(0.24 0.10 55 / 0.7), oklch(0.06 0.03 38) 74%)",
    headerBg: "linear-gradient(to bottom, oklch(0.30 0.13 55 / 0.6), transparent)",
    motion: "float",
    pulse: "breathe",
    glow: "oklch(0.78 0.16 72 / 0.45)",
    vignette: "oklch(0.05 0.04 40)",
    particleCount: 20,
  },
};

function themeFor(winner: string): VictoryTheme {
  return THEMES[winner] ?? NEUTRAL_THEME;
}

// Icônes (rôles) qui incarnent le camp gagnant : rôles de la faction pour les
// victoires de faction, rôle unique pour les victoires solo. Sert à l'emblème
// central et au champ de particules.
function emblemRolesFor(winner: string, roles: Map<string, RoleRow>): RoleRow[] {
  const all = Array.from(roles.values());
  const ofFaction = (f: string) =>
    all.filter((r) => r.faction === f && !r.is_special && !r.emergent);
  const pick = (...slugs: string[]) =>
    slugs.map((s) => roles.get(s)).filter((r): r is RoleRow => !!r);

  switch (winner) {
    case "Civil":
      return ofFaction("Civil");
    case "Méchants":
      return ofFaction("Méchant");
    case "Vampires":
      return pick("vampire");
    case "Amoureux":
      return pick("entremetteur");
    case "Empoisonneur":
      return pick("empoisonneur");
    case "Veuve noire":
      return pick("veuve_noire");
    case "Parieur tricheur":
      return pick("parieur_tricheur");
    case "Conservateur":
      return pick("conservateur");
    case "Neutres":
      return ofFaction("Neutre");
    default: {
      const named = all.find((r) => r.name_fr === winner);
      return named ? [named] : [];
    }
  }
}

function computeGroups(
  winner: string,
  players: PlayerRow[],
  roles: Map<string, RoleRow>,
): { groups: WinnerGroup[]; tone: string } {
  const real = players.filter((p) => {
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    return !p.is_mj && m.immortal !== true;
  });
  const fac = (p: PlayerRow) => (p.role_slug ? roles.get(p.role_slug)?.faction : undefined);
  const isVampire = (p: PlayerRow) => {
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    return p.role_slug === "vampire" || m.converted === true;
  };
  const isMechant = (p: PlayerRow) => {
    if (
      p.role_slug === "heritier_dechu" &&
      real.some((x) => fac(x) === "Méchant" && x.is_alive && !x.is_imprisoned)
    )
      return true;
    return fac(p) === "Méchant";
  };

  // Oracle qui a vu juste → gagne avec la faction prophétisée
  const oracleWinners = real.filter((p) => {
    if (p.role_slug !== "oracle") return false;
    const m = (p.role_meta ?? {}) as Record<string, unknown>;
    const proph = m.prophecy as string | undefined;
    return proph ? ORACLE_FACTION_TO_WINNER[proph] === winner : false;
  });

  const groups: WinnerGroup[] = [];
  let mainTone = "text-gold";

  switch (winner) {
    case "Civil": {
      mainTone = "text-primary";
      // Le Chasseur de Vampire (Neutre) est allié des Civils : il gagne avec eux.
      const civils = real.filter(
        (p) => fac(p) === "Civil" || p.role_slug === "chasseur_de_vampire",
      );
      if (civils.length) groups.push({ label: "Les Civils", players: civils, tone: mainTone });
      break;
    }
    case "Méchants": {
      mainTone = "text-destructive";
      const mechs = real.filter(isMechant);
      if (mechs.length) groups.push({ label: "Les Méchants", players: mechs, tone: mainTone });
      break;
    }
    case "Vampires": {
      mainTone = "text-fuchsia-400";
      const vamps = real.filter(isVampire);
      if (vamps.length) groups.push({ label: "Les Vampires", players: vamps, tone: mainTone });
      break;
    }
    case "Neutres": {
      mainTone = "text-emerald-300";
      const neutres = real.filter((p) => fac(p) === "Neutre");
      if (neutres.length) groups.push({ label: "Les Neutres", players: neutres, tone: mainTone });
      break;
    }
    case "Amoureux": {
      mainTone = "text-pink-300";
      const lovers = real.filter((p) => {
        const m = (p.role_meta ?? {}) as Record<string, unknown>;
        return typeof m.linked_with === "string";
      });
      if (lovers.length) groups.push({ label: "Les Amoureux", players: lovers, tone: mainTone });
      break;
    }
    case "Veuve noire": {
      mainTone = "text-purple-300";
      const v = real.filter((p) => p.role_slug === "veuve_noire");
      if (v.length) groups.push({ label: "La Veuve Noire", players: v, tone: mainTone });
      break;
    }
    case "Empoisonneur": {
      mainTone = "text-lime-300";
      const v = real.filter((p) => p.role_slug === "empoisonneur");
      if (v.length) groups.push({ label: "L'Empoisonneur", players: v, tone: mainTone });
      break;
    }
    case "Parieur tricheur": {
      mainTone = "text-yellow-300";
      const v = real.filter((p) => p.role_slug === "parieur_tricheur");
      if (v.length) groups.push({ label: "Le Parieur Tricheur", players: v, tone: mainTone });
      break;
    }
    case "Conservateur": {
      mainTone = "text-amber-300";
      const v = real.filter((p) => p.role_slug === "conservateur");
      if (v.length) groups.push({ label: "Le Conservateur", players: v, tone: mainTone });
      break;
    }
    default: {
      // Fallback générique : si winner == nom d'un pseudo / faction inconnue
      const named = real.filter((p) => p.role_slug && roles.get(p.role_slug)?.name_fr === winner);
      if (named.length) groups.push({ label: winner, players: named, tone: mainTone });
      break;
    }
  }

  if (oracleWinners.length > 0) {
    groups.push({
      label: oracleWinners.length > 1 ? "Les Oracles" : "L'Oracle",
      players: oracleWinners,
      tone: "text-fuchsia-300",
    });
  }

  return { groups, tone: mainTone };
}

export function E1EndGame({ game, gameId, players, roles, devWinner }: FrameContext) {
  // Lever A : le vainqueur est écrit sur la ligne `games` dans le MÊME update que
  // `status = ended` → présent dès la 1ʳᵉ frame via le payload realtime. Un
  // `win_reason` non-vide signale que la ligne porte un résultat terminal résolu
  // (le `winner` peut être NULL = « aucun camp ne l'emporte »). On peuple alors
  // l'écran sans aucune requête → plus de flash « Calcul… ». Le fallback requête
  // ci-dessous ne sert que pour les parties terminées AVANT cette migration.
  const rowReason = game?.win_reason ?? null;
  const rowHasResult = typeof rowReason === "string" && rowReason.length > 0;

  const [result, setResult] = useState<WinResult | null>(() => {
    if (devWinner) return { winner: devWinner, reason: "Aperçu sandbox — camp gagnant forcé." };
    if (rowHasResult) return { winner: game?.winner ?? null, reason: rowReason };
    return null;
  });

  useEffect(() => {
    // Déjà peuplé (sandbox /dev, ou ligne games via lever A) → aucune requête.
    if (devWinner || rowHasResult) return;
    void supabase
      .from("notifications")
      .select("title, body, payload")
      .eq("game_id", gameId)
      .eq("type", "game_end")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        // Annonce de fin présente → on l'utilise telle quelle, MÊME si le camp
        // gagnant est nul (fin sans survivant) : la partie EST terminée, l'écran
        // ne doit pas repartir en calcul.
        if (data) {
          const payload = (data as { payload?: { winner?: string | null } }).payload;
          setResult({
            winner: payload?.winner ?? null,
            reason: (data as { body?: string | null }).body ?? "",
          });
          return;
        }
        // Aucune annonce de fin en base (cf. bug QA « game_end » manquant) : on
        // recalcule. evaluateWin peut renvoyer null (aucun vainqueur déterminable) ;
        // dans ce cas on FIGE un résultat terminal plutôt que de laisser l'écran
        // bloqué indéfiniment sur « Calcul… » (l'écran vide de victoire).
        void evaluateWin(gameId).then((r) =>
          setResult(r ?? { winner: null, reason: "La partie est terminée." }),
        );
      });
  }, [gameId, devWinner]);

  const winner = result?.winner ?? "";
  const { groups } = useMemo(() => {
    if (!winner) return { groups: [] as WinnerGroup[], tone: "text-muted-foreground" };
    return computeGroups(winner, players as PlayerRow[], roles);
  }, [winner, players, roles]);

  const theme = themeFor(winner);

  // Rôles emblématiques du camp (icônes PNG) — emblème + particules.
  const emblemRoles = useMemo(() => (winner ? emblemRolesFor(winner, roles) : []), [winner, roles]);
  const heroRoles = emblemRoles.slice(0, 3);

  // Champ de particules : chaque particule = l'icône d'un rôle du camp (cyclée),
  // position stable tant que le camp ne change pas.
  const particles = useMemo(() => {
    if (!winner || emblemRoles.length === 0)
      return [] as Array<{ id: number; role: RoleRow; left: number; size: number }>;
    const count = theme.particleCount ?? 16;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      role: emblemRoles[i % emblemRoles.length],
      left: Math.round((i * 53 + 7) % 100),
      size: 26 + ((i * 11) % 26),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, emblemRoles.length, theme.particleCount]);

  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Animations GSAP : emblème, titre (SplitText), particules d'ambiance, cartes.
  // Coupées si l'utilisateur préfère réduire les animations (matchMedia).
  useEffect(() => {
    if (!winner) return;
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let split: SplitText | null = null;

      gsap.from(".vic-hero-icon", {
        scale: 0.2,
        opacity: 0,
        rotate: -25,
        y: 12,
        stagger: 0.12,
        duration: 0.9,
        ease: "back.out(1.7)",
      });

      // Halo pulsant derrière l'emblème (ambiances renforcées : Vampires, Conservateur).
      const glowEl = root.querySelector<HTMLElement>(".vic-glow");
      if (glowEl && theme.pulse === "heartbeat") {
        // Double battement type cœur, puis pause — sinistre.
        gsap.set(glowEl, { scale: 0.85, opacity: 0.5 });
        const tl = gsap.timeline({ repeat: -1, defaults: { transformOrigin: "50% 50%" } });
        tl.to(glowEl, { scale: 1.12, opacity: 0.85, duration: 0.18, ease: "power2.out" })
          .to(glowEl, { scale: 0.92, opacity: 0.55, duration: 0.22, ease: "power2.in" })
          .to(glowEl, { scale: 1.06, opacity: 0.75, duration: 0.16, ease: "power2.out" })
          .to(glowEl, { scale: 0.85, opacity: 0.45, duration: 0.5, ease: "power1.inOut" })
          .to(glowEl, { duration: 0.7 });
      } else if (glowEl && theme.pulse === "breathe") {
        // Respiration lente et dorée — relique vivante.
        gsap.fromTo(
          glowEl,
          { scale: 0.9, opacity: 0.4 },
          { scale: 1.15, opacity: 0.8, duration: 2.6, ease: "sine.inOut", repeat: -1, yoyo: true },
        );
      }

      if (titleRef.current) {
        split = SplitText.create(titleRef.current, { type: "chars" });
        gsap.from(split.chars, {
          yPercent: 120,
          opacity: 0,
          rotateX: -90,
          stagger: 0.045,
          duration: 0.7,
          ease: "back.out(1.6)",
          delay: 0.25,
        });
      }

      gsap.from(".vic-card", {
        y: 22,
        opacity: 0,
        stagger: 0.07,
        duration: 0.5,
        ease: "power2.out",
        delay: 0.55,
      });

      // Ambiance : chaque icône de rôle dérive en boucle selon le mood du camp.
      gsap.utils.toArray<HTMLElement>(".vic-particle").forEach((el) => {
        const dur = gsap.utils.random(8, 14);
        const delay = gsap.utils.random(0, 8);
        const drift = gsap.utils.random(-40, 40);
        const spin = gsap.utils.random(-60, 60);
        if (theme.motion === "float") {
          gsap.set(el, { opacity: 0 });
          gsap.to(el, {
            keyframes: { opacity: [0, 0.55, 0.55, 0] },
            duration: dur,
            delay,
            repeat: -1,
            ease: "none",
          });
          gsap.to(el, {
            y: gsap.utils.random(-30, -70),
            x: drift,
            rotation: spin,
            duration: dur / 2,
            delay,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        } else {
          const fromY = theme.motion === "rise" ? "115%" : "-135%";
          const toY = theme.motion === "rise" ? "-135%" : "115%";
          gsap.set(el, { y: fromY, opacity: 0, rotation: spin * 0.3 });
          gsap.to(el, {
            y: toY,
            x: `+=${drift}`,
            rotation: `+=${spin}`,
            duration: dur,
            delay,
            repeat: -1,
            ease: "none",
            keyframes: { opacity: [0, 0.55, 0.55, 0] },
          });
        }
      });

      return () => {
        split?.revert();
      };
    });
    return () => mm.revert();
  }, [winner, theme.motion]);

  const headline =
    groups.length > 0 ? groups.map((g) => g.label).join(", ") : theme.title || winner || "—";

  // Liste plate des vainqueurs (tous groupes confondus, dédupliquée par id).
  const winners = useMemo(() => {
    const seen = new Set<string>();
    const list: PlayerRow[] = [];
    for (const g of groups)
      for (const p of g.players) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    return list;
  }, [groups]);

  return (
    <div
      ref={rootRef}
      className="relative h-full flex flex-col overflow-y-auto text-foreground"
      style={{ background: winner ? theme.pageBg : undefined }}
    >
      {/* Couche d'ambiance : icônes PNG des rôles du camp (non interactive) */}
      {winner && particles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
          {particles.map((p) => (
            <span
              key={p.id}
              className="vic-particle absolute bottom-0 will-change-transform"
              style={{ left: `${p.left}%`, filter: `drop-shadow(0 0 8px ${theme.accentSoft})` }}
            >
              <RoleIcon role={p.role} size={p.size} />
            </span>
          ))}
        </div>
      )}

      {/* Vignettage sombre sur les bords */}
      {winner && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse at center, transparent 42%, ${theme.vignette ?? "oklch(0.06 0.02 30)"} 100%)`,
          }}
        />
      )}

      <header className="relative z-10 px-6 pt-4 pb-4 text-center">
        {result === null ? (
          <h1
            className="text-2xl font-bold mt-3 text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Calcul…
          </h1>
        ) : !winner ? (
          // Fin SANS vainqueur (aucun survivant / partie close sans camp gagnant) :
          // pas d'emblème vide ni de « VICTOIRE » trompeur — un écran de clôture net.
          <div className="mt-6">
            <div
              className="text-lg"
              style={{ fontFamily: "var(--font-hand)", color: theme.titleColor }}
            >
              Aucun camp ne l'emporte
            </div>
            <h1
              ref={titleRef}
              className="text-4xl font-bold mt-1 tracking-[0.1em]"
              style={{
                fontFamily: "var(--font-display)",
                color: theme.titleColor,
                textShadow: `0 0 30px ${theme.accentSoft}`,
              }}
            >
              PARTIE TERMINÉE
            </h1>
          </div>
        ) : (
          <>
            {/* Emblème dans un cercle nimbé de la couleur du camp */}
            <div
              className="relative mx-auto grid place-items-center"
              style={{ width: 132, height: 132 }}
            >
              {theme.glow && (
                <div
                  className="vic-glow pointer-events-none absolute inset-0 rounded-full"
                  aria-hidden
                  style={{
                    background: `radial-gradient(circle, ${theme.glow} 0%, transparent 68%)`,
                  }}
                />
              )}
              <div
                className="vic-hero-icon relative grid place-items-center rounded-full overflow-hidden"
                style={{
                  width: 116,
                  height: 116,
                  background:
                    "radial-gradient(circle at 50% 35%, oklch(0.22 0.03 35), oklch(0.12 0.02 30))",
                  boxShadow: `0 0 0 2px ${theme.accent}, 0 0 42px -4px ${theme.accent}`,
                }}
              >
                {heroRoles[0] && (
                  <RoleIcon role={heroRoles[0]} size={116} className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            <div
              className="mt-4 text-lg"
              style={{ fontFamily: "var(--font-hand)", color: theme.titleColor }}
            >
              {theme.title || headline}
            </div>
            <h1
              ref={titleRef}
              className="text-5xl font-bold mt-1 tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-display)",
                color: theme.titleColor,
                textShadow: `0 0 30px ${theme.accentSoft}`,
              }}
            >
              VICTOIRE
            </h1>
          </>
        )}
      </header>

      {/* Panneau Vainqueurs · Rôles révélés */}
      <div className="relative z-10 flex-1 px-5 pb-2">
        <div
          className="rounded-2xl p-4"
          style={{
            background: "oklch(0.16 0.02 35 / 0.5)",
            boxShadow: `inset 0 0 0 1px ${theme.accentSoft}`,
          }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--muted-foreground)" }}
          >
            Vainqueurs · Rôles révélés
          </div>

          {winners.length === 0 && result !== null ? (
            <div className="text-center text-sm text-muted-foreground italic py-6">
              Aucun gagnant désigné.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {winners.map((p) => {
                const r = p.role_slug ? roles.get(p.role_slug) : null;
                const av = avatarOf(
                  (p.role_meta as Record<string, unknown>)?.avatar as string | undefined,
                  p.id,
                );
                const meta = (p.role_meta ?? {}) as Record<string, unknown>;
                const converted = meta.converted === true && p.role_slug !== "vampire";
                const originalSlug = meta.original_slug as string | undefined;
                const originalRole = originalSlug ? roles.get(originalSlug) : null;
                let pillLabel = converted ? "Converti·e" : (r?.name_fr ?? "?");
                if (originalRole && !converted) pillLabel += ` (${originalRole.name_fr})`;
                // Héritier déchu = transfuge minoritaire → couleur or distincte.
                const pillColor =
                  p.role_slug === "heritier_dechu" && winner === "Méchants"
                    ? "oklch(0.82 0.16 85)"
                    : theme.accent;
                return (
                  <div
                    key={p.id}
                    className="vic-card rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{
                      background: "oklch(0.20 0.03 35 / 0.6)",
                      boxShadow: `inset 0 0 0 1px ${theme.accentSoft}`,
                    }}
                  >
                    <div
                      className="size-10 overflow-hidden shrink-0 grid place-items-center"
                      style={{ background: "oklch(0.32 0.02 240)" }}
                    >
                      <AvatarImg avatar={av} size={40} rounded="none" />
                    </div>
                    <div className="flex-1 min-w-0 font-bold truncate">{p.pseudo}</div>
                    <span
                      className="shrink-0 text-[10px] px-2 py-1 rounded-md whitespace-nowrap"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: pillColor,
                        border: `1px solid ${pillColor}`,
                        background: `color-mix(in oklab, ${pillColor} 14%, transparent)`,
                      }}
                    >
                      {pillLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Texte d'explication (issue / rôles minoritaires) */}
          {result?.reason && (
            <p className="mt-3 text-xs italic leading-snug text-white/65">{result.reason}</p>
          )}
        </div>
      </div>

      {/* Nouvelle enquête */}
      <div className="relative z-10 p-5">
        <a
          href="/"
          className="block h-14 rounded-xl flex items-center justify-center font-bold uppercase tracking-wider"
          style={{
            background: theme.accent,
            color: "oklch(0.16 0.02 35)",
            fontFamily: "var(--font-display)",
            boxShadow: `0 12px 26px -8px ${theme.accentSoft}`,
          }}
        >
          Nouvelle enquête
        </a>
      </div>
    </div>
  );
}
