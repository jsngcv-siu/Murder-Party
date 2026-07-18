// Role expectations — the "rules oracle" for the QA layer.
// We reuse the ENGINE's own truth (allowedActivePhases / parseTotalLimit) and
// compare it to what the PROSE a player reads (`capacite_full_text`) promises.
// Divergence = "the card lies about the role". Refonte boucle : toutes les
// capacités actives se jouent en Enquête, donc un texte qui parle encore de
// « rassemblement » est un vestige à migrer → signalé ci-dessous.

import { allowedActivePhases, parseTotalLimit, type Phase, type RoleRow } from "../actions";
import type { FindingInput } from "./types";

export type EffectCategory =
  | "kill"
  | "imprison"
  | "investigate"
  | "protect"
  | "poison"
  | "manipulate"
  | "passive"
  | "other";

// Coarse documented-effect per role (display + passive/targeting sanity).
// Mirrors the faction-aware targeting in bots.ts; approximate by design.
const EFFECT_BY_SLUG: Record<string, EffectCategory> = {
  tueur: "kill",
  vampire: "kill",
  croque_mitaine: "kill",
  stratege: "kill",
  vengeur: "kill",
  parieur_tricheur: "kill",
  executeur: "kill",
  cuisinier: "kill",
  juge: "imprison",
  assistant_du_detective: "investigate",
  policier: "investigate",
  chasseur_de_vampire: "investigate",
  heritier_dechu: "investigate",
  journaliste: "investigate",
  cartomancien: "investigate",
  mouchard: "investigate",
  boussole: "investigate",
  oracle: "investigate",
  medecin_legiste: "passive",
  medium: "passive",
  guetteur: "investigate",
  avocat: "passive",
  paranoiaque: "passive",
  majordome: "protect",
  babysitter: "protect",
  ange_gardien: "protect",
  saint: "protect",
  apothicaire: "protect",
  empoisonneur: "poison",
  maitre_chanteur: "manipulate",
  barman: "manipulate",
  accusateur: "manipulate",
  marionnettiste: "manipulate",
  falsificateur: "manipulate",
  armurier: "manipulate",
  voleur: "manipulate",
  cleaner: "manipulate",
  usurpateur: "manipulate",
  imitateur: "manipulate",
  conservateur: "manipulate",
  facteur: "manipulate",
  entremetteur: "manipulate",
  veuve_noire: "manipulate",
};

function effectFor(role: RoleRow): EffectCategory {
  return EFFECT_BY_SLUG[role.slug] ?? "other";
}

// ── Prose parsing (what the player READS on the card) ──────────────────────
function textOf(role: RoleRow): string {
  return `${role.capacite_full_text ?? ""}`.toLowerCase();
}
function phasesMentionedInText(role: RoleRow): { free: boolean; gathering: boolean } {
  const t = textOf(role);
  return {
    free: /phase\s+libre|en\s+journée|la\s+journée|pendant\s+le\s+jour/.test(t),
    gathering: /rassemblement/.test(t),
  };
}
function oneShotMentioned(role: RoleRow): boolean {
  return /une\s+seule\s+fois|1×\s*\/\s*partie|une\s+fois\s+par\s+partie|usage\s+unique|à\s+usage\s+unique/.test(
    textOf(role),
  );
}
function passiveMentioned(role: RoleRow): boolean {
  return /\bpassif\b|\bpassive\b|automatiquement|de\s+façon\s+automatique/.test(textOf(role));
}
// Targeting a PLAYER the player must CHOOSE — not any choice, and not an
// auto-assigned target. Pitfalls deliberately excluded:
//  - "choisis une prophétie parmi 3" (Oracle) → option pick, target_mode=none OK.
//  - "reçoit une cible aléatoire" / "protège ta cible" (Ange gardien, Paranoïaque)
//    → "cible" is the NOUN (auto-assigned), not the verb "cibler". Must not match.
function hasTargetingVerb(role: RoleRow): boolean {
  const t = textOf(role);
  // Clear targeting verbs (note: bare "cible" excluded — it's almost always the noun).
  if (/\b(désigne|vise|pointe)\b/.test(t)) return true;
  // Action verb immediately governing a player determiner ("protège un joueur",
  // "lie 2 joueurs"). "protège ta cible" (auto-assigned) is NOT matched (no
  // un/une/le/la/ce/cet/cette/digit). "lie/lier/unis/unir" couvre l'Entremetteur
  // (le joueur CHOISIT les 2 amoureux — ce n'est pas passif).
  if (
    /\b(protège|empoisonne|tue|emprisonne|élimine|lie|lier|unis|unir|marie)\s+(un|une|le|la|ce|cet|cette|\d)/.test(
      t,
    )
  )
    return true;
  // Explicit "choisis/sélectionne <a player>".
  if (
    /\b(choisis|sélectionne)\s+(un|une|1|2|deux|le|la)\s*(joueur|cible|voisin|allié|alliée|victime|époux|amoureux|membre|coéquipier|convive|invité)/.test(
      t,
    )
  )
    return true;
  return false;
}

