// Bot AI driver — runs in the browser of the host (or demo operator).
// Single-tab assumption, drives bots via the same engine actions
// that real players use. Reacts to live state in real-time.
import { supabase } from "@/integrations/supabase/client";
import {
  castVote,
  executeCapability,
  type PlayerRow,
  type GameRow,
  type RoleRow,
  type Phase,
} from "./actions";
import { BOT_TICK_BASE_MS } from "./constants";
import { readInventory, itemIsUsable, itemNeedsTarget, consumeItem } from "./items";
import { probeCapability, probeItemUse } from "./qa/probes";
import { maybeBotChat } from "./qa/chat";

export type Aggression = "passive" | "normal" | "aggressive";
export type BotOverride = {
  enabled: boolean; // false = embodied by human, no AI
  aggression?: Aggression;
  alwaysVote?: string; // target player id
  neverAct?: boolean;
};

export type BotConfig = {
  globalAggression: Aggression;
  timeMultiplier: number; // 1, 5, 20
  paused: boolean;
  overrides: Record<string, BotOverride>; // by player id
  /**
   * Active le harnais QA (probeCapability → findings). UNIQUEMENT la démo le met
   * à true. En vraie partie (defaultBotConfig), il reste off : les bots jouent
   * via le moteur SANS aucune analyse QA — zéro surcoût, zéro écriture localStorage.
   */
  qa?: boolean;
};

export const defaultBotConfig: BotConfig = {
  globalAggression: "normal",
  timeMultiplier: 1,
  paused: false,
  overrides: {},
  qa: false,
};

// Suspicion model: Map<botId, Map<targetId, score>>
type SuspicionMap = Map<string, Map<string, number>>;
const suspicion: SuspicionMap = new Map();

function bumpSuspicion(botId: string, targetId: string, delta: number) {
  if (!suspicion.has(botId)) suspicion.set(botId, new Map());
  const m = suspicion.get(botId)!;
  m.set(targetId, (m.get(targetId) ?? 0) + delta);
}
function getSuspicion(botId: string, targetId: string): number {
  return suspicion.get(botId)?.get(targetId) ?? Math.random() * 0.3;
}

function aggressionWeight(a: Aggression): number {
  return a === "passive" ? 0.2 : a === "aggressive" ? 1.0 : 0.55;
}

let driver: { stop: () => void } | null = null;
const lastActions: Map<string, string> = new Map(); // botId -> last action label
const actionListeners = new Set<(map: Map<string, string>) => void>();

export function onBotActionsChange(l: (m: Map<string, string>) => void) {
  actionListeners.add(l);
  l(lastActions);
  return () => actionListeners.delete(l);
}
function setBotAction(botId: string, label: string) {
  lastActions.set(botId, label);
  actionListeners.forEach((cb) => cb(new Map(lastActions)));
}

export function startBotDriver(opts: {
  gameId: string;
  getConfig: () => BotConfig;
  embodiedPlayerId: () => string | null;
}) {
  if (driver) driver.stop();
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  async function tick() {
    if (stopped) return;
    const cfg = opts.getConfig();
    if (cfg.paused) {
      schedule();
      return;
    }
    try {
      await runTick(opts.gameId, cfg, opts.embodiedPlayerId());
    } catch (e) {
      console.error("[bot tick]", e);
    }
    schedule();
  }
  function schedule() {
    const cfg = opts.getConfig();
    const interval = Math.max(200, BOT_TICK_BASE_MS / cfg.timeMultiplier);
    timeoutId = setTimeout(tick, interval);
  }
  schedule();

  driver = {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      driver = null;
    },
  };
  return driver;
}

export function stopBotDriver() {
  if (driver) driver.stop();
}

