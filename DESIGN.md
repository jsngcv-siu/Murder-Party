---
name: "Murder Party - The Board"
description: "Un dossier d'enquête vivant pour une Murder Party mobile et théâtrale."
colors:
  night: "oklch(0.16 0.045 15)" # manoir « Velours » — bordeaux nuit (fond de base de toute l'app)
  dossier-ink: "oklch(0.93 0.02 85)"
  dark-wood: "oklch(0.22 0.05 15)"
  cork: "oklch(0.38 0.07 38)"
  wood-frame: "oklch(0.45 0.08 50)"
  dossier-paper: "oklch(0.93 0.02 85)"
  paper-ink: "oklch(0.28 0.02 45)"
  red-string: "oklch(0.55 0.22 18)"
  detective-gold: "oklch(0.80 0.15 78)"
  announcement-cyan: "oklch(0.82 0.08 200)"
  civilian-blue: "oklch(0.72 0.16 230)"
  neutral-violet: "oklch(0.80 0.12 300)"
  vampire-magenta: "oklch(0.66 0.20 340)"
typography:
  display:
    fontFamily: "Special Elite, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Special Elite, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.12em"
  annotation:
    fontFamily: "Caveat, ui-rounded, cursive"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  paper: "3px"
  control: "8px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.red-string}"
    textColor: "{colors.dossier-ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  paper-card:
    backgroundColor: "{colors.dossier-paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.paper}"
    padding: "16px"
  dark-panel:
    backgroundColor: "{colors.dark-wood}"
    textColor: "{colors.dossier-ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
  active-tab:
    backgroundColor: "{colors.dark-wood}"
    textColor: "{colors.detective-gold}"
    height: "58px"
---

# Design System: Murder Party - The Board

## Overview

**Creative North Star: "Le dossier vivant"**

L'interface doit donner l'impression de manipuler les pièces d'une enquête réelle dans un manoir : dossiers papier, tableau de liège, cadre en bois, ficelle rouge, tampons et annotations. Cette matérialité n'est jamais un filtre décoratif. Chaque objet visuel porte une fonction stable et compréhensible.

Le produit reste un outil mobile utilisé au milieu d'une conversation. La hiérarchie doit donc être plus rapide que la fiction : un joueur comprend d'abord ce qui vient de changer, puis les détails, puis l'ambiance. Le système rejette le dashboard SaaS générique, le jeu mobile néon et le faux vintage illisible.

**Key Characteristics:**

- Dark-only, chaud et peu lumineux, avec papier clair réservé aux faits importants.
- Densité mobile maîtrisée : une conséquence principale par premier regard.
- Matières fonctionnelles, formes légèrement irrégulières et accents rares.
- Navigation familière, information de jeu explicite et secrets strictement préservés.

**The Above-the-Fold Rule.** Le contenu attendu de l'onglet ou de la phase apparaît avant les résumés secondaires. Une grille de joueurs ne peut jamais repousser les annonces sous la ligne de flottaison.

## Colors

La palette oppose la nuit chaude du manoir à la lumière du dossier, avec deux gestes rares : la ficelle rouge pour agir et l'or détective pour s'orienter.

### Primary

- **Ficelle rouge** : CTA principal, danger, verdict et lien actif. Elle ne décore jamais une surface inactive.
- **Or détective** : sélection, progression, repères de phase et détail d'importance. Sa rareté maintient la hiérarchie.

### Secondary

- **Cyan chronique** : identité de la phase et de l'onglet Annonces.
- **Couleurs de factions** : utilisées uniquement quand la faction est déjà connue et autorisée par le gameplay.

### Neutral

- **Nuit du manoir** : fond global dark-only.
- **Bois sombre** : panneaux, barres et contrôles secondaires.
- **Papier dossier** : révélations, faits publics, testaments et contenus qui doivent être lus comme une pièce.
- **Encre papier** : texte sur papier ; jamais le texte clair du thème sombre posé sur une feuille.

**The Two-Accent Rule.** Un écran emploie au maximum un accent fonctionnel de phase et un accent d'action. Les couleurs de factions n'entrent que comme données.

