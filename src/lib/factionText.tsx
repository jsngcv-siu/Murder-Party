// Colorise les mentions de rôles et factions dans un texte libre.
// Utilisé par les résultats d'investigation (Détective, Boussole, Comptable,
// Médecin légiste, Témoin, Mouchard, etc.) pour rendre les noms de rôles /
// factions à la couleur de leur faction.
import type { RoleRow } from "@/engine/actions";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { itemFaction, type Item, type ItemOrigin } from "@/engine/items";

const FACTION_COLOR: Record<string, string> = {
  citoyens: "var(--citoyens)",
  citoyen: "var(--citoyens)",
  mechants: "var(--mechants)",
  méchants: "var(--mechants)",
  méchant: "var(--mechants)",
  mechant: "var(--mechants)",
  loups: "var(--mechants)",
  vampires: "var(--vampires)",
  vampire: "var(--vampires)",
  "morts-vivants": "oklch(0.60 0.22 305)",
  neutres: "var(--neutres)",
  neutre: "var(--neutres)",
};

export function roleColor(role: RoleRow | null | undefined): string {
  if (!role) return "var(--foreground)";
  if (role.faction === "Civil") {
    return role.type === "BOULET" ? "oklch(0.65 0.06 230)" : "var(--citoyens)";
  }
  if (role.faction === "Méchant") return "var(--mechants)";
  if (role.slug === "vampire") return "var(--vampires)";
  if (role.faction === "Neutre") {
    return /subversif/i.test(role.type ?? "") ? "oklch(0.60 0.22 305)" : "oklch(0.78 0.10 305)";
  }
  return "var(--foreground)";
}

/** Renvoie le texte avec les mentions de rôles/factions colorisées. */
export function colorize(text: string, roles: Map<string, RoleRow>): ReactNode {
  if (!text) return text;
  // Construit la liste des termes à matcher (plus longs en premier pour éviter les sous-matches)
  type Term = { regex: RegExp; color: string };
  const terms: Term[] = [];
  for (const r of roles.values()) {
    if (!r.name_fr) continue;
    terms.push({
      regex: new RegExp(`\\b${escape(r.name_fr)}\\b`, "i"),
      color: roleColor(r),
    });
  }
  for (const [name, color] of Object.entries(FACTION_COLOR)) {
    terms.push({ regex: new RegExp(`\\b${escape(name)}\\b`, "i"), color });
  }
  terms.sort((a, b) => b.regex.source.length - a.regex.source.length);

  // Tokenise : on cherche le 1er match dans le reste du texte, on découpe, on recommence.
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    let bestIdx = -1;
    let bestLen = 0;
    let bestColor = "";
    for (const t of terms) {
      const m = rest.match(t.regex);
      if (m && m.index !== undefined && (bestIdx === -1 || m.index < bestIdx)) {
        bestIdx = m.index;
        bestLen = m[0].length;
        bestColor = t.color;
      }
    }
    if (bestIdx === -1) {
      out.push(<Fragment key={key++}>{rest}</Fragment>);
      break;
    }
    if (bestIdx > 0) out.push(<Fragment key={key++}>{rest.slice(0, bestIdx)}</Fragment>);
    out.push(
      <span key={key++} style={{ color: bestColor, fontWeight: 600 }}>
        {rest.slice(bestIdx, bestIdx + bestLen)}
      </span>,
    );
    rest = rest.slice(bestIdx + bestLen);
  }
  return <>{out}</>;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Coloration des objets par provenance ──────────────────────────────────
// Couleur du contour d'un objet selon la provenance :
//  • Civil / Méchant / Neutre → faction du rôle source
//  • "Système" → distribué par le jeu (le Manoir), pas par un rôle → doré
//  • null → origine inconnue par design (lettre anonyme) → taupe neutre

/** Token couleur CSS pour une provenance d'objet. */
export function factionToken(f: ItemOrigin | null): string {
  if (f === "Civil") return "var(--citoyens)";
  if (f === "Méchant") return "var(--mechants)";
  if (f === "Neutre") return "var(--neutres)";
  if (f === "Système") return "var(--gold)"; // le Manoir / sans rôle
  return "oklch(0.66 0.025 70)"; // origine inconnue — taupe neutre
}

/** Libellé affichable d'une provenance d'objet. */
export function factionLabel(f: ItemOrigin | null): string {
  if (f === "Système") return "Le Manoir";
  return f ?? "Origine inconnue";
}

/**
 * Repère accessible (non-coloré) pour daltoniens : un glyphe par provenance.
 * C = Civil, M = Méchant, N = Neutre, ◆ = Système (Manoir), ? = inconnue.
 */
export function factionTag(f: ItemOrigin | null): string {
  if (f === "Civil") return "C";
  if (f === "Méchant") return "M";
  if (f === "Neutre") return "N";
  if (f === "Système") return "◆";
  return "?";
}

/**
 * Style React pour le contour coloré d'une carte d'objet, dérivé de sa faction
 * de provenance. Même technique `color-mix` que `PanelCard` (cohérence visuelle).
 * Quand `consumed`, l'UI gère déjà l'atténuation : on renvoie un style vide.
 */
export function itemBorderStyle(item: Item, opts: { consumed?: boolean } = {}): CSSProperties {
  const tok = factionToken(itemFaction(item));
  // Objet classé : contour discret mais toujours coloré par faction, pour qu'on
  // reconnaisse son type même une fois utilisé.
  if (opts.consumed) {
    return {
      borderWidth: 2,
      borderColor: `color-mix(in oklab, ${tok} 45%, transparent)`,
    };
  }
  // Contour épais teinté faction : lecture immédiate du camp d'origine.
  return {
    borderWidth: 2.5,
    borderColor: `color-mix(in oklab, ${tok} 85%, transparent)`,
    background: `linear-gradient(to bottom right, color-mix(in oklab, ${tok} 12%, var(--card)), color-mix(in oklab, ${tok} 5%, transparent))`,
    boxShadow: `0 0 12px color-mix(in oklab, ${tok} 28%, transparent)`,
  };
}
