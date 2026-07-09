// Source UNIQUE des durées d'intro / transition de phase, partagée par le moteur
// (tickPhase), l'UI (frames + compteur), la démo et le harnais QA.
//
// ⚠️ NE JAMAIS recopier ces valeurs en dur ailleurs : un désalignement entre la
// durée d'affichage d'une frame et la « tête de série » réservée côté serveur
// casse le calage compteur ↔ transition (le timer démarre pendant la frame, ou
// la phase attend après 0:00). Tout le monde importe d'ici.

/** Durée de la frame de transition d'entrée d'une phase (ms). Le compteur de la
 *  phase ne démarre qu'APRÈS cette fenêtre, et `tickPhase` réserve exactement
 *  autant de temps côté serveur avant de décompter la durée de la phase. */
export const INTRO_MS = 3000;
export const INTRO_S = INTRO_MS / 1000;

/** Écran de résultat du vote (« X part en prison »), joué à la FIN de la phase
 *  Vote — après la fenêtre de vote, avant de passer au tour suivant. */
export const VOTE_RESULT_MS = 4000;
export const VOTE_RESULT_S = VOTE_RESULT_MS / 1000;
