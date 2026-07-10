# Direction artistique - Murder Party

Source locale: `docs/brand/THE FULL DA.pdf`.

## Intention

L'application doit ressembler a un dossier d'enquete manipulable sur mobile, pas a un dashboard
generique. Chaque ecran doit donner l'impression d'etre une piece de jeu physique: papier,
liege, bois sombre, ficelle rouge, punaises, tampons, post-it et photos.

## Palette officielle

- Nuit / fond: `oklch(0.16 0.03 30)`.
- Liege: `oklch(0.38 0.07 38)`.
- Cadre bois: `oklch(0.45 0.08 50)`.
- Papier dossier: `oklch(0.93 0.02 85)`.
- Ficelle / action: `oklch(0.55 0.22 18)`.
- Or detective: `oklch(0.80 0.15 78)`.

Factions:

- Civils: `oklch(0.72 0.16 230)`.
- Mechants: `oklch(0.55 0.22 18)`.
- Neutres: `oklch(0.80 0.12 300)`.
- Vampires: `oklch(0.66 0.20 340)`.
- Detective: `oklch(0.85 0.16 90)`.

## Typographies

- `Special Elite`: titres de dossier, chiffres, tampons, machine a ecrire.
- `Caveat`: post-it, annotations, ficelle, intitules manuscrits.
- `Archivo`: corps de texte, UI, listes, capacites.

Les variables attendues sont deja exposees dans `src/styles.css`:

- `--font-display`
- `--font-hand`
- `--font-body`

## Composants signature

- Tampon caoutchouc: revelations et etats. Rouge plein = allie, rouge outline = secret, gris =
  ferme.
- Polaroid: chaque affichage joueur important, avec punaise et nom au marqueur.
- Tag faction et chip d'usage: rythme identite / capacite.
- Sceau de cire: annonces speciales MJ uniquement, jamais pour une nouvelle ordinaire.
- Onglets bas: `INVENT.`, `SUSPIC.`, `ANNONCES`, `TEST.`. L'onglet actif a un trait or et un
  glyphe colore.
- Header de phase: phase, tour, timer, barre de temps.
- Stepper: `Libre > Annonce > Rassemblement > Vote`, avec la phase active mise en avant.

## Regles UI

- Mobile d'abord: l'information principale doit etre visible sans chercher.
- Une animation doit porter une information de jeu, jamais juste decorer.
- Les morts, protections, prisons, votes et messages prives doivent avoir des codes visuels
  distincts.
- Ne jamais reveler un role ou une faction dans une annonce si le gameplay ne le permet pas.
- Les boutons standards gardent des libelles standards: `Continuer`, `Ouvrir le Debat`,
  `Lancer le Debat`.
- Eviter les grands aplats modernes sans matiere: une surface doit avoir une raison dans la
  fiction.
- Eviter les icones generiques pour les evenements de jeu. Preferer tampons, polaroids, tags,
  post-it, ficelle et sceaux selon le contexte.

## Ecran Annonce

L'Annonce est le moment ou le jeu transforme les intentions cachees en faits publics.

Priorites:

1. Dire ce qui change maintenant: mort, protection, prison, message.
2. Separer clairement public, prive et etat.
3. Montrer l'ordre de resolution quand plusieurs effets arrivent.
4. Ne pas ajouter d'action joueur si l'ecran est seulement informatif.
5. Garder une vue de controle separee pour le MJ.

La variante joueur recommandee est `Journal joueur`: un en-tete papier, un fait majeur si
necessaire, des compteurs courts, puis les lignes d'evenements. La variante `Controle MJ` doit
rester une vue de regie, pas l'ecran principal joueur.
