# 15 — Paramètres, variantes et équilibrage

Observations d'abord, hypothèses ensuite — jamais mélangées.

## Paramètres de session (réglables au salon) `CONFIRMÉ`

| Paramètre | Plage / valeurs | Défaut | Qui règle |
|---|---|---|---|
| Mode | MJ / Joueur Only | choisi à la création | Créateur |
| Cible de joueurs | 6 à 20 | — | Hôte |
| Durée d'Enquête | libre (pas de bornes observées) | 30 s | Hôte |
| Durée de Débat | libre | 30 s | Hôte |
| Durée de Vote | ≥ 25 s | 30 s | Hôte |
| Durée d'Annonce | **non réglable** | ~10 s | — |
| Variante Suspicion | on/off | off | Hôte |
| Pool de rôles | slots par faction/type, épinglage, bans | tirage auto | Hôte |

## Composition — règles observées `CONFIRMÉ`

### Invariant central
Les **proportions de factions dépendent uniquement du nombre de joueurs**. Épingler ou bannir des rôles change *quels* rôles occupent les slots, jamais *combien* de chaque faction.

### Barème des factions

| Joueurs | Méchants (Tueur + acolytes) | Neutres | Civils |
|---|---|---|---|
| 6–7 | 2 | 0 | le reste |
| 8–11 | 2 | 1 | le reste |
| 12–16 | 3 | 2 (dès 12) | le reste |
| 17 | 4 | 2 | le reste |
| 18–20 | 4 (plafond) | 3 | le reste |

