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
// Acolytes : Méchant/SUPPORT n'existe plus (migré vers CONTRÔLE). Tous les slots
// acolytes sont des UNIONS souples INVESTIGATION/TROMPERIE/CONTRÔLE → Tromperie et
// Contrôle sont tirables dès la 1ʳᵉ table (2026-07-18), plus seulement à 18 j.
// (aucun type méchant garanti : c'est un jeu de variété/chaos).
const ACOLYTE_FILL: string[] = [
  "INVESTIGATION/TROMPERIE/CONTRÔLE",
  "INVESTIGATION/TROMPERIE/CONTRÔLE",
  "INVESTIGATION/TROMPERIE/CONTRÔLE",
  "INVESTIGATION/TROMPERIE/CONTRÔLE",
];
const NEUTRE_FILL: string[] = [
  // Chaque neutre : tous types possibles (pondérés à l'exécution : BÉNIN ≫ MAL ≫ CHAOS).
  // Le moteur force un type différent d'un neutre à l'autre. Un CHAOS reste possible
  // dès le 1er neutre (rare), plus de chances au 2e/3e (cf. plan §4).
  "MAL/BÉNIN/CHAOS",
  "MAL/BÉNIN/CHAOS",
  "MAL/BÉNIN/CHAOS",
];

// Civils non-verrouillés (les MUSTs majordome[PROTECTEUR]/assistant[INVESTIGATION]
// ne sont pas listés ici — ils garantissent déjà 1 protecteur + 1 enquêteur).
// Refonte 2026-07-18 : au lieu de types RIGIDES (1 slot = 1 type fixe), chaque slot
// civil ajouté est une UNION souple ENQUÊTE/SUPPORT/TUEUR → plus de variété, fin de
// la séquence figée. Le Protecteur reste garanti par le Majordome (MUST) et n'entre
// PAS dans le pool souple (on ne veut qu'un protecteur sûr, pas une avalanche).
const CIVIL_FILL: string[] = ["INVESTIGATION/SUPPORT/TUEUR"];

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
  // Tueur méchant : slot GARANTI (locked) mais en AUTO (slug null) → tirage pondéré
  // entre Le Tueur / Croque-mitaine / Armurier (draw_weight). Auparavant figé sur
  // "tueur", ce qui privait les parties de Croque-mitaine/Armurier ET divergeait du
  // tirage sans config. Le lead peut toujours épingler un tueur précis via la modale.
  slots.push({ id: nextId(), faction: "Méchant", type: "TUEUR", slug: null, locked: true });
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
