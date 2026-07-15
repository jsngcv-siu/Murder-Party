# Instructions projet - Murder Party

Ces instructions s'appliquent à tout le dépôt.

## Référence obligatoire pour toute modification visuelle

Avant de modifier une interface, un composant, une couleur, une typographie, une animation ou un parcours UX, lire dans cet ordre :

1. `docs/brand/THE FULL DA.pdf` - source visuelle de référence et autorité artistique.
2. `DESIGN.md` - traduction normative de la DA en tokens, composants et règles applicables.
3. `docs/ART_DIRECTION.md` - résumé opérationnel, règles métier et correspondances avec l'UI actuelle.
4. Le composant cible et `src/styles.css` - vérité sur l'implémentation et les tokens réellement disponibles.

Le PDF décide du style. Le code existant décide du comportement et des données. `DESIGN.md` relie les deux. En cas d'écart, préserver la logique métier, puis rapprocher visuellement l'interface du PDF avec les tokens existants ou une extension documentée du système.

## Méthode obligatoire

- Auditer le rendu actuel avant de dessiner ou coder une variante.
- Concevoir mobile-first dans un viewport étroit, puis vérifier le desktop.
- Mettre l'information de jeu principale au-dessus de la ligne de flottaison.
- Réutiliser les pièces de la DA : papier, liège, bois, ficelle rouge, punaise, tampon, post-it et polaroïd uniquement quand leur fonction correspond au contexte.
- Conserver la grammaire typographique : `Special Elite` pour dossier/tampon, `Caveat` pour annotations, `Archivo` pour le corps et les contrôles.
- Ne jamais révéler un rôle, une faction, une cible ou une cause de mort que le gameplay garde secret.
- Vérifier contraste, focus, cibles tactiles et `prefers-reduced-motion`.
- Valider visuellement les surfaces joueur dans `/dev`; utiliser `/annonce-lab` pour les variantes de l'onglet Annonces.

## Interdits de DA

- Dashboard SaaS générique ou grille de cartes identiques.
- Glassmorphism décoratif, gradient de texte, néons futuristes ou violet gaming par défaut.
- Matière vintage sans fonction, accumulation de cadres imbriqués ou sceau de cire sur une nouvelle ordinaire.
- Animation purement décorative ou action inventée sur un écran informatif.

## Déploiement & migrations (l'agent peut le faire lui-même)

Le CLI Supabase est **lié au projet prod** `eqcfagjvbiwhsofzmqtg` (org `buenckmwhbleofjvhona`) avec des identifiants stockés fonctionnels. Inutile de demander à l'utilisateur de préparer/coller le SQL : appliquer les migrations directement.

- **Appliquer les migrations en attente sur prod** : `npx supabase db push --linked < /dev/null`
  (le `< /dev/null` auto-confirme le prompt `[Y/n]`). Ne nécessite PAS `SUPABASE_DB_PASSWORD` — les identifiants du CLI suffisent. Note réseau : l'hôte DB direct `db.<ref>.supabase.co` (IPv6) time out depuis cet environnement, mais le CLI bascule sur le pooler IPv4 `aws-0-eu-west-1.pooler.supabase.com:5432` qui est joignable.
- **Vérifier l'état distant** : `npx supabase migration list --linked < /dev/null` (la migration doit apparaître avec `local` == `remote`).
- **Déployer l'Edge Function** `phase-ticker` : `npm run deploy:edge` (build esbuild + `supabase functions deploy`). Une GitHub Action la déploie aussi au push.
- **Frontend** : déployé par Vercel au push sur `main`.

**Garde-fou d'ordre** : si une migration ajoute des colonnes qu'un code (client OU edge) va écrire dans le même `update` que `status='ended'`, appliquer la migration AVANT de déployer ce code — sinon l'`update` échoue (colonne inconnue) et les parties gèlent en fin de partie.

Ces actions touchent la prod : les mener quand la tâche les implique clairement, et rapporter précisément ce qui a été appliqué/déployé. Ne pas `git push` sans accord explicite.

### Le cron du phase-ticker (job `phase-ticker`, toutes les 5 s)

Ce job **n'a jamais été créé par une migration** : il a été posé à la main dans le dashboard prod. Il n'est donc pas recréé par un `db reset` ni sur un nouveau projet — sans lui, les phases n'avancent plus dès que toutes les apps sont fermées. À retenir :

- **Cadence** : `5 seconds`. **Commande** : `net.http_post` vers `…/functions/v1/phase-ticker`.
- **Garde** (migration `20260715220300_ticker_gate`) : la commande est enveloppée dans un `if exists (select 1 from public.games where status = 'in_progress')`. Sans partie en cours, aucun appel HTTP n'est émis — c'était 63,9 % du temps d'exécution de la base. Le marqueur `mp_ticker_guard` dans la commande rend la migration idempotente.
- **Ne PAS retirer `--no-verify-jwt`** (`package.json`, `.github/workflows/deploy-phase-ticker.yml`) **en l'état** : vérifié le 2026-07-15, le cron **n'envoie aucun en-tête `Authorization`**. Activer la vérification de jeton ferait échouer chaque appel → **toutes les parties gèlent**. Pour authentifier l'endpoint, ajouter d'ABORD un en-tête au job cron, ensuite seulement retirer le drapeau.
- **Inspecter le job** : `select jobname, schedule, command from cron.job;` et
  `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`
  (à lancer dans le SQL editor du dashboard — le CLI n'a **pas** de commande de requête libre ; `npx supabase inspect db …` ne couvre pas `cron`).

### Purge automatique (`purge_old_games`, job `purge-old-games`, toutes les 30 min)

Règle **uniquement temporelle** (depuis `20260715220200`) : partie terminée supprimée 30 min après `ended_at` ; **toute partie lancée il y a plus de 4 h** supprimée quel que soit son état (couvre les parties zombies/buguées). Les délais sont les deux paramètres par défaut de la fonction. L'ancienne règle « garder les 3 plus récentes » a été supprimée : elle pouvait effacer une partie EN COURS.
