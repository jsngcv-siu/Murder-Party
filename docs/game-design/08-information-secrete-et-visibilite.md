# 08 — Information secrète et visibilité

La gestion de l'information est le cœur du jeu : **le secret est une règle**, pas un habillage. Ce document cartographie chaque information, sa source, ses destinataires, son cycle de vie et ses risques de fuite.

## Classes de visibilité

| Classe | Définition |
|---|---|
| **Publique** | Visible de tous les participants (Gazette, verdicts, compteurs). |
| **Privée joueur** | Visible d'un seul joueur (son rôle, ses résultats, ses modales). |
| **Privée faction** | Visible d'un groupe (équipe Méchante, clan Vampire, couple d'Amoureux, Conseil des Morts). |
| **Réservée au MJ** | Vue omnisciente de régie (Mode MJ). |
| **Temporairement cachée** | Existe mais différée (mort différée, effet programmé au tour suivant). |
| **Révélée sous condition** | Publiée si un événement survient (testament à la mort, rôle à l'exécution). |
| **Historique** | Fil consultable après coup (Gazette cumulée, historiques personnels). |
| **Calculée/déduite** | Produite par une capacité (verdicts, trios, autopsies) — jamais stockée « en clair » pour d'autres. |

## Tableau acteur × information × moment × visibilité

| Information | Source | Destinataire(s) | Création | Révélation | Validité / évolution |
|---|---|---|---|---|---|
| **Rôle d'un joueur** | Attribution | Le joueur seul (+ MJ) | Lancement | Jamais publiquement, sauf : exécution (rôle complet à tous), écran de fin (vainqueurs), autopsie (au seul Médecin légiste), écrou (au seul Archiviste), enquêtes (dans les limites des déguisements) | Permanente ; la **conversion** change le camp, pas le rôle |
| **Liste des alliés méchants** | Attribution | Chaque Méchant | Lancement | Jamais | Mise à jour si conversion (l'équipe voit le départ — `À CONFIRMER`) |
| **Clan des Vampires** | Attribution/conversion | Membres du clan | Lancement / à chaque morsure | Jamais | Croît à chaque conversion |
| **Cible du Tueur (du tour)** | Choix du Tueur | Tous les Méchants vivants | Enquête | Jamais publiquement | Le tour courant |
| **Couple d'Amoureux** | Entremetteur | Les 2 liés + l'Entremetteur | Tour 1 | Statut « Amoureux · pseudo » visible des seuls concernés | Jusqu'à rupture (mort) |
| **Mort d'un joueur** | Résolution | Public | Enquête (différée) ou immédiate | À l'**Annonce** : pseudo + **faction seule** (ou « Effacé ») — jamais cause, arme ni auteur | Historique permanent |
| **Mort différée (condamnation)** | Résolution en Enquête | Personne (pas même la victime) | Enquête | Confirmée à l'Annonce | Temporairement cachée — la victime **continue de jouer** sans le savoir |
| **Emprisonnement** | Vote | Public | Clôture du vote | Verdict (~8 s) + Gazette — sans rôle ni faction | Historique (la libération ne l'efface pas) |
| **Libération / évasion** | Juge / Corrupteur | Public + le prisonnier | Programmée | Au tour suivant — **formulée à l'identique** dans les deux cas (indiscernable) | Historique |
| **Exécution** | Exécuteur | Public | Immédiate | **Rôle complet révélé à tous** — seule exception à l'avarice publique | Historique |
| **Événements anonymes** (morsure, éveil du Chasseur, miaulement, indices en circulation) | Résolution / setup | Public | Au fait générateur | Gazette — **jamais qui** | Historique |
| **Marque « Suspect » de l'Accusateur** | Accusateur | Public | Enquête | Immédiate, 1 tour | Expire |
| **Testament** | Le joueur | Public à sa mort | Rédigé de son vivant | À la mort (accessible depuis la carte de décès) | Permanent après mort |
| **Résultats d'enquête** (verdicts, trios, types, camps, journaux, autopsies) | Capacités | L'enquêteur seul | Au clic / à l'événement | Immédiate, en privé | Historique personnel |
| **Indices et fragments** | Distribution de début | Détenteurs individuels | Setup | Privés ; leur **existence** est annoncée publiquement au tour 1 | Toujours vrais (état à la composition) ; la fusion d'un fragment se fait **à la table** |
| **Contenu du mur des suspicions** | Chaque joueur | Lui seul | Continu | Espionnable (Journaliste/Cartomancien) ; agrégé anonymement en variante Suspicion | Vivant ou prisonnier : compte au dépouillement |
| **Votes individuels** | Chaque votant | Le votant seul | Vote | **Jamais révélés** — seuls le décompte de participation et le verdict sont publics | Effacés du regard public |
| **Statuts** (empoisonné, bloqué, béni, ivre, manipulé, perdant aux dés…) | Effets | Le joueur concerné (+ MJ) | À l'application | Le porteur les voit ; la table non | Selon durée du statut |
| **Protection** | Protecteurs | **Personne côté joueurs** (MJ seul) | Pose | Le protégé **n'apprend jamais** avoir été sauvé ; l'attaquant apprend seulement l'échec | Fenêtre de l'effet |
| **Tentative d'attaque bloquée** | Résolution | MJ ; cas particuliers : l'Aubergiste (« on a frappé », sans qui), le Saint (avec l'auteur) | Résolution | Voir cas | Ponctuelle |
| **Survie à un danger** | Résolution | La cible seule | Résolution | Modale « Tu as survécu à un danger » — **sans le rôle responsable** | Ponctuelle |
| **Morsure subie** | Résolution | La victime (modale privée) + le clan | Résolution | Publiquement : seulement l'événement anonyme | Permanente |
| **Chat d'équipe méchante** | Membres | Méchants vivants | Continu | Jamais | Partie |
| **Conseil des Morts** | Morts | Morts (écriture) + Médium (lecture) | Continu | Jamais aux vivants (hors Médium) | Partie |
| **Parloir** | Geôlier | Geôlier + prisonnier | Ouverture | Le prisonnier ignore l'identité du Geôlier | 1 tour |
| **Lettres** | Expéditeur | Destinataire | Envoi | **Signées** du nom de l'expéditeur (falsifiables par le Ventriloque) | Conservées en inventaire |
| **Inventaire d'un joueur** | Objets | Le détenteur (+ Monocle du douanier ; braquage) | Continu | Sur inspection/vol uniquement | Continu |
| **Dénouement de sa capacité** | Résolution | L'auteur | Annonce | « Réussi / Échec / En cours » — sans mécanisme adverse | Historique personnel |
| **Composition de la partie** (liste des rôles en jeu) | Configuration | Hôte au salon (configurateur) ; indices partiels ensuite | Salon | Le pool configuré est visible au salon (`À CONFIRMER` pour sa visibilité aux non-hôtes en partie) | — |
| **Vainqueur et raison** | Fin de partie | Public | Fin | Écran de fin (vainqueurs + rôles + explication) | Permanent (jusqu'à effacement de la partie) |

## Ce qu'un joueur reconnecté doit récupérer

À la reconnexion (ou au retour au premier plan), le joueur doit retrouver **exactement** l'état auquel il a droit, sans fuite ni perte :

1. Son identité dans la partie, son rôle, ses statuts, son état (vivant/prison/mort).
2. La phase courante, le tour, le temps restant **calé sur l'horloge commune**.
3. La Gazette complète (historique public) et son compteur de non-lus.
4. Ses informations privées cumulées : historique de capacité et dénouements, inventaire, indices, lettres, journaux.
5. Ses canaux : chat d'équipe, Conseil des Morts, parloir ouvert le cas échéant.
6. Les modales personnelles **non encore vues** — sans rejouer les anciennes (les événements périmés ou déjà traités sont sautés).
7. Son vote du tour en cours s'il en a un.

## Ce qui doit rester secret jusqu'à la fin

- Les rôles de tous les joueurs non révélés par une règle (exécution, autopsie privée, enquêtes).
- Les votes individuels — **à jamais**, même après la fin (`DÉDUIT` : aucune révélation observée).
- L'identité des auteurs d'actions (qui a protégé, qui a attaqué sans succès, qui est le Geôlier/le Parieur/le Conjuré/le Facteur/l'Armurier — anonymats de conception).
- La distinction Juge/Corrupteur d'une libération.
- Les moyens de survie (protection, vie du Chat côté cible, parade) vis-à-vis de l'attaquant.

## Risques de révélation prématurée identifiés

| Risque | Nature | Statut |
|---|---|---|
| **Lecture technique des rôles** | Les données de rôle de tous les joueurs sont transmises à chaque appareil ; l'interface les masque mais un joueur outillé peut les lire. | `CONFIRMÉ` — faiblesse connue, à traiter dans la future étude technique ([19](19-dossier-pour-etude-technique.md)). |
| **Regard par-dessus l'épaule** | Jeu en présentiel : l'écran voisin est lisible. | Contré par conception : consignes répétées, écran de capacité sous « maintiens pour révéler », re-masquage automatique en arrière-plan, écran de garde neutre sans rôle. `CONFIRMÉ` |
| **Fuite par hiérarchie visuelle** | Un affichage différencié pourrait trahir un rôle. | Règle produit : interdit ; l'écran masqué est identique pour tous les rôles. `CONFIRMÉ` |
| **Fragments d'indices vs couvertures** | Un fragment « rôle exact » reflète la composition réelle, pas la couverture d'un Usurpateur : il peut sembler contredire une enquête trompée. | `CONFIRMÉ` — tension de conception signalée, non tranchée. |
| **Suivi de lecture local** | Le « lu/non-lu » des annonces est propre à l'appareil (non synchronisé) : un joueur changeant d'appareil revoit des badges. | `CONFIRMÉ` — cosmétique. |
