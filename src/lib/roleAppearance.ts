// Estime la fréquence d'apparition d'un rôle dans une partie, à partir de la MÊME
// source unique que le tirage réel : les slots de `buildDefaultPool` (src/lib/poolConfig.ts).
// L'estimation est volontairement simplifiée mais cohérente avec le tirage (drawSlots).
import type { RoleRow } from "@/engine/actions";
import { NEUTRE_TYPE_WEIGHTS } from "@/engine/constants";
import { buildDefaultPool, expandSlotTypes } from "@/lib/poolConfig";

export type FreqBracket = { players: number; pct: number; label: string };
export type RoleFrequency = {
  level: "always" | "frequent" | "common" | "rare" | "never" | "emergent";
  label: string;
  hint: string;
  brackets: FreqBracket[];
};

const BRACKETS = [7, 10, 14];

function estimateOptional(role: RoleRow, all: RoleRow[], playerCount: number): number {
  const weight = Number(role.draw_weight ?? 1) || 0;
  if (weight <= 0) return 0;
  if ((role.min_players ?? 6) > playerCount) return 0;

  if (role.slug === "chasseur_de_vampire") {
    // Tiré uniquement en couplage avec Vampire — proba ≈ proba(vampire).
    const vamp = all.find((r) => r.slug === "vampire");
    if (!vamp) return 0;
    return estimateOptional(vamp, all, playerCount);
  }

  // Slots AUTO du pool par défaut qui peuvent accueillir ce rôle (même source que le
  // tirage réel). Un rôle est tiré s'il gagne son slot contre les autres du même type.
  const roleType = role.type ?? "";
  const cfg = buildDefaultPool(playerCount);
  const accepting = cfg.slots.filter(
    (s) => !s.slug && s.faction === role.faction && expandSlotTypes(s.type).includes(roleType),
  );
  if (accepting.length === 0) return 0;

  // Part du rôle dans son (faction,type) : draw_weight relatif.
  const samePool = all.filter(
    (r) =>
      r.faction === role.faction &&
      r.type === role.type &&
      r.emergent === false &&
      r.is_disabled !== true &&
      r.slug !== "chasseur_de_vampire" &&
      (r.min_players ?? 6) <= playerCount,
  );
  const totalWeight = samePool.reduce((s, r) => s + (Number(r.draw_weight ?? 1) || 0), 0);
  const shareInType = totalWeight > 0 ? weight / totalWeight : 0;

  // Facteur de sélection du TYPE pour les slots neutres en union (BÉNIN ≫ MAL ≫ CHAOS).
  const neutreTypeFactor = (slotType: string): number => {
    const types = expandSlotTypes(slotType).filter((t) =>
      all.some(
        (r) =>
          r.faction === "Neutre" &&
          r.type === t &&
          r.emergent === false &&
          r.is_disabled !== true &&
          r.slug !== "chasseur_de_vampire" &&
          (r.min_players ?? 6) <= playerCount,
      ),
    );
    const sumW = types.reduce((s, t) => s + (NEUTRE_TYPE_WEIGHTS[t] ?? 0), 0);
    return sumW > 0 ? (NEUTRE_TYPE_WEIGHTS[roleType] ?? 0) / sumW : 0;
  };

  // Probabilité d'être tiré dans AU MOINS un slot acceptant.
  let probNotPicked = 1;
  for (const s of accepting) {
    const typeFactor =
      role.faction === "Neutre" && expandSlotTypes(s.type).length > 1
        ? neutreTypeFactor(s.type)
        : 1;
    const slotPick = Math.max(0, Math.min(1, shareInType * typeFactor));
    probNotPicked *= 1 - slotPick;
  }
  return Math.max(0, Math.min(1, 1 - probNotPicked));
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
  // Tueur méchant avec Croque-mitaine et Armurier (tirage pondéré). On calcule sa fréquence réelle.
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
      ? "Aucun slot ne peut accueillir ce rôle (draw_weight=0, min_players ou type absent des slots)."
      : `Estimation basée sur les slots du pool par défaut et le draw_weight. Moyenne ≈ ${Math.round(avgPct * 100)}% sur les tailles 7/10/14.`;

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
