// Compteur d'egress LOCAL (dev / mode démo uniquement).
//
// Estime les octets que le driver de bots LIT depuis Supabase, pour visualiser
// en direct combien les bots « coûtent » pendant un test. 100 % local : ce
// module n'émet AUCUNE requête réseau — il ne consomme donc lui-même aucun
// egress. Il ne fait qu'additionner la taille des réponses déjà reçues.
//
// Alimenté par bots.ts (runTick) ; lu par le HUD de /demo.

export type EgressStats = {
  totalBytes: number; // cumul estimé des lectures bots
  reads: number; // nombre de lectures comptées
  startedAt: number; // performance.now() de la 1re lecture (0 = pas démarré)
  lastAt: number; // performance.now() de la dernière lecture
};

let stats: EgressStats = { totalBytes: 0, reads: 0, startedAt: 0, lastAt: 0 };
const subs = new Set<(s: EgressStats) => void>();

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

/** Taille approximative en octets d'une réponse (longueur JSON, ASCII ≈ octets). */
export function approxBytes(data: unknown): number {
  try {
    return data == null ? 0 : JSON.stringify(data).length;
  } catch {
    return 0;
  }
}

/** Ajoute une lecture au compteur (appelé après chaque `.select()` des bots). */
export function meterAddRead(bytes: number): void {
  const t = nowMs();
  if (stats.startedAt === 0) stats.startedAt = t;
  stats.totalBytes += bytes;
  stats.reads += 1;
  stats.lastAt = t;
  for (const fn of subs) fn(stats);
}

export function meterReset(): void {
  stats = { totalBytes: 0, reads: 0, startedAt: 0, lastAt: 0 };
  for (const fn of subs) fn(stats);
}

export function meterGet(): EgressStats {
  return stats;
}

/** S'abonne aux mises à jour ; renvoie une fonction de désabonnement. */
export function meterSubscribe(fn: (s: EgressStats) => void): () => void {
  subs.add(fn);
  fn(stats);
  return () => {
    subs.delete(fn);
  };
}

/** Débit moyen en Ko/min depuis la 1re lecture (0 si trop tôt). */
export function meterRateKoPerMin(s: EgressStats = stats): number {
  if (s.startedAt === 0) return 0;
  const elapsedMin = (nowMs() - s.startedAt) / 60000;
  if (elapsedMin <= 0) return 0;
  return s.totalBytes / 1024 / elapsedMin;
}