async function runTick(gameId: string, cfg: BotConfig, embodiedId: string | null) {
  const { data: gRaw } = await supabase.from("games").select().eq("id", gameId).single();
  const game = gRaw as GameRow | null;
  if (!game || game.status !== "in_progress") return;

  const { data: pRaw } = await supabase.from("players").select().eq("game_id", gameId);
  const players = (pRaw ?? []) as PlayerRow[];
  const alive = players.filter((p) => p.is_alive && !p.is_imprisoned);
  // Un "vrai" bot n'a pas de user_id (auth anonyme côté humain renseigne user_id
  // sur la player row). On ne pilote JAMAIS un joueur humain, même si la démo
  // tourne dans un autre onglet : sinon ses capacités s'auto-exécutent.
  const aliveBots = alive.filter(
    (p) =>
      p.id !== embodiedId &&
      !p.is_mj &&
      p.user_id === null &&
      cfg.overrides[p.id]?.enabled !== false,
  );

  const rolesBySlug = await getRolesMap();
  const playerCount = players.filter((p) => !p.is_mj).length;

  for (const bot of aliveBots) {
    const ov = cfg.overrides[bot.id];
    if (ov?.neverAct) continue;
    const aggression = ov?.aggression ?? cfg.globalAggression;
    const w = aggressionWeight(aggression);

    if (Math.random() < 0.5) {
      const others = alive.filter((p) => p.id !== bot.id);
      const t = others[Math.floor(Math.random() * others.length)];
      if (t) bumpSuspicion(bot.id, t.id, Math.random() * 0.1);
    }

    if (game.current_phase === "vote") {
      if (Math.random() < w * 0.8) {
        const targetId = ov?.alwaysVote ?? pickVoteTarget(bot, alive, rolesBySlug);
        if (targetId && targetId !== bot.id) {
          await castVote(gameId, bot.id, targetId);
          const target = players.find((p) => p.id === targetId);
          setBotAction(bot.id, `vote → ${target?.pseudo ?? "?"}`);
        }
      }
    } else if (game.current_phase === "free" || game.current_phase === "gathering") {
      const role = bot.role_slug ? (rolesBySlug.get(bot.role_slug) ?? null) : null;
      // Probabilité d'agir : élevée pour que les bots utilisent vraiment leur
      // capacité chaque phase (la fonction executeCapability se charge de
      // refuser proprement si phase/cooldown/épuisement empêche).
      if (role && Math.random() < Math.min(0.9, w * 0.6)) {
        const targets = pickCapabilityTargets(bot, role, alive, rolesBySlug);
        const isPassive = (role.target_mode ?? "single") === "none";
        if (targets.length > 0 || isPassive) {
          try {
            const extra = buildExtra(role, bot);
            const runCap = () =>
              executeCapability({
                gameId,
                actor: bot,
                role,
                targets,
                tour: game.current_tour,
                phase: game.current_phase as "free" | "gathering" | "vote",
                allPlayers: players,
                rolesBySlug,
                extra,
              });
            // En démo (cfg.qa), on enveloppe l'action dans le probe QA (quota,
            // effet différé, exceptions) — MÊME action moteur, juste observée.
            // En vraie partie, on appelle le moteur DIRECTEMENT : aucun surcoût QA.
            const res = cfg.qa
              ? await probeCapability({
                  gameId,
                  gameCode: (game as { code?: string }).code ?? null,
                  bot,
                  role,
                  targets,
                  phase: game.current_phase as Phase,
                  tour: game.current_tour,
                  playerCount,
                  run: runCap,
                })
              : await runCap();
            if (res.ok) {
              setBotAction(bot.id, `${role.icon} → ${targets[0]?.pseudo ?? "auto"}`);
            }
          } catch (e) {
            console.error("[bot capability]", role.slug, e);
          }
        }
      } else if (Math.random() < w * 0.02) {
        setBotAction(bot.id, "réfléchit…");
      }

      // Usage d'objets — uniquement en Enquête : un objet offensif (couteau,
      // fiole de mort) se dénoue à l'Annonce qui SUIT l'Enquête. C'est
      // ce qui ferme la chaîne « l'Armurier arme un allié → l'allié tue ».
      if (game.current_phase === "free") {
        await maybeUseItem({
          gameId,
          gameCode: (game as { code?: string }).code ?? null,
          bot,
          alive,
          rolesBySlug,
          tour: game.current_tour,
          aggressionW: w,
          qa: cfg.qa === true,
        });
      }
    }
  }

  // Chat des bots : au plus 1 message par appel (throttlé). Inclut les morts
  // (canal Conseil) et les Méchants vivants (canal mechants).
  const chatBots = players.filter((p) => p.id !== embodiedId && !p.is_mj && p.user_id === null);
  try {
    await maybeBotChat({ gameId, game, bots: chatBots, alive, rolesBySlug });
  } catch (e) {
    console.error("[bot chat]", e);
  }

  // Les transitions de phase sont gérées par tickPhase() qui respecte
  // phase_duration_s. Pas d'avance forcée ici — sinon les durées configurées
  // par le MJ (ou via le menu démo) sont ignorées.
}

