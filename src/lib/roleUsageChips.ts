// Fréquence d'usage d'un rôle, présentée en CADRES SÉPARÉS.
// - Source prioritaire : frequency_label (ex. "1×/rassemblement").
// - Repli si vide : dérivée de phase_activation (certains rôles, ex. le
//   Falsificateur, n'ont pas de frequency_label en base).
// - Les libellés composés ("A + B", ex. le Conservateur) sont éclatés en
//   plusieurs cadres pour être plus lisibles.
type FreqRole = {
  frequency_label?: string | null;
  usage_label?: string | null;
  phase_activation?: string | null;
};

function deriveFromPhase(phase?: string | null): string {
  if (!phase) return "";
  const p = phase.toLowerCase();
  const libre = /phase[_ ]*libre/.test(p);
  const rass = /rassemblement/.test(p);
  if (libre && rass) return "1×/phase libre + 1×/rassemblement";
  if (rass) return "1×/rassemblement";
  if (libre) return "1×/phase libre";
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
