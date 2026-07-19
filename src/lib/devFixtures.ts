// Fabrique d'état SYNTHÉTIQUE pour les écrans de dev (galerie /dev, /state-lab).
// Aucune partie réelle : l'état est fabriqué à la volée, donc on peut atteindre
// des situations impossibles à forcer en live (mort + prison + vivant côte à côte,
// victoire par faction, etc.).
//
// Extrait de `routes/dev.tsx` pour être partagé : /dev rend des frames isolées,
// /state-lab monte le PlayerShell complet — les deux ont besoin du même roster.
import type { GameRow, PlayerRow, RoleRow } from "@/engine/actions";
import type { Item, ItemSlug, ItemOrigin } from "@/engine/items";
import { ITEM_CATALOG, RELIQUE_CATALOG, type ReliqueVariant } from "@/engine/items";

export const uid = () => crypto.randomUUID();

// ──────────────────────────────────────────────────────────────────────────
// Inventaire de démonstration
// ──────────────────────────────────────────────────────────────────────────

// Un max d'objets et d'infos pour bien juger le rendu des cartes (PNG plein
// cadre + étiquette). Couvre les 3 sections (À utiliser / Consultable /
// Classés), toutes les provenances (Civil / Méchant / Neutre / Système /
// inconnue) et des noms courts comme longs (test du line-clamp). Presque tous
// les slugs ont un vrai PNG.
export function previewItem(
  slug: ItemSlug,
  name: string,
  origin: ItemOrigin | null,
  opts: {
    consumed?: boolean;
    variant?: string;
    from?: string;
    desc?: string; // override (ex. lettre reçue — comme descriptionOverride en live)
    payload?: Record<string, unknown>;
  } = {},
): Item {
  const payload: Record<string, unknown> = { ...(opts.payload ?? {}) };
  if (origin) payload.origin_faction = origin;
  if (opts.variant) payload.variant = opts.variant;
  // Description RÉELLE des catalogues (reliques par variante, sinon objet de
  // base) : la modale de la sandbox doit dire à quoi sert l'objet, comme en
  // vraie partie. Les indices restent leur propre texte (le nom EST l'info).
  const description =
    opts.desc ??
    (slug === "indice"
      ? name
      : opts.variant
        ? (RELIQUE_CATALOG[opts.variant as ReliqueVariant]?.description ?? name)
        : (ITEM_CATALOG[slug]?.description ?? name));
  return {
    id: uid(),
    slug,
    name,
    icon: "🧩",
    description,
    received_at: new Date().toISOString(),
    received_from: opts.from,
    payload,
    consumed: opts.consumed,
  } as Item;
}

export const PREVIEW_INVENTORY: Item[] = [
  // ── À utiliser ──
  previewItem("couteau", "Couteau de cuisine ensanglanté", "Méchant", { from: "Inconnu" }),
  // Les fioles proviennent de l'apothicaire (Civil) — voir buildItem dans actions.ts.
  previewItem("fiole_mort", "Fiole de mort", "Civil", { from: "Apothicairerie" }),
  previewItem("fiole_vie", "Fiole de vie", "Civil", { from: "Apothicairerie" }),
  previewItem("fiole_clairvoyance", "Fiole de clairvoyance", "Civil"),
  previewItem("relique", "Le Cœur du Manoir", "Neutre", { variant: "coeur_du_manoir" }),
  previewItem("relique", "L'Œil de la Damnation", "Neutre", { variant: "oeil_damnation" }),
  previewItem("relique", "Le Médaillon du Vieux Maître", "Neutre", {
    variant: "medaillon_vieux_maitre",
  }),
  previewItem("lettre", "Lettre à envoyer", null),
  // ── Consultable ──
  previewItem("indice", "Indice — Lettre déchirée, moitié gauche", "Système", {
    payload: { fragment: true, half: "A" },
  }),
  previewItem("indice", "Indice — Le majordome n'a pas d'alibi", "Système"),
  previewItem("indice", "Indice — Un Civil se cache parmi les invités", "Système"),
  previewItem("relique", "Le Portrait de la Dame Blanche", "Neutre", {
    variant: "portrait_dame_blanche",
  }),
  previewItem("relique", "La poupée du grenier", "Neutre", { variant: "poupee_grenier" }),
  // Lettre SIGNÉE reçue (flux Facteur/Ventriloque) : consultation seule.
  previewItem("lettre", "Lettre de Margot", null, {
    from: "Margot",
    desc: "Une lettre de Margot. Touche-la pour la lire.",
    payload: { sent: true, sender: "Margot", message: "Je sais ce que tu as fait." },
  }),
  // ── Classés ──
  previewItem("couteau", "Couteau", "Méchant", { consumed: true }),
  previewItem("fiole_vie", "Fiole de vie", "Civil", { consumed: true }),
  previewItem("relique", "La Lettre Scellée", "Neutre", {
    variant: "lettre_scellee",
    consumed: true,
  }),
];