- Cible : **~20 % de méchants** (délibérément sous les ~25 % du standard du genre, car les méchants de ce jeu frappent plus fort individuellement) ; plancher structurel de 2 méchants dès 6 joueurs (le Tueur + un acolyte : un vrai jeu d'équipe) ; **plafond dur : 4**.
- Les neutres apparaissent tard et croissent lentement pour maintenir un ratio civils/menaces ≈ 2.

### Rôles garantis et types épinglés

- **Socles verrouillés** dans toute partie : un **Tueur méchant** (slot garanti, tirage pondéré entre plusieurs variantes de tueur, épinglable), le **Majordome** (protecteur), l'**Assistant du détective** (enquêteur). Non supprimables, non bannissables.
- **Civils** : 1 **tueur civil garanti** à toutes les tables ; 1 support garanti dès 8 joueurs ; un 2ᵉ tueur civil seulement à partir de ~16 joueurs ; le reste en union souple Investigation/Support/Tueur. Un seul protecteur « sûr » (le Majordome) — le type Protecteur reste hors du pool souple.
- **Acolytes méchants** : le 1ᵉʳ (dès 6 j.) est une union souple (Investigation/Tromperie/Contrôle) ; le 2ᵉ (dès 12 j.) **garantit un trompeur ou un contrôleur** (éviter une équipe 100 % information) ; le 3ᵉ (dès 17 j.) repasse souple.
- **Neutres** : chaque slot accepte tous les types, pondérés **Bénin ≫ Mal ≫ Chaos** (poids observés 1.0 / 0.45 / 0.2) ; le jeu force un **type différent d'un neutre à l'autre** dans une même partie.

### Rareté, dépendances, incompatibilités

- Chaque rôle porte un **poids de tirage** (levier de rareté). Observé : l'Apothicaire est **plus fréquent** que la moyenne (poids double) ; les variantes de tueur principal ont des poids calibrés.
- Un rôle exige un **effectif minimal** (défaut 6) pour être tirable.
- **Dépendances** : le **Chasseur de Vampire** n'est jamais tiré — désigné secrètement au setup, uniquement si un Vampire est en jeu. L'Entremetteur crée sa faction en cours de jeu. L'Imitateur dépend du premier mort.
- **Incompatibilités** : aucune paire interdite observée en dehors des contraintes de type/faction des slots — `NON DOCUMENTÉ` comme mécanisme dédié.
- **Unicité** : un rôle n'apparaît qu'une fois par partie (tirages sans remise). `DÉDUIT` (aucun doublon observé).

### Garde-fous avant lancement `CONFIRMÉ`

1. Rôles socles retirés de tout ban.
2. Refus de bannir le dernier rôle d'un type requis par un slot (message explicatif).
3. Slot automatique sans candidat = signalé en erreur au configurateur.
4. **Filet de dernier recours** : si les bans assèchent un pool, complétion avec n'importe quel rôle éligible — le tirage produit toujours exactement l'effectif requis.
5. Surplus de slots = rognage des non-verrouillés en partant de la fin.

## Variantes `CONFIRMÉ`

| Variante | Effet | Conséquences d'équilibrage observables |
|---|---|---|
| **Suspicion** | Supprime le vote manuel : dépouillement automatique des marques « Suspect » des murs (vivants **et prisonniers**) ; égalité → personne | Les prisonniers gardent une influence ; l'espionnage des murs (Journaliste/Cartomancien) et l'Accusateur gagnent en valeur ; la Veuve noire piège sur la marque au lieu du vote |
| **Mode MJ** | Rythme manuel, MJ omniscient non-joueur | Le MJ n'est pas compté dans l'effectif ni les conditions de victoire |

## Influence du nombre de joueurs sur les capacités (usages scalés) `CONFIRMÉ`

| Rôle | Paliers |
|---|---|
| Exécuteur / Juge | 1 usage (≤10 j.) / 2 (11–13) / 3 (14+) |
| Cleaner | 1 charge (<10 j.) / 2 (≥10) |
| Bretteur | 1 parade / 2 (≥11 j.) |
| Photographe | quota 2 (≤10) / 3 (11–15) / 4 (16+) |
| Pyromane | quota de victoire 3 (≤15) / 4 (16+) |
| Indices distribués | ≈ 1 pour 3 joueurs, bornés 2–4 ; 1 indice max par joueur ; ~40 % de chances qu'une paire fragmentée remplace deux indices simples |

## Éléments modifiant la durée d'une partie

- Durées configurées des trois phases réglables (l'Annonce et le verdict sont fixes).
- Nombre de joueurs (plus de tours nécessaires pour atteindre une majorité ou une éradication).
- Létalité effective de la table (protections jouées, prison utilisée, égalités de vote).
- Mode MJ : le rythme dépend entièrement de l'animateur.

## Philosophie d'équilibrage observée (déclarée par le projet)

- L'équilibrage se règle par **les proportions de composition** selon le nombre de joueurs — pas par des taux de victoire par rôle mesurés.
- Certains rôles sont **volontairement durs** (le Parieur tricheur assume un taux de victoire très faible) — ne pas « corriger » sans décision explicite.
- Les Méchants sont rares mais individuellement puissants ; les Neutres bénins servent de bruit non bloquant.

## Hypothèses (à ne pas confondre avec les observations)

- `DÉDUIT` : la bande 6–11 joueurs à 2 méchants suppose que la pression civile (prison + tueurs civils garantis) suffit à compenser l'avantage d'information méchant — c'est le pari du calibrage, non prouvé ici.
- `À CONFIRMER` : le comportement du barème sur les grandes tables (16–20) est déclaré plus récent et moins éprouvé que la bande 6–15.
- `NON DOCUMENTÉ` : aucune donnée de parties réelles (taux de victoire par faction) n'est disponible dans le produit pour valider le calibrage.

## Risques de composition signalés

1. Beaucoup de rôles dépendent de la **prison** (Avocat, Archiviste, Geôlier, Juge, Exécuteur, Corrupteur…) : une table qui vote peu les éteint — risque d'ennui localisé, non traité par un garde-fou.
2. Les slots souples peuvent produire des tables pauvres en information ou pauvres en protection selon le tirage — partiellement contré par les épinglages de tête.
3. Les rôles à choix obligatoire de tour 1 (Usurpateur, Vengeur, Oracle, Mouchard) subissent un tirage aléatoire si le joueur est lent — comportement voulu mais potentiellement frustrant.
