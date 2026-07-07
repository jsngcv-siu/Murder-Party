// Bot brain — decision interface with a scripted default and a swappable override
// (the LLM layer in llm.ts plugs in here later via setBotBrain). For now the
// scripted brain produces reactive, faction-aware chat lines so the demo feels
// alive AND the chat pipeline gets exercised by the QA agents.

import type { GameRow, PlayerRow, RoleRow, Phase } from "../actions";

export type ChatChannel = "mechants" | "council";

export type ChatContext = {
  bot: PlayerRow;
  role: RoleRow | null;
  channel: ChatChannel;
  game: GameRow;
  phase: Phase;
  tour: number;
  alive: PlayerRow[];
  rolesBySlug: Map<string, RoleRow>;
  recent: { author_player_id: string; author_pseudo: string; body: string }[];
};

export interface BotBrain {
  /** A chat line to post on `ctx.channel`, or null to stay silent this turn. */
  decideChat(ctx: ChatContext): Promise<string | null> | string | null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DEFENSE = [
  "Pourquoi moi ? Je n'ai rien fait de la soirée.",
  "Tu te trompes de cible, crois-moi.",
  "Sérieux ? Regarde plutôt ceux qui se taisent.",
  "Je suis clean. On perd du temps avec moi.",
];

const VILLAIN_PROPOSE = (t: string) => [
  `On élimine ${t} cette nuit ?`,
  `${t} pose trop de questions, je le sens mal.`,
  `Je vote ${t} au prochain tour, suivez.`,
  `${t} commence à comprendre. On le sort.`,
];
const VILLAIN_CAUTION = [
  "Restez discrets, on se fait griller là.",
  "On se calme, trop d'agitation attire l'œil.",
  "Personne ne se précipite, on synchronise.",
];
const VILLAIN_AGREE = (t: string) => [
  `D'accord pour ${t}.`,
  `Ok, ${t} alors.`,
  `Ça me va, on cible ${t}.`,
];

const COUNCIL = [
  "Depuis l'au-delà, je vois tout… et je ne dirai rien.",
  "Qui m'a trahi ? Je tourne en rond ici.",
  "Méfiez-vous des silencieux, les vivants.",
  "Le manoir garde ses secrets. Moi aussi.",
  "J'aurais dû voter autrement.",
];

function villainLine(ctx: ChatContext): string | null {
  const teammates = new Set(
    ctx.alive
      .filter((p) => ctx.rolesBySlug.get(p.role_slug ?? "")?.faction === "Méchant")
      .map((p) => p.id),
  );
  const prey = ctx.alive.filter((p) => !p.is_mj && !teammates.has(p.id));
  // React to a teammate's proposal naming a player.
  const lastOther = [...ctx.recent].reverse().find((m) => m.author_player_id !== ctx.bot.id);
  if (lastOther) {
    const named = prey.find((p) => lastOther.body.toLowerCase().includes(p.pseudo.toLowerCase()));
    if (named && Math.random() < 0.7) return pick(VILLAIN_AGREE(named.pseudo));
  }
  if (prey.length === 0) return pick(VILLAIN_CAUTION);
  if (Math.random() < 0.35) return pick(VILLAIN_CAUTION);
  return pick(VILLAIN_PROPOSE(pick(prey).pseudo));
}

function scriptedDecideChat(ctx: ChatContext): string | null {
  const namedMe = ctx.recent.some(
    (m) =>
      m.author_player_id !== ctx.bot.id &&
      m.body.toLowerCase().includes(ctx.bot.pseudo.toLowerCase()),
  );
  if (namedMe && Math.random() < 0.8) return pick(DEFENSE);
  if (ctx.channel === "mechants") return villainLine(ctx);
  return pick(COUNCIL);
}

export const scriptedBrain: BotBrain = { decideChat: scriptedDecideChat };

let override: BotBrain | null = null;
/** Swap in another brain (e.g. the LLM-backed one). Pass null to revert to scripted. */
export function setBotBrain(b: BotBrain | null) {
  override = b;
}
export function getBrain(): BotBrain {
  return override ?? scriptedBrain;
}
