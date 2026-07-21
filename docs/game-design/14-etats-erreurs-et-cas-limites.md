# 14 — États, erreurs et cas limites

Pour chaque cas : condition d'apparition, effet actuel observable, comportement attendu (si identifiable), information à montrer, règles nécessaires, certitude.

## Avant la partie

| Cas | Condition | Effet observable | Comportement attendu / règles | Certitude |
|---|---|---|---|---|
| **Salon vide / abandonné** | Partie créée, personne ne rejoint ou tous partent | Le salon persiste ; purge d'office 4 h après création | Purge automatique suffit ; aucune alerte spécifique | `CONFIRMÉ` |
| **Code invalide** | Saisie d'un code inexistant | Message « Partie introuvable » + retour accueil | OK tel quel | `CONFIRMÉ` |
| **Effectif ≠ cible** | Trop ou pas assez de joueurs | Lancement impossible, bouton explicite (« Encore N… » / « Trop de joueurs ») | L'hôte ajuste la cible ou attend ; l'exclusion permet de réduire | `CONFIRMÉ` |
| **Lead absent au salon** | Le seul habilité à lancer ne revient pas | Les autres voient « En attente du lead pour lancer… » sans recours | **Manque identifié** : aucun transfert automatique du lead n'a été observé ; règle à définir (transfert manuel existe si le lead est là — paradoxe) | `À CONFIRMER` |
| **Bans asséchant un type requis** | L'hôte tente de bannir le dernier rôle d'un type exigé | Refus avec message explicatif ; slot en erreur visible | Garde-fou + filet de tirage de dernier recours | `CONFIRMÉ` |
| **Attribution impossible** | Pool incohérent malgré tout | Filet : complétion avec n'importe quel rôle éligible pour atteindre l'effectif | Toujours une composition jouable | `CONFIRMÉ` |

## Démarrage

| Cas | Condition | Effet observable | Comportement attendu / règles | Certitude |
|---|---|---|---|---|
| **Joueur qui ne valide jamais sa fiche** | Rôles distribués, un humain n'appuie pas sur « Entrer dans la partie » | Le tour 1 ne démarre pas (attente de tous les humains vivants) | **Manque identifié** : aucun délai limite ni forçage observé — règle à définir (délai, exclusion, démarrage forcé par le lead) | `À CONFIRMER` |
| **Déconnexion avant validation** | Un joueur ferme l'application en salle d'attente | Même blocage que ci-dessus tant qu'il ne revient pas | Idem | `À CONFIRMER` |
| **Double déclenchement du démarrage** | Plusieurs appareils constatent « tous prêts » en même temps | Bascule atomique : un seul l'emporte | OK par conception | `CONFIRMÉ` |

## En cours de partie

