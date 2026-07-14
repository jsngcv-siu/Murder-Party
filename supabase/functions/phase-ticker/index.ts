// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer. Source : index.src.ts. Régénérer : node scripts/build-phase-ticker.mjs
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
function createSupabaseClient() {
  const viteEnv = import.meta.env ?? {};
  const nodeEnv = typeof process !== "undefined" ? process.env ?? {} : {};
  const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || nodeEnv.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || nodeEnv.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...!SUPABASE_URL ? ["SUPABASE_URL"] : [],
      ...!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. See .env.example.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : void 0,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
function setSupabaseClient(client) {
  _supabase = client;
}
var _supabase, supabase;
var init_client = __esm({
  "src/integrations/supabase/client.ts"() {
    "use strict";
    supabase = new Proxy({}, {
      get(_, prop, receiver) {
        if (!_supabase) _supabase = createSupabaseClient();
        return Reflect.get(_supabase, prop, receiver);
      }
    });
  }
});

// src/engine/notify.ts
async function notify(opts) {
  await supabase.from("notifications").insert({
    game_id: opts.gameId,
    player_id: opts.playerId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    payload: opts.payload ?? {}
  });
  if (opts.mjTitle) {
    await supabase.from("notifications").insert({
      game_id: opts.gameId,
      player_id: null,
      type: opts.type,
      title: opts.mjTitle,
      body: opts.mjBody ?? null,
      payload: { ...opts.payload ?? {}, mj_view: true }
    });
  }
}
async function notifyMJ(opts) {
  await supabase.from("notifications").insert({
    game_id: opts.gameId,
    player_id: null,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    payload: { ...opts.payload ?? {}, mj_view: true }
  });
}
var init_notify = __esm({
  "src/engine/notify.ts"() {
    "use strict";
    init_client();
  }
});

// src/engine/roleMeta.ts
function getMeta(row) {
  return row?.role_meta ?? {};
}
var init_roleMeta = __esm({
  "src/engine/roleMeta.ts"() {
    "use strict";
  }
});

// src/engine/winConditions.ts
function isBenignRole(r) {
  if (r.is_benign != null) return r.is_benign;
  return (r.type ?? "").toUpperCase() === "B\xC9NIN";
}
async function cancelUnresolvedDeferredIntents(gameId, result) {
  const endedAt = (/* @__PURE__ */ new Date()).toISOString();
  const resolution = {
    status: "cancelled",
    reason: "game_ended",
    winner: result.winner
  };
  const playerResult = {
    summary: "La partie s'est termin\xE9e avant le d\xE9nouement de cette action.",
    outcome: "info"
  };
  await supabase.from("role_actions").update({
    resolved_at: endedAt,
    resolution,
    result: playerResult
  }).eq("game_id", gameId).is("resolved_at", null).eq("timing", "DEFERRED").not("category", "is", null);
}
function winnerFamily(winner) {
  if (winner === "Civil") return "Civil";
  if (winner === "M\xE9chants") return "M\xE9chant";
  return "Neutre";
}
function withOracleWinners(result, players) {
  if (!result.winner) return result;
  const fam = winnerFamily(result.winner);
  const winners = players.filter((p) => {
    if (p.role_slug !== "oracle") return false;
    if (!p.is_alive) return false;
    return getMeta(p).prophecy === fam;
  });
  if (winners.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (\u{1F52E} Oracle ${winners.map((w) => w.pseudo).join(", ")} a vu juste.)`
  };
}
function withEntremetteurWinner(result, players) {
  if (!result.winner) return result;
  const survivors = players.filter((p) => {
    if (p.role_slug !== "entremetteur") return false;
    if (!p.is_alive || p.is_imprisoned) return false;
    const pair = getMeta(p).linked_pair ?? [];
    if (pair.length < 2) return true;
    const lovers = players.filter((q) => pair.includes(q.id));
    const coupleIntact = lovers.length === 2 && lovers.every((q) => q.is_alive && !q.is_imprisoned);
    return !coupleIntact;
  });
  if (survivors.length === 0) return result;
  return {
    winner: result.winner,
    reason: `${result.reason} (\u{1F49E} L'Entremetteur ${survivors.map((w) => w.pseudo).join(", ")} survit : son pari est tenu.)`
  };
}
async function evaluateWin(gameId) {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const players = ps ?? [];
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r of rs ?? []) rolesBySlug.set(r.slug, r);
  const real = players.filter((p) => {
    return getMeta(p).immortal !== true && !p.is_mj;
  });
  const alive = real.filter((p) => p.is_alive && !p.is_imprisoned);
  if (alive.length === 0) return { winner: null, reason: "Aucun survivant" };
  const playerCount = real.length;
  const isRealMechant = (p) => {
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    return r?.faction === "M\xE9chant";
  };
  const realMechantsAlive = alive.filter(isRealMechant).length;
  const isMechant = (p) => {
    if (p.role_slug === "heritier_dechu" && realMechantsAlive > 0) return true;
    return isRealMechant(p);
  };
  const isVampire = (p) => {
    return p.role_slug === "vampire" || getMeta(p).converted === true;
  };
  const isLover = (p) => {
    return typeof getMeta(p).linked_with === "string";
  };
  const isEntremetteurFaction = (p) => p.role_slug === "entremetteur" || isLover(p);
  const isBlockingNeutre = (p) => {
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    if (!r || r.faction !== "Neutre") return false;
    if (isBenignRole(r)) return false;
    if (p.role_slug === "vampire") return false;
    if (p.role_slug === "chasseur_de_vampire") return false;
    if (isEntremetteurFaction(p)) return false;
    if (p.role_slug === "heritier_dechu") {
      if (realMechantsAlive === 0) return false;
    }
    return true;
  };
  const isBenignNeutre = (p) => {
    const r = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    return r?.faction === "Neutre" && isBenignRole(r);
  };
  const mechantsAlive = alive.filter(isMechant).length;
  const vampiresAlive = alive.filter(isVampire).length;
  const nonVampAlive = alive.filter((p) => !isVampire(p)).length;
  const loversAlive = alive.filter(isLover);
  const entremetteurFactionActive = loversAlive.length === 2;
  const entremetteurFactionAlive = entremetteurFactionActive ? alive.filter(isEntremetteurFaction).length : 0;
  const blockingNeutresAlive = alive.filter((p) => {
    if (!isBlockingNeutre(p)) return false;
    if (p.role_slug === "entremetteur" && !entremetteurFactionActive) return false;
    return true;
  }).length;
  const soloNeutreSlugs = /* @__PURE__ */ new Set(["veuve_noire", "parieur_tricheur"]);
  for (const slug of soloNeutreSlugs) {
    const me = alive.find((p) => p.role_slug === slug);
    if (!me) continue;
    const others = alive.filter((p) => p.id !== me.id);
    if (others.length === 0) {
      const label = slug === "veuve_noire" ? "Veuve noire" : "Parieur tricheur";
      return { winner: label, reason: `${me.pseudo} est le\xB7la seul\xB7e survivant\xB7e.` };
    }
  }
  const empoisonneur = alive.find((p) => p.role_slug === "empoisonneur");
  if (empoisonneur) {
    const others = alive.filter((p) => p.id !== empoisonneur.id);
    if (others.length > 0 && others.every((p) => getMeta(p).poisoned === true)) {
      return {
        winner: "Empoisonneur",
        reason: `${empoisonneur.pseudo} a empoisonn\xE9 tous les survivants libres.`
      };
    }
  }
  if (vampiresAlive >= 1 && nonVampAlive === 0) {
    return { winner: "Vampires", reason: "Les Vampires r\xE8gnent sur le manoir." };
  }
  const benignNeutresAlive = alive.filter(isBenignNeutre).length;
  const mechantOpponentsAlive = alive.length - mechantsAlive - benignNeutresAlive;
  if (mechantsAlive > 0 && mechantsAlive > mechantOpponentsAlive) {
    return {
      winner: "M\xE9chants",
      reason: "Les M\xE9chants surpassent en nombre tous les autres camps r\xE9unis."
    };
  }
  if (entremetteurFactionActive) {
    const others = alive.filter((p) => !isEntremetteurFaction(p));
    if (others.length === 0) {
      const [a, b] = loversAlive;
      const entAlive = alive.some((p) => p.role_slug === "entremetteur");
      return {
        winner: "Amoureux",
        reason: `${a.pseudo} et ${b.pseudo} survivent ensemble${entAlive ? " avec l'Entremetteur" : ""}.`
      };
    }
  }
  if (mechantsAlive === 0 && vampiresAlive === 0 && entremetteurFactionAlive === 0 && blockingNeutresAlive === 0) {
    return { winner: "Civil", reason: "Tous les ennemis des Citoyens ont \xE9t\xE9 \xE9limin\xE9s." };
  }
  if (alive.length === 1) {
    const p = alive[0];
    const role = p.role_slug ? rolesBySlug.get(p.role_slug) : null;
    const label = LONE_WINNER_LABEL[p.role_slug ?? ""] ?? (role?.faction === "Civil" ? "Civil" : role?.faction === "M\xE9chant" ? "M\xE9chants" : role?.name_fr ?? "Survivant");
    return {
      winner: label,
      reason: `${p.pseudo} est l'unique survivant\xB7e : tous les autres camps ont disparu.`
    };
  }
  return null;
}
async function checkAndEndGame(gameId) {
  const { data: g } = await supabase.from("games").select("status").eq("id", gameId).single();
  if (g?.status === "ended") return null;
  let r = await evaluateWin(gameId);
  if (!r) return null;
  const { data: ps2 } = await supabase.from("players").select().eq("game_id", gameId);
  r = withOracleWinners(r, ps2 ?? []);
  r = withEntremetteurWinner(r, ps2 ?? []);
  await cancelUnresolvedDeferredIntents(gameId, r);
  const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
  const rows = (ps ?? []).map((p) => ({
    game_id: gameId,
    player_id: p.id,
    type: "game_end",
    title: r.winner ? `\u{1F3C6} ${r.winner} a gagn\xE9` : "Partie termin\xE9e",
    body: r.reason,
    payload: { winner: r.winner }
  }));
  if (rows.length) await supabase.from("notifications").insert(rows);
  await supabase.from("games").update({
    status: "ended",
    ended_at: (/* @__PURE__ */ new Date()).toISOString(),
    winner: r.winner ?? null,
    win_reason: r.reason
  }).eq("id", gameId);
  return r;
}
var LONE_WINNER_LABEL;
var init_winConditions = __esm({
  "src/engine/winConditions.ts"() {
    "use strict";
    init_client();
    init_roleMeta();
    LONE_WINNER_LABEL = {
      empoisonneur: "Empoisonneur",
      veuve_noire: "Veuve noire",
      parieur_tricheur: "Parieur tricheur",
      conservateur: "Conservateur"
    };
  }
});

// src/engine/resolver.ts
var resolver_exports = {};
__export(resolver_exports, {
  resolveDeferredIntents: () => resolveDeferredIntents,
  submitIntent: () => submitIntent
});
async function submitIntent(input) {
  const layer = LAYER_BY_CATEGORY[input.category];
  const { data, error } = await supabase.from("role_actions").insert({
    game_id: input.gameId,
    tour: input.tour,
    phase: input.phase,
    actor_player_id: input.actorId,
    target_player_id: input.targetId ?? null,
    target_player_id_2: input.targetId2 ?? null,
    category: input.category,
    timing: input.timing,
    source: input.source,
    item_id: input.itemId ?? null,
    preconditions: input.preconditions ?? {},
    payload: input.payload ?? {},
    layer
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
async function setStatus(opts) {
  await supabase.from("player_statuses").insert({
    game_id: opts.gameId,
    player_id: opts.playerId,
    status_slug: opts.statusSlug,
    source: opts.source,
    active_from_tour: opts.fromTour,
    active_until_tour: opts.untilTour ?? null,
    payload: opts.payload ?? {}
  });
}
async function decrementCharge(itemId) {
  if (!itemId) return;
  const { data } = await supabase.from("inventory").select("charges").eq("id", itemId).single();
  const c = data?.charges;
  if (c == null) return;
  const next = Math.max(0, c - 1);
  if (next === 0) {
    await supabase.from("inventory").delete().eq("id", itemId);
  } else {
    await supabase.from("inventory").update({ charges: next, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", itemId);
  }
}
function deferredPlayerResult(cat, status) {
  if (cat === "ATTACK") {
    if (status === "applied")
      return { summary: "Attaque r\xE9ussie \u2014 ta cible n'a pas surv\xE9cu.", outcome: "success" };
    if (status === "protected")
      return { summary: "\xC9chec : ta cible a surv\xE9cu \xE0 ton attaque.", outcome: "fail" };
    return { summary: "Ton attaque n'a pas pu aboutir ce tour.", outcome: "fail" };
  }
  if (cat === "PROTECT") {
    if (status === "applied")
      return { summary: "Protection pos\xE9e sur ta cible ce tour.", outcome: "success" };
    return { summary: "Ta protection n'a pas pu se poser.", outcome: "fail" };
  }
  if (cat === "CURE") {
    if (status === "applied") return { summary: "Soin appliqu\xE9 sur ta cible.", outcome: "success" };
    return { summary: "Le soin n'a pas pu \xEAtre appliqu\xE9.", outcome: "fail" };
  }
  if (cat === "CASCADE") {
    if (status === "applied") return { summary: "Ta cible a \xE9t\xE9 empoisonn\xE9e.", outcome: "success" };
    if (status === "protected")
      return { summary: "\xC9chec : ta cible \xE9tait prot\xE9g\xE9e.", outcome: "fail" };
    return { summary: "Ta mal\xE9diction n'a pas pu aboutir ce tour.", outcome: "fail" };
  }
  return null;
}
async function writeResolution(intentId, resolution, result) {
  await supabase.from("role_actions").update({
    resolved_at: (/* @__PURE__ */ new Date()).toISOString(),
    resolution,
    ...result ? { result } : {}
  }).eq("id", intentId);
}
async function applyResultToLatestAction(gameId, actorId, tour, result) {
  const { data: latest } = await supabase.from("role_actions").select("id").eq("game_id", gameId).eq("actor_player_id", actorId).eq("tour", tour).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const id = latest?.id;
  if (id)
    await supabase.from("role_actions").update({ result }).eq("id", id);
}
async function checkPreconditions(intent, alivePlayers) {
  const actor = alivePlayers.get(intent.actor_player_id);
  if (!actor) return { ok: false, reason: "actor_dead" };
  if (actor.is_imprisoned) return { ok: false, reason: "actor_imprisoned" };
  const m = getMeta(actor);
  const isRoleSource = (intent.source ?? "").startsWith("role:");
  const isItemSource = (intent.source ?? "").startsWith("item:");
  if (isRoleSource) {
    const blockedUntil = m.blocked_until_cycle ?? -1;
    const blockedFrom = m.blocked_from_cycle ?? -Infinity;
    const blackmailUntil = m.blackmail_until_cycle ?? -1;
    const blackmailFrom = m.blackmail_from_cycle ?? -Infinity;
    if (blockedUntil >= intent.tour && blockedFrom <= intent.tour)
      return { ok: false, reason: "blocked" };
    if (blackmailUntil >= intent.tour && blackmailFrom <= intent.tour)
      return { ok: false, reason: "blackmailed" };
  }
  if (intent.target_player_id) {
    const tgt = alivePlayers.get(intent.target_player_id);
    if (!tgt) return { ok: false, reason: "target_dead" };
  }
  if (isItemSource && intent.item_id) {
    const { data } = await supabase.from("inventory").select("id, holder_player_id, charges").eq("id", intent.item_id).maybeSingle();
    const inv = data;
    if (!inv) return { ok: false, reason: "item_missing" };
    if (inv.holder_player_id !== intent.actor_player_id)
      return { ok: false, reason: "item_transferred" };
    if (inv.charges != null && inv.charges <= 0) return { ok: false, reason: "item_empty" };
  }
  return { ok: true };
}
async function applyProtect(intent) {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const isSaint = intent.source === "role:saint";
  const shieldUntil = intent.tour + (isSaint ? 2 : 1);
  const { data: tgt } = await supabase.from("players").select("role_meta").eq("id", targetId).single();
  const m = getMeta(tgt);
  const nextMeta = { ...m, protected_until_cycle: shieldUntil };
  if (intent.source === "role:majordome") {
    nextMeta.guarded_by = intent.actor_player_id;
    nextMeta.guarded_by_cycle = intent.tour;
  }
  await supabase.from("players").update({
    role_meta: nextMeta
  }).eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "protected",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: shieldUntil
  });
  await decrementCharge(intent.item_id);
  return { status: "applied", effect: "protect", target: targetId };
}
async function applyCure(intent) {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: tgt } = await supabase.from("players").select("role_meta").eq("id", targetId).single();
  const m = getMeta(tgt);
  const shieldUntil = intent.tour + 1;
  await supabase.from("players").update({
    role_meta: {
      ...m,
      poison_resolves_cycle: null,
      poisoned: false,
      protected_until_cycle: shieldUntil
    }
  }).eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "protected",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: shieldUntil
  });
  await decrementCharge(intent.item_id);
  return { status: "applied", effect: "cure", target: targetId };
}
async function applyAttack(intent, killer) {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: tgt } = await supabase.from("players").select("role_meta, is_alive").eq("id", targetId).single();
  const tRow = tgt;
  if (!tRow || !tRow.is_alive) {
    await decrementCharge(intent.item_id);
    return { status: "cancelled", reason: "target_dead" };
  }
  const tMeta = getMeta(tRow);
  const prot = tMeta.protected_until_cycle ?? -1;
  const blessedUntil = tMeta.blessed_until_cycle ?? -1;
  const isBlessed = tMeta.blessed_by_saint === true && blessedUntil >= intent.tour;
  if (prot >= intent.tour || isBlessed) {
    await decrementCharge(intent.item_id);
    await notifyMJ({
      gameId: intent.game_id,
      type: "shielded",
      title: "\u{1F6E1}\uFE0F Attaque bloqu\xE9e",
      body: `${intent.payload?.target_pseudo ?? "Cible"} a \xE9t\xE9 attaqu\xE9 (${intent.source ?? "?"}) mais une protection l'a sauv\xE9.`
    });
    const saintId = tMeta.blessed_by_saint_id;
    if (isBlessed && saintId) {
      const { data: attackerRow } = await supabase.from("players").select("pseudo").eq("id", intent.actor_player_id).maybeSingle();
      const attackerPseudo = attackerRow?.pseudo ?? "?";
      const targetPseudo = intent.payload?.target_pseudo ?? "ta cible";
      await notify({
        gameId: intent.game_id,
        playerId: saintId,
        type: "saint_block_log",
        title: "\u2728 B\xE9n\xE9diction active",
        body: `${attackerPseudo} a tent\xE9 une attaque (${intent.source ?? "?"}) sur ${targetPseudo} \u2014 annul\xE9e.`,
        payload: {
          actor_id: intent.actor_player_id,
          actor_pseudo: attackerPseudo,
          target_id: targetId,
          target_pseudo: targetPseudo,
          action: intent.source ?? "attaque",
          tour: intent.tour
        }
      });
      await notify({
        gameId: intent.game_id,
        playerId: intent.actor_player_id,
        type: "saint_block",
        title: "\u2728 Cible b\xE9nie",
        body: `${targetPseudo} est sous b\xE9n\xE9diction \u2014 ton action ne fonctionne pas.`
      });
    }
    const guardedBy = tMeta.guarded_by;
    const payloadAttack = intent.payload ?? {};
    const isMechantAttack = intent.source === "role:tueur" || intent.source === "role:croque_mitaine" || payloadAttack.mechant_mechanic === true;
    if (isMechantAttack && typeof guardedBy === "string" && guardedBy.length > 0) {
      await killer(intent.game_id, guardedBy, "majordome_trade", intent.actor_player_id);
      await killer(intent.game_id, intent.actor_player_id, "majordome_riposte", guardedBy);
      return {
        status: "protected",
        reason: "majordome_trade",
        guard: guardedBy,
        killer: intent.actor_player_id
      };
    }
    return { status: "protected", reason: isBlessed ? "blessed" : "shield" };
  }
  const subEffect = intent.payload?.sub_effect;
  if (subEffect === "poison_delayed") {
    const cur = tMeta;
    const delay = Number(intent.payload?.delay ?? 1);
    const resolvesAt = intent.tour + Math.max(1, delay);
    await supabase.from("players").update({
      role_meta: { ...cur, poison_resolves_cycle: resolvesAt }
    }).eq("id", targetId);
    await decrementCharge(intent.item_id);
    return {
      status: "applied",
      effect: "poison_delayed",
      target: targetId,
      resolves_at: resolvesAt
    };
  }
  const payload = intent.payload ?? {};
  const reason = payload.kill_reason ?? (intent.source?.startsWith("item:") ? intent.source.replace("item:", "") : intent.source?.replace("role:", "") ?? "engine");
  if (payload.puppet === true) {
    const puppeteerId = payload.puppeteer_id;
    const { data: tgtP } = await supabase.from("players").select("pseudo").eq("id", targetId).single();
    const tgtPseudo = tgtP?.pseudo ?? "?";
    await notify({
      gameId: intent.game_id,
      playerId: intent.actor_player_id,
      type: "puppet_forced",
      title: "\u{1F3AD} Tu as \xE9t\xE9 manipul\xE9",
      body: `Tu as frapp\xE9 ${tgtPseudo} sans le vouloir.`,
      mjTitle: "\u{1F3AD} Marionnette",
      mjBody: `${payload.puppet_pseudo ?? "?"} (manipul\xE9) frappe ${tgtPseudo}.`
    });
    if (puppeteerId) {
      await notify({
        gameId: intent.game_id,
        playerId: puppeteerId,
        type: "puppet_mirror",
        title: "\u{1F3AD} Reflet de la marionnette",
        body: `${payload.puppet_pseudo ?? "?"} a frapp\xE9 ${tgtPseudo}.`
      });
    }
  }
  const weaponFromSlug = payload.weapon_from_slug ?? null;
  const ok = await killer(
    intent.game_id,
    targetId,
    reason,
    intent.actor_player_id,
    weaponFromSlug ? { weapon_from_slug: weaponFromSlug } : void 0
  );
  await decrementCharge(intent.item_id);
  return { status: ok ? "applied" : "cancelled", effect: "kill", target: targetId, reason };
}
async function applyConvert(intent, converter) {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: actorRow } = await supabase.from("players").select("is_alive").eq("id", intent.actor_player_id).single();
  if (!actorRow?.is_alive) {
    return { status: "cancelled", reason: "biter_killed" };
  }
  const { data: tgtRow } = await supabase.from("players").select("is_alive").eq("id", targetId).single();
  if (!tgtRow?.is_alive) {
    return { status: "cancelled", reason: "target_dead" };
  }
  const ok = await converter(intent.game_id, intent.actor_player_id, targetId, intent.tour);
  return { status: ok ? "applied" : "cancelled", effect: "convert", target: targetId };
}
async function applyPoison(intent) {
  const targetId = intent.target_player_id;
  if (!targetId) return { status: "cancelled", reason: "no_target" };
  const { data: actorRow } = await supabase.from("players").select("is_alive").eq("id", intent.actor_player_id).single();
  if (!actorRow?.is_alive) {
    return { status: "cancelled", reason: "poisoner_killed" };
  }
  const { data: tgt } = await supabase.from("players").select("role_meta, is_alive").eq("id", targetId).single();
  const tRow = tgt;
  if (!tRow || !tRow.is_alive) return { status: "cancelled", reason: "target_dead" };
  const tMeta = getMeta(tRow);
  const prot = tMeta.protected_until_cycle ?? -1;
  const blessedUntil = tMeta.blessed_until_cycle ?? -1;
  const isBlessed = tMeta.blessed_by_saint === true && blessedUntil >= intent.tour;
  if (prot >= intent.tour || isBlessed) {
    await notifyMJ({
      gameId: intent.game_id,
      type: "shielded",
      title: "\u{1F6E1}\uFE0F Empoisonnement bloqu\xE9",
      body: `${intent.payload?.target_pseudo ?? "Cible"} \xE9tait prot\xE9g\xE9(e) \u2014 la mal\xE9diction n'a pas pris.`
    });
    return { status: "protected", reason: isBlessed ? "blessed" : "shield" };
  }
  const cur = tMeta;
  await supabase.from("players").update({
    role_meta: {
      ...cur,
      poisoned: true,
      poisoned_by: intent.actor_player_id,
      poisoned_at_cycle: intent.tour
    }
  }).eq("id", targetId);
  await setStatus({
    gameId: intent.game_id,
    playerId: targetId,
    statusSlug: "poisoned",
    source: intent.source ?? "unknown",
    fromTour: intent.tour,
    untilTour: null
  });
  return { status: "applied", effect: "poison_curse", target: targetId };
}
async function preprocessCleaner(gameId, intents, alive) {
  const { data: cleanersRows } = await supabase.from("players").select("*").eq("game_id", gameId).eq("role_slug", "cleaner").eq("is_alive", true);
  const cleaners = cleanersRows ?? [];
  const armed = cleaners.find((c) => getMeta(c).clean_armed === true);
  if (!armed) return;
  const { count } = await supabase.from("players").select("*", { count: "exact", head: true }).eq("game_id", gameId).eq("is_mj", false);
  const maxUses = (count ?? 0) >= 10 ? 2 : 1;
  const cleanerMeta = getMeta(armed);
  const usesMap = { ...cleanerMeta.uses ?? {} };
  const usedSoFar = usesMap["cleaner"] ?? 0;
  const remaining = Math.max(0, maxUses - usedSoFar);
  if (remaining <= 0) {
    await supabase.from("players").update({
      role_meta: { ...cleanerMeta, clean_armed: false }
    }).eq("id", armed.id);
    return;
  }
  const eligible = intents.filter((i) => {
    if (i.category !== "ATTACK") return false;
    if (!i.target_player_id) return false;
    if (!alive.has(i.target_player_id)) return false;
    const p = i.payload ?? {};
    return p.mechant_mechanic === true;
  });
  if (eligible.length === 0) return;
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const picked = [];
  const seenTargets = /* @__PURE__ */ new Set();
  for (const it of shuffled) {
    if (picked.length >= remaining) break;
    const tid = it.target_player_id;
    if (seenTargets.has(tid)) continue;
    seenTargets.add(tid);
    picked.push(it);
  }
  for (const it of picked) {
    const tid = it.target_player_id;
    const tgt = alive.get(tid);
    const tMeta = getMeta(tgt);
    await supabase.from("players").update({
      role_meta: { ...tMeta, cleaned: true }
    }).eq("id", tid);
    await notify({
      gameId,
      playerId: armed.id,
      type: "clean_done",
      title: "\u{1F9F9} Corps nettoy\xE9",
      body: `${tgt.pseudo} a \xE9t\xE9 \xE9limin\xE9 \u2014 l'identit\xE9 a \xE9t\xE9 effac\xE9e.`,
      mjTitle: "\u{1F9F9} Cleaner",
      mjBody: `${armed.pseudo} (Cleaner) efface la mort de ${tgt.pseudo} \u2014 aucune annonce publique.`
    });
  }
  usesMap["cleaner"] = usedSoFar + picked.length;
  await supabase.from("players").update({
    role_meta: { ...cleanerMeta, clean_armed: false, uses: usesMap }
  }).eq("id", armed.id);
}
async function resolveDeferredIntents(gameId, tour, killer, converter) {
  const { data: rows } = await supabase.from("role_actions").select("*").eq("game_id", gameId).lte("tour", tour).is("resolved_at", null).not("category", "is", null).eq("timing", "DEFERRED").order("tour", { ascending: true }).order("layer", { ascending: true }).order("created_at", { ascending: true });
  const intents = rows ?? [];
  if (intents.length === 0) return { resolved: 0, applied: 0, protected: 0, cancelled: 0 };
  const { data: ps } = await supabase.from("players").select("*").eq("game_id", gameId).eq("is_alive", true);
  const alive = new Map((ps ?? []).map((p) => [p.id, p]));
  await preprocessCleaner(gameId, intents, alive);
  let applied = 0, prot = 0, cancelled = 0;
  for (const intent of intents) {
    const cat = intent.category;
    if (!cat) continue;
    const layer = LAYER_BY_CATEGORY[cat];
    if (layer >= 99) continue;
    if (cat === "ATTACK" && intent.source === "role:parieur_tricheur" && intent.target_player_id) {
      await supabase.from("player_statuses").delete().eq("game_id", gameId).eq("player_id", intent.target_player_id).eq("status_slug", "dice_loser");
    }
    const pre = await checkPreconditions(intent, alive);
    if (!pre.ok) {
      if (cat === "ATTACK") await decrementCharge(intent.item_id);
      {
        const pr = deferredPlayerResult(cat, "cancelled");
        await writeResolution(
          intent.id,
          { status: "cancelled", reason: pre.reason },
          pr ?? void 0
        );
        if (pr) await applyResultToLatestAction(gameId, intent.actor_player_id, intent.tour, pr);
      }
      cancelled++;
      continue;
    }
    let res;
    if (cat === "PROTECT") res = await applyProtect(intent);
    else if (cat === "CURE") res = await applyCure(intent);
    else if (cat === "ATTACK") res = await applyAttack(intent, killer);
    else if (cat === "CONVERT") res = await applyConvert(intent, converter);
    else if (cat === "CASCADE") res = await applyPoison(intent);
    else {
      res = { status: "cancelled", reason: "unsupported_category" };
    }
    {
      const pr = deferredPlayerResult(cat, res.status);
      await writeResolution(intent.id, res, pr ?? void 0);
      if (pr) await applyResultToLatestAction(gameId, intent.actor_player_id, intent.tour, pr);
    }
    if (res.status === "applied") applied++;
    else if (res.status === "protected") prot++;
    else cancelled++;
  }
  await notifyMJ({
    gameId,
    type: "resolver_recap",
    title: `\u{1F9EE} R\xE9solution \u2014 TOUR ${tour}`,
    body: `${applied} appliqu\xE9e(s) \xB7 ${prot} bloqu\xE9e(s) par protection \xB7 ${cancelled} annul\xE9e(s).`,
    payload: { tour, applied, protected: prot, cancelled, total: intents.length }
  });
  return { resolved: intents.length, applied, protected: prot, cancelled };
}
var LAYER_BY_CATEGORY;
var init_resolver = __esm({
  "src/engine/resolver.ts"() {
    "use strict";
    init_client();
    init_notify();
    init_roleMeta();
    LAYER_BY_CATEGORY = {
      PROTECT: 1,
      CURE: 1,
      ATTACK: 2,
      CASCADE: 3,
      // Conversion vampire : APRÈS les attaques (layer 2) → si le Vampire meurt ce
      // tour (ex. Chasseur), sa morsure est annulée par l'applier (le kill prime).
      CONVERT: 3,
      // Hors batch deferred : les autres ne sont pas résolus par cette boucle.
      INVESTIGATE: 99,
      BLOCK: 99,
      FALSIFY: 99,
      TRANSFER: 99,
      META: 99
    };
  }
});

