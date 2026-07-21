# 12 — Session live et synchronisation

Comportement **fonctionnel attendu** d'une partie interactive en direct (6 à 20 joueurs dans la même pièce, chacun sur son téléphone). Ce document exprime des **résultats attendus**, jamais des moyens techniques. Les valeurs chiffrées observées dans le produit actuel sont données comme références de comportement, pas comme prescriptions.

## 1. Cohérence de l'état de partie

- **EXG-SYNC-01** — Tous les participants voient **le même état de partie** : même phase, même tour, même liste de vivants/prisonniers/morts, même Gazette. Les divergences transitoires doivent se résorber en quelques secondes au plus.
- **EXG-SYNC-02** — Il existe une **source d'autorité unique** de l'état (phase courante, horodatage de début de phase, verdicts, morts, vainqueur). Les appareils n'affichent que des projections de cette source ; aucun appareil n'est propriétaire de la vérité.
- **EXG-SYNC-03** — Les **comptes à rebours** sont calculés sur une **horloge commune de référence** (pas l'horloge locale des téléphones, qui dérive). Comportement observé : l'écart local/référence est mesuré à l'entrée puis re-mesuré périodiquement et à chaque réveil de l'application.

## 2. Avancement des phases

- **EXG-SYNC-04** — Les phases avancent **même si tous les téléphones sont verrouillés ou en arrière-plan** : l'avancement est arbitré côté service, indépendamment des clients (comportement observé : contrôle périodique ~5 s).
- **EXG-SYNC-05** — Une transition de phase est **exécutée exactement une fois**, quel que soit le nombre d'acteurs (appareils, service, boutons du MJ) qui la réclament au même instant : verrou d'exclusion mutuelle obligatoire. Une double exécution provoquerait des dénouements en double (morts, verdicts) — inacceptable.
- **EXG-SYNC-06** — Après une inactivité générale, le **rattrapage** de plusieurs transitions dues se fait d'un bloc, borné, et aboutit à l'état réellement courant.
- **EXG-SYNC-07** — Le **démarrage du tour 1 est synchronisé** : rôles distribués d'abord, chronos armés seulement quand tous les joueurs humains ont validé leur fiche ; la bascule est atomique (un seul déclencheur l'emporte) et ne requiert aucun hôte connecté.
- **EXG-SYNC-08** — La **frontière exacte** d'une phase (fin de transition d'intro, fin de chrono, fin de verdict) est identique pour tous : le temps « réservé » aux écrans de transition est rigoureusement égal côté autorité et côté affichage.

## 3. Propagation des actions et des événements

