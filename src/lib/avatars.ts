// Avatars pilotés directement par le bucket Storage `icon-avatar`.
// On liste le contenu du bucket en live : déposer un PNG (dans femmes/,
// hommes/, autres/ ou à la racine) le fait apparaître dans l'UI, sans limite
// ni SQL. Le nom de fichier devient le nom affiché de l'avatar.
//
// API publique INCHANGÉE (avatarOf / listAvatars / useAvatars) pour ne pas
// toucher les ~15 écrans de jeu qui la consomment. Seule la source change.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "icon-avatar";
export const AVATAR_CATEGORIES = ["femmes", "hommes", "autres"] as const;
export type AvatarCategory = (typeof AVATAR_CATEGORIES)[number];

export type AvatarDef = {
  id: string; // chemin dans le bucket, ex "femmes/hana.png" (stocké dans role_meta.avatar)
  emoji: string;
  /** Compat : alias de `name` (utilisé comme alt/aria un peu partout). */
  label: string;
  /** Nom affiché, dérivé du nom de fichier. */
  name: string;
  category: AvatarCategory;
  image_url?: string | null;
};

// Placeholder unique pour ne jamais rendre une grille/avatar vide (offline,
// bucket pas encore peuplé). N'apparaît pas dans le picker.
const FALLBACK: AvatarDef = {
  id: "_none",
  emoji: "👤",
  label: "Avatar",
  name: "Avatar",
  category: "autres",
  image_url: null,
};

// État module : liste ordonnée + index par id, partagés entre tous les call
// sites, avec subscribers pour propager dès que le bucket répond.
let loaded: AvatarDef[] = [];
let cache = new Map<string, AvatarDef>();
let loadStarted = false;
const subs = new Set<() => void>();

function notify() {
  for (const fn of subs) fn();
}

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const isImage = (name: string) => IMAGE_RE.test(name);

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

function makeDef(path: string, category: AvatarCategory): AvatarDef {
  const file = path.split("/").pop() ?? path;
  const name = prettifyName(file) || file;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { id: path, emoji: "🗝️", label: name, name, category, image_url: data.publicUrl };
}

type StorageEntry = { name: string; id: string | null };

async function rawList(prefix: string): Promise<StorageEntry[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error || !data) return [];
  return data as StorageEntry[];
}

/** Catégorie dérivée du préfixe du nom de fichier.
 *  - "femme-…" / "femmes-…" → femmes
 *  - "homme-…" / "hommes-…" → hommes
 *  - sinon → autres
 *  (Windows refuse `/` dans les noms : on n'utilise donc pas de sous-dossiers.) */
function categoryFromFilename(file: string): AvatarCategory {
  const lower = file.toLowerCase();
  if (/^femmes?[-_]/.test(lower)) return "femmes";
  if (/^hommes?[-_]/.test(lower)) return "hommes";
  return "autres";
}

/** "femme-sakura.png" → "Sakura" (on retire le préfixe de catégorie). */
function stripCategoryPrefix(file: string): string {
  return file.replace(/^(femmes?|hommes?|autres?)[-_]+/i, "");
}

async function loadAvatars() {
  try {
    const root = await rawList("");
    const defs: AvatarDef[] = [];

    for (const e of root) {
      if (!e.id || !isImage(e.name)) continue;
      const cat = categoryFromFilename(e.name);
      const def = makeDef(e.name, cat);
      // Nom affiché sans le préfixe de catégorie.
      const pretty = prettifyName(stripCategoryPrefix(e.name)) || def.name;
      def.name = pretty;
      def.label = pretty;
      defs.push(def);
    }

    if (defs.length === 0) return; // garde l'état précédent / fallback

    defs.sort(
      (a, b) =>
        AVATAR_CATEGORIES.indexOf(a.category) - AVATAR_CATEGORIES.indexOf(b.category) ||
        a.name.localeCompare(b.name),
    );

    loaded = defs;
    cache = new Map(defs.map((d) => [d.id, d]));
    notify();
  } catch {
    /* offline / RLS : on garde le fallback */
  }
}

function ensureLoaded() {
  if (loadStarted) return;
  loadStarted = true;
  void loadAvatars();
}

/** Force un rechargement du bucket (ex : à l'ouverture du picker pour voir
 *  immédiatement un avatar fraîchement uploadé). */
export function refreshAvatars() {
  void loadAvatars();
}

if (typeof window !== "undefined") ensureLoaded();

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
 * - `id` (chemin bucket, ex "femmes/hana.png") : renvoie l'avatar correspondant.
 * - sinon, si `fallbackSeed` fourni (ex: id joueur), on choisit un avatar
 *   stable et déterministe parmi ceux chargés — évite le placeholder 👤 pour
 *   les joueurs n'ayant pas (encore) choisi.
 */
export function avatarOf(id?: string | null, fallbackSeed?: string | null): AvatarDef {
  ensureLoaded();
  if (id) {
    const hit = cache.get(id);
    if (hit) return hit;
  }
  if (fallbackSeed && loaded.length > 0) {
    return loaded[hashString(fallbackSeed) % loaded.length];
  }
  return loaded[0] ?? FALLBACK;
}

/** Liste à jour des avatars (pour le picker). Réactif via useAvatars(). */
export function listAvatars(): AvatarDef[] {
  ensureLoaded();
  return loaded;
}

/** Hook React : re-render quand le bucket d'avatars change. */
export function useAvatars(): AvatarDef[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    ensureLoaded();
    const fn = () => setTick((t) => t + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);
  return listAvatars();
}

/** Vocabulaire produit : "TOUR N — <PHASE>", PHASE = PHASE LIBRE / RASSEMBLEMENT / VOTE. */
export function phaseLabel(phase: string, tour: number): string {
  const tourLabel = `TOUR ${tour}`;
  if (phase === "free") return `${tourLabel} — PHASE LIBRE`;
  if (phase === "annonce") return `${tourLabel} — ANNONCE`;
  if (phase === "gathering") return `${tourLabel} — RASSEMBLEMENT`;
  if (phase === "vote") return `${tourLabel} — VOTE`;
  if (phase === "ended") return "FIN DE PARTIE";
  return phase.toUpperCase();
}

/** Couleur pilote (token) + wash d'ambiance d'une phase. Source UNIQUE
 *  consommée par l'en-tête (PhaseBar), l'AmbientTint et le PhaseTakeover —
 *  remplace les anciennes classes Tailwind ad hoc (sky/amber/rose). */
export function phasePalette(phase: string): { accent: string; wash: string } {
  if (phase === "free") return { accent: "var(--phase-jour)", wash: "var(--phase-jour-wash)" };
  if (phase === "annonce")
    return { accent: "var(--phase-annonce)", wash: "var(--phase-annonce-wash)" };
  if (phase === "gathering")
    return { accent: "var(--phase-rassemblement)", wash: "var(--phase-rassemblement-wash)" };
  if (phase === "vote") return { accent: "var(--phase-vote)", wash: "var(--phase-vote-wash)" };
  return { accent: "var(--muted-foreground)", wash: "transparent" };
}
