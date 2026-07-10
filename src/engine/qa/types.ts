// QA layer — shared types.
// The QA subsystem turns bots into "role specialist agents" that play the game
// AND assert that what happens matches what each role's text promises. Findings
// are surfaced in the /demo report at end of game.

import type { Phase } from "../actions";

/** Severity, mapped to the audit doc's legend (🔴 high impact → 🔵 info). */
export type Severity = "critical" | "high" | "medium" | "info";

/** The four problem categories the user asked us to cover. */
export type Category = "rules" | "leak" | "bug" | "ux";

export const SEVERITY_META: Record<Severity, { emoji: string; label: string; order: number }> = {
  critical: { emoji: "🔴", label: "Critique", order: 0 },
  high: { emoji: "🟠", label: "Important", order: 1 },
  medium: { emoji: "🟡", label: "Moyen", order: 2 },
  info: { emoji: "🔵", label: "Info", order: 3 },
};

export const CATEGORY_META: Record<Category, { emoji: string; label: string }> = {
  rules: { emoji: "📐", label: "Règles / textes incohérents" },
  leak: { emoji: "🕵️", label: "Fuites d'information" },
  bug: { emoji: "🐞", label: "Bugs gameplay / UI visibles" },
  ux: { emoji: "🧭", label: "Friction UX / clarté" },
};

/** A single problem the bots/QA engine encountered. Deduped by `dedupeKey`. */
export type QAFinding = {
  id: string;
  /** Stable identity used for dedup: same key = same issue, count++ instead of a new row. */
  dedupeKey: string;
  severity: Severity;
  category: Category;
  /** Partie d'origine — code lisible (ex. « E3PB5T ») pour grouper le log par partie. */
  gameCode?: string | null;
  /** Partie d'origine — id technique (dédup robuste même si un code se répète). */
  gameId?: string | null;
  /** Role under test, if the finding is role-specific. */
  roleSlug?: string | null;
  /** Human-friendly role name for display. */
  roleName?: string | null;
  /** Bot/player that surfaced it, if any. */
  botPseudo?: string | null;
  tour: number;
  phase: Phase | string;
  title: string;
  detail: string;
  /** Raw context for the user to debug (state snapshot, ids, parsed text…). */
  evidence?: Record<string, unknown>;
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
};

/** Input shape for recording a finding — timestamps/id/count are filled in by the store. */
export type FindingInput = Omit<QAFinding, "id" | "firstSeenAt" | "lastSeenAt" | "count">;
