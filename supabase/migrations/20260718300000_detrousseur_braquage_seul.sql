-- Détrousseur : plus de vol au kill ordinaire (décision Jason 2026-07-18).
-- Le kill 1×/Enquête est un kill sec ; SEUL le braquage 1×/partie pille —
-- et il rafle TOUT l'inventaire de la victime. Moteur aligné (handler
-- detrousseur : payload.loot uniquement en braquage ; resolver : pillage
-- conditionné à loot = "all"). La carte suit.

UPDATE public.roles SET
  capacite_full_text =
    'Une fois par Enquête, tue 1 cible. Une fois dans la partie, arme ton BRAQUAGE : ce kill-là rafle TOUT l''inventaire de la victime.',
  description =
    'Il tue proprement — jusqu''au soir où il repart avec la malle entière.'
WHERE slug = 'detrousseur';
