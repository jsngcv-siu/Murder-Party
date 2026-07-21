# 09 — Règles de résolution et priorités

Formalisation déterministe : **contexte / condition / règle / résultat / exception / certitude**. Les identifiants sont repris dans la [matrice des règles](17-matrice-des-regles.md).

## A. Modèle général

**RES-01 — Résolution différée par lots.** `CONFIRMÉ`
- *Contexte* : toute action à effet (attaque, protection, poison, morsure, pacte…) posée pendant l'Enquête.
- *Règle* : l'action est enregistrée comme **intention** et n'a **aucun effet immédiat** ; toutes les intentions en attente (du tour courant et des tours antérieurs non résolus) sont résolues d'un bloc au passage à l'Annonce.
- *Exception* : les capacités de pure information répondent immédiatement ; l'exécution de l'Exécuteur et le vol/duplication/dons d'objets sont immédiats.

**RES-02 — Ordre de tri du lot.** `CONFIRMÉ`
- *Règle* : les intentions sont résolues par **tour croissant**, puis par **couche croissante**, puis par **ancienneté** (première posée, première résolue).
- *Couches* : **1 = Protections et soins** ; **2 = Attaques** ; **3 = Cascades et conversions** (poison de l'Empoisonneur, morsure du Vampire).
- *Résultat* : une protection posée au tour N couvre les attaques du tour N ; les contagions ne s'appliquent qu'après que les morts du tour sont connues.

**RES-03 — Préconditions revérifiées à la résolution.** `CONFIRMÉ`
- *Règle* : au moment de résoudre chaque intention, le jeu revérifie : auteur vivant **et non emprisonné** ; cible (si requise) vivante ; objet toujours possédé.
- *Résultat* : précondition fausse → intention annulée proprement.
- *Exceptions* : une **fiole engagée est consommée même si la précondition échoue** ; un **blocage** (chantage, sabotage…) annule les intentions issues d'un **rôle**, jamais celles issues d'un **objet**.

**RES-04 — Idempotence.** `CONFIRMÉ`
- *Règle* : chaque intention n'est résolue qu'une seule fois (marquée résolue avec son dénouement) ; une résolution ne peut pas être rejouée, même si plusieurs déclencheurs surviennent simultanément.

## B. Résolution d'une attaque (ordre interne strict)

Pour **chaque** attaque, dans cet ordre :

**RES-05 — Cible déjà morte.** L'attaque est annulée (l'éventuelle fiole reste consommée). `CONFIRMÉ`

**RES-06 — Riposte du Garde-chasse.** `CONFIRMÉ`
- *Condition* : la cible est patrouillée ce tour.
- *Résultat* : **l'attaquant meurt** — que son attaque aboutisse, soit bloquée ou parée ensuite. La patrouille **ne sauve jamais la cible**.
- *Exceptions* : pas de riposte si le Garde-chasse est mort ou condamné ce tour, ni si l'attaquant est le patrouillé lui-même. La riposte s'applique **même à la balle perforante**.

**RES-07 — Parade du Bretteur.** `CONFIRMÉ`
- *Condition* : la cible est le Bretteur, garde levée ce tour.
- *Résultat* : l'attaque **échoue** et **l'attaquant meurt** (embroché).
- *Exception* : la **balle perforante** passe outre — le Bretteur meurt sans embrocher.

**RES-08 — Protection / bénédiction.** `CONFIRMÉ`
- *Condition* : la cible porte un bouclier actif (protection, chambre, gilet, fiole de vie) ou la bénédiction du Saint.
- *Résultat* : l'attaque échoue. La cible **n'en sait rien** ; l'Aubergiste protecteur apprend « on a frappé » (sans qui) ; le Saint apprend l'auteur.
- *Sous-règle (échange du Majordome)* : si la cible était protégée par le Majordome et que l'attaque est d'**origine méchante**, la cible survit, **l'attaquant meurt et le Majordome meurt aussi**.
- *Exception* : la **balle perforante** ignore protections et bénédiction ; dans le cas Majordome, la cible meurt et le Majordome survit sans riposter.

**RES-09 — Vie de réserve du Chat du Manoir.** `CONFIRMÉ`
- *Condition* : la cible est le Chat, vie de réserve intacte.
- *Résultat* : l'attaque est **absorbée**, l'arme consommée, un « miaulement » anonyme est publié ; la cible reçoit « tu as survécu à un danger ».
- *Exception* : la balle perforante traverse la vie de réserve (le Chat meurt).

**RES-10 — Mort.** `CONFIRMÉ`
- *Résultat* : la cible meurt. **Pendant l'Enquête**, la mort est **différée** (confirmée à l'Annonce ; la victime continue de jouer) ; pendant Débat/Vote, elle est **immédiate**.
- *Post-effets* : décompte du Pyromane (uniquement si le kill aboutit) ; **braquage** du Détrousseur (pille l'inventaire) ; riposte de patrouille le cas échéant.

## C. Cascades et conversions (couche 3)

**RES-11 — Le kill prime sur la contagion.** `CONFIRMÉ`
- *Règle* : une **morsure** ou un **poison** dont l'auteur est mort ou condamné ce même tour est **annulé**.
- *Règle jumelle* : une cible protégée ou bénie n'est ni convertie ni empoisonnée.

**RES-12 — Conversion.** `CONFIRMÉ`
- *Résultat* : le mordu rejoint le clan des Vampires (rôle conservé, camp et condition de victoire changés) ; modale privée ; événement public anonyme ; à la **première** morsure de la partie, éveil du Chasseur de Vampire.
- *Exceptions* : cible déjà vampire → refusé ; Chasseur → immunisé (morsure consommée) ; cible morte ce tour → sans prise.

**RES-13 — Poison létal différé (fiole de Mort à retardement).** `CONFIRMÉ`
- *Règle* : certains poisons létaux sont programmés pour tuer au **basculement de tour** ; une protection active au moment prévu l'annule.

**RES-14 — Cascades de mort.** `CONFIRMÉ`
- À chaque mort confirmée, dans l'ordre : **autopsie** (Médecin légiste) → **lien des Amoureux** (le partenaire meurt à son tour ; le lien est rompu avant, pour ne pas boucler) → **déblocage du Vengeur** (si l'être cher meurt) → **successions** (Tueur → un acolyte ; Stratège → un acolyte avec son état ; morsure → un converti).
- Les morts simultanées sont traitées **séquentiellement** ; la vérification de victoire a lieu après chaque cascade immédiate et après la confirmation complète des morts différées.

