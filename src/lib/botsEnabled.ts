/**
 * Les bots n'existent que sur le serveur Vite local.
 *
 * Pendant `vite dev` : disponibles (salon `/g/<code>` et bac à sable `/demo`).
 * Partout ailleurs (Vercel prod ET preview) : inertes, comme `requireLocalDevelopment`
 * pour les routes bac-à-sable (cf. `lib/localOnlyRoute.ts`).
 *
 * Pourquoi : un bot est piloté par le NAVIGATEUR d'un joueur — toutes les 4 s il
 * relit toute la table `players` puis écrit votes/capacités/`role_meta`. C'était
 * la première source d'écritures de la base en production, pour un usage
 * exclusivement de test.
 *
 * ⚠️ Ne JAMAIS importer ce module depuis `engine/actions.ts` : ce fichier est
 * bundlé dans l'Edge Function Deno (`phase-ticker`), où `import.meta.env`
 * n'existe pas → BOOT_ERROR et gel de toutes les parties. Les points d'entrée
 * ci-dessous sont tous côté navigateur uniquement.
 */
export const BOTS_ENABLED = import.meta.env.DEV;