| Cas | Condition | Effet observable | Comportement attendu / règles | Certitude |
|---|---|---|---|---|
| **Action sans cible valide** | Cible morte/emprisonnée au moment de résoudre | Intention annulée proprement ; consommables engagés perdus (fioles) | OK — voir RES-03/08 | `CONFIRMÉ` |
| **Action reçue en retard** | Enregistrement après la clôture de la fenêtre | Non établi | Règle à définir : refus explicite ou report — voir RES-21 | `À CONFIRMER` |
| **Action répétée / double-tap** | Deux envois quasi simultanés du même choix | Remplacement (vote) ou refus par quota (capacités) ; jamais de double effet | OK | `CONFIRMÉ` |
| **Vote incomplet** | Des votants ne s'expriment pas | Le dépouillement se fait sur les bulletins exprimés ; zéro bulletin → personne | OK | `CONFIRMÉ` |
| **Égalité au vote** | Ex æquo en tête | Classique : tirage au sort annoncé ; variante Suspicion : personne | OK (asymétrie voulue, signalée AMB-R2) | `CONFIRMÉ` |
| **Joueur éliminé pendant la résolution de son action** | L'auteur d'un poison/morsure/pacte meurt dans le même lot | Son effet de couche 3 est annulé (« le kill prime ») ; ses attaques de couche 2 déjà valides s'appliquent | OK — RES-11 | `CONFIRMÉ` |
| **Mort différée qui agit encore** | Un condamné (frappé en Enquête) joue avant l'Annonce | Ses actions sont acceptées puis filtrées par les règles (ex. il ne riposte plus, ses contagions tombent) ; il meurt à l'Annonce | Comportement voulu (il ne « sait pas » qu'il est mort) | `CONFIRMÉ` |
| **Changement de phase pendant une interaction** | Le joueur est en train d'agir quand la phase bascule | L'interface bascule (retour aux Annonces) ; l'action non envoyée est perdue | Acceptable ; message d'échec si l'envoi arrive hors phase | `DÉDUIT` |
| **Victoire détectée en cours de résolution** | Une mort intermédiaire remplit une condition | Fin immédiate, intentions restantes annulées | OK — CV-00 | `CONFIRMÉ` |
| **Hôte/MJ déconnecté en partie** | Mode Joueur Only : aucun impact (avancement autonome). Mode MJ : plus personne ne fait avancer les phases | Joueur Only : OK. Mode MJ : **manque identifié** — pas de mécanisme observé de reprise du rythme (transfert MJ observé au salon seulement) | `À CONFIRMER` (Mode MJ) |
| **Tous les téléphones en veille** | Table absorbée par le débat | Les phases avancent quand même (arbitrage côté service) ; au réveil, rattrapage automatique | OK | `CONFIRMÉ` |
| **Partie bloquée sans issue** | Plus d'attaquants vivants, personne ne peut gagner | Filet « dernier survivant » ne couvre que N=1 ; à N≥2 sans menace, la victoire civile (condition 7) couvre la plupart des cas ; résidu théorique : configurations neutres non résolubles | Purge d'ancienneté (4 h) en dernier recours ; à examiner en équilibrage | `DÉDUIT` |
| **Informations contradictoires perçues** | Ex. indice « X est le Policier » vs enquête voyant X autrement (couverture, falsification) | Les deux informations coexistent ; le jeu ne les réconcilie pas (matière à déduction) | Signalé comme tension de conception (fragments vs couvertures) | `CONFIRMÉ` |
| **Prisonnier au moment d'une libération et d'une exécution le même tour** | Juge/Corrupteur et Exécuteur visent le même détenu | Non établi : l'exécution est immédiate (Enquête), la libération s'applique au basculement de tour — l'ordre implicite favorise l'exécution | Règle de priorité à écrire noir sur blanc | `DÉDUIT` |
| **Duel de dés à rallonge** | Égalités répétées | Relances automatiques (bornées très haut) | OK | `CONFIRMÉ` |

## Connexion et sessions

| Cas | Condition | Effet observable | Comportement attendu / règles | Certitude |
|---|---|---|---|---|
| **Déconnexion d'un joueur en partie** | Réseau perdu, application fermée | La partie continue ; ses absences de choix suivent les règles ; état intact à son retour | OK ; signalement de l'absence aux autres : non prévu | `CONFIRMÉ` / `NON DOCUMENTÉ` (signalement) |
| **Reconnexion** | Retour au premier plan / réouverture | Resynchronisation automatique complète (horloge, phase, état, historiques) ; modales périmées sautées | OK | `CONFIRMÉ` |
| **Doublon de session** | Même joueur sur deux appareils | Aucun comportement défini observé | Règle à définir (dernier appareil gagnant ? refus ?) | `NON DOCUMENTÉ` |
| **Abandon définitif** | « Quitter la partie » confirmé | Le joueur sort ; devenir de son personnage non établi | Règle à définir (mort automatique ? absent permanent ?) | `À CONFIRMER` |
| **Arrivée en retard (late-join)** | Rejoindre une partie déjà lancée | L'entrée est possible (choix de pseudo) ; la règle de jeu appliquée à l'arrivant n'est pas établie | Règle à définir et à documenter | `À CONFIRMER` |
| **Retour dans une partie terminée** | Réouverture après la fin | Écran de fin directement ; la reprise automatique ne la propose plus ; partie effacée ~30 min après la fin | OK | `CONFIRMÉ` |
| **Retour après purge** | Réouverture après effacement | « Partie introuvable » | Message adapté (« partie expirée ») serait préférable — amélioration | `DÉDUIT` |

## Règles à écrire pour éviter des incohérences (synthèse)

1. **Délai limite de validation des fiches** au démarrage (+ pouvoir de forçage du lead).
2. **Transfert du lead** quand le lead est absent au salon ; **relais du rythme** quand le MJ disparaît en Mode MJ.
3. **Sort du personnage** d'un joueur qui quitte définitivement — et son interaction avec les conditions de victoire.
4. **Late-join** : règle complète (rôle, limites, information reçue).
5. **Doublon de session** : politique explicite.
6. **Priorité libération vs exécution** le même tour.
7. **Actions tardives** : refus ou report, formulé.