// Extra payload optionnel selon le rôle (fiole apothicaire, etc.).
function buildExtra(role: RoleRow, _bot: PlayerRow): Record<string, unknown> | undefined {
  if (role.slug === "apothicaire") {
    const fiole = (["heal", "poison", "reveal"] as const)[Math.floor(Math.random() * 3)];
    return { fiole };
  }
  return undefined;
}

// ─────────────── Roles cache ───────────────
let _rolesCache: Map<string, RoleRow> | null = null;
async function getRolesMap(): Promise<Map<string, RoleRow>> {
  if (_rolesCache) return _rolesCache;
  const { data } = await supabase.from("roles").select().eq("set_id", "set1");
  const m = new Map<string, RoleRow>();
  for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
  _rolesCache = m;
  return m;
}

function isVillainRole(slug: string | null, rolesBySlug: Map<string, RoleRow>): boolean {
  if (!slug) return false;
  const r = rolesBySlug.get(slug);
  return r?.faction === "Méchant";
}

/** Faction-aware target selection per role. Couvre l'intégralité des rôles à jour. */
function pickCapabilityTargets(
  bot: PlayerRow,
  role: RoleRow,
  alive: PlayerRow[],
  rolesBySlug: Map<string, RoleRow>,
): PlayerRow[] {
  const others = alive.filter((p) => p.id !== bot.id && !p.is_mj);
  const meWithOthers = alive.filter((p) => !p.is_mj);
  if (others.length === 0) return [];
  const isCitizen = (p: PlayerRow) => rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil";
  const isAlly = (p: PlayerRow) => rolesBySlug.get(p.role_slug ?? "")?.faction === role.faction;
  const sample = <T>(arr: T[], n: number): T[] =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);
  const mostSuspect = (pool: PlayerRow[]): PlayerRow[] =>
    [...pool].sort((a, b) => getSuspicion(bot.id, b.id) - getSuspicion(bot.id, a.id));

  switch (role.slug) {
    // ── Méchants offensifs : ciblent des non-Méchants
    case "tueur":
    case "vampire":
    case "croque_mitaine":
    case "stratege":
    case "vengeur": {
      const pool = others.filter((p) => !isVillainRole(p.role_slug, rolesBySlug));
      const candidates = pool.length > 0 ? pool : others;
      const need = role.target_mode === "double" ? 2 : 1;
      return sample(candidates, need);
    }
    case "executeur": {
      const jailed = others.filter((p) => p.is_imprisoned);
      return jailed.length > 0 ? [pickRandom(jailed)] : [];
    }
    case "juge": {
      // Met en prison un suspect (priorité aux non-alliés "supposés méchants")
      const sorted = mostSuspect(others);
      return sorted.slice(0, 1);
    }
    case "armurier": {
      // Arme un ALLIÉ Méchant — qui s'en servira pour tuer —, jamais un ennemi.
      // Préfère un allié pas encore armé ; à défaut, s'arme lui-même.
      const allies = others.filter((p) => isVillainRole(p.role_slug, rolesBySlug));
      if (allies.length === 0) return [bot];
      const armed = (p: PlayerRow) =>
        readInventory(p.role_meta as Record<string, unknown>).some(
          (it) => it.slug === "couteau" && !it.consumed,
        );
      const unarmed = allies.filter((p) => !armed(p));
      return [pickRandom(unarmed.length > 0 ? unarmed : allies)];
    }
    case "accusateur":
    case "voleur":
    case "marionnettiste":
    case "maitre_chanteur":
    case "cleaner":
    case "falsificateur":
    case "empoisonneur":
    case "cuisinier": {
      // Bots "subversifs" : sabotent un Citoyen au hasard
      const pool = others.filter((p) => isCitizen(p));
      return pool.length > 0 ? [pickRandom(pool)] : [pickRandom(others)];
    }
    // ── Enquêteurs : ciblent les plus suspects
    case "assistant_du_detective":
    case "policier":
    case "chasseur_de_vampire":
    case "heritier_dechu":
    case "journaliste":
    case "cartomancien":
    case "mouchard": {
      return mostSuspect(others).slice(0, 1);
    }
    // ── Protecteurs / soin : favorisent les alliés
    case "majordome":
    case "babysitter":
    case "ange_gardien":
    case "apothicaire": {
      const allies = others.filter(isAlly);
      const pool = allies.length > 0 ? allies : others;
      return [pickRandom(pool)];
    }
    case "saint": {
      // self_or_other → 50/50 entre soi et un allié
      if (Math.random() < 0.4) return [bot];
      const allies = others.filter(isAlly);
      return [pickRandom(allies.length > 0 ? allies : others)];
    }
    // ── Comparaisons / paires
    case "boussole":
    case "barman":
    case "entremetteur":
    case "veuve_noire":
    case "facteur": {
      const need = role.target_mode === "double" ? 2 : 1;
      return sample(others, need);
    }
    case "imitateur": {
      const deads =
        alive.length < meWithOthers.length
          ? meWithOthers.filter((p) => !p.is_alive && !p.is_mj && p.id !== bot.id)
          : [];
      if (deads.length > 0) return [pickRandom(deads)];
      return [pickRandom(others)];
    }
    case "parieur_tricheur":
    case "conservateur":
    case "usurpateur": {
      return [pickRandom(others)];
    }
    case "guetteur": {
      return [pickRandom(others)];
    }
    // ── Setup / passifs / continus : pas de ciblage actif
    case "temoin":
    case "oracle":
    case "avocat":
    case "medecin_legiste":
    case "medium":
    case "paranoiaque":
      return [];
    default: {
      // Fallback générique basé sur target_mode
      const mode = role.target_mode ?? "single";
      if (mode === "none") return [];
      if (mode === "double") return sample(others, 2);
      if (mode === "multi") return sample(others, 3);
      if (mode === "self_or_other") return [Math.random() < 0.3 ? bot : pickRandom(others)];
      return [pickRandom(others)];
    }
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Usage intelligent de l'inventaire d'un bot (1 objet/tour, plafonné par useItem) :
 *  - offensif (couteau, fiole de mort) → l'ennemi le plus suspect (jamais un allié) ;
 *  - soin (fiole de vie) → soi-même ou un allié ;
 *  - clairvoyance → un ennemi suspect (gain d'info).
 * C'est l'étape qui transforme « avoir un objet » en « s'en servir » — sans quoi
 * le couteau de l'Armurier resterait inerte dans l'inventaire de l'allié.
 */
async function maybeUseItem(opts: {
  gameId: string;
  gameCode?: string | null;
  bot: PlayerRow;
  alive: PlayerRow[];
  rolesBySlug: Map<string, RoleRow>;
  tour: number;
  aggressionW: number;
  qa?: boolean;
}): Promise<void> {
  const { gameId, gameCode, bot, alive, rolesBySlug, tour, aggressionW, qa } = opts;
  const botMeta = (bot.role_meta ?? {}) as Record<string, unknown>;
  // 1 objet/tour : si déjà servi ce tour, inutile d'essayer.
  if ((botMeta.last_item_use_cycle as number | undefined) === tour) return;

  const usable = readInventory(botMeta).filter(
    (it) => !it.consumed && itemIsUsable(it.slug, it.payload),
  );
  if (usable.length === 0) return;

  // Priorité : offensif > soin > info (un seul usage par tour).
  const offensive = usable.find((it) => it.slug === "couteau" || it.slug === "fiole_mort") ?? null;
  const heal = usable.find((it) => it.slug === "fiole_vie") ?? null;
  const reveal = usable.find((it) => it.slug === "fiole_clairvoyance") ?? null;
  const item = offensive ?? heal ?? reveal;
  if (!item) return;

  // Probabilité d'agir, pondérée par l'agressivité (on dégaine plus vite l'offensif).
  const p = item === offensive ? Math.min(0.9, aggressionW * 0.85) : aggressionW * 0.5;
  if (Math.random() > p) return;

  const others = alive.filter((q) => q.id !== bot.id && !q.is_mj);
  const needsTarget = itemNeedsTarget(item.slug, item.payload) === "single";
  if (needsTarget && others.length === 0) return;

  const myFaction = rolesBySlug.get(bot.role_slug ?? "")?.faction;
  const isAlly = (q: PlayerRow) => rolesBySlug.get(q.role_slug ?? "")?.faction === myFaction;
  const mostSuspect = (pool: PlayerRow[]) =>
    [...pool].sort((a, b) => getSuspicion(bot.id, b.id) - getSuspicion(bot.id, a.id));

  let target: PlayerRow | null = null;
  if (item === heal) {
    const allies = others.filter(isAlly);
    target = Math.random() < 0.5 || allies.length === 0 ? bot : pickRandom(allies);
  } else {
    // offensif ou clairvoyance → un ennemi (non-allié), le plus suspect d'abord.
    const enemies = others.filter((q) => !isAlly(q));
    target = mostSuspect(enemies.length > 0 ? enemies : others)[0] ?? null;
  }
  if (needsTarget && !target) return;

  try {
    const runItem = () =>
      consumeItem({
        gameId,
        actorId: bot.id,
        actorPseudo: bot.pseudo,
        item,
        target: target
          ? { id: target.id, pseudo: target.pseudo, role_slug: target.role_slug }
          : null,
        tour,
        rolesBySlug: rolesBySlug as unknown as Map<
          string,
          { slug: string; name_fr: string; icon: string; faction: string }
        >,
      });
    const res = qa
      ? await probeItemUse({
          gameId,
          gameCode,
          bot,
          item,
          target,
          phase: "free",
          tour,
          run: runItem,
        })
      : await runItem();
    if (res.ok) setBotAction(bot.id, `${item.icon} → ${target?.pseudo ?? "—"}`);
  } catch (e) {
    console.error("[bot item]", item.slug, e);
  }
}

function pickVoteTarget(
  bot: PlayerRow,
  alive: PlayerRow[],
  rolesBySlug: Map<string, RoleRow>,
): string | null {
  const candidates = alive.filter((p) => p.id !== bot.id);
  if (candidates.length === 0) return null;
  const botIsVillain = isVillainRole(bot.role_slug, rolesBySlug);
  if (botIsVillain) {
    const civils = candidates.filter((p) => !isVillainRole(p.role_slug, rolesBySlug));
    if (civils.length > 0) return civils[Math.floor(Math.random() * civils.length)].id;
  }
  let best: { id: string; s: number } | null = null;
  for (const c of candidates) {
    const s = getSuspicion(bot.id, c.id);
    if (!best || s > best.s) best = { id: c.id, s };
  }
  return best?.id ?? candidates[0].id;
}
