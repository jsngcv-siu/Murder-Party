// Métadonnées visuelles partagées des TYPES de rôle (icône + couleur + libellé).
// Source unique de vérité pour la coloration des types dans le configurateur de pool,
// la fiche rôle (P10) et toute UI qui veut afficher un type de façon cohérente.
import {
  Shield,
  Swords,
  Search,
  Heart,
  VenetianMask,
  Anchor,
  Skull,
  Flame,
  Smile,
  type LucideIcon,
} from "lucide-react";

export type RoleTypeMeta = { Icon: LucideIcon; color: string; label: string };

export const ROLE_TYPE_META: Record<string, RoleTypeMeta> = {
  PROTECTEUR: { Icon: Shield, color: "oklch(0.70 0.18 145)", label: "Protecteur" },
  TUEUR: { Icon: Swords, color: "oklch(0.62 0.24 22)", label: "Tueur" },
  INVESTIGATION: { Icon: Search, color: "oklch(0.65 0.14 220)", label: "Investigation" },
  SUPPORT: { Icon: Heart, color: "oklch(0.75 0.12 20)", label: "Support" },
  TROMPERIE: { Icon: VenetianMask, color: "oklch(0.65 0.12 300)", label: "Tromperie" },
  BOULET: { Icon: Anchor, color: "oklch(0.60 0.06 230)", label: "Boulet" },
  MAL: { Icon: Skull, color: "oklch(0.55 0.20 22)", label: "Mal" },
  CHAOS: { Icon: Flame, color: "oklch(0.75 0.18 50)", label: "Chaos" },
  "BÉNIN": { Icon: Smile, color: "oklch(0.70 0.14 150)", label: "Bénin" },
};

const FALLBACK: RoleTypeMeta = { Icon: Shield, color: "var(--muted-foreground)", label: "—" };

/**
 * Renvoie le méta visuel pour un type. Accepte un type composite ("A/B") :
 * c'est alors le 1er type listé qui donne l'icône/couleur.
 */
export function roleTypeMeta(type: string | null | undefined): RoleTypeMeta {
  if (!type) return FALLBACK;
  const first = type.split("/")[0]?.trim().toUpperCase() ?? "";
  return ROLE_TYPE_META[first] ?? { ...FALLBACK, label: type };
}

/** Token couleur CSS de la faction (cohérent avec factionText / styles.css). */
export const FACTION_TOKEN: Record<string, string> = {
  "Civil": "var(--citoyens)",
  "Méchant": "var(--mechants)",
  "Neutre": "var(--neutres)",
};
