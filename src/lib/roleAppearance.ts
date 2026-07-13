// Estime la fréquence d'apparition d'un rôle dans une partie, à partir de la même
// logique que `drawRoles` (src/engine/actions.ts) + quotas (src/engine/constants.ts).
// L'estimation est volontairement simplifiée mais cohérente avec le tirage réel.
import type { RoleRow } from "@/engine/actions";
import {
  acolyteQuotasFor,
  acolytesCountFor,
  civilQuotasFor,
  neutresCountFor,
  NEUTRE_TYPE_WEIGHTS,
} from "@/engine/constants";

export type FreqBracket = { players: number; pct: number; label: string };
export type RoleFrequency = {
  level: "always" | "frequent" | "common" | "rare" | "never" | "emergent";
  label: string;
  hint: string;
  brackets: FreqBracket[];
};

const BRACKETS = [7, 10, 14];

function avg(a: number, b: number) {
  return (a + b) / 2;
}

function estimateOptional(role: RoleRow, all: RoleRow[], playerCount: number): number {
  const pool = all.filter(
    (r) =>
      r.faction === role.faction &&
      r.type === role.type &&
      r.emergent === false &&
      r.is_disabled !== true &&
      (r.min_players ?? 6) <= playerCount,
  );
  const weight = Number(role.draw_weight ?? 1) || 0;
  if (weight <= 0) return 0;
  const totalWeight = pool.reduce((s, r) => s + (Number(r.draw_weight ?? 1) || 0), 0);
  const shareInType = totalWeight > 0 ? weight / totalWeight : 0;

  // Slots attendus pour ce (faction,type) selon les quotas.
  let expectedSlots = 0;

  if (role.faction === "Méchant") {
    if (role.type === "TUEUR") {
      // Slot tueur méchant principal : 1 seul slot, tirage pondéré entre tous les TUEUR Méchant éligibles.
      const tueurPool = all.filter(
        (r) =>
          r.faction === "Méchant" &&
          r.type === "TUEUR" &&
          r.emergent === false &&
          r.is_disabled !== true &&
          (r.min_players ?? 6) <= playerCount,
      );
      const totalT = tueurPool.reduce((s, r) => s + (Number(r.draw_weight ?? 1) || 0), 0);
      return totalT > 0 ? weight / totalT : 0;
    }
    const nAcolytes = acolytesCountFor(playerCount);
    const q = acolyteQuotasFor(playerCount)[role.type ?? ""];
    if (!q) return 0;
    expectedSlots = Math.min(avg(q.min, q.max), nAcolytes);
  } else if (role.faction === "Neutre") {
    if (role.slug === "chasseur_de_vampire") {
      // Tiré uniquement en couplage avec Vampire — proba ≈ proba(vampire).
      const vamp = all.find((r) => r.slug === "vampire");
      if (!vamp) return 0;
      return estimateOptional(vamp, all, playerCount);
    }
    const nNeutres = neutresCountFor(playerCount);
    if (nNeutres === 0) return 0;
    const typesPresent = new Set(
      all
        .filter(
          (r) =>
            r.faction === "Neutre" &&
            r.is_disabled !== true &&
            r.emergent === false &&
            (r.min_players ?? 6) <= playerCount &&
            r.slug !== "chasseur_de_vampire",
        )
        .map((r) => r.type ?? ""),
    );
    const sumW = Array.from(typesPresent).reduce((s, t) => s + (NEUTRE_TYPE_WEIGHTS[t] ?? 0), 0);
    const typeW = NEUTRE_TYPE_WEIGHTS[role.type ?? ""] ?? 0;
    const typePick = sumW > 0 ? typeW / sumW : 0;
    // Pour 2 neutres avec types forcés différents, ≈ 1 - (1-typePick)^2 si type majoritaire.
    const slotPickProb = nNeutres === 1 ? typePick : 1 - Math.pow(1 - typePick, nNeutres);
    expectedSlots = slotPickProb;
  } else if (role.faction === "Civil") {
    // Slots forcés avant le tirage civil : Tueur principal + base Assistant + Majordome.
    // (L'Exécuteur n'est plus MUST — il est tiré comme civil TUEUR ordinaire.)
    const mustCount = 3;
    const remaining = Math.max(
      0,
      playerCount - mustCount - acolytesCountFor(playerCount) - neutresCountFor(playerCount),
    );
    const q = civilQuotasFor(playerCount)[role.type ?? ""];
    if (!q) return 0;
    expectedSlots = Math.min(avg(q.min, q.max), remaining);
  }

  // Probabilité approchée d'être tiré dans ce type : 1 - (1 - share)^slots
  const p = 1 - Math.pow(1 - shareInType, expectedSlots);
  return Math.max(0, Math.min(1, p));
}

