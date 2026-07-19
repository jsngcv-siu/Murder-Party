# Idées — la table des ÉVÉNEMENTS du Manoir

> **Statut : IDÉES SEULEMENT — à ne PAS implémenter** (décision Jason 2026-07-18).
> Extrait de `docs/archive/NOUVEAUX_ROLES.md` pour garder le fichier des rôles centré sur
> les rôles. À ressortir le jour où le chantier événements s'ouvre.

> Origine : remplace l'idée « Vigilante masqué rôle émergent » — faire émerger un
> *rôle* écraserait le rôle d'un joueur (frustrant de finir avec juste un couteau).
> À la place, les événements attribuent des **statuts** et des effets ponctuels, sans
> jamais toucher au squelette des phases (contrainte ferme : on ne modifie pas la
> structure temporelle).

**Principe** : à certaines Annonces, le manoir « vit » — un événement tiré d'une table
s'applique et est annoncé dans la Gazette. Déclenchement : probabilité faible par tour
et/ou déclencheurs conditionnels (les colonnes `trigger_emergence` / `compensateur_de`
du schéma `roles` sont inutilisées — le concept peut migrer vers la table d'événements).

**Idées d'événements (à trier)** :

1. **Le Vigilante masqué** *(version retenue de l'idée d'origine)* — un Civil vivant
   aléatoire reçoit le **statut « Vigilante »** + un couteau. Il garde son rôle et sa
   capacité. Déclencheur compensateur possible : 3 civils morts sans qu'aucun Méchant
   n'ait été emprisonné.
2. **L'Évasion** — un prisonnier aléatoire s'évade (sort de prison sans Juge). La
   Gazette l'annonce ; la table débat de qui a scié les barreaux.
3. **La Livraison mystère** — un joueur vivant aléatoire reçoit un objet du catalogue.
   Personne ne sait qui. *(⚠️ jamais de relique : garde-fou Cœur du Manoir posé dans
   `items.ts`, mais l'exclusion reste la règle.)*
4. **La Rumeur** — un joueur aléatoire apparaît « suspect » à toute la table pendant
   un tour (réutilise la mécanique Accusateur). Du bruit dans les enquêtes.
5. **La Panne de courant** — à la prochaine Annonce, les morts sont annoncées **sans
   identité de rôle** (réutilise la mécanique de masquage du Cleaner, version globale).
6. **Le Testament** — le dernier mort laisse un mot : la Gazette publie son **trio de
   rôles** (vrai rôle + 2 leurres, comme l'Assistant) au lieu de rien.
7. **La Pleine lune** — un joueur aléatoire dont la capacité 1×/partie est déjà
   consommée la récupère. (Épicé — à tester.)

**Implém (le jour venu)** : nouveau système (table `game_events` ou tirage dans le
moteur au moment de l'Annonce + entrée Gazette). Ne touche ni au phase-ticker ni aux
phases — un événement est du **contenu d'Annonce**, pas une phase. Coût moyen, mais
mutualisé pour tous les événements futurs. Statuts type « Vigilante » : `role_meta` +
badge UI, patron existant.
