# Fondations fonctionnelles — Murder Party

## Résumé du jeu en cinq lignes

Murder Party est le **compagnon numérique d'une partie de déduction sociale à rôles cachés jouée en présentiel**. Six à vingt participants réunis dans la même pièce utilisent chacun leur téléphone ; l'application distribue les rôles en secret, rythme les phases, résout les capacités et publie les faits publics — pendant que l'essentiel du jeu (accusations, mensonges, négociations) se déroule **de vive voix, autour de la table**. Une majorité de participants ignorants doit identifier une minorité informée ; une poignée d'individus poursuivent en plus des objectifs strictement personnels.

L'application n'est pas le jeu. Elle est **l'arbitre secret** du jeu.

## Rôle de cette documentation

Ce dossier décrit **ce que le produit doit faire et garantir**, en termes fonctionnels. Il a été reconstitué par observation du dépôt existant, puis reformulé exclusivement en concepts de jeu.

Il est destiné à un lecteur — humain ou modèle — qui devra ensuite **conseiller sur l'architecture, les technologies, le moteur, la synchronisation et l'organisation du développement**. Sa mission est donc de fournir une compréhension fiable du produit **sans orienter la réponse technique**.

Par conséquent, ce dossier ne décrit volontairement **ni le code, ni les composants, ni les bibliothèques, ni les frameworks, ni la structure des fichiers, ni les choix d'implémentation actuels**. Là où une contrainte technique réelle a été observée, elle est traduite en **besoin** ou en **résultat attendu**, jamais en solution.

## Périmètre

**Couvert** : nature de l'expérience, structure d'une session, boucle de gameplay, phases et transitions, catégories d'actions, circulation de l'information, évolution de l'état, conditions de fin, contraintes d'une session en direct, catalogue des rôles, incertitudes structurantes.

**Hors périmètre** : direction artistique et identité visuelle, textes narratifs, équilibrage chiffré fin, modèle économique, roadmap produit, et toute recommandation technique.

## Comment lire ce dossier

Dans l'ordre, pour une première lecture complète :

| Document | À lire pour comprendre |
|---|---|
| [game-foundation.md](game-foundation.md) | Ce qu'est le jeu, ses invariants, ce qui reste vrai quel que soit le contenu |
| [gameplay-loop.md](gameplay-loop.md) | Comment une partie se déroule concrètement, du salon à l'écran de fin |
| [live-session-requirements.md](live-session-requirements.md) | Ce qu'une session multijoueur en direct impose comme garanties |
| [roles-reference.md](roles-reference.md) | Le catalogue détaillé des rôles — **seul document qui les nomme un par un** |
| [open-questions.md](open-questions.md) | Ce qui reste indécidé et pourrait changer une recommandation technique |

**Pour une lecture rapide orientée conception technique** : `game-foundation.md` (invariants) → `gameplay-loop.md` (diagramme et transitions) → `live-session-requirements.md` (intégralement) → `open-questions.md`. Le catalogue des rôles peut être survolé : les autres documents sont écrits pour rester valables si le catalogue change.

## Convention d'abstraction

Sauf dans `roles-reference.md`, les rôles ne sont **jamais nommés**. Ils sont désignés par catégories fonctionnelles : rôle d'investigation, de protection, offensif, de manipulation, de contrôle, à objectif personnel, capacité passive, effet temporaire, action ciblée.

C'est délibéré. Le catalogue actuel compte une soixantaine de rôles, il a beaucoup changé et changera encore. **Le squelette du jeu doit rester compréhensible et valable indépendamment de son contenu.** Un lecteur qui conçoit l'architecture doit raisonner sur les catégories, jamais sur les instances.

## Niveaux de certitude

Le dépôt contient des éléments d'âges différents, parfois contradictoires. Ce dossier distingue explicitement trois registres :

- **Fait** — comportement établi, cohérent entre plusieurs sources. Énoncé sans marqueur.
- **Interprétation** — lecture la plus probable, mais non confirmée par une source explicite. Signalée par *« interprétation »* ou *« probablement »*.
- **Question ouverte** — indécidable en l'état, et dont la réponse change quelque chose. Signalée sur place et reprise dans [open-questions.md](open-questions.md).

## Limites de l'analyse

Cinq réserves que le lecteur doit garder en tête :

1. **La documentation interne du dépôt est partiellement périmée.** Plusieurs documents décrivent un état antérieur du jeu (nombre de rôles, rôles supprimés encore documentés, règles d'activation obsolètes). En cas de divergence, ce dossier retient le **comportement effectif du produit**, pas sa documentation.
2. **Le catalogue de rôles est instable par nature.** Des rôles ont été ajoutés, retirés puis parfois restaurés. Le décompte donné dans `roles-reference.md` est une reconstruction à date, à revalider avant tout usage critique.
3. **L'équilibrage n'est pas décrit ici** et n'a pas été audité. Les proportions de composition sont rapportées comme un fait de conception, pas comme un résultat validé.
4. **Certaines règles n'existent pas.** Plusieurs situations réelles (départ définitif d'un joueur, arrivée tardive, second appareil) n'ont pas de règle écrite ni de comportement défini. Elles sont listées comme telles plutôt que comblées par invention.
5. **L'analyse porte sur ce que le produit fait, pas sur ce qu'il devrait faire.** Certains comportements observés ressemblent davantage à des effets de bord qu'à des décisions ; ils sont signalés quand la distinction compte.
