# Subtilités de chaque rôle — textes RÉELS du jeu (relecture / correction)

> **Source** : [src/lib/roleExtraInfo.ts](src/lib/roleExtraInfo.ts) — c'est le fichier qui
> alimente les cartes « Subtilités » du dossier de rôle (ce que le joueur voit en slidant
> la feuille). Extraction **verbatim** le 13/07/2026.
>
> **Comment corriger** : édite directement le **titre** entre `【 】` et/ou la **phrase**
> qui suit. Tu peux aussi ajouter/supprimer une puce, ou barrer ce qui est faux. Quand tu me
> renvoies le fichier en me disant « je l'ai modifié », je répercute chaque changement dans
> `roleExtraInfo.ts` (et je vérifie `npx tsc --noEmit`).
>
> **Format d'une note** : `【 Titre court 】 Phrase d'explication.`
> Certains rôles ont en plus une **✍️ Capacité (page 1)** = réécriture du texte de capacité
> affichée à la place de celui de la base (`cleanCapacity`).

---

# 🟦 CIVILS (19)

## 👼 L'Ange Gardien
- 【 Cible imposée 】 Tu ne choisis pas qui tu protèges : le manoir te confie une cible au hasard dès le départ.
- 【 Un seul bouclier 】 1×/partie seulement. Le bouclier annule la prochaine attaque contre ta cible, puis disparaît.
- 【 Sauve un inconnu 】 Ta cible ignore qu'elle est veillée. À toi de sentir le bon tour pour lever le bouclier.

## ⚗️ L'Apothicaire
- 【 Trois fioles uniques 】 Poison (tue), Vie (protège), Clairvoyance (révèle la faction). Chacune ne sert qu'une fois.
- 【 Une par tour 】 Tu ne peux utiliser qu'une seule fiole par tour. Garde ou offre les autres.
- 【 Offrir une fiole 】 Tu peux confier une fiole à un autre joueur : c'est lui qui l'utilisera. Idéal pour armer un allié sûr.

## 🔍 L'Assistant du détective
- ✍️ Capacité (page 1) : 1×/tour. Désigne 1 joueur : le manoir te renvoie un trio de rôles — le vrai, plus 2 leurres. À toi de deviner lequel est réel.
- 【 Un vrai, deux faux 】 Le trio mêle le vrai rôle et 2 leurres tirés au hasard. Rien n'indique lequel est le bon.
- 【 Tu perces les masques 】 Seul enquêteur à démasquer le Tueur ET l'Usurpateur : ils figurent sous leur VRAI rôle dans ton trio, là où les autres enquêtes les prennent pour des Civils.
- 【 Seule la falsification t'aveugle 】 Une cible falsifiée ne renvoie rien, même pour toi.

## ⚖️ L'Avocat
- 【 Uniquement la prison 】 Tu vois la faction des joueurs actuellement emprisonnés — et de personne d'autre.
- 【 Sans détenu, aveugle 】 Tant que les cellules sont vides, ta capacité ne t'apprend rien. Pousse la table aux emprisonnements.

## 🧸 La Babysitter
- 【 Protège mais endort 】 Ta cible survit au prochain tour, mais sa capacité est désactivée. Ne borde pas un allié actif au mauvais moment.
- 【 Effet différé 】 La protection couvre le tour suivant, pas le tour où tu la déclenches.

## 🍺 Le Barman
- 【 Deux cibles, un tirage 】 Tu désignes 2 joueurs. Le hasard (50/50) décide lequel est protégé — et se retrouve ivre.
- 【 Protection incertaine 】 Tu ne choisis pas lequel des deux est réellement à l'abri : c'est un pari.
- 【 L'ivresse gêne 】 Le joueur ivre a sa capacité perturbée le tour suivant. Utile aussi pour ralentir un suspect.

## 🧭 La Boussole
- 【 Même camp, oui ou non 】 Tu apprends seulement si 2 joueurs sont de la même faction — jamais leurs rôles.
- 【 Vert = alliés 】 Résultat vert : même camp. Rouge : camps opposés.
- 【 Piège des Neutres 】 Deux Neutres ressortent « même camp », alors qu'ils ne partagent pas forcément le même objectif de victoire.

## 🍳 Le Cuisinier
- 【 Un Civil qui tue 】 Tu reçois un couteau au départ : tu peux éliminer une personne. Un rare Civil offensif.
- 【 Arme à protéger 】 Le couteau est un objet de ton inventaire : un Voleur pourrait te le subtiliser avant que tu ne l'utilises.
- 【 Frappe à froid 】 Sers-toi de ton coup au bon moment : une fois le couteau utilisé, tu redeviens un Civil sans capacité.

## ⚖️ L'Executeur
- 【 Le bourreau du manoir 】 Tu ne peux exécuter qu'un joueur ayant passé un tour complet en prison.
- 【 Dépend du vote 】 Sans emprisonnement, pas de cible : ta puissance suit les décisions de la table.
- 【 À double tranchant 】 Un détenu peut être innocent. Exécute à tort et tu affaiblis ton propre camp.

## 📨 Le Facteur
- 【 Lettre anonyme 】 Ta cible reçoit une « lettre » dans son inventaire, sans savoir qu'elle vient de toi.
- 【 Outil social 】 Aucun effet mécanique direct : c'est un moyen de communiquer, semer un doute ou tisser une confiance.

## 👀 Le Guetteur
- 【 Journal en direct 】 Pendant le tour choisi, ta cible et l'ordre de ses visiteurs sont enregistrés au fil des actions.
- 【 Démasque les attaques 】 Voir qui a fait une action envers ta cible peut révéler souvent un Méchant.
- 【 Historique consultable 】 Tu gardes accès aux relevés des tours précédents pour recouper les allées et venues.

## 🧑‍⚖️ Le Juge
- 【 Rouvre une cellule 】 Tu libères un joueur emprisonné depuis au moins un tour complet.
- 【 Contre les erreurs 】 Idéal pour sauver un innocent injustement voté — mais tu peux aussi relâcher un vrai Méchant.

## 🛡️ Le Majordome
- 【 Protection à contre 】 Si la protection réussit : ta cible survit, l'attaquant meurt… et toi aussi.
- 【 Sacrifice utile 】 En tombant, tu emportes l'assassin : un échange redoutable pour révéler un Méchant.
- 【 Sans attaque, rien 】 Si personne ne vise ta cible, il ne se passe rien — et tu survis.

## 🩺 Le Médecin légiste
- 【 Autopsie automatique 】 À chaque mort, tu apprends le rôle exact du défunt, sans rien avoir à faire.
- 【 Le Cleaner t'aveugle 】 Si le corps a été nettoyé par le Cleaner, le rôle reste masqué. Un « inconnu » trahit sa présence.

## 🔮 Le Médium
- 【 Écoute les morts 】 Tu lis en permanence le chat du Conseil des morts.
- 【 Lecture seule 】 Tu ne peux jamais y écrire : impossible de répondre aux défunts ni de te trahir par ce canal.

## 🚓 Le Policier
- ✍️ Capacité (page 1) : 1×/tour. Désigne 1 joueur : verdict binaire, suspect ou non.
- 【 Un Suspect, c'est quoi ? 】 Un Suspect est un joueur que ton contrôle signale comme suspect. Ce n'est pas une preuve : tous les Neutres ressortent Suspects, et certains tueurs camouflés passent pour non-suspects.
- 【 Le Tueur passe blanc 】 Un Tueur te ressort « pas suspect ». Un verdict « pas suspect » n'écarte donc jamais le Tueur.
- 【 L'Usurpateur te berne 】 L'Usurpateur ressort sous sa couverture Civil : tu le vois « pas suspect ». Seul l'Assistant du détective le démasque.
- 【 Un verdict, pas un rôle 】 Tu n'obtiens qu'un « suspect : oui/non » — jamais le rôle précis de la cible.

## 😇 Le Saint
- 【 Immunité totale 】 Ta bénédiction rend un joueur (toi compris) intouchable pendant 2 tours complets.
- 【 Piège mortel 】 Si le Saint est emprisonné par un vote, les Civils perdent immédiatement. Ne te fais jamais suspecter.
- 【 Un seul usage 】 1×/partie : choisis avec soin qui vaut la bénédiction.

## 👁️ Le Témoin
- 【 Un allié sûr 】 Dès le départ, tu connais l'identité et le rôle exact d'un Civil : une confiance garantie.
- 【 À exploiter finement 】 Cet allié ignore que tu le connais. Défendre trop ouvertement quelqu'un peut te griller.

## ⚔️ Le Vengeur
- 【 Deux Civils connus 】 Tu choisis ton être cher parmi 2 Civils proposés : tu sais donc que ces deux-là sont sûrs.
- 【 Armé par le deuil 】 Tu ne reçois ton couteau que si ton être cher meurt. Sans ça, tu restes un Civil sans capacité.

---

# 🟥 MÉCHANTS (9)

## 🃏 Le Cartomancien
- 【 Lis les suspicions 】 Tu vois le tableau de suspicions d'une cible : ses anneaux et couleurs, pour ton camp.
- 【 Jamais les notes 】 Le texte écrit à la main reste privé : tu n'obtiens que les marquages colorés.

## 🧹 Le Cleaner
- 【 Efface un mort 】 Sur une victime d'une attaque méchante, tu supprimes son rôle : faction publique « Inconnue », Légiste aveuglé.
- 【 Attaques concernées 】 Tueur, Croque-mitaine, ou tout objet d'origine méchante (couteau de l'Armurier, même volé ou joué par un Civil).
- 【 Rare et précieux 】 1×/partie — 2× à 10 joueurs ou plus. À réserver aux morts qui pourraient trahir ton camp.

## 👹 Le Croque-mitaine
- 【 Deux proies, une mort 】 Tu désignes 2 joueurs : le hasard choisit lequel meurt.
- 【 Le survivant est prévenu 】 L'autre cible reçoit « Vous avez survécu à un danger » : elle sait qu'on l'a visée.

## 🤐 Le Maître chanteur
- 【 Musèle une capacité 】 Ta cible a sa capacité désactivée le tour suivant. Vise les gêneurs (enquêteurs, protecteurs).
- 【 Statut visible 】 La cible reçoit le statut « sous chantage » : elle sait qu'elle est bloquée, sans savoir par qui.

## 🪡 Le Marionnettiste
- 【 Tu joues à sa place 】 Tu prends le contrôle de la capacité de ta cible et la déclenches toi-même, une seule fois.
- 【 Cible bloquée 】 La cible voit le statut « Manipulé » et ne peut plus agir ce tour.
- 【 Retourne une arme 】 Fais tuer un allié de ta cible, ou gaspille une capacité civile précieuse en la détournant.

## 🐀 Le Mouchard
- 【 Un rôle dès le départ 】 Au setup, tu apprends le rôle exact d'un joueur de ton choix. Révélation permanente.
- 【 Avantage d'ouverture 】 Cette info précoce oriente ton camp : partage-la aux Méchants pour cibler ou éviter les bons joueurs.

## ♟️ Le Stratège
- 【 Mort annoncée 】 Ta cible marquée est prévenue qu'elle est visée et meurt à l'Annonce du tour suivant.
- 【 Fenêtre de contre 】 Une protection peut la sauver, ou toi être neutralisé avant : la marque n'est pas garantie.
- 【 Couteau de secours 】 Tu as aussi un couteau pour frapper immédiatement, sans délai ni avertissement.

## 🔪 Le Tueur
- 【 Camouflage total 】 Tu apparais en Citoyen à l'Assistant et « pas suspect » au Policier : les enquêtes te blanchissent.
- 【 La lame se transmet 】 Si tu es emprisonné ou tué, un Acolyte vivant et libre devient Tueur au hasard. Le crime survit.
- 【 Une frappe par Enquête 】 La mort n'est révélée qu'à l'Annonce suivante : soigne tes alibis d'ici là.

## 🎭 L'Usurpateur
- 【 Fausse identité fixe 】 Au setup, tu choisis 1 couverture parmi 3 rôles absents. Elle est verrouillée pour toute la partie.
- 【 Trompe les enquêtes 】 Toutes les enquêtes sur toi renvoient ce faux rôle — parfait pour te faire passer pour un Civil.
- 【 Faille : l'Assistant 】 L'Assistant du détective, lui, te voit sous ton vrai rôle — « L'Usurpateur » figure dans son trio. Méfie-toi de qui pourrait l'être.

---

# 🟨 NEUTRES (9)

## 🏹 Le Chasseur de Vampire _(émergent)_
- 【 Éveillé par le sang 】 Tu n'apparais qu'après la 1re morsure du Vampire : avant, ta chasse n'a pas commencé.
- 【 Détecteur de crocs 】 Chaque tour, tu apprends si une cible est Vampire ou non.
- 【 Immunisé 】 La morsure ne peut ni te tuer ni te convertir : traque sans crainte d'être retourné.

## ☠️ L'Empoisonneur
- 【 Victoire par le poison 】 Tu gagnes si tous les survivants hors de prison sont empoisonnés. Joue la patience.
- 【 La prison t'échappe 】 Un joueur emprisonné ne compte pas : garde un œil sur les cellules pour ta condition de victoire.
- 【 Suivi en direct 】 Ton panneau liste en temps réel qui est empoisonné et qui reste à atteindre.

## 💞 L'Entremetteur
- 【 Deux destins liés 】 Au setup, tu lies 2 autres joueurs : si l'un meurt, l'autre meurt automatiquement.
- 【 Protège le couple 】 Tu gagnes si les deux liés survivent jusqu'à la fin : veille discrètement sur eux.

## 👑 L'Héritier Déchu
- 【 Faux Civil 】 Tu enquêtes (« suspect ou non ») sous des airs honnêtes, mais tu joues pour les Méchants.
- 【 Un Suspect, c'est quoi ? 】 Un Suspect est un joueur que le contrôle du Policier signale comme suspect. Ce n'est pas une preuve : tous les Neutres ressortent Suspects, et certains tueurs camouflés passent pour non-suspects.
- 【 Condition de victoire 】 Tu gagnes avec les Méchants si un Tueur est encore en vie à la fin de la partie.
- 【 Double jeu 】 Rends-toi utile aux Civils pour gagner leur confiance, tout en protégeant le Tueur.

## 🎭 L'Imitateur
- 【 Hérite d'un mort 】 1×/partie, tu prends intégralement le rôle du dernier joueur mort — capacité comprise.
- 【 Question de timing 】 Attends la mort d'un rôle qui t'arrange : un mauvais mort t'enferme dans un rôle faible.
- 【 Suspect avant l'héritage 】 Tant que tu n'as pas copié, tu apparais suspect au Policier.

## 🔮 L'Oracle
- 【 Parie sur un camp 】 À la 1re Enquête, tu choisis une prophétie : victoire des Civils, des Méchants, ou d'un Neutre.
- 【 Rester en vie 】 Tu ne gagnes que si ta prophétie se réalise ET que tu es vivant à la fin. Survivre est ta priorité.

## 🎲 Le Parieur tricheur
- 【 Dés truqués 】 En duel, tu lances 3 dés et gardes le meilleur ; ta cible n'en lance qu'un. La chance penche pour toi.
- 【 Le perdant meurt 】 Le plus petit score meurt à la prochaine Annonce (une protection peut le sauver). Égalité : on relance.
- 【 Ton pari te tue 】 Si tu perds un pari, c'est toi qui tombes. Tu gagnes seulement en restant le dernier en vie.

## 🧛 Le Vampire
- 【 Mords et convertis 】 Chaque tour (cooldown 1 phase), tu convertis un non-vampire : ton clan grandit dans l'ombre.
- 【 La 1re morsure sonne l'alarme 】 Elle déclenche une annonce publique anonyme et fait émerger le Chasseur de Vampire.
- 【 Victoire par le nombre 】 Le clan l'emporte en dominant le manoir : équilibre discrétion et vitesse de conversion.

## 🕷️ La Veuve noire
- 【 Deux proies piégées 】 Chaque Enquête, tu désignes 2 cibles. Si l'une d'elles vote contre toi, les deux meurent.
- 【 Arme de dissuasion 】 La menace protège autant que le piège : bien annoncée, elle décourage les votes contre toi.

---

# ⬜ RÔLES HORS SET ACTIF (8)

> Présents dans `roleExtraInfo.ts` mais **pas** dans les 37 rôles du set `set1` en base.
> À corriger aussi si tu comptes les réactiver — sinon on peut les ignorer / supprimer.

## 🔫 L'Armurier
- 【 Don anonyme 】 Tu remets un couteau à un joueur vivant : il ignore que l'arme vient de toi.
- 【 Une lame par Enquête 】 1×/Enquête. Le porteur peut s'en servir une fois pour tuer — la mort tombe à l'Annonce.
- 【 À double tranchant 】 Tu ne choisis pas qui il vise : arme un joueur en qui tu as confiance.

## 😱 Le Paranoïaque
- 【 Cible imposée 】 Le manoir t'assigne une cible au hasard : tu ne la choisis pas.
- 【 Protéger ou tuer 】 1×/partie, tu tranches : la protéger ou la tuer (résolu à l'Annonce). À toi de deviner son camp.
- 【 Un seul coup 】 Ta décision est définitive : aucune seconde chance si tu te trompes.

## 📰 Le Journaliste
- 【 Espionne un tableau 】 Tu lis le tableau de suspicions d'un joueur jusqu'au prochain tour : tu vois qui il soupçonne.
- 【 Verrou d'un tour 】 Le lien se réinitialise à chaque tour : choisis bien qui tu surveilles.
- 【 Aveuglé par la falsification 】 Si ta cible a été falsifiée, tu ne lis rien de fiable.

## 🦝 Le Voleur
- 【 Objet le plus récent 】 Tu dérobes le dernier objet reçu par ta cible — vivante ou morte.
- 【 Fouille les morts 】 Les cadavres gardent leurs objets : un mort est une proie facile à détrousser.
- 【 Main vide 】 Si ta cible n'a aucun objet, ton tour est perdu.

## 🏺 Le Conservateur
- 【 Reliques au hasard 】 Tu confies une relique tirée au sort : certaines aident, d'autres piègent leur porteur.
- 【 Le Cœur du Manoir 】 Une relique rarissime : la confier déclenche ta victoire immédiate.
- 【 Deux dons par tour 】 Tu distribues jusqu'à 2 reliques par Enquête.

## 👉 L'Accusateur
- 【 Un Suspect, c'est quoi ? 】 Un Suspect est un joueur que le contrôle du Policier signale comme suspect. Ta marque impose cette étiquette publiquement, qu'il le soit vraiment ou non.
- 【 Marque suspecte 】 Tu désignes un joueur : il apparaît Suspect aux yeux de toute la table pendant 1 tour.
- 【 Pression sur le vote 】 La marque désigne un Suspect à la table — pratique pour pousser un lynchage.
- 【 Bloqué par la bénédiction 】 Un joueur béni par le Saint échappe à ton accusation.

## 🎨 Le Falsificateur
- 【 Fais porter le chapeau 】 Tu falsifies un joueur contre son gré : toute enquête sur lui renvoie « falsifié », impossible de le blanchir. Un innocent peut ainsi porter le chapeau.
- 【 Effet permanent 】 La falsification dure jusqu'à la fin de la partie : un seul geste, effet définitif.
- 【 Aussi pour couvrir 】 À l'inverse, falsifie un allié Méchant pour le soustraire aux Policiers et autres fouineurs.
