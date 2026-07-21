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

/** L'intro (frame de transition) ne concerne que les phases QUI EN ONT UNE
 *  (Enquête, Débat, Vote). L'Annonce est une gazette affichée telle quelle, sans
 *  frame de transition : elle ne réserve donc AUCUN temps d'intro et son compteur
 *  démarre immédiatement (sinon le chrono reste figé ~3 s au début de l'Annonce).
 *  Source unique consommée par le moteur (tickPhase) ET l'UI (compteur, defer). */
export function introMsFor(phase: string | null | undefined): number {
  return phase === "annonce" ? 0 : INTRO_MS;
}
export function introSFor(phase: string | null | undefined): number {
  return introMsFor(phase) / 1000;
}

/** Écran de résultat du vote (« X part en prison »), joué à la FIN de la phase
 *  Vote — après la fenêtre de vote, avant de passer au tour suivant.
 *  8000 → 3000 (2026-07-19) : 8 s d'écran figé à 0:00 chaque tour, ressenti
 *  « bloqué » par les joueurs. ⚠️ Consommé aussi par le ticker serveur : tout
 *  changement ici doit être suivi de `npm run deploy:edge`, sinon serveur et
 *  clients arbitrent la fin du vote avec deux durées différentes. */
export const VOTE_RESULT_MS = 3000;
export const VOTE_RESULT_S = VOTE_RESULT_MS / 1000;