**The Material Contract.** Papier = fait ou document, liège = relation spatiale, tampon = état ou verdict, post-it = annotation courte, polaroïd = personne, ficelle = relation ou action.

### Colorimétrie d'état du joueur

Le décor du joueur change de colorimétrie selon son état, pour qu'il le ressente d'un coup d'œil sans lire un badge. Piloté entièrement par `src/lib/statePalette.ts`, qui réécrit les tokens de surface (`--background`, `--card`, `--border`, `--muted`, `--secondary`, liège) sur la racine du `PlayerShell` ; header, bandeau de statuts, onglets et fonds suivent automatiquement.

- **Vivant** — le manoir bordeaux « Velours » (la DA de base). Aucune surcharge, hérite de `:root`.
- **Prison** — cellule de pierre froide (hue 245) + texture de barreaux (`public/textures/barreaux.webp`), calée sur `public/annonces/prison.png`. Le froid s'oppose au bordeaux : lisible instantanément. L'orange (`oklch(0.77 0.15 62)`) reste le **tampon** de l'état (badge, liseré), jamais la surface.
- **Mort** — teal spectral délavé (hue 180, chroma basse) + volutes d'âmes (`public/textures/fantomes.webp`). Le registre du Conseil des Morts.

Quatre règles invariantes :

1. **L'état colore le monde, jamais l'action.** La ficelle rouge (sceau « Maintiens pour révéler », CTA), l'or d'accent et les couleurs sémantiques d'onglets restent intacts dans tous les états.
2. **La couleur est une lumière, pas une peinture.** Surfaces sombres (contraste AA préservé) ; la couleur d'ambiance arrive par un gel `soft-light` + une vignette, confinés au corps (jamais sur le chrome).
3. **La matière est un fond, pas un calque — et peinte une seule fois.** Barreaux et volutes vivent dans le fond de la racine du shell (`--surface-pattern`), plein écran et sous le contenu ; le liège des onglets s'efface (`data-cork="off"`) pour le laisser voir, sinon chaque onglet peindrait sa propre copie à une position et une teinte différentes. Jamais posés par-dessus le papier.
4. **Le froid oppresse, le chaud accueille.** L'écart de teinte chaud/froid entre les états porte la lecture autant que la couleur elle-même.

## Typography

**Display Font:** Special Elite (avec fallback monospace)
**Body Font:** Archivo (avec fallback system-ui)
**Label/Mono Font:** Special Elite ; Caveat est réservé aux annotations manuscrites.

**Character:** Special Elite installe la voix du dossier, Caveat apporte la main humaine et Archivo garde les informations et contrôles parfaitement lisibles. Les trois familles ne sont jamais interchangeables.

### Hierarchy

- **Display** (700, 24 px, 1.2) : titre d'écran, rôle révélé, verdict et moment de phase.
- **Headline** (700, 20 px, 1.25) : fait majeur ou titre d'un document.
- **Title** (600, 16 px, 1.3) : titre d'événement et section utile.
- **Body** (400-600, 14-16 px, 1.5) : descriptions et contrôles, avec 65-75 caractères maximum pour la prose.
- **Label** (600, 10-12 px, 0.12 em, uppercase) : tampon, tour, phase et métadonnée courte.

**The Legibility Rule.** Archivo porte toute information nécessaire pour décider ou agir. Caveat ne porte jamais une instruction critique, un timer ou un état.

## Elevation

La profondeur est structurelle et évoque des objets posés les uns sur les autres. Le papier reçoit une ombre franche mais diffuse, les panneaux sombres utilisent surtout la différence de ton et une bordure discrète, et les punaises ont une ombre courte. Aucun flou de verre décoratif.

### Shadow Vocabulary

- **Papier posé** (`0 12px 26px -10px oklch(0 0 0 / 0.7)`) : dossiers, révélations et testaments.
- **Carte sombre** (`0 16px 40px -18px oklch(0 0 0 / 0.7)`) : panneau modal ou surface élevée.
- **Punaise** (`0 4px 6px oklch(0 0 0 / 0.5)`) : polaroïd et document épinglé.
- **Halo d'action** (`0 0 24px -4px oklch(0.55 0.22 18 / 0.55)`) : focus ou action urgente, jamais en permanence.

