# Instructions projet - Murder Party

Ces instructions s'appliquent à tout le dépôt.

## Référence obligatoire pour toute modification visuelle

Avant de modifier une interface, un composant, une couleur, une typographie, une animation ou un parcours UX, lire dans cet ordre :

1. `docs/brand/THE FULL DA.pdf` - source visuelle de référence et autorité artistique.
2. `DESIGN.md` - traduction normative de la DA en tokens, composants et règles applicables.
3. `docs/ART_DIRECTION.md` - résumé opérationnel, règles métier et correspondances avec l'UI actuelle.
4. Le composant cible et `src/styles.css` - vérité sur l'implémentation et les tokens réellement disponibles.

Le PDF décide du style. Le code existant décide du comportement et des données. `DESIGN.md` relie les deux. En cas d'écart, préserver la logique métier, puis rapprocher visuellement l'interface du PDF avec les tokens existants ou une extension documentée du système.

## Méthode obligatoire

- Auditer le rendu actuel avant de dessiner ou coder une variante.
- Concevoir mobile-first dans un viewport étroit, puis vérifier le desktop.
- Mettre l'information de jeu principale au-dessus de la ligne de flottaison.
- Réutiliser les pièces de la DA : papier, liège, bois, ficelle rouge, punaise, tampon, post-it et polaroïd uniquement quand leur fonction correspond au contexte.
- Conserver la grammaire typographique : `Special Elite` pour dossier/tampon, `Caveat` pour annotations, `Archivo` pour le corps et les contrôles.
- Ne jamais révéler un rôle, une faction, une cible ou une cause de mort que le gameplay garde secret.
- Vérifier contraste, focus, cibles tactiles et `prefers-reduced-motion`.
- Valider visuellement les surfaces joueur dans `/dev`; utiliser `/annonce-lab` pour les variantes de l'onglet Annonces.

## Interdits de DA

- Dashboard SaaS générique ou grille de cartes identiques.
- Glassmorphism décoratif, gradient de texte, néons futuristes ou violet gaming par défaut.
- Matière vintage sans fonction, accumulation de cadres imbriqués ou sceau de cire sur une nouvelle ordinaire.
- Animation purement décorative ou action inventée sur un écran informatif.
