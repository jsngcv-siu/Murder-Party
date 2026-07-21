# 17 — Matrice des règles

Table de référence consolidée. Colonnes : **Règle** (formulation), **Déclencheur**, **Acteurs**, **Préalable**, **Résultat**, **Exception**, **Source** (observation fonctionnelle), **Cert.** (niveau de certitude), **Docs** (documents liés). Les identifiants sont stables et repris dans les autres documents.

Sources abrégées : *Moteur* = comportement de résolution observable ; *Écran* = textes/écrans joueur ; *Régie* = vue MJ ; *Aide* = textes d'aide et fiches.

## Structure et temps (STR)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| STR-01 | Un tour = Enquête → Annonce → Débat → Vote, ordre fixe, sans retour | Boucle | Tous | Partie en cours | Cycle répété | Fin de partie interrompt | Moteur+Écran | CONFIRMÉ | [03](03-boucle-de-jeu.md), [05](05-phases-et-transitions.md) |
| STR-02 | Enquête/Débat/Vote s'ouvrent par une transition (~3 s) pendant laquelle le chrono ne tourne pas ; l'Annonce démarre sans transition | Entrée de phase | Tous | — | Chrono calé après transition | Annonce | Moteur+Écran | CONFIRMÉ | [05](05-phases-et-transitions.md) |
| STR-03 | Le Vote se clôt par un écran de verdict (~8 s) avant le tour suivant | Clôture du vote | Tous | — | Verdict affiché à tous | — | Écran | CONFIRMÉ | [05](05-phases-et-transitions.md) |
| STR-04 | Durées configurables : Enquête, Débat, Vote (≥25 s) ; Annonce fixe (~10 s) | Salon | Hôte | Avant lancement | Chronos de partie | Mode MJ : rythme manuel | Écran | CONFIRMÉ | [15](15-parametres-variantes-et-equilibrage.md) |
| STR-05 | Les phases avancent sans dépendre d'aucun appareil (arbitrage d'autorité) ; toute transition est exécutée exactement une fois (verrou) | Échéance | Système | Mode Joueur Only | Progression garantie | Pause | Moteur | CONFIRMÉ | [12](12-session-live-et-synchronisation.md) |
| STR-06 | Le tour 1 démarre quand tous les joueurs humains vivants ont validé leur fiche ; bascule atomique, sans hôte requis | Dernière validation | Tous | Salle d'attente | Chrono d'Enquête armé | — | Moteur+Écran | CONFIRMÉ | [04](04-deroulement-complet-partie.md) |

