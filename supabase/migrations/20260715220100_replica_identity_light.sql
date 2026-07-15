-- Disk IO : arrêter de réécrire la ligne ENTIÈRE dans le WAL à chaque modification.
--
-- Les 7 tables de jeu étaient en REPLICA IDENTITY FULL (migration initiale
-- 20260512170135). Avec FULL, Postgres recopie l'ANCIENNE ligne complète dans le
-- journal disque à chaque UPDATE/DELETE, puis le décodage logique la rediffuse aux
-- abonnés Realtime. Sur `players`, qui porte le jsonb `role_meta`, un simple
-- `update({ is_alive: false })` réécrivait donc tout le JSON sur le disque. C'était
-- le premier poste de Disk IO de l'instance (realtime.list_changes = 25,6 % du temps
-- d'exécution mesuré sur 12 jours).
--
-- Vérifié AVANT de toucher quoi que ce soit : personne n'utilise les anciennes
-- valeurs. Aucun `payload.old` / `old_record` dans le code, aucun abonnement
-- `event: "DELETE"`. FULL ne servait donc à rien — il ne faisait que coûter.

-- ── Tables où l'identité par défaut (clé primaire) suffit ──
-- Les abonnements portent sur des INSERT/UPDATE (filtres évalués sur la NOUVELLE
-- ligne, toujours complète) ; les suppressions n'y arrivent que par la purge ou un
-- reset, où plus personne n'écoute.
alter table public.games            replica identity default;
alter table public.notifications    replica identity default;
alter table public.gathering_calls  replica identity default;
alter table public.votes            replica identity default;
alter table public.role_actions     replica identity default;
alter table public.chat_messages    replica identity default;

-- ── players : cas particulier ──
-- C'est la table qui gagne le plus (jsonb `role_meta`)… mais aussi la seule dont
-- les DELETE comptent en production : l'host peut exclure un vrai joueur
-- (`routes/g.$code.tsx`, action « exclure/supprimer »), et les autres écrans
-- doivent le voir disparaître en direct. Or avec `default`, une suppression ne
-- transporte que la clé primaire → le filtre `game_id=eq.…` de l'abonnement ne la
-- reconnaîtrait plus et l'événement serait perdu.
--
-- On évite le compromis : `UNIQUE (game_id, session_id)` existe déjà et remplit les
-- conditions d'une identité de réplication (unique, non partiel, colonnes NOT NULL).
-- Postgres n'écrit alors que ces DEUX colonnes au lieu du jsonb entier, ET `game_id`
-- reste présent dans les suppressions → le filtre continue de fonctionner.
-- Bonus : cet index n'était jusqu'ici jamais lu (0 scan) — il servait à rien tout en
-- étant maintenu à chaque écriture. Il a désormais un rôle.
alter table public.players replica identity using index players_game_id_session_id_key;

-- ── Bandeau de statuts : abonnement mort → table publiée ──
-- `components/StatusBandeau.tsx` s'abonne à `player_statuses` depuis toujours, mais
-- la table n'était PAS dans la publication → l'abonnement ne s'est jamais déclenché.
-- Le bandeau n'était rafraîchi qu'au changement de tour : un statut posé en cours de
-- tour restait invisible. Bug de fraîcheur, pas seulement du code mort.
-- Coût ≈ nul : quelques lignes, écrites uniquement à la résolution.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'player_statuses'
  ) then
    alter publication supabase_realtime add table public.player_statuses;
  end if;
end $$;

-- `default` explicite (et non FULL) : le filtre `player_id` de l'abonnement porte sur
-- des INSERT/UPDATE. Les statuts expirent logiquement via `active_until_tour` — déjà
-- filtré au chargement — donc aucune suppression n'a besoin d'être transportée.
alter table public.player_statuses replica identity default;
