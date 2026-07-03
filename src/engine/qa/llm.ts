// LLM-backed brain — INERT by default. No Anthropic dependency, no key required
// to build. Activating it is one call: `enableLlmBrain()` (typically gated behind
// a demo toggle). Until a server route exists, decideChat() transparently falls
// back to the scripted brain, so nothing breaks offline.
//
// ─── Activation (later, when you have an ANTHROPIC_API_KEY) ──────────────────
// 1. Add a TanStack server route POST /api/bot-brain (start.ts already wires
//    functionMiddleware). It reads process.env.ANTHROPIC_API_KEY (NEVER exposed
//    to the browser), calls Claude Haiku with the serialized ChatContext, and
//    returns { line: string | null }. Reference body:
//
//      const r = await fetch("https://api.anthropic.com/v1/messages", {
//        method: "POST",
//        headers: {
//          "x-api-key": env.ANTHROPIC_API_KEY,
//          "anthropic-version": "2023-06-01",
//          "content-type": "application/json",
//        },
//        body: JSON.stringify({
//          model: "claude-haiku-4-5-20251001",
//          max_tokens: 80,
//          system: "Tu es un joueur de Murder Party. Réponds par UNE phrase courte, " +
//                  "en français, en restant dans ton rôle et ta faction. Ne révèle " +
//                  "jamais explicitement ton rôle.",
//          messages: [{ role: "user", content: promptFromContext(ctx) }],
//        }),
//      });
//
// 2. Call enableLlmBrain() once (e.g. when the operator flips an "IA" switch).
//    getBrain() then routes every decideChat through the LLM, scripted fallback
//    on any failure.
//
// The same route can later answer decideTargets / role-specialist QA analysis —
// extend BotBrain and the request `kind` accordingly.

import { scriptedBrain, setBotBrain, type BotBrain, type ChatContext } from "./brain";

export type LlmConfig = { endpoint?: string; model?: string };

/** Compact, side-channel-free context the server route turns into a prompt. */
export function serializeContext(ctx: ChatContext, model?: string) {
  return {
    kind: "chat" as const,
    model,
    channel: ctx.channel,
    phase: ctx.phase,
    tour: ctx.tour,
    self: { pseudo: ctx.bot.pseudo, role: ctx.role?.name_fr ?? null, faction: ctx.role?.faction ?? null },
    alive: ctx.alive.filter((p) => !p.is_mj).map((p) => p.pseudo),
    recent: ctx.recent.map((m) => ({ from: m.author_pseudo, text: m.body })),
  };
}

export function createLlmBrain(config: LlmConfig = {}): BotBrain {
  const endpoint = config.endpoint ?? "/api/bot-brain";
  return {
    async decideChat(ctx) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(serializeContext(ctx, config.model)),
        });
        if (!res.ok) return scriptedBrain.decideChat(ctx); // route absent/erreur → scripté
        const data = (await res.json()) as { line?: string | null };
        return data.line ?? null;
      } catch {
        return scriptedBrain.decideChat(ctx); // hors-ligne → scripté
      }
    },
  };
}

/** Route every bot decision through the LLM brain (scripted fallback on failure). */
export function enableLlmBrain(config?: LlmConfig) {
  setBotBrain(createLlmBrain(config));
}
/** Revert to the deterministic scripted brain. */
export function disableLlmBrain() {
  setBotBrain(null);
}
