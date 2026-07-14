# Textes vus par le joueur — par rôle (relecture / QA)

Inventaire des **textes qu'un joueur reçoit**, rôle par rôle, en **priorité sur ce
qu'on ne voit PAS facilement en dev** : notifications, modales d'événement,
messages de résolution (Annonce), variantes et cas limites. Le **texte de la fiche
de rôle** (dossier : lore + capacité + subtilités) n'est **pas** repris ici — il
est déjà visible en dev.

## Légende des canaux

| Icône | Canal | Où le joueur le voit |
| --- | --- | --- |
| 🟦 | **Setup** | notif au tout début de partie (écran T1 / inventaire) |
| 📣 | **Notif** | notification reçue en cours de partie (fil / toast) |
| 🃏 | **Modale** | carte-événement bloquante et centrée |
| 🖥️ | **Bandeau** | résultat de sa propre capacité (cf. `bandeau-resultat-etat-reel.md`) |
| ⚙️ | **Moteur** | message / erreur affiché au clic (sous le bouton) |
| 🚫 | **MJ-only** | émis mais **le joueur ne le voit PAS** (récit MJ) — listé pour vérif |

> Convention : `X` = cible, `Y` = 2ᵉ cible, `{rôle}` / `{faction}` = valeur dynamique.

---

## CIVILS

### 🛡️ Ange gardien
- 🟦 **Ta cible** — « Tu veilles sur X. » _(cible civile imposée au hasard)_
- 🖥️ Bandeau : « Bouclier — à l'Annonce »
- 🚫 MJ-only à la résolution — **Attaque bloquée** : « X a été attaqué (…) mais une protection l'a sauvé. » _(la cible protégée n'apprend jamais qu'elle l'a été)_
- ⚙️ Erreur : « Cible requise »

### ⚗️ Apothicaire
- 📣 **cible** — **Une fiole t'est offerte** (🎁), corps selon la fiole :
  - Vie : « 💚 Tu as reçu une Fiole de vie de l'Apothicaire. Utilise-la depuis ton Carnet pour protéger un joueur jusqu'à la prochaine Annonce. »
  - Mort : « ☠️ Tu as reçu une Fiole de mort de l'Apothicaire. Utilise-la depuis ton Carnet pour empoisonner une cible — elle mourra à la prochaine Annonce. »
  - Clairvoyance : « 🔮 Tu as reçu une Fiole de clairvoyance de l'Apothicaire. Utilise-la depuis ton Carnet sur un joueur pour découvrir, toi seul, sa faction. »