**The Physical Stack Rule.** Une ombre indique qu'un objet est posé au-dessus d'un autre. Sans relation physique ou état interactif, utiliser une bordure ou un changement de ton.

## Components

### Buttons

- **Shape:** contrôle tactile doucement arrondi (8 px), hauteur minimale 44 px.
- **Primary:** ficelle rouge, texte crème, libellé Archivo semi-gras ; un seul CTA dominant par vue.
- **Hover / Focus:** changement de luminance en 140-220 ms et focus rouge de 2 px avec offset. L'état pressé peut réduire l'échelle à 0.97.
- **Secondary / Ghost:** bois sombre ou fond transparent avec bordure ; jamais une deuxième masse rouge concurrente.

### Chips

- **Style:** compacts, bordure 1 px, couleur liée à une donnée réelle : faction connue, usage, visibilité ou statut.
- **State:** le texte et le glyphe doublent toujours la couleur.

### Cards / Containers

- **Corner Style:** papier presque carré (3 px), panneau et contrôle à 8-12 px.
- **Background:** papier pour les faits ; bois sombre pour le chrome et les regroupements.
- **Shadow Strategy:** suivre la pile physique décrite dans Elevation.
- **Border:** fine et teintée par la matière ; aucun trait latéral décoratif épais.
- **Internal Padding:** 12-16 px sur mobile, 16-24 px sur les surfaces de lecture.

### Inputs / Fields

- **Style:** fond sombre ou papier selon la fiction, bordure 1 px, rayon 8 px et texte Archivo de 16 px sur mobile.
- **Focus:** anneau ficelle rouge visible, sans glow permanent.
- **Error / Disabled:** libellé explicite et glyphe ; opacité seule interdite comme unique signal.

### Navigation

La navigation joueur reste une barre basse familière. L'onglet actif combine un trait or, un glyphe coloré et un libellé lisible. Le header de phase reste compact avec tour, timer, stepper Enquête / Annonce / Débat / Vote et progression.

### Pièces signature

- **Tampon caoutchouc:** révélation et état ; rouge plein pour allié, rouge contour pour secret, gris pour clos.
- **Polaroïd:** toute personne importante, avec punaise et nom au marqueur.
- **Post-it:** note courte ou état temporaire, jamais un paragraphe.
- **Sceau de cire:** événement MJ rare uniquement, jamais une annonce ordinaire.
- **Journal d'annonces:** priorité au fait majeur, séparation explicite Public / Privé / État et ordre de résolution disponible quand plusieurs effets se cumulent.

## Do's and Don'ts

### Do:

- **Do** lire `docs/brand/THE FULL DA.pdf`, ce fichier et `docs/ART_DIRECTION.md` avant toute modification visuelle.
- **Do** garder l'information principale visible sans défilement sur un petit téléphone.
- **Do** réutiliser les tokens de `src/styles.css` et les pièces signature avec leur fonction prévue.
- **Do** réserver Archivo aux décisions, descriptions, labels interactifs et informations longues.
- **Do** vérifier contraste AA, cibles 44 px, focus visible et mode reduced-motion.
- **Do** préserver les secrets de rôle et de faction même dans les labels, couleurs et icônes.

### Don't:

- **Don't** produire un dashboard SaaS générique fait de cartes interchangeables.
- **Don't** utiliser une interface de jeu mobile néon, futuriste ou casino.
- **Don't** appliquer un flat design clinique sans matière ni fiction.
- **Don't** ajouter une décoration « vintage » gratuite qui réduit la lisibilité ou invente une affordance.
- **Don't** utiliser glassmorphism décoratif, gradient de texte, gradients violets ou animation sans information de jeu.
- **Don't** imbriquer des cartes dans des cartes ou employer une bordure latérale colorée de plus de 1 px.