// src/lib/phaseTiming.ts
function introMsFor(phase) {
  return phase === "annonce" ? 0 : INTRO_MS;
}
function introSFor(phase) {
  return introMsFor(phase) / 1e3;
}
var INTRO_MS, INTRO_S, VOTE_RESULT_MS, VOTE_RESULT_S;
var init_phaseTiming = __esm({
  "src/lib/phaseTiming.ts"() {
    "use strict";
    INTRO_MS = 3e3;
    INTRO_S = INTRO_MS / 1e3;
    VOTE_RESULT_MS = 8e3;
    VOTE_RESULT_S = VOTE_RESULT_MS / 1e3;
  }
});

// src/lib/serverClock.ts
async function pingOnce() {
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("server_now_ms");
    const t1 = Date.now();
    if (error || data == null) return null;
    const serverMs = Number(data);
    const rtt = t1 - t0;
    const offset = serverMs + Math.floor(rtt / 2) - t1;
    return { offset, rtt };
  } catch {
    return null;
  }
}
async function measureOffset(samples = 5) {
  const results = [];
  for (let i = 0; i < samples; i++) {
    const r = await pingOnce();
    if (r) results.push(r);
  }
  if (results.length === 0) return cachedOffset ?? 0;
  results.sort((a, b) => a.rtt - b.rtt);
  const best = results[0].offset;
  cachedOffset = best;
  return best;
}
async function fetchOffset() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      return await measureOffset();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
function serverNow() {
  return Date.now() + (cachedOffset ?? 0);
}
function serverNowISO() {
  return new Date(serverNow()).toISOString();
}
var cachedOffset, inflight;
var init_serverClock = __esm({
  "src/lib/serverClock.ts"() {
    "use strict";
    init_client();
    cachedOffset = null;
    inflight = null;
    if (typeof document !== "undefined") void fetchOffset();
  }
});

// src/engine/constants.ts
var constants_exports = {};
__export(constants_exports, {
  BOT_TICK_BASE_MS: () => BOT_TICK_BASE_MS,
  NEUTRE_TYPE_WEIGHTS: () => NEUTRE_TYPE_WEIGHTS,
  acolyteQuotasFor: () => acolyteQuotasFor,
  acolytesCountFor: () => acolytesCountFor,
  civilQuotasFor: () => civilQuotasFor,
  neutresCountFor: () => neutresCountFor
});
function bracket(n) {
  if (n <= 8) return "small";
  if (n <= 13) return "mid";
  return "large";
}
function acolyteQuotasFor(playerCount) {
  return ACOLYTE_QUOTAS[bracket(playerCount)];
}
function civilQuotasFor(playerCount) {
  return CIVIL_QUOTAS[bracket(playerCount)];
}
function neutresCountFor(playerCount) {
  if (playerCount <= 7) return 0;
  if (playerCount <= 11) return 1;
  return 2;
}
function acolytesCountFor(playerCount) {
  if (playerCount <= 9) return 1;
  return 2;
}
var BOT_TICK_BASE_MS, ACOLYTE_QUOTAS, CIVIL_QUOTAS, NEUTRE_TYPE_WEIGHTS;
var init_constants = __esm({
  "src/engine/constants.ts"() {
    "use strict";
    BOT_TICK_BASE_MS = 4e3;
    ACOLYTE_QUOTAS = {
      small: {
        INVESTIGATION: { min: 0, max: 1 },
        TROMPERIE: { min: 0, max: 1 },
        SUPPORT: { min: 0, max: 1 }
      },
      mid: {
        INVESTIGATION: { min: 1, max: 1 },
        TROMPERIE: { min: 0, max: 1 },
        SUPPORT: { min: 0, max: 1 }
      },
      large: {
        INVESTIGATION: { min: 1, max: 1 },
        TROMPERIE: { min: 1, max: 2 },
        SUPPORT: { min: 0, max: 1 }
      }
    };
    CIVIL_QUOTAS = {
      small: {
        INVESTIGATION: { min: 1, max: 2 },
        PROTECTEUR: { min: 0, max: 1 },
        TUEUR: { min: 0, max: 1 },
        SUPPORT: { min: 1, max: 2 }
      },
      mid: {
        INVESTIGATION: { min: 2, max: 2 },
        PROTECTEUR: { min: 1, max: 1 },
        TUEUR: { min: 1, max: 1 },
        SUPPORT: { min: 1, max: 2 }
      },
      large: {
        INVESTIGATION: { min: 2, max: 3 },
        PROTECTEUR: { min: 1, max: 2 },
        TUEUR: { min: 1, max: 1 },
        SUPPORT: { min: 2, max: 2 }
      }
    };
    NEUTRE_TYPE_WEIGHTS = {
      B\u00C9NIN: 1,
      MAL: 0.45,
      CHAOS: 0.2
    };
  }
});

// src/lib/poolConfig.ts
var poolConfig_exports = {};
__export(poolConfig_exports, {
  asPoolConfig: () => asPoolConfig,
  buildDefaultPool: () => buildDefaultPool,
  expandSlotTypes: () => expandSlotTypes
});
function expandSlotTypes(t) {
  return t.split("/").map((s) => s.trim()).filter(Boolean);
}
function buildDefaultPool(target) {
  const slots = [];
  let i = 0;
  const nextId = () => `s${i++}`;
  slots.push({ id: nextId(), faction: "M\xE9chant", type: "TUEUR", slug: "tueur", locked: true });
  slots.push({
    id: nextId(),
    faction: "Civil",
    type: "PROTECTEUR",
    slug: "majordome",
    locked: true
  });
  slots.push({
    id: nextId(),
    faction: "Civil",
    type: "INVESTIGATION",
    slug: "assistant_du_detective",
    locked: true
  });
  const nAcolytes = acolytesCountFor(target);
  for (let k2 = 0; k2 < nAcolytes; k2++) {
    const t = ACOLYTE_FILL[Math.min(k2, ACOLYTE_FILL.length - 1)];
    slots.push({ id: nextId(), faction: "M\xE9chant", type: t, slug: null });
  }
  const nNeutres = neutresCountFor(target);
  for (let k2 = 0; k2 < nNeutres; k2++) {
    slots.push({
      id: nextId(),
      faction: "Neutre",
      type: NEUTRE_FILL[k2 % NEUTRE_FILL.length],
      slug: null
    });
  }
  let remaining = target - slots.length;
  let k = 0;
  while (remaining > 0) {
    const t = CIVIL_FILL[k % CIVIL_FILL.length];
    slots.push({ id: nextId(), faction: "Civil", type: t, slug: null });
    k++;
    remaining--;
  }
  if (remaining < 0) {
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
function asPoolConfig(value) {
  if (!value || typeof value !== "object") return null;
  const v = value;
  if (typeof v.targetPlayers !== "number" || !Array.isArray(v.slots)) return null;
  return v;
}
var ACOLYTE_FILL, NEUTRE_FILL, CIVIL_FILL;
var init_poolConfig = __esm({
  "src/lib/poolConfig.ts"() {
    "use strict";
    init_constants();
    ACOLYTE_FILL = ["INVESTIGATION", "TROMPERIE/SUPPORT", "TROMPERIE/SUPPORT"];
    NEUTRE_FILL = [
      // 1er neutre : tous types possibles (pondérés à l'exécution : BÉNIN ≫ MAL ≫ CHAOS).
      "MAL/B\xC9NIN/CHAOS",
      // 2ème neutre : tous types possibles aussi, MAIS le moteur force un type différent du 1er.
      "MAL/B\xC9NIN/CHAOS"
    ];
    CIVIL_FILL = [
      "PROTECTEUR",
      "INVESTIGATION",
      "TUEUR",
      "SUPPORT",
      "INVESTIGATION/SUPPORT",
      "PROTECTEUR",
      "TUEUR",
      "INVESTIGATION/SUPPORT"
    ];
  }
});

// src/engine/items.ts
var items_exports = {};
__export(items_exports, {
  ITEM_CATALOG: () => ITEM_CATALOG,
  RELIQUE_CATALOG: () => RELIQUE_CATALOG,
  buildItem: () => buildItem,
  buildRelique: () => buildRelique,
  consumeItem: () => consumeItem,
  grantItem: () => grantItem,
  itemFaction: () => itemFaction,
  itemIsUsable: () => itemIsUsable,
  itemNeedsTarget: () => itemNeedsTarget,
  readInventory: () => readInventory,
  rollRelique: () => rollRelique
});
function itemFaction(item) {
  const stamped = item.payload?.origin_faction;
  if (stamped) return stamped;
  if (item.payload?.mechant_origin === true) return "M\xE9chant";
  if (item.slug === "relique") return "Neutre";
  if (item.slug === "indice") return "Syst\xE8me";
  if (item.received_from && RECEIVED_FROM_FACTION[item.received_from]) {
    return RECEIVED_FROM_FACTION[item.received_from];
  }
  return null;
}
function buildItem(slug, opts = {}) {
  const base = ITEM_CATALOG[slug];
  const payload = opts.originFaction ? { ...opts.payload ?? {}, origin_faction: opts.originFaction } : opts.payload;
  return {
    id: crypto.randomUUID(),
    slug,
    name: opts.nameOverride ?? base.name,
    icon: opts.iconOverride ?? base.icon,
    description: opts.descriptionOverride ?? base.description,
    received_at: (/* @__PURE__ */ new Date()).toISOString(),
    received_from: opts.from,
    payload
  };
}
async function grantItem(playerId, item) {
  const { data: row } = await supabase.from("players").select("role_meta").eq("id", playerId).maybeSingle();
  const meta2 = row?.role_meta ?? {};
  const inv = meta2.inventory ?? [];
  const next = { ...meta2, inventory: [item, ...inv] };
  await supabase.from("players").update({ role_meta: next }).eq("id", playerId);
}
function readInventory(roleMeta) {
  if (!roleMeta) return [];
  return roleMeta.inventory ?? [];
}
function itemNeedsTarget(slug, payload) {
  if (slug === "indice") return "none";
  if (slug === "relique") {
    const v = payload?.variant ?? null;
    return v === "lettre_scellee" || v === "oeil_damnation" ? "single" : "none";
  }
  if (slug === "lettre") {
    const sent = !!payload?.sent;
    return sent ? "none" : "single";
  }
  return "single";
}
function itemIsUsable(slug, payload) {
  if (slug === "indice") return false;
  if (slug === "relique") {
    const v = payload?.variant ?? null;
    return RELIQUES_WITH_EFFECT.has(v ?? "");
  }
  if (slug === "lettre") {
    return !payload?.sent;
  }
  return slug === "fiole_mort" || slug === "fiole_vie" || slug === "fiole_clairvoyance" || slug === "couteau";
}
function rollRelique() {
  const entries = Object.entries(RELIQUE_CATALOG);
  const total = entries.reduce((a, [, v]) => a + v.weight, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v.weight;
    if (r <= 0) return k;
  }
  return entries[0][0];
}
function buildRelique(variant, from = "Manoir") {
  const def = RELIQUE_CATALOG[variant];
  return {
    id: crypto.randomUUID(),
    slug: "relique",
    name: def.name,
    icon: def.icon,
    description: def.description,
    received_at: (/* @__PURE__ */ new Date()).toISOString(),
    received_from: from,
    payload: { variant, origin_faction: "Neutre" }
    // Conservateur
  };
}
async function consumeItem(opts) {
  const { item, target, actorId, gameId, tour } = opts;
  if (!itemIsUsable(item.slug, item.payload))
    return { ok: false, message: "Cet objet n'a pas d'effet actif." };
  if (item.consumed) return { ok: false, message: "Objet d\xE9j\xE0 utilis\xE9." };
  if (itemNeedsTarget(item.slug, item.payload) === "single" && !target)
    return { ok: false, message: "Cible requise" };
  const { data: actorRow } = await supabase.from("players").select("role_meta").eq("id", actorId).maybeSingle();
  const actorMeta = actorRow?.role_meta ?? {};
  const lastItemUseTour = actorMeta.last_item_use_cycle ?? -1;
  if (lastItemUseTour === tour) {
    return { ok: false, message: "Tu as d\xE9j\xE0 utilis\xE9 un objet ce tour-ci." };
  }
  const isApoOwnFiole = (item.slug === "fiole_mort" || item.slug === "fiole_vie" || item.slug === "fiole_clairvoyance") && item.payload?.apo_own === true;
  if (isApoOwnFiole && (actorMeta.fioles_self_used ?? 0) >= 1) {
    return {
      ok: false,
      message: "Tu ne peux garder qu'une seule fiole pour toi \u2014 les autres doivent \xEAtre offertes."
    };
  }
  const notify2 = async (playerId, title, body) => {
    await supabase.from("notifications").insert({ game_id: gameId, player_id: playerId, type: "item_effect", title, body });
  };
  let message = "";
  switch (item.slug) {
    case "lettre": {
      if (!target) {
        message = "Cible requise pour la lettre anonyme.";
        break;
      }
      const raw = String(item.payload?.message ?? "").trim();
      if (!raw) {
        return { ok: false, message: "\xC9cris un message avant d'envoyer." };
      }
      const msg = raw.slice(0, 80);
      const received = buildItem("lettre", {
        from: opts.actorPseudo,
        payload: { message: msg, sent: true, sent_to: target.pseudo, sender: opts.actorPseudo },
        nameOverride: `Lettre de ${opts.actorPseudo}`,
        descriptionOverride: `Une lettre de ${opts.actorPseudo}. Touche-la pour la lire.`
      });
      await grantItem(target.id, received);
      await notify2(
        target.id,
        "\u{1F4E8} Nouvelle lettre",
        `Tu as re\xE7u une lettre de ${opts.actorPseudo}.`
      );
      message = `\u{1F4E8} Lettre envoy\xE9e \xE0 ${target.pseudo}.`;
      item.payload = { ...item.payload ?? {}, message: msg, sent: true, sent_to: target.pseudo };
      break;
    }
    case "fiole_mort": {
      const { submitIntent: submitIntent2 } = await Promise.resolve().then(() => (init_resolver(), resolver_exports));
      await submitIntent2({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target.id,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "item:fiole_mort",
        payload: { kill_reason: "fiole_mort", target_pseudo: target.pseudo }
      });
      message = `${target.pseudo} : intention de mort \u2014 \xE0 l'Annonce.`;
      break;
    }
    case "fiole_vie": {
      const { submitIntent: submitIntent2 } = await Promise.resolve().then(() => (init_resolver(), resolver_exports));
      await submitIntent2({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target.id,
        category: "CURE",
        timing: "DEFERRED",
        source: "item:fiole_vie",
        payload: { target_pseudo: target.pseudo }
      });
      await notify2(
        target.id,
        "\u{1F49A} Soign\xE9",
        "Une fiole de vie te prot\xE8ge pour la prochaine Annonce."
      );
      message = `${target.pseudo} : soin \u2014 \xE0 l'Annonce.`;
      break;
    }
    case "fiole_clairvoyance": {
      const r = target.role_slug ? opts.rolesBySlug.get(target.role_slug) : null;
      message = r ? `${target.pseudo} = faction ${r.faction}` : `${target.pseudo} : faction inconnue`;
      await notify2(actorId, "\u{1F52E} Clairvoyance", message);
      break;
    }
    case "couteau": {
      const { submitIntent: submitIntent2 } = await Promise.resolve().then(() => (init_resolver(), resolver_exports));
      const mechantOrigin = item.payload?.mechant_origin === true;
      let weaponFromSlug = null;
      switch (item.received_from) {
        case "Cuisine":
          weaponFromSlug = "cuisinier";
          break;
        case "Vengeance":
          weaponFromSlug = "vengeur";
          break;
        case "Strat\xE8ge":
          weaponFromSlug = "stratege";
          break;
        case "Inconnu":
          weaponFromSlug = "armurier";
          break;
        default:
          weaponFromSlug = null;
      }
      await submitIntent2({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target.id,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "item:couteau",
        payload: {
          kill_reason: "couteau",
          target_pseudo: target.pseudo,
          mechant_mechanic: mechantOrigin,
          weapon_from_slug: weaponFromSlug
        }
      });
      const giftedById = item.payload?.gifted_by_id;
      if (giftedById) {
        await notify2(
          giftedById,
          "\u{1F52A} Ton couteau a frapp\xE9",
          `${opts.actorPseudo} a utilis\xE9 couteau sur ${target.pseudo}.`
        );
      }
      message = `${target.pseudo} : coup de couteau \u2014 \xE0 l'Annonce.`;
      break;
    }
    case "relique": {
      const variant = item.payload?.variant ?? null;
      const def = variant ? RELIQUE_CATALOG[variant] : null;
      if (variant === "coeur_du_manoir") {
        const { endGameWithWinner: endGameWithWinner2 } = await Promise.resolve().then(() => (init_actions(), actions_exports));
        await endGameWithWinner2(
          gameId,
          "Conservateur",
          `${opts.actorPseudo} a r\xE9v\xE9l\xE9 Le C\u0153ur du Manoir. Le Manoir le reconna\xEEt comme son gardien.`
        );
        message = "\u{1FAC0} Le C\u0153ur du Manoir bat dans tes mains \u2014 toutes les factions s'inclinent. Victoire du Conservateur.";
      } else if (variant === "oeil_damnation") {
        const { data: pool } = await supabase.from("players").select("id, pseudo, role_slug").eq("game_id", gameId).eq("is_alive", true).eq("is_mj", false).neq("id", actorId);
        const list = pool ?? [];
        if (list.length === 0) {
          message = "\u{1F441}\uFE0F Personne d'autre n'est en vie \u2014 l'\u0152il reste aveugle.";
        } else {
          const picked = list[Math.floor(Math.random() * list.length)];
          const r = picked.role_slug ? opts.rolesBySlug.get(picked.role_slug) : null;
          message = `\u{1F441}\uFE0F L'\u0152il de la Damnation s'ouvre : ${picked.pseudo} est ${r ? `${r.icon} ${r.name_fr} (${r.faction})` : "de r\xF4le inconnu"}.`;
        }
        await notify2(actorId, "\u{1F441}\uFE0F L'\u0152il de la Damnation", message);
      } else if (variant === "medaillon_vieux_maitre") {
        const { data: row2 } = await supabase.from("players").select("role_meta").eq("id", actorId).maybeSingle();
        const meta0 = row2?.role_meta ?? {};
        const protUntil = Math.max(meta0.protected_until_cycle ?? -1, tour);
        await supabase.from("players").update({ role_meta: { ...meta0, protected_until_cycle: protUntil } }).eq("id", actorId);
        message = "\u{1F3C5} Le M\xE9daillon du Vieux Ma\xEEtre te prot\xE8ge pour le restant du tour.";
        await notify2(actorId, "\u{1F3C5} M\xE9daillon activ\xE9", message);
      } else if (variant === "lettre_scellee") {
        if (!target) {
          message = "Cible requise pour La Lettre Scell\xE9e.";
          break;
        }
        const { data: row2 } = await supabase.from("players").select("role_meta").eq("id", target.id).maybeSingle();
        const meta0 = row2?.role_meta ?? {};
        const blockUntil = Math.max(meta0.blocked_until_cycle ?? -1, tour);
        await supabase.from("players").update({ role_meta: { ...meta0, blocked_until_cycle: blockUntil } }).eq("id", target.id);
        message = `\u2709\uFE0F La Lettre Scell\xE9e bloque la capacit\xE9 de ${target.pseudo} pour le tour.`;
        await notify2(
          target.id,
          "\u2709\uFE0F Capacit\xE9 scell\xE9e",
          "Une Lettre Scell\xE9e bloque ta capacit\xE9 pour le restant du tour."
        );
        await notify2(actorId, "\u2709\uFE0F Lettre Scell\xE9e utilis\xE9e", message);
      } else {
        message = def ? `${def.icon} ${def.name} r\xE9v\xE9l\xE9e. ${def.description}` : "Relique r\xE9v\xE9l\xE9e.";
        await notify2(actorId, "\u{1F5DD}\uFE0F Relique r\xE9v\xE9l\xE9e", message);
      }
      break;
    }
  }
  const { data: row } = await supabase.from("players").select("role_meta").eq("id", actorId).maybeSingle();
  const meta2 = row?.role_meta ?? {};
  const inv = (meta2.inventory ?? []).map(
    (it) => it.id === item.id ? { ...it, consumed: true, payload: item.payload ?? it.payload } : it
  );
  const apoPatch = {};
  if (isApoOwnFiole) {
    const fioleKey = item.slug === "fiole_vie" ? "heal" : item.slug === "fiole_mort" ? "poison" : "reveal";
    const fu = meta2.flasks_used ?? [];
    apoPatch.flasks_used = fu.includes(fioleKey) ? fu : [...fu, fioleKey];
    apoPatch.fioles_self_used = (meta2.fioles_self_used ?? 0) + 1;
  }
  await supabase.from("players").update({
    role_meta: { ...meta2, inventory: inv, last_item_use_cycle: tour, ...apoPatch }
  }).eq("id", actorId);
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: actorId,
    tour,
    phase: "free",
    target_player_id: target?.id ?? null,
    // `object_capacity` : le couteau du Cuisinier EST sa capacité de rôle exprimée
    // sous forme d'objet → l'historique l'étiquette « Objet · Capacité ».
    payload: {
      item: item.slug,
      name: item.name,
      origin_faction: itemFaction(item),
      object_capacity: item.received_from === "Cuisine"
    },
    result: { message }
  });
  return { ok: true, message };
}
var RECEIVED_FROM_FACTION, ITEM_CATALOG, RELIQUE_CATALOG, RELIQUES_WITH_EFFECT;
var init_items = __esm({
  "src/engine/items.ts"() {
    "use strict";
    init_client();
    RECEIVED_FROM_FACTION = {
      Cuisine: "Civil",
      Vengeance: "Civil",
      Apothicairerie: "Civil",
      Apothicaire: "Civil",
      Strat\u00E8ge: "M\xE9chant",
      Inconnu: "M\xE9chant"
    };
    ITEM_CATALOG = {
      fiole_mort: {
        slug: "fiole_mort",
        name: "Fiole de mort",
        icon: "\u2620\uFE0F",
        description: "Donne la mort \xE0 une cible : elle mourra \xE0 la prochaine Annonce, sans laisser de trace de poison."
      },
      fiole_vie: {
        slug: "fiole_vie",
        name: "Fiole de vie",
        icon: "\u{1F49A}",
        description: "Prot\xE8ge une cible jusqu'\xE0 la prochaine Annonce."
      },
      fiole_clairvoyance: {
        slug: "fiole_clairvoyance",
        name: "Fiole de clairvoyance",
        icon: "\u{1F52E}",
        description: "R\xE9v\xE8le la faction d'une cible."
      },
      couteau: {
        slug: "couteau",
        name: "Couteau",
        icon: "\u{1F52A}",
        description: "Tue silencieusement une cible. Utilisable une seule fois."
      },
      lettre: {
        slug: "lettre",
        name: "Lettre anonyme",
        icon: "\u{1F4E8}",
        description: "Une lettre anonyme t'a \xE9t\xE9 remise."
      },
      relique: {
        slug: "relique",
        name: "Relique",
        icon: "\u{1F5DD}\uFE0F",
        description: "Une relique myst\xE9rieuse."
      },
      indice: {
        slug: "indice",
        name: "Indice",
        icon: "\u{1F9E9}",
        description: "Une information vraie sur cette partie. Consultation seule."
      }
    };
    RELIQUE_CATALOG = {
      coeur_du_manoir: {
        name: "Le C\u0153ur du Manoir",
        icon: "\u{1FAC0}",
        weight: 5,
        effect: "special_win",
        description: "Relique ultime \u2014 si tu la r\xE9v\xE8les, le Conservateur remporte la partie. Tout le monde perd."
      },
      oeil_damnation: {
        name: "L'\u0152il de la Damnation",
        icon: "\u{1F441}\uFE0F",
        weight: 4,
        effect: "reveal_random",
        description: "R\xE9v\xE8le le r\xF4le d'un joueur au hasard."
      },
      medaillon_vieux_maitre: {
        name: "Le M\xE9daillon du Vieux Ma\xEEtre",
        icon: "\u{1F3C5}",
        weight: 4,
        effect: "protect_self",
        description: "Te prot\xE8ge pendant 1 tour entier."
      },
      lettre_scellee: {
        name: "La Lettre Scell\xE9e",
        icon: "\u2709\uFE0F",
        weight: 4,
        effect: "block_target",
        description: "Bloque la capacit\xE9 d'un joueur cibl\xE9 pendant 1 tour."
      },
      miroir_minuit: {
        name: "Le Miroir de Minuit",
        icon: "\u{1FA9E}",
        weight: 10,
        description: "Un reflet glac\xE9, sans pouvoir. Pure beaut\xE9 maudite."
      },
      clef_aile_interdite: {
        name: "La Cl\xE9 de l'Aile Interdite",
        icon: "\u{1F5DD}\uFE0F",
        weight: 12,
        description: "Elle n'ouvre plus rien \u2014 ou alors plus rien d'utile."
      },
      poupee_grenier: {
        name: "La poup\xE9e du grenier",
        icon: "\u{1FA86}",
        weight: 14,
        description: "Elle te regarde fixement. Aucune capacit\xE9."
      },
      lettre_oubliee: {
        name: "La Lettre Oubli\xE9e",
        icon: "\u{1F4DC}",
        weight: 16,
        description: "Une lettre jamais lue, jamais envoy\xE9e. Aucun effet."
      },
      portrait_dame_blanche: {
        name: "Le Portrait de la Dame Blanche",
        icon: "\u{1F5BC}\uFE0F",
        weight: 17.5,
        description: "Son regard te suit. C'est tout."
      },
      bougie_des_ames: {
        name: "La Bougie des \xC2mes",
        icon: "\u{1F56F}\uFE0F",
        weight: 13.5,
        description: "Sa flamme vacille \u2014 sans r\xE9elle utilit\xE9."
      }
    };
    RELIQUES_WITH_EFFECT = /* @__PURE__ */ new Set([
      "coeur_du_manoir",
      "oeil_damnation",
      "medaillon_vieux_maitre",
      "lettre_scellee"
    ]);
  }
});

