-- Fuite corrigée : les lignes orphelines ne disparaissaient jamais.
--
-- Constaté après la première purge temporelle : 0 partie en base, mais 31 lignes
-- encore dans `chat_messages`. Explication : `chat_messages`, `inventory` et
-- `player_statuses` portent un `game_id` SANS clé étrangère — donc AUCUNE cascade.
-- `purge_old_games` les nettoie explicitement, mais uniquement pour les parties
-- qu'elle supprime elle-même. Toute partie disparue par un autre chemin (suppression
-- manuelle dans le dashboard, ancien script, reset) laisse ses lignes derrière elle,
-- définitivement : plus aucune purge ne les voit passer, puisqu'elles ne
-- correspondent plus à aucune partie.
--
-- On ajoute donc un ramassage d'orphelins : tout ce qui référence une partie qui
-- n'existe plus est supprimé. C'est le filet qui rend la purge complète quel que
-- soit le chemin par lequel une partie s'en va.

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

  if doomed is not null then
    -- Tables portant game_id SANS FK cascade → nettoyage explicite d'abord.
    delete from public.chat_messages   where game_id = any(doomed);
    delete from public.inventory       where game_id = any(doomed);
    delete from public.player_statuses where game_id = any(doomed);

    -- games : cascade vers players / role_actions / notifications / votes /
    -- gathering_calls.
    delete from public.games where id = any(doomed);
    get diagnostics deleted = row_count;
  else
    deleted := 0;
  end if;

  -- Ramassage des orphelins : lignes dont la partie n'existe plus, quel que soit le
  -- chemin par lequel elle a disparu. Sans ceci, elles restent en base pour toujours.
  delete from public.chat_messages c
   where not exists (select 1 from public.games g where g.id = c.game_id);
  delete from public.inventory i
   where not exists (select 1 from public.games g where g.id = i.game_id);
  delete from public.player_statuses s
   where not exists (select 1 from public.games g where g.id = s.game_id);

  return deleted;
end;
$$;

-- Index des colonnes de ramassage : sans eux, chaque passage de la purge scanne
-- intégralement ces trois tables.
create index if not exists chat_messages_game_idx   on public.chat_messages(game_id);
create index if not exists inventory_game_idx       on public.inventory(game_id);
create index if not exists player_statuses_game_idx on public.player_statuses(game_id);

-- Évacue les orphelins déjà présents.
select public.purge_old_games();
