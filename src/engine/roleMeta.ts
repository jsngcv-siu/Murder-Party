// Typage de la colonne JSON `players.role_meta`.
//
// But : centraliser les clés de méta connues pour attraper les fautes de frappe.
// Avant, chaque accès faisait `(role_meta as Record<string, unknown>).clef` — une
// clé mal orthographiée renvoyait `undefined` en silence, sans erreur compilateur.
// `getMeta()` renvoie une vue typée : les clés listées ici sont vérifiées par TS.
//
// ⚠️ Pas d'index signature volontairement : toute nouvelle clé DOIT être ajoutée
// ici avant usage, sinon `tsc` échoue — c'est le garde-fou recherché.
export type GuetteurWatch = {
  target_id: string;
  target_pseudo: string;
};

export interface RoleMeta {
  // ─── Protection / bénédiction ───
  protected_until_cycle?: number;
  blessed_by_saint?: boolean;
  blessed_by_saint_id?: string;
  blessed_until_cycle?: number;
  guarded_by?: string;
  guarded_by_cycle?: number;
  // ─── Poison ───
  poisoned?: boolean;
  poisoned_by?: string;
  poisoned_at_cycle?: number;
  poison_resolves_cycle?: number | null;
  // ─── Blocage / chantage ───
  blocked_until_cycle?: number;
  blocked_from_cycle?: number;
  blackmail_until_cycle?: number;
  blackmail_from_cycle?: number;
  // ─── Mort différée ───
  // Condamnation posée en Enquête (killPlayer en phase `free`) : le joueur garde
  // `is_alive=true` et continue d'agir jusqu'au `flushPendingDeaths` de l'Annonce.
  // Le resolver relit cette clé pour annuler les effets d'un acteur déjà condamné
  // ce tour (Vampire/Empoisonneur exécuté par l'Exécuteur — « le kill prime »).
  pending_death?: { reason: string; tour: number; ts: string; attacker_id?: string } | null;
  // ─── Prison ───
  // Trace DURABLE de la libération (le Juge). `pending_release_for_cycle` est
  // effacé une fois consommé : sans cette clé, la sortie de prison ne laissait
  // aucune trace datée et ne pouvait donc pas être annoncée.
  released_at_cycle?: number;
  // ─── Vampire / conversion ───
  converted?: boolean;
  immortal?: boolean;
  // ─── Cleaner ───
  clean_armed?: boolean;
  cleaned?: boolean;
  uses?: Record<string, number>;
  // ─── Entremetteur / amoureux ───
  linked_with?: string;
  linked_pair?: string[];
  // ─── Oracle ───
  prophecy?: string;
  // ─── Guetteur ───
  guetteur_watch_history?: Record<string, GuetteurWatch>;
  // ─── Chat du Manoir (lot 1) ───
  // Une vie : la 1ʳᵉ attaque le visant est absorbée (chat_life_used passe à true)
  // et le tour est mémorisé pour l'annonce publique anonyme « miaulement ».
  chat_life_used?: boolean;
  chat_life_lost_cycle?: number;
  // ─── Aubergiste (lot 1) ───
  // Posés sur la CIBLE hébergée par applyProtect (source role:aubergiste) : si une
  // attaque est bloquée pendant la fenêtre, l'Aubergiste est prévenu (jamais QUI).
  innkeeper_by?: string;
  innkeeper_by_cycle?: number;
  // Posé sur l'AUBERGISTE : dernier tour d'usage (cadence 1 Enquête sur 2).
  innkeeper_last_tour?: number;
  // ─── Photographe mondain (lot 1) ───
  // Pellicule : joueurs photographiés de leur vivant (id + tour du cliché).
  photos?: Array<{ id: string; tour: number }>;
  // ─── Garde-chasse (lot 2) ───
  // Posés sur la CIBLE patrouillée : toute attaque sur elle CE tour riposte
  // (l'attaquant meurt), sans sauver la cible.
  patrolled_by?: string;
  patrolled_by_cycle?: number;
  // ─── Bretteur (lot 2) ───
  // Posé sur le BRETTEUR : tour où sa garde est levée (pare + embroche).
  bretteur_guard_cycle?: number;
  // ─── Conjuré (lot 2) ───
  // Posé sur le COMPLICE sollicité : demande de pacte en attente de réponse.
  pact_offer?: {
    from: string; // id du Conjuré (jamais montré au complice)
    target_id: string;
    target_pseudo: string;
    tour: number;
  } | null;
  // Posé sur le CONJURÉ : son unique pacte est joué (accepté OU refusé).
  pact_spent?: boolean;
  // ─── Franc-tireur (lot 3) ───
  ft_pierce_armed?: boolean;
  ft_pierce_used?: boolean;
  // ─── Détrousseur (lot 3) ───
  det_braquage_armed?: boolean;
  det_braquage_used?: boolean;
}

type MetaCarrier = { role_meta?: unknown } | null | undefined;

/** Vue typée de `role_meta` (jamais null). */
export function getMeta(row: MetaCarrier): RoleMeta {
  return (row?.role_meta ?? {}) as RoleMeta;
}

/** Fusionne des champs dans une méta et renvoie l'objet prêt à écrire en base. */
export function mergeMeta(cur: RoleMeta, patch: RoleMeta): RoleMeta {
  return { ...cur, ...patch };
}
