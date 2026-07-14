-- Nettoyage automatique des parties fantômes / de démo qui s'accumulent et
-- saturent l'instance (nano). Rétention : on ne garde que les N parties les
-- plus récentes (par created_at) ; tout le reste est supprimé avec ses données.
--
-- Dépendances vers games :
--   • FK ON DELETE CASCADE (auto) : players, role_actions, notifications,
--     votes, gathering_calls.
--   • game_id SANS FK (orphelins sinon) : chat_messages, inventory,
--     player_statuses → supprimés explicitement par game_id.

create or replace function public.purge_old_games(keep integer default 3)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  doomed uuid[];
  deleted integer;
begin
  -- Parties au-delà des `keep` plus récentes.
  select array_agg(id) into doomed
  from (
    select id from public.games
    order by created_at desc
    offset greatest(keep, 0)
  ) old;

  if doomed is null then
    return 0;
  end if;

  -- Tables sans FK cascade → nettoyage explicite d'abord.
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

-- Purge immédiate : nettoie l'accumulation actuelle (ne garde que 3 parties).
select public.purge_old_games(3);

-- Planification : toutes les 30 min (extension pg_cron déjà active pour le
-- phase-ticker). Le job upsert par nom s'il existe déjà.
select cron.schedule(
  'purge-old-games',
  '*/30 * * * *',
  $$select public.purge_old_games(3)$$
);