export function computeRoleFrequency(role: RoleRow, all: RoleRow[]): RoleFrequency {
  if (role.emergent) {
    return {
      level: "emergent",
      label: "Rôle émergent",
      hint: "Apparaît uniquement via conversion (ex: Vampire mordant) — pas dans le tirage initial.",
      brackets: [],
    };
  }
  if (role.is_disabled) {
    return {
      level: "never",
      label: "Désactivé",
      hint: "Ce rôle est désactivé dans la base et n'apparaît plus dans aucune partie.",
      brackets: [],
    };
  }
  // Cas spécial : Le Tueur classique est presence=MUST mais partage désormais le slot
  // Tueur méchant avec Croque-mitaine et Stratège (tirage pondéré). On calcule sa fréquence réelle.
  if (role.presence === "MUST" && !(role.faction === "Méchant" && role.type === "TUEUR")) {
    return {
      level: "always",
      label: "Toujours en jeu",
      hint: "Rôle MUST — présent à chaque partie (dès min_players atteint).",
      brackets: BRACKETS.map((n) => ({
        players: n,
        pct: n >= (role.min_players ?? 6) ? 1 : 0,
        label: "100%",
      })),
    };
  }
  if (role.presence === "MUST_CONDITIONAL") {
    return {
      level: "always",
      label: "Quasi toujours",
      hint: "Rôle MUST conditionnel — présent dans la quasi-totalité des parties.",
      brackets: BRACKETS.map((n) => ({
        players: n,
        pct: n >= (role.min_players ?? 6) ? 1 : 0,
        label: "100%",
      })),
    };
  }

  const brackets: FreqBracket[] = BRACKETS.map((n) => {
    if (n < (role.min_players ?? 6)) return { players: n, pct: 0, label: "—" };
    const p = estimateOptional(role, all, n);
    return { players: n, pct: p, label: `${Math.round(p * 100)}%` };
  });

  const avgPct =
    brackets.filter((b) => b.pct > 0).reduce((s, b) => s + b.pct, 0) /
    Math.max(1, brackets.filter((b) => b.pct > 0).length || 1);

  let level: RoleFrequency["level"];
  let label: string;
  if (avgPct === 0 || brackets.every((b) => b.pct === 0)) {
    level = "never";
    label = "Jamais tiré";
  } else if (avgPct >= 0.6) {
    level = "frequent";
    label = "Fréquent";
  } else if (avgPct >= 0.25) {
    level = "common";
    label = "Occasionnel";
  } else {
    level = "rare";
    label = "Rare";
  }

  const hint =
    level === "never"
      ? "Aucun slot ne peut accueillir ce rôle (quotas, draw_weight=0 ou conflit slot Tueur)."
      : `Estimation basée sur les quotas (acolytes/civils/neutres) et le draw_weight. Moyenne ≈ ${Math.round(avgPct * 100)}% sur les tailles 7/10/14.`;

  return { level, label, hint, brackets };
}

export const FREQ_COLORS: Record<RoleFrequency["level"], string> = {
  always: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  frequent: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  common: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  rare: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  never: "border-destructive/60 bg-destructive/10 text-destructive",
  emergent: "border-violet-500/50 bg-violet-500/10 text-violet-300",
};
