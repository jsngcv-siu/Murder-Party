# 07 — Actions, pouvoirs et interactions

Ce document liste **toutes les actions possibles** (capacités, objets, actions génériques), leurs règles de validation, puis une **matrice croisée** rôles × actions × phases × cibles × résultats. Les fiches détaillées par rôle sont dans [06](06-joueurs-factions-et-roles.md) ; l'ordre de résolution dans [09](09-regles-resolution-et-priorites.md).

## Règles générales des actions `CONFIRMÉ`

| Règle | Contenu |
|---|---|
| **ACT-01** | Toute capacité **active** se joue pendant la **phase Enquête** uniquement. Le Débat et le Vote ne portent aucune capacité. |
| **ACT-02** | Les effets létaux, protecteurs et contagieux sont **différés** : enregistrés comme intentions, résolus à l'Annonce. Les capacités de pure information répondent immédiatement (au moment du clic). |
| **ACT-03** | Les **objets** ne s'utilisent que pendant l'Enquête, **1 objet par joueur et par tour**. La consultation (indices, lettres reçues) est libre à tout moment. |
| **ACT-04** | **Préconditions revérifiées à la résolution** : acteur vivant et non emprisonné, cible vivante (si requise), objet toujours possédé. Une intention dont la précondition échoue est annulée — mais une fiole engagée est **consommée même si l'action échoue**. |
| **ACT-05** | **Blocage** (chantage, sabotage, ivresse, manipulation, garde de la Babysitter) : la capacité de rôle est coupée pour le tour indiqué. À la résolution, un blocage annule les intentions issues **d'un rôle**, jamais celles issues **d'un objet** ; côté interface, l'écran de capacité bloqué annonce cependant « capacité **et objets** inutilisables » — `CONTRADICTOIRE` (nuance signalée, non tranchée). |
| **ACT-06** | **Choix obligatoires au tour 1** : couverture de l'Usurpateur, être cher du Vengeur, prophétie de l'Oracle, cible du Mouchard — choisis automatiquement au hasard si non validés à la fin de la première Enquête. |
| **ACT-07** | Une action enregistrée pendant l'Enquête peut être **remplacée** tant que la phase est ouverte lorsque la règle du rôle le permet (ex. re-ciblage) ; le vote est toujours modifiable jusqu'à la clôture. `À CONFIRMER` pour l'uniformité du re-ciblage des capacités. |
| **ACT-08** | **Cible devenue invalide** entre l'action et la résolution (morte, emprisonnée) : l'intention est annulée proprement (ACT-04). Une attaque sur une cible déjà morte est annulée (l'éventuelle fiole reste consommée). |
| **ACT-09** | Toute action laisse une **trace fonctionnelle** : historique personnel de capacité (avec dénouement), journal des objets, journal des visiteurs (si la cible était surveillée), vision omnisciente du MJ. |
| **ACT-10** | Le **dénouement** d'une action différée est rapporté à son auteur à l'Annonce : réussite, échec (« ta cible a survécu » — sans révéler le mécanisme de survie), ou information neutre. |

## Actions génériques (tous joueurs)

| Action | Qui | État requis | Phase | Cible | Règles |
|---|---|---|---|---|---|
| **Voter** | Vivant libre | — | Vote | Un vivant libre | 1 vote effectif ; dernier choix retenu ; abstention possible ; secret. |
| **Utiliser un objet** | Vivant libre (le Passe-partout s'utilise **en prison**) | Non bloqué (voir ACT-05) | Enquête | Selon l'objet | 1 objet/tour ; voir catalogue ci-dessous. |
| **Écrire/mettre à jour son testament** | Vivant | — | Toutes | Soi | Révélé publiquement à la mort. |
| **Marquer son mur des suspicions** | Tous (utile aux vivants et prisonniers) | — | Toutes | Chaque joueur | Privé ; espionnable ; décisif en variante Suspicion. |
| **Répondre à un pacte** (Conjuré) | Le complice sollicité | Vivant libre | Enquête | — | Accepter (la victime mourra) ou refuser ; sollicitation anonyme. |
| **Parler au parloir** | Prisonnier sollicité + Geôlier | — | Enquête (le tour ouvert) | — | Chat éphémère anonyme côté Geôlier. |
| **Chatter (équipe Méchante)** | Méchants vivants | — | Toutes | — | Canal privé d'équipe. |
| **Chatter (Conseil des Morts)** | Morts | — | Toutes | — | Le Médium vivant lit sans écrire. |
| **Envoyer une lettre reçue** | Détenteur d'une lettre vierge | Vivant libre | Enquête | Un joueur | ~80 caractères ; arrive **signée** de l'expéditeur. |

## Catalogue des objets

| Objet | Origine | Usage | Effet | Notes |
|---|---|---|---|---|
| **Couteau** | Cuisinier (setup), Vengeur (déblocage), Armurier (don anonyme), Vautour (`À CONFIRMER`) | 1× | Kill différé à l'Annonce, silencieux | La « couleur » d'origine (civile/méchante) conditionne l'effacement Cleaner et l'échange Majordome. |
| **Fiole de Vie** | Apothicaire | 1× | Protection/soin jusqu'à l'Annonce ; nettoie un poison | Utilisable sur soi. |
| **Fiole de Mort** | Apothicaire | 1× | Kill différé sans trace | Consommée même si l'attaque échoue. |
| **Fiole de Clairvoyance** | Apothicaire | 1× | Révèle la **faction apparente** d'une cible | Trompée par couvertures/camouflages ; falsifié → « falsifié ». |
| **Lettre** | Facteur (et contrefaçon du Ventriloque) | 1× | Message ~80 car., livré **signé** | Aucun effet mécanique. |
| **Indice / fragment** | Distribution de début de partie | Consultation | Information vraie sur la composition | Le fragment nécessite de retrouver l'autre moitié **à la table**. |
| **Passe-partout** | Malle du Contrebandier | 1× | **Évasion immédiate** — utilisable uniquement en cellule | Seul objet actionnable en prison. |
| **Gilet matelassé** | Malle | 1× | Protection (bloque la prochaine attaque du tour visé) | Fenêtre légèrement différente du Médaillon — `À CONFIRMER` l'intention. |
| **Rhum de contrebande** | Malle | 1× | La cible est **ivre** au tour suivant (capacité coupée) | Ne cumule pas avec un blocage déjà actif. |
| **Monocle du douanier** | Malle | 1× | Voit l'**inventaire complet** d'un joueur | — |
| **Double-fond** | Malle | Passif | Le premier vol subi échoue (le Double-fond est sacrifié) | — |
| **Reliques** | Conservateur | Selon relique | Cœur du Manoir = victoire immédiate du Conservateur ; Œil = révèle un rôle au hasard ; Médaillon = protection 1 tour ; Lettre scellée = bloque une capacité 1 tour ; autres = inertes | Distribution aléatoire ; garde-fou : le Cœur sans Conservateur en jeu est sans effet. |

## Matrice rôles × actions

Colonnes : **Phase** d'utilisation, **Cible**, **Limite**, **Résolution** (I = immédiate au clic, D = différée à l'Annonce, P = passif permanent, T+1 = effet au tour suivant), **Résultat**.

| Rôle | Action | Phase | Cible | Limite | Rés. | Résultat |
|---|---|---|---|---|---|---|
| Assistant du détective | Trio de rôles | Enquête | 1 joueur | 1×/tour | I | Vrai rôle + 2 leurres (perce les déguisements) |
| Policier | Verdict | Enquête | 1 joueur | 1×/tour | I | Suspect / pas suspect |
| Boussole | Comparaison | Enquête | 2 joueurs | 1×/tour | I | Même camp / opposés |
| Portraitiste / Physionomiste | Lecture de type | Enquête | 1 joueur | 1×/Enquête | I | Type de rôle |
| Guetteur | Surveillance | Enquête | 1 joueur (pas soi) | 1×/tour | I + journal | Journal des visiteurs du tour |
| Journaliste / Cartomancien | Espionnage du mur | Enquête | 1 joueur | 1×/tour | I | Marques de suspicion de la cible |
| Mouchard | Révélation | Enquête | 1 joueur | 1×/partie | I | Rôle exact (déguisements respectés) |
| Avocat | — (passif prison) | — | Prisonniers | P | P | Faction des emprisonnés |
| Archiviste | — (passif écrou) | — | Nouvel emprisonné | P | P | Rôle exact de l'écroué |
| Médecin légiste | — (autopsie) | — | Chaque mort | P | P | Rôle exact du défunt (sauf « effacé ») |
| Médium | — (écoute) | — | Conseil des Morts | P | P | Lecture du chat des morts |
| Majordome | Protection | Enquête | 1 joueur | `À CONFIRMER` | D | Cible sauvée ; échange mortel si attaque méchante |
| Ange Gardien | Bouclier | Enquête | Cible imposée | 1×/partie | D (2 tours) | Attaques annulées, silencieusement |
| Babysitter | Garde | Enquête | 1 joueur | 1×/Enquête | T+1 | Protégé mais bloqué au tour suivant |
| Barman | Tournée | Enquête | 2 joueurs | 1×/Enquête | T+1 | Au hasard : protégé+ivre / « bon moment » |
| Saint | Bénédiction | Enquête | 1 joueur (soi inclus) | 1×/partie | D (2 tours) | Immunité aux actions hostiles ; auteurs révélés au Saint |
| Aubergiste | Chambre | Enquête (1/2) | 1 autre joueur | Une Enquête sur deux | D | Protection ; « on a frappé » si attaque |
| Apothicaire | Fiole (user/offrir) | Enquête | Soi ou autre | ≤1 usage + ≤1 don/partie | D ou I (clairvoyance) | Selon fiole |
| Facteur | Lettre vierge | Enquête | 1 joueur | 1×/Enquête | I | Objet livré anonymement |
| Jardinier | Duplication | Enquête | 1 joueur | 1×/Enquête | I | Copie du dernier objet reçu |
| Contrebandier | — (livraison) | — | Soi | Tous les 2 tours | P | Objet de malle aléatoire |
| Geôlier | Parloir | Enquête | 1 prisonnier | 1×/Enquête | I (1 tour) | Chat anonyme |
| Juge | Libération | Enquête | Prisonnier (≥1 tour purgé) | 1–3 (scalé) | T+1 | Libération annoncée |
| Exécuteur | Exécution | Enquête | Prisonnier (≥1 tour purgé) | 1–3 (scalé) | I | Mort + **rôle révélé publiquement** |
| Cuisinier | (couteau) | Enquête | 1 joueur | 1× | D | Kill silencieux |
| Vengeur | (couteau, si débloqué) | Enquête | 1 joueur | 1× | D | Kill |
| Garde-chasse | Patrouille | Enquête | 1 joueur (pas soi) | 1×/Enquête | D | Tout attaquant de la cible meurt (cible non sauvée) |
| Bretteur | Garde levée | Enquête | Soi | 1–2 (scalé) | D | Pare l'attaque + tue l'attaquant |
| Conjuré | Pacte | Enquête | Complice + victime | 1×/partie | D | Victime tuée si le complice accepte |
| Paranoïaque | Trancher | Enquête | Cible imposée | 1×/partie | D | Protège OU tue |
| Tueur | Frappe | Enquête | 1 joueur | 1×/Enquête | D | Kill ; équipe informée de la cible |
| Croque-mitaine | Double menace | Enquête | 2 joueurs | 1×/Enquête | D | Une cible meurt (hasard), l'autre prévenue |
| Stratège | Mode (3) | Enquête | 1–2 joueurs | 1×/Enquête, jamais 2× le même mode | D / T+1 | Kill(s), fuite d'indice, ou blocage |
| Armurier | Don de couteau | Enquête | 1 joueur | 1×/Enquête | I | Couteau anonyme livré |
| Détrousseur | Frappe / braquage | Enquête | 1 joueur | 1×/Enquête + braquage 1×/partie | D | Kill ; braquage = pille l'inventaire |
| Franc-tireur | Tir / balle perforante | Enquête | 1 joueur | 1×/Enquête + balle 1×/partie | D | Kill ; la balle ignore toutes protections |
| Usurpateur | Choix de couverture | Enquête (T1) | Soi | 1×, verrouillé | I | Fausse identité permanente |
| Accusateur | Marque publique | Enquête | 1 joueur | 1×/Enquête (`DÉDUIT`) | I (1 tour) | « Suspect » visible de tous |
| Falsificateur | Falsification | Enquête | 1 joueur (pas soi) | `À CONFIRMER` | I (permanent) | Toutes enquêtes aveuglées sur la cible |
| Ventriloque | Lettre forgée | Enquête | Signataire + destinataire | 1×/partie | I | Fausse lettre signée |
| Cleaner | Armement de l'effaceur | Enquête | — | 1–2 charges (scalé) | D | Mort méchante « effacée » |
| Maître chanteur | Chantage | Enquête | 1 joueur | 1×/Enquête (`DÉDUIT`) | T+1 | Capacité bloquée, statut visible |
| Marionnettiste | Manipulation | Enquête | 1 joueur (pas le Tueur) | 1×/Enquête (`DÉDUIT`) | T+1 | Contrôle la capacité de la cible |
| Voleur | Vol | Enquête | 1 joueur (vivant ou mort) | 1×/Enquête (`DÉDUIT`) | I | Dernier objet volé |
| Corrupteur | Évasion | Enquête | Prisonnier (≥1 tour) | 1×/partie | T+1 | Libération déguisée en acte du Juge |
| Empoisonneur | Poison | Enquête | 1 joueur | 1×/Enquête | D (cascade) | Statut « empoisonné » permanent |
| Vampire | Morsure | Enquête | 1 non-vampire | 1×/Enquête | D (cascade) | Conversion au clan |
| Chasseur de Vampire | Test / exécution | Enquête | 1 joueur | 1×/tour | I + D | Vampire ? → si oui, mort à l'Annonce |
| Entremetteur | Lien | Enquête (T1) | 2 autres joueurs | 1×/partie | I | Couple d'Amoureux lié |
| Oracle | Prophétie | Enquête (T1) | Famille de factions | 1×/partie | I | Enregistrée pour la co-victoire |
| Imitateur | Copie | Enquête | Dernier mort (imposé) | 1×/partie | I | Devient ce rôle intégralement |
| Parieur tricheur | Duel de dés | Enquête | 1 joueur | Répétable | I (mort D) | Le perdant meurt à l'Annonce |
| Veuve noire | Épousailles | Enquête | 2 joueurs | 1×/Enquête | Conditionnel (vote) | Les 2 époux meurent si l'un vote contre elle |
| Conservateur | Don de relique | Enquête | 1 joueur (pas soi) | 2×/Enquête | I | Relique aléatoire (dont Cœur = victoire) |
| Pyromane | Aspersion / allumette | Enquête | 1 joueur / tous les aspergés | 1×/Enquête ; allumette avec délai de 2 tours | I / D | Marque ; embrasement collectif |
| Photographe mondain | Photo | Enquête | 1 vivant (pas de doublon) | 1×/Enquête | I | Comptabilisée pour la co-victoire |
| Chat du Manoir | — (vie de réserve) | — | Soi | 1× | P | Première attaque absorbée + miaulement public |
| Héritier déchu | Verdict | Enquête | 1 joueur | 1×/tour (`DÉDUIT`) | I | Suspect / pas suspect |
| Vautour | `À CONFIRMER` | Enquête | Joueurs ayant reçu des voix | `À CONFIRMER` | `À CONFIRMER` | `À CONFIRMER` |

## Conflits et interactions remarquables

Traités en détail dans [09-regles-resolution-et-priorites.md](09-regles-resolution-et-priorites.md) :

- **Attaque vs protection vs balle perforante vs parade vs riposte** : ordre strict, voir RES-05 à RES-09.
- **Kill vs contagion** : le kill prime — un Vampire/Empoisonneur mort ce tour n'infecte pas (RES-10/11).
- **Vol vs Double-fond** ; **braquage vs inventaire** ; **duplication vs main vide**.
- **Chantage/sabotage vs objets** : voir ACT-05 (`CONTRADICTOIRE` interface/règle).
- **Corrupteur vs Juge** : indiscernabilité voulue.
- **Falsification vs toutes enquêtes** : priorité absolue de l'aveuglement.
