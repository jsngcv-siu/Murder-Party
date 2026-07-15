-- Preuve que la BRANCHE ACTIVE de la garde fonctionne (et pas seulement la garde).
--
-- Angle mort du contrôle précédent (20260715220400) : il a prouvé que le job
-- s'exécute sans erreur — mais AUCUNE partie n'était en cours, donc le `perform
-- net.http_post(...)` sous le `if` n'a jamais tourné. PL/pgSQL vérifie la syntaxe de
-- tout le bloc à la compilation, mais une erreur SÉMANTIQUE (fonction ou argument
-- invalide) n'apparaît qu'à la PREMIÈRE exécution réelle de l'instruction. Autrement
-- dit : la garde pouvait paraître saine et casser uniquement le jour d'une vraie
-- partie — le pire moment, et le gel qu'on cherche justement à éviter.
--
-- Ici on extrait l'expression réellement placée sous le `if` par la migration
-- `ticker_gate`, et on l'exécute une fois, pour de bon. Si elle est invalide, la
-- migration ÉCHOUE maintenant plutôt qu'en pleine soirée de jeu.
--
-- Appeler le ticker hors frontière est sans effet sur le jeu : `tickPhase` sort
-- immédiatement si aucune phase n'est due (c'est aussi ce qui rend l'endpoint sûr).

do $$
declare
  cmd  text;
  expr text;
begin
  select command into cmd from cron.job where jobname = 'phase-ticker';

  if cmd is null then
    raise warning '[ticker] job introuvable — preuve non exécutée.';
    return;
  end if;

  -- Isole ce qui est réellement appelé sous la garde.
  expr := substring(cmd from 'perform\s+(.*?);\s*end if');

  if expr is null then
    raise exception
      '[ticker] Impossible d''isoler l''appel sous la garde — la commande du job n''a pas la forme attendue. Vérifier cron.job avant de compter sur la garde.';
  end if;

  -- Exécution réelle : c'est le test. Une expression invalide lève ici.
  begin
    execute 'select ' || expr;
  exception when others then
    raise exception
      '[ticker] L''APPEL SOUS LA GARDE EST INVALIDE (%) — le ticker échouerait dès qu''une partie démarre, et les parties GÈLERAIENT. Restaurer la commande d''origine du job.',
      sqlerrm;
  end;

  raise notice '[ticker] OK : l''appel sous la garde s''exécute réellement (branche active prouvée).';
end $$;
