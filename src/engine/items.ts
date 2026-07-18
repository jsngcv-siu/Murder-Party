// Catalogue d'objets — Phase 2 inventaire
// Stockés dans players.role_meta.inventory: Item[]

import { supabase } from "@/integrations/supabase/client";

export type ItemSlug =
  | "fiole_mort"
  | "fiole_vie"
  | "fiole_clairvoyance"
  | "couteau"
  | "lettre"
  | "relique"
  | "indice"
  // ── La Malle du Contrebandier (lot 3) — objets EXCLUSIFS à ce rôle ──
  | "passe_partout"
  | "gilet_matelasse"
  | "rhum_contrebande"
  | "monocle_douanier"
  | "double_fond";

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
  Inconnu: "Méchant",
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
  if (item.slug === "relique") return "Neutre"; // toujours le Conservateur
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
  relique: {
    slug: "relique",
    name: "Relique",
    icon: "🗝️",
    description: "Une relique mystérieuse.",
  },
  indice: {
    slug: "indice",
    name: "Indice",
    icon: "🧩",
    description: "Une information vraie sur cette partie. Consultation seule.",
  },
  // ── La Malle du Contrebandier (lot 3). Distribués UNIQUEMENT par le drip du
  // Contrebandier (1 objet aléatoire tous les 2 tours) — jamais par le catalogue
  // commun. Le Voleur peut les voler : duel Voleur ↔ Contrebandier voulu.
  passe_partout: {
    slug: "passe_partout",
    name: "Le Passe-partout",
    icon: "🗝️",
    description: "Utilisable uniquement en cellule : tu t'évades immédiatement de prison.",
  },
  gilet_matelasse: {
    slug: "gilet_matelasse",
    name: "Le Gilet matelassé",
    icon: "🧥",
    description: "Enfile-le : la prochaine attaque contre toi échoue (protection ce tour).",
  },
  rhum_contrebande: {
    slug: "rhum_contrebande",
    name: "Le Rhum de contrebande",
    icon: "🥃",
    description:
      "Offre discrètement une bouteille : la cible est ivre au prochain tour, sa capacité est coupée.",
  },
  monocle_douanier: {
    slug: "monocle_douanier",
    name: "Le Monocle du douanier",
    icon: "🧐",
    description: "Inspecte un joueur : tu vois l'inventaire complet qu'il transporte.",
  },
  double_fond: {
    slug: "double_fond",
    name: "Le Double-fond",
    icon: "🎒",
    description:
      "Passif tant qu'il est dans ta malle : le premier vol du Voleur contre toi échoue (le Double-fond est sacrifié à la place).",
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
  // `.select("id")` : un UPDATE filtré par RLS renvoie 0 ligne sans erreur — rendu
  // bruyant depuis l'audit 2026-07-16 (objets « donnés » qui n'arrivaient jamais).
  const { data: wrote, error } = await supabase
    .from("players")
    .update({ role_meta: next as never })
    .eq("id", playerId)
    .select("id");
  if (error || !wrote?.length)
    console.error(`[engine] grantItem(${item.slug}) REFUSÉ sur ${playerId} (RLS ?)`, error ?? "0 ligne");
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
  if (slug === "relique") {
    const v = (payload?.variant as ReliqueVariant | undefined) ?? null;
    return v === "lettre_scellee" || v === "oeil_damnation" ? "single" : "none";
  }
  // Lettre du facteur : envoyée à un joueur vivant (n'est utilisable que si jamais envoyée).
  if (slug === "lettre") {
    const sent = !!payload?.sent;
    return sent ? "none" : "single";
  }
  // Malle du Contrebandier : évasion et gilet s'appliquent à soi ; le double-fond
  // est passif (jamais « utilisé »).
  if (slug === "passe_partout" || slug === "gilet_matelasse" || slug === "double_fond")
    return "none";
  return "single";
}