// src/engine/indices.ts
var indices_exports = {};
__export(indices_exports, {
  distributeIndices: () => distributeIndices,
  indiceCount: () => indiceCount
});
function indiceCount(playerCount) {
  return Math.min(4, Math.max(2, Math.round(playerCount / 3)));
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function factionLabel(f) {
  return f === "M\xE9chant" ? "M\xE9chants" : f === "Neutre" ? "Neutres" : "Civils";
}
function buildSimpleClues(roster) {
  const clues = [];
  const mechants = roster.filter((r) => r.faction === "M\xE9chant");
  const neutres = roster.filter((r) => r.faction === "Neutre");
  const civils = roster.filter((r) => r.faction === "Civil");
  if (mechants.some((r) => r.type === "INVESTIGATION"))
    clues.push("Le camp m\xE9chant compte un r\xF4le d'Investigation.");
  if (mechants.some((r) => r.type === "TROMPERIE"))
    clues.push("Au moins un r\xF4le de Tromperie se cache c\xF4t\xE9 m\xE9chant.");
  for (const r of mechants) {
    if (ALWAYS_PRESENT.has(r.slug)) continue;
    clues.push(`${r.name_fr} est en jeu cette partie.`);
  }
  for (const r of neutres) {
    if (r.slug === "vampire") continue;
    clues.push(`${r.name_fr} est en jeu cette partie.`);
  }
  for (const r of civils) {
    if (ALWAYS_PRESENT.has(r.slug)) continue;
    if (POWER_CIVILS.has(r.slug)) clues.push(`${r.name_fr} est en jeu c\xF4t\xE9 ville.`);
  }
  if (civils.filter((r) => r.type === "INVESTIGATION").length >= 2)
    clues.push("La ville compte 2 enqu\xEAteurs ou plus.");
  if (civils.filter((r) => r.type === "PROTECTEUR").length >= 2)
    clues.push("Un second protecteur veille, en plus du Majordome.");
  if (civils.some((r) => r.slug === "saint"))
    clues.push("Un r\xF4le fait perdre la ville s'il est emprisonn\xE9 au vote.");
  if (!roster.some((r) => r.type === "TROMPERIE"))
    clues.push("Aucun r\xF4le de Tromperie : personne ne ment sur son r\xF4le.");
  if (!mechants.some((r) => r.type === "INVESTIGATION"))
    clues.push("Le camp m\xE9chant agit sans espion.");
  return clues;
}
function buildFragment(alive, rolesBySlug) {
  const withRole = alive.filter((p) => p.role_slug && rolesBySlug.get(p.role_slug));
  if (withRole.length < 2) return null;
  const roleOf = (p) => rolesBySlug.get(p.role_slug);
  const makers = [
    // rôle exact (jamais le Tueur : révéler son identité est écarté par design)
    () => {
      const pool = withRole.filter((p) => p.role_slug !== "tueur");
      if (!pool.length) return null;
      const x = pick(pool);
      return { subjects: [x.id], halfA: `${x.pseudo} est\u2026`, halfB: `\u2026${roleOf(x).name_fr}.` };
    },
    // camp
    () => {
      const x = pick(withRole);
      return {
        subjects: [x.id],
        halfA: `${x.pseudo} appartient au camp\u2026`,
        halfB: `\u2026des ${factionLabel(roleOf(x).faction)}.`
      };
    },
    // même camp
    () => {
      const x = pick(withRole);
      const same = withRole.filter((p) => p.id !== x.id && roleOf(p).faction === roleOf(x).faction);
      if (!same.length) return null;
      const y = pick(same);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} servent\u2026`,
        halfB: "\u2026le m\xEAme camp."
      };
    },
    // pas le même camp
    () => {
      const x = pick(withRole);
      const diff = withRole.filter((p) => p.id !== x.id && roleOf(p).faction !== roleOf(x).faction);
      if (!diff.length) return null;
      const y = pick(diff);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} ne sont\u2026`,
        halfB: "\u2026pas dans le m\xEAme camp."
      };
    },
    // même type de rôle
    () => {
      const x = pick(withRole);
      const same = withRole.filter(
        (p) => p.id !== x.id && roleOf(p).type && roleOf(p).type === roleOf(x).type
      );
      if (!same.length) return null;
      const y = pick(same);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} ont\u2026`,
        halfB: "\u2026le m\xEAme type de r\xF4le."
      };
    },
    // arme → porteur (Cuisinier / Stratège ont un couteau au setup)
    () => {
      const armed = withRole.filter(
        (p) => p.role_slug === "cuisinier" || p.role_slug === "stratege"
      );
      if (!armed.length) return null;
      const x = pick(armed);
      return {
        subjects: [x.id],
        halfA: "Celui qui d\xE9tient une\u2026",
        halfB: `\u2026arme, c'est ${x.pseudo}.`
      };
    }
  ];
  for (const make of shuffle(makers)) {
    const r = make();
    if (r) return r;
  }
  return null;
}
function distributeIndices(alive, rolesBySlug) {
  if (alive.length === 0) return [];
  const roster = alive.map((p) => p.role_slug ? rolesBySlug.get(p.role_slug) : null).filter((r) => !!r);
  const count = indiceCount(alive.length);
  const grants = [];
  const used = /* @__PURE__ */ new Set();
  let remaining = count;
  if (count >= 2 && Math.random() < FRAGMENT_CHANCE) {
    const frag = buildFragment(alive, rolesBySlug);
    if (frag) {
      const holders = shuffle(alive.filter((p) => !frag.subjects.includes(p.id))).slice(0, 2);
      if (holders.length === 2) {
        grants.push({
          playerId: holders[0].id,
          name: "Indice \u2014 Lettre d\xE9chir\xE9e",
          icon: "\u{1F4DC}",
          text: frag.halfA,
          fragment: true,
          half: "A"
        });
        grants.push({
          playerId: holders[1].id,
          name: "Indice \u2014 Lettre d\xE9chir\xE9e",
          icon: "\u{1F4DC}",
          text: frag.halfB,
          fragment: true,
          half: "B"
        });
        used.add(holders[0].id);
        used.add(holders[1].id);
        remaining -= 2;
      }
    }
  }
  const clues = shuffle(buildSimpleClues(roster));
  const props = shuffle(INDICE_PROPS);
  const candidates = shuffle(alive.filter((p) => !used.has(p.id)));
  for (let i = 0; i < remaining && i < candidates.length && i < clues.length; i++) {
    grants.push({
      playerId: candidates[i].id,
      name: `Indice \u2014 ${props[i % props.length]}`,
      icon: "\u{1F50D}",
      text: clues[i]
    });
  }
  return grants;
}
var INDICE_PROPS, FRAGMENT_CHANCE, ALWAYS_PRESENT, POWER_CIVILS;
var init_indices = __esm({
  "src/engine/indices.ts"() {
    "use strict";
    INDICE_PROPS = [
      "Note manuscrite",
      "Coupure de presse",
      "Photographie",
      "Carnet noirci",
      "T\xE9l\xE9gramme",
      "Page arrach\xE9e",
      "Carte de visite",
      "Re\xE7u froiss\xE9",
      "Pli cachet\xE9",
      "Bristol griffonn\xE9"
    ];
    FRAGMENT_CHANCE = 0.4;
    ALWAYS_PRESENT = /* @__PURE__ */ new Set(["tueur", "majordome", "assistant_du_detective", "executeur"]);
    POWER_CIVILS = /* @__PURE__ */ new Set([
      "policier",
      "medium",
      "medecin_legiste",
      "vengeur",
      "cuisinier",
      "juge",
      "guetteur",
      "boussole",
      "facteur"
    ]);
  }
});

