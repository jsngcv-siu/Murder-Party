// Configuration personnalisée du pool de rôles d'une partie.
// Stockée dans games.pool_config (jsonb). Si présente, override le tirage automatique
// de rollRoles : chaque slot impose (faction, type) et optionnellement un slug exact.
// Le champ `type` peut contenir une union "A/B" : un slot accepte alors n'importe
// quel rôle dont le type est A ou B (ex: "TROMPERIE/SUPPORT").
import { acolytesCountFor, neutresCountFor } from "@/engine/constants";

export type Faction = "Civil" | "Méchant" | "Neutre";

export type PoolSlot = {
  id: string;
  faction: Faction;
  type: string; // ex: "INVESTIGATION" ou "TROMPERIE/SUPPORT"
  slug: string | null; // null = tirage auto dans le pool faction+type
  locked?: boolean; // MUST : ne peut pas être supprimé
};

export type PoolConfig = {
  targetPlayers: number;
  slots: PoolSlot[];
};

/** Décompose un type éventuellement uni ("A/B") en liste de types acceptés. */
export function expandSlotTypes(t: string): string[] {
  return t
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Patterns de slots non-verrouillés à dérouler dans l'ordre selon la taille cible.
const ACOLYTE_FILL: string[] = ["INVESTIGATION", "TROMPERIE/SUPPORT", "TROMPERIE/SUPPORT"];
const NEUTRE_FILL: string[] = [
  // 1er neutre : tous types possibles (pondérés à l'exécution : BÉNIN ≫ MAL ≫ CHAOS).
  "MAL/BÉNIN/CHAOS",
  // 2ème neutre : tous types possibles aussi, MAIS le moteur force un type différent du 1er.
  "MAL/BÉNIN/CHAOS",
];

// Civils non-verrouillés (les MUSTs majordome/assistant ne sont pas listés ici).
const CIVIL_FILL: string[] = [
  "PROTECTEUR",
  "INVESTIGATION",
  "TUEUR",
  "SUPPORT/BOULET",
  "INVESTIGATION/SUPPORT/BOULET",
  "PROTECTEUR",
  "TUEUR",
  "INVESTIGATION/SUPPORT/BOULET",
];

/**
 * Construit un pool par défaut pour `target` joueurs.
 * - MUSTs verrouillés : Tueur, Majordome, Assistant du Détective.
 * - Acolytes : pris dans ACOLYTE_FILL selon acolytesCountFor.
 * - Neutres : pris dans NEUTRE_FILL selon neutresCountFor.
 * - Civils : remplissent les slots restants depuis CIVIL_FILL (boucle si nécessaire).
 */
export function buildDefaultPool(target: number): PoolConfig {
  const slots: PoolSlot[] = [];
  let i = 0;
  const nextId = () => `s${i++}`;

  // ── MUSTs (verrouillés) ──
  slots.push({ id: nextId(), faction: "Méchant", type: "TUEUR", slug: "tueur", locked: true });
  slots.push({
    id: nextId(),
    faction: "Civil",
    type: "PROTECTEUR",
    slug: "majordome",
    locked: true,
  });
  slots.push({
    id: nextId(),
    faction: "Civil",
    type: "INVESTIGATION",
    slug: "assistant_du_detective",
    locked: true,
  });
  // (Exécuteur n'est plus MUST : Civil/TUEUR ordinaire, tiré via CIVIL_FILL.)

  // ── Acolytes méchants ──
  const nAcolytes = acolytesCountFor(target);
  for (let k = 0; k < nAcolytes; k++) {
    const t = ACOLYTE_FILL[Math.min(k, ACOLYTE_FILL.length - 1)];
    slots.push({ id: nextId(), faction: "Méchant", type: t, slug: null });
  }

  // ── Neutres ──
  const nNeutres = neutresCountFor(target);
  for (let k = 0; k < nNeutres; k++) {
    slots.push({
      id: nextId(),
      faction: "Neutre",
      type: NEUTRE_FILL[k % NEUTRE_FILL.length],
      slug: null,
    });
  }

  // ── Civils (remplissent le reste) ──
  let remaining = target - slots.length;
  let k = 0;
  while (remaining > 0) {
    const t = CIVIL_FILL[k % CIVIL_FILL.length];
    slots.push({ id: nextId(), faction: "Civil", type: t, slug: null });
    k++;
    remaining--;
  }
  if (remaining < 0) {
    // Surplus : on rogne les slots non-verrouillés en partant de la fin.
    let toRemove = -remaining;
    for (let kk = slots.length - 1; kk >= 0 && toRemove > 0; kk--) {
      if (!slots[kk].locked) {
        slots.splice(kk, 1);
        toRemove--;
      }
    }
  }

  return { targetPlayers: target, slots };
}

/**
 * Type narrowing helper : valide qu'un objet ressemble à une PoolConfig.
 */
export function asPoolConfig(value: unknown): PoolConfig | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.targetPlayers !== "number" || !Array.isArray(v.slots)) return null;
  return v as unknown as PoolConfig;
}
