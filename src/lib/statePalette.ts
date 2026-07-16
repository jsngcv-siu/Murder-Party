// Colorimétrie pilotée par l'ÉTAT du joueur (vivant / prison / mort).
//
// ── Quatre règles, tirées de la DA et de ses propres assets ──────────────────
//
// 1. L'ÉTAT COLORE LE MONDE, JAMAIS L'ACTION. « Ficelle rouge pour l'action »
//    est une règle du système (docs/ART_DIRECTION.md) : le rouge veut dire
//    « voilà ce que tu fais ». Les surfaces prennent l'état ; le rouge d'action,
//    l'or d'accent et les couleurs sémantiques d'onglets restent intacts. C'est
//    aussi ce qui garde de la VARIÉTÉ : sans ça, chaque état vire monochrome.
//
// 2. LA COULEUR EST UNE LUMIÈRE, PAS UNE PEINTURE. Peindre toute la surface
//    donne une ambiance uniforme et molle. Un lieu, c'est une base sombre + UNE
//    source. On garde donc les surfaces sombres et la couleur arrive par un gel
//    `soft-light` (qui éclaire sans aplatir les noirs) + une vignette. Bonus : la
//    source peut être vraiment lumineuse (L 0.85) sans éclaircir le fond — ce qui
//    contourne le mur du gamut et préserve le contraste.
//
// 3. LA MATIÈRE EST UN FOND, PAS UN CALQUE — ET PEINTE UNE SEULE FOIS. Barreaux
//    et volutes vivent dans le fond de la RACINE du shell (`--surface-pattern`),
//    plein écran ; le liège des onglets s'efface (`corkOff` → `data-cork="off"`)
//    pour le laisser voir. Posés en avant-plan par-dessus le papier, ils
//    lisaient comme de la saleté ; peints par chaque onglet, leur position (cadrée
//    sur la boîte de l'onglet), leur échelle et leur teinte (grain + dégradé du
//    liège) divergeaient d'un onglet à l'autre. Une peinture unique = le même
//    mur derrière tous les dossiers.
//
// 4. LE FROID OPPRESSE, LE CHAUD ACCUEILLE. La prison est PIERRE FROIDE, pas
//    orange — c'est déjà le langage de `public/annonces/prison.png` (cellule de
//    pierre gris-bleu) utilisé par le cadre d'annonce. L'orange-combinaison est
//    une référence américaine contemporaine, étrangère au manoir début de siècle
//    de la DA ; et à 30° du brun de base en basse chroma, il en est presque
//    indiscernable. L'orange reste donc ce qu'il est déjà dans le jeu : le
//    TAMPON « PRISON ». Marqueur orange, monde froid.
//
// ── Deux contraintes mesurées, pas devinées ─────────────────────────────────
//
// • GAMUT : sous L≈0.25 le sRGB n'a plus de place pour l'orange ; la chroma est
//   écrêtée et la surface vire au ROUGE (oklch(0.16 0.078 58) → rgb(35,0,0)).
//   Un orange sombre EST un brun. Le froid et le vert n'ont pas ce mur.
// • CONTRASTE : une version éclaircissait la prison à L 0.36 pour aller chercher
//   l'orange — le texte secondaire tombait à 4.44:1, sous le seuil AA de 4.5:1
//   visé par PRODUCT.md. Les surfaces restent sombres, et les gels d'atmosphère
//   sont SOMBRES : ils augmentent le contraste au lieu de le manger.
//
// Le vert des morts : son défaut initial était d'être trop SATURÉ et trop
// « herbe » (hue 152, chroma 0.045) → il lisait néon/toxique, ce qui est une
// anti-référence explicite du produit. Un fantôme est délavé et froid.
import type { CSSProperties } from "react";

export type PlayerState = "alive" | "imprisoned" | "dead";

export function playerState(me: { is_alive: boolean; is_imprisoned: boolean }): PlayerState {
  if (!me.is_alive) return "dead";
  if (me.is_imprisoned) return "imprisoned";
  return "alive";
}

/** Calques d'ambiance posés PAR-DESSUS le contenu : de la LUMIÈRE et de l'air,
 *  jamais de la matière solide (cf. règle 3). */
export type Atmosphere = {
  /** Gel coloré en `soft-light` : éclaire les clairs, laisse les noirs noirs. */
  light?: string;
  /** Vignette sombre : resserre le cadre. Assombrit → contraste préservé. */
  vignette?: string;
  /** Brume des morts. Devant, contrairement aux barreaux : de la brume se tient
   *  bel et bien ENTRE l'œil et la scène — c'est ce qui la rend fantomatique.
   *  Alpha volontairement faible pour ne pas voiler le texte. */
  fog?: string;
};

