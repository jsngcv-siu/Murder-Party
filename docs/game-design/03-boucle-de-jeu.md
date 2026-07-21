# 03 — Boucle de jeu

## Boucle principale

Chaque **tour** répète quatre phases dans un ordre fixe et immuable :

```
Enquête  →  Annonce  →  Débat  →  Vote  →  (tour suivant)
 (agir)     (subir)    (parler)   (juger)
```

| Phase | Ce que le joueur y fait | Ce que le jeu y fait |
|---|---|---|
| **Enquête** | Joue sa capacité, utilise un objet, écrit/relit ses notes. Tout est secret. | Enregistre les intentions ; aucun effet visible. |
| **Annonce** | Lit la Gazette et ses modales personnelles. | Résout toutes les intentions dans l'ordre des couches, confirme les morts différées, publie les dépêches. |
| **Débat** | Parle, ment, accuse — **à la table**, sans action dans l'application. | Rien : temps social pur. |
| **Vote** | Désigne secrètement qui emprisonner (ou s'abstient). | Dépouille, tranche les égalités, affiche le verdict, emprisonne. |

`CONFIRMÉ` — Contrainte ferme du projet : cette structure ne doit jamais être modifiée (pas de phase ajoutée/supprimée ; toute nouveauté devient du contenu d'Annonce, un statut ou un rôle).

## Ce qu'un joueur observe / décide / exécute, et les conséquences

- **Observe** : la Gazette (faits publics avares : morts par faction, prison, événements anonymes), ses informations privées (résultats d'enquête, indices, objets reçus, statuts), le comportement des autres à la table.
- **Décide** : qui cibler avec sa capacité, quel objet jouer, qui croire, quoi révéler ou taire au Débat, qui marquer sur son mur des suspicions, pour qui voter.
- **Exécute** : une action de capacité par fenêtre autorisée, au plus un objet par tour, un vote par tour. Les actions sont enregistrées immédiatement mais leurs effets sont différés.
- **Conséquences possibles** : informations privées gagnées, morts à l'Annonce, statuts posés (blocage, poison, protection…), emprisonnement au Vote, bascule de camp (morsure), fin de partie.

## Sous-boucles

1. **Boucle d'information (par joueur)** : enquêter → recouper avec la Gazette et les indices → mettre à jour son mur des suspicions → orienter son vote et son discours. Cette boucle privée alimente la boucle sociale.
2. **Boucle de l'équipe Méchante** : cible du Tueur partagée → couverture mutuelle au Débat → votes coordonnés. Le chat d'équipe et le tampon « allié » sur les écrans de vote soutiennent cette boucle.
3. **Boucle de la prison** : vote → emprisonnement → enjeux dérivés (lecture par l'Avocat/l'Archiviste, parloir du Geôlier, libération du Juge, évasion du Corrupteur, exécution de l'Exécuteur) → retour au jeu ou mort révélée.
4. **Boucle des objets** : réception (setup, Facteur, Armurier, Contrebandier, Apothicaire, reliques) → détention (volable, duplicable) → usage en Enquête → dénouement à l'Annonce.
5. **Boucle des morts** : mort → révélation de faction + testament → Conseil des Morts (chat) → information continue vers le Médium vivant.
6. **Boucles de menace neutre** : chacune progresse vers un objectif personnel visible d'elle seule (empoisonnements cumulés, aspersions du Pyromane, morsures du clan vampire, photos du Photographe…).

## Montée de l'information, de la tension et de la suspicion

- **L'information ne fait que croître** : chaque tour ajoute des morts (factions révélées), des résultats d'enquête privés, des annonces anonymes qui prouvent l'existence d'une menace (morsure → il y a un vampire ; miaulement → le Chat existe et a été attaqué ; « effacé » → un Cleaner opère).
- **La population décroît** : morts et emprisonnements resserrent l'étau et rapprochent mécaniquement toutes les conditions de victoire (majorité méchante, éradication, dernier survivant).
- **La tension est scandée** : chaque Annonce est un dénouement ; chaque Vote un jugement public irréversible pour le tour.
- **La suspicion est outillée** : le mur des suspicions transforme l'intuition en engagement (espionnable, et décisif dans la variante Suspicion).

## Mécanismes empêchant la stagnation

`CONFIRMÉ` sauf mention :

1. **Chronomètres** : chaque phase a une durée bornée ; en mode Joueur Only l'avancement est automatique et se poursuit même si tous les téléphones sont en veille.
2. **Auto-résolution des choix obligatoires** : les rôles à choix initial (couverture de l'Usurpateur, être cher du Vengeur, prophétie de l'Oracle, cible du Mouchard) sont tirés d'office au tour 1 si le joueur ne valide pas.
3. **Le vote emprisonne toujours quelqu'un** en vote classique (égalité tranchée au sort) — la variante Suspicion, elle, peut ne désigner personne.
4. **Les indices de départ** relancent la première Enquête (il y a toujours quelque chose à recouper dès le tour 1).
5. **Rôles moteurs de morts** : le Tueur frappe chaque tour ; les menaces neutres progressent chaque tour.
6. **Filet anti-blocage de fin** : s'il ne reste qu'un survivant libre, il gagne quel que soit son rôle — aucune partie ne peut rester sans conclusion.
7. **Purge des parties abandonnées** (comportement d'application) : une partie terminée est effacée peu après sa fin ; toute partie trop ancienne est effacée d'office.

## Ce qui fait progresser la partie vers sa conclusion

- La **létalité structurelle** : au moins une attaque méchante par tour, plus les tueurs civils, les neutres hostiles et l'exécution — la population baisse de façon quasi monotone.
- La **prison** : même sans mort, le vote retire un acteur du décompte des « survivants libres », lequel fonde la plupart des conditions de victoire.
- La **vérification continue des victoires** : à chaque mort, conversion, empoisonnement ou fin de résolution, le jeu teste toutes les conditions dans leur ordre de priorité et clôt immédiatement la partie dès qu'une est vraie (voir [10-victoire-defaite-et-fin-de-partie.md](10-victoire-defaite-et-fin-de-partie.md)).
