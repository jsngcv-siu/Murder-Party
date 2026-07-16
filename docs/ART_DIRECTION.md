# Direction artistique - Murder Party

Source locale: `docs/brand/THE FULL DA.pdf`.

## Statut de la source et workflow

`THE FULL DA.pdf` est l'autorite visuelle du projet. `DESIGN.md` en est la traduction normative
pour les agents et les outils; ce fichier est le pont operationnel avec le gameplay et les
composants existants. Toute demande de modification visuelle doit commencer par ces trois
lectures, puis par l'inspection du composant cible et de `src/styles.css`.

Ordre de decision en cas de conflit:

1. Le code et les regles moteur preservent la fonction, les donnees et les secrets.
2. Le PDF fixe le style, les matieres, la composition et le ton.
3. `DESIGN.md` fixe les tokens et les contrats reutilisables.
4. Ce document precise l'application de ces contrats aux ecrans du jeu.

## Intention

L'application doit ressembler a un dossier d'enquete manipulable sur mobile, pas a un dashboard
generique. Chaque ecran doit donner l'impression d'etre une piece de jeu physique: papier,
liege, bois sombre, ficelle rouge, punaises, tampons, post-it et photos.

## Palette officielle

- Nuit / fond: `oklch(0.16 0.045 15)` (manoir « Velours », bordeaux nuit — fond de base de toute l'app).
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

## Colorimetrie d'etat du joueur

Le decor du joueur change de teinte selon son etat, pour qu'il le ressente d'un
coup d'oeil. Source unique: `src/lib/statePalette.ts` (reecrit les tokens de
surface sur la racine du PlayerShell; header, bandeau, onglets et fonds suivent).

- **Vivant**: le manoir bordeaux ci-dessus (base, aucune surcharge).
- **Prison**: cellule de pierre froide (hue 245) + texture de barreaux
  (`public/textures/barreaux.webp`), calee sur `public/annonces/prison.png`.
  L'orange `oklch(0.77 0.15 62)` reste le TAMPON de l'etat, jamais la surface.
- **Mort**: teal spectral delave (hue 180) + volutes d'ames
  (`public/textures/fantomes.webp`), registre du Conseil des Morts.

Regles invariantes: l'etat colore le monde mais JAMAIS l'action (ficelle rouge,
or et onglets restent intacts partout); la couleur est une lumiere (surfaces
sombres, contraste AA preserve, gel + vignette confines au corps); les matieres
(barreaux, volutes) sont peintes UNE SEULE FOIS dans le fond de la racine du
shell, sous le contenu (le liege des onglets s'efface pour les laisser voir),
jamais posees sur le papier; le froid oppresse, le chaud accueille.

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

### Rebond avec l'UI actuelle

L'implementation historique `PA6Announces` ouvre sur le nombre de survivants, trois compteurs et
une grille de joueurs. Cette information est utile, mais elle repousse les annonces sous la ligne
de flottaison sur mobile. Le correctif de hierarchie est donc impose:

- Les faits du tour passent avant la grille de joueurs.
- Le recap vivant / prison / mort devient une ligne compacte ou un acces secondaire.
- Un fait majeur n'est jamais repete une seconde fois dans la meme liste.
- Une ligne informative n'est pas rendue comme un bouton si elle n'ouvre aucune action.
- Public, Prive et Etat sont lisibles par texte et structure, pas uniquement par couleur.

Le laboratoire `/annonce-lab` contient trois pistes de joueur comparables:

1. `La depeche`: fait majeur puis nouvelles secondaires; recommandee pour la lecture immediate.
2. `Le fil du tour`: chronologie numerotee; adaptee aux tours avec plusieurs resolutions.
3. `Les dossiers`: regroupement Public / Prive / Etat; adaptee a la consultation et au rappel.
