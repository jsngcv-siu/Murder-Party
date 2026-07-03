// Per-action probe. Wraps a bot's capability execution so the bot behaves like a
// "specialist agent testing its own role": it forms an expectation from the role,
// runs the real engine action, then asserts the result/side-effects match.
//
// Checks are chosen to be LOW false-positive (the report must stay signal):
//  - engine accepted a capability past its documented quota
//  - "pending" (deferred) returned but no intent row was actually submitted
//  - executeCapability threw
//  - refusal with no message (minor UX)

import { supabase } from "@/integrations/supabase/client";
import {
  usesOf,
  type CapabilityResult,
  type PlayerRow,
  type RoleRow,
  type Phase,
} from "../actions";
import { roleExpectation } from "./expectations";
import { addFinding as pushFinding } from "./report";
import type { FindingInput } from "./types";

export async function probeCapability(opts: {
  gameId: string;
  gameCode?: string | null;
  bot: PlayerRow;
  role: RoleRow;
  targets: PlayerRow[];
  phase: Phase;
  tour: number;
  playerCount: number;
  run: () => Promise<CapabilityResult>;
}): Promise<CapabilityResult> {
  const { bot, role, phase, tour, playerCount } = opts;
  const meta = (bot.role_meta ?? {}) as Record<string, unknown>;
  const exp = roleExpectation(role, playerCount);
  const usedBefore = usesOf(meta, role.slug);

  // Tamponne chaque finding avec sa partie (code + id) et préfixe la dédup par
  // l'id de partie → un même souci dans 2 parties = 2 entrées distinctes.
  const add = (f: FindingInput) =>
    pushFinding({ ...f, gameId: opts.gameId, gameCode: opts.gameCode ?? null, dedupeKey: `${opts.gameId}:${f.dedupeKey}` });

  const baseFinding = {
    roleSlug: role.slug,
    roleName: role.name_fr,
    botPseudo: bot.pseudo,
    tour,
    phase,
  };

  let res: CapabilityResult;
  try {
    res = await opts.run();
  } catch (e) {
    add({
      ...baseFinding,
      severity: "high",
      category: "bug",
      dedupeKey: `bug:capability-throw:${role.slug}`,
      title: `${role.name_fr} : executeCapability a levé une exception`,
      detail: "L'exécution de la capacité a planté au lieu de renvoyer un résultat propre {ok,message}. Un humain verrait l'action échouer sans explication.",
      evidence: { error: String((e as Error)?.message ?? e) },
    });
    throw e;
  }

  // (a) Quota enforcement — engine accepted a use beyond the documented limit.
  if (res.ok && exp.totalLimit !== Infinity && usedBefore >= exp.totalLimit) {
    add({
      ...baseFinding,
      severity: "high",
      category: "rules",
      dedupeKey: `rules:quota-exceeded:${role.slug}`,
      title: `${role.name_fr} : capacité acceptée au-delà du quota (${exp.totalLimit})`,
      detail: `La capacité a déjà été utilisée ${usedBefore}× (limite ${exp.totalLimit}) mais executeCapability l'a quand même acceptée. Le rôle peut dépasser sa fréquence annoncée.`,
      evidence: { usedBefore, totalLimit: exp.totalLimit, usage_label: role.usage_label },
    });
  }

  // (b) Deferred effect announced but no intent row submitted → effect lost.
  if (res.ok && res.pending) {
    const { data } = await supabase
      .from("role_actions")
      .select("id")
      .eq("game_id", opts.gameId)
      .eq("actor_player_id", bot.id)
      .eq("tour", tour)
      .eq("timing", "DEFERRED")
      .limit(1);
    if (!data || data.length === 0) {
      add({
        ...baseFinding,
        severity: "medium",
        category: "bug",
        dedupeKey: `bug:pending-no-intent:${role.slug}:${tour}`,
        title: `${role.name_fr} : « effet en cours » annoncé sans intention soumise`,
        detail: "La capacité a renvoyé pending=true (effet différé au rassemblement) mais aucune ligne role_actions DEFERRED n'existe pour ce tour. L'effet promis ne se résoudra jamais.",
        evidence: { tour },
      });
    }
  }

  // (c) Refusal with no message — the player would be stuck with no feedback.
  if (!res.ok && (!res.message || res.message.trim() === "")) {
    add({
      ...baseFinding,
      severity: "info",
      category: "ux",
      dedupeKey: `ux:empty-refusal:${role.slug}`,
      title: `${role.name_fr} : capacité refusée sans message`,
      detail: "executeCapability a renvoyé ok=false avec un message vide — l'écran n'expliquera pas pourquoi l'action ne marche pas.",
      evidence: {},
    });
  }

  return res;
}
