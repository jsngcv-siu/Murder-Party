-- Purge : protéger les parties vivantes + évacuer les parties zombies.
--
-- BUG CORRIGÉ (grave). L'ancienne règle gardait « les N parties les plus RÉCENTES
-- par created_at », sans jamais regarder `status`. Conséquence : dès qu'une 4e partie
-- était créée, la plus ancienne était supprimée — MÊME EN COURS, avec ses joueurs
-- dedans. Toutes les 30 minutes. La règle de comptage est donc supprimée, pas
-- rafistolée : c'était elle le problème.
--
-- Nouvelle règle, uniquement TEMPORELLE :
--   • partie terminée               → supprimée 30 min après sa FIN (`ended_at`) ;
--   • partie lancée il y a plus de 4 h → supprimée quel que soit son état.
--
-- Les deux délais se mesurent sur la bonne date, et c'est essentiel :
--   • `ended_at` (pas `created_at`) pour le délai de fin, sinon une partie créée le
--     matin et terminée à l'instant serait supprimée avant l'écran de fin ;
--   • `started_at` (pas `created_at`) pour l'âge, sinon un salon ouvert dans la
--     journée et lancé le soir serait purgé À LA SECONDE où il démarre.
-- `coalesce(..., created_at)` couvre les salons jamais lancés (abandonnés) et les
-- lignes anciennes où la colonne serait nulle.
--
-- La seconde règle règle du même coup les parties ZOMBIES : une partie qu'aucune
-- condition de victoire ne clôt reste `in_progress` indéfiniment, et le ticker la
-- ré-avance jusqu'à 6 transitions toutes les 5 s, en boucle, en générant des
-- notifications à chaque passage (d'où 11 893 notifications pour 3 parties). Elle
-- s'arrête maintenant au bout de 4 h. Même chose pour une partie buguée/bloquée :
-- elle disparaît au lieu de tourner à vide pour toujours.
--
-- Pourquoi 4 h et pas 2 h : supprimer une vraie partie en cours est irréversible,
-- alors qu'une zombie qui traîne 2 h de plus ne coûte presque rien une fois les bots
-- coupés en production et le ticker mis sous garde. 4 h ≈ 2× une vraie soirée.
-- Pour changer d'avis : c'est le seul chiffre de `p_max_age` ci-dessous.

-- L'ancienne signature (keep integer) disparaît : la garder inviterait à rappeler
-- la règle de comptage buguée. `drop` explicite car la signature change.
drop function if exists public.purge_old_games(integer);

create or replace function public.purge_old_games(
  p_max_age      interval default interval '4 hours',
  p_ended_grace  interval default interval '30 minutes'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  doomed uuid[];
  deleted integer;
begin
  select array_agg(id) into doomed
  from public.games
  where
    -- Partie terminée : on laisse le temps de lire l'écran de fin, à compter de la FIN.
    (status = 'ended' and coalesce(ended_at, created_at) < now() - p_ended_grace)
    -- Filet d'âge, à compter du LANCEMENT (ou de la création si jamais lancée) :
    -- couvre les zombies, les parties buguées et les salons abandonnés.
    or coalesce(started_at, created_at) < now() - p_max_age;

  if doomed is null then
    return 0;
  end if;

  -- Tables portant game_id SANS FK cascade → nettoyage explicite d'abord.
  delete from public.chat_messages   where game_id = any(doomed);
  delete from public.inventory       where game_id = any(doomed);
  delete from public.player_statuses where game_id = any(doomed);

  -- games : cascade vers players / role_actions / notifications / votes /
  -- gathering_calls.
  delete from public.games where id = any(doomed);
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- ── Index des colonnes de cascade ──
-- Chaque `delete from games` doit valider 5 FK référençantes. Sans index sur la
-- colonne référençante, Postgres fait un SEQ SCAN complet par cascade et par ligne
-- supprimée : c'est ce qui faisait durer la purge ~1,5 s à chaque passage (mesuré :
-- 64 appels = 1 min 39 s). `votes` est déjà couvert par le préfixe de son index
-- unique (game_id, tour, voter_player_id).
create index if not exists notifications_game_idx   on public.notifications(game_id);
create index if not exists role_actions_game_idx    on public.role_actions(game_id);
create index if not exists gathering_calls_game_idx on public.gathering_calls(game_id);

-- Le job existant appelle `purge_old_games(3)` — signature supprimée ci-dessus, il
-- échouerait. On le replanifie sur la nouvelle signature (valeurs par défaut).
select cron.schedule(
  'purge-old-games',
  '*/30 * * * *',
  $$select public.purge_old_games()$$
);

-- Purge immédiate : évacue l'accumulation actuelle avec la nouvelle règle.
select public.purge_old_games();

-- ── Ménage des index gonflés ──
-- Le cycle « insertion en masse puis purge » a laissé des index très gonflés :
-- notifications_pkey ×8 (14 Mo gaspillés pour 2,5 Mo de données réelles) et
-- chat_messages_game_channel_idx ×78. Un index gonflé = des pages mortes lues et
-- entretenues à chaque écriture. REINDEX les reconstruit compacts.
reindex index public.notifications_pkey;
reindex index public.notifications_player_idx;
reindex index public.chat_messages_game_channel_idx;
reindex index public.gathering_calls_pkey;
