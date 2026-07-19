// Retour haptique via l'API Vibration du navigateur.
// Supporté sur Android (Chrome/Firefox) ; iOS Safari l'ignore silencieusement —
// c'est voulu : la vibration est un bonus, jamais un canal d'information critique
// (chaque déclencheur a toujours une surface visible : badge, modale, panneau).
// NB : le navigateur exige une « sticky activation » (au moins un tap dans la
// page) avant d'autoriser vibrate() — toujours vrai en partie, le joueur a
// forcément interagi pour entrer.

/** Motifs par événement (ms vibration / pause / vibration…). */
export const VIBES = {
  /** Nouvel objet reçu dans l'inventaire. */
  item: [35, 50, 35],
  /** Capacité redevenue disponible (début d'Enquête). */
  capacity: [25, 40, 25],
  /** Modale personnelle (mort, prison, parloir, pacte…). */
  modal: [50, 60, 50],
} as const satisfies Record<string, number[]>;

export function vibrate(pattern: number | readonly number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern as number | number[]);
    }
  } catch {
    /* API absente ou bloquée : sans conséquence. */
  }
}