export type StateTheme = {
  /** Tokens CSS à poser sur la racine du shell. */
  vars: CSSProperties;
  /** Wash d'ambiance qui REMPLACE celui de la phase. `null` = garder la phase. */
  wash: string | null;
  /** Accent qui REMPLACE celui de la phase (liseré d'en-tête, jauge de temps). */
  accent: string | null;
  atmosphere: Atmosphere;
  /** Efface le liège des onglets (`[data-cork="off"]`, cf. styles.css) pour que
   *  le décor plein cadre de la RACINE (`--surface-pattern`) soit le SEUL fond.
   *  Sans ça, chaque onglet peignait sa copie de la texture, cadrée sur sa
   *  propre boîte et re-teintée par son liège : position, échelle et couleur
   *  divergeaient d'un onglet à l'autre. */
  corkOff?: boolean;
};

// ── Vivant ───────────────────────────────────────────────────────────────────
// La DA vivante (bordeaux « Velours ») vit dans :root / .dark (styles.css) :
// c'est la base de toute l'app, accueil et lobby compris. L'état vivant n'a donc
// RIEN à surcharger — il hérite. Prison et mort ne font que réécrire ces tokens
// le temps de l'état.

// ── Prison ───────────────────────────────────────────────────────────────────

// Vraie grille de barreaux (texture fournie, détourée sur fond transparent),
// peinte UNE SEULE FOIS sur la racine du shell, sous le contenu (le liège des
// onglets est effacé via `corkOff`). `overlay` la fond dans le fond sombre : le
// métal clair s'éclaire et se teinte de la pierre, au lieu d'être plaqué en
// gris quasi blanc par-dessus.
const PRISON_BARS_IMG = "url(/textures/barreaux.webp)";

// Lumière froide tombant de la lucarne — la seule source de la cellule.
const PRISON_LIGHT_COLD =
  "radial-gradient(105% 58% at 50% -14%, oklch(0.88 0.045 235 / 0.55), transparent 66%)";
const PRISON_VIGNETTE =
  "radial-gradient(125% 95% at 50% 42%, transparent 38%, oklch(0.04 0.012 245 / 0.7) 100%)";

// L'ORANGE RESTE LE TAMPON : c'est déjà la couleur du badge « PRISON » des
// annonces. Il marque l'état (liseré d'en-tête, jauge) sur un monde froid.
const PRISON_STAMP = "oklch(0.77 0.15 62)";

// Cellule de pierre froide + barreaux, calée sur public/annonces/prison.png.
// Le froid s'oppose au bordeaux du vivant → l'état se lit d'un coup d'œil.
const PRISON: StateTheme = {
  vars: {
    "--background": "oklch(0.165 0.018 245)",
    "--card": "oklch(0.225 0.022 245)",
    "--border": "oklch(0.35 0.03 245)",
    "--muted": "oklch(0.245 0.02 245)",
    "--secondary": "oklch(0.265 0.022 245)",
    "--surface-pattern": PRISON_BARS_IMG,
    // `contain` plutôt que `cover` : en `cover` la grille débordait en largeur
    // et on n'en voyait qu'un gros plan recadré. En `contain` toute la largeur
    // de la grille tient dans l'écran, et `repeat-y` la prolonge de haut en bas
    // (les barreaux verticaux se raccordent sans couture visible).
    "--surface-size": "contain",
    "--surface-position": "center",
    "--surface-repeat": "repeat-y",
    "--surface-blend": "overlay",
    // Marqueur de l'état, consommé par les écrans (P1Prison…) : ils n'ont pas
    // à redéclarer la couleur, ils la lisent. Ici l'orange du tampon.
    "--state-accent": PRISON_STAMP,
    // La texture de barreaux tient déjà le décor de fond : on éteint les
    // empreintes fantômes du voile, qui feraient doublon.
    "--reveal-decor": "0",
    "--reveal-halo": "oklch(0.3 0.05 245 / 0.6)",
    "--reveal-title": PRISON_STAMP,
    "--reveal-title-glow": PRISON_STAMP,
    "--reveal-subtitle": "oklch(0.78 0.03 240)",
    // Sceau : PARTIELLEMENT teinté (chroma ~0.035, très en-dessous des
    // surfaces). Il prend la lumière de la cellule sans s'y fondre — c'est un
    // objet de métal posé dans la pièce, pas un morceau de mur. Ce qui le fait
    // ressortir reste intact : le relief du disque, le halo doré, et surtout
    // l'empreinte + l'anneau de progression en ficelle rouge (règle 1).
    "--reveal-seal-hi": "oklch(0.34 0.035 245)",
    "--reveal-seal-lo": "oklch(0.16 0.02 245)",
    "--reveal-seal": "oklch(0.66 0.08 245 / 0.5)",
    "--reveal-track": "oklch(0.42 0.04 245 / 0.6)",
  } as CSSProperties,
  wash: "oklch(0.6 0.05 240 / 0.18)",
  accent: PRISON_STAMP,
  atmosphere: { light: PRISON_LIGHT_COLD, vignette: PRISON_VIGNETTE },
  corkOff: true,
};

