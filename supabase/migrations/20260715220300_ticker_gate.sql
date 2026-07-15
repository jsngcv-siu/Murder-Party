-- Le phase-ticker ne travaille QUE s'il y a une partie en cours.
--
-- Constat mesuré : `net.http_post` (l'appel cron → Edge Function) représentait
-- 63,9 % du temps d'exécution de la base sur 12 jours — 51 538 appels, soit un
-- toutes les 5 s, 24h/24, y compris quand il n'existe AUCUNE partie.
--
-- Correctif : on garde le réveil toutes les 5 s (la précision des transitions ne
-- bouge pas quand une partie tourne), mais l'appel HTTP est conditionné à
-- l'existence d'une partie `in_progress`. Sans partie, le réveil ne fait plus qu'un
-- EXISTS indexé sur une poignée de lignes — quelques microsecondes — au lieu d'un
-- aller-retour HTTP vers la Edge Function.
--
-- Pourquoi pas un trigger qui allume/éteint le cron à la création d'une partie :
-- si l'extinction ou le rallumage rate UNE fois (crash, partie supprimée par la
-- purge), soit le job tourne pour rien, soit les parties GÈLENT — le bug déjà
-- combattu en V0.207/V0.211. Une garde relue à chaque réveil est auto-réparatrice :
-- elle ne peut pas se désynchroniser de la réalité.
--
-- Le job cron n'a jamais été versionné (créé à la main dans le dashboard) : sa
-- fréquence n'était pas auditable et aurait été perdue à toute recréation du projet.
-- On le réécrit ici en préservant l'URL et l'en-tête d'origine — le secret n'est
-- jamais lu ni recopié en clair dans cette migration.

-- Filtre du ticker (`select id from games where status = 'in_progress'`) et de la
-- garde ci-dessous : sans index, c'est un scan complet à chaque réveil.
create index if not exists games_status_idx on public.games(status);

do $$
declare
  j            record;
  inner_expr   text;
  new_command  text;
  found_count  int := 0;
begin
  for j in
    select jobid, jobname, schedule, command
    from cron.job
    where command ilike '%phase-ticker%'
  loop
    found_count := found_count + 1;

    if j.command ilike '%mp_ticker_guard%' then
      raise notice '[ticker] job "%" (%): déjà sous garde, inchangé.', j.jobname, j.schedule;
      continue;
    end if;

    -- Le commande d'origine est de la forme `select net.http_post(...)`. On isole
    -- l'expression (sans le `select` ni le `;` final) pour la replacer telle quelle
    -- sous la garde : URL et en-tête d'authentification sont conservés à l'identique.
    inner_expr := regexp_replace(j.command, '^\s*select\s+', '', 'i');
    inner_expr := regexp_replace(inner_expr, '[\s;]+$', '');

    new_command := format(
      '-- mp_ticker_guard : n''appelle le phase-ticker que si une partie tourne.'
      || E'\ndo $g$ begin'
      || E'\n  if exists (select 1 from public.games where status = ''in_progress'') then'
      || E'\n    perform %s;'
      || E'\n  end if;'
      || E'\nend $g$;',
      inner_expr
    );

    perform cron.alter_job(j.jobid, command => new_command);
    raise notice '[ticker] job "%" (%) mis sous garde.', j.jobname, j.schedule;
  end loop;

  if found_count = 0 then
    -- Ne PAS échouer : la migration doit rester applicable sur une base neuve, où
    -- le job n'existe pas encore. Mais en prod, ce message signale que le job est
    -- introuvable → à vérifier avant de conclure que la garde est active.
    raise warning '[ticker] AUCUN job cron contenant "phase-ticker" trouvé — garde NON appliquée.';
  end if;
end $$;

-- ── Diagnostic pour la décision « retirer --no-verify-jwt ? » ──
-- L'endpoint est déployé sans vérification de jeton : n'importe qui peut le marteler.
-- Avant de l'authentifier, il faut savoir quelle clé le cron envoie — sinon on coupe
-- le cron et TOUTES les parties gèlent. On décode le seul claim `role` du JWT porté
-- par l'en-tête Authorization ; la clé elle-même n'est ni journalisée ni exposée.
do $$
declare
  j        record;
  token    text;
  payload  text;
  claims   jsonb;
begin
  for j in select jobname, command from cron.job where command ilike '%phase-ticker%' loop
    token := substring(j.command from 'Bearer\s+([A-Za-z0-9_\-\.]+)');
    if token is null then
      raise notice '[ticker] job "%": aucun jeton Bearer détecté.', j.jobname;
      continue;
    end if;
    payload := split_part(token, '.', 2);
    payload := translate(payload, '-_', '+/');
    payload := payload || repeat('=', (4 - length(payload) % 4) % 4);
    begin
      claims := convert_from(decode(payload, 'base64'), 'utf8')::jsonb;
      raise notice '[ticker] job "%": le cron s''authentifie avec le rôle "%".',
        j.jobname, claims ->> 'role';
    exception when others then
      raise notice '[ticker] job "%": jeton Bearer présent mais illisible.', j.jobname;
    end;
  end loop;
end $$;
