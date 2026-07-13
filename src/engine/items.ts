// Catalogue d'objets — Phase 2 inventaire
// Stockés dans players.role_meta.inventory: Item[]

import { supabase } from "@/integrations/supabase/client";

export type ItemSlug =
  | "fiole_mort"
  | "fiole_vie"
  | "fiole_clairvoyance"
  | "couteau"
  | "lettre"
  | "indice";

/** Faction du rôle dont provient un objet (pour colorer son contour). */
export type ItemFaction = "Civil" | "Méchant" | "Neutre";
/**
 * Provenance d'un objet : la faction d'un rôle, ou "Système" quand l'objet ne
 * vient d'AUCUN rôle mais est distribué par le jeu lui-même (le Manoir) — ex.
 * les indices remis au setup. `null` = origine inconnue par design (lettre).
 */
export type ItemOrigin = ItemFaction | "Système";

// Provenance affichée (`received_from`) → faction du rôle source.
// Ces libellés sont volontairement obfusqués en jeu ("Inconnu"…), mais la
// coloration les traduit en faction comme le ferait un joueur averti.
const RECEIVED_FROM_FACTION: Record<string, ItemOrigin> = {
  Cuisine: "Civil",
  Vengeance: "Civil",
  Apothicairerie: "Civil",
  Apothicaire: "Civil",
  Stratège: "Méchant",
};

/**
 * Provenance d'un objet, pour la coloration du contour.
 * - "Système" : distribué par le jeu, pas par un rôle (indices du setup).
 * - null : origine inconnue par design (lettre anonyme / pseudo de joueur).
 */
export function itemFaction(item: Item): ItemOrigin | null {
  const stamped = item.payload?.origin_faction as ItemOrigin | undefined;
  if (stamped) return stamped; // priorité : tamponné au grant (survit au vol d'objet)
  if (item.payload?.mechant_origin === true) return "Méchant";
  if (item.slug === "indice") return "Système"; // remis par le jeu au setup, pas un rôle
  if (item.received_from && RECEIVED_FROM_FACTION[item.received_from]) {
    return RECEIVED_FROM_FACTION[item.received_from];
  }
  return null;
}

export type Item = {
  id: string;
  slug: ItemSlug;
  name: string;
  icon: string;
  description: string;
  received_at: string;
  received_from?: string; // pseudo de l'expéditeur
  payload?: Record<string, unknown>; // message lettre, faction vue, etc.
  consumed?: boolean;
};

export const ITEM_CATALOG: Record<
  ItemSlug,
  Omit<Item, "id" | "received_at" | "received_from" | "payload">
> = {
  fiole_mort: {
    slug: "fiole_mort",
    name: "Fiole de mort",
    icon: "☠️",
    description:
      "Donne la mort à une cible : elle mourra à la prochaine Annonce, sans laisser de trace de poison.",
  },
  fiole_vie: {
    slug: "fiole_vie",
    name: "Fiole de vie",
    icon: "💚",
    description: "Protège une cible jusqu'à la prochaine Annonce.",
  },
  fiole_clairvoyance: {
    slug: "fiole_clairvoyance",
    name: "Fiole de clairvoyance",
    icon: "🔮",
    description: "Révèle la faction d'une cible.",
  },
  couteau: {
    slug: "couteau",
    name: "Couteau",
    icon: "🔪",
    description: "Tue silencieusement une cible. Utilisable une seule fois.",
  },
  lettre: {
    slug: "lettre",
    name: "Lettre anonyme",
    icon: "📨",
    description: "Une lettre anonyme t'a été remise.",
  },
  indice: {
    slug: "indice",
    name: "Indice",
    icon: "🧩",
    description: "Une information vraie sur cette partie. Consultation seule.",
  },
};

export function buildItem(
  slug: ItemSlug,
  opts: {
    from?: string;
    payload?: Record<string, unknown>;
    nameOverride?: string;
    descriptionOverride?: string;
    iconOverride?: string;
    originFaction?: ItemOrigin;
  } = {},
): Item {
  const base = ITEM_CATALOG[slug];
  // Tamponne la faction d'origine dans le payload : survit au vol d'objet
  // (qui réécrit `received_from` par le pseudo de la victime).
  const payload = opts.originFaction
    ? { ...(opts.payload ?? {}), origin_faction: opts.originFaction }
    : opts.payload;
  return {
    id: crypto.randomUUID(),
    slug,
    name: opts.nameOverride ?? base.name,
    icon: opts.iconOverride ?? base.icon,
    description: opts.descriptionOverride ?? base.description,
    received_at: new Date().toISOString(),
    received_from: opts.from,
    payload,
  };
}

