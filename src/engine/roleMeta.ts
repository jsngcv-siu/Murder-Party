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