// ──────────────────────────────────────────────────────────────────────────
// Partie & roster
// ──────────────────────────────────────────────────────────────────────────

export function baseGame(over: Partial<GameRow> = {}): GameRow {
  const now = new Date().toISOString();
  return {
    id: uid(),
    code: "SANDBOX",
    status: "in_progress",
    set_id: "set1",
    mode_detective_player: false,
    current_phase: "free",
    current_tour: 2,
    mj_session_id: "dev",
    mj_user_id: null,
    created_at: now,
    started_at: now,
    ended_at: null,
    phase_started_at: now,
    phase_duration_s: 180,
    phase_duration_free_s: 180,
    phase_duration_gathering_s: 180,
    phase_duration_vote_s: 30,
    paused: false,
    forced_frame: null,
    banned_roles: [],
    pool_config: null,
    variant: null,
    ...over,
  } as GameRow;
}

export type CastSpec = {
  pseudo: string;
  slugs: string[]; // préférences de rôle (premier présent gagne)
  faction: string; // fallback si aucun slug présent
  dead?: boolean;
  imprisoned?: boolean;
  meta?: Record<string, unknown>;
};

// Distribution couvrant toutes les frames et toutes les victoires de faction/solo.
export const CAST: CastSpec[] = [
  { pseudo: "Alice", slugs: ["ange_gardien", "saint", "medecin_legiste"], faction: "Civil" },
  { pseudo: "Bob", slugs: ["tueur", "parrain", "acolyte"], faction: "Méchant" },
  { pseudo: "Cléo", slugs: ["vampire"], faction: "Méchant", meta: { converted: false } },
  { pseudo: "Dré", slugs: ["oracle"], faction: "Civil", meta: { prophecy: "Civil" } },
  { pseudo: "Émile", slugs: ["empoisonneur"], faction: "Neutre" },
  {
    pseudo: "Faye",
    slugs: ["veuve_noire"],
    faction: "Neutre",
    dead: true,
    meta: {
      death_cycle: 2,
      death_phase: "annonce",
      death_reason: "Retrouvée au petit matin — aucune trace de l'arme.",
      testament: "Vous vous trompez de coupable…",
    },
  },
  { pseudo: "Gus", slugs: ["parieur_tricheur"], faction: "Neutre" },
  { pseudo: "Hana", slugs: ["heritier_dechu", "imitateur"], faction: "Neutre" },
  { pseudo: "Ivo", slugs: ["entremetteur"], faction: "Neutre" },
  {
    pseudo: "Jin",
    slugs: ["assistant_du_detective", "journaliste", "policier"],
    faction: "Civil",
    imprisoned: true,
    meta: { imprisoned_since_cycle: 2 },
  },
  { pseudo: "Kya", slugs: ["medium", "voyante"], faction: "Civil" },
  { pseudo: "Léo", slugs: ["chasseur_de_vampire"], faction: "Neutre" },
];

export function pickSlug(roles: Map<string, RoleRow>, spec: CastSpec): string | null {
  for (const s of spec.slugs) if (roles.has(s)) return s;
  const fallback = [...roles.values()].find(
    (r) => r.faction === spec.faction && !r.emergent && !r.is_special,
  );
  return fallback?.slug ?? null;
}

export type Roster = { players: PlayerRow[]; mj: PlayerRow; byPseudo: (p: string) => PlayerRow };

export function buildRoster(game: GameRow, roles: Map<string, RoleRow>): Roster {
  const players: PlayerRow[] = CAST.map(
    (spec) =>
      ({
        id: uid(),
        game_id: game.id,
        session_id: "dev",
        user_id: null,
        pseudo: spec.pseudo,
        is_mj: false,
        is_alive: !spec.dead,
        is_imprisoned: !!spec.imprisoned,
        role_slug: pickSlug(roles, spec),
        role_meta: { avatar: "av-" + spec.pseudo.toLowerCase(), ...(spec.meta ?? {}) },
        joined_at: game.created_at,
      }) as PlayerRow,
  );

  // Amoureux : on lie deux survivants pour la scène "victoire des Amoureux".
  const a = players.find((p) => p.pseudo === "Alice");
  const k = players.find((p) => p.pseudo === "Kya");
  if (a && k) {
    a.role_meta = { ...(a.role_meta as Record<string, unknown>), linked_with: k.id };
    k.role_meta = { ...(k.role_meta as Record<string, unknown>), linked_with: a.id };
  }

  const mj: PlayerRow = {
    id: uid(),
    game_id: game.id,
    session_id: "dev",
    user_id: "dev-mj",
    pseudo: "MJ",
    is_mj: true,
    is_alive: true,
    is_imprisoned: false,
    role_slug: null,
    role_meta: {},
    joined_at: game.created_at,
  } as PlayerRow;

  const all = [mj, ...players];
  return {
    players: all,
    mj,
    byPseudo: (pseudo) => all.find((p) => p.pseudo === pseudo) ?? all[0],
  };
}