export type RoleExpectation = {
  slug: string;
  name: string;
  allowedPhases: Set<Phase>;
  totalLimit: number;
  targetMode: string;
  effect: EffectCategory;
  isPassive: boolean;
};

export function roleExpectation(role: RoleRow, playerCount: number): RoleExpectation {
  const targetMode = role.target_mode ?? "single";
  return {
    slug: role.slug,
    name: role.name_fr,
    allowedPhases: allowedActivePhases(role),
    totalLimit: parseTotalLimit(role, playerCount),
    targetMode,
    effect: effectFor(role),
    isPassive: targetMode === "none",
  };
}

// ── Static audit: text-vs-engine, no gameplay needed ───────────────────────
// Runs once per assigned role at game start. Deterministic, high signal.
export function auditRoleStatic(role: RoleRow, playerCount: number): FindingInput[] {
  const out: FindingInput[] = [];
  const base = {
    category: "rules" as const,
    roleSlug: role.slug,
    roleName: role.name_fr,
    tour: 0,
    phase: "lobby" as Phase,
  };
  const exp = roleExpectation(role, playerCount);
  const mentioned = phasesMentionedInText(role);

  // 1) Refonte boucle : toutes les capacités actives se jouent en Enquête. Un
  // texte de carte qui parle encore de « rassemblement » (sans mention Enquête)
  // est un vestige legacy → à migrer vers le nouveau vocabulaire.
  if (mentioned.gathering && !mentioned.free && !exp.isPassive) {
    out.push({
      ...base,
      severity: "high",
      dedupeKey: `rules:phase-text:${role.slug}`,
      title: `${role.name_fr} : le texte parle encore de « rassemblement » — la capacité se joue désormais en Enquête`,
      detail:
        "Refonte boucle : toutes les capacités actives se jouent en Enquête (le Débat n'en porte plus aucune). Le texte de la carte mentionne encore le rassemblement — vestige à migrer, sinon le joueur cherchera son action au mauvais moment.",
      evidence: {
        capacite_full_text: role.capacite_full_text,
        usage_label: role.usage_label,
        phase_activation: role.phase_activation,
        allowedPhases: [...exp.allowedPhases],
      },
    });
  }

  // 2) One-shot promised by prose vs unlimited engine quota (or vice-versa).
  if (oneShotMentioned(role) && exp.totalLimit === Infinity) {
    out.push({
      ...base,
      severity: "medium",
      dedupeKey: `rules:quota-oneshot:${role.slug}`,
      title: `${role.name_fr} : le texte annonce un usage unique mais le moteur n'impose aucune limite`,
      detail:
        "La carte dit « une seule fois / 1×/partie », or parseTotalLimit ne plafonne pas (usage_label ne contient pas la limite). Le bot pourra réutiliser la capacité indéfiniment.",
      evidence: {
        capacite_full_text: role.capacite_full_text,
        usage_label: role.usage_label,
        totalLimit: "Infinity",
      },
    });
  }

  // 3) Passive (no target selector) vs prose that tells the player to target.
  if (exp.isPassive && hasTargetingVerb(role) && !passiveMentioned(role)) {
    out.push({
      ...base,
      severity: "medium",
      category: "ux",
      dedupeKey: `ux:passive-targeting:${role.slug}`,
      title: `${role.name_fr} : carte « passive » (target_mode=none) mais le texte demande de cibler`,
      detail:
        "target_mode = none → l'écran Capacité n'affiche aucun sélecteur, pourtant le texte emploie un verbe d'action (choisis/désigne/cible…). Le joueur lira une consigne qu'il ne peut pas exécuter.",
      evidence: { capacite_full_text: role.capacite_full_text, target_mode: role.target_mode },
    });
  }
  if (!exp.isPassive && passiveMentioned(role) && !hasTargetingVerb(role)) {
    out.push({
      ...base,
      severity: "info",
      category: "ux",
      dedupeKey: `ux:active-but-passive-text:${role.slug}`,
      title: `${role.name_fr} : carte décrite comme « passive » mais target_mode attend une cible`,
      detail:
        "Le texte présente la capacité comme passive/automatique, mais target_mode ≠ none → un sélecteur de cible inutile peut s'afficher.",
      evidence: { capacite_full_text: role.capacite_full_text, target_mode: role.target_mode },
    });
  }

  return out;
}
