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
        "Vous formez la faction Entremetteur : vous gagnez ensemble si vous êtes les seuls survivants (l'Entremetteur peut être avec vous).",
        `Ton rôle d'origine (${role.icon} ${role.name_fr}) reste actif.`,
      ],
    };
  }

  // Faction de base
  const base: string[] = [];
  if (role.faction === "Civil") {
    base.push(
      "🟦 Tu gagnes si tous les Méchants, Vampires, Amoureux et Neutres adverses sont éliminés ou emprisonnés.",
    );
  } else if (role.faction === "Méchant") {
    base.push("🟥 Tu gagnes si les Méchants dominent le manoir (autant ou plus que les autres).");
  } else if (role.slug === "vampire") {
    base.push("🩸 Tu gagnes si tous les non-vampires sont éliminés.");
  }

  // Overrides / objectifs neutres
  switch (role.slug) {
    case "veuve_noire": {
      base.length = 0;
      base.push(
        "🕷️ Tu gagnes en SOLO si tu es la seule personne encore en vie et libre du manoir.",
      );
      break;
    }
    case "parieur_tricheur": {
      base.length = 0;
      base.push(
        "🎲 Tu gagnes en SOLO si tu es la seule personne encore en vie et libre, sans avoir perdu au dé.",
      );
      break;
    }
    case "chasseur_de_vampire": {
      base.length = 0;
      base.push(
        "🧛 Apparu·e après la 1re morsure du Vampire, tu traques les Vampires : désigne un joueur pour savoir s'il en est un (et l'éliminer si oui).",
      );
      base.push("🛡️ Tu es immunisé·e contre la morsure et ne peux pas être converti·e.");
      base.push(
        "🤝 Allié·e des Civils : tu gagnes avec eux quand tous les Méchants, Vampires et Neutres adverses sont écartés.",
      );
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
      base.push(
        "👑 Tu gagnes en vie avec les Méchants à la fin de la partie (tant qu'un Méchant survit).",
      );
      break;
    }
    case "oracle": {
      const proph = (m.prophecy as string | undefined) ?? null;
      base.length = 0;
      if (proph) {
        base.push(
          `🔮 Prophétie verrouillée : victoire des ${proph}. Tu gagnes si cette faction l'emporte et que tu es en vie à la fin.`,
        );
      } else {
        base.push(
          "🔮 À la 1ère Enquête, prédis quelle faction (Civils, Méchants ou Neutres) gagnera. Tu gagnes avec elle si tu es en vie à la fin.",
        );
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
          "🎭 Une fois dans la partie, copie le rôle du dernier mort : tu hériteras alors de sa faction et de sa condition de victoire.",
        );
      }
      break;
    }
    case "vengeur": {
      const cher = findName(m.beloved_id);
      if (cher)
        base.push(
          `💔 Tant que ${cher} (ton être cher) vit, ta capacité de tuer reste verrouillée.`,
        );
      break;
    }
    case "entremetteur": {
      const pair = (m.linked_pair as string[] | undefined) ?? [];
      const names = pair
        .map((id) => allPlayers.find((p) => p.id === id)?.pseudo ?? "?")
        .join(" & ");
      base.length = 0;
      base.push(
        `💞 Victoire DURE : le couple lié (${names || "—"}) et toi êtes les seuls survivants.`,
      );
      base.push(
        "🩹 Repli : si le couple meurt, tu gagnes quand même en survivant en vie et libre jusqu'à la fin, quel que soit le camp vainqueur.",
      );
      break;
    }
    case "conservateur": {
      base.length = 0;
      base.push(
        "🗝️ À chaque Enquête (2× par tour), tu confies une relique maudite au hasard à une cible.",
      );
      base.push(
        "🫀 Tu gagnes (victoire SOLO immédiate) dès qu'une personne reçoit la relique « Le Cœur du Manoir ».",
      );
      break;
    }
  }

  return { factionLabel: role.faction ?? "—", lines: base };
}