// ── Mort ─────────────────────────────────────────────────────────────────────
// Teinte retenue : le teal froid « immersif » (hue 180, chroma 0.03). Assez
// présent pour se lire, assez délavé pour rester spectral et hors du néon.
//
// Brume : nappes molles et irrégulières, jamais une grille. C'est elle qui fait
// le « fantomatique », plus que la couleur.
//
// Elle passe en AVANT-PLAN (atmosphère) et non dans `--surface-pattern` : ses
// quatre nappes sont quatre couches de fond, ce qui désalignait les listes du
// liège et faisait carreler son halo en grille de points. C'est aussi le bon
// modèle — de la brume se tient entre l'œil et la scène.
const DEAD_FOG =
  "radial-gradient(78% 34% at 18% 18%, oklch(0.92 0.03 188 / 0.14), transparent 72%), radial-gradient(70% 30% at 82% 44%, oklch(0.9 0.028 195 / 0.12), transparent 74%), radial-gradient(90% 26% at 38% 76%, oklch(0.88 0.025 190 / 0.12), transparent 72%), radial-gradient(120% 34% at 50% 104%, oklch(0.86 0.03 186 / 0.15), transparent 68%)";

// Volutes d'âmes qui encadrent l'écran — le pendant des barreaux de la cellule.
const DEAD_SOULS_IMG = "url(/textures/fantomes.webp)";

const DEAD: StateTheme = {
  vars: {
    "--background": "oklch(0.16 0.028 180)",
    "--card": "oklch(0.21 0.032 180)",
    "--border": "oklch(0.32 0.04 180)",
    "--muted": "oklch(0.23 0.028 180)",
    "--secondary": "oklch(0.25 0.032 180)",
    // Volutes d'âmes (texture fournie, détourée) : deux colonnes qui encadrent
    // l'écran et laissent le centre libre pour le contenu. Même dispositif que
    // les barreaux — peintes une seule fois sur la racine (liège effacé via
    // `corkOff`), sous le contenu, et fondues en `overlay` pour qu'elles
    // prennent la teinte du lieu au lieu de plaquer leur vert saturé
    // (rgb(5,190,141)), qui ramènerait le néon qu'on a écarté.
    //
    // `contain` (et non `cover`) : les fantômes vivent sur les BORDS, un
    // recadrage les amputerait.
    "--surface-pattern": DEAD_SOULS_IMG,
    "--surface-size": "contain",
    "--surface-position": "center",
    "--surface-repeat": "no-repeat",
    "--surface-blend": "overlay",
    "--state-accent": "oklch(0.8 0.1 178)",
    // Les volutes d'âmes tiennent déjà le décor de fond : on éteint les
    // empreintes fantômes du voile, qui feraient doublon.
    "--reveal-decor": "0",
    "--reveal-halo": "oklch(0.3 0.05 185 / 0.55)",
    "--reveal-title": "oklch(0.88 0.07 184)",
    "--reveal-title-glow": "oklch(0.8 0.08 184)",
    "--reveal-subtitle": "oklch(0.8 0.04 186)",
    // Même dosage qu'en prison : le sceau prend la lueur spectrale sans devenir
    // vert. Empreinte et anneau de progression restent rouges.
    "--reveal-seal-hi": "oklch(0.3 0.03 185)",
    "--reveal-seal-lo": "oklch(0.14 0.018 185)",
    "--reveal-seal": "oklch(0.68 0.07 185 / 0.45)",
    "--reveal-track": "oklch(0.42 0.035 185 / 0.6)",
  } as CSSProperties,
  wash: "oklch(0.7 0.09 182 / 0.2)",
  accent: "oklch(0.8 0.1 178)",
  atmosphere: {
    // Halo spectral pâle : la lueur vient de la brume, pas de la surface.
    light: "radial-gradient(120% 62% at 50% -10%, oklch(0.93 0.05 188 / 0.42), transparent 72%)",
    fog: DEAD_FOG,
    vignette:
      "radial-gradient(125% 95% at 50% 45%, transparent 38%, oklch(0.05 0.01 200 / 0.66) 100%)",
  },
  corkOff: true,
};

const ALIVE: StateTheme = { vars: {}, wash: null, accent: null, atmosphere: {} };

export function stateTheme(state: PlayerState): StateTheme {
  if (state === "imprisoned") return PRISON;
  if (state === "dead") return DEAD;
  // Vivant : hérite de :root (Velours), rien à surcharger.
  return ALIVE;
}