- **EXG-SYNC-09** — Une action de joueur suit trois états distincts : **envoyée** (le joueur a agi), **acceptée** (l'autorité l'a validée : préconditions du moment, quotas), **résolue** (le dénouement est calculé, à l'Annonce pour les effets différés). Le joueur voit immédiatement l'acceptation (accusé, « En cours ») et plus tard la résolution.
- **EXG-SYNC-10** — **L'ordre officiel des événements** est celui de l'autorité (tri par tour, couche, ancienneté — voir [09](09-regles-resolution-et-priorites.md)). L'affichage chronologique public (Gazette) respecte un ordre canonique par phase du tour.
- **EXG-SYNC-11** — Les changements d'état (morts, statuts, prison, objets, fin de partie) se **propagent en continu** à tous les appareils concernés sans action de l'utilisateur, dans le respect strict des règles de visibilité ([08](08-information-secrete-et-visibilite.md)).

## 4. Prévention des doubles actions et actions simultanées

- **EXG-SYNC-12** — **Un vote effectif par joueur et par tour** : un nouveau vote remplace l'ancien atomiquement ; l'éligibilité du votant (vivant, libre) est revérifiée par l'autorité à chaque enregistrement.
- **EXG-SYNC-13** — Les **quotas de capacités** (usages par tour/partie, alternances imposées, budgets) sont appliqués par l'autorité, pas seulement par l'interface : une action hors quota est refusée proprement avec un message.
- **EXG-SYNC-14** — Deux actions **quasi simultanées** (deux joueurs, ou double-tap d'un même joueur) ne produisent jamais un double effet : idempotence des résolutions, verrous sur les transitions, remplacement (et non addition) des choix répétés.
- **EXG-SYNC-15** — Les actions **contradictoires** entre joueurs ne sont pas arbitrées à l'arrivée mais à la **résolution**, par les règles de priorité (couches, ordres internes) — le moment d'envoi dans la fenêtre d'Enquête ne doit pas donner d'avantage, à règles égales (seule l'ancienneté départage au sein d'une même couche).

## 5. Délais et comptes à rebours

- **EXG-SYNC-16** — Le chrono affiché est **le même à la seconde près** sur tous les appareils (dérive perçue < 1 s — métrique à confirmer).
- **EXG-SYNC-17** — Le chrono d'une phase **ne démarre qu'après** son écran de transition ; l'Annonce démarre immédiatement (pas de transition).
- **EXG-SYNC-18** — En Mode MJ, le temps est **informatif** (chrono montant) : aucune échéance automatique ; les seuils configurés servent de repère visuel.

## 6. Hôte, MJ et joueurs : rôles de synchronisation

- **EXG-SYNC-19** — En mode Joueur Only, **aucun participant n'est indispensable** au déroulement : l'avancement ne dépend d'aucun appareil particulier (l'élection d'un éventuel « pilote » entre appareils doit être automatique, déterministe et se rétablir seule si le pilote disparaît ou s'endort).
- **EXG-SYNC-20** — En Mode MJ, seul le MJ commande les transitions ; ses commandes passent par le même verrou que l'avancement automatique.

## 7. Reconnexions, pertes de connexion, doublons

- **EXG-SYNC-21** — Au **retour au premier plan** (onglet réactivé, application rouverte, réseau revenu), l'appareil se resynchronise **immédiatement et automatiquement** : horloge, phase, état complet, sans intervention du joueur.
- **EXG-SYNC-22** — Une **perte temporaire de connexion** ne pénalise pas le joueur : son état de jeu est intégralement conservé côté autorité ; il ne perd que ce que ses absences de choix impliquent selon les règles.
- **EXG-SYNC-23** — La **récupération d'état** d'un reconnecté comprend l'état courant + l'historique utile + les notifications non traitées, en filtrant les événements périmés (pas de rejeu de vieilles modales) — et jamais plus que ce que ses droits de visibilité autorisent.
- **EXG-SYNC-24** — **Identité stable** : un joueur est reconnu à son retour (même appareil) sans compte ni mot de passe ; son identité de session le relie à son personnage. Le cas « même joueur sur deux appareils » (doublon de session) n'a pas de comportement défini observé — `NON DOCUMENTÉ`, à spécifier (voir [18](18-questions-et-incertitudes.md)).
- **EXG-SYNC-25** — **Abandon définitif** : geste explicite avec confirmation ; la partie continue pour les autres. Le devenir du personnage abandonné est `À CONFIRMER`.
- **EXG-SYNC-26** — **Remplacement d'un joueur** : non prévu — `NON DOCUMENTÉ`.

## 8. Reprise d'une partie interrompue

- **EXG-SYNC-27** — Une partie dont **tous** les participants se déconnectent doit rester reprenables : l'état complet survit côté autorité ; les phases continuent d'avancer (ou la partie atteint sa purge d'ancienneté).
- **EXG-SYNC-28** — Le produit propose une **reprise en un geste** de la dernière partie récente (< 24 h), tant qu'elle n'est pas terminée.
- **EXG-SYNC-29** — Les parties terminées ou trop anciennes sont **purgées automatiquement** (observé : ~30 min après la fin ; 4 h après le lancement quel que soit l'état) — la reprise n'est donc garantie que dans cette fenêtre.

## 9. Protection des informations secrètes en direct

- **EXG-SYNC-30** — La propagation temps réel **ne doit jamais** servir plus d'information qu'autorisé par [08](08-information-secrete-et-visibilite.md). État observé : le produit actuel transmet à chaque appareil des données de rôle qu'il masque à l'affichage — **c'est une faiblesse reconnue**, et l'exigence cible est que chaque participant ne **reçoive** que ce qu'il a le droit de voir.
- **EXG-SYNC-31** — Les canaux privés (équipe, morts, parloir, MJ) sont **cloisonnés** : l'écriture y est réservée aux ayants droit et refusée aux autres, côté autorité.

## 10. Stabilité sous rafales

- **EXG-SYNC-32** — Le système reste cohérent quand tous les joueurs agissent **dans la même fenêtre de quelques secondes** (fin d'Enquête, clôture de vote) : aucune perte d'action acceptée, aucun double effet, verdict unique.
- **EXG-SYNC-33** — La charge de présence et de diffusion croît avec le carré du nombre de participants ; le comportement doit rester fluide à 20 joueurs (cadences de présence et de diffusion dimensionnées en conséquence — valeurs observées : battement ~5 s, péremption ~13 s).
