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
import { meterAddRead, approxBytes } from "./egressMeter";
import {
  usesOf,
  type CapabilityResult,
  type PlayerRow,
  type RoleRow,
  type Phase,
} from "../actions";
import type { Item } from "../items";
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
    pushFinding({
      ...f,
      gameId: opts.gameId,
      gameCode: opts.gameCode ?? null,
      dedupeKey: `${opts.gameId}:${f.dedupeKey}`,
    });

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
      detail:
        "L'exécution de la capacité a planté au lieu de renvoyer un résultat propre {ok,message}. Un humain verrait l'action échouer sans explication.",
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
    meterAddRead(approxBytes(data));
    if (!data || data.length === 0) {
      add({
        ...baseFinding,
        severity: "medium",
        category: "bug",
        dedupeKey: `bug:pending-no-intent:${role.slug}:${tour}`,
        title: `${role.name_fr} : « effet en cours » annoncé sans intention soumise`,
        detail:
          "La capacité a renvoyé pending=true (effet différé à l'Annonce) mais aucune ligne role_actions DEFERRED n'existe pour ce tour. L'effet promis ne se résoudra jamais.",
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
      detail:
        "executeCapability a renvoyé ok=false avec un message vide — l'écran n'expliquera pas pourquoi l'action ne marche pas.",
      evidence: {},
    });
  }

  return res;
}

export async function probeItemUse(opts: {
  gameId: string;
  gameCode?: string | null;
  bot: PlayerRow;
  item: Item;
  target?: PlayerRow | null;
  phase: Phase;
  tour: number;
  run: () => Promise<{ ok: boolean; message: string }>;
}): Promise<{ ok: boolean; message: string }> {
  const { bot, item, phase, tour } = opts;
  const add = (f: FindingInput) =>
    pushFinding({
      ...f,
      gameId: opts.gameId,
      gameCode: opts.gameCode ?? null,
      dedupeKey: `${opts.gameId}:${f.dedupeKey}`,
    });

  const baseFinding = {
    roleSlug: bot.role_slug ?? undefined,
    roleName: item.name,
    botPseudo: bot.pseudo,
    tour,
    phase,
  };

  let res: { ok: boolean; message: string };
  try {
    res = await opts.run();
  } catch (e) {
    add({
      ...baseFinding,
      severity: "high",
      category: "bug",
      dedupeKey: `bug:item-throw:${item.slug}`,
      title: `${item.name} : l'utilisation de l'objet a leve une exception`,
      detail:
        "Le bot a tente d'utiliser un objet via le meme moteur qu'un joueur. L'action a plante au lieu de renvoyer un resultat propre, donc l'interface joueur peut rester sans retour fiable.",
      evidence: { itemId: item.id, itemSlug: item.slug, error: String((e as Error)?.message ?? e) },
    });
    throw e;
  }

  if (!res.ok && (!res.message || res.message.trim() === "")) {
    add({
      ...baseFinding,
      severity: "info",
      category: "ux",
      dedupeKey: `ux:item-empty-refusal:${item.slug}`,
      title: `${item.name} : objet refuse sans message`,
      detail:
        "L'utilisation de l'objet a ete refusee avec un message vide. Un joueur verrait le bouton echouer sans explication lisible.",
      evidence: { itemId: item.id, itemSlug: item.slug },
    });
  }

  if (!res.ok) return res;

  const [{ data: actorRow }, { data: actions }] = await Promise.all([
    supabase.from("players").select("role_meta").eq("id", bot.id).maybeSingle(),
    supabase
      .from("role_actions")
      .select("id, timing, source, payload")
      .eq("game_id", opts.gameId)
      .eq("actor_player_id", bot.id)
      .eq("tour", tour)
      .limit(50),
  ]);
  meterAddRead(approxBytes(actorRow) + approxBytes(actions));

  const meta = (actorRow?.role_meta ?? {}) as Record<string, unknown>;
  const inv = (meta.inventory as Item[] | undefined) ?? [];
  const persisted = inv.find((it) => it.id === item.id);
  if (!persisted?.consumed) {
    add({
      ...baseFinding,
      severity: "medium",
      category: "bug",
      dedupeKey: `bug:item-not-consumed:${item.slug}:${item.id}`,
      title: `${item.name} : objet accepte mais pas marque consomme`,
      detail:
        "Le moteur a accepte l'utilisation de l'objet, mais l'inventaire ne montre pas l'objet comme consomme apres l'action. Le joueur pourrait le reutiliser ou voir un etat incoherent.",
      evidence: { itemId: item.id, itemSlug: item.slug },
    });
  }

  const rows = (actions ?? []) as Array<{
    id: string;
    timing: string | null;
    source: string | null;
    payload: Record<string, unknown> | null;
  }>;
  const hasTrace = rows.some((row) => row.payload?.item === item.slug);
  if (!hasTrace) {
    add({
      ...baseFinding,
      severity: "medium",
      category: "bug",
      dedupeKey: `bug:item-no-visible-trace:${item.slug}:${tour}`,
      title: `${item.name} : objet accepte sans trace d'action visible`,
      detail:
        "L'objet a ete accepte mais aucune trace role_actions avec payload.item n'a ete trouvee pour le tour. Le journal joueur et les audits frontend peuvent perdre l'action.",
      evidence: { itemId: item.id, itemSlug: item.slug },
    });
  }

  const needsDeferredIntent =
    item.slug === "couteau" || item.slug === "fiole_mort" || item.slug === "fiole_vie";
  if (needsDeferredIntent) {
    const hasIntent = rows.some(
      (row) => row.timing === "DEFERRED" && row.source === `item:${item.slug}`,
    );
    if (!hasIntent) {
      add({
        ...baseFinding,
        severity: "high",
        category: "bug",
        dedupeKey: `bug:item-no-deferred-intent:${item.slug}:${tour}`,
        title: `${item.name} : effet differe absent apres utilisation`,
        detail:
          "Cet objet promet un effet resolu a l'Annonce, mais aucune intention DEFERRED item:* n'existe pour ce tour. Le joueur verrait l'objet partir sans effet gameplay.",
        evidence: { itemId: item.id, itemSlug: item.slug, target: opts.target?.pseudo ?? null },
      });
    }
  }

  return res;
}