## Composition (COMP)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| COMP-01 | Une partie compte 6 à 20 joueurs ; le lancement exige effectif = cible | Lancement | Hôte | Salon | Tirage des rôles | MJ non compté | Écran | CONFIRMÉ | [15](15-parametres-variantes-et-equilibrage.md) |
| COMP-02 | Proportions de factions fonction du seul nombre de joueurs : Méchants 2/3/4 (≤11 / 12–16 / 17+), Neutres 0/1/2/3 (≤7 / 8–11 / 12–17 / 18+), le reste Civils | Tirage | Système | — | Composition | — | Moteur | CONFIRMÉ | [15](15-parametres-variantes-et-equilibrage.md) |
| COMP-03 | Rôles socles garantis et non bannissables : un Tueur méchant, le Majordome, l'Assistant du détective | Tirage | Système | — | Présence garantie | — | Moteur+Écran | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |
| COMP-04 | Types épinglés : 1 tueur civil garanti partout ; 1 support dès 8 j. ; 2ᵉ tueur civil dès ~16 j. ; 2ᵉ acolyte = trompeur/contrôleur garanti dès 12 j. | Tirage | Système | — | Slots typés | — | Moteur | CONFIRMÉ | [15](15-parametres-variantes-et-equilibrage.md) |
| COMP-05 | Neutres pondérés Bénin ≫ Mal ≫ Chaos, types différents entre neutres d'une même partie | Tirage | Système | — | Diversité neutre | — | Moteur | CONFIRMÉ | [15](15-parametres-variantes-et-equilibrage.md) |
| COMP-06 | Bans respectés avec garde-fous (jamais le dernier rôle d'un type requis) et filet de complétion : le tirage produit toujours l'effectif exact | Tirage | Hôte/Système | — | Composition jouable | — | Moteur+Écran | CONFIRMÉ | [14](14-etats-erreurs-et-cas-limites.md) |
| COMP-07 | Le Chasseur de Vampire n'est jamais tiré : désigné secrètement au setup si un Vampire est en jeu, éveillé à la première morsure | Setup | Système | Vampire présent | Rôle émergent | — | Moteur | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |
| COMP-08 | Des indices vrais sont distribués au setup (≈1 pour 3 joueurs, bornés 2–4, 1 max/joueur ; ~40 % de paires fragmentées) | Setup | Système | — | Information initiale | Jamais l'identité du Tueur en fragment | Moteur | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |

## Actions (ACT) — détail en [07](07-actions-pouvoirs-et-interactions.md)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| ACT-01 | Les capacités actives se jouent uniquement pendant l'Enquête | Phase | Vivants libres | Non bloqué | Action enregistrée | Passifs permanents | Moteur+Écran | CONFIRMÉ | [07](07-actions-pouvoirs-et-interactions.md) |
| ACT-02 | Effets létaux/protecteurs/contagieux différés à l'Annonce ; information immédiate au clic | Enregistrement | Système | — | Intention ou réponse | Exécution immédiate | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| ACT-03 | Objets : Enquête seulement, 1 par joueur et par tour ; consultation libre | Usage | Vivants libres | Objet possédé | Effet ou intention | Passe-partout en prison | Moteur+Écran | CONFIRMÉ | [07](07-actions-pouvoirs-et-interactions.md) |
| ACT-04 | Préconditions revérifiées à la résolution ; fiole engagée consommée même en échec | Résolution | Système | — | Annulation propre | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| ACT-05 | Le blocage annule les intentions issues d'un rôle, pas celles issues d'un objet | Résolution | Système | Statut bloquant | Capacité annulée | Interface annonce l'inverse | Moteur vs Écran | CONTRADICTOIRE | [07](07-actions-pouvoirs-et-interactions.md) |
| ACT-06 | Choix obligatoires du tour 1 tirés au hasard si non validés (couverture, être cher, prophétie, cible du Mouchard) | Fin d'Enquête 1 | Système | Rôle concerné | Choix imposé | — | Moteur | CONFIRMÉ | [07](07-actions-pouvoirs-et-interactions.md) |
| ACT-09 | Toute action laisse une trace (historique joueur, journaux, vue MJ) | Action | Système | — | Traçabilité | — | Écran+Régie | CONFIRMÉ | [16](16-glossaire-des-donnees-fonctionnelles.md) |
| ACT-10 | L'auteur reçoit le dénouement de son action sans le mécanisme de survie adverse | Annonce | Système | — | « Réussi/Échec/En cours » | — | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |

## Résolution (RES) — détail en [09](09-regles-resolution-et-priorites.md)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| RES-02 | Ordre du lot : tour croissant → couche (1 protections, 2 attaques, 3 cascades/conversions) → ancienneté | Annonce | Système | Intentions en attente | Ordre déterministe | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-06 | Riposte de patrouille : tout attaquant d'une cible patrouillée meurt ; la cible n'est pas sauvée | Attaque | Garde-chasse | Patrouille active | Attaquant mort | Garde-chasse mort/condamné ; auto-attaque | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-07 | Parade : le Bretteur en garde pare l'attaque et tue l'attaquant | Attaque | Bretteur | Garde levée | Attaque échoue + attaquant mort | Balle perforante | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-08 | Protection/bénédiction : l'attaque échoue, silencieusement pour la cible ; échange du Majordome sur attaque méchante (attaquant + Majordome meurent) | Attaque | Protecteurs | Bouclier actif | Cible sauvée | Balle perforante | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-09 | Le Chat du Manoir absorbe la première attaque (miaulement public anonyme) | Attaque | Chat | Vie de réserve | Attaque absorbée | Balle perforante | Moteur+Écran | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |
| RES-10 | Mort en Enquête = différée à l'Annonce (la victime joue encore) ; mort en Débat/Vote = immédiate | Kill | Système | — | Timing de mort | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-11 | Le kill prime : morsure/poison d'un auteur mort ou condamné ce tour = annulés ; cible protégée/bénie immunisée | Couche 3 | Système | — | Contagion annulée | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-12 | Conversion : le mordu rejoint le clan (rôle conservé, camp changé) ; 1ʳᵉ morsure = annonce anonyme + éveil du Chasseur | Morsure résolue | Vampire | Cible non-vampire | Converti | Chasseur immunisé ; déjà vampire refusé | Moteur | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |
| RES-14 | Cascades de mort : autopsie → partenaire amoureux meurt → déblocage du Vengeur → successions (Tueur/Stratège/morsure) | Mort confirmée | Système | — | Effets en chaîne | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-15 | Effacement : une mort d'origine méchante peut être « nettoyée » (faction publiée inconnue, autopsie aveuglée), charges 1–2 | Annonce | Cleaner | Effaceur armé | Mort anonymisée | Jamais une mort civile/neutre | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-16 | Emprisonnement : écrou daté ; promotions temporaires (Tueur/Stratège/Vampire) ; dossier à l'Archiviste ; déblocage du Vengeur | Verdict | Système | — | Prisonnier | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-17 | Libération et exécution exigent ≥1 tour complet purgé | Action | Juge/Corrupteur/Exécuteur | Prisonnier | Éligibilité | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-18 | Libération appliquée au début du tour suivant, annoncée ; l'évasion du Corrupteur est indiscernable d'une libération du Juge | Programmation | Système | — | Prisonnier libéré | — | Moteur+Écran | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-19 | Absence de choix : capacité perdue pour le tour (hors choix obligatoires ACT-06) | Fin d'Enquête | Système | — | Rien | — | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| RES-21 | Sort d'une action reçue après la clôture de la fenêtre : non établi | Retard | Système | — | ? | — | — | À CONFIRMER | [14](14-etats-erreurs-et-cas-limites.md) |

## Vote (VOTE)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| VOTE-01 | Le plus voté est emprisonné ; égalité tranchée au sort (annoncée) ; aucun vote → personne | Clôture | Vivants libres | Vote classique | Emprisonnement | — | Moteur+Écran | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| VOTE-02 | Variante Suspicion : agrégation des marques « Suspect » (murs des vivants et prisonniers) ; égalité → personne | Clôture | Système | Variante active | Emprisonnement ou rien | — | Moteur+Écran | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| VOTE-03 | Un vote effectif par joueur/tour, remplaçable, abstention possible ; éligibilité revérifiée par l'autorité | Vote | Vivants libres | — | Bulletin secret | Morts/prisonniers exclus | Moteur | CONFIRMÉ | [09](09-regles-resolution-et-priorites.md) |
| VOTE-04 | Le verdict ne publie ni rôle, ni faction, ni bulletins | Verdict | Système | — | Avarice publique | Exécution (rôle complet) hors vote | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| VOTE-05 | Condamner le Saint = victoire immédiate des Méchants | Verdict | Système | Saint condamné | Fin de partie | — | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| VOTE-06 | Veuve noire : un « époux » qui vote contre elle (ou la marque en variante) condamne les deux époux à la prochaine Annonce | Verdict | Veuve | Épousailles du tour | Double mort différée | — | Moteur | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |

## Information (INFO) — détail en [08](08-information-secrete-et-visibilite.md)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| INFO-01 | Une mort publie pseudo + faction seule — jamais cause, arme, auteur ni moment | Annonce | Public | — | Dépêche avare | « Effacé » masque la faction ; exécution révèle le rôle | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| INFO-02 | Les événements marquants sont annoncés anonymement (morsure, éveil du Chasseur, miaulement, indices) | Événement | Public | — | Dépêche sans nom | — | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| INFO-03 | Doctrine des déguisements : seul l'Assistant perce ; Usurpateur → couverture ; killer-class → « Civil » ; falsifié → illisible pour tous | Enquête (action) | Enquêteurs | — | Réponses trompées | Falsification aveugle aussi l'Assistant | Moteur+Aide | CONFIRMÉ | [06](06-joueurs-factions-et-roles.md) |
| INFO-04 | Le protégé n'apprend jamais qu'il a été sauvé ; l'attaquant apprend seulement l'échec | Résolution | Système | — | Silence du salut | Saint (voit l'auteur), Aubergiste (« on a frappé ») | Moteur | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| INFO-05 | Les anonymats de conception sont garantis : Geôlier, Parieur, Conjuré, Facteur, Armurier, Corrupteur | Actions | Système | — | Identités cachées | — | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| INFO-06 | Le testament est publié à la mort ; les chats sont cloisonnés (équipe, morts+Médium en lecture, parloir) | Événements | Système | — | Canaux réservés | — | Moteur+Écran | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |
| INFO-07 | Les indices sont toujours vrais (état de la composition au setup) et aveugles à la faction du porteur | Setup | Système | — | Information fiable | Ne reflètent pas les couvertures (tension signalée) | Moteur | CONFIRMÉ | [08](08-information-secrete-et-visibilite.md) |

## Victoire (CV) — détail en [10](10-victoire-defaite-et-fin-de-partie.md)

| ID | Règle | Déclencheur | Acteurs | Préalable | Résultat | Exception | Source | Cert. | Docs |
|---|---|---|---|---|---|---|---|---|---|
| CV-00 | Victoire testée en continu (après morts, conversions, empoisonnements, résolutions) ; fin immédiate, intentions annulées | Événements | Système | — | Clôture | — | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-01 | Ordre de priorité : solos (Veuve/Parieur) → Empoisonneur → Pyromane → Vampires → Méchants → Amoureux → Civils → dernier survivant | Test | Système | — | Premier vrai gagne | — | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-02 | Méchants : majorité stricte sur tous les opposants réunis ; parité = pas de victoire | Test | Système | — | Victoire ou poursuite | Bénins non comptés | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-03 | Les bénins ne bloquent aucune victoire et ne comptent pas comme opposants | Test | Système | — | Neutralité | — | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-04 | Co-victoires ajoutées sans changer le vainqueur : Oracle juste, Entremetteur en repli, bénins survivants, Photographe au quota | Fin | Système | — | Cartes co-vainqueurs | — | Moteur+Écran | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-05 | Le Cœur du Manoir distribué = victoire immédiate du Conservateur | Distribution | Conservateur | Conservateur en jeu | Fin | Sans Conservateur : sans effet | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-06 | Héritier déchu : allié méchant tant qu'un vrai Méchant vit ; sinon éliminé du décompte des bloqueurs | Test | Système | — | Décompte ajusté | — | Moteur | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |
| CV-07 | Vainqueur et raison sont scellés au moment de la fin et présentés identiquement à tous | Fin | Système | — | Écran de fin instantané | — | Moteur+Écran | CONFIRMÉ | [10](10-victoire-defaite-et-fin-de-partie.md) |

## Détection transverse (usage de la matrice)

- **Contradictions ouvertes** : ACT-05 (blocage vs objets) ; textes joueur vs comportement pour Pyromane, Policier, Ange Gardien, Jardinier, Apothicaire (voir [18](18-questions-et-incertitudes.md)).
- **Règles sans cas d'erreur défini** : RES-21 (action tardive) ; priorité libération/exécution le même tour ; départ définitif d'un joueur ; late-join.
- **Transitions sans condition claire** : aucune — toutes les transitions ont un déclencheur (chrono/MJ) et une autorité (verrou) ; seul le démarrage sans validation complète (STR-06) manque d'échappatoire.
- **Pouvoirs sans priorité formelle** : aucun conflit d'attaque non ordonné (RES-05→10 couvre l'ordre) ; la simultanéité victoire solo / victoire de faction est ordonnée mais non affichée comme règle (AMB-R3).