/** Append item(s) to a player's inventory in role_meta. */
export async function grantItem(playerId: string, item: Item): Promise<void> {
  const { data: row } = await supabase
    .from("players")
    .select("role_meta")
    .eq("id", playerId)
    .maybeSingle();
  const meta = (row?.role_meta ?? {}) as Record<string, unknown>;
  const inv = (meta.inventory as Item[] | undefined) ?? [];
  const next = { ...meta, inventory: [item, ...inv] };
  await supabase
    .from("players")
    .update({ role_meta: next as never })
    .eq("id", playerId);
}

export function readInventory(roleMeta: Record<string, unknown> | null | undefined): Item[] {
  if (!roleMeta) return [];
  return (roleMeta.inventory as Item[] | undefined) ?? [];
}

/** Indique si un objet a besoin d'une cible pour être utilisé. */
export function itemNeedsTarget(
  slug: ItemSlug,
  payload?: Record<string, unknown> | null,
): "single" | "none" {
  if (slug === "indice") return "none";
  // Lettre du facteur : envoyée à un joueur vivant (n'est utilisable que si jamais envoyée).
  if (slug === "lettre") {
    const sent = !!payload?.sent;
    return sent ? "none" : "single";
  }
  return "single";
}

/** Indique si l'objet peut être activement utilisé (sinon : consultation seule). */
export function itemIsUsable(slug: ItemSlug, payload?: Record<string, unknown> | null): boolean {
  if (slug === "indice") return false; // consultation seule
  if (slug === "lettre") {
    // Utilisable uniquement si la lettre n'a pas encore été envoyée.
    return !payload?.sent;
  }
  return (
    slug === "fiole_mort" ||
    slug === "fiole_vie" ||
    slug === "fiole_clairvoyance" ||
    slug === "couteau"
  );
}

type UsePlayer = { id: string; pseudo: string; role_slug: string | null };
type UseRole = { slug: string; name_fr: string; icon: string; faction: string };

