// Indices — objets distribués au SETUP pour relancer la 1re Enquête.
//
// Principe : info TOUJOURS VRAIE sur la composition de CETTE partie (le pool est
// aléatoire → ce qui est variable fait un bon indice). Distribution AVEUGLE À LA
// FACTION (les méchants en reçoivent aussi = couverture). Aucun faux contenu.
//
// Type spécial « fragmenté » : une info sur un joueur est coupée en 2 moitiés
// illisibles seules (« [X] est… » / « …le Policier »), remises à 2 joueurs ≠ la
// cible. La mise en commun + la confiance se font À LA TABLE (IRL) — AUCUNE
// fusion n'est codée : ce sont juste deux objets-indices complémentaires.

type PlayerLite = { id: string; pseudo: string; role_slug: string | null };
type RoleLite = { slug: string; faction: string; type: string | null; name_fr: string };

export type IndiceGrant = {
  playerId: string;
  name: string;
  icon: string;
  text: string;
  fragment?: boolean;
  half?: "A" | "B";
};

// Noms RP donnés aux indices simples (pur habillage — « Indice — <objet> »).
const INDICE_PROPS = [
  "Note manuscrite",
  "Coupure de presse",
  "Photographie",
  "Carnet noirci",
  "Télégramme",
  "Page arrachée",
  "Carte de visite",
  "Reçu froissé",
  "Pli cacheté",
  "Bristol griffonné",
];

// Barème : ~1 indice / 3 joueurs, plafonné à 4 (plancher 2 pour autoriser 1 paire).
export function indiceCount(playerCount: number): number {
  return Math.min(4, Math.max(2, Math.round(playerCount / 3)));
}

// Probabilité qu'une partie contienne UNE paire fragmentée (consomme 2 slots).
const FRAGMENT_CHANCE = 0.4;

// MUSTs verrouillés → toujours présents, donc inutiles comme indices de présence.
const ALWAYS_PRESENT = new Set(["tueur", "majordome", "assistant_du_detective", "executeur"]);

// Rôles civils « de pouvoir » dont la présence est un 🔴 (force cachée de la ville).
const POWER_CIVILS = new Set([
  "policier",
  "medium",
  "medecin_legiste",
  "vengeur",
  "cuisinier",
  "juge",
  "guetteur",
  "boussole",
  "facteur",
]);

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function factionLabel(f: string): string {
  return f === "Méchant" ? "Méchants" : f === "Neutre" ? "Neutres" : "Civils";
}

// ── Catalogue des indices SIMPLES (familles A–E, tous vrais par construction) ──
function buildSimpleClues(roster: RoleLite[]): string[] {
  const clues: string[] = [];
  const mechants = roster.filter((r) => r.faction === "Méchant");
  const neutres = roster.filter((r) => r.faction === "Neutre");
  const civils = roster.filter((r) => r.faction === "Civil");

  // A — Nombres
  if (mechants.some((r) => r.type === "INVESTIGATION"))
    clues.push("Le camp méchant compte un rôle d'Investigation.");
  if (mechants.some((r) => r.type === "TROMPERIE"))
    clues.push("Au moins un rôle de Tromperie se cache côté méchant.");

  // B — présence d'un rôle méchant précis (hors toujours-présents)
  for (const r of mechants) {
    if (ALWAYS_PRESENT.has(r.slug)) continue;
    clues.push(`${r.name_fr} est en jeu cette partie.`);
  }

  // C — présence d'un neutre précis (hors Vampire, déjà annoncé ailleurs)
  for (const r of neutres) {
    if (r.slug === "vampire") continue;
    clues.push(`${r.name_fr} est en jeu cette partie.`);
  }

  // D — force CACHÉE de la ville (🔴)
  for (const r of civils) {
    if (ALWAYS_PRESENT.has(r.slug)) continue;
    if (POWER_CIVILS.has(r.slug)) clues.push(`${r.name_fr} est en jeu côté ville.`);
  }
  if (civils.filter((r) => r.type === "INVESTIGATION").length >= 2)
    clues.push("La ville compte 2 enquêteurs ou plus.");
  if (civils.filter((r) => r.type === "PROTECTEUR").length >= 2)
    clues.push("Un second protecteur veille, en plus du Majordome.");
  if (civils.some((r) => r.slug === "saint"))
    clues.push("Un rôle fait perdre la ville s'il est emprisonné au vote.");

  // E — exclusions fortes (rien sur le Vampire : déjà couvert par l'annonce de morsure)
  if (!roster.some((r) => r.type === "TROMPERIE"))
    clues.push("Aucun rôle de Tromperie : personne ne ment sur son rôle.");
  if (!mechants.some((r) => r.type === "INVESTIGATION"))
    clues.push("Le camp méchant agit sans espion.");

  return clues;
}

