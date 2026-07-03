UPDATE public.roles
SET target_mode = 'double',
    phase_activation = 'Phase Libre',
    usage_label = '1×/partie',
    instruction_verb = 'Lier'
WHERE slug = 'entremetteur';