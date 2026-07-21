# 13 — Exigences fonctionnelles et performance

Exigences **mesurables**, sans prescription de solution. Classement : **Indispensable** / **Importante** / **Souhaitable** / **À confirmer**. Quand le produit ne permet pas de fixer une valeur, la **métrique à définir** est indiquée au lieu d'un chiffre inventé.

## Capacité

| ID | Exigence | Valeur | Classe |
|---|---|---|---|
| EXG-CAP-01 | Joueurs par partie | 6 minimum, 20 maximum (bande d'usage typique 6–15) | Indispensable |
| EXG-CAP-02 | Participants par partie (avec MJ) | joueurs + 1 MJ éventuel | Indispensable |
| EXG-CAP-03 | Parties simultanées | Aucune cible observée — **métrique à définir** (usage actuel : quelques tables à la fois) | À confirmer |
| EXG-CAP-04 | Durée d'une session | Non bornée par le produit ; purge d'office 4 h après lancement — la durée maximale de partie doit rester < 4 h ou la purge être revue | Importante |

## Réactivité perçue

| ID | Exigence | Valeur | Classe |
|---|---|---|---|
| EXG-PERF-01 | Accusé local d'une action du joueur (tap → retour visuel) | < 100 ms (perçu instantané) — **cible à valider en mesure** | Indispensable |
| EXG-PERF-02 | Acceptation d'une action par l'autorité (tap → confirmation) | Quelques centaines de ms en conditions normales — **métrique à définir** (p95) | Importante |
| EXG-PERF-03 | Propagation d'un changement de phase à tous les appareils au premier plan | ≤ 2 s d'écart entre le premier et le dernier appareil — **à valider** | Indispensable |
| EXG-PERF-04 | Propagation d'une information critique (mort, verdict, fin de partie) | Même ordre que EXG-PERF-03 | Indispensable |
| EXG-PERF-05 | Précision des comptes à rebours entre appareils | Écart perçu < 1 s | Indispensable |
| EXG-PERF-06 | Latence tolérée de l'arbitre d'avancement (phases qui avancent sans clients) | Retard ≤ ~5 s sur l'échéance théorique (cadence d'arbitrage observée) | Importante |
| EXG-PERF-07 | Fluidité des interactions (défilement, transitions, animations) | Pas de gel perceptible sur téléphone milieu de gamme ; alternative animation réduite respectée | Importante |

## Cohérence et intégrité

| ID | Exigence | Contenu | Classe |
|---|---|---|---|
| EXG-INT-01 | Unicité des résolutions | Toute transition/résolution exécutée exactement une fois (voir EXG-SYNC-05/14) | Indispensable |
| EXG-INT-02 | Intégrité des choix | Aucune action acceptée n'est perdue ; aucun vote comptabilisé deux fois ; quotas appliqués par l'autorité | Indispensable |
| EXG-INT-03 | Cohérence inter-joueurs | Même état visible par tous à quelques secondes près ; l'état de l'autorité prime toujours | Indispensable |
| EXG-INT-04 | Déterminisme des règles | Mêmes intentions → même dénouement (l'aléatoire n'intervient que là où la règle le prévoit : tirages, égalités, 50/50) | Indispensable |
| EXG-INT-05 | Journal fonctionnel | Chaque action et dénouement laisse une trace consultable (historique joueur, vue MJ) | Importante |

## Confidentialité

| ID | Exigence | Contenu | Classe |
|---|---|---|---|
| EXG-CONF-01 | Secret des rôles | Un participant ne doit pouvoir **recevoir** que les informations autorisées par sa visibilité ([08](08-information-secrete-et-visibilite.md)) — l'état actuel (masquage à l'affichage seulement) est en dessous de la cible | Indispensable (cible) / connue non atteinte |
| EXG-CONF-02 | Secret des votes | Bulletins individuels jamais exposés, même après la partie | Indispensable |
| EXG-CONF-03 | Cloisonnement des canaux privés | Équipe, morts, parloir, MJ : écriture et lecture réservées aux ayants droit, appliquées par l'autorité | Indispensable |
| EXG-CONF-04 | Anti-regard en présentiel | Écrans sensibles masqués par défaut (maintien pour révéler), re-masquage en arrière-plan, écran de garde neutre | Importante |

## Robustesse et continuité

| ID | Exigence | Contenu | Classe |
|---|---|---|---|
| EXG-ROB-01 | Tolérance aux pertes de connexion | Aucune perte d'état de jeu ; resynchronisation automatique au retour ; la partie avance sans les absents | Indispensable |
| EXG-ROB-02 | Tolérance aux ralentissements | Un appareil lent ne retarde ni ne fausse la partie des autres | Indispensable |
| EXG-ROB-03 | Continuité sans hôte | Aucun participant (hôte compris) n'est nécessaire à l'avancement en mode Joueur Only | Indispensable |
| EXG-ROB-04 | Conservation minimale de l'état | L'état complet d'une partie survit à la disparition de tous les appareils, dans la fenêtre de rétention (≥ durée d'une partie) | Indispensable |
| EXG-ROB-05 | Récupération après interruption | Reprise en un geste (< 24 h) ; état complet et fidèle | Importante |
| EXG-ROB-06 | Anti-blocage de fin | Le filet « dernier survivant » et la purge d'ancienneté garantissent qu'aucune partie ne reste éternellement ouverte | Importante |
| EXG-ROB-07 | Pause | La partie peut être suspendue (MJ) sans corruption des chronos | Souhaitable / `À CONFIRMER` en mode Joueur Only |

## Appareils et accessibilité

| ID | Exigence | Contenu | Classe |
|---|---|---|---|
| EXG-DEV-01 | Cible d'appareil | Téléphone personnel, orientation portrait, usage debout en lumière basse — l'interface est pensée mobile d'abord | Indispensable |
| EXG-DEV-02 | Autres formats | Fonctionnement acceptable sur tablette/ordinateur — `À CONFIRMER` (aucune exigence observée) | À confirmer |
| EXG-ACC-01 | Accessibilité | Cibles observées dans le produit : contraste texte ≥ 4.5:1, cibles tactiles ≥ 44 px, focus visible, information jamais portée par la couleur seule, textes non genrés quand l'identité n'est pas connue, alternative « animations réduites » | Importante |
| EXG-ACC-02 | Langue | Français ; autres langues `NON DOCUMENTÉ` | À confirmer |
| EXG-DEV-03 | Retour système mobile | Ne quitte jamais la partie par accident | Importante |

## Indicateurs de santé d'une session

Signaux permettant de considérer une session comme saine (seuils **à définir en mesure**) :

1. Écart maximal de phase entre appareils au premier plan (cible : < 2 s).
2. Retard de transition par rapport à l'échéance théorique (cible : ≤ cadence d'arbitrage).
3. Taux d'actions refusées pour cause de désynchronisation (cible : ~0).
4. Taux de doubles résolutions détectées (cible : 0 — invariant).
5. Taux de reconnexions abouties avec état complet (cible : 100 %).
6. Participation au vote (votes exprimés / votants éligibles) — indicateur d'engagement et de fluidité.
7. Parties terminées par condition de victoire vs purgées « zombies » (cible : purge exceptionnelle).