/** Indique si l'objet peut être activement utilisé (sinon : consultation seule). */
export function itemIsUsable(slug: ItemSlug, payload?: Record<string, unknown> | null): boolean {
  if (slug === "indice") return false; // consultation seule
  if (slug === "relique") {
    const v = (payload?.variant as ReliqueVariant | undefined) ?? null;
    return RELIQUES_WITH_EFFECT.has(v ?? "");
  }
  if (slug === "lettre") {
    // Utilisable uniquement si la lettre n'a pas encore été envoyée.
    return !payload?.sent;
  }
  return (
    slug === "fiole_mort" ||
    slug === "fiole_vie" ||
    slug === "fiole_clairvoyance" ||
    slug === "couteau" ||
    // Malle du Contrebandier — le double-fond est passif (consultation seule).
    slug === "passe_partout" ||
    slug === "gilet_matelasse" ||
    slug === "rhum_contrebande" ||
    slug === "monocle_douanier"
  );
}

// ─── Reliques du Conservateur ────────────────────────────────────────────
export type ReliqueVariant =
  | "coeur_du_manoir"
  | "oeil_damnation"
  | "medaillon_vieux_maitre"
  | "lettre_scellee"
  | "miroir_minuit"
  | "clef_aile_interdite"
  | "poupee_grenier"
  | "lettre_oubliee"
  | "portrait_dame_blanche"
  | "bougie_des_ames";

type ReliqueEffect = "reveal_random" | "protect_self" | "block_target" | "special_win";
type ReliqueDef = {
  name: string;
  icon: string;
  description: string;
  weight: number;
  effect?: ReliqueEffect;
};

export const RELIQUE_CATALOG: Record<ReliqueVariant, ReliqueDef> = {
  coeur_du_manoir: {
    name: "Le Cœur du Manoir",
    icon: "🫀",
    weight: 5.0,
    effect: "special_win",
    description:
      "Relique ultime — si tu la révèles, le Conservateur remporte la partie. Tout le monde perd.",
  },
  oeil_damnation: {
    name: "L'Œil de la Damnation",
    icon: "👁️",
    weight: 4.0,
    effect: "reveal_random",
    description: "Révèle le rôle d'un joueur au hasard.",
  },
  medaillon_vieux_maitre: {
    name: "Le Médaillon du Vieux Maître",
    icon: "🏅",
    weight: 4.0,
    effect: "protect_self",
    description: "Te protège pendant 1 tour entier.",
  },
  lettre_scellee: {
    name: "La Lettre Scellée",
    icon: "✉️",
    weight: 4.0,
    effect: "block_target",
    description: "Bloque la capacité d'un joueur ciblé pendant 1 tour.",
  },
  miroir_minuit: {
    name: "Le Miroir de Minuit",
    icon: "🪞",
    weight: 10.0,
    description: "Un reflet glacé, sans pouvoir. Pure beauté maudite.",
  },
  clef_aile_interdite: {
    name: "La Clé de l'Aile Interdite",
    icon: "🗝️",
    weight: 12.0,
    description: "Elle n'ouvre plus rien — ou alors plus rien d'utile.",
  },
  poupee_grenier: {
    name: "La poupée du grenier",
    icon: "🪆",
    weight: 14.0,
    description: "Elle te regarde fixement. Aucune capacité.",
  },
  lettre_oubliee: {
    name: "La Lettre Oubliée",
    icon: "📜",
    weight: 16.0,
    description: "Une lettre jamais lue, jamais envoyée. Aucun effet.",
  },
  portrait_dame_blanche: {
    name: "Le Portrait de la Dame Blanche",
    icon: "🖼️",
    weight: 17.5,
    description: "Son regard te suit. C'est tout.",
  },
  bougie_des_ames: {
    name: "La Bougie des Âmes",
    icon: "🕯️",
    weight: 13.5,
    description: "Sa flamme vacille — sans réelle utilité.",
  },
};

const RELIQUES_WITH_EFFECT = new Set<string>([
  "coeur_du_manoir",
  "oeil_damnation",
  "medaillon_vieux_maitre",
  "lettre_scellee",
]);