**RES-15 — Effacement (Cleaner).** `CONFIRMÉ`
- *Règle* : appliqué **avant** la publication : une mort d'**origine méchante** éligible a sa faction publiée « inconnue » et son autopsie supprimée. Charges limitées (1–2) ; si plus de morts éligibles que de charges, choix aléatoire.
- *Exception* : jamais sur une mort d'origine civile ou neutre.

## D. Prison

**RES-16 — Emprisonnement.** Le condamné passe « emprisonné » (date d'écrou mémorisée) ; déclenche : promotions **temporaires** (Tueur/Stratège/Vampire emprisonné → héritier temporaire), déblocage du Vengeur si son être cher est écroué, transmission du dossier à l'Archiviste. `CONFIRMÉ`

**RES-17 — Peine minimale.** Libération (Juge/Corrupteur) et exécution (Exécuteur) exigent que le prisonnier ait purgé **au moins un tour complet** (le tour du vote ne compte pas). `CONFIRMÉ`

**RES-18 — Libération.** Appliquée au **début du tour suivant** la programmation ; annoncée publiquement ; annule les promotions temporaires (le titulaire reprend son état). L'évasion du Corrupteur emprunte **exactement** la même forme que la libération du Juge. `CONFIRMÉ`

## E. Vote

**VOTE-01 — Dépouillement classique.** Le joueur le plus voté est **emprisonné**. Égalité en tête → **tirage au sort** parmi les ex æquo (affiché comme tel). Aucun vote exprimé → personne. `CONFIRMÉ`

**VOTE-02 — Variante Suspicion.** Pas de vote manuel : agrégation des marques « Suspect » des murs des joueurs **vivants et emprisonnés** ; cibles éligibles : vivantes et libres. Égalité → **personne**. Aucune marque → personne. `CONFIRMÉ`

**VOTE-03 — Droit de vote.** Seuls les vivants libres votent ; le serveur revérifie l'éligibilité du votant à l'enregistrement. Un joueur = un vote effectif (le dernier remplace le précédent) ; abstention possible (retrait du vote). `CONFIRMÉ`

**VOTE-04 — Avarice du verdict.** Le verdict publie **seulement** l'emprisonnement (et la mention « égalité tranchée au sort » le cas échéant) — jamais rôle, faction ni détail des bulletins. `CONFIRMÉ`

**VOTE-05 — Condamnation du Saint.** Si le condamné du vote est le Saint : **fin de partie immédiate, victoire des Méchants**. `CONFIRMÉ`

**VOTE-06 — Piège de la Veuve noire.** Si un « époux » désigné ce tour a voté contre la Veuve (ou l'a marquée « Suspect » en variante), **les deux époux meurent** à la prochaine Annonce. `CONFIRMÉ`

## F. Délais, absences et choix invalides

**RES-19 — Absence de choix.** Fin d'Enquête sans action : la capacité est simplement perdue pour le tour — sauf les rôles à **choix obligatoire de tour 1** (Usurpateur, Vengeur, Oracle, Mouchard), tirés automatiquement au hasard. `CONFIRMÉ`

**RES-20 — Choix invalide.** Une action sur une cible interdite est refusée à l'enregistrement (message d'erreur au joueur) ; une action devenue invalide entre-temps est annulée à la résolution (RES-03). `CONFIRMÉ`

**RES-21 — Action reçue après la clôture de phase.** `À CONFIRMER` — comportement précis non établi ; la conception (résolution au basculement, préconditions revérifiées) implique qu'une action tardive est soit refusée, soit rattachée au tour suivant. À trancher.

## G. Vérification de la victoire

**CV-00 — Moment de vérification.** La victoire est testée après chaque mort immédiate, après la confirmation complète des morts différées, après chaque conversion et empoisonnement — et la partie se clôt **dès** qu'une condition est vraie, en annulant les intentions non résolues. Ordre détaillé et cas d'égalité : [10-victoire-defaite-et-fin-de-partie.md](10-victoire-defaite-et-fin-de-partie.md). `CONFIRMÉ`

## H. Ambiguïtés de résolution signalées (non tranchées)

| Réf. | Ambiguïté |
|---|---|
| AMB-R1 | **Fenêtres de protection hétérogènes** : deux objets de protection aux libellés proches couvrent des fenêtres légèrement différentes (le restant du tour vs jusqu'au tour suivant). `À CONFIRMER` l'intention. |
| AMB-R2 | **Égalité de vote** : comportements opposés entre vote classique (hasard) et variante Suspicion (personne) — choix de design apparent, mais source de confusion inter-variantes. |
| AMB-R3 | **Priorité des victoires solo** : le Pyromane (et les solos) sont vérifiés avant les victoires de faction ; si un quota solo et une majorité de faction deviennent vrais le même tour, le solo l'emporte — non documenté comme règle affichée. |
| AMB-R4 | **Blocage vs objets** : la règle de résolution épargne les objets, l'interface annonce le contraire (voir ACT-05). |
| AMB-R5 | **Action tardive** : RES-21. |
