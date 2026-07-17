// Avatars bundlés dans public/icons/icon-avatar/ (WebP), servis par Vercel.
// Depuis 2026-07-17 on ne liste plus le bucket Storage en live (egress +
// latence) : la liste vient d'un manifeste statique généré à la conversion
// (src/lib/avatarManifest.ts). Pour ajouter un avatar : déposer le fichier et
// régénérer le manifeste via scratchpad/imgtool/convert.mjs.
//
// API publique INCHANGÉE (avatarOf / listAvatars / useAvatars) pour ne pas
// toucher les ~15 écrans de jeu qui la consomment. Seule la source change.
import { useEffect, useState } from "react";
import { AVATAR_MANIFEST } from "@/lib/avatarManifest";

export const AVATAR_CATEGORIES = ["femmes", "hommes", "autres"] as const;
export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];

export type AvatarDef = {
  id: string; // chemin/nom d'origine dans le bucket (stocké dans role_meta.avatar)
  emoji: string;
  /** Compat : alias de `name` (utilisé comme alt/aria un peu partout). */
  label: string;
  /** Nom affiché, dérivé du nom de fichier. */
  name: string;
  category: AvatarCategory;
  image_url?: string | null;
};

// Placeholder unique pour ne jamais rendre une grille/avatar vide.
// N'apparaît pas dans le picker.
const FALLBACK: AvatarDef = {
  id: "_none",
  emoji: "👤",
  label: "Avatar",
  name: "Avatar",
  category: "autres",
  image_url: null,
};

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

/** "marie-anne.png" → "Marie-Anne", "hana_01.png" → "Hana 01". */
function prettifyName(file: string): string {
  return file
    .replace(IMAGE_RE, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "femme-sakura.png" → "Sakura" (on retire le préfixe de catégorie). */
function stripCategoryPrefix(file: string): string {
  return file.replace(/^(femmes?|hommes?|autres?)[-_]+/i, "");
}

// Construction statique depuis le manifeste — synchrone, aucun réseau.
const CAT_ORDER: Record<AvatarCategory, number> = { femmes: 0, hommes: 1, autres: 2 };

const loaded: AvatarDef[] = AVATAR_MANIFEST.map((e) => {
  const name = prettifyName(stripCategoryPrefix(e.id)) || e.id;
  return {
    id: e.id,
    emoji: "🗝️",
    label: name,
    name,
    category: e.category,
    image_url: `/icons/icon-avatar/${e.file}`,
  };
}).sort(
  (a, b) => CAT_ORDER[a.category] - CAT_ORDER[b.category] || a.name.localeCompare(b.name),
);

const cache = new Map(loaded.map((d) => [d.id, d]));

/** No-op conservé pour compat d'API (la liste est statique désormais). */
export function refreshAvatars() {
  /* rien à recharger : avatars bundlés */
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Résout un avatar.
 * - `id` (nom d'origine, ex "femmes-avatar01.png") : renvoie l'avatar correspondant.
 * - sinon, si `fallbackSeed` fourni (ex: id joueur), on choisit un avatar
 *   stable et déterministe parmi ceux chargés — évite le placeholder 👤 pour
 *   les joueurs n'ayant pas (encore) choisi.
 */
export function avatarOf(id?: string | null, fallbackSeed?: string | null): AvatarDef {
  if (id) {
    const hit = cache.get(id);
    if (hit) return hit;
  }
  if (fallbackSeed && loaded.length > 0) {
    return loaded[hashString(fallbackSeed) % loaded.length];
  }
  return loaded[0] ?? FALLBACK;
}

/** Liste à jour des avatars (pour le picker). */
export function listAvatars(): AvatarDef[] {
  return loaded;
}

/** Hook React : conservé pour compat (la liste est statique, ne change pas). */
export function useAvatars(): AvatarDef[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, _setTick] = useState(0);
  useEffect(() => {}, []);
  return loaded;
}

/** Vocabulaire produit : "TOUR N — <PHASE>", PHASE = ENQUÊTE / ANNONCE / DÉBAT / VOTE.
 *  NB : les clés moteur restent `free`/`gathering` (DB, historique) ; seul l'affichage change. */
export function phaseLabel(phase: string, tour: number): string {
  const tourLabel = `TOUR ${tour}`;
  if (phase === "free") return `${tourLabel} — ENQUÊTE`;
  if (phase === "annonce") return `${tourLabel} — ANNONCE`;
  if (phase === "gathering") return `${tourLabel} — DÉBAT`;
  if (phase === "vote") return `${tourLabel} — VOTE`;
  if (phase === "ended") return "FIN DE PARTIE";
  return phase.toUpperCase();
}

/** Couleur pilote (token) + wash d'ambiance d'une phase. Source UNIQUE
 *  consommée par l'en-tête (PhaseBar), l'AmbientTint et le PhaseTakeover —
 *  remplace les anciennes classes Tailwind ad hoc (sky/amber/rose). */
export function phasePalette(phase: string): { accent: string; wash: string } {
  if (phase === "free")
    return { accent: "var(--phase-enquete)", wash: "var(--phase-enquete-wash)" };
  if (phase === "annonce")
    return { accent: "var(--phase-annonce)", wash: "var(--phase-annonce-wash)" };
  if (phase === "gathering")
    return { accent: "var(--phase-debat)", wash: "var(--phase-debat-wash)" };
  if (phase === "vote") return { accent: "var(--phase-vote)", wash: "var(--phase-vote-wash)" };
  return { accent: "var(--muted-foreground)", wash: "transparent" };
}