/** Tire une variante de relique au sort selon les poids. */
export function rollRelique(): ReliqueVariant {
  const entries = Object.entries(RELIQUE_CATALOG) as [ReliqueVariant, ReliqueDef][];
  const total = entries.reduce((a, [, v]) => a + v.weight, 0);
  let r = Math.random() * total;
  for (const [k, v] of entries) {
    r -= v.weight;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

/** Construit un item relique nommé (variant en payload). */
export function buildRelique(variant: ReliqueVariant, from = "Manoir"): Item {
  const def = RELIQUE_CATALOG[variant];
  return {
    id: crypto.randomUUID(),
    slug: "relique",
    name: def.name,
    icon: def.icon,
    description: def.description,
    received_at: new Date().toISOString(),
    received_from: from,
    payload: { variant, origin_faction: "Neutre" satisfies ItemFaction }, // Conservateur
  };
}

type UsePlayer = { id: string; pseudo: string; role_slug: string | null };
type UseRole = {
  slug: string;
  name_fr: string;
  icon: string;
  faction: string;
  // Optionnels : requis seulement pour le camouflage killer-class d'une enquête
  // (Fiole de clairvoyance). Absents = pas de camouflage appliqué.
  type?: string | null;
  is_killer_class?: boolean | null;
};

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
    // ── La Malle du Contrebandier (lot 3) ──
    case "passe_partout": {
      const { data: meRow } = await supabase
        .from("players")
        .select("is_imprisoned")
        .eq("id", actorId)
        .maybeSingle();
      if (!(meRow as { is_imprisoned: boolean } | null)?.is_imprisoned) {
        return { ok: false, message: "Ce passe ne sert qu'en cellule — garde-le précieusement." };
      }
      const { releasePlayer } = await import("./actions");
      await releasePlayer(gameId, actorId);
      message = "🗝️ La serrure cède — tu t'évades de prison.";
      await notify(actorId, "🗝️ Évasion", message);
      break;
    }
    case "gilet_matelasse": {
      const { data: row } = await supabase
        .from("players")
        .select("role_meta")
        .eq("id", actorId)
        .maybeSingle();
      const meta0 = (row?.role_meta ?? {}) as Record<string, unknown>;
      const protUntil = Math.max(
        (meta0.protected_until_cycle as number | undefined) ?? -1,
        tour + 1,
      );
      await supabase
        .from("players")
        .update({ role_meta: { ...meta0, protected_until_cycle: protUntil } as never })
        .eq("id", actorId);
      message = "🧥 Gilet enfilé : la prochaine attaque contre toi échouera (ce tour).";
      await notify(actorId, "🧥 Gilet matelassé", message);
      break;
    }
    case "rhum_contrebande": {
      if (!target) {
        message = "Cible requise pour offrir le rhum.";
        break;
      }
      const { data: row } = await supabase
        .from("players")
        .select("role_meta")
        .eq("id", target.id)
        .maybeSingle();
      const meta0 = (row?.role_meta ?? {}) as Record<string, unknown>;
      await supabase
        .from("players")
        .update({
          role_meta: {
            ...meta0,
            blocked_from_cycle: tour + 1,
            blocked_until_cycle: Math.max(
              (meta0.blocked_until_cycle as number | undefined) ?? -1,
              tour + 1,
            ),
          } as never,
        })
        .eq("id", target.id);
      await notify(
        target.id,
        "🥃 Un verre de trop",
        "Quelqu'un t'a offert un verre… corsé. Ta capacité sera coupée au prochain tour.",
      );
      message = `🥃 ${target.pseudo} sera ivre au prochain tour — capacité coupée.`;
      break;
    }
    case "monocle_douanier": {
      if (!target) {
        message = "Cible requise pour l'inspection.";
        break;
      }
      const { data: row } = await supabase
        .from("players")
        .select("role_meta")
        .eq("id", target.id)
        .maybeSingle();
      const tInv = (((row?.role_meta ?? {}) as Record<string, unknown>).inventory ??
        []) as Item[];
      const names = tInv.filter((it) => !it.consumed).map((it) => `${it.icon} ${it.name}`);
      message =
        names.length === 0
          ? `🧐 ${target.pseudo} ne transporte rien.`
          : `🧐 ${target.pseudo} transporte : ${names.join(" · ")}.`;
      await notify(actorId, "🧐 Inspection douanière", message);
      break;
    }
    case "double_fond": {
      return {
        ok: false,
        message: "Le Double-fond agit tout seul : il encaissera le premier vol à ta place.",
      };
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
      await notify(
        target!.id,
        "💚 Soigné",
        "Une fiole de vie te protège pour la prochaine Annonce.",
      );
      message = `${target!.pseudo} : soin — à l'Annonce.`;
      break;
    }
    case "fiole_clairvoyance": {
      // Révèle la FACTION seule (pas le rôle complet). Comme toute enquête, elle
      // respecte les déguisements — seul l'Assistant du détective perce, et il
      // n'utilise pas de fiole. Avant, la faction RÉELLE fuitait l'Usurpateur
      // couvert et le Tueur camouflé, et la falsification n'aveuglait pas la
      // fiole (audit 2026-07-16).
      const { isKillerClass } = await import("./actions");
      const { data: tRow } = await supabase
        .from("players")
        .select("role_meta")
        .eq("id", target!.id)
        .maybeSingle();
      const tMeta = (tRow?.role_meta ?? {}) as Record<string, unknown>;
      if (tMeta.falsified === true) {
        message = "Le joueur a été falsifié";
      } else {
        // Usurpateur sous couverture (toujours un Civil) → faction de la couverture.
        const coverSlug = typeof tMeta.cover_slug === "string" ? tMeta.cover_slug : null;
        const seenSlug = coverSlug ?? target!.role_slug;
        const r = seenSlug ? opts.rolesBySlug.get(seenSlug) : null;
        // Tueur méchant camouflé (killer-class) → apparaît « Civil ».
        const faction = r && isKillerClass(r) ? "Civil" : (r?.faction ?? null);
        message = faction
          ? `${target!.pseudo} = faction ${faction}`
          : `${target!.pseudo} : faction inconnue`;
      }
      await notify(actorId, "🔮 Clairvoyance", message);
      break;
    }
    case "couteau": {
      const { submitIntent } = await import("./resolver");
      const mechantOrigin =
        (item.payload as Record<string, unknown> | null)?.mechant_origin === true;
      // Origine du couteau pour l'annonce de mort au joueur visé.
      // "Cuisine" = couteau du Cuisinier (passif), "Vengeance" = couteau du
      // Vengeur, "Inconnu" = couteau remis anonymement par l'Armurier.
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
        case "Inconnu":
          weaponFromSlug = "armurier";
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
      // Si ce couteau a été remis par l'Armurier, on le prévient que SON arme a
      // servi : « [porteur] a utilisé couteau sur [cible] ». (Le porteur insère
      // la notif — autorisé par la RLS ; l'historique secret de l'Armurier ne
      // peut, lui, pas être écrit par un autre joueur.)
      const giftedById = (item.payload as Record<string, unknown> | null)?.gifted_by_id as
        | string
        | undefined;
      if (giftedById) {
        await notify(
          giftedById,
          "🔪 Ton couteau a frappé",
          `${opts.actorPseudo} a utilisé couteau sur ${target!.pseudo}.`,
        );
      }
      message = `${target!.pseudo} : coup de couteau — à l'Annonce.`;
      break;
    }
    case "relique": {
      const variant = (item.payload?.variant as ReliqueVariant | undefined) ?? null;
      const def = variant ? RELIQUE_CATALOG[variant] : null;
      if (variant === "coeur_du_manoir") {
        // Garde-fou : la « Victoire du Conservateur » n'a de sens que si un
        // Conservateur est dans la partie. L'objet ne peut aujourd'hui arriver
        // en inventaire que par lui, mais toute source future de reliques
        // (Contrebandier, événement…) armerait une victoire fantôme sans ce check.
        const { data: gardien } = await supabase
          .from("players")
          .select("id")
          .eq("game_id", gameId)
          .eq("role_slug", "conservateur")
          .limit(1)
          .maybeSingle();
        if (!gardien) {
          message =
            "🫀 Le Cœur du Manoir bat faiblement… mais aucun gardien ne le réclame. Rien ne se passe.";
        } else {
          const { endGameWithWinner } = await import("./actions");
          await endGameWithWinner(
            gameId,
            "Conservateur",
            `${opts.actorPseudo} a révélé Le Cœur du Manoir. Le Manoir le reconnaît comme son gardien.`,
          );
          message =
            "🫀 Le Cœur du Manoir bat dans tes mains — toutes les factions s'inclinent. Victoire du Conservateur.";
        }
      } else if (variant === "oeil_damnation") {
        // Révèle le rôle d'un joueur vivant au hasard (≠ porteur)
        const { data: pool } = await supabase
          .from("players")
          .select("id, pseudo, role_slug")
          .eq("game_id", gameId)
          .eq("is_alive", true)
          .eq("is_mj", false)
          .neq("id", actorId);
        const list = (pool ?? []) as Array<{
          id: string;
          pseudo: string;
          role_slug: string | null;
        }>;
        if (list.length === 0) {
          message = "👁️ Personne d'autre n'est en vie — l'Œil reste aveugle.";
        } else {
          const picked = list[Math.floor(Math.random() * list.length)];
          const r = picked.role_slug ? opts.rolesBySlug.get(picked.role_slug) : null;
          message = `👁️ L'Œil de la Damnation s'ouvre : ${picked.pseudo} est ${r ? `${r.icon} ${r.name_fr} (${r.faction})` : "de rôle inconnu"}.`;
        }
        await notify(actorId, "👁️ L'Œil de la Damnation", message);
      } else if (variant === "medaillon_vieux_maitre") {
        // Protection pour 1 tour (cycle courant)
        const { data: row } = await supabase
          .from("players")
          .select("role_meta")
          .eq("id", actorId)
          .maybeSingle();
        const meta0 = (row?.role_meta ?? {}) as Record<string, unknown>;
        const protUntil = Math.max((meta0.protected_until_cycle as number | undefined) ?? -1, tour);
        await supabase
          .from("players")
          .update({ role_meta: { ...meta0, protected_until_cycle: protUntil } as never })
          .eq("id", actorId);
        message = "🏅 Le Médaillon du Vieux Maître te protège pour le restant du tour.";
        await notify(actorId, "🏅 Médaillon activé", message);
      } else if (variant === "lettre_scellee") {
        if (!target) {
          message = "Cible requise pour La Lettre Scellée.";
          break;
        }
        const { data: row } = await supabase
          .from("players")
          .select("role_meta")
          .eq("id", target.id)
          .maybeSingle();
        const meta0 = (row?.role_meta ?? {}) as Record<string, unknown>;
        const blockUntil = Math.max((meta0.blocked_until_cycle as number | undefined) ?? -1, tour);
        await supabase
          .from("players")
          .update({ role_meta: { ...meta0, blocked_until_cycle: blockUntil } as never })
          .eq("id", target.id);
        message = `✉️ La Lettre Scellée bloque la capacité de ${target.pseudo} pour le tour.`;
        await notify(
          target.id,
          "✉️ Capacité scellée",
          "Une Lettre Scellée bloque ta capacité pour le restant du tour.",
        );
        await notify(actorId, "✉️ Lettre Scellée utilisée", message);
      } else {
        message = def ? `${def.icon} ${def.name} révélée. ${def.description}` : "Relique révélée.";
        await notify(actorId, "🗝️ Relique révélée", message);
      }
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
