-- Contrôle de santé du ticker APRÈS la pose de la garde (20260715220300).
--
-- Pourquoi ce contrôle existe : la garde a été posée en réécrivant la commande du
-- job cron (chirurgie de chaîne sur une commande créée à la main dans le dashboard,
-- jamais versionnée). `cron.alter_job` ne VALIDE PAS le SQL qu'on lui donne : une
-- commande malformée serait acceptée sans broncher, puis échouerait silencieusement
-- toutes les 5 s — et les parties gèleraient sans que rien ne le signale.
--
-- Ce fichier transforme « on espère que ça marche » en « c'est prouvé » : on laisse
-- le cron s'exécuter, puis on lit ses résultats réels dans `cron.job_run_details`.
-- Si le job échoue, la migration ÉCHOUE et bloque le déploiement.

do $$
declare
  failed   record;
  ok_count int;
begin
  -- Base neuve (db reset, nouveau projet) : le job cron n'existe pas — il n'a jamais
  -- été créé par une migration, cf. AGENTS.md. Il n'y a alors rien à contrôler, et
  -- surtout il ne faut PAS faire échouer la migration : ça bloquerait tout `db reset`.
  if not exists (select 1 from cron.job where jobname = 'phase-ticker') then
    raise warning '[ticker] job "phase-ticker" absent — contrôle ignoré (base neuve ?). Le job doit être recréé à la main : sans lui, les phases n''avancent plus app fermée.';
    return;
  end if;

  -- Laisse passer au moins deux réveils (le job tourne toutes les 5 s).
  perform pg_sleep(12);

  select count(*) into ok_count
  from cron.job_run_details d
  join cron.job j on j.jobid = d.jobid
  where j.jobname = 'phase-ticker'
    and d.start_time > now() - interval '1 minute'
    and d.status = 'succeeded';

  for failed in
    select d.status, d.return_message, d.start_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where j.jobname = 'phase-ticker'
      and d.start_time > now() - interval '1 minute'
      and d.status <> 'succeeded'
    limit 3
  loop
    raise exception
      '[ticker] GARDE CASSÉE — le job échoue (%): %. Le ticker ne tourne plus : les parties GÈLENT. Restaurer la commande d''origine du job avant toute autre chose.',
      failed.status, failed.return_message;
  end loop;

  if ok_count = 0 then
    raise exception
      '[ticker] Aucune exécution RÉUSSIE du job "phase-ticker" dans la dernière minute — garde probablement cassée ou job à l''arrêt.';
  end if;

  raise notice '[ticker] OK : % exécution(s) réussie(s) depuis la pose de la garde.', ok_count;
end $$;