// ── Indice FRAGMENTÉ : info sur 1-2 joueurs, coupée en 2 moitiés ──
function buildFragment(
  alive: PlayerLite[],
  rolesBySlug: Map<string, RoleLite>,
): { subjects: string[]; halfA: string; halfB: string } | null {
  const withRole = alive.filter((p) => p.role_slug && rolesBySlug.get(p.role_slug));
  if (withRole.length < 2) return null;
  const roleOf = (p: PlayerLite) => rolesBySlug.get(p.role_slug as string) as RoleLite;

  type Maker = () => { subjects: string[]; halfA: string; halfB: string } | null;
  const makers: Maker[] = [
    // rôle exact (jamais le Tueur : révéler son identité est écarté par design)
    () => {
      const pool = withRole.filter((p) => p.role_slug !== "tueur");
      if (!pool.length) return null;
      const x = pick(pool);
      return { subjects: [x.id], halfA: `${x.pseudo} est…`, halfB: `…${roleOf(x).name_fr}.` };
    },
    // camp
    () => {
      const x = pick(withRole);
      return {
        subjects: [x.id],
        halfA: `${x.pseudo} appartient au camp…`,
        halfB: `…des ${factionLabel(roleOf(x).faction)}.`,
      };
    },
    // même camp
    () => {
      const x = pick(withRole);
      const same = withRole.filter((p) => p.id !== x.id && roleOf(p).faction === roleOf(x).faction);
      if (!same.length) return null;
      const y = pick(same);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} servent…`,
        halfB: "…le même camp.",
      };
    },
    // pas le même camp
    () => {
      const x = pick(withRole);
      const diff = withRole.filter((p) => p.id !== x.id && roleOf(p).faction !== roleOf(x).faction);
      if (!diff.length) return null;
      const y = pick(diff);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} ne sont…`,
        halfB: "…pas dans le même camp.",
      };
    },
    // même type de rôle
    () => {
      const x = pick(withRole);
      const same = withRole.filter(
        (p) => p.id !== x.id && roleOf(p).type && roleOf(p).type === roleOf(x).type,
      );
      if (!same.length) return null;
      const y = pick(same);
      return {
        subjects: [x.id, y.id],
        halfA: `${x.pseudo} et ${y.pseudo} ont…`,
        halfB: "…le même type de rôle.",
      };
    },
    // arme → porteur (Cuisinier / Stratège ont un couteau au setup)
    () => {
      const armed = withRole.filter(
        (p) => p.role_slug === "cuisinier" || p.role_slug === "stratege",
      );
      if (!armed.length) return null;
      const x = pick(armed);
      return {
        subjects: [x.id],
        halfA: "Celui qui détient une…",
        halfB: `…arme, c'est ${x.pseudo}.`,
      };
    },
  ];

  for (const make of shuffle(makers)) {
    const r = make();
    if (r) return r;
  }
  return null;
}

/**
 * Décide qui reçoit quoi au setup. Retourne la liste des objets-indices à créer.
 * - `count` indices au total (barème), 1 par joueur (un joueur ≠ reçoit ≤ 1 indice).
 * - éventuellement 1 paire fragmentée (2 slots), portée par 2 joueurs ≠ la cible.
 */
export function distributeIndices(
  alive: PlayerLite[],
  rolesBySlug: Map<string, RoleLite>,
): IndiceGrant[] {
  if (alive.length === 0) return [];
  const roster: RoleLite[] = alive
    .map((p) => (p.role_slug ? rolesBySlug.get(p.role_slug) : null))
    .filter((r): r is RoleLite => !!r);

  const count = indiceCount(alive.length);
  const grants: IndiceGrant[] = [];
  const used = new Set<string>();
  let remaining = count;

  // 1) Paire fragmentée éventuelle.
  if (count >= 2 && Math.random() < FRAGMENT_CHANCE) {
    const frag = buildFragment(alive, rolesBySlug);
    if (frag) {
      const holders = shuffle(alive.filter((p) => !frag.subjects.includes(p.id))).slice(0, 2);
      if (holders.length === 2) {
        grants.push({
          playerId: holders[0].id,
          name: "Indice — Lettre déchirée",
          icon: "📜",
          text: frag.halfA,
          fragment: true,
          half: "A",
        });
        grants.push({
          playerId: holders[1].id,
          name: "Indice — Lettre déchirée",
          icon: "📜",
          text: frag.halfB,
          fragment: true,
          half: "B",
        });
        used.add(holders[0].id);
        used.add(holders[1].id);
        remaining -= 2;
      }
    }
  }

  // 2) Indices simples sur les slots restants (un par joueur, textes distincts).
  const clues = shuffle(buildSimpleClues(roster));
  const props = shuffle(INDICE_PROPS);
  const candidates = shuffle(alive.filter((p) => !used.has(p.id)));
  for (let i = 0; i < remaining && i < candidates.length && i < clues.length; i++) {
    grants.push({
      playerId: candidates[i].id,
      name: `Indice — ${props[i % props.length]}`,
      icon: "🔍",
      text: clues[i],
    });
  }

  return grants;
}
