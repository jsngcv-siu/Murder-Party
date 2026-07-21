# 10 — Victoire, défaite et fin de partie

## Population de référence `CONFIRMÉ`

Toutes les conditions se calculent sur les **joueurs réels** (le MJ et les entités hors-jeu sont exclus). Le décompte-clé est celui des **survivants libres** : vivants **et non emprisonnés**. Les Neutres **bénins** (Oracle, Chat du Manoir, Photographe, Aubergiste) ne comptent ni comme opposants ni comme bloqueurs — ils ne retardent la victoire de personne.

## Ordre de vérification (la première condition vraie l'emporte) `CONFIRMÉ`

| # | Condition | Vainqueur |
|---|---|---|
| 0 | Plus aucun survivant libre | **Personne** (« aucun survivant ») |
| 1 | La **Veuve noire** ou le **Parieur tricheur** est l'unique survivant libre (hors bénins) | Victoire **solo** du rôle |
| 2 | Tous les autres survivants libres (hors bénins) sont **empoisonnés** | **L'Empoisonneur** (solo) |
| 3 | Le **Pyromane** a atteint son quota de morts par le feu (3 si ≤15 joueurs, 4 si 16+) | **Le Pyromane** (solo, immédiat) |
| 4 | Au moins un vampire vivant **et** plus aucun non-vampire (hors bénins) vivant libre | **Le clan des Vampires** |
| 5 | Les Méchants sont en **majorité stricte** : plus nombreux (survivants libres) que **tous** leurs opposants réunis (Vampires comptés comme opposants) | **Les Méchants** |
| 6 | Le couple d'**Amoureux** lié (± l'Entremetteur) est seul survivant libre (hors bénins) | **La faction des Amoureux** |
| 7 | Plus aucun Méchant, Vampire, faction des Amoureux active, ni **Neutre bloquant** vivant | **Les Civils** |
| 8 | *Filet anti-blocage* : il ne reste qu'**un seul** survivant libre | **Ce joueur**, quel que soit son rôle |

Précisions de décompte :
- **Converti** : un joueur mordu compte comme Vampire, plus jamais dans son camp d'origine (jamais compté deux fois).
- **Héritier déchu** : compte comme allié Méchant tant qu'au moins un vrai Méchant vit ; sinon il a perdu et ne bloque plus la victoire civile.
- **Neutre bloquant** : tout Neutre non-bénin, hors Vampires, hors Chasseur de Vampire (allié des Civils, qui **gagne avec eux**), hors faction des Amoureux.
- **Égalité méchante** (ex. 2 contre 2) : **pas de victoire** — la ville garde sa chance ; la partie continue.

## Victoires immédiates hors de l'ordre standard `CONFIRMÉ`

| Déclencheur | Effet |
|---|---|
| **Le Cœur du Manoir** (relique) est distribué | Fin immédiate : victoire du **Conservateur** ; tous les autres perdent. Garde-fou : sans Conservateur dans la partie, la relique est sans effet. |
| **Le Saint est condamné par le vote** | Fin immédiate : **victoire des Méchants** (défaite des Citoyens). |

## Co-victoires (ajoutées au vainqueur principal, sans le modifier) `CONFIRMÉ`

Vérifiées après la victoire principale, dans cet ordre : **Oracle** (sa prophétie de famille correspond au camp vainqueur et il est vivant) → **Entremetteur** en repli (couple brisé ou jamais lié, vivant et libre) → **survivants bénins** (Chat du Manoir, Aubergiste vivants) → **Photographe mondain** (vivant et quota de sujets photographiés désormais morts : 2 / 3 / 4 selon la taille). Chaque co-vainqueur apparaît avec sa propre carte sur l'écran de fin.

## Défaites

- Il n'existe pas de défaite « individuelle » séparée : ne pas figurer parmi les vainqueurs/co-vainqueurs = avoir perdu.
- Cas notables : un Héritier déchu sans tueur méchant vivant a perdu même si les Méchants ont des survivants ; un converti perd avec le clan s'il est éradiqué ; l'Entremetteur au couple détruit peut encore co-gagner par survie.

## Moment exact de vérification et interruption `CONFIRMÉ`

- Vérification **en continu** : après chaque mort immédiate et chaque cascade, après la confirmation complète des morts différées à l'Annonce, après chaque conversion et empoisonnement.
- Dès qu'une condition est vraie : la partie **s'interrompt sur-le-champ**, y compris au milieu d'une phase ou d'une résolution ; les intentions non résolues sont **annulées** ; l'annonce de fin est émise puis l'état de la partie passe « terminée » avec le vainqueur et la raison enregistrés **d'un seul mouvement** (l'écran de fin se peuple instantanément chez tous).

## Égalités et simultanéités

| Cas | Traitement | Statut |
|---|---|---|
| Égalité en tête du vote classique | Tirage au sort parmi les ex æquo, affiché comme tel | `CONFIRMÉ` |
| Égalité en variante Suspicion | Personne n'est emprisonné | `CONFIRMÉ` |
| Deux conditions de victoire vraies au même instant | L'**ordre de vérification** tranche (le rang le plus haut gagne) ; conséquence : une victoire solo (ex. Pyromane) prime sur une majorité de faction acquise le même tour | `CONFIRMÉ` (comportement) / `À CONFIRMER` (caractère intentionnel — voir [18](18-questions-et-incertitudes.md)) |
| Parité Méchants/opposants | Pas de victoire, la partie continue | `CONFIRMÉ` |

## Informations révélées à la fin `CONFIRMÉ`

- **Camp vainqueur** avec mise en scène dédiée (couleurs, emblème, titre).
- **Cartes des vainqueurs et co-vainqueurs** : avatar, pseudo, **rôle révélé**, mention « Converti·e » avec rôle d'origine, distinction visuelle de l'Héritier déchu.
- **Raison de la victoire** (texte explicatif).
- Cas sans vainqueur : écran de clôture neutre, sans emblème.
- Les rôles des **non-vainqueurs** ne sont pas listés — `À CONFIRMER` s'il s'agit d'un choix définitif ou d'un manque.

## Rejouer et après-partie `CONFIRMÉ`

- Bouton « Nouvelle enquête » → retour à l'accueil (nouvelle partie à créer/rejoindre ; pas de revanche en un geste).
- Revenir dans la partie terminée raffiche l'écran de fin.
- La partie est effacée automatiquement ~30 minutes après la fin (comportement d'application) — l'écran de fin doit donc être considéré comme éphémère.
