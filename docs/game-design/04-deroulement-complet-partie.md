# 04 — Déroulement complet d'une partie

Chronologie fonctionnelle, de la création à la sortie. Pour chaque étape : acteur, informations visibles, actions autorisées/interdites, validations, déclencheurs, conséquences, transitions et blocages possibles.

## 1. Création de la session

- **Acteur** : le futur hôte.
- **Déroulé** : saisie d'un pseudo (10 caractères max), puis **choix du mode** :
  - **Mode MJ** — le créateur pilote la partie sans jouer (narration + rythme) ; le rôle de MJ est transférable ensuite.
  - **Mode Joueur Only** — pas de MJ ; le créateur paramètre puis reçoit un rôle comme les autres (« lead » de table).
- **Résultat** : une partie est créée avec un **code à 6 caractères** généré automatiquement ; l'hôte arrive au salon.
- **Blocages** : échec de création signalé par un message d'erreur ; l'utilisateur peut réessayer.

## 2. Arrivée des joueurs

- **Acteurs** : les joueurs invités.
- **Entrées possibles** : saisie du code + pseudo depuis l'accueil ; lien/URL direct de la partie (avec alors une étape « choisis ton pseudo ») ; bandeau « Reprendre » si une partie a été rejointe dans les dernières 24 h.
- **Identification** : chaque participant est identifié par une identité de session anonyme propre à son appareil — pas de compte, pas de mot de passe. Le pseudo est mémorisé localement et pré-rempli. `CONFIRMÉ`
- **Informations visibles au salon** : code de partie (copiable), mode (MJ / Joueur Only), liste des joueurs (avatar + pseudo, marqueur « toi », couronnes Lead/MJ), compteur « N / cible » avec jauge, durées de phases, résumé de la composition.
- **Actions joueur** : choisir un **avatar** ; attendre.
- **Actions réservées à l'hôte** : régler les **durées** (Enquête, Débat, Vote — pas l'Annonce), configurer le **pool de rôles** et les **bans**, activer la **variante Suspicion**, **transférer** le rôle de lead/MJ, **exclure** un joueur ; en environnement de développement uniquement : gérer des bots.
- **Interdits** : personne ne voit de rôle (aucun n'est attribué) ; les non-hôtes voient la configuration en lecture seule.
- **Partie introuvable** : code invalide → message et retour à l'accueil.

## 3. Vérifications avant lancement

- **Condition de lancement** : l'effectif doit être **exactement égal à la cible** configurée (6 à 20). Le bouton du lead affiche sinon « Encore N joueur(s) » ou « Trop de joueurs ». `CONFIRMÉ`
- En Mode MJ, le MJ **n'est pas compté** dans l'effectif joueur.
- **Garde-fous de composition** : rôles socles non bannissables ; impossible de bannir le dernier rôle d'un type exigé par un slot ; un slot automatique sans candidat possible est signalé en erreur. En dernier recours, le tirage complète avec n'importe quel rôle éligible pour toujours atteindre l'effectif.
- **Blocages** : sans lead présent, personne d'autre ne peut lancer (« En attente du lead pour lancer… »). Le comportement si le lead ne revient jamais est un cas limite — voir [14-etats-erreurs-et-cas-limites.md](14-etats-erreurs-et-cas-limites.md).

## 4. Attribution des rôles

- **Déclencheur** : le lead appuie sur « Lancer la partie ».
- **Effets** :
  1. Tirage de la composition (slots verrouillés + tirages automatiques pondérés, bans respectés) et **attribution secrète** d'un rôle à chaque joueur.
  2. Application des **effets d'installation (setup)** : distribution des **indices** (dont fragments), armes de départ (couteau du Cuisinier…), désignations imposées (protégé de l'Ange Gardien, cible du Paranoïaque), propositions initiales (être cher du Vengeur…), et désignation secrète du futur **Chasseur de Vampire** si un Vampire est en jeu.
  3. La partie passe en **salle d'attente** : rôles distribués, chronos non armés.
