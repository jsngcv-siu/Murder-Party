// Décrit en français la condition de victoire d'un joueur, à la volée.
// Lit role_meta (cibles, liens, quotas) pour produire un texte dynamique.
import type { PlayerRow, RoleRow } from "./actions";

export function describeWinCondition(
  me: PlayerRow,
  role: RoleRow | null,
  allPlayers: PlayerRow[],
): { factionLabel: string; lines: string[] } {
  const realCount = allPlayers.filter((p) => !p.is_mj).length;
  const m = (me.role_meta ?? {}) as Record<string, unknown>;
  const findName = (id: unknown) =>
    typeof id === "string" ? (allPlayers.find((p) => p.id === id)?.pseudo ?? "?") : null;

  if (!role) return { factionLabel: "—", lines: ["Aucun rôle assigné."] };

  // Conversion : Vampire (mordu) prime sur la faction d'origine.
  const isConvertedVampire = m.converted === true && role.slug !== "vampire";

  if (isConvertedVampire) {
    return {
      factionLabel: "Vampires",
      lines: [
        "🩸 Tu as été mordu·e — tu rejoins les Vampires.",
        "Tu gagnes si tous les non-vampires sont éliminés.",
        `Ton rôle d'origine (${role.icon} ${role.name_fr}) reste actif.`,
      ],
    };
  }

  // Faction Amoureux (lié par l'Entremetteur) : prime sur la faction d'origine.
  const linkedWith = typeof m.linked_with === "string" ? (m.linked_with as string) : null;
  if (linkedWith && role.slug !== "entremetteur") {
    const partner = allPlayers.find((p) => p.id === linkedWith);
    return {
      factionLabel: "Amoureux (Entremetteur)",
      lines: [
        `💞 L'Entremetteur a noué ton lien avec ${partner?.pseudo ?? "?"}.`,
        "Vous gagnez ensemble en étant les derniers survivants (l'Entremetteur compris).",
        `Ton rôle d'origine (${role.icon} ${role.name_fr}) reste actif.`,
      ],
    };
  }

  // Faction de base
  const base: string[] = [];
  if (role.faction === "Civil") {
    base.push("🟦 Tu gagnes quand tous les camps adverses sont éliminés ou emprisonnés.");
  } else if (role.faction === "Méchant") {
    base.push("🟥 Tu gagnes quand les Méchants égalent ou dépassent les autres.");
  } else if (role.slug === "vampire") {
    base.push("🩸 Tu gagnes si tous les non-vampires sont éliminés.");
  }

  // Overrides / objectifs neutres
  switch (role.slug) {
    case "veuve_noire": {
      base.length = 0;
      base.push("🕷️ Victoire SOLO : sois la seule personne en vie et libre.");
      break;
    }
    case "parieur_tricheur": {
      base.length = 0;
      base.push("🎲 Victoire SOLO : reste seul·e en vie et libre, sans perdre un pari.");
      break;
    }
    case "chasseur_de_vampire": {
      base.length = 0;
      base.push(
        "🧛 Traque les Vampires : désigne un joueur pour savoir s'il en est un — et l'éliminer.",
      );
      base.push("🛡️ Immunisé·e : tu ne peux pas être mordu·e.");
      base.push("🤝 Allié·e des Civils : tu gagnes avec eux.");
      break;
    }
    case "empoisonneur": {
      const others = allPlayers.filter(
        (p) => !p.is_mj && p.id !== me.id && p.is_alive && !p.is_imprisoned,
      );
      const poisoned = others.filter(
        (p) => ((p.role_meta ?? {}) as Record<string, unknown>).poisoned === true,
      ).length;
      base.length = 0;
      base.push(
        `☠️ Tu gagnes quand tous les survivants libres sont empoisonnés (${poisoned}/${others.length}).`,
      );
      break;
    }

    case "heritier_dechu": {
      base.length = 0;
      base.push("👑 Tu gagnes avec les Méchants (si tu es en vie et qu'au moins un survit).");
      break;
    }
    case "oracle": {
      const proph = (m.prophecy as string | undefined) ?? null;
      base.length = 0;
      if (proph) {
        base.push(`🔮 Prophétie : victoire des ${proph}. Tu gagnes avec eux si tu survis.`);
      } else {
        base.push("🔮 À la 1re Enquête, prédis le camp gagnant. Tu gagnes avec lui si tu survis.");
      }
      break;
    }
    case "imitateur": {
      const imitated = m.imitated_slug as string | undefined;
      base.length = 0;
      if (imitated) {
        base.push("🎭 Tu as copié un rôle : tu gagnes désormais selon sa condition de victoire.");
      } else {
        base.push(
          "🎭 Copie une fois le rôle du dernier mort : tu prends sa faction et sa victoire.",
        );
      }
      break;
    }
    case "vengeur": {
      const cher = findName(m.beloved_id);
      if (cher) base.push(`💔 Tant que ${cher} vit, tu ne peux pas tuer.`);
      break;
    }
    case "entremetteur": {
      const pair = (m.linked_pair as string[] | undefined) ?? [];
      const names = pair
        .map((id) => allPlayers.find((p) => p.id === id)?.pseudo ?? "?")
        .join(" & ");
      base.length = 0;
      base.push(`💞 Victoire : le couple (${names || "—"}) et toi, seuls survivants.`);
      base.push("🩹 Repli : si le couple meurt, survis en vie et libre jusqu'au bout.");
      break;
    }
    case "conservateur": {
      base.length = 0;
      base.push("🗝️ Chaque Enquête (2×), confie une relique maudite à une cible.");
      base.push("🫀 Victoire SOLO immédiate dès que quelqu'un reçoit « Le Cœur du Manoir ».");
      break;
    }
  }

  return { factionLabel: role.faction ?? "—", lines: base };
}