- 🖥️ Bandeau : « Fiole offerte à X. »
- ⚙️ Erreurs : « Offre la fiole à un autre joueur (pour l'utiliser toi-même, passe par ton Carnet). » · « Tu as déjà agi ce tour-ci. » · « Toutes tes fioles ont déjà été utilisées. »
- _(usage d'une fiole par elle-même → voir §Objets)_

### 🔍 Assistant du détective
- 🖥️ Bandeau : « Trio : A · B · C » · falsifié : « Le joueur a été falsifié »
- ⚙️ Erreur : « Cible requise »
- _(aucune notification — tout passe par le bandeau)_

### ⚖️ Avocat
- Capacité **passive** : panneau « Prison » dans l'onglet Capacité (voit la faction des détenus). Visible en dev. Aucune notif.

### 🧸 Babysitter
- 📣 **cible** — **Babysitter** (🧸) : « Au prochain tour, tu seras à l'abri de la mort mais ta capacité sera bloquée. »
- 🖥️ Bandeau : « X gardé au prochain tour »

### 🧭 Boussole
- 🖥️ Bandeau (verdict coloré) : « Même camp » (vert) / « Camps opposés » (rouge) · falsifié : « Le joueur a été falsifié »
- ⚙️ Erreur : « Deux cibles requises »

### 🍸 Barman
- 📣 **cible ivre** — **Ivre** (🍺) : « Le barman t'a servi un verre de trop. Ta capacité sera bloquée demain. »
- 📣 **autre cible** — **Bon moment** (🍹) : « Tu as passé du bon temps avec X. »
- 🖥️ Bandeau : « X & Y — l'un ivre & à l'abri, l'autre passe un bon moment »
- 🚫 MJ-only : « Protection Barman … »
- ⚙️ Erreur : « Deux cibles requises »

### 🔪 Cuisinier
- 🟦 Reçoit un **Couteau de cuisine** en inventaire (pas de notif texte).
- ⚙️ Capacité active : « Capacité passive — utilise ton couteau depuis l'inventaire. »
- _(usage du couteau → voir §Objets : « X : coup de couteau — à l'Annonce. »)_

### ⚔️ Exécuteur
- Onglet Capacité : **panneau « Prisonniers — Tour N »** (badge `X / Y restante(s)` / `Épuisé`).
  - « Aucun joueur en prison actuellement. » _(si vide)_
  - Prisonnier arrivé ce tour → grisé, « vient d'arriver », tooltip « Doit purger un tour complet ».
  - Bouton **Exécuter** → 1er clic « ⚠️ Confirmer l'exécution », 2e clic exécute.
- 🖥️ Bandeau : « X exécuté — 🎭 Rôle » / « Échec »
- 🃏 **TOUS** (modale) — **Exécution de X** : « Rôle révélé : {icône} {rôle} — {faction}. »
- ⚙️ Erreurs : « Cible non emprisonnée » · « Attends qu'elle ait passé 1 tour complet en prison. »

### 📨 Facteur
- 📣 **cible** — **Lettre anonyme** (📨) : « Une lettre anonyme vient d'apparaître dans ton inventaire. »
- 🖥️ Bandeau : « Lettre déposée à X »

### 👁️ Guetteur
- 🖥️ Bandeau : « Tu surveilles X pour ce tour. » · falsifié : « Le joueur a été falsifié »
- ⚙️ Erreur : « Tu dois surveiller un autre joueur. »
- Journal des visiteurs consultable (panneau, visible en dev).

### 📰 Journaliste _(cf. Cartomancien)_
- 🖥️ Bandeau : « 🔮 Tu lis le tableau de X jusqu'au prochain tour » · falsifié : « Le joueur a été falsifié »

### ⚖️ Juge
- 📣 **prisonnier** — **Libération programmée** (⚖️) : « Le Juge a ordonné ta libération. Tu seras libre au début du prochain tour. »
- 🖥️ Bandeau : « Libération de X — au tour N »
- ⚙️ Erreurs : « Cible non emprisonnée » · « Le prisonnier n'a pas encore purgé un tour complet. » · « Libération de ce prisonnier déjà prévue. »

### 🤵 Majordome
- 🖥️ Bandeau (pastille En cours) : « X : protection — à l'Annonce » · variante : « X : protection déjà en place — à l'Annonce »
- 🃏 **si l'attaque est parée par échange** → le Majordome **meurt en héros** (modale de mort standard).
- 🚫 MJ-only : « Protection Majordome … »

### 🩺 Médecin légiste
- 📣 **à chaque mort** (résolution) — **Autopsie** (🩺) : « X — {icône} {rôle} » _(rôle exact du mort ; supprimé si le Cleaner a nettoyé)_
- ⚙️ Capacité : « Capacité passive — voir notifications »

### 🔮 Médium
- Passif : entend les morts au **Conseil des morts** (écran dédié).
- ⚙️ Capacité : « Capacité passive — voir notifications »

### 👮 Policier
- 🖥️ Bandeau : « 🟠 X : suspect » / « 🟢 X : pas suspect » · falsifié : « Le joueur a été falsifié »
- ⚙️ Erreur : « Cible requise »

### 😇 Saint
- 🖥️ Bandeau : « X béni — protection pendant 2 tours complets. »
- 📣 **à l'agresseur d'une cible bénie** — **Cible bénite** (✨) : « Cette cible est bénite, votre action ne fonctionne pas. »
- ⚙️ Variante : « Bénédiction déjà utilisée. »
- _(effet indirect : tout manipulateur visant une cible bénie reçoit « X est sous bénédiction — {action} annulé(e). »)_

### 🕵️ Témoin
- 🟦 **Témoin** (👁️) : « Tu reconnais X : {icône} {rôle} » _(1 Civil au hasard, jamais un Méchant)_
- ⚙️ Capacité : « Capacité passive — voir notifications »

### 🤍 Vengeur
- 🟦 **Choisis ton être cher** (🤍) : « À la 1ère Enquête, choisis ton être cher parmi 2 Civils : X · Y. Tu sais donc que ces deux-là sont des Civils. S'il/elle meurt, tu recevras un couteau pour te venger. »
- 📣 **si l'être cher meurt** (résolution) — **Vengeance** (⚔️) : « Ton être cher n'est plus. Un couteau apparaît dans ton inventaire. »
- ⚙️ Capacité (tant que verrouillée) : « Capacité passive — si ton être cher meurt, un couteau apparaît dans ton inventaire. » · une fois débloquée : « Vengeance débloquée — utilise ton couteau depuis l'inventaire. »
- _(usage du couteau de vengeance → §Objets)_

---

_À suivre : **Méchants**, **Neutres**, **Spéciaux/émergents** (Vampire, Chasseur, Acolyte, Mort-vivant, Rêveur) + **§Objets** (fioles, couteaux, lettre, reliques) + **§Événements communs** (mort, prison, morsure, vote)._

_Sources : `src/engine/actions.ts` (notify/notifyMJ, setup, résolution) · `src/engine/items.ts` · `src/components/PlayerEventModal.tsx` (modales) · `src/components/frames/screens/PA2Capability.tsx` (panneaux onglet Capacité)._