// src/engine/actions.ts
var actions_exports = {};
__export(actions_exports, {
  PHASE_DURATIONS: () => PHASE_DURATIONS,
  SCHEDULES_NEXT_TOUR: () => SCHEDULES_NEXT_TOUR,
  addBotPlayer: () => addBotPlayer,
  addBotPlayers: () => addBotPlayers,
  allowedActivePhases: () => allowedActivePhases,
  beginGame: () => beginGame,
  cancelVote: () => cancelVote,
  castVote: () => castVote,
  closeVote: () => closeVote,
  drawRoles: () => drawRoles,
  endGameWithWinner: () => endGameWithWinner,
  executeCapability: () => executeCapability,
  imprisonPlayer: () => imprisonPlayer,
  killPlayer: () => killPlayer,
  logCapability: () => logCapability,
  nextCycle: () => nextCycle,
  onEngineEvent: () => onEngineEvent,
  openGathering: () => openGathering,
  openVote: () => openVote,
  parseTotalLimit: () => parseTotalLimit,
  policierVerdict: () => policierVerdict,
  releasePlayer: () => releasePlayer,
  resetGame: () => resetGame,
  ringGathering: () => ringGathering,
  rollRoles: () => rollRoles,
  setForcedFrame: () => setForcedFrame,
  setPaused: () => setPaused,
  setPhase: () => setPhase,
  setTestament: () => setTestament,
  startGame: () => startGame,
  tallySuspicionVote: () => tallySuspicionVote,
  tallyVote: () => tallyVote,
  tickPhase: () => tickPhase,
  tryBlessingBlock: () => tryBlessingBlock,
  usesOf: () => usesOf,
  whyCannotUse: () => whyCannotUse
});
function onEngineEvent(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function emit(kind, message, meta2) {
  const e = { ts: Date.now(), kind, message, meta: meta2 };
  listeners.forEach((l) => l(e));
}
function keepCosmeticMeta(rm) {
  const av = rm?.avatar;
  return typeof av === "string" ? { avatar: av } : {};
}
async function patchMeta(playerId, patch) {
  const { data } = await supabase.from("players").select("role_meta").eq("id", playerId).single();
  const cur = meta(data);
  const next = { ...cur, ...patch };
  await supabase.from("players").update({ role_meta: next }).eq("id", playerId);
  return next;
}
function isHostileRole(role) {
  if (role.is_hostile != null) return role.is_hostile;
  if (role.faction === "M\xE9chant") return true;
  if (role.faction === "Neutre" && (role.type === "MAL" || role.type === "CHAOS")) return true;
  return false;
}
function isKillerClass(r) {
  if (r.is_killer_class != null) return r.is_killer_class;
  return r.faction === "M\xE9chant" && r.type === "TUEUR";
}
function isBlessActive(targetMeta, tour, phase) {
  if (targetMeta.blessed_by_saint !== true) return false;
  const until = targetMeta.blessed_until_cycle ?? -1;
  const untilPhase = targetMeta.blessed_until_phase ?? "vote";
  if (tour < until) return true;
  if (tour === until && (PHASE_IDX[phase] ?? 99) <= (PHASE_IDX[untilPhase] ?? -1)) return true;
  return false;
}
async function tryBlessingBlock(opts) {
  if (!isHostileRole(opts.actorRole)) return false;
  const tm = meta({ role_meta: opts.target.role_meta });
  if (!isBlessActive(tm, opts.tour, opts.phase)) return false;
  const saintId = tm.blessed_by_saint_id;
  if (saintId) {
    await notify({
      gameId: opts.gameId,
      playerId: saintId,
      type: "saint_block_log",
      title: "\u2728 B\xE9n\xE9diction active",
      body: `${opts.actor.pseudo} a tent\xE9 \xAB ${opts.actionLabel} \xBB sur ${opts.target.pseudo} \u2014 action annul\xE9e.`,
      payload: {
        actor_id: opts.actor.id,
        actor_pseudo: opts.actor.pseudo,
        target_id: opts.target.id,
        target_pseudo: opts.target.pseudo,
        action: opts.actionLabel,
        tour: opts.tour,
        phase: opts.phase
      }
    });
  }
  await notify({
    gameId: opts.gameId,
    playerId: opts.actor.id,
    type: "saint_block",
    title: "\u2728 Cible b\xE9nite",
    body: `${opts.target.pseudo} est sous b\xE9n\xE9diction \u2014 ton action ne fonctionne pas.`
  });
  return true;
}
function usesOf(m, slug) {
  const u = m.uses ?? {};
  return u[slug] ?? 0;
}
function lastUseOf(m, slug) {
  const l = m.last_use ?? {};
  return l[slug] ?? -99;
}
function parseTotalLimit(role, playerCount) {
  const lbl = role.usage_label ?? "";
  if (role.slug === "cleaner") return playerCount >= 10 ? 2 : 1;
  if (role.slug === "mouchard") return 1;
  if (/1×\/partie/i.test(lbl)) return 1;
  const maxMatch = lbl.match(/max\s*(\d+)/i);
  if (maxMatch) return parseInt(maxMatch[1], 10);
  if (role.slug === "apothicaire") return 2;
  if (role.slug === "executeur" || role.slug === "juge") {
    if (playerCount <= 10) return 1;
    if (playerCount <= 13) return 2;
    return 3;
  }
  return Infinity;
}
function isPerCycle(role) {
  return /\/\s*(tour|phase\s*libre|rassemblement|enqu[eê]te|d[eé]bat)/i.test(
    role.usage_label ?? ""
  );
}
function cooldownCycles(role) {
  const lbl = (role.usage_label ?? "") + " " + (role.capacite_full_text ?? "");
  const m = lbl.match(/cooldown\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/1×\s*\/\s*2\s*tours/i.test(role.usage_label ?? "")) return 2;
  if (role.slug === "marionnettiste") return 0;
  return 0;
}
function allowedActivePhases(_role) {
  return /* @__PURE__ */ new Set(["free"]);
}
function isFalsified(m) {
  return m?.falsified === true;
}
function apparentSlug(slug, m) {
  const cover = m?.cover_slug;
  return typeof cover === "string" ? cover : slug ?? "";
}
function apparentFaction(slug, m, rolesBySlug) {
  const cover = m?.cover_slug;
  if (typeof cover === "string") return rolesBySlug.get(cover)?.faction;
  const role = rolesBySlug.get(slug ?? "");
  if (role && isKillerClass(role)) return "Civil";
  return role?.faction;
}
function policierVerdict(role, override) {
  if (override) return override;
  if (!role) return "na";
  if (role.faction === "Civil") return "innocent";
  if (role.faction === "Neutre") return "suspicious";
  if (role.faction === "M\xE9chant") {
    return isKillerClass(role) ? "innocent" : "suspicious";
  }
  return "na";
}
function perCycleLimit(role) {
  if (role.slug === "conservateur") return 2;
  const m = (role.usage_label ?? "").match(/(\d+)\s*×\s*\/\s*(tour|phase\s*libre|enqu[eê]te)/i);
  if (m) return parseInt(m[1], 10);
  return 1;
}
function whyCannotUse(role, m, tour, playerCount, phase) {
  if ((m.blackmail_until_cycle ?? -1) >= tour && (m.blackmail_from_cycle ?? -Infinity) <= tour)
    return "Sous chantage";
  if ((m.blocked_until_cycle ?? -1) >= tour && (m.blocked_from_cycle ?? -Infinity) <= tour)
    return "Capacit\xE9 bloqu\xE9e";
  if (phase && !allowedActivePhases(role).has(phase)) {
    return "\xC0 utiliser en Enqu\xEAte";
  }
  const total = parseTotalLimit(role, playerCount);
  if (usesOf(m, role.slug) >= total) return "Capacit\xE9 \xE9puis\xE9e";
  const cd = cooldownCycles(role);
  if (cd > 0 && tour - lastUseOf(m, role.slug) < cd) return "En cooldown";
  if (isPerCycle(role)) {
    const limit = perCycleLimit(role);
    const counts = m.used_cycle_count ?? {};
    const entry = counts[role.slug];
    const usedNow = entry && entry.tour === tour ? entry.count : 0;
    if (usedNow >= limit)
      return limit > 1 ? `D\xE9j\xE0 utilis\xE9 ${limit}\xD7 ce tour` : "D\xE9j\xE0 utilis\xE9 ce tour";
  }
  return null;
}
async function markUsage(actor, role, tour) {
  const m = meta(actor);
  const uses = { ...m.uses ?? {} };
  uses[role.slug] = (uses[role.slug] ?? 0) + 1;
  const last_use = { ...m.last_use ?? {} };
  last_use[role.slug] = tour;
  const used_cycle = { ...m.used_cycle ?? {} };
  used_cycle[role.slug] = tour;
  const used_cycle_count = {
    ...m.used_cycle_count ?? {}
  };
  const prev = used_cycle_count[role.slug];
  used_cycle_count[role.slug] = prev && prev.tour === tour ? { tour, count: prev.count + 1 } : { tour, count: 1 };
  await patchMeta(actor.id, { uses, last_use, used_cycle, used_cycle_count });
}
function shuffle2(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedDraw(pool, count) {
  const picked = [];
  const remaining = [...pool];
  for (let k = 0; k < count && remaining.length > 0; k++) {
    const total = remaining.reduce((s, r) => s + (Number(r.draw_weight ?? 1) || 1e-4), 0);
    let t = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      t -= Number(remaining[i].draw_weight ?? 1) || 1e-4;
      if (t <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}
function drawByQuotas(pool, quotas, totalSlots, preCounted = {}) {
  const byType = /* @__PURE__ */ new Map();
  for (const r of pool) {
    const t = r.type ?? "AUTRE";
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(r);
  }
  const picked = [];
  const countByType = { ...preCounted };
  for (const [type, q] of Object.entries(quotas)) {
    const bucket = byType.get(type) ?? [];
    const need = Math.min(
      Math.max(0, q.min - (countByType[type] ?? 0)),
      bucket.length,
      totalSlots - picked.length
    );
    if (need <= 0) continue;
    const drawn = weightedDraw(bucket, need);
    picked.push(...drawn);
    countByType[type] = (countByType[type] ?? 0) + drawn.length;
    for (const r of drawn) {
      const i = bucket.indexOf(r);
      if (i >= 0) bucket.splice(i, 1);
    }
  }
  while (picked.length < totalSlots) {
    const candidates = [];
    for (const [type, bucket2] of byType.entries()) {
      const q = quotas[type];
      const max = q?.max ?? 0;
      if ((countByType[type] ?? 0) >= max) continue;
      candidates.push(...bucket2);
    }
    if (candidates.length === 0) break;
    const [r] = weightedDraw(candidates, 1);
    if (!r) break;
    picked.push(r);
    countByType[r.type ?? "AUTRE"] = (countByType[r.type ?? "AUTRE"] ?? 0) + 1;
    const bucket = byType.get(r.type ?? "AUTRE");
    if (bucket) {
      const i = bucket.indexOf(r);
      if (i >= 0) bucket.splice(i, 1);
    }
  }
  return picked;
}
function drawNeutresByTypeWeights(pool, count, typeWeights) {
  const byType = /* @__PURE__ */ new Map();
  for (const r of pool) {
    const t = r.type ?? "AUTRE";
    if (!(t in typeWeights)) continue;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(r);
  }
  const picked = [];
  for (let k = 0; k < count; k++) {
    const availableTypes = [...byType.entries()].filter(([, b]) => b.length > 0);
    if (availableTypes.length === 0) break;
    const total = availableTypes.reduce((s, [t2]) => s + (typeWeights[t2] ?? 0), 0);
    if (total <= 0) break;
    let t = Math.random() * total;
    let chosenType = availableTypes[0][0];
    for (const [type] of availableTypes) {
      t -= typeWeights[type] ?? 0;
      if (t <= 0) {
        chosenType = type;
        break;
      }
    }
    const bucket = byType.get(chosenType);
    const [r] = weightedDraw(bucket, 1);
    if (!r) break;
    picked.push(r);
    byType.delete(chosenType);
  }
  return picked;
}
async function drawRoles(playerCount, modeDetectivePlayer, bannedSlugs = []) {
  const { acolyteQuotasFor: acolyteQuotasFor2, civilQuotasFor: civilQuotasFor2, acolytesCountFor: acolytesCountFor2, neutresCountFor: neutresCountFor2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const { data: rolesData, error } = await supabase.from("roles").select("*").eq("set_id", "set1").eq("emergent", false).eq("is_disabled", false);
  if (error) throw error;
  const roles = rolesData ?? [];
  const banned = new Set(bannedSlugs);
  banned.delete("tueur");
  banned.delete("majordome");
  banned.delete("assistant_du_detective");
  void modeDetectivePlayer;
  const eligible = roles.filter((r) => (r.min_players ?? 6) <= playerCount && !banned.has(r.slug));
  const slugs = [];
  const tueurs = eligible.filter((r) => r.faction === "M\xE9chant" && isKillerClass(r));
  if (tueurs.length === 0) throw new Error("Aucun Tueur disponible (seed roles).");
  const [leTueur] = weightedDraw(tueurs, 1);
  slugs.push(leTueur.slug);
  const assistant = roles.find((r) => r.slug === "assistant_du_detective");
  if (assistant && !slugs.includes(assistant.slug)) slugs.push(assistant.slug);
  const majordome = roles.find((r) => r.slug === "majordome");
  if (majordome && !slugs.includes(majordome.slug)) slugs.push(majordome.slug);
  const nAcolytes = acolytesCountFor2(playerCount);
  const acolytePool = eligible.filter(
    (r) => r.faction === "M\xE9chant" && !isKillerClass(r) && !slugs.includes(r.slug)
  );
  const acolytePicked = drawByQuotas(acolytePool, acolyteQuotasFor2(playerCount), nAcolytes);
  slugs.push(...acolytePicked.map((r) => r.slug));
  const nNeutres = neutresCountFor2(playerCount);
  const { NEUTRE_TYPE_WEIGHTS: NEUTRE_TYPE_WEIGHTS2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const neutresPool = eligible.filter(
    (r) => r.faction === "Neutre" && r.slug !== "chasseur_de_vampire" && !slugs.includes(r.slug)
  );
  const neutresPicked = drawNeutresByTypeWeights(neutresPool, nNeutres, NEUTRE_TYPE_WEIGHTS2);
  const neutresSlugs = neutresPicked.map((r) => r.slug);
  slugs.push(...neutresSlugs);
  const remaining = playerCount - slugs.length;
  const civilPool = eligible.filter((r) => r.faction === "Civil" && !slugs.includes(r.slug));
  const baseCivilTypes = {};
  for (const s of slugs) {
    const r = roles.find((rr) => rr.slug === s);
    if (r?.faction === "Civil" && r.type)
      baseCivilTypes[r.type] = (baseCivilTypes[r.type] ?? 0) + 1;
  }
  const civilPicked = drawByQuotas(
    civilPool,
    civilQuotasFor2(playerCount),
    remaining,
    baseCivilTypes
  );
  const civilSlugs = civilPicked.map((r) => r.slug);
  slugs.push(...civilSlugs);
  if (slugs.length < playerCount) {
    const fallback = civilPool.filter((r) => !slugs.includes(r.slug));
    slugs.push(...weightedDraw(fallback, playerCount - slugs.length).map((r) => r.slug));
  }
  return shuffle2(slugs);
}
async function rollRoles(gameId) {
  const { data: g, error: gErr } = await supabase.from("games").select().eq("id", gameId).single();
  if (gErr) throw gErr;
  const game = g;
  const { data: ps, error: pErr } = await supabase.from("players").select().eq("game_id", gameId).order("joined_at", { ascending: true });
  if (pErr) throw pErr;
  const players = ps ?? [];
  const drawablePlayers = game.mode_detective_player ? players : players.filter((p) => !p.is_mj);
  const manuallyAssigned = drawablePlayers.filter((p) => p.role_slug);
  const unassigned = drawablePlayers.filter((p) => !p.role_slug);
  const bannedSlugs = game.banned_roles ?? [];
  const allBanned = [
    ...bannedSlugs,
    ...manuallyAssigned.map((p) => p.role_slug).filter((s) => !!s)
  ];
  let drawnSlugs = [];
  if (unassigned.length > 0) {
    const { asPoolConfig: asPoolConfig2 } = await Promise.resolve().then(() => (init_poolConfig(), poolConfig_exports));
    const cfg = asPoolConfig2(game.pool_config);
    if (cfg && cfg.slots.length > 0) {
      const { data: rolesData } = await supabase.from("roles").select("*").eq("set_id", "set1").eq("emergent", false);
      const allRoles = rolesData ?? [];
      const bannedSet = new Set(allBanned);
      bannedSet.delete("tueur");
      bannedSet.delete("assistant_du_detective");
      bannedSet.delete("majordome");
      const usedSlugs = new Set(manuallyAssigned.map((p) => p.role_slug));
      const slots = shuffle2([...cfg.slots]);
      const picked = [];
      for (const slot of slots) {
        if (picked.length >= unassigned.length) break;
        if (slot.slug && !usedSlugs.has(slot.slug) && !bannedSet.has(slot.slug)) {
          picked.push(slot.slug);
          usedSlugs.add(slot.slug);
        }
      }
      const { expandSlotTypes: expandSlotTypes2 } = await Promise.resolve().then(() => (init_poolConfig(), poolConfig_exports));
      for (const slot of slots) {
        if (picked.length >= unassigned.length) break;
        if (slot.slug) continue;
        const acceptedTypes = expandSlotTypes2(slot.type);
        const pool = allRoles.filter(
          (r) => r.faction === slot.faction && acceptedTypes.includes(r.type) && !usedSlugs.has(r.slug) && !bannedSet.has(r.slug) && (r.min_players ?? 6) <= unassigned.length
        );
        const [chosen] = weightedDraw(pool, 1);
        if (chosen) {
          picked.push(chosen.slug);
          usedSlugs.add(chosen.slug);
        }
      }
      if (picked.length < unassigned.length) {
        const extra = await drawRoles(
          unassigned.length - picked.length,
          game.mode_detective_player,
          [...allBanned, ...picked]
        );
        picked.push(...extra);
      }
      drawnSlugs = shuffle2(picked).slice(0, unassigned.length);
    } else {
      drawnSlugs = await drawRoles(unassigned.length, game.mode_detective_player, allBanned);
    }
    for (let i = 0; i < unassigned.length; i++) {
      await supabase.from("players").update({
        role_slug: drawnSlugs[i],
        is_alive: true,
        is_imprisoned: false,
        role_meta: keepCosmeticMeta(unassigned[i].role_meta)
      }).eq("id", unassigned[i].id);
    }
  }
  for (const p of manuallyAssigned) {
    await supabase.from("players").update({
      is_alive: true,
      is_imprisoned: false,
      role_meta: keepCosmeticMeta(p.role_meta)
    }).eq("id", p.id);
  }
  emit(
    "roll",
    `\u{1F3B2} R\xF4les tir\xE9s \u2014 ${drawablePlayers.length} joueurs (${manuallyAssigned.length} manuels)`,
    { gameId, slugs: drawnSlugs }
  );
  return drawnSlugs;
}
async function startGame(gameId) {
  const { data: g, error: gErr } = await supabase.from("games").select().eq("id", gameId).single();
  if (gErr) throw gErr;
  const game = g;
  const { data: ps, error: pErr } = await supabase.from("players").select().eq("game_id", gameId).order("joined_at", { ascending: true });
  if (pErr) throw pErr;
  const players = ps ?? [];
  const drawablePlayers = game.mode_detective_player ? players : players.filter((p) => !p.is_mj);
  const allHaveRole = drawablePlayers.length > 0 && drawablePlayers.every((p) => !!p.role_slug);
  if (!allHaveRole) {
    await rollRoles(gameId);
  }
  const freeDur = await phaseDurationFor(gameId, "free");
  await supabase.from("games").update({
    status: "awaiting_players",
    current_phase: "free",
    current_tour: 1,
    started_at: null,
    phase_started_at: null,
    phase_duration_s: freeDur
  }).eq("id", gameId);
  await applySetupEffects(gameId);
  emit("game_started", `R\xF4les distribu\xE9s \u2014 en attente des joueurs (${drawablePlayers.length})`, {
    gameId
  });
}
async function beginGame(gameId) {
  const { data } = await supabase.from("games").update({
    status: "in_progress",
    started_at: (/* @__PURE__ */ new Date()).toISOString(),
    phase_started_at: serverNowISO()
  }).eq("id", gameId).eq("status", "awaiting_players").select("id");
  const flipped = (data ?? []).length > 0;
  if (flipped) emit("game_begin", "Partie commenc\xE9e \u2014 tout le monde est entr\xE9", { gameId });
  return flipped;
}
async function phaseDurationFor(gameId, phase) {
  if (phase === "lobby" || phase === "ended") return 0;
  const { data } = await supabase.from("games").select("phase_duration_free_s, phase_duration_gathering_s, phase_duration_vote_s").eq("id", gameId).maybeSingle();
  const row = data ?? {};
  if (phase === "free") return row.phase_duration_free_s ?? PHASE_DURATIONS.free;
  if (phase === "gathering") return row.phase_duration_gathering_s ?? PHASE_DURATIONS.gathering;
  if (phase === "vote") return row.phase_duration_vote_s ?? PHASE_DURATIONS.vote;
  return PHASE_DURATIONS[phase];
}
async function applySetupEffects(gameId) {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const players = ps ?? [];
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r of rs ?? []) rolesBySlug.set(r.slug, r);
  const alive = players.filter((p) => p.is_alive && !p.is_mj);
  const ofSlug = (s) => alive.find((p) => p.role_slug === s);
  const allSlugs = new Set(alive.map((p) => p.role_slug ?? ""));
  const logSetup = async (actorId, summary, opts) => {
    await supabase.from("role_actions").insert({
      game_id: gameId,
      actor_player_id: actorId,
      tour: 1,
      phase: "free",
      target_player_id: opts?.targetId ?? null,
      target_player_id_2: opts?.target2Id ?? null,
      payload: { effect: opts?.effect ?? "setup_info", setup: true },
      result: { summary }
    });
  };
  {
    const { grantItem: grantItem3, buildItem: buildItem3 } = await Promise.resolve().then(() => (init_items(), items_exports));
    const { distributeIndices: distributeIndices2 } = await Promise.resolve().then(() => (init_indices(), indices_exports));
    const grants = distributeIndices2(alive, rolesBySlug);
    for (const g of grants) {
      await grantItem3(
        g.playerId,
        buildItem3("indice", {
          from: "Manoir",
          originFaction: "Syst\xE8me",
          // distribué par le jeu au setup, pas par un rôle
          nameOverride: g.name,
          descriptionOverride: g.text,
          iconOverride: g.icon,
          payload: { indice: true, fragment: g.fragment ?? false, half: g.half ?? null }
        })
      );
      const who = alive.find((p) => p.id === g.playerId)?.pseudo ?? "?";
      await notify({
        gameId,
        playerId: g.playerId,
        type: "indice_setup",
        title: "\u{1F9E9} Indice re\xE7u",
        body: "Tu as re\xE7u un indice. Consulte-le dans ton inventaire.",
        mjTitle: "\u{1F9E9} Indice",
        mjBody: `${who} a re\xE7u un indice${g.fragment ? " (fragment)" : ""}.`
      });
      await logSetup(g.playerId, g.text, { effect: "indice_setup" });
    }
  }
  const temoin = ofSlug("temoin");
  if (temoin) {
    const civils = alive.filter((p) => {
      if (p.id === temoin.id) return false;
      const r = rolesBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil";
    });
    const pick2 = civils[Math.floor(Math.random() * civils.length)];
    if (pick2) {
      const r = rolesBySlug.get(pick2.role_slug ?? "");
      const body = `Tu reconnais ${pick2.pseudo} : ${r?.icon ?? ""} ${r?.name_fr ?? ""}`;
      await notify({
        gameId,
        playerId: temoin.id,
        type: "temoin_reveal",
        title: "\u{1F441}\uFE0F T\xE9moin",
        body,
        mjTitle: "\u{1F441}\uFE0F T\xE9moin",
        mjBody: `${temoin.pseudo} reconna\xEEt ${pick2.pseudo} (${r?.icon ?? ""} ${r?.name_fr ?? ""}).`
      });
      await logSetup(temoin.id, body, { targetId: pick2.id, effect: "temoin_reveal" });
    }
  }
  const entremetteur = ofSlug("entremetteur");
  if (entremetteur) {
    await patchMeta(entremetteur.id, { pending_link_choice: true, linked_pair: null });
    await notify({
      gameId,
      playerId: entremetteur.id,
      type: "entremetteur_setup",
      title: "\u{1F49E} Tisse tes liens",
      body: "\xC0 la 1\xE8re Enqu\xEAte, choisis 2 joueurs (autres que toi) \xE0 lier. Si l'un meurt, l'autre suit. Vous gagnez ensemble si le couple et toi survivez.",
      mjTitle: "\u{1F49E} Entremetteur",
      mjBody: `${entremetteur.pseudo} (Entremetteur) doit lier 2 joueurs \xE0 la 1\xE8re Enqu\xEAte.`
    });
    await logSetup(entremetteur.id, "Tu choisiras 2 joueurs \xE0 lier \xE0 la 1\xE8re Enqu\xEAte.", {
      effect: "entremetteur_pending"
    });
  }
  const vengeur = ofSlug("vengeur");
  if (vengeur) {
    const civils = alive.filter((p) => {
      if (p.id === vengeur.id) return false;
      return rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil";
    });
    const choices = shuffle2(civils).slice(0, 2).map((p) => p.id);
    const choiceNames = choices.map((id) => alive.find((p) => p.id === id)?.pseudo ?? "?").join(" \xB7 ");
    await patchMeta(vengeur.id, {
      pending_beloved_choice: true,
      etre_cher: null,
      beloved_id: null,
      vengeur_choices: choices
    });
    await notify({
      gameId,
      playerId: vengeur.id,
      type: "vengeur_setup",
      title: "\u{1F90D} Choisis ton \xEAtre cher",
      body: choices.length >= 2 ? `\xC0 la 1\xE8re Enqu\xEAte, choisis ton \xEAtre cher parmi 2 Civils : ${choiceNames}. Tu sais donc que ces deux-l\xE0 sont des Civils. S'il/elle meurt, tu recevras un couteau pour te venger.` : "\xC0 la 1\xE8re Enqu\xEAte, choisis ton \xEAtre cher. S'il/elle meurt, tu recevras un couteau pour te venger.",
      mjTitle: "\u{1F90D} Vengeur",
      mjBody: `${vengeur.pseudo} (Vengeur) choisira son \xEAtre cher parmi : ${choiceNames || "(aucun civil)"}.`
    });
    await logSetup(
      vengeur.id,
      `Tu choisiras ton \xEAtre cher${choiceNames ? ` parmi 2 Civils : ${choiceNames}` : ""} \xE0 la 1\xE8re Enqu\xEAte.`,
      { effect: "vengeur_pending" }
    );
  }
  const usurpateur = ofSlug("usurpateur");
  if (usurpateur) {
    const absent = shuffle2(
      Array.from(rolesBySlug.values()).filter(
        (r) => !allSlugs.has(r.slug) && r.faction === "Civil" && !r.emergent
      )
    );
    const choices = absent.slice(0, 3).map((r) => r.slug);
    if (choices.length > 0) {
      await patchMeta(usurpateur.id, { cover_choices: choices });
      const labels = choices.map((s) => {
        const r = rolesBySlug.get(s);
        return `${r?.icon ?? ""} ${r?.name_fr ?? s}`;
      }).join(" \xB7 ");
      await notify({
        gameId,
        playerId: usurpateur.id,
        type: "cover_pending",
        title: "\u{1F3AD} Choisis ta couverture",
        body: `\xC0 la prochaine Enqu\xEAte : ${labels}`,
        mjTitle: "\u{1F3AD} Usurpateur",
        mjBody: `${usurpateur.pseudo} (Usurpateur) doit choisir parmi : ${labels}.`
      });
      await logSetup(
        usurpateur.id,
        `\xC0 la prochaine Enqu\xEAte, choisis ta couverture parmi : ${labels}.`,
        { effect: "cover_pending" }
      );
    }
  }
  const ange = ofSlug("ange_gardien");
  if (ange) {
    const civils = alive.filter((p) => {
      if (p.id === ange.id) return false;
      const r = rolesBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil";
    });
    const tgt = civils[Math.floor(Math.random() * civils.length)];
    if (tgt) {
      const r = rolesBySlug.get(tgt.role_slug ?? "");
      await patchMeta(ange.id, { ward: tgt.id, protege_id: tgt.id, ward_pseudo: tgt.pseudo });
      await notify({
        gameId,
        playerId: ange.id,
        type: "ward",
        title: "\u{1F6E1}\uFE0F Ta cible",
        body: `Tu veilles sur ${tgt.pseudo}.`,
        mjTitle: "\u{1F6E1}\uFE0F Ange Gardien",
        mjBody: `${ange.pseudo} (Ange Gardien) surveille ${tgt.pseudo} (${r?.icon} ${r?.name_fr}).`
      });
      await logSetup(ange.id, `Prot\xE9g\xE9 : ${tgt.pseudo}.`, { targetId: tgt.id, effect: "ward" });
    }
  }
  const parano = ofSlug("paranoiaque");
  if (parano) {
    const others = alive.filter((p) => p.id !== parano.id);
    const tgt = others[Math.floor(Math.random() * others.length)];
    if (tgt) {
      await patchMeta(parano.id, {
        paranoid_target_id: tgt.id,
        paranoid_target_pseudo: tgt.pseudo
      });
      const body = `Ta cible : ${tgt.pseudo}. \xC0 toi de deviner s'il est de ton c\xF4t\xE9. 1\xD7 dans la partie : prot\xE8ge-le ou tue-le.`;
      await notify({
        gameId,
        playerId: parano.id,
        type: "paranoid_target",
        title: "\u{1F3AF} Ta cible",
        body,
        mjTitle: "\u{1F3AF} Parano\xEFaque",
        mjBody: `${parano.pseudo} (Parano\xEFaque) surveille ${tgt.pseudo}.`
      });
      await logSetup(parano.id, body, { targetId: tgt.id, effect: "paranoid_target" });
    }
  }
  const mouchard = ofSlug("mouchard");
  if (mouchard) {
    const body = "\xC0 la premi\xE8re Enqu\xEAte, d\xE9signe 1 joueur : tu apprendras son r\xF4le exact.";
    await notify({
      gameId,
      playerId: mouchard.id,
      type: "mouchard_setup",
      title: "\u{1F4E2} Mouchard",
      body,
      mjTitle: "\u{1F4E2} Mouchard",
      mjBody: `${mouchard.pseudo} (Mouchard) doit d\xE9signer 1 joueur en Enqu\xEAte.`
    });
    await logSetup(mouchard.id, body, { effect: "mouchard_setup" });
  }
  const oracle = ofSlug("oracle");
  if (oracle) {
    const body = "\xC0 la premi\xE8re Enqu\xEAte, pr\xE9dis quelle faction (Civils, M\xE9chants ou Neutres) remportera la partie. Tu gagneras avec elle si tu es en vie \xE0 la fin.";
    await notify({
      gameId,
      playerId: oracle.id,
      type: "oracle_setup",
      title: "\u{1F52E} Oracle",
      body,
      mjTitle: "\u{1F52E} Oracle",
      mjBody: `${oracle.pseudo} (Oracle) attend de lancer sa proph\xE9tie (faction \xE0 pr\xE9dire).`
    });
    await logSetup(oracle.id, body, { effect: "oracle_setup" });
  }
  const veuve = ofSlug("veuve_noire");
  if (veuve) {
    const body = "\xC0 chaque Enqu\xEAte, choisis 2 cibles. Si l'une d'elles vote contre toi au vote suivant, les deux meurent \xE0 la prochaine Annonce.";
    await notify({
      gameId,
      playerId: veuve.id,
      type: "veuve_setup",
      title: "\u{1F577}\uFE0F Veuve noire",
      body,
      mjTitle: "\u{1F577}\uFE0F Veuve noire",
      mjBody: `${veuve.pseudo} (Veuve noire) pr\xEAte \xE0 d\xE9signer ses cibles en Enqu\xEAte.`
    });
    await logSetup(veuve.id, body, { effect: "veuve_setup" });
  }
  const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
  const cuisinier = ofSlug("cuisinier");
  if (cuisinier) {
    await grantItem2(
      cuisinier.id,
      buildItem2("couteau", {
        from: "Cuisine",
        originFaction: "Civil",
        nameOverride: "Couteau de cuisine",
        descriptionOverride: "Cible un joueur \xE0 tuer"
      })
    );
  }
  const conserv = ofSlug("conservateur");
  if (conserv) {
    const body = "Deux fois par Enqu\xEAte, d\xE9signe un joueur : il recevra une relique maudite au hasard. Tu gagnes si Le C\u0153ur du Manoir est distribu\xE9.";
    await notify({
      gameId,
      playerId: conserv.id,
      type: "conservateur_setup",
      title: "\u{1F5DD}\uFE0F Conservateur \u2014 \xE9veill\xE9",
      body,
      mjTitle: "\u{1F5DD}\uFE0F Conservateur",
      mjBody: `${conserv.pseudo} (Conservateur) distribue des reliques aux autres joueurs.`
    });
    await logSetup(conserv.id, body, { effect: "conservateur_setup" });
  }
}
async function setPhase(gameId, phase, phaseStartedAt = serverNowISO()) {
  const dur = await phaseDurationFor(gameId, phase);
  await supabase.from("games").update({
    current_phase: phase,
    phase_started_at: phaseStartedAt,
    phase_duration_s: dur
  }).eq("id", gameId);
  emit("phase_change", `Phase \u2192 ${phase}`, { gameId, phase });
}
async function nextCycle(gameId, phaseStartedAt = serverNowISO()) {
  await resolveCycleTransition(gameId);
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = (g?.current_tour ?? 0) + 1;
  const freeDur = await phaseDurationFor(gameId, "free");
  await supabase.from("games").update({
    current_tour: tour,
    current_phase: "free",
    phase_started_at: phaseStartedAt,
    phase_duration_s: freeDur
  }).eq("id", gameId);
  emit("tour", `Tour ${tour}`, { gameId, tour });
  await checkAndEndGame(gameId);
}
async function phaseTickDue(gameId) {
  const { data: g } = await supabase.from("games").select("current_phase, phase_started_at, phase_duration_s, status, paused").eq("id", gameId).single();
  const game = g;
  if (!game || game.status === "ended" || game.paused) return false;
  if (!game.phase_started_at || !game.phase_duration_s) return false;
  const started = new Date(game.phase_started_at).getTime();
  const elapsed = (serverNow() - started) / 1e3 - introSFor(game.current_phase);
  return elapsed >= game.phase_duration_s;
}
async function tickPhase(gameId) {
  const now = Date.now();
  const lockedAt = _tickInFlight.get(gameId);
  if (lockedAt && now - lockedAt < TICK_LOCK_TTL_MS) return;
  _tickInFlight.set(gameId, now);
  try {
    if (!await phaseTickDue(gameId)) return;
    const { data: won, error: claimErr } = await supabase.rpc(
      "claim_phase_tick",
      {
        p_game_id: gameId
      }
    );
    if (claimErr || !won) return;
    try {
      for (let transitionCount = 0; transitionCount < MAX_TICK_TRANSITIONS; transitionCount++) {
        const { data: g } = await supabase.from("games").select("current_phase, phase_started_at, phase_duration_s, status, paused").eq("id", gameId).single();
        const game = g;
        if (!game || game.status === "ended") return;
        if (game.paused) return;
        if (!game.phase_started_at || !game.phase_duration_s) return;
        const started = new Date(game.phase_started_at).getTime();
        const introS = introSFor(game.current_phase);
        const elapsed = (serverNow() - started) / 1e3 - introS;
        if (elapsed < game.phase_duration_s) return;
        const nextPhaseStartedAt = new Date(
          started + (introS + game.phase_duration_s) * 1e3
        ).toISOString();
        if (game.current_phase === "free") {
          await ringGathering(gameId, "Auto", nextPhaseStartedAt);
        } else if (game.current_phase === "annonce") {
          await openGathering(gameId, nextPhaseStartedAt);
        } else if (game.current_phase === "gathering") {
          await openVote(gameId, nextPhaseStartedAt);
        } else if (game.current_phase === "vote") {
          await closeVote(gameId);
          if (elapsed < game.phase_duration_s + VOTE_RESULT_S) return;
          await nextCycle(
            gameId,
            new Date(
              started + (introS + game.phase_duration_s + VOTE_RESULT_S) * 1e3
            ).toISOString()
          );
        } else {
          return;
        }
      }
    } finally {
      await supabase.rpc("release_phase_tick", { p_game_id: gameId });
    }
  } finally {
    _tickInFlight.delete(gameId);
  }
}
async function setPaused(gameId, paused) {
  await supabase.from("games").update({ paused }).eq("id", gameId);
}
async function setForcedFrame(gameId, frame) {
  await supabase.from("games").update({ forced_frame: frame }).eq("id", gameId);
}
async function endGameWithWinner(gameId, winner, reason) {
  const { data: g } = await supabase.from("games").select("status").eq("id", gameId).single();
  if (g?.status === "ended") return;
  await supabase.from("role_actions").update({
    resolved_at: (/* @__PURE__ */ new Date()).toISOString(),
    resolution: { status: "cancelled", reason: "game_ended", winner },
    result: {
      summary: "La partie s'est termin\xE9e avant le d\xE9nouement de cette action.",
      outcome: "info"
    }
  }).eq("game_id", gameId).is("resolved_at", null).eq("timing", "DEFERRED").not("category", "is", null);
  const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
  const rows = (ps ?? []).map((p) => ({
    game_id: gameId,
    player_id: p.id,
    type: "game_end",
    title: `\u{1F3C6} ${winner} a gagn\xE9`,
    body: reason,
    payload: { winner, special: true }
  }));
  if (rows.length) await supabase.from("notifications").insert(rows);
  await supabase.from("games").update({
    status: "ended",
    ended_at: (/* @__PURE__ */ new Date()).toISOString(),
    winner,
    win_reason: reason
  }).eq("id", gameId);
  emit("game_end", `\u{1F3C6} ${winner} \u2014 ${reason}`, { winner });
}
async function resolveCycleTransition(gameId) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const curCycle = g?.current_tour ?? 0;
  const nextCycleN = curCycle + 1;
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const allPs = ps ?? [];
  for (const p of allPs) {
    if (!p.is_alive) continue;
    const m = meta(p);
    if (m.poison_resolves_cycle === nextCycleN) {
      const protUntil = m.protected_until_cycle ?? -1;
      if (protUntil >= nextCycleN) {
        await patchMeta(p.id, { poison_resolves_cycle: null, poisoned: false });
        await notify({
          gameId,
          playerId: p.id,
          type: "saved",
          title: "\u{1F6E1}\uFE0F Sauv\xE9 du poison",
          body: "Une protection t'a sauv\xE9.",
          mjTitle: "\u{1F6E1}\uFE0F Poison neutralis\xE9",
          mjBody: `${p.pseudo} a \xE9t\xE9 sauv\xE9 du poison par une protection.`
        });
      } else {
        await patchMeta(p.id, { poison_resolves_cycle: null, poisoned: false });
        await killPlayer(gameId, p.id, "poison");
      }
    }
  }
  for (const p of allPs) {
    const m = meta(p);
    if (m.pending_release_for_cycle !== nextCycleN) continue;
    await patchMeta(p.id, { pending_release_for_cycle: null, pending_release_by: null });
    if (!p.is_alive || !p.is_imprisoned) continue;
    await supabase.from("players").update({ is_imprisoned: false }).eq("id", p.id);
    await notify({
      gameId,
      playerId: p.id,
      type: "released",
      title: "\u{1F513} Lib\xE9r\xE9",
      body: "Le Juge t'a lib\xE9r\xE9 de prison.",
      mjTitle: "\u2696\uFE0F Juge",
      mjBody: `${p.pseudo} est lib\xE9r\xE9 de prison (ordre du Juge au tour ${nextCycleN - 1}).`
    });
  }
  for (const pup of allPs) {
    if (!pup.is_alive) continue;
    const pm = meta(pup);
    const puppetId = pm.puppet_id;
    const activeTour = pm.puppet_active_tour;
    if (!puppetId || activeTour !== nextCycleN) continue;
    const target = allPs.find((q) => q.id === puppetId);
    if (!target || !target.is_alive) continue;
    await patchMeta(target.id, {
      blocked_until_cycle: nextCycleN,
      blocked_from_cycle: nextCycleN,
      forced_by: pup.id,
      forced_action_cycle: nextCycleN,
      manipulated_by: pup.id,
      manipulated_tour: nextCycleN
    });
    await supabase.from("player_statuses").insert({
      game_id: gameId,
      player_id: target.id,
      status_slug: "manipulated",
      source: "role:marionnettiste",
      active_from_tour: nextCycleN,
      active_until_tour: nextCycleN
    });
    await notify({
      gameId,
      playerId: target.id,
      type: "manipulated",
      title: "\u{1F3AD} Tu as \xE9t\xE9 manipul\xE9",
      body: "Quelqu'un prend le contr\xF4le de ta capacit\xE9 ce tour. Tu ne peux rien faire.",
      mjTitle: "\u{1F3AD} Marionnettiste",
      mjBody: `${pup.pseudo} (Marionnettiste) prend le contr\xF4le de ${target.pseudo} ce tour.`
    });
  }
}
async function autoPickMouchard(gameId, tour) {
  const { data: mRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "mouchard").maybeSingle();
  const mouchard = mRow;
  if (!mouchard || !mouchard.is_alive) return;
  const m = meta(mouchard);
  if (usesOf(m, "mouchard") > 0) return;
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const all = ps ?? [];
  const pool = all.filter((p) => p.is_alive && !p.is_mj && p.id !== mouchard.id);
  if (pool.length === 0) return;
  const t1 = pool[Math.floor(Math.random() * pool.length)];
  const newUses = { ...m.uses ?? {}, mouchard: 1 };
  const newLast = { ...m.last_use ?? {}, mouchard: tour };
  await patchMeta(mouchard.id, { uses: newUses, last_use: newLast });
  const tMeta = meta(t1);
  if (isFalsified(tMeta)) {
    await supabase.from("role_actions").insert({
      game_id: gameId,
      actor_player_id: mouchard.id,
      tour,
      phase: "free",
      target_player_id: t1.id,
      payload: { effect: "mouchard_falsified", auto: true, target: t1.id },
      result: { message: FALSIFIED_MSG, summary: FALSIFIED_MSG }
    });
    await notify({
      gameId,
      playerId: mouchard.id,
      type: "mouchard_reveal",
      title: "\u{1F4E2} Mouchard (auto)",
      body: `Cible auto : ${t1.pseudo}. ${FALSIFIED_MSG}.`,
      mjTitle: "\u{1F4E2} Mouchard auto",
      mjBody: `${mouchard.pseudo} (Mouchard) \u2192 cible auto ${t1.pseudo} \u2014 piste falsifi\xE9e.`
    });
    return;
  }
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r2 of rs ?? []) rolesBySlug.set(r2.slug, r2);
  const r = rolesBySlug.get(t1.role_slug ?? "");
  const label = r ? `${r.icon} ${r.name_fr}` : "?";
  const summary = `Cible auto : ${t1.pseudo} = ${label}`;
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: mouchard.id,
    tour,
    phase: "free",
    target_player_id: t1.id,
    payload: { effect: "mouchard_reveal", auto: true, target: t1.id, slug: t1.role_slug },
    result: { message: summary, summary }
  });
  await notify({
    gameId,
    playerId: mouchard.id,
    type: "mouchard_reveal",
    title: "\u{1F4E2} Mouchard (auto)",
    body: `Aucun choix : cible tir\xE9e au sort. ${t1.pseudo} est : ${label}.`,
    mjTitle: "\u{1F4E2} Mouchard auto",
    mjBody: `${mouchard.pseudo} (Mouchard) \u2192 auto-cible ${t1.pseudo} (${label}).`
  });
}
async function autoPickOracle(gameId, tour) {
  if (tour !== 1) return;
  const { data: oRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "oracle").maybeSingle();
  const oracle = oRow;
  if (!oracle || !oracle.is_alive) return;
  const m = meta(oracle);
  if (m.prophecy) return;
  const factions = ["Civil", "M\xE9chant", "Neutre"];
  const faction = factions[Math.floor(Math.random() * factions.length)];
  const uses = { ...m.uses ?? {}, oracle: 1 };
  const last_use = { ...m.last_use ?? {}, oracle: tour };
  await patchMeta(oracle.id, { prophecy: faction, uses, last_use });
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: oracle.id,
    tour,
    phase: "free",
    payload: { effect: "prophecy", auto: true, faction },
    result: {
      message: `Proph\xE9tie auto : ${faction}`,
      summary: `Proph\xE9tie auto : ${faction}`
    }
  });
  await notify({
    gameId,
    playerId: oracle.id,
    type: "prophecy_set",
    title: "\u{1F52E} Proph\xE9tie auto",
    body: `Tu n'as pas choisi \xE0 temps. La proph\xE9tie \xAB ${faction} \xBB a \xE9t\xE9 tir\xE9e au sort.`,
    mjTitle: "\u{1F52E} Oracle auto",
    mjBody: `${oracle.pseudo} (Oracle) \u2192 proph\xE9tie auto : ${faction}.`
  });
}
async function autoPickVengeur(gameId, tour) {
  if (tour !== 1) return;
  const { data: vRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "vengeur").maybeSingle();
  const vengeur = vRow;
  if (!vengeur || !vengeur.is_alive) return;
  const m = meta(vengeur);
  if (m.pending_beloved_choice !== true) return;
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  const all = ps ?? [];
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r of rs ?? []) rolesBySlug.set(r.slug, r);
  const choices = m.vengeur_choices ?? [];
  let pool = all.filter((p) => choices.includes(p.id) && p.is_alive && !p.is_mj);
  if (pool.length === 0) {
    pool = all.filter((p) => {
      if (p.id === vengeur.id || !p.is_alive || p.is_mj) return false;
      return rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil";
    });
  }
  if (pool.length === 0) return;
  const target = pool[Math.floor(Math.random() * pool.length)];
  await patchMeta(vengeur.id, {
    etre_cher: target.id,
    beloved_id: target.id,
    pending_beloved_choice: false
  });
  await notify({
    gameId,
    playerId: vengeur.id,
    type: "vengeur_setup",
    title: "\u{1F90D} \xCAtre cher (auto)",
    body: `Tu n'as pas choisi \xE0 temps. ${target.pseudo} devient ton \xEAtre cher.`,
    mjTitle: "\u{1F90D} Vengeur auto",
    mjBody: `${vengeur.pseudo} (Vengeur) \u2192 \xEAtre cher auto : ${target.pseudo}.`
  });
}
async function autoPickUsurpateur(gameId, tour) {
  if (tour !== 1) return;
  const { data: uRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "usurpateur").maybeSingle();
  const u = uRow;
  if (!u || !u.is_alive) return;
  const m = meta(u);
  if (typeof m.cover_slug === "string") return;
  const choices = m.cover_choices ?? [];
  if (choices.length === 0) return;
  const pick2 = choices[Math.floor(Math.random() * choices.length)];
  await patchMeta(u.id, { cover_slug: pick2, cover_choices: null });
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r2 of rs ?? []) rolesBySlug.set(r2.slug, r2);
  const r = rolesBySlug.get(pick2);
  const label = r ? `${r.icon} ${r.name_fr}` : pick2;
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: u.id,
    tour,
    phase: "free",
    payload: { effect: "cover_pick", auto: true, cover: pick2 },
    result: {
      message: `Couverture auto : ${label}`,
      summary: `Couverture auto : ${label}`
    }
  });
  await notify({
    gameId,
    playerId: u.id,
    type: "cover_pending",
    title: "\u{1F3AD} Couverture (auto)",
    body: `Tu n'as pas choisi \xE0 temps. Couverture tir\xE9e au sort : ${label}.`,
    mjTitle: "\u{1F3AD} Usurpateur auto",
    mjBody: `${u.pseudo} (Usurpateur) \u2192 couverture auto : ${label}.`
  });
}
async function ringGathering(gameId, reason = "MJ", phaseStartedAt) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  await setPhase(gameId, "annonce", phaseStartedAt);
  await autoPickMouchard(gameId, tour);
  await autoPickOracle(gameId, tour);
  await autoPickVengeur(gameId, tour);
  await autoPickUsurpateur(gameId, tour);
  const { data: gc, error } = await supabase.from("gathering_calls").insert({ game_id: gameId, tour, reason }).select().single();
  if (error) throw error;
  await resolveDeferredIntents(gameId, tour, killPlayer, applyVampireConversion);
  await flushPendingDeaths(gameId);
  emit("gather", `\u{1F4EF} Annonce \u2014 ${reason}`, { gameId, gatheringId: gc.id });
  return gc.id;
}
async function openGathering(gameId, phaseStartedAt) {
  await setPhase(gameId, "gathering", phaseStartedAt);
  emit("gather_open", "\u{1F514} D\xE9bat ouvert", { gameId });
}
async function openVote(gameId, phaseStartedAt) {
  await setPhase(gameId, "vote", phaseStartedAt);
  emit("vote_open", "\u{1F5F3}\uFE0F Vote ouvert");
}
async function castVote(gameId, voterId, targetId) {
  const { data: vp } = await supabase.from("players").select("is_alive, is_imprisoned").eq("id", voterId).single();
  const voter = vp;
  if (!voter || !voter.is_alive || voter.is_imprisoned) return;
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  await supabase.from("votes").delete().eq("game_id", gameId).eq("tour", tour).eq("voter_player_id", voterId);
  await supabase.from("votes").insert({
    game_id: gameId,
    tour,
    voter_player_id: voterId,
    target_player_id: targetId
  });
  emit("vote_cast", "Vote enregistr\xE9", { voterId, targetId });
}
async function tallyVote(gameId) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  const { data: vs } = await supabase.from("votes").select("voter_player_id, target_player_id").eq("game_id", gameId).eq("tour", tour);
  const counts = {};
  for (const v of vs ?? []) {
    counts[v.target_player_id] = (counts[v.target_player_id] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { targetId: null, counts, tied: false, tiedIds: [] };
  const top = sorted[0][1];
  const tiedIds = sorted.filter(([, n]) => n === top).map(([id]) => id);
  const tied = tiedIds.length > 1;
  const targetId = tied ? tiedIds[Math.floor(Math.random() * tiedIds.length)] : sorted[0][0];
  return { targetId, counts, tied, tiedIds };
}
async function tallySuspicionVote(gameId) {
  const { data: ps } = await supabase.from("players").select("id, is_alive, is_imprisoned, is_mj, role_meta").eq("game_id", gameId);
  const players = ps ?? [];
  const aliveIds = new Set(players.filter((p) => p.is_alive && !p.is_mj).map((p) => p.id));
  const counts = {};
  for (const voter of players) {
    if (voter.is_mj) continue;
    if (!voter.is_alive && !voter.is_imprisoned) continue;
    const board = voter.role_meta?.suspicion_board ?? {};
    for (const [targetId2, level] of Object.entries(board)) {
      if (level !== 3) continue;
      if (targetId2 === voter.id) continue;
      if (!aliveIds.has(targetId2)) continue;
      counts[targetId2] = (counts[targetId2] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { targetId: null, counts, tied: false, tiedIds: [] };
  const top = sorted[0][1];
  const tiedIds = sorted.filter(([, n]) => n === top).map(([id]) => id);
  const tied = tiedIds.length > 1;
  const targetId = tied ? null : sorted[0][0];
  return { targetId, counts, tied, tiedIds };
}
async function closeVote(gameId) {
  const { data: gVar } = await supabase.from("games").select("variant").eq("id", gameId).maybeSingle();
  const variant = gVar?.variant ?? null;
  const tallyFn = variant === "suspicion" ? tallySuspicionVote : tallyVote;
  const { targetId, counts, tied } = await tallyFn(gameId);
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  const { data: already } = await supabase.from("notifications").select("id").eq("game_id", gameId).eq("type", "vote_result").contains("payload", { tour }).limit(1);
  if ((already ?? []).length > 0) return;
  const { data: veuves } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "veuve_noire").eq("is_alive", true);
  for (const v of veuves ?? []) {
    const vm = meta(v);
    const pairs = (vm.veuve_pairs ?? []).filter((p) => p.tour === tour);
    if (pairs.length === 0) continue;
    const allTargets = Array.from(new Set(pairs.flatMap((p) => p.pair)));
    const voters = /* @__PURE__ */ new Set();
    if (variant === "suspicion") {
      const { data: spouseRows } = await supabase.from("players").select("id, role_meta").in("id", allTargets);
      for (const sp of spouseRows ?? []) {
        const board = sp.role_meta?.suspicion_board ?? {};
        if (board[v.id] === 3) voters.add(sp.id);
      }
    } else {
      const { data: votesAgainst } = await supabase.from("votes").select("voter_player_id").eq("game_id", gameId).eq("tour", tour).eq("target_player_id", v.id);
      for (const x of votesAgainst ?? [])
        voters.add(x.voter_player_id);
    }
    const triggeringPairs = pairs.filter((p) => p.pair.some((id) => voters.has(id)));
    if (triggeringPairs.length === 0) continue;
    const toKill = Array.from(new Set(triggeringPairs.flatMap((p) => p.pair)));
    for (const tid of toKill) {
      await submitIntent({
        gameId,
        tour: tour + 1,
        phase: "free",
        actorId: v.id,
        targetId: tid,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "role:veuve_noire",
        payload: { kill_reason: "veuve_noire_vote_trigger" }
      });
    }
    const remaining = (vm.veuve_pairs ?? []).filter((p) => p.tour !== tour);
    await patchMeta(v.id, { veuve_pairs: remaining });
    await notify({
      gameId,
      playerId: v.id,
      type: "veuve_trigger",
      title: "\u{1F577}\uFE0F La toile se referme",
      body: `Un \xE9poux a vot\xE9 contre toi. ${toKill.length} cible(s) mourront \xE0 la prochaine Annonce.`,
      mjTitle: "\u{1F577}\uFE0F Veuve noire",
      mjBody: `${v.pseudo} (Veuve noire) d\xE9clenche la mort de ${toKill.length} \xE9poux (vote contre elle).`
    });
    void allTargets;
  }
  if (targetId) {
    const effectiveTarget = targetId;
    const { data: tgt } = await supabase.from("players").select("role_slug, pseudo, role_meta").eq("id", effectiveTarget).single();
    const tgtRow = tgt;
    const slug = tgtRow?.role_slug ?? null;
    if (slug === "saint") {
      await supabase.from("role_actions").update({
        resolved_at: (/* @__PURE__ */ new Date()).toISOString(),
        resolution: { status: "cancelled", reason: "game_ended", winner: "M\xC3\xA9chants" },
        result: {
          summary: "La partie s'est termin\xE9e avant le d\xE9nouement de cette action.",
          outcome: "info"
        }
      }).eq("game_id", gameId).is("resolved_at", null).eq("timing", "DEFERRED").not("category", "is", null);
      const { data: ps } = await supabase.from("players").select("id").eq("game_id", gameId);
      const rows = (ps ?? []).map((p) => ({
        game_id: gameId,
        player_id: p.id,
        type: "game_end",
        title: "\u{1F56F}\uFE0F Le Saint a \xE9t\xE9 condamn\xE9",
        body: "D\xE9faite des Citoyens.",
        payload: { winner: "M\xE9chants" }
      }));
      if (rows.length) await supabase.from("notifications").insert(rows);
      await supabase.from("games").update({
        status: "ended",
        ended_at: (/* @__PURE__ */ new Date()).toISOString(),
        winner: "M\xE9chants",
        win_reason: "D\xE9faite des Citoyens."
      }).eq("id", gameId);
      emit("saint_lost", "\u{1F56F}\uFE0F Saint condamn\xE9 \u2014 Citoyens perdent");
      return;
    }
    await imprisonPlayer(gameId, effectiveTarget, "vote");
    const { data: allPs } = await supabase.from("players").select("id").eq("game_id", gameId);
    const broadcast = (allPs ?? []).map((p) => ({
      game_id: gameId,
      player_id: p.id,
      type: "vote_result",
      title: tied ? "\u2696\uFE0F Vote \u2014 \xC9galit\xE9 tranch\xE9e au sort" : "\u{1F512} Vote \u2014 Verdict",
      body: `${tgtRow?.pseudo ?? "?"} est emprisonn\xE9.`,
      payload: { target_id: effectiveTarget, tour, counts, tied }
    }));
    if (broadcast.length) await supabase.from("notifications").insert(broadcast);
  } else {
    const { data: allPs } = await supabase.from("players").select("id").eq("game_id", gameId);
    const broadcast = (allPs ?? []).map((p) => ({
      game_id: gameId,
      player_id: p.id,
      type: "vote_result",
      title: "\u{1F910} Vote \u2014 Personne",
      body: "Aucun vote n'a \xE9t\xE9 \xE9mis.",
      payload: { target_id: null, tour, counts }
    }));
    if (broadcast.length) await supabase.from("notifications").insert(broadcast);
  }
  emit("vote_close", targetId ? "\u{1F512} Vote \u2192 emprisonnement" : "Vote \u2192 personne", { targetId });
}
async function setTestament(playerId, text) {
  await patchMeta(playerId, { testament: text });
}
async function cancelVote(gameId, voterId) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  await supabase.from("votes").delete().eq("game_id", gameId).eq("tour", tour).eq("voter_player_id", voterId);
}
async function killPlayer(gameId, playerId, reason = "engine", attackerId, extra) {
  const { data: p } = await supabase.from("players").select().eq("id", playerId).single();
  const player = p;
  if (!player) return false;
  const m = meta(player);
  if (m.immortal === true) {
    emit("kill_blocked", `${player.pseudo} est immortel`, { playerId });
    return false;
  }
  if (!player.is_alive) return false;
  if (m.pending_death) return false;
  const { data: g } = await supabase.from("games").select("current_tour, current_phase").eq("id", gameId).single();
  const gg = g;
  const tour = gg?.current_tour ?? 1;
  const deathPhase = gg?.current_phase ?? "free";
  const prot = m.protected_until_cycle ?? -1;
  if (prot >= tour && reason !== "vote") {
    emit("kill_blocked", `${player.pseudo} prot\xE9g\xE9`, { playerId, reason });
    await notifyMJ({
      gameId,
      type: "shielded",
      title: "\u{1F6E1}\uFE0F Attaque bloqu\xE9e",
      body: `${player.pseudo} a \xE9t\xE9 attaqu\xE9 (${reason}) mais une protection l'a sauv\xE9.`
    });
    if (m.blessed_by_saint === true && attackerId) {
      await notify({
        gameId,
        playerId: attackerId,
        type: "saint_block",
        title: "\u2728 Cible b\xE9nite",
        body: "Cette cible est b\xE9nite, votre action ne fonctionne pas."
      });
    }
    const isMechantReason = reason === "tueur" || reason === "croque_mitaine" || reason === "stratege";
    if (isMechantReason && typeof m.guarded_by === "string") {
      const guard = m.guarded_by;
      await killPlayer(gameId, guard, "majordome_trade");
      const killerId = attackerId;
      if (killerId) await killPlayer(gameId, killerId, "majordome_riposte");
      else if (reason === "tueur") {
        const { data: tueurRow } = await supabase.from("players").select("id").eq("game_id", gameId).eq("role_slug", "tueur").maybeSingle();
        if (tueurRow)
          await killPlayer(gameId, tueurRow.id, "majordome_riposte");
      }
    }
    return false;
  }
  const cleanedBroadcast = m.cleaned === true;
  const { data: roleInfo } = await supabase.from("roles").select("faction").eq("slug", player.role_slug ?? "").maybeSingle();
  const realFaction = roleInfo?.faction ?? "inconnue";
  const publicFaction = cleanedBroadcast ? "inconnue" : realFaction;
  const whenLabel = deathPhase === "free" ? "durant l'Enqu\xEAte" : deathPhase === "gathering" ? "durant le D\xE9bat" : deathPhase === "vote" ? "lors du vote" : "";
  const { data: allForKill } = await supabase.from("players").select("id").eq("game_id", gameId);
  const killBroadcast = (allForKill ?? []).map((row) => ({
    game_id: gameId,
    player_id: row.id,
    type: "death",
    title: `\u{1F480} Mort de ${player.pseudo}`,
    body: `Faction : ${publicFaction}.`,
    payload: {
      target_id: playerId,
      tour,
      phase: deathPhase,
      reason,
      deferred: deathPhase === "free",
      cleaned: cleanedBroadcast,
      faction: publicFaction,
      attacker_id: attackerId ?? null,
      ...extra ?? {}
    }
  }));
  if (killBroadcast.length) await supabase.from("notifications").insert(killBroadcast);
  await notifyMJ({
    gameId,
    type: cleanedBroadcast ? "death_cleaned" : "death",
    title: `\u{1F480} Mort de ${player.pseudo}`,
    body: `${player.pseudo} n'est plus en vie${whenLabel ? " " + whenLabel : ""} (cause : ${reason}, faction r\xE9elle : ${realFaction})${cleanedBroadcast ? " \u2014 faction masqu\xE9e par le Cleaner" : ""}${deathPhase === "free" ? " \u2014 R\xC9V\xC9LATION DIFF\xC9R\xC9E \xE0 l'Annonce" : ""}.`,
    payload: {
      target_id: playerId,
      tour,
      phase: deathPhase,
      reason,
      deferred: deathPhase === "free",
      cleaned: cleanedBroadcast,
      faction: realFaction
    }
  });
  if (deathPhase === "free") {
    await patchMeta(playerId, {
      pending_death: { reason, tour, ts: (/* @__PURE__ */ new Date()).toISOString(), attacker_id: attackerId },
      death_cycle: tour,
      death_phase: deathPhase,
      death_reason: reason,
      death_cleaned: cleanedBroadcast
    });
    emit("kill_deferred", `\u{1F480} ${player.pseudo} condamn\xE9 (mort diff\xE9r\xE9e: ${reason})`, {
      playerId,
      reason
    });
    return true;
  }
  await supabase.from("players").update({ is_alive: false }).eq("id", playerId);
  await patchMeta(playerId, {
    death_cycle: tour,
    death_phase: deathPhase,
    death_reason: reason,
    death_cleaned: cleanedBroadcast
  });
  emit("kill", `\u{1F480} ${player.pseudo} tu\xE9 (${reason})`, { playerId, reason });
  await runDeathCascades(gameId, player, reason, tour);
  await checkAndEndGame(gameId);
  return true;
}
async function runDeathCascades(gameId, player, reason, _cycle) {
  const m = meta(player);
  const playerId = player.id;
  const cleaned = m.cleaned === true;
  if (!cleaned) {
    const { data: legiste } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "medecin_legiste").maybeSingle();
    if (legiste && legiste.is_alive) {
      const { data: roleRow } = await supabase.from("roles").select("name_fr, icon").eq("slug", player.role_slug ?? "").maybeSingle();
      const r = roleRow;
      await notify({
        gameId,
        playerId: legiste.id,
        type: "autopsy",
        title: "\u{1FA7A} Autopsie",
        body: `${player.pseudo} \u2014 ${r?.icon} ${r?.name_fr}`,
        mjTitle: "\u{1FA7A} Autopsie",
        mjBody: `${legiste.pseudo} (M\xE9decin l\xE9giste) examine ${player.pseudo} \u2192 ${r?.icon ?? ""} ${r?.name_fr ?? ""}.`
      });
    }
  }
  if (typeof m.linked_with === "string") {
    const linkedId = m.linked_with;
    const { data: linked } = await supabase.from("players").select("is_alive, role_meta, pseudo").eq("id", linkedId).single();
    const lk = linked;
    const lkMeta = lk?.role_meta ?? {};
    if (lk && lk.is_alive && !lkMeta.pending_death) {
      await notify({
        gameId,
        playerId: linkedId,
        type: "linked_death",
        title: "\u{1F494} Lien rompu",
        body: `Mort de ${player.pseudo} \u2014 ton lien t'emporte aussi.`,
        mjTitle: "\u{1F494} Lien rompu",
        mjBody: `${lk.pseudo} suit ${player.pseudo} dans la mort (lien Entremetteur).`
      });
      await patchMeta(linkedId, { linked_with: null });
      await killPlayer(gameId, linkedId, "lien_amoureux");
    }
  }
  const { data: vengeurRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "vengeur").maybeSingle();
  const vengeur = vengeurRow;
  if (vengeur && vengeur.is_alive && meta(vengeur).etre_cher === playerId) {
    await patchMeta(vengeur.id, { kill_unlocked: true });
    const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
    await grantItem2(
      vengeur.id,
      buildItem2("couteau", {
        from: "Vengeance",
        originFaction: "Civil",
        descriptionOverride: "Ton \xEAtre cher est tomb\xE9. Utilise ce couteau pour te venger une seule fois."
      })
    );
    await notify({
      gameId,
      playerId: vengeur.id,
      type: "vengeance",
      title: "\u2694\uFE0F Vengeance",
      body: "Ton \xEAtre cher n'est plus. Un couteau appara\xEEt dans ton inventaire.",
      mjTitle: "\u2694\uFE0F Vengeance",
      mjBody: `${vengeur.pseudo} (Vengeur) re\xE7oit un couteau : son \xEAtre cher (${player.pseudo}) est mort.`
    });
  }
  if (await isGenericMechantKiller(player.role_slug)) {
    const wasTemp = meta(player).temp_promotion === true;
    await promoteAcolyteToTueur(
      gameId,
      /* temporary */
      wasTemp
    );
  }
  if (player.role_slug === "stratege") {
    await promoteAcolyteToStratege(
      gameId,
      /* temporary */
      false,
      meta(player)
    );
  }
  if (player.role_slug === "vampire") {
    const wasTemp = meta(player).temp_promotion === true;
    await promoteVampireHeir(gameId, player.id, wasTemp);
  }
  void reason;
}
async function flushPendingDeaths(gameId) {
  const { data: g } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const tour = g?.current_tour ?? 1;
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId).eq("is_alive", true);
  const pending = (ps ?? []).filter((p) => {
    const m = meta(p);
    return !!m.pending_death;
  });
  const { count: deathCount } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("game_id", gameId).eq("type", "death").contains("payload", { tour });
  if (pending.length === 0 && (deathCount ?? 0) === 0) {
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: "\u{1F305} Annonce",
      body: "Aucune mort \xE0 ce tour.",
      payload: { tour, deaths: 0 }
    });
    await checkAndEndGame(gameId);
    return;
  }
  for (const player of pending) {
    const m = meta(player);
    const pd = m.pending_death ?? null;
    const reason = pd?.reason ?? "engine";
    const cleaned = m.cleaned === true;
    await supabase.from("players").update({ is_alive: false }).eq("id", player.id);
    await patchMeta(player.id, { pending_death: null });
    emit("kill", `\u{1F480} ${player.pseudo} confirm\xE9 mort (${reason})`, { playerId: player.id, reason });
    const { data: roleInfo } = await supabase.from("roles").select("faction").eq("slug", player.role_slug ?? "").maybeSingle();
    const realFaction = roleInfo?.faction ?? "inconnue";
    const announcedFaction = cleaned ? "inconnue" : realFaction;
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: `\u{1F305} Annonce \u2014 ${player.pseudo}`,
      body: `${player.pseudo} a \xE9t\xE9 retrouv\xE9 sans vie. Faction : ${announcedFaction}.`,
      payload: { tour, target_id: player.id, reason, faction: announcedFaction, cleaned }
    });
    await runDeathCascades(gameId, player, reason, tour);
  }
  await checkAndEndGame(gameId);
}
async function isGenericMechantKiller(slug) {
  if (!slug || slug === "stratege") return false;
  const { data } = await supabase.from("roles").select("faction, type, is_killer_class").eq("slug", slug).maybeSingle();
  const r = data;
  return !!r && r.faction === "M\xE9chant" && isKillerClass(r);
}
async function promoteAcolyteToTueur(gameId, temporary) {
  const { data: aco } = await supabase.from("players").select().eq("game_id", gameId).eq("is_alive", true).eq("is_imprisoned", false);
  const acolytes = (aco ?? []).filter((x) => {
    const mx = meta(x);
    return x.role_slug && x.role_slug !== "tueur" && mx.original_slug == null;
  });
  if (!acolytes.length) return;
  const { data: rs } = await supabase.from("roles").select("slug, type, faction, is_killer_class").in(
    "slug",
    acolytes.map((a) => a.role_slug ?? "")
  );
  const acoInfo = new Map((rs ?? []).map((r) => [r.slug, r]));
  const realAcolytes = acolytes.filter((a) => {
    const info = acoInfo.get(a.role_slug ?? "");
    return info && info.faction === "M\xE9chant" && !isKillerClass(info);
  });
  const heir = realAcolytes[Math.floor(Math.random() * realAcolytes.length)];
  if (!heir) return;
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "tueur" }).eq("id", heir.id);
  await patchMeta(heir.id, {
    promoted_from_acolyte: true,
    original_slug: originalSlug,
    temp_promotion: temporary
  });
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession",
    title: temporary ? "\u{1F52A} Tu deviens le Tueur (temporaire)" : "\u{1F52A} Tu es le nouveau Tueur",
    body: temporary ? "Le Tueur est en prison, tu prends le relais." : "Le pr\xE9c\xE9dent est tomb\xE9.",
    mjTitle: "\u{1F52A} Succession Tueur",
    mjBody: `${heir.pseudo} devient ${temporary ? "Tueur temporaire" : "le nouveau Tueur"} (succession Acolyte).`
  });
}
async function revertTempPromotion(gameId) {
  const { data: promoted } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "tueur");
  for (const p of promoted ?? []) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug === "string") {
      const original = mp.original_slug;
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        promoted_from_acolyte: null,
        original_slug: null,
        temp_promotion: null
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "\u21A9\uFE0F Tu reprends ton r\xF4le",
        body: "Le Tueur est de retour, tu retrouves ta capacit\xE9.",
        mjTitle: "\u21A9\uFE0F Succession annul\xE9e",
        mjBody: `${p.pseudo} retrouve son r\xF4le d'origine (Tueur lib\xE9r\xE9).`
      });
    }
  }
}
async function promoteVampireHeir(gameId, absentVampireId, temporary = false) {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId).eq("is_alive", true).eq("is_imprisoned", false);
  const candidates = (ps ?? []).filter((p) => {
    if (p.id === absentVampireId) return false;
    if (p.role_slug === "vampire") return false;
    return meta(p).converted === true;
  });
  if (!candidates.length) return;
  const heir = candidates[Math.floor(Math.random() * candidates.length)];
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "vampire" }).eq("id", heir.id);
  await patchMeta(heir.id, {
    vampire_heir: true,
    original_slug_before_vampire: originalSlug,
    converted: null,
    temp_promotion: temporary ? true : null
  });
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession",
    title: temporary ? "\u{1F9DB} Tu deviens le Vampire (temporaire)" : "\u{1F9DB} Tu deviens le Vampire",
    body: temporary ? "Le Vampire est en prison, tu prends le relais et h\xE9rite de sa capacit\xE9 de morsure." : "Le Vampire est mort. Tu h\xE9rites de sa capacit\xE9 de morsure.",
    mjTitle: "\u{1F9DB} Succession Vampire",
    mjBody: `${heir.pseudo} ${temporary ? "h\xE9rite temporairement de" : "h\xE9rite de"} la capacit\xE9 de morsure du Vampire.`
  });
}
async function revertTempVampirePromotion(gameId) {
  const { data: promoted } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "vampire");
  for (const p of promoted ?? []) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug_before_vampire === "string") {
      const original = mp.original_slug_before_vampire;
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        vampire_heir: null,
        original_slug_before_vampire: null,
        temp_promotion: null,
        converted: true
        // reste membre du clan vampire
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "\u21A9\uFE0F Tu reprends ton r\xF4le",
        body: "Le Vampire est de retour, tu retrouves ton r\xF4le d'origine (tu restes membre du clan).",
        mjTitle: "\u21A9\uFE0F Succession Vampire annul\xE9e",
        mjBody: `${p.pseudo} retrouve son r\xF4le d'origine (Vampire lib\xE9r\xE9).`
      });
    }
  }
}
async function applyVampireConversion(gameId, vampireId, targetId, tour) {
  const { data: tgtRow } = await supabase.from("players").select("role_meta, pseudo").eq("id", targetId).single();
  const tMeta = tgtRow?.role_meta ?? {};
  if (tMeta.converted === true) return false;
  const tPseudo = tgtRow?.pseudo ?? "?";
  await patchMeta(targetId, { converted: true, converted_by: vampireId, converted_cycle: tour });
  await notify({
    gameId,
    playerId: targetId,
    type: "converted",
    title: "\u{1F9DB} Morsure de vampire",
    body: "Tu rejoins les Vampires. Tu connais les autres vampires.",
    mjTitle: "\u{1F9DB} Conversion Vampire",
    mjBody: `${tPseudo} rejoint les Vampires.`
  });
  const { data: ps } = await supabase.from("players").select("id, pseudo, role_slug, role_meta").eq("game_id", gameId).eq("is_alive", true);
  const clan = (ps ?? []).filter(
    (p) => p.id !== targetId && (p.role_slug === "vampire" || p.role_meta?.converted === true)
  );
  for (const v of clan) {
    await notify({
      gameId,
      playerId: v.id,
      type: "vampire_clan",
      title: "\u{1F9DB} Nouveau vampire",
      body: `${tPseudo} rejoint le clan.`,
      mjTitle: "\u{1F9DB} Clan vampire",
      mjBody: `${v.pseudo} est notifi\xE9 de l'arriv\xE9e de ${tPseudo}.`
    });
  }
  if (clan.length > 0) {
    await notify({
      gameId,
      playerId: targetId,
      type: "vampire_clan_list",
      title: "\u{1F9DB} Ton clan",
      body: clan.map((v) => v.pseudo).join(", "),
      mjTitle: "\u{1F9DB} Liste clan",
      mjBody: `${tPseudo} re\xE7oit la liste : ${clan.map((v) => v.pseudo).join(", ")}.`
    });
  }
  const { data: allP } = await supabase.from("players").select("id, pseudo, role_slug, role_meta, is_alive, is_mj").eq("game_id", gameId);
  const allPlayers = allP ?? [];
  const chasseurEverExisted = allPlayers.some((p) => p.role_slug === "chasseur_de_vampire");
  if (!chasseurEverExisted) {
    await notifyMJ({
      gameId,
      type: "mj_announce",
      title: "\u{1F9DB} 1\xE8re morsure",
      body: "Un joueur vient d'\xEAtre mordu \u2014 un Chasseur de Vampire \xE9merge."
    });
    const { data: rs } = await supabase.from("roles").select("slug, faction, type, is_special").eq("set_id", "set1");
    const roleBySlug = new Map(
      (rs ?? []).map((r) => [r.slug, r])
    );
    const candidates = allPlayers.filter((p) => {
      if (!p.is_alive || p.is_mj || p.id === targetId || p.id === vampireId) return false;
      if (p.role_meta?.converted === true) return false;
      const r = roleBySlug.get(p.role_slug ?? "");
      return r?.faction === "Civil" && !r?.is_special;
    });
    const pick2 = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick2) {
      await supabase.from("players").update({ role_slug: "chasseur_de_vampire" }).eq("id", pick2.id);
      await patchMeta(pick2.id, { chasseur_awakened_cycle: tour });
      await notify({
        gameId,
        playerId: pick2.id,
        type: "role_swap",
        title: "\u{1FA78} Tu sens l'appel",
        body: "Tu deviens Chasseur de Vampire. Traque-les avant qu'il ne soit trop tard.",
        mjTitle: "\u{1FA78} Chasseur \xE9merge",
        mjBody: `${pick2.pseudo} devient Chasseur de Vampire (choix al\xE9atoire, 1\xE8re morsure).`
      });
    }
  }
  await checkAndEndGame(gameId);
  return true;
}
async function promoteAcolyteToStratege(gameId, temporary, sourceMeta) {
  const { data: aco } = await supabase.from("players").select().eq("game_id", gameId).eq("is_alive", true).eq("is_imprisoned", false);
  const acolytes = (aco ?? []).filter((x) => {
    const mx = meta(x);
    return x.role_slug && x.role_slug !== "stratege" && x.role_slug !== "tueur" && mx.original_slug == null;
  });
  if (!acolytes.length) return;
  const { data: rs } = await supabase.from("roles").select("slug, type, faction").in(
    "slug",
    acolytes.map((a) => a.role_slug ?? "")
  );
  const acoInfo = new Map(
    (rs ?? []).map((r) => [r.slug, r])
  );
  const realAcolytes = acolytes.filter((a) => {
    const info = acoInfo.get(a.role_slug ?? "");
    return info && info.faction === "M\xE9chant";
  });
  const heir = realAcolytes[Math.floor(Math.random() * realAcolytes.length)];
  if (!heir) return;
  const originalSlug = heir.role_slug;
  await supabase.from("players").update({ role_slug: "stratege" }).eq("id", heir.id);
  const heirMetaPatch = {
    promoted_from_acolyte: true,
    original_slug: originalSlug,
    temp_promotion: temporary,
    stratege_last_mode: sourceMeta.stratege_last_mode ?? null,
    stratege_last_mode_tour: sourceMeta.stratege_last_mode_tour ?? null
  };
  await patchMeta(heir.id, heirMetaPatch);
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession_stratege",
    title: temporary ? "\u265F\uFE0F Tu deviens le Strat\xE8ge (temporaire)" : "\u265F\uFE0F Tu es le nouveau Strat\xE8ge",
    body: temporary ? "Le Strat\xE8ge est en prison, tu prends le relais : chaque Enqu\xEAte, choisis 1 de ses 3 modes." : "Le Strat\xE8ge est tomb\xE9. Tu reprends son r\xF4le : chaque Enqu\xEAte, choisis 1 de ses 3 modes (Discr\xE9tion, Bain de sang, Sabotage).",
    mjTitle: "\u265F\uFE0F Succession Strat\xE8ge",
    mjBody: `${heir.pseudo} devient ${temporary ? "Strat\xE8ge temporaire" : "le nouveau Strat\xE8ge"} (succession Acolyte).`
  });
}
async function revertTempStrategePromotion(gameId) {
  const { data: promoted } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "stratege");
  for (const p of promoted ?? []) {
    const mp = meta(p);
    if (mp.temp_promotion === true && typeof mp.original_slug === "string") {
      const original = mp.original_slug;
      await supabase.from("players").update({ role_slug: original }).eq("id", p.id);
      await patchMeta(p.id, {
        promoted_from_acolyte: null,
        original_slug: null,
        temp_promotion: null,
        stratege_last_mode: null,
        stratege_last_mode_tour: null
      });
      await notify({
        gameId,
        playerId: p.id,
        type: "succession_end",
        title: "\u21A9\uFE0F Tu reprends ton r\xF4le",
        body: "Le Strat\xE8ge est de retour, tu retrouves ta capacit\xE9 d'origine.",
        mjTitle: "\u21A9\uFE0F Succession Strat\xE8ge annul\xE9e",
        mjBody: `${p.pseudo} retrouve son r\xF4le d'origine (Strat\xE8ge lib\xE9r\xE9).`
      });
    }
  }
}
async function imprisonPlayer(gameId, playerId, reason = "vote") {
  const { data: p } = await supabase.from("players").select("pseudo, role_meta, role_slug").eq("id", playerId).single();
  const m = meta(p);
  if (m.immortal === true) {
    emit("imprison_blocked", `${p?.pseudo} est immortel`, {
      playerId
    });
    return false;
  }
  await supabase.from("players").update({ is_imprisoned: true }).eq("id", playerId);
  const { data: gg } = await supabase.from("games").select("current_tour").eq("id", gameId).single();
  const curTour = gg?.current_tour ?? 1;
  await patchMeta(playerId, { imprisoned_since_cycle: curTour });
  emit("imprison", `\u{1F512} ${p?.pseudo} emprisonn\xE9 (${reason})`, {
    playerId,
    reason
  });
  const prisonerName = p?.pseudo ?? "?";
  await notify({
    gameId,
    playerId,
    type: "imprisoned",
    title: "\u{1F512} Tu es en prison",
    body: `Cause : ${reason}`,
    mjTitle: "\u{1F512} Emprisonnement",
    mjBody: `${prisonerName} est emprisonn\xE9 (cause : ${reason}).`
  });
  if (await isGenericMechantKiller(p?.role_slug)) {
    await promoteAcolyteToTueur(gameId, true);
  }
  if (p?.role_slug === "stratege" && m.temp_promotion !== true) {
    await promoteAcolyteToStratege(gameId, true, m);
  }
  if (p?.role_slug === "vampire") {
    await promoteVampireHeir(gameId, playerId, true);
  }
  {
    const { data: vengeurRow } = await supabase.from("players").select().eq("game_id", gameId).eq("role_slug", "vengeur").maybeSingle();
    const vengeur = vengeurRow;
    if (vengeur && vengeur.is_alive && !vengeur.is_imprisoned) {
      const vm = meta(vengeur);
      if (vm.etre_cher === playerId && vm.kill_unlocked !== true) {
        await patchMeta(vengeur.id, { kill_unlocked: true });
        const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
        await grantItem2(
          vengeur.id,
          buildItem2("couteau", {
            from: "Vengeance",
            originFaction: "Civil",
            descriptionOverride: "Ton \xEAtre cher est emprisonn\xE9. Utilise ce couteau pour te venger une seule fois."
          })
        );
        await notify({
          gameId,
          playerId: vengeur.id,
          type: "vengeance",
          title: "\u2694\uFE0F Vengeance",
          body: `Ton \xEAtre cher (${prisonerName}) a \xE9t\xE9 emprisonn\xE9. Un couteau appara\xEEt dans ton inventaire.`,
          mjTitle: "\u2694\uFE0F Vengeance",
          mjBody: `${vengeur.pseudo} (Vengeur) re\xE7oit un couteau : son \xEAtre cher (${prisonerName}) est emprisonn\xE9.`
        });
      }
    }
  }
  await checkAndEndGame(gameId);
  return true;
}
async function releasePlayer(gameId, playerId) {
  const { data: p } = await supabase.from("players").select("pseudo, role_slug, role_meta").eq("id", playerId).single();
  await supabase.from("players").update({ is_imprisoned: false }).eq("id", playerId);
  emit("release", `\u{1F513} ${p?.pseudo} lib\xE9r\xE9`, { playerId });
  const pm = meta(p);
  if (await isGenericMechantKiller(p?.role_slug) && pm.temp_promotion !== true) {
    await revertTempPromotion(gameId);
  }
  if (p?.role_slug === "stratege" && pm.temp_promotion !== true) {
    await revertTempStrategePromotion(gameId);
  }
  if (p?.role_slug === "vampire" && pm.temp_promotion !== true) {
    await revertTempVampirePromotion(gameId);
  }
}
async function logCapability(opts) {
  await supabase.from("role_actions").insert({
    game_id: opts.gameId,
    actor_player_id: opts.actorId,
    target_player_id: opts.targetId ?? null,
    target_player_id_2: opts.targetId2 ?? null,
    tour: opts.tour,
    phase: opts.phase,
    payload: opts.payload ?? {}
  });
  emit("capability", "\u26A1 Capacit\xE9 utilis\xE9e", opts);
}
async function executeCapability(opts) {
  const role = opts.role;
  if (!role) return { ok: false, message: "R\xF4le inconnu" };
  const slug = role.slug;
  const t1 = opts.targets[0];
  const t2 = opts.targets[1];
  const { data: actorFresh } = await supabase.from("players").select().eq("id", opts.actor.id).single();
  const actor = actorFresh ?? opts.actor;
  if (!actor.is_alive) return { ok: false, message: "Tu n'es plus en vie." };
  if (actor.is_imprisoned) return { ok: false, message: "Tu es en prison." };
  const m = meta(actor);
  const { data: gameRow } = await supabase.from("games").select("current_phase, status").eq("id", opts.gameId).single();
  const gp = gameRow;
  if (!gp || gp.status === "ended") return { ok: false, message: "Partie termin\xE9e." };
  if (!allowedActivePhases(role).has(gp.current_phase)) {
    return { ok: false, message: "\xC0 utiliser en Enqu\xEAte." };
  }
  const playerCount = opts.allPlayers.filter((p) => !p.is_mj).length;
  const blocked = whyCannotUse(role, m, opts.tour, playerCount, gp.current_phase);
  const isPuppetCall = opts.extra?.__puppet_call === true && m.manipulated_by === opts.extra?.__puppeteer_id && m.manipulated_tour === opts.tour;
  if (blocked && role.phase_activation !== "Permanent" && !(isPuppetCall && blocked === "Capacit\xE9 bloqu\xE9e")) {
    return { ok: false, message: blocked };
  }
  const log = (payload = {}) => logCapability({
    gameId: opts.gameId,
    actorId: actor.id,
    targetId: t1?.id,
    targetId2: t2?.id,
    tour: opts.tour,
    phase: opts.phase,
    payload: { role: slug, ...payload }
  });
  const used = async (extra = {}) => {
    await markUsage(actor, role, opts.tour);
    await log(extra);
  };
  const dispatchResult = await (async () => {
    switch (slug) {
      // ── Guetteur : choisit une cible et consulte son journal de visiteurs ──
      case "guetteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu dois surveiller un autre joueur." };
        if (isFalsified(meta(t1))) {
          await used({ effect: "guetteur_watch_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const history = {
          ...m.guetteur_watch_history ?? {},
          [String(opts.tour)]: { target_id: t1.id, target_pseudo: t1.pseudo }
        };
        await used({ effect: "guetteur_watch", target: t1.id });
        await patchMeta(actor.id, { guetteur_watch_history: history });
        return { ok: true, message: `Tu surveilles ${t1.pseudo} pour ce tour.` };
      }
      // ── Kill direct ──
      case "tueur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const { data: acolytes } = await supabase.from("players").select("id, role_slug").eq("game_id", opts.gameId).eq("is_alive", true);
        const teammates = (acolytes ?? []).filter(
          (p) => p.id !== actor.id && opts.rolesBySlug.get(p.role_slug ?? "")?.faction === "M\xE9chant"
        );
        for (const tm of teammates) {
          await notify({
            gameId: opts.gameId,
            playerId: tm.id,
            type: "killer_targeted",
            title: "\u{1F3AF} Le Tueur a cibl\xE9",
            body: `${t1.pseudo} est la cible de cette nuit.`
          });
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:tueur",
          payload: { kill_reason: "tueur", target_pseudo: t1.pseudo, mechant_mechanic: true }
        });
        await used({ effect: "kill_intent", target: t1.id });
        return { ok: true, pending: true, message: `D\xE9nouement \xE0 l'Annonce.` };
      }
      case "vengeur": {
        if (m.kill_unlocked === true) {
          return {
            ok: false,
            message: "Vengeance d\xE9bloqu\xE9e \u2014 utilise ton couteau depuis l'inventaire."
          };
        }
        return {
          ok: false,
          message: "Capacit\xE9 passive \u2014 si ton \xEAtre cher meurt, un couteau appara\xEEt dans ton inventaire."
        };
      }
      case "executeur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_imprisoned) return { ok: false, message: "Cible non emprisonn\xE9e" };
        const tMeta = meta(t1);
        const since = tMeta.imprisoned_since_cycle ?? opts.tour;
        if (opts.tour - since < 1)
          return { ok: false, message: "Attends qu'elle ait pass\xE9 1 tour complet en prison." };
        const ok = await killPlayer(opts.gameId, t1.id, "ex\xE9cution");
        const execRole = opts.rolesBySlug.get(t1.role_slug ?? "");
        const roleLabel = execRole ? `${execRole.icon} ${execRole.name_fr}` : "r\xF4le inconnu";
        if (ok) {
          const { data: allP } = await supabase.from("players").select("id").eq("game_id", opts.gameId);
          const rows = (allP ?? []).map((row) => ({
            game_id: opts.gameId,
            player_id: row.id,
            type: "execution_reveal",
            title: `\u2696\uFE0F Ex\xE9cution de ${t1.pseudo}`,
            body: `R\xF4le r\xE9v\xE9l\xE9 : ${roleLabel}${execRole ? ` \u2014 ${execRole.faction}` : ""}.`,
            payload: {
              target_id: t1.id,
              role_slug: t1.role_slug,
              faction: execRole?.faction ?? null,
              tour: opts.tour
            }
          }));
          if (rows.length) await supabase.from("notifications").insert(rows);
        }
        await used({ effect: "execute", revealed_slug: t1.role_slug });
        return { ok, message: ok ? `${t1.pseudo} ex\xE9cut\xE9 \u2014 ${roleLabel}` : "\xC9chec" };
      }
      // ── Cuisinier : passif (couteau au setup, aucune action active) ──
      case "cuisinier": {
        return {
          ok: false,
          message: "Capacit\xE9 passive \u2014 utilise ton couteau depuis l'inventaire."
        };
      }
      // ── Armurier : 1×/Enquête. Remet anonymement un couteau à un joueur vivant.
      // Le porteur ignore l'identité du donneur. Le kill par couteau est résolu au
      // à la prochaine Annonce (mécanique standard de l'objet couteau).
      case "armurier": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_alive) return { ok: false, message: "Cible morte" };
        const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
        await grantItem2(
          t1.id,
          buildItem2("couteau", {
            from: "Inconnu",
            originFaction: "M\xE9chant",
            nameOverride: "Couteau de l'Armurier",
            descriptionOverride: "Un couteau anonyme remis par l'Armurier appara\xEEt dans ton inventaire. Tu peux l'utiliser une fois pour tuer un joueur \u2014 r\xE9solu \xE0 la prochaine Annonce.",
            // `gifted_by_id` : permet de notifier l'Armurier quand SON couteau est
            // utilisé (cf. useItem, case "couteau"). Reste invisible au porteur.
            payload: {
              mechant_origin: true,
              gifted_by_id: actor.id,
              gifted_by_pseudo: actor.pseudo
            }
          })
        );
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "anon_gift",
          title: "\u{1F5E1}\uFE0F Un couteau appara\xEEt",
          body: "Tu trouves un couteau dans ton inventaire. Tu ignores qui te l'a remis. Utilisable une fois pour tuer.",
          mjTitle: "\u{1F5E1}\uFE0F Armurier \u2014 livraison",
          mjBody: `${actor.pseudo} (Armurier) remet anonymement un couteau \xE0 ${t1.pseudo}.`
        });
        await used({ effect: "armurier_gift", target_pseudo: t1.pseudo });
        return { ok: true, message: `Un couteau a \xE9t\xE9 remis anonymement \xE0 ${t1.pseudo}.` };
      }
      // ── Empoisonneur : 1×/Enquête. Malédiction permanente, NON LÉTALE.
      // Victoire = tous les survivants hors prison sont empoisonnés.
      case "empoisonneur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const poisoned = m.poisoned_targets ?? [];
        if (!poisoned.includes(t1.id)) {
          await patchMeta(actor.id, { poisoned_targets: [...poisoned, t1.id] });
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          // CASCADE = layer 3 : résolu APRÈS les attaques. Annulé si l'Empoisonneur
          // meurt ce tour (symétrie Vampire) ; bloqué si la cible est protégée.
          category: "CASCADE",
          timing: "DEFERRED",
          source: "role:empoisonneur",
          payload: { sub_effect: "poison_curse", target_pseudo: t1.pseudo }
        });
        await used({ effect: "poison_curse" });
        return { ok: true, pending: true, message: `D\xE9nouement \xE0 l'Annonce.` };
      }
      // ── Vampire (conversion) ──
      case "vampire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tRole = opts.rolesBySlug.get(t1.role_slug ?? "");
        if (tRole?.slug === "vampire" || meta(t1).converted === true) {
          return { ok: false, message: "D\xE9j\xE0 vampire" };
        }
        if (tRole?.slug === "chasseur_de_vampire") {
          await used({ effect: "bite_blocked_chasseur", target: t1.id });
          return {
            ok: false,
            message: "Le Chasseur de Vampire est immunis\xE9 \u2014 ta morsure est perdue."
          };
        }
        if (await tryBlessingBlock({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actor: { id: actor.id, pseudo: actor.pseudo },
          actorRole: {
            faction: role.faction,
            type: role.type ?? null,
            is_hostile: role.is_hostile
          },
          target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
          actionLabel: "morsure vampire"
        }))
          return { ok: false, message: `${t1.pseudo} est sous b\xE9n\xE9diction \u2014 morsure annul\xE9e.` };
        await used({ effect: "bite" });
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "CONVERT",
          timing: "DEFERRED",
          source: "role:vampire",
          payload: { target_pseudo: t1.pseudo }
        });
        return {
          ok: true,
          message: `Morsure sur ${t1.pseudo} \u2014 \xE0 l'Annonce`
        };
      }
      case "chasseur_de_vampire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const isVamp = t1.role_slug === "vampire" || meta(t1).converted === true;
        if (isVamp) {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: t1.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:chasseur_de_vampire",
            payload: { kill_reason: "chasseur_de_vampire", target_pseudo: t1.pseudo }
          });
        }
        await used({ effect: "track", isVampire: isVamp });
        return {
          ok: true,
          message: isVamp ? `\u{1F534} ${t1.pseudo} EST un vampire \u2014 ex\xE9cution \xE0 l'Annonce` : `\u{1F7E2} ${t1.pseudo} n'est pas un vampire`,
          reveal: { isVampire: isVamp }
        };
      }
      // ── Investigations ──
      // Détective & Assistant : trio par TYPE inter-faction.
      // On révèle le vrai rôle + 2 leurres de type compatible (toutes factions
      // confondues selon le mapping). L'Assistant du détective est le SEUL rôle à
      // percer les déguisements : le Tueur ressort sous son VRAI rôle (pas de
      // camouflage Citoyen) et l'Usurpateur sous son VRAI rôle (cover_slug ignorée).
      // Seule la Falsification l'aveugle (message dédié).
      case "assistant_du_detective": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const target = opts.allPlayers.find((p) => p.id === t1.id);
        const tMeta = meta(target);
        if (isFalsified(tMeta)) {
          await used({ effect: "investigate_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const trueSlug = target?.role_slug ?? "";
        const trueRole = opts.rolesBySlug.get(trueSlug);
        const trueName = trueRole?.name_fr ?? "Citoyen";
        const compatible = (a, b) => {
          if (a.faction === b.faction && a.type === b.type) return true;
          if (a.type === "INVESTIGATION" && b.type === "INVESTIGATION") return true;
          if (a.type === "SUPPORT") {
            if (b.type === "SUPPORT") return true;
            if (b.faction === "Neutre" && (b.type === "B\xC9NIN" || b.type === "CHAOS")) return true;
          }
          if (a.type === "PROTECTEUR") {
            if (b.type === "PROTECTEUR") return true;
            if (b.faction === "Neutre" && b.type === "B\xC9NIN") return true;
          }
          if (a.type === "TUEUR") {
            if (b.type === "TUEUR") return true;
            if (b.faction === "Neutre" && b.type === "MAL") return true;
          }
          if (a.type === "TROMPERIE") {
            if (b.type === "TROMPERIE") return true;
            if (b.faction === "Neutre" && (b.type === "MAL" || b.type === "CHAOS")) return true;
          }
          if (a.faction === "Neutre") {
            if (a.type === "MAL" && (b.type === "TUEUR" || b.type === "TROMPERIE")) return true;
            if (a.type === "CHAOS" && (b.type === "TROMPERIE" || b.type === "SUPPORT")) return true;
            if (a.type === "B\xC9NIN" && (b.type === "PROTECTEUR" || b.type === "SUPPORT"))
              return true;
          }
          return false;
        };
        const EXCLUDED_SLUGS = /* @__PURE__ */ new Set(["detective", "assistant_du_detective"]);
        const isPickable = (r) => !EXCLUDED_SLUGS.has(r.slug) && !r.is_special && !r.emergent;
        const targetFT = {
          faction: trueRole?.faction ?? "Civil",
          type: trueRole?.type ?? "SUPPORT"
        };
        const allRoles = Array.from(opts.rolesBySlug.values()).filter(
          (r) => r.slug !== trueSlug && isPickable(r)
        );
        let decoyPool = allRoles.filter(
          (r) => compatible(targetFT, { faction: r.faction, type: r.type })
        );
        if (decoyPool.length < 2) {
          const extra = allRoles.filter(
            (r) => r.faction === targetFT.faction && !decoyPool.includes(r)
          );
          decoyPool = [...decoyPool, ...extra];
        }
        if (decoyPool.length < 2) {
          const extra = allRoles.filter((r) => !decoyPool.includes(r));
          decoyPool = [...decoyPool, ...extra];
        }
        const sameFaction = decoyPool.filter((r) => r.faction === targetFT.faction);
        const otherFaction = decoyPool.filter((r) => r.faction !== targetFT.faction);
        const shuffledSame = shuffle2(sameFaction);
        const shuffledOther = shuffle2(otherFaction);
        let picked = [];
        const wantMajority = Math.random() < 0.6;
        if (wantMajority && shuffledSame.length >= 1 && shuffledOther.length >= 1) {
          picked = [shuffledSame[0], shuffledOther[0]];
        } else if (!wantMajority && shuffledOther.length >= 2) {
          picked = [shuffledOther[0], shuffledOther[1]];
        } else if (shuffledSame.length >= 1 && shuffledOther.length >= 1) {
          picked = [shuffledSame[0], shuffledOther[0]];
        } else if (shuffledOther.length >= 2) {
          picked = [shuffledOther[0], shuffledOther[1]];
        } else {
          const anyOther = allRoles.filter((r) => r.faction !== targetFT.faction);
          if (shuffledSame.length >= 1 && anyOther.length >= 1) {
            picked = [shuffledSame[0], shuffle2(anyOther)[0]];
          } else {
            picked = shuffle2(decoyPool).slice(0, 2);
          }
        }
        const decoys = picked.map((r) => r.name_fr);
        const trio = shuffle2([trueName, ...decoys]);
        await used({ effect: "investigate_trio", trio });
        return { ok: true, message: `Trio : ${trio.join(" \xB7 ")}`, reveal: { trio } };
      }
      case "boussole": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const m1 = meta(t1), m2 = meta(t2);
        if (isFalsified(m1) || isFalsified(m2)) {
          await used({ effect: "compare_falsified", t1: t1.id, t2: t2.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const f1 = apparentFaction(t1.role_slug, m1, opts.rolesBySlug);
        const f2 = apparentFaction(t2.role_slug, m2, opts.rolesBySlug);
        const same = f1 === f2;
        await used({ effect: "compare", same });
        return { ok: true, message: same ? "M\xEAme camp" : "Camps oppos\xE9s", reveal: { same } };
      }
      // ── Protections ──
      case "majordome": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const { data: existingProtect } = await supabase.from("role_actions").select("id").eq("game_id", opts.gameId).eq("actor_player_id", actor.id).eq("tour", opts.tour).eq("source", "role:majordome").eq("category", "PROTECT").limit(1).maybeSingle();
        if (existingProtect) {
          return { ok: true, message: `${t1.pseudo} : protection d\xE9j\xE0 en place \u2014 \xE0 l'Annonce` };
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:majordome",
          payload: { target_pseudo: t1.pseudo }
        });
        await used({ effect: "butler_intent", target: t1.id });
        await notifyMJ({
          gameId: opts.gameId,
          type: "protected",
          title: "\u{1F6E1}\uFE0F Protection Majordome",
          body: `${actor.pseudo} (Majordome) prot\xE8ge ${t1.pseudo} \u2014 r\xE9solu \xE0 l'Annonce.`
        });
        return { ok: true, message: `${t1.pseudo} : protection \u2014 \xE0 l'Annonce` };
      }
      case "babysitter": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const c = opts.tour + 1;
        await submitIntent({
          gameId: opts.gameId,
          tour: c,
          phase: opts.phase,
          actorId: actor.id,
          targetId: t1.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:babysitter",
          payload: { target_pseudo: t1.pseudo, blocks_next_tour: true }
        });
        await patchMeta(t1.id, { blocked_until_cycle: c, blocked_from_cycle: c });
        await used({ effect: "babysit_intent" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "babysat",
          title: "\u{1F9F8} Babysitter",
          body: "Au prochain tour, tu seras \xE0 l'abri de la mort mais ta capacit\xE9 sera bloqu\xE9e.",
          mjTitle: "\u{1F9F8} Babysitter",
          mjBody: `${actor.pseudo} (Babysitter) gardera ${t1.pseudo} au prochain tour.`
        });
        return { ok: true, message: `${t1.pseudo} gard\xE9 au prochain tour` };
      }
      case "ange_gardien": {
        const target = m.ward ?? t1?.id;
        if (!target) return { ok: false, message: "Cible requise" };
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: target,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:ange_gardien"
        });
        await used({ effect: "shield_intent", target });
        return { ok: true, message: "Bouclier \u2014 \xE0 l'Annonce" };
      }
      case "paranoiaque": {
        const targetId = m.paranoid_target_id;
        if (!targetId) return { ok: false, message: "Aucune cible assign\xE9e" };
        const target = opts.allPlayers.find((p) => p.id === targetId);
        if (!target) return { ok: false, message: "Cible introuvable" };
        if (!target.is_alive) return { ok: false, message: "Ta cible est d\xE9j\xE0 morte" };
        const choice = opts.extra?.choice ?? null;
        if (choice !== "protect" && choice !== "kill") {
          return { ok: false, message: "Choisis : prot\xE9ger ou tuer" };
        }
        if (choice === "protect") {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: target.id,
            category: "PROTECT",
            timing: "DEFERRED",
            source: "role:paranoiaque"
          });
          await used({ effect: "paranoid_protect", target: target.id });
          return { ok: true, message: `Tu prot\xE8ges ${target.pseudo} \xE0 l'Annonce` };
        } else {
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: target.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:paranoiaque",
            payload: { kill_reason: "paranoiaque", target_pseudo: target.pseudo }
          });
          await used({ effect: "paranoid_kill", target: target.id });
          return { ok: true, message: `Tu attaques ${target.pseudo} \xE0 l'Annonce` };
        }
      }
      case "saint": {
        const target = t1 ?? actor;
        if (m.saint_used === true) {
          return { ok: false, message: "B\xE9n\xE9diction d\xE9j\xE0 utilis\xE9e." };
        }
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: target.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:saint",
          payload: { blessed: true }
        });
        await patchMeta(target.id, {
          blessed_until_cycle: opts.tour + 2,
          blessed_until_phase: opts.phase,
          blessed_by_saint: true,
          blessed_by_saint_id: actor.id
        });
        await patchMeta(actor.id, {
          saint_used: true,
          saint_target_id: target.id,
          saint_target_pseudo: target.pseudo,
          saint_blessed_at_tour: opts.tour,
          saint_blessed_at_phase: opts.phase
        });
        await used({ effect: "bless_intent" });
        return {
          ok: true,
          message: `${target.pseudo} b\xE9ni \u2014 protection pendant 2 tours complets.`
        };
      }
      // ── Acolytes / Manipulation ──
      case "marionnettiste": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.role_slug === "tueur") return { ok: false, message: "Refus\xE9 : cible = Tueur" };
        if (await tryBlessingBlock({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actor: { id: actor.id, pseudo: actor.pseudo },
          actorRole: {
            faction: role.faction,
            type: role.type ?? null,
            is_hostile: role.is_hostile
          },
          target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
          actionLabel: "manipulation marionnette"
        }))
          return {
            ok: false,
            message: `${t1.pseudo} est sous b\xE9n\xE9diction \u2014 manipulation annul\xE9e.`
          };
        await patchMeta(actor.id, {
          puppet_id: t1.id,
          puppet_pseudo: t1.pseudo,
          puppet_active_tour: opts.tour + 1
        });
        await used({ effect: "puppet_schedule", target: t1.id });
        return {
          ok: true,
          message: `Au prochain tour, tu prendras le contr\xF4le de la capacit\xE9 de ${t1.pseudo}.`
        };
      }
      case "maitre_chanteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (await tryBlessingBlock({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actor: { id: actor.id, pseudo: actor.pseudo },
          actorRole: {
            faction: role.faction,
            type: role.type ?? null,
            is_hostile: role.is_hostile
          },
          target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
          actionLabel: "chantage"
        }))
          return { ok: false, message: `${t1.pseudo} est sous b\xE9n\xE9diction \u2014 chantage annul\xE9.` };
        await patchMeta(t1.id, {
          blackmail_from_cycle: opts.tour + 1,
          blackmail_until_cycle: opts.tour + 1
        });
        await used({ effect: "blackmail" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "blackmail",
          title: "\u{1F910} Sous chantage",
          body: "Demain, tu ne pourras pas agir.",
          mjTitle: "\u{1F910} Chantage",
          mjBody: `${actor.pseudo} (Ma\xEEtre chanteur) fait chanter ${t1.pseudo} pour le prochain tour.`
        });
        return { ok: true, message: `${t1.pseudo} sous chantage (J+1)` };
      }
      case "cleaner": {
        if (m.clean_toggle_cycle === opts.tour) {
          return { ok: false, message: "Tu as d\xE9j\xE0 ajust\xE9 l'effaceur ce tour-ci." };
        }
        const armed = m.clean_armed === true;
        const next = !armed;
        await patchMeta(actor.id, { clean_armed: next, clean_toggle_cycle: opts.tour });
        await log({ effect: next ? "clean_arm" : "clean_disarm" });
        const msg = next ? "\u{1F9F9} Effaceur arm\xE9 : le prochain meurtre du Tueur sera nettoy\xE9 (pas d'annonce publique, pas d'autopsie)." : "\u{1F9F9} Effaceur d\xE9sarm\xE9.";
        if (next) {
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "clean_armed",
            title: "\u{1F9F9} Effaceur arm\xE9",
            body: "Le prochain meurtre du Tueur passera inaper\xE7u.",
            mjTitle: "\u{1F9F9} Cleaner",
            mjBody: `${actor.pseudo} (Cleaner) arme l'effa\xE7age du prochain meurtre du Tueur.`
          });
        }
        return { ok: true, message: msg };
      }
      case "usurpateur": {
        const cover = m.cover_slug;
        const r = cover ? opts.rolesBySlug.get(cover) : void 0;
        await log({ effect: "cover_check", cover });
        return {
          ok: true,
          message: r ? `Tu apparais comme ${r.icon} ${r.name_fr}` : "Couverture en place"
        };
      }
      // ── Neutres divers ──
      case "entremetteur": {
        if (!t1 || !t2) return { ok: false, message: "Choisis 2 joueurs \xE0 lier." };
        if (t1.id === t2.id) return { ok: false, message: "Choisis 2 joueurs diff\xE9rents." };
        if (t1.id === actor.id || t2.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te lier toi-m\xEAme." };
        await patchMeta(t1.id, { linked_with: t2.id });
        await patchMeta(t2.id, { linked_with: t1.id });
        await patchMeta(actor.id, { linked_pair: [t1.id, t2.id], pending_link_choice: false });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "linked_partner",
          title: "\u{1F49E} Lien nou\xE9",
          body: `Ton \xE2me s\u0153ur secr\xE8te : ${t2.pseudo}. Si l'un meurt, l'autre suit.`,
          mjTitle: "\u{1F49E} Lien",
          mjBody: `Lien nou\xE9 entre ${t1.pseudo} et ${t2.pseudo}.`
        });
        await notify({
          gameId: opts.gameId,
          playerId: t2.id,
          type: "linked_partner",
          title: "\u{1F49E} Lien nou\xE9",
          body: `Ton \xE2me s\u0153ur secr\xE8te : ${t1.pseudo}. Si l'un meurt, l'autre suit.`,
          mjTitle: "\u{1F49E} Lien",
          mjBody: `Lien nou\xE9 entre ${t2.pseudo} et ${t1.pseudo}.`
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "link",
          title: "\u{1F49E} Liens tiss\xE9s",
          body: `${actor.pseudo} (Entremetteur) lie ${t1.pseudo} \u2194 ${t2.pseudo}.`
        });
        await used({ effect: "link_setup", targetId: t1.id, target2Id: t2.id });
        return { ok: true, message: `Couple li\xE9 : ${t1.pseudo} \u2194 ${t2.pseudo}` };
      }
      // ── Facteur ──
      case "facteur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        await used({ effect: "deliver_letter" });
        const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
        await grantItem2(
          t1.id,
          buildItem2("lettre", {
            from: "Anonyme",
            descriptionOverride: "Une lettre anonyme t'a \xE9t\xE9 remise."
          })
        );
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "letter",
          title: "\u{1F4E8} Lettre anonyme",
          body: "Une lettre anonyme vient d'appara\xEEtre dans ton inventaire.",
          mjTitle: "\u{1F4E8} Lettre",
          mjBody: `${actor.pseudo} (Facteur) d\xE9pose une lettre dans l'inventaire de ${t1.pseudo}.`
        });
        return { ok: true, message: `Lettre d\xE9pos\xE9e \xE0 ${t1.pseudo}` };
      }
      // ── Passifs (consultation manuelle) ──
      case "medecin_legiste":
      case "medium":
      case "temoin": {
        await log({ effect: "passive_use" });
        return { ok: true, message: "Capacit\xE9 passive \u2014 voir notifications" };
      }
      case "croque_mitaine": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const pick2 = Math.random() < 0.5 ? t1 : t2;
        const other = pick2.id === t1.id ? t2 : t1;
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: pick2.id,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:croque_mitaine",
          payload: {
            kill_reason: "croque_mitaine",
            target_pseudo: pick2.pseudo,
            spared_id: other.id,
            spared_pseudo: other.pseudo,
            mechant_mechanic: true
          }
        });
        await notify({
          gameId: opts.gameId,
          playerId: other.id,
          type: "boogey_breath",
          title: "\u{1F47B} Un souffle glac\xE9",
          body: "Tu as senti son souffle dans ton dos\u2026 le Croque-mitaine t'a fr\xF4l\xE9.",
          mjTitle: "\u{1F47B} Croque-mitaine",
          mjBody: `${other.pseudo} a \xE9t\xE9 \xE9pargn\xE9 de justesse par le Croque-mitaine.`
        });
        await used({ effect: "kill_one_of_two_intent", picked: pick2.id, spared: other.id });
        return {
          ok: true,
          message: `${pick2.pseudo} : attaque \xE0 l'Annonce \u2014 ${other.pseudo} \xE9pargn\xE9`
        };
      }
      case "veuve_noire": {
        if (!t1 || !t2) return { ok: false, message: "Choisis 2 cibles." };
        if (t1.id === t2.id) return { ok: false, message: "Choisis 2 joueurs diff\xE9rents." };
        const pairs = m.veuve_pairs ?? [];
        pairs.push({ tour: opts.tour, pair: [t1.id, t2.id] });
        const married = m.married_targets ?? [];
        await patchMeta(actor.id, {
          veuve_pairs: pairs,
          married_targets: Array.from(/* @__PURE__ */ new Set([...married, t1.id, t2.id]))
        });
        await used({ effect: "veuve_pair", pair: [t1.id, t2.id] });
        const spouseText = `${t1.pseudo} & ${t2.pseudo}`;
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "veuve_pair",
          title: "\u{1F577}\uFE0F Toile tendue",
          body: `Si ${spouseText} vote contre toi ce tour, les deux mourront \xE0 la prochaine Annonce.`,
          mjTitle: "\u{1F577}\uFE0F Veuve noire",
          mjBody: `${actor.pseudo} (Veuve noire) cible ${spouseText} \u2014 d\xE9clencheur sur vote contre elle.`
        });
        return { ok: true, message: `${spouseText} sous toile` };
      }
      case "heritier_dechu": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tMeta = meta(t1);
        if (isFalsified(tMeta)) {
          await used({ effect: "heir_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const override = tMeta.police_verdict_override;
        const r = opts.rolesBySlug.get(apparentSlug(t1.role_slug, tMeta));
        const verdict = override ?? (r && isKillerClass(r) ? "innocent" : r?.police_verdict ?? "na");
        const isSuspect = verdict === "suspicious";
        await used({ effect: "heir_inquiry", target: t1.id, verdict });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "heir_inquiry",
          title: "\u{1F451} H\xE9ritier \u2014 Enqu\xEAte",
          body: isSuspect ? `\u{1F7E0} ${t1.pseudo} ressort suspect.` : `\u{1F7E2} ${t1.pseudo} : pas suspect.`,
          mjTitle: "\u{1F451} H\xE9ritier d\xE9chu",
          mjBody: `${actor.pseudo} (H\xE9ritier d\xE9chu) enqu\xEAte sur ${t1.pseudo} \u2192 ${verdict}.`
        });
        return {
          ok: true,
          message: isSuspect ? `\u{1F7E0} ${t1.pseudo} : suspect` : `\u{1F7E2} ${t1.pseudo} : pas suspect`
        };
      }
      case "parieur_tricheur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id) return { ok: false, message: "Choisis un autre joueur." };
        const d6 = () => 1 + Math.floor(Math.random() * 6);
        const rounds = [];
        let meBest = 0;
        let themRoll = 0;
        for (let i = 0; i < 50; i++) {
          const a = d6();
          const b = d6();
          const c = d6();
          const best = Math.max(a, b, c);
          const them = d6();
          rounds.push({ a, b, c, best, them });
          meBest = best;
          themRoll = them;
          if (best !== them) break;
        }
        const meLoses = meBest < themRoll;
        const loserId = meLoses ? actor.id : t1.id;
        const winnerId = meLoses ? t1.id : actor.id;
        const loserPseudo = meLoses ? actor.pseudo : t1.pseudo;
        if (meLoses) await patchMeta(actor.id, { parieur_lost_at_dice: true });
        await submitIntent({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actorId: actor.id,
          targetId: loserId,
          category: "ATTACK",
          timing: "DEFERRED",
          source: "role:parieur_tricheur",
          payload: { kill_reason: "pari_dice", target_pseudo: loserPseudo }
        });
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: loserId,
          status_slug: "dice_loser",
          source: "role:parieur_tricheur",
          active_from_tour: opts.tour,
          active_until_tour: opts.tour,
          payload: {}
        });
        await used({ effect: "bet_dice", rounds, me_best: meBest, them: themRoll, loser: loserId });
        const duelId = crypto.randomUUID();
        const duelPayload = {
          duelId,
          actorId: actor.id,
          actorPseudo: actor.pseudo,
          targetId: t1.id,
          targetPseudo: t1.pseudo,
          rounds,
          loserId,
          winnerId
        };
        const duelBody = `Toi : ${meBest} (3d6) \xB7 ${t1.pseudo} : ${themRoll}. ${loserPseudo} mourra \xE0 la prochaine annonce.`;
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "dice_duel",
          title: meLoses ? "\u{1F3B2} Pari perdu" : "\u{1F3B2} Pari gagn\xE9",
          body: duelBody,
          payload: duelPayload
        });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "dice_duel",
          title: meLoses ? "\u{1F3B2} Duel gagn\xE9" : "\u{1F3B2} Duel perdu",
          body: `${actor.pseudo} : ${meBest} (3d6) \xB7 toi : ${themRoll}. ${loserPseudo} mourra \xE0 la prochaine annonce.`,
          payload: duelPayload
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "dice_duel",
          title: "\u{1F3B2} Parieur tricheur",
          body: `${actor.pseudo} (3d6 \u2192 ${meBest}) vs ${t1.pseudo} (${themRoll}) \u2192 ${loserPseudo} perd (mort diff\xE9r\xE9e \xE0 l'Annonce).${rounds.length > 1 ? ` (${rounds.length - 1} \xE9galit\xE9${rounds.length - 1 > 1 ? "s" : ""} relanc\xE9e${rounds.length - 1 > 1 ? "s" : ""})` : ""}`,
          payload: { ...duelPayload, mj_view: true }
        });
        return {
          ok: !meLoses,
          pending: true,
          message: meLoses ? `\u{1F3B2} ${meBest} < ${themRoll} \u2014 tu perds le pari` : `\u{1F3B2} ${meBest} > ${themRoll} \u2014 ${t1.pseudo} perd le pari`
        };
      }
      // ── Apothicaire — répertoire de 3 fioles (Vie/Mort/Clairvoyance) ──
      // Refonte : aucune fiole au setup. Chaque Enquête, elle joue UNE fiole via sa
      // capacité, en choisissant le mode :
      //   • "use"  → elle l'utilise elle-même sur une cible (effet immédiat/différé) ;
      //   • "gift" → elle l'offre à un joueur, qui la reçoit dans son Carnet.
      // Budgets séparés sur toute la partie : max 1 usage perso ET max 1 don. Chaque
      // type n'est jouable qu'une fois → 2 fioles au plus, la 3ᵉ ne sert jamais.
      // Verrou « 1 action/tour » via `last_item_use_cycle`.
      case "apothicaire": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if ((m.last_item_use_cycle ?? -1) === opts.tour)
          return { ok: false, message: "Tu as d\xE9j\xE0 agi ce tour-ci." };
        const mode = opts.extra?.mode ?? "gift";
        const flasksUsed = m.flasks_used ?? [];
        const requested = opts.extra?.fiole;
        const available = ["heal", "poison", "reveal"].filter((f) => !flasksUsed.includes(f));
        if (available.length === 0) return { ok: false, message: "Tu as d\xE9j\xE0 jou\xE9 tes fioles." };
        const fiole = requested && available.includes(requested) ? requested : available[0];
        const selfUsed = m.apo_self_used ?? 0;
        const given = m.apo_given ?? m.fioles_given ?? 0;
        const slugMap = {
          heal: "fiole_vie",
          poison: "fiole_mort",
          reveal: "fiole_clairvoyance"
        };
        const targetSlug = slugMap[fiole];
        const fioleNames = {
          fiole_vie: "Fiole de vie",
          fiole_mort: "Fiole de mort",
          fiole_clairvoyance: "Fiole de clairvoyance"
        };
        const commitMeta = (patch) => patchMeta(actor.id, {
          flasks_used: [...flasksUsed, fiole],
          last_item_use_cycle: opts.tour,
          ...patch
        });
        if (mode === "gift") {
          if (given >= 1)
            return { ok: false, message: "Tu as d\xE9j\xE0 offert une fiole (1 don par partie)." };
          if (t1.id === actor.id)
            return { ok: false, message: "Choisis un autre joueur \xE0 qui offrir la fiole." };
          const giftDesc = {
            fiole_vie: "\u{1F49A} Tu as re\xE7u une Fiole de vie de l'Apothicaire. Utilise-la depuis ton Carnet pour prot\xE9ger un joueur jusqu'\xE0 la prochaine Annonce.",
            fiole_mort: "\u2620\uFE0F Tu as re\xE7u une Fiole de mort de l'Apothicaire. Utilise-la depuis ton Carnet pour empoisonner une cible \u2014 elle mourra \xE0 la prochaine Annonce.",
            fiole_clairvoyance: "\u{1F52E} Tu as re\xE7u une Fiole de clairvoyance de l'Apothicaire. Utilise-la depuis ton Carnet sur un joueur pour d\xE9couvrir, toi seul, sa faction."
          };
          const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
          await grantItem2(
            t1.id,
            buildItem2(targetSlug, {
              from: "Apothicaire",
              originFaction: "Civil",
              descriptionOverride: giftDesc[targetSlug]
            })
          );
          await notify({
            gameId: opts.gameId,
            playerId: t1.id,
            type: "fiole_offerte",
            title: "\u{1F381} Une fiole t'est offerte",
            body: giftDesc[targetSlug],
            mjTitle: "\u{1F381} Apothicaire",
            mjBody: `${actor.pseudo} (Apothicaire) offre une ${fioleNames[targetSlug]} \xE0 ${t1.pseudo}.`
          });
          await commitMeta({ apo_given: given + 1, fioles_given: given + 1 });
          await used({ effect: "offer_fiole", fiole, to: t1.id });
          return { ok: true, message: `Fiole offerte \xE0 ${t1.pseudo}.` };
        }
        if (selfUsed >= 1)
          return { ok: false, message: "Tu as d\xE9j\xE0 utilis\xE9 une fiole toi-m\xEAme (1 par partie)." };
        const { submitIntent: submitIntent2 } = await Promise.resolve().then(() => (init_resolver(), resolver_exports));
        let msg;
        if (fiole === "poison") {
          await submitIntent2({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: t1.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:apothicaire",
            payload: { kill_reason: "fiole_mort", target_pseudo: t1.pseudo }
          });
          msg = `${t1.pseudo} : intention de mort \u2014 \xE0 l'Annonce.`;
        } else if (fiole === "heal") {
          await submitIntent2({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: t1.id,
            category: "CURE",
            timing: "DEFERRED",
            source: "role:apothicaire",
            payload: { target_pseudo: t1.pseudo }
          });
          await notify({
            gameId: opts.gameId,
            playerId: t1.id,
            type: "cured",
            title: "\u{1F49A} Soign\xE9",
            body: "Une fiole de vie te prot\xE8ge pour la prochaine Annonce.",
            mjTitle: "\u{1F49A} Apothicaire",
            mjBody: `${actor.pseudo} (Apothicaire) prot\xE8ge ${t1.pseudo} avec une Fiole de vie.`
          });
          msg = `${t1.pseudo} : soin \u2014 \xE0 l'Annonce.`;
        } else {
          const r = opts.rolesBySlug.get(t1.role_slug ?? "");
          msg = r ? `${t1.pseudo} = faction ${r.faction}` : `${t1.pseudo} : faction inconnue`;
        }
        await commitMeta({ apo_self_used: selfUsed + 1 });
        await used({ effect: "use_fiole", fiole, on: t1.id });
        return { ok: true, message: msg };
      }
      // ── Investigations supplémentaires ──
      case "policier": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const tMeta = meta(t1);
        if (isFalsified(tMeta)) {
          await used({ effect: "police_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const override = tMeta.police_verdict_override;
        const seenRole = opts.rolesBySlug.get(apparentSlug(t1.role_slug, tMeta));
        const verdict = policierVerdict(seenRole, override);
        await used({ effect: "police", verdict });
        return {
          ok: true,
          message: verdict === "suspicious" ? `\u{1F7E0} ${t1.pseudo} : suspect` : `\u{1F7E2} ${t1.pseudo} : pas suspect`
        };
      }
      case "cartomancien":
      case "journaliste": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (isFalsified(meta(t1))) {
          await used({ effect: "tarot_falsified", target: t1.id });
          return { ok: true, message: FALSIFIED_MSG };
        }
        await patchMeta(actor.id, { card_target_id: t1.id, card_target_cycle: opts.tour });
        await used({ effect: "tarot_spy", target: t1.id });
        return { ok: true, message: `\u{1F52E} Tu lis le tableau de ${t1.pseudo} jusqu'au prochain tour` };
      }
      case "imitateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const deads = opts.allPlayers.filter((p) => !p.is_alive && !p.is_mj);
        deads.sort((a, b) => {
          const da = (a.role_meta ?? {}).death_cycle ?? 0;
          const db = (b.role_meta ?? {}).death_cycle ?? 0;
          return db - da;
        });
        const last = deads[0];
        if (!last) return { ok: false, message: "Aucun mort \xE0 imiter." };
        if (last.id !== t1.id)
          return { ok: false, message: `Tu ne peux imiter que le dernier mort (${last.pseudo}).` };
        const r = opts.rolesBySlug.get(t1.role_slug ?? "");
        if (!r) return { ok: false, message: "Cible sans r\xF4le" };
        await patchMeta(actor.id, {
          imitated_slug: r.slug,
          original_slug: actor.role_slug ?? "imitateur"
        });
        await supabase.from("players").update({ role_slug: r.slug }).eq("id", actor.id);
        await used({ effect: "imitate", slug: r.slug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "imitate",
          title: "\u{1F3AD} Imitation",
          body: `Tu deviens : ${r.icon} ${r.name_fr}. Sa capacit\xE9 est d\xE9sormais la tienne.`,
          mjTitle: "\u{1F3AD} Imitateur",
          mjBody: `${actor.pseudo} (Imitateur) copie ${t1.pseudo} (${r.icon} ${r.name_fr}) \u2014 slug bascul\xE9.`
        });
        return { ok: true, message: `Tu joues d\xE9sormais ${r.name_fr}` };
      }
      // ── Manipulations supplémentaires ──
      case "barman": {
        if (!t1 || !t2) return { ok: false, message: "Deux cibles requises" };
        const protectTour = opts.tour + 1;
        const picked = Math.random() < 0.5 ? t1 : t2;
        const other = picked.id === t1.id ? t2 : t1;
        await submitIntent({
          gameId: opts.gameId,
          tour: protectTour,
          phase: "free",
          actorId: actor.id,
          targetId: picked.id,
          category: "PROTECT",
          timing: "DEFERRED",
          source: "role:barman",
          payload: { pair_with: other.id }
        });
        await patchMeta(picked.id, {
          drunk_until_cycle: protectTour,
          drunk_from_cycle: protectTour,
          blocked_until_cycle: protectTour,
          blocked_from_cycle: protectTour
        });
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: other.id,
          status_slug: "good_time",
          source: "role:barman",
          active_from_tour: protectTour,
          active_until_tour: protectTour,
          payload: { partner_id: picked.id, partner_pseudo: picked.pseudo }
        });
        await used({
          effect: "barman_round",
          picked: picked.id,
          other: other.id,
          pair: [t1.id, t2.id]
        });
        await notify({
          gameId: opts.gameId,
          playerId: picked.id,
          type: "drunk",
          title: "\u{1F37A} Ivre",
          body: "Le barman t'a servi un verre de trop. Ta capacit\xE9 sera bloqu\xE9e demain.",
          mjTitle: "\u{1F37A} Barman",
          mjBody: `${actor.pseudo} (Barman) sert ${t1.pseudo} & ${t2.pseudo} \u2014 ${picked.pseudo} tombe ivre (et prot\xE9g\xE9).`
        });
        await notify({
          gameId: opts.gameId,
          playerId: other.id,
          type: "good_time",
          title: "\u{1F379} Bon moment",
          body: `Tu as pass\xE9 du bon temps avec ${picked.pseudo}.`
        });
        await notifyMJ({
          gameId: opts.gameId,
          type: "protected",
          title: "\u{1F6E1}\uFE0F Protection Barman",
          body: `${actor.pseudo} (Barman) prot\xE8ge ${picked.pseudo} (ivre). ${other.pseudo} passe un bon moment avec ${picked.pseudo}.`
        });
        return {
          ok: true,
          message: `${t1.pseudo} & ${t2.pseudo} \u2014 l'un ivre & \xE0 l'abri, l'autre passe un bon moment`
        };
      }
      // ── Juge / Non-coupable ──
      // ── Juge : programme la libération d'un prisonnier ayant purgé au moins un tour complet.
      // La libération s'applique au DÉBUT du tour suivant (via resolveCycleTransition).
      // Pourquoi : éviter qu'un joueur libéré à la dernière seconde d'une phase n'ait pas
      // le temps d'utiliser sa capacité. En cas d'exécution/kill ce tour-ci, la libération
      // est naturellement annulée (cible morte). ──
      case "juge": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (!t1.is_imprisoned) return { ok: false, message: "Cible non emprisonn\xE9e" };
        const tMeta = t1.role_meta ?? {};
        const since = tMeta.imprisoned_since_cycle ?? opts.tour;
        if (opts.tour <= since) {
          return { ok: false, message: "Le prisonnier n'a pas encore purg\xE9 un tour complet." };
        }
        if (tMeta.pending_release_for_cycle === opts.tour + 1) {
          return { ok: false, message: "Lib\xE9ration de ce prisonnier d\xE9j\xE0 pr\xE9vue." };
        }
        await patchMeta(t1.id, {
          pending_release_for_cycle: opts.tour + 1,
          pending_release_by: actor.id
        });
        await used({ effect: "judge_release_scheduled" });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "release_scheduled",
          title: "\u2696\uFE0F Lib\xE9ration programm\xE9e",
          body: "Le Juge a ordonn\xE9 ta lib\xE9ration. Tu seras libre au d\xE9but du prochain tour.",
          mjTitle: "\u2696\uFE0F Juge",
          mjBody: `${actor.pseudo} (Juge) programme la lib\xE9ration de ${t1.pseudo} pour le tour ${opts.tour + 1}.`
        });
        return {
          ok: true,
          message: `Lib\xE9ration de ${t1.pseudo} \u2014 au tour ${opts.tour + 1}`
        };
      }
      // ── Oracle : verrouille une prophétie de faction (1×/partie). Gagne avec la faction prédite. ──
      case "oracle": {
        if (m.prophecy) return { ok: false, message: "Proph\xE9tie d\xE9j\xE0 lanc\xE9e" };
        const faction = opts.extra?.faction ?? null;
        const allowed = ["Civil", "M\xE9chant", "Neutre"];
        if (!faction || !allowed.includes(faction)) {
          return { ok: false, message: "Choisis une faction (Civils, M\xE9chants ou Neutres)." };
        }
        await patchMeta(actor.id, { prophecy: faction });
        await used({ effect: "prophecy", faction });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "prophecy_set",
          title: "\u{1F52E} Proph\xE9tie verrouill\xE9e",
          body: `Tu gagneras si la faction \xAB ${faction} \xBB remporte la partie.`,
          mjTitle: "\u{1F52E} Oracle",
          mjBody: `${actor.pseudo} (Oracle) proph\xE9tise la victoire des ${faction}.`
        });
        return { ok: true, message: `Proph\xE9tie : victoire des ${faction}.` };
      }
      // ── Mouchard : 1×/partie, révèle le rôle exact d'une cible ──
      case "mouchard": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (isFalsified(meta(t1))) {
          await used({ effect: "mouchard_falsified", target: t1.id });
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "mouchard_reveal",
            title: "\u{1F4E2} Mouchard",
            body: FALSIFIED_MSG,
            mjTitle: "\u{1F4E2} Mouchard",
            mjBody: `${actor.pseudo} (Mouchard) cible ${t1.pseudo} \u2014 piste falsifi\xE9e.`
          });
          return { ok: true, message: FALSIFIED_MSG };
        }
        const cover = meta(t1).cover_slug;
        const revealSlug = cover ?? t1.role_slug ?? "";
        const r = opts.rolesBySlug.get(revealSlug);
        const label = !cover && r && isKillerClass(r) ? "Citoyen" : r ? `${r.icon} ${r.name_fr}` : "?";
        await used({ effect: "mouchard_reveal", target: t1.id, slug: revealSlug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "mouchard_reveal",
          title: "\u{1F4E2} Mouchard \u2014 R\xF4le r\xE9v\xE9l\xE9",
          body: `${t1.pseudo} est : ${label}.`,
          mjTitle: "\u{1F4E2} Mouchard",
          mjBody: `${actor.pseudo} (Mouchard) apprend que ${t1.pseudo} est ${label}.`
        });
        return { ok: true, message: `${t1.pseudo} = ${label}` };
      }
      // ── Stratège (refonte) : 3 modes, jamais le même deux tours de suite ──
      //   • discretion   → tue 1 cible (kill différé à l'Annonce, mécanique méchante) ;
      //   • bain_de_sang → tue 2 cibles distinctes MAIS un Civil au hasard reçoit un
      //     indice révélant l'identité du Stratège ;
      //   • sabotage     → ne tue personne, bloque totalement la capacité d'1 cible
      //     au tour suivant (blocked_*_cycle = tour+1).
      case "stratege": {
        const smode = opts.extra?.mode ?? "discretion";
        const lastMode = m.stratege_last_mode;
        const lastModeTour = m.stratege_last_mode_tour;
        if (lastMode === smode && lastModeTour === opts.tour - 1)
          return {
            ok: false,
            message: "Tu ne peux pas rejouer le m\xEAme mode deux tours de suite."
          };
        const markMode = () => patchMeta(actor.id, { stratege_last_mode: smode, stratege_last_mode_tour: opts.tour });
        const warnTeam = async (label) => {
          const { data: team } = await supabase.from("players").select("id, role_slug").eq("game_id", opts.gameId).eq("is_alive", true);
          const teammates = (team ?? []).filter(
            (p) => p.id !== actor.id && opts.rolesBySlug.get(p.role_slug ?? "")?.faction === "M\xE9chant"
          );
          for (const tm of teammates)
            await notify({
              gameId: opts.gameId,
              playerId: tm.id,
              type: "killer_targeted",
              title: "\u{1F3AF} Le Strat\xE8ge frappe",
              body: label
            });
        };
        if (smode === "sabotage") {
          if (!t1) return { ok: false, message: "Cible requise" };
          if (t1.id === actor.id)
            return { ok: false, message: "Tu ne peux pas te saboter toi-m\xEAme." };
          await patchMeta(t1.id, {
            blocked_from_cycle: opts.tour + 1,
            blocked_until_cycle: opts.tour + 1
          });
          await notify({
            gameId: opts.gameId,
            playerId: t1.id,
            type: "sabotaged",
            title: "\u{1F6E0}\uFE0F Capacit\xE9 sabot\xE9e",
            body: "Au prochain tour, ta capacit\xE9 sera totalement bloqu\xE9e.",
            mjTitle: "\u{1F6E0}\uFE0F Strat\xE8ge \u2014 sabotage",
            mjBody: `${actor.pseudo} (Strat\xE8ge) sabote ${t1.pseudo} : capacit\xE9 bloqu\xE9e au tour ${opts.tour + 1}.`
          });
          await markMode();
          await used({ effect: "stratege_sabotage", mode: smode, target: t1.id });
          return { ok: true, message: `${t1.pseudo} : capacit\xE9 sabot\xE9e au prochain tour.` };
        }
        if (!t1) return { ok: false, message: "Cible requise" };
        if (smode === "bain_de_sang" && !t2) return { ok: false, message: "Deux cibles requises." };
        if (smode === "bain_de_sang" && t1.id === t2.id)
          return { ok: false, message: "Choisis 2 cibles distinctes." };
        const victims = smode === "bain_de_sang" ? [t1, t2] : [t1];
        if (victims.some((v) => v.id === actor.id))
          return { ok: false, message: "Tu ne peux pas te cibler toi-m\xEAme." };
        for (const v of victims)
          await submitIntent({
            gameId: opts.gameId,
            tour: opts.tour,
            phase: opts.phase,
            actorId: actor.id,
            targetId: v.id,
            category: "ATTACK",
            timing: "DEFERRED",
            source: "role:stratege",
            payload: { kill_reason: "stratege", target_pseudo: v.pseudo, mechant_mechanic: true }
          });
        if (smode === "bain_de_sang") {
          const civils = opts.allPlayers.filter(
            (p) => p.is_alive && !p.is_mj && p.id !== actor.id && opts.rolesBySlug.get(p.role_slug ?? "")?.faction === "Civil"
          );
          if (civils.length > 0) {
            const witness = civils[Math.floor(Math.random() * civils.length)];
            const { grantItem: grantItem2, buildItem: buildItem2 } = await Promise.resolve().then(() => (init_items(), items_exports));
            await grantItem2(
              witness.id,
              buildItem2("indice", {
                from: "Manoir",
                originFaction: "Syst\xE8me",
                nameOverride: "Indice \u2014 le Tueur d\xE9masqu\xE9",
                descriptionOverride: `Dans le chaos du bain de sang, tu as reconnu le Tueur : c'est ${actor.pseudo}.`
              })
            );
            await notify({
              gameId: opts.gameId,
              playerId: witness.id,
              type: "indice_recu",
              title: "\u{1F9E9} Un indice t'est parvenu",
              body: "Tu as reconnu le Tueur dans la confusion \u2014 consulte ton Carnet.",
              mjTitle: "\u{1F9E9} Strat\xE8ge \u2014 identit\xE9 fuit\xE9e",
              mjBody: `${witness.pseudo} (Civil) re\xE7oit un indice nommant ${actor.pseudo} (Strat\xE8ge) apr\xE8s son bain de sang.`
            });
          }
          await warnTeam(`${t1.pseudo} et ${t2.pseudo} ne verront pas l'aube.`);
        } else {
          await warnTeam(`${t1.pseudo} est la cible de cette nuit.`);
        }
        await markMode();
        await used({
          effect: smode === "bain_de_sang" ? "stratege_bloodbath" : "stratege_kill",
          mode: smode,
          target: t1.id,
          ...smode === "bain_de_sang" ? { target2: t2.id } : {}
        });
        return {
          ok: true,
          pending: true,
          message: smode === "bain_de_sang" ? "Bain de sang \u2014 d\xE9nouement \xE0 l'Annonce." : "D\xE9nouement \xE0 l'Annonce."
        };
      }
      // ── Voleur : vole l'objet le plus récent d'une cible (vivante ou morte) ──
      case "voleur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        const { data: tFresh } = await supabase.from("players").select("role_meta").eq("id", t1.id).single();
        const tMeta = tFresh?.role_meta ?? {};
        const inv = tMeta.inventory ?? [];
        if (inv.length === 0) {
          await used({ effect: "steal_empty", target: t1.id });
          await notify({
            gameId: opts.gameId,
            playerId: actor.id,
            type: "steal_empty",
            title: "\u{1F977} Inventaire vide",
            body: `${t1.pseudo} n'avait aucun objet \xE0 voler.`,
            mjTitle: "\u{1F977} Voleur",
            mjBody: `${actor.pseudo} (Voleur) tente de voler ${t1.pseudo} \u2014 inventaire vide.`
          });
          return { ok: true, message: `${t1.pseudo} n'a rien \xE0 voler` };
        }
        const [stolen, ...rest] = inv;
        await patchMeta(t1.id, { inventory: rest });
        const myInv = m.inventory ?? [];
        const stolenItem = {
          ...stolen,
          received_from: t1.pseudo,
          received_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        await patchMeta(actor.id, { inventory: [stolenItem, ...myInv] });
        const itemName = stolen.name ?? "un objet";
        await used({ effect: "steal", target: t1.id, item: stolen.slug });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "steal_ok",
          title: "\u{1F977} Vol r\xE9ussi",
          body: `Tu d\xE9robes ${itemName} \xE0 ${t1.pseudo}.`,
          mjTitle: "\u{1F977} Voleur",
          mjBody: `${actor.pseudo} (Voleur) d\xE9robe ${itemName} \xE0 ${t1.pseudo}.`
        });
        if (t1.is_alive) {
          await notify({
            gameId: opts.gameId,
            playerId: t1.id,
            type: "stolen_from",
            title: "\u{1F977} Vol",
            body: `On t'a d\xE9rob\xE9 ${itemName}.`
          });
        }
        return { ok: true, message: `${itemName} vol\xE9 \xE0 ${t1.pseudo}` };
      }
      // ── Conservateur : distribue une relique aléatoire à une cible ──
      case "conservateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te d\xE9signer toi-m\xEAme." };
        const { rollRelique: rollRelique2, buildRelique: buildRelique2, grantItem: grantItem2, RELIQUE_CATALOG: RELIQUE_CATALOG2 } = await Promise.resolve().then(() => (init_items(), items_exports));
        const variant = rollRelique2();
        const def = RELIQUE_CATALOG2[variant];
        if (variant === "coeur_du_manoir") {
          await used({ effect: "relique_distribute", target: t1.id, variant });
          await endGameWithWinner(
            opts.gameId,
            "Conservateur",
            `${actor.pseudo} (Conservateur) a confi\xE9 ${def.icon} ${def.name} \xE0 ${t1.pseudo}. Le Manoir reconna\xEEt son gardien.`
          );
          return {
            ok: true,
            message: `\u{1FAC0} Tu as offert Le C\u0153ur du Manoir \xE0 ${t1.pseudo} \u2014 Victoire du Conservateur.`
          };
        }
        const rel = buildRelique2(variant, actor.pseudo);
        await grantItem2(t1.id, rel);
        await used({ effect: "relique_distribute", target: t1.id, variant });
        const isActive = def.effect && def.effect !== "special_win";
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "relique_received",
          title: "\u{1F5DD}\uFE0F Une relique t'est confi\xE9e",
          body: `Tu re\xE7ois ${def.icon} ${def.name}. ${def.description}${isActive ? " Tu peux l'utiliser depuis ton Carnet." : ""}`
        });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "relique_given",
          title: "\u{1F5DD}\uFE0F Relique distribu\xE9e",
          body: `Tu as confi\xE9 ${def.icon} ${def.name} \xE0 ${t1.pseudo}.`,
          mjTitle: "\u{1F5DD}\uFE0F Conservateur",
          mjBody: `${actor.pseudo} confie ${def.icon} ${def.name} \xE0 ${t1.pseudo}.`
        });
        return { ok: true, message: `${def.icon} ${def.name} confi\xE9e \xE0 ${t1.pseudo}.` };
      }
      // ── Accusateur : marque la cible comme suspecte pendant 1 tour ──
      case "accusateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (await tryBlessingBlock({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actor: { id: actor.id, pseudo: actor.pseudo },
          actorRole: {
            faction: role.faction,
            type: role.type ?? null,
            is_hostile: role.is_hostile
          },
          target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
          actionLabel: "accusation"
        }))
          return { ok: false, message: `${t1.pseudo} est sous b\xE9n\xE9diction \u2014 accusation annul\xE9e.` };
        const until = opts.tour + 1;
        await patchMeta(t1.id, { marked_suspect_until_cycle: until });
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: t1.id,
          status_slug: "marked",
          source: "role:accusateur",
          active_from_tour: opts.tour,
          active_until_tour: until,
          payload: { by: actor.id, by_pseudo: actor.pseudo }
        });
        await used({ effect: "accuse", target: t1.id, until });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "accused",
          title: "\u{1F516} Accusation contre toi",
          body: `Un Accusateur t'a marqu\xE9 Suspect (1 tour).`,
          mjTitle: "\u{1F516} Accusateur",
          mjBody: `${actor.pseudo} (Accusateur) accuse ${t1.pseudo} \u2014 suspect pour 1 tour.`
        });
        await notify({
          gameId: opts.gameId,
          playerId: actor.id,
          type: "accuse_ok",
          title: "\u{1F516} Accusation lanc\xE9e",
          body: `${t1.pseudo} marqu\xE9 Suspect (1 tour).`
        });
        return { ok: true, message: `${t1.pseudo} suspect (1 tour)` };
      }
      // ── Falsificateur : pose un flag PERMANENT sur la cible. Tout investigateur
      //    ciblant cette personne reçoit "Le joueur a été falsifié" au lieu de l'info.
      case "falsificateur": {
        if (!t1) return { ok: false, message: "Cible requise" };
        if (t1.id === actor.id)
          return { ok: false, message: "Tu ne peux pas te falsifier toi-m\xEAme." };
        if (await tryBlessingBlock({
          gameId: opts.gameId,
          tour: opts.tour,
          phase: opts.phase,
          actor: { id: actor.id, pseudo: actor.pseudo },
          actorRole: {
            faction: role.faction,
            type: role.type ?? null,
            is_hostile: role.is_hostile
          },
          target: { id: t1.id, pseudo: t1.pseudo, role_meta: t1.role_meta },
          actionLabel: "falsification"
        }))
          return {
            ok: false,
            message: `${t1.pseudo} est sous b\xE9n\xE9diction \u2014 falsification annul\xE9e.`
          };
        const tMeta = meta(t1);
        if (isFalsified(tMeta)) {
          await used({ effect: "falsify_redundant", target: t1.id });
          return { ok: true, message: `Piste d\xE9j\xE0 falsifi\xE9e sur ${t1.pseudo}.` };
        }
        await patchMeta(t1.id, {
          falsified: true,
          falsified_by: actor.id,
          falsified_at_tour: opts.tour
        });
        await used({ effect: "falsify", target: t1.id });
        await supabase.from("player_statuses").insert({
          game_id: opts.gameId,
          player_id: t1.id,
          status_slug: "falsified",
          source: "role:falsificateur",
          active_from_tour: opts.tour,
          active_until_tour: 9999,
          payload: { by: actor.id, by_pseudo: actor.pseudo, tour: opts.tour }
        });
        await notify({
          gameId: opts.gameId,
          playerId: t1.id,
          type: "falsified",
          title: "\u{1FAAA} Piste falsifi\xE9e",
          body: "Pour le reste de la partie, toute enqu\xEAte men\xE9e sur toi renverra une piste brouill\xE9e et ne r\xE9v\xE9lera rien de clair.",
          mjTitle: "\u{1FAAA} Falsificateur",
          mjBody: `${actor.pseudo} (Falsificateur) falsifie ${t1.pseudo} \u2014 toute investigation sur cette cible renverra "Le joueur a \xE9t\xE9 falsifi\xE9" pour le reste de la partie.`
        });
        return {
          ok: true,
          message: `Piste falsifi\xE9e sur ${t1.pseudo} \u2014 les investigateurs ne pourront plus rien apprendre sur cette cible.`
        };
      }
      default: {
        await used({ effect: "generic" });
        return { ok: true, message: "Capacit\xE9 utilis\xE9e" };
      }
    }
  })();
  if (dispatchResult.ok) {
    const { data: latest } = await supabase.from("role_actions").select("id").eq("game_id", opts.gameId).eq("actor_player_id", actor.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const latestId = latest?.id;
    if (latestId) {
      await supabase.from("role_actions").update({ result: { message: dispatchResult.message } }).eq("id", latestId);
    }
  }
  if (dispatchResult.ok) {
    const forcedBy = m.forced_by;
    const forcedCycle = m.forced_action_cycle;
    if (forcedBy && forcedCycle === opts.tour) {
      const targetName = t1 ? t1.pseudo : "\u2014";
      await notify({
        gameId: opts.gameId,
        playerId: forcedBy,
        type: "puppet_mirror",
        title: "\u{1F3AD} Reflet de la marionnette",
        body: `${actor.pseudo} (manipul\xE9) \u2192 ${targetName} : ${dispatchResult.message}`,
        mjTitle: "\u{1F3AD} Miroir Marionnettiste",
        mjBody: `${actor.pseudo} (forc\xE9) cible ${targetName} \u2014 r\xE9sultat : ${dispatchResult.message}`
      });
      await patchMeta(actor.id, { forced_by: null });
    }
  }
  return dispatchResult;
}
function buildBotRows(gameId, existing, count) {
  const usedNames = new Set(existing.map((p) => p.pseudo));
  const usedAvatars = new Set(
    existing.map((p) => p.role_meta?.avatar).filter((a) => !!a)
  );
  const freeAvatars = [];
  for (let i = 1; i <= BOT_AVATAR_COUNT; i++) {
    const id = `avatar${i}`;
    if (!usedAvatars.has(id)) freeAvatars.push(id);
  }
  for (let i = freeAvatars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freeAvatars[i], freeAvatars[j]] = [freeAvatars[j], freeAvatars[i]];
  }
  const rows = [];
  for (let n = 0; n < count; n++) {
    let pseudo = BOT_PSEUDOS_POOL.find((nm) => !usedNames.has(nm));
    if (!pseudo) {
      let k = usedNames.size + 1;
      while (usedNames.has(`Bot ${k}`)) k++;
      pseudo = `Bot ${k}`;
    }
    usedNames.add(pseudo);
    const picked = freeAvatars.shift() ?? null;
    rows.push({
      game_id: gameId,
      session_id: crypto.randomUUID(),
      pseudo,
      is_mj: false,
      ...picked ? { role_meta: { avatar: picked } } : {}
    });
  }
  return rows;
}
async function addBotPlayer(gameId) {
  const { data: existing } = await supabase.from("players").select("pseudo,role_meta").eq("game_id", gameId);
  const [row] = buildBotRows(gameId, existing ?? [], 1);
  const { data, error } = await supabase.from("players").insert(row).select().single();
  if (error) return null;
  emit("bot_added", `\u{1F916} ${row.pseudo} ajout\xE9`, { gameId });
  return data;
}
async function addBotPlayers(gameId, count) {
  if (count <= 0) return 0;
  const { data: existing } = await supabase.from("players").select("pseudo,role_meta").eq("game_id", gameId);
  const rows = buildBotRows(gameId, existing ?? [], count);
  if (rows.length === 0) return 0;
  const { data, error } = await supabase.from("players").insert(rows).select();
  if (error) return 0;
  const added = data?.length ?? 0;
  if (added > 0) {
    emit("bot_added", `\u{1F916} ${added} bot${added > 1 ? "s" : ""} ajout\xE9${added > 1 ? "s" : ""}`, {
      gameId
    });
  }
  return added;
}
async function resetGame(gameId) {
  await supabase.from("votes").delete().eq("game_id", gameId);
  await supabase.from("role_actions").delete().eq("game_id", gameId);
  await supabase.from("gathering_calls").delete().eq("game_id", gameId);
  await supabase.from("notifications").delete().eq("game_id", gameId);
  await supabase.from("players").update({ is_alive: true, is_imprisoned: false, role_slug: null, role_meta: {} }).eq("game_id", gameId);
  await supabase.from("games").update({
    status: "lobby",
    current_phase: "lobby",
    current_tour: 0,
    started_at: null,
    ended_at: null
  }).eq("id", gameId);
  emit("reset", "\u267B\uFE0F Partie r\xE9initialis\xE9e");
}
var listeners, meta, PHASE_IDX, SCHEDULES_NEXT_TOUR, FALSIFIED_MSG, PHASE_DURATIONS, TICK_LOCK_TTL_MS, _tickInFlight, MAX_TICK_TRANSITIONS, BOT_PSEUDOS_POOL, BOT_AVATAR_COUNT;
var init_actions = __esm({
  "src/engine/actions.ts"() {
    "use strict";
    init_client();
    init_notify();
    init_winConditions();
    init_resolver();
    init_phaseTiming();
    init_serverClock();
    listeners = /* @__PURE__ */ new Set();
    meta = (p) => p?.role_meta ?? {};
    PHASE_IDX = { free: 0, annonce: 1, gathering: 2, vote: 3 };
    SCHEDULES_NEXT_TOUR = /* @__PURE__ */ new Set([
      "maitre_chanteur",
      "barman",
      "babysitter",
      "accusateur",
      "veuve_noire",
      "marionnettiste",
      "falsificateur"
    ]);
    FALSIFIED_MSG = "Le joueur a \xE9t\xE9 falsifi\xE9";
    PHASE_DURATIONS = {
      lobby: 0,
      free: 30,
      annonce: 10,
      gathering: 30,
      vote: 30,
      ended: 0
    };
    TICK_LOCK_TTL_MS = 3e4;
    _tickInFlight = /* @__PURE__ */ new Map();
    MAX_TICK_TRANSITIONS = 6;
    BOT_PSEUDOS_POOL = [
      "Bot Alice",
      "Bot Bob",
      "Bot Cleo",
      "Bot Dr\xE9",
      "Bot \xC9mile",
      "Bot Faye",
      "Bot Gus",
      "Bot Hana",
      "Bot Ivo",
      "Bot Jin",
      "Bot Kya",
      "Bot L\xE9o",
      "Bot Mia",
      "Bot Nio",
      "Bot Ola",
      "Bot Pim"
    ];
    BOT_AVATAR_COUNT = 32;
  }
});

// scripts/phase-ticker.src.ts
init_client();
init_actions();
import { createClient as createClient2 } from "@supabase/supabase-js";
Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
  const admin = createClient2(url, serviceKey, { auth: { persistSession: false } });
  setSupabaseClient(admin);
  const { data: games, error } = await admin.from("games").select("id").eq("status", "in_progress");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
  let ticked = 0;
  for (const g of games ?? []) {
    try {
      await tickPhase(g.id);
      ticked++;
    } catch (e) {
      console.error("[phase-ticker] tickPhase failed for", g.id, e);
    }
  }
  return new Response(JSON.stringify({ games: games?.length ?? 0, ticked }), {
    headers: { "content-type": "application/json" }
  });
});