/** Applique l'effet d'un objet et marque la fiche comme consommée. */
export async function consumeItem(opts: {
  gameId: string;
  actorId: string;
  actorPseudo: string;
  item: Item;
  target?: UsePlayer | null;
  tour: number;
  rolesBySlug: Map<string, UseRole>;
}): Promise<{ ok: boolean; message: string }> {
  const { item, target, actorId, gameId, tour } = opts;
  if (!itemIsUsable(item.slug, item.payload))
    return { ok: false, message: "Cet objet n'a pas d'effet actif." };
  if (item.consumed) return { ok: false, message: "Objet déjà utilisé." };
  if (itemNeedsTarget(item.slug, item.payload) === "single" && !target)
    return { ok: false, message: "Cible requise" };

  // Limite : 1 objet utilisé par tour, pour tous.
  const { data: actorRow } = await supabase
    .from("players")
    .select("role_meta")
    .eq("id", actorId)
    .maybeSingle();
  const actorMeta = (actorRow?.role_meta ?? {}) as Record<string, unknown>;
  const lastItemUseTour = (actorMeta.last_item_use_cycle as number | undefined) ?? -1;
  if (lastItemUseTour === tour) {
    return { ok: false, message: "Tu as déjà utilisé un objet ce tour-ci." };
  }

  // Apothicaire : ses PROPRES fioles (taguées `apo_own`). Elle ne peut en GARDER
  // qu'une seule pour elle-même ; les 2 autres (au moins) doivent être offertes
  // via sa capacité. Les fioles reçues en cadeau n'ont pas ce tag → sans limite.
  const isApoOwnFiole =
    (item.slug === "fiole_mort" ||
      item.slug === "fiole_vie" ||
      item.slug === "fiole_clairvoyance") &&
    item.payload?.apo_own === true;
  if (isApoOwnFiole && ((actorMeta.fioles_self_used as number | undefined) ?? 0) >= 1) {
    return {
      ok: false,
      message: "Tu ne peux garder qu'une seule fiole pour toi — les autres doivent être offertes.",
    };
  }

  const notify = async (playerId: string, title: string, body: string) => {
    await supabase
      .from("notifications")
      .insert({ game_id: gameId, player_id: playerId, type: "item_effect", title, body });
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
        return { ok: false, message: "Écris un message avant d'envoyer." };
      }
      const msg = raw.slice(0, 80);
      // Le destinataire reçoit un objet "Lettre de [expéditeur]" dans son inventaire,
      // marqué comme consommé (consultation seule, pas réutilisable).
      const received = buildItem("lettre", {
        from: opts.actorPseudo,
        payload: { message: msg, sent: true, sent_to: target.pseudo, sender: opts.actorPseudo },
        nameOverride: `Lettre de ${opts.actorPseudo}`,
        descriptionOverride: `Une lettre de ${opts.actorPseudo}. Touche-la pour la lire.`,
      });
      // Pas marquée consommée : le destinataire peut l'ouvrir pour lire le message.
      // `payload.sent = true` rend le bouton "Utiliser" inactif (consultation seule).
      await grantItem(target.id, received);
      await notify(
        target.id,
        "📨 Nouvelle lettre",
        `Tu as reçu une lettre de ${opts.actorPseudo}.`,
      );
      message = `📨 Lettre envoyée à ${target.pseudo}.`;
      item.payload = { ...(item.payload ?? {}), message: msg, sent: true, sent_to: target.pseudo };
      break;
    }
    case "fiole_mort": {
      // V2 : intention ATTACK/DEFERRED. La fiole est consommée ci-dessous
      // (role_meta) même si la cible est protégée.
      const { submitIntent } = await import("./resolver");
      await submitIntent({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target!.id,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "item:fiole_mort",
        payload: { kill_reason: "fiole_mort", target_pseudo: target!.pseudo },
      });
      // Silencieux côté victime : elle ne sait pas qu'elle est empoisonnée
      // (cohérent avec les autres morts différées — couteau, Tueur…).
      message = `${target!.pseudo} : intention de mort — à l'Annonce.`;
      break;
    }
    case "fiole_vie": {
      const { submitIntent } = await import("./resolver");
      await submitIntent({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target!.id,
        category: "CURE",
        timing: "DEFERRED",
        source: "item:fiole_vie",
        payload: { target_pseudo: target!.pseudo },
      });
      // Silencieux côté protégé : comme toutes les protections (Ange gardien,
      // Majordome, Barman), la cible ne doit pas savoir qu'elle est protégée.
      message = `${target!.pseudo} : soin — à l'Annonce.`;
      break;
    }
    case "fiole_clairvoyance": {
      const r = target!.role_slug ? opts.rolesBySlug.get(target!.role_slug) : null;
      // Révèle la FACTION seule (conforme à la description de l'objet et à
      // l'Apothicaire) — pas le rôle complet.
      message = r
        ? `${target!.pseudo} = faction ${r.faction}`
        : `${target!.pseudo} : faction inconnue`;
      await notify(actorId, "🔮 Clairvoyance", message);
      break;
    }
    case "couteau": {
      const { submitIntent } = await import("./resolver");
      const mechantOrigin =
        (item.payload as Record<string, unknown> | null)?.mechant_origin === true;
      // Origine du couteau pour l'annonce de mort au joueur visé.
      // "Cuisine" = couteau du Cuisinier (passif), "Vengeance" = couteau du Vengeur.
      let weaponFromSlug: string | null = null;
      switch (item.received_from) {
        case "Cuisine":
          weaponFromSlug = "cuisinier";
          break;
        case "Vengeance":
          weaponFromSlug = "vengeur";
          break;
        case "Stratège":
          weaponFromSlug = "stratege";
          break;
        default:
          weaponFromSlug = null;
      }
      await submitIntent({
        gameId,
        tour,
        phase: "free",
        actorId,
        targetId: target!.id,
        category: "ATTACK",
        timing: "DEFERRED",
        source: "item:couteau",
        payload: {
          kill_reason: "couteau",
          target_pseudo: target!.pseudo,
          mechant_mechanic: mechantOrigin,
          weapon_from_slug: weaponFromSlug,
        },
      });
      message = `${target!.pseudo} : coup de couteau — à l'Annonce.`;
      break;
    }
  }

  // Marque l'objet comme consommé dans l'inventaire de l'acteur + verrouille la quota du tour.
  const { data: row } = await supabase
    .from("players")
    .select("role_meta")
    .eq("id", actorId)
    .maybeSingle();
  const meta = (row?.role_meta ?? {}) as Record<string, unknown>;
  const inv = ((meta.inventory as Item[] | undefined) ?? []).map((it) =>
    it.id === item.id ? { ...it, consumed: true, payload: item.payload ?? it.payload } : it,
  );
  // Comptabilité Apothicaire quand elle utilise UNE DE SES fioles elle-même :
  // marque la fiole consommée (flasks_used, pour griser le picker d'offre) et
  // incrémente le compteur d'auto-usage (plafonné à 1 ci-dessus).
  const apoPatch: Record<string, unknown> = {};
  if (isApoOwnFiole) {
    const fioleKey =
      item.slug === "fiole_vie" ? "heal" : item.slug === "fiole_mort" ? "poison" : "reveal";
    const fu = (meta.flasks_used as string[] | undefined) ?? [];
    apoPatch.flasks_used = fu.includes(fioleKey) ? fu : [...fu, fioleKey];
    apoPatch.fioles_self_used = ((meta.fioles_self_used as number | undefined) ?? 0) + 1;
  }
  await supabase
    .from("players")
    .update({
      role_meta: { ...meta, inventory: inv, last_item_use_cycle: tour, ...apoPatch } as never,
    })
    .eq("id", actorId);

  // Trace dans role_actions pour l'historique du joueur
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
      object_capacity: item.received_from === "Cuisine",
    } as never,
    result: { message } as never,
  });

  return { ok: true, message };
}