- **Interdits** : plus personne ne rejoint par le flux normal du salon (l'arrivée tardive en cours de partie est un cas à part — `À CONFIRMER`, voir [14](14-etats-erreurs-et-cas-limites.md)).

## 5. Présentation des informations privées (fiche de rôle)

- **Acteur** : chaque joueur.
- **Écran** : décompte cinématique « RÉVÉLATION 3-2-1 », consigne « Cache ton écran des autres joueurs », puis **Dossier confidentiel** : nom du rôle, faction, type, fréquence d'usage (charges ou barème selon la taille de table), texte de capacité, **subtilités** en pages à faire défiler, condition de victoire.
- **Information de faction** : un Méchant voit la **liste de ses alliés** (rôles compris). Un Vampire connaît son clan. `CONFIRMÉ`
- **Validation** : bouton « **Entrer dans la partie** · N/total ». Après validation : « En attente des autres… ».
- **Règle de départ** : le tour 1 ne démarre que lorsque **tous les joueurs humains vivants** ont validé (les bots comptent prêts). La bascule est unique et sûre même si plusieurs appareils la déclenchent en même temps ; **aucun hôte n'est requis** pour démarrer. `CONFIRMÉ`
- **Blocage possible** : un joueur qui ne valide jamais bloque le démarrage — voir [14](14-etats-erreurs-et-cas-limites.md).

## 6. Début de partie et répétition des tours

Le tour 1 commence par l'Enquête. Ensuite, chaque tour répète les 4 phases (détail par phase dans [05-phases-et-transitions.md](05-phases-et-transitions.md)) :

### 6.1 Enquête (fenêtre d'action)
- Chaque vivant libre peut jouer **sa capacité** (selon ses limites) et **un objet**. Les actions sont enregistrées comme intentions ; rien n'est visible publiquement.
- Les Méchants voient la cible désignée par le Tueur (bandeau d'équipe).
- Un joueur bloqué (chantage, sabotage, ivresse, manipulation, garde) voit sa capacité coupée — et, pour la plupart des blocages, ses objets aussi (`À CONFIRMER` pour l'uniformité exacte, voir [07](07-actions-pouvoirs-et-interactions.md) §Blocages).
- En Mode MJ, le MJ voit qui a joué et peut clore l'Enquête ; les retardataires reçoivent des choix automatiques là où la règle l'impose.

### 6.2 Annonce (dénouement)
- Le jeu résout toutes les intentions (protections → attaques → contagions), confirme les **morts différées**, applique les libérations programmées et le poison létal différé, puis publie la **Gazette** : morts (pseudo + faction seule, ou « effacé »), emprisonnements/libérations, événements anonymes.
- Les joueurs concernés reçoivent leurs **modales privées** (mort, survie à un danger, morsure, éveil du Chasseur…), après la transition.
- Chaque joueur voit le **dénouement de sa propre capacité** (réussite/échec/en cours), sans que le mécanisme de survie adverse lui soit révélé.

### 6.3 Débat
- Temps social pur à la table. L'application n'offre aucune action de phase ; consultation libre (Annonces, mur des suspicions, inventaire, aide).

### 6.4 Vote
- Chaque vivant libre vote secrètement pour un joueur, peut changer jusqu'à la clôture, ou s'abstenir. Morts et prisonniers ne votent pas (écran d'exclusion). En **variante Suspicion**, aucun vote manuel : dépouillement automatique des murs de suspicions.
- **Clôture** : le plus voté part **en prison**. Égalité en vote classique : tranchée **au sort** ; en variante Suspicion : **personne**. L'écran de verdict (~8 s) l'annonce à tous — jamais le rôle ni la faction du condamné.
- **Exception dramatique** : condamner le **Saint** met fin à la partie immédiatement (victoire des Méchants).

## 7. Éliminations et changements d'état en cours de tour

- **Morts pendant l'Enquête** : différées jusqu'à l'Annonce (le frappé continue de jouer sans le savoir).
- **Morts pendant Débat/Vote** (rares : exécution, cascades) : immédiates.
- **Cascades de mort** : autopsie du Médecin légiste ; l'amoureux lié suit son partenaire dans la mort ; le Vengeur reçoit son arme si son être cher tombe ; succession du Tueur/Stratège (un acolyte hérite) et de la morsure (un converti hérite).
- **Emprisonnement** : peut aussi survenir hors vote (aucun cas observé hors vote — les entrées en prison observées viennent du vote). `À CONFIRMER`
- **Conversion** : un mordu rejoint le clan des Vampires (son rôle d'origine reste actif, sa condition de victoire change).

## 8. Vérification des conditions de fin

- Testées **en continu** : après chaque mort immédiate, après la confirmation des morts différées, après conversion et empoisonnement — dans l'ordre de priorité décrit en [10](10-victoire-defaite-et-fin-de-partie.md).
- Dès qu'une condition est vraie : la partie s'arrête **immédiatement**, même en cours de phase ; les intentions non résolues sont annulées.

## 9. Révélation finale et résultats

- **Écran de fin** commun, thématisé au camp vainqueur : emblème, titre (« Les Civils l'emportent », « Le Pyromane embrase le manoir »…), panneau « **Vainqueurs · Rôles révélés** » (avatars, rôles, mentions « Converti·e », co-vainqueurs), et l'explication de la victoire.
- Cas « aucun vainqueur » : écran de clôture neutre « Aucun camp ne l'emporte ».
- Les rôles des **perdants** ne sont pas listés sur cet écran — seule la carte des vainqueurs est détaillée. `À CONFIRMER` (une révélation générale de tous les rôles n'a pas été observée).

## 10. Sortie et nouvelle partie

- Bouton « **Nouvelle enquête** » → retour à l'accueil. Rejouer = créer/rejoindre une nouvelle partie (pas de relance de la même session avec les mêmes joueurs en un geste — `NON DOCUMENTÉ`).
- Revenir dans une partie **terminée** raffiche directement l'écran de fin ; la reprise automatique ne propose plus cette partie.
- La partie est **effacée automatiquement** ~30 minutes après sa fin (et toute partie est effacée 4 h après son lancement, quel que soit son état) — comportement d'application. `CONFIRMÉ`

## Situations de blocage transverses

Voir [14-etats-erreurs-et-cas-limites.md](14-etats-erreurs-et-cas-limites.md) : joueur qui n'entre jamais en partie, lead absent au salon, partie « zombie », déconnexions, retours en arrière-plan, etc.
