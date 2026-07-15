-- Preuve DE BOUT EN BOUT que la garde laisse réellement passer les appels quand une
-- partie tourne (et pas seulement qu'elle les bloque quand il n'y en a pas).
--
-- Pourquoi cette migration existe : `pg_stat_statements` ne peut PAS servir de preuve
-- ici. Sa configuration par défaut (`track = top`) ne compte que les instructions de
-- premier niveau. Avant la garde, la commande du cron était `select net.http_post(…)`
-- → comptée. Depuis la garde, c'est un bloc `do $g$ … $g$` et l'appel est IMBRIQUÉ →
-- plus compté du tout. Le compteur `ncalls` est donc figé quoi qu'il arrive : il
-- semblerait « prouver » que la garde économise, alors qu'il ne mesure plus rien.
-- Un compteur figé aurait aussi été le symptôme d'une garde CASSÉE (ticker jamais
-- appelé → parties gelées). Les deux hypothèses étaient indiscernables.
--
-- On lit donc la source de vérité : `net._http_response`, où pg_net enregistre les
-- réponses HTTP réellement reçues. Si des réponses du ticker existent, l'appel sous
-- la garde a bien eu lieu pour de vrai.

do $$
declare
  n_recent  int;
  n_ok      int;
  last_seen timestamptz;
begin
  select count(*), max(created)
    into n_recent, last_seen
  from net._http_response
  where created > now() - interval '30 minutes';

  if n_recent = 0 then
    -- Pas une erreur en soi : si aucune partie n'a tourné dans les 30 dernières
    -- minutes, la garde a (correctement) tout bloqué et il n'y a rien à voir.
    raise warning '[ticker] Aucune réponse HTTP depuis 30 min. Attendu SI aucune partie n''a été en cours. À rejouer pendant une partie pour prouver la branche active.';
    return;
  end if;

  select count(*) into n_ok
  from net._http_response
  where created > now() - interval '30 minutes'
    and status_code between 200 and 299;

  raise notice '[ticker] % réponse(s) HTTP reçue(s) en 30 min, dont % en succès (2xx). Dernière : %.',
    n_recent, n_ok, last_seen;

  if n_ok = 0 then
    raise exception
      '[ticker] Des appels partent mais AUCUN ne réussit — le ticker ne fait rien : les parties gèleraient. Inspecter net._http_response (status_code, error_msg).';
  end if;
end $$;
