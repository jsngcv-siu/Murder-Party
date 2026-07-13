// Fréquence d'usage d'un rôle, présentée en CADRES SÉPARÉS.
// - Source prioritaire : frequency_label (ex. "1×/Enquête").
// - Repli si vide : dérivée de phase_activation (certains rôles n'ont pas de
//   frequency_label en base).
// - Les libellés composés ("A + B") sont éclatés en plusieurs cadres pour être
//   plus lisibles.
type FreqRole = {
  frequency_label?: string | null;
  usage_label?: string | null;
  phase_activation?: string | null;
};

function deriveFromPhase(phase?: string | null): string {
  if (!phase) return "";
  const p = phase.toLowerCase();
  // Refonte boucle : toutes les capacités actives se jouent en Enquête. On tolère
  // encore les anciens libellés ("phase libre"/"rassemblement") tant que la base
  // n'est pas migrée, mais on les présente au joueur en nouveau vocabulaire.
  const enquete = /phase[_ ]*libre|enqu[eê]te/.test(p);
  if (enquete) return "1×/Enquête";
  return "";
}

/** Liste des cadres de fréquence (compound "A + B" → 2 entrées). */
export function frequencyChips(role: FreqRole | null | undefined): string[] {
  if (!role) return [];
  const raw =
    (role.frequency_label && role.frequency_label.trim()) ||
    deriveFromPhase(role.phase_activation) ||
    (role.usage_label && role.usage_label.trim()) ||
    "";
  if (!raw) return [];
  return raw
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
