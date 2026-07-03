# Murder Party

Assistant compagnon pour parties Murder Party à rôles cachés (mobile-first, temps réel).

## Stack

- **Front / SSR** : [TanStack Start](https://tanstack.com/start) (React 19, Vite 7, Nitro), Tailwind CSS 4, shadcn/ui, GSAP.
- **Backend** : [Supabase](https://supabase.com) — Postgres (+ RLS), Auth anonyme, Realtime, Storage.
- **Déploiement** : Vercel (auto-détecté par Nitro au build).

Le projet a été initié sur Lovable puis détaché : plus aucune dépendance Lovable dans le build.

## Démarrer en local

```bash
cp .env.example .env   # puis remplir avec les clés de votre projet Supabase
npm install
npm run dev            # http://localhost:5173
```

`npm run build` produit un build de prod ; en local il sort dans `.output/` et se lance avec `node .output/server/index.mjs`.

## Déployer sur Vercel

1. Pousser ce repo sur GitHub (ou GitLab/Bitbucket).
2. Sur [vercel.com](https://vercel.com) → **Add New → Project** → importer le repo.
3. Framework preset : **Vite** (build `npm run build` — Nitro détecte Vercel et génère `.vercel/output`, Vercel l'utilise automatiquement).
4. Renseigner les variables d'environnement (Settings → Environment Variables) :

   | Variable                        | Valeur                              |
   | ------------------------------- | ----------------------------------- |
   | `VITE_SUPABASE_URL`             | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | clé anon / publishable              |
   | `VITE_SUPABASE_PROJECT_ID`      | `<project-ref>`                     |

   (Le serveur SSR retombe sur les mêmes noms — pas de doublons `SUPABASE_*` à créer. `SUPABASE_SERVICE_ROLE_KEY` uniquement si des opérations admin serveur sont ajoutées — jamais en `VITE_*`.)

5. Deploy. C'est tout : pas de `vercel.json` nécessaire.

## Backend Supabase : se détacher de Lovable Cloud

Le projet Supabase historique (`svxjejyaytytfwjnkubv`) est provisionné **par Lovable Cloud** : vous n'en avez pas la pleine propriété et il vit tant que le projet Lovable existe. Pour être 100 % autonome, recréez le backend sur votre propre compte Supabase :

1. **Créer un projet** sur [supabase.com](https://supabase.com) (plan gratuit suffisant pour commencer).
2. **Appliquer le schéma** (toutes les migrations sont dans `supabase/migrations/`) :
   ```bash
   npx supabase login
   npx supabase link --project-ref <nouveau-project-ref>
   npx supabase db push
   ```
   Cela crée les tables, la RLS, les fonctions (dont `server_now_ms`), le realtime **et les buckets Storage** (`icon-avatar`, `icon-role` — migration `20260704120000`).
3. **Activer l'auth anonyme** : Dashboard → Authentication → Sign In / Up → activer _Anonymous sign-ins_ (l'app repose dessus, pas de compte utilisateur).
4. **Storage — uploader les images** :
   - Bucket `icon-avatar` : les avatars joueurs. Déposez vos PNG à la racine, préfixés par catégorie (`femme-…`, `homme-…`, sinon rangés dans « autres ») ; le client liste le bucket en live, aucun SQL requis.
   - Bucket `icon-role` : les icônes de rôles, nommées d'après le slug du rôle (`tueur.png`, …). Un trigger DB stocke le chemin dans `roles.image_url` ; le client reconstruit l'URL du projet courant (`src/lib/storageUrl.ts`), donc aucune URL codée en dur ne survit au changement de projet.
5. **Mettre à jour `.env`** (local) et les variables Vercel avec l'URL et la clé du nouveau projet, puis mettre à jour `project_id` dans `supabase/config.toml`.
6. Regénérer les types si vous modifiez le schéma : `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`.

### Où sont stockées les données ?

| Donnée                                       | Emplacement                                                    |
| -------------------------------------------- | -------------------------------------------------------------- |
| Parties, joueurs, rôles, votes, chat, events | Tables Postgres (temps réel via Supabase Realtime)             |
| Identité joueur                              | Supabase Auth anonyme (`auth.uid()`) + `localStorage` (pseudo) |
| Avatars & icônes de rôles                    | Supabase Storage (buckets publics `icon-avatar`, `icon-role`)  |

Aucun stockage Vercel (KV/Blob/Postgres) n'est nécessaire : Vercel ne fait que servir l'app (SSR + statique), tout l'état vit dans Supabase.

## Scripts utiles

- `npm run lint` / `npm run format`
- `node scripts/role-static-audit.mjs` — audit statique des rôles
- `node sim/balance.mjs` — simulations d'équilibrage
- Routes de test : `/demo` (sandbox MJ + bots + QA), `/dev` (galerie d'écrans en états synthétiques)
