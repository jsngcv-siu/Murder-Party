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

// src/engine/items.ts
var items_exports = {};
__export(items_exports, {
  ITEM_CATALOG: () => ITEM_CATALOG,
  buildItem: () => buildItem,
  consumeItem: () => consumeItem,
  grantItem: () => grantItem,
  itemFaction: () => itemFaction,
  itemIsUsable: () => itemIsUsable,
  itemNeedsTarget: () => itemNeedsTarget,
  readInventory: () => readInventory
});
function itemFaction(item) {
  const stamped = item.payload?.origin_faction;
  if (stamped) return stamped;
  if (item.payload?.mechant_origin === true) return "M\xE9chant";
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
  if (slug === "lettre") {
    const sent = !!payload?.sent;
    return sent ? "none" : "single";
  }
  return "single";
}
function itemIsUsable(slug, payload) {
  if (slug === "indice") return false;
  if (slug === "lettre") {
    return !payload?.sent;
  }
  return slug === "fiole_mort" || slug === "fiole_vie" || slug === "fiole_clairvoyance" || slug === "couteau";
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
      message = `${target.pseudo} : coup de couteau \u2014 \xE0 l'Annonce.`;
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
var RECEIVED_FROM_FACTION, ITEM_CATALOG;
var init_items = __esm({
  "src/engine/items.ts"() {
    "use strict";
    init_client();
    RECEIVED_FROM_FACTION = {
      Cuisine: "Civil",
      Vengeance: "Civil",
      Apothicairerie: "Civil",
      Apothicaire: "Civil",
      Strat\u00E8ge: "M\xE9chant"
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
      indice: {
        slug: "indice",
        name: "Indice",
        icon: "\u{1F9E9}",
        description: "Une information vraie sur cette partie. Consultation seule."
      }
    };
  }
});

// scripts/phase-ticker.src.ts
init_client();
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/engine/actions.ts
init_client();
init_notify();

// src/engine/winConditions.ts
init_client();
init_roleMeta();
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
var LONE_WINNER_LABEL = {
  empoisonneur: "Empoisonneur",
  veuve_noire: "Veuve noire",
  parieur_tricheur: "Parieur tricheur"
};
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
  await supabase.from("games").update({ status: "ended", ended_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", gameId);
  return r;
}

// src/engine/actions.ts
init_resolver();

// src/lib/phaseTiming.ts
var INTRO_MS = 3e3;
var INTRO_S = INTRO_MS / 1e3;
function introMsFor(phase) {
  return phase === "annonce" ? 0 : INTRO_MS;
}
function introSFor(phase) {
  return introMsFor(phase) / 1e3;
}
var VOTE_RESULT_MS = 8e3;
var VOTE_RESULT_S = VOTE_RESULT_MS / 1e3;

// src/lib/serverClock.ts
init_client();
var cachedOffset = null;
var inflight = null;
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
if (typeof document !== "undefined") void fetchOffset();

// src/engine/actions.ts
var listeners = /* @__PURE__ */ new Set();
function emit(kind, message, meta2) {
  const e = { ts: Date.now(), kind, message, meta: meta2 };
  listeners.forEach((l) => l(e));
}
var meta = (p) => p?.role_meta ?? {};
async function patchMeta(playerId, patch) {
  const { data } = await supabase.from("players").select("role_meta").eq("id", playerId).single();
  const cur = meta(data);
  const next = { ...cur, ...patch };
  await supabase.from("players").update({ role_meta: next }).eq("id", playerId);
  return next;
}
function isKillerClass(r) {
  if (r.is_killer_class != null) return r.is_killer_class;
  return r.faction === "M\xE9chant" && r.type === "TUEUR";
}
function usesOf(m, slug) {
  const u = m.uses ?? {};
  return u[slug] ?? 0;
}
var PHASE_DURATIONS = {
  lobby: 0,
  free: 30,
  annonce: 10,
  gathering: 30,
  vote: 30,
  ended: 0
};
async function phaseDurationFor(gameId, phase) {
  if (phase === "lobby" || phase === "ended") return 0;
  const { data } = await supabase.from("games").select("phase_duration_free_s, phase_duration_gathering_s, phase_duration_vote_s").eq("id", gameId).maybeSingle();
  const row = data ?? {};
  if (phase === "free") return row.phase_duration_free_s ?? PHASE_DURATIONS.free;
  if (phase === "gathering") return row.phase_duration_gathering_s ?? PHASE_DURATIONS.gathering;
  if (phase === "vote") return row.phase_duration_vote_s ?? PHASE_DURATIONS.vote;
  return PHASE_DURATIONS[phase];
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
var TICK_LOCK_TTL_MS = 3e4;
var _tickInFlight = /* @__PURE__ */ new Map();
var MAX_TICK_TRANSITIONS = 6;
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
  const pick = choices[Math.floor(Math.random() * choices.length)];
  await patchMeta(u.id, { cover_slug: pick, cover_choices: null });
  const { data: rs } = await supabase.from("roles").select().eq("set_id", "set1");
  const rolesBySlug = /* @__PURE__ */ new Map();
  for (const r2 of rs ?? []) rolesBySlug.set(r2.slug, r2);
  const r = rolesBySlug.get(pick);
  const label = r ? `${r.icon} ${r.name_fr}` : pick;
  await supabase.from("role_actions").insert({
    game_id: gameId,
    actor_player_id: u.id,
    tour,
    phase: "free",
    payload: { effect: "cover_pick", auto: true, cover: pick },
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
  await deliverStrategeMarks(gameId, tour);
  emit("gather", `\u{1F4EF} Annonce \u2014 ${reason}`, { gameId, gatheringId: gc.id });
  return gc.id;
}
async function deliverStrategeMarks(gameId, tour) {
  const { data: ps } = await supabase.from("players").select().eq("game_id", gameId);
  for (const p of ps ?? []) {
    const m = p.role_meta ?? {};
    const mark = m.targeted_by_stratege;
    if (!mark) continue;
    if (mark.from_tour === tour && p.is_alive) {
      await notify({
        gameId,
        playerId: p.id,
        type: "stratege_marked",
        title: "\u{1F3AF} Tu es cibl\xE9",
        body: `Le Tueur Strat\xE8ge t'a marqu\xE9. Tu mourras \xE0 l'annonce du tour ${mark.resolves_tour ?? tour + 1} si rien ne te prot\xE8ge.`,
        mjTitle: "\u{1F3AF} Strat\xE8ge \u2014 cible pr\xE9venue",
        mjBody: `${p.pseudo} a \xE9t\xE9 pr\xE9venu qu'il est cibl\xE9 par le Strat\xE8ge (mort pr\xE9vue tour ${mark.resolves_tour ?? tour + 1}).`
      });
    }
    if ((mark.resolves_tour ?? -1) <= tour && mark.from_tour !== tour) {
      if (p.is_alive) {
        await notify({
          gameId,
          playerId: p.id,
          type: "stratege_survived",
          title: "\u{1F6E1}\uFE0F Embuscade d\xE9jou\xE9e",
          body: "Tu \xE9tais cibl\xE9 par le Strat\xE8ge, mais tu as surv\xE9cu.",
          mjTitle: "\u{1F6E1}\uFE0F Strat\xE8ge \u2014 \xE9chec",
          mjBody: `${p.pseudo} survit \xE0 l'embuscade du Strat\xE8ge (prot\xE9g\xE9 ou Strat\xE8ge neutralis\xE9).`
        });
      }
      await patchMeta(p.id, { targeted_by_stratege: null });
    }
  }
}
async function openGathering(gameId, phaseStartedAt) {
  await setPhase(gameId, "gathering", phaseStartedAt);
  emit("gather_open", "\u{1F514} D\xE9bat ouvert", { gameId });
}
async function openVote(gameId, phaseStartedAt) {
  await setPhase(gameId, "vote", phaseStartedAt);
  emit("vote_open", "\u{1F5F3}\uFE0F Vote ouvert");
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
      await supabase.from("games").update({ status: "ended", ended_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", gameId);
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
    const isMechantReason = reason === "tueur" || reason === "croque_mitaine";
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
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick) {
      await supabase.from("players").update({ role_slug: "chasseur_de_vampire" }).eq("id", pick.id);
      await patchMeta(pick.id, { chasseur_awakened_cycle: tour });
      await notify({
        gameId,
        playerId: pick.id,
        type: "role_swap",
        title: "\u{1FA78} Tu sens l'appel",
        body: "Tu deviens Chasseur de Vampire. Traque-les avant qu'il ne soit trop tard.",
        mjTitle: "\u{1FA78} Chasseur \xE9merge",
        mjBody: `${pick.pseudo} devient Chasseur de Vampire (choix al\xE9atoire, 1\xE8re morsure).`
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
    fideles: sourceMeta.fideles ?? [],
    fideles_ordered: sourceMeta.fideles_ordered ?? [],
    stratege_pending_order: sourceMeta.stratege_pending_order ?? false,
    stratege_kills_done: sourceMeta.stratege_kills_done ?? 0
  };
  await patchMeta(heir.id, heirMetaPatch);
  await notify({
    gameId,
    playerId: heir.id,
    type: "succession_stratege",
    title: temporary ? "\u265F\uFE0F Tu deviens le Strat\xE8ge (temporaire)" : "\u265F\uFE0F Tu es le nouveau Strat\xE8ge",
    body: temporary ? "Le Strat\xE8ge est en prison, tu prends le relais et tu reprends son ordre de bataille." : "Le Strat\xE8ge est tomb\xE9. Tu reprends exactement son plan : Fid\xE8les et ordre en cours sont \xE0 toi.",
    mjTitle: "\u265F\uFE0F Succession Strat\xE8ge",
    mjBody: `${heir.pseudo} devient ${temporary ? "Strat\xE8ge temporaire" : "le nouveau Strat\xE8ge"} (succession Acolyte).`
  });
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

// scripts/phase-ticker.src.ts
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
