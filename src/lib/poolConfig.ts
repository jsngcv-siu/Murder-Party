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
// Chaque slot est indexé par sa position `k` ; au-delà de la longueur du tableau on
// répète la DERNIÈRE entrée (via Math.min) → les entrées de tête « épinglent » un
// type garanti, la queue reste souple.
//
// Acolytes (Méchant/SUPPORT n'existe plus → CONTRÔLE) : calibrage 2026-07-19 (Jason).
// Le 1er acolyte (présent dès 6 j.) reste une UNION souple → chaos préservé aux
// petites tables. Dès le 2e acolyte (12 j.+, 3 méchants) on GARANTIT un
// trompeur/contrôleur (TROMPERIE/CONTRÔLE) pour éviter une équipe méchante 100 %
// info. Le 3e acolyte (17 j.+) repasse souple. Revient sur la décision « aucun type
// méchant garanti » du 2026-07-18, sur demande explicite de Jason.
const ACOLYTE_FILL: string[] = [
  "INVESTIGATION/TROMPERIE/CONTRÔLE", // k0 : souple (toutes tables, chaos)
  "TROMPERIE/CONTRÔLE", // k1 : 2e acolyte (12 j.+) → trompeur/contrôleur garanti
  "INVESTIGATION/TROMPERIE/CONTRÔLE", // k2 : 3e acolyte (17 j.+) souple (dernière, répétée)
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
// Calibrage 2026-07-19 (Jason) : au lieu de N slots TOUS souples (qui pouvaient tous
// tomber enquêteur, sans jamais un tueur civil), on ÉPINGLE quelques types en tête
// de séquence, la queue restant souple (variété). Indexé par position `k` (Math.min).
//  • k0        → TUEUR : un civil qui peut tuer, GARANTI à toutes les tables
//                (à 6 j., seul l'Exécuteur est éligible → ~ l'ancien MUST Exécuteur).
//  • k2        → SUPPORT : 1 support garanti dès 8 j. (3e slot de remplissage).
//  • k8        → TUEUR : 2e tueur civil, atteint seulement quand il y a ≥9 slots de
//                remplissage → 16 j.+ (à 15 j. et moins, un seul tueur civil garanti).
//  • le reste  → UNION souple INVESTIGATION/SUPPORT/TUEUR (dernière entrée, répétée).
// Le Protecteur reste hors pool souple (un seul, sûr, via le Majordome MUST).
const CIVIL_FILL: string[] = [
  "TUEUR", // k0
  "INVESTIGATION/SUPPORT/TUEUR", // k1
  "SUPPORT", // k2
  "INVESTIGATION/SUPPORT/TUEUR", // k3
  "INVESTIGATION/SUPPORT/TUEUR", // k4
  "INVESTIGATION/SUPPORT/TUEUR", // k5
  "INVESTIGATION/SUPPORT/TUEUR", // k6
  "INVESTIGATION/SUPPORT/TUEUR", // k7
  "TUEUR", // k8 : 2e tueur civil (16 j.+)
  "INVESTIGATION/SUPPORT/TUEUR", // k9 : souple (dernière → répétée pour tout le reste)
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
    // Math.min (et non modulo) : les types épinglés en tête n'apparaissent qu'une
    // fois, puis on répète la DERNIÈRE entrée (souple) pour tous les slots restants.
    const t = CIVIL_FILL[Math.min(k, CIVIL_FILL.length - 1)];
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
