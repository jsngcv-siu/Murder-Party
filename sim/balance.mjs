// =====================================================================
// Murder Party — Simulateur Monte-Carlo d'équilibrage
//
// Reproduit fidèlement :
//   • la COMPOSITION (drawRoles + constants.ts : quotas méchants/civils,
//     neutresCountFor, acolytesCountFor, pondération des types neutres,
//     draw_weight par rôle, MUSTs verrouillés)
//   • les CONDITIONS DE VICTOIRE (winConditions.ts : parité méchants,
//     élimination civils, objectifs neutres solo/chaos/mal/bénin)
//   • un modèle COMPORTEMENTAL paramétré (kills du Tueur + succession,
//     majordome sacrificiel, protections, vampire, vote→prison, exécuteur,
//     info d'enquête → précision du lynch).
//
// Les paramètres comportementaux sont explicites en tête de fichier et
// balayés en sensibilité. La composition et les conditions de victoire,
// elles, sont EXACTES.
// =====================================================================

// ─────────── PARAMÈTRES COMPORTEMENTAUX (réglables / balayés) ───────────
const P = {
  // Précision du lynch : le vote vise le suspect n°1 de la ville. La proba
  // que ce suspect soit réellement un méchant émerge de l'info d'enquête.
  investigatorReliability: 0.8, // fiabilité d'une enquête (assistant/policier…)
  coverReliabilityMalus: 0.45, // un méchant "couvert" (usurpateur/falsificateur/tueur camouflé) baisse la fiabilité à ce facteur
  townCoordination: 0.75, // proba que la ville converge sur le suspect n°1 (sinon vote dispersé/aléatoire)
  baseSuspicionNoise: 0.15, // bruit social de départ
  // Kills
  killerSuccessBase: 0.72, // proba qu'un kill du Tueur aboutisse (net des protections "simples")
  majordomeGuessRate: 0.3, // proba que le majordome garde précisément la cible du Tueur (→ échange mortel)
  babysitterBlockValue: 1.0, // la babysitter protège+bloque une cible
  vampireConvertSuccess: 0.78,
  cuisinierHitsTown: 0.45, // le vigilante civil tue parfois un innocent
  // Divers
  maxCycles: 16,
  abstainRate: 0.15, // proportion de joueurs qui s'abstiennent au vote
};

// ─────────── RNG déterministe (pour reproductibilité) ───────────
let _seed = 123456789;
function srand() {
  _seed ^= _seed << 13;
  _seed ^= _seed >>> 17;
  _seed ^= _seed << 5;
  return (_seed >>> 0) / 4294967296;
}
function rint(n) {
  return Math.floor(srand() * n);
}
function pick(arr) {
  return arr[rint(arr.length)];
}
function chance(p) {
  return srand() < p;
}
function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weightedPick(items, wfn) {
  const total = items.reduce((s, x) => s + wfn(x), 0);
  let r = srand() * total;
  for (const x of items) {
    r -= wfn(x);
    if (r <= 0) return x;
  }
  return items[items.length - 1];
}

// ─────────── ROSTER (reconstruit des migrations, état final) ───────────
// faction: Civil|Méchant|Neutre ; type: PROTECTEUR|TUEUR|INVESTIGATION|SUPPORT|TROMPERIE|CONTRÔLE|MAL|CHAOS|BÉNIN
// dw = draw_weight ; min = min_players
const ROLES = [
  // — MÉCHANTS —
  { slug: "tueur", faction: "Méchant", type: "TUEUR", dw: 1.0, min: 6 },
  { slug: "croque_mitaine", faction: "Méchant", type: "TUEUR", dw: 0.4, min: 7 },
  { slug: "stratege", faction: "Méchant", type: "TUEUR", dw: 0.4, min: 8 },
  { slug: "usurpateur", faction: "Méchant", type: "TROMPERIE", dw: 0.7, min: 6, cover: true },
  { slug: "marionnettiste", faction: "Méchant", type: "CONTRÔLE", dw: 0.6, min: 9 },
  { slug: "voleur", faction: "Méchant", type: "CONTRÔLE", dw: 1.0, min: 7 },
  { slug: "accusateur", faction: "Méchant", type: "TROMPERIE", dw: 1.0, min: 7, frame: true },
  { slug: "falsificateur", faction: "Méchant", type: "TROMPERIE", dw: 0.7, min: 7, cover: true },
  { slug: "cartomancien", faction: "Méchant", type: "INVESTIGATION", dw: 1.0, min: 7 },
  { slug: "mouchard", faction: "Méchant", type: "INVESTIGATION", dw: 1.0, min: 6 },
  { slug: "cleaner", faction: "Méchant", type: "CONTRÔLE", dw: 1.0, min: 7 },
  { slug: "maitre_chanteur", faction: "Méchant", type: "CONTRÔLE", dw: 1.0, min: 6, block: true },
  // — CIVILS —
  { slug: "majordome", faction: "Civil", type: "PROTECTEUR", dw: 1.0, min: 6, guard: true },
  { slug: "ange_gardien", faction: "Civil", type: "PROTECTEUR", dw: 1.0, min: 7, shield: true },
  { slug: "babysitter", faction: "Civil", type: "PROTECTEUR", dw: 1.0, min: 7, shield: true },
  { slug: "barman", faction: "Civil", type: "PROTECTEUR", dw: 1.0, min: 8, shield: true },
  { slug: "saint", faction: "Civil", type: "PROTECTEUR", dw: 1.0, min: 8, saintTrap: true },
  {
    slug: "assistant_du_detective",
    faction: "Civil",
    type: "INVESTIGATION",
    dw: 1.0,
    min: 6,
    invest: true,
  },
  { slug: "boussole", faction: "Civil", type: "INVESTIGATION", dw: 1.0, min: 7, invest: 0.7 },
  { slug: "juge", faction: "Civil", type: "INVESTIGATION", dw: 1.0, min: 7, investPrison: true },
  {
    slug: "medecin_legiste",
    faction: "Civil",
    type: "INVESTIGATION",
    dw: 1.0,
    min: 6,
    investDead: true,
  },
  { slug: "policier", faction: "Civil", type: "INVESTIGATION", dw: 1.0, min: 6, invest: true },
  { slug: "apothicaire", faction: "Civil", type: "SUPPORT", dw: 0.4, min: 8, fioles: true },
  { slug: "facteur", faction: "Civil", type: "SUPPORT", dw: 1.0, min: 8 },
  { slug: "medium", faction: "Civil", type: "SUPPORT", dw: 1.0, min: 7 },
  { slug: "avocat", faction: "Civil", type: "SUPPORT", dw: 1.0, min: 6 },
  { slug: "vengeur", faction: "Civil", type: "TUEUR", dw: 1.0, min: 7, avenger: true },
  { slug: "executeur", faction: "Civil", type: "TUEUR", dw: 1.0, min: 8, executioner: true },
  { slug: "cuisinier", faction: "Civil", type: "TUEUR", dw: 1.0, min: 7, vigilante: true },
  // Investigation indirecte : elle dépend des actions réellement dirigées vers la cible.
  // Le modèle lui attribue donc une fiabilité plus basse qu'un verdict direct.
  { slug: "guetteur", faction: "Civil", type: "INVESTIGATION", dw: 1.0, min: 7, invest: 0.35 },
  // — NEUTRES —
  { slug: "oracle", faction: "Neutre", type: "BÉNIN", dw: 0.7, min: 8 },
  { slug: "entremetteur", faction: "Neutre", type: "CHAOS", dw: 1.0, min: 7, matchmaker: true },
  { slug: "imitateur", faction: "Neutre", type: "CHAOS", dw: 0.5, min: 8 },
  { slug: "vampire", faction: "Neutre", type: "CHAOS", dw: 0.35, min: 7, vampire: true },
  { slug: "parieur_tricheur", faction: "Neutre", type: "CHAOS", dw: 0.5, min: 8, gambler: true },
  { slug: "conservateur", faction: "Neutre", type: "CHAOS", dw: 0.7, min: 7, curator: true },
  { slug: "empoisonneur", faction: "Neutre", type: "MAL", dw: 1.0, min: 7, poisoner: true },
  { slug: "heritier_dechu", faction: "Neutre", type: "MAL", dw: 0.6, min: 8, heir: true },
  { slug: "veuve_noire", faction: "Neutre", type: "MAL", dw: 0.6, min: 8, widow: true },
];
const BY_SLUG = Object.fromEntries(ROLES.map((r) => [r.slug, r]));

// ─────────── CONFIG DE RÈGLES (leviers de rééquilibrage testables) ───────────
const CFG = {
  parityStrict: true, // RÈGLE LIVRÉE : méchants gagnent à la majorité stricte (>)
  mechantCap: 99, // plafond du nombre de méchants (acolytesCountFor plafonne déjà à 2)
  voteRevealFaction: false, // true = l'emprisonnement révèle la faction (gros buff ville)
};

// ─────────── Quotas (constants.ts, copie exacte) ───────────
function bracket(n) {
  return n <= 8 ? "small" : n <= 13 ? "mid" : n <= 17 ? "large" : "xl";
}
const ACOLYTE_QUOTAS = {
  small: { INVESTIGATION: [0, 1], TROMPERIE: [0, 1], CONTRÔLE: [0, 1] },
  mid: { INVESTIGATION: [1, 1], TROMPERIE: [0, 1], CONTRÔLE: [0, 1] },
  large: { INVESTIGATION: [1, 1], TROMPERIE: [1, 2], CONTRÔLE: [0, 2] },
  xl: { INVESTIGATION: [1, 2], TROMPERIE: [1, 2], CONTRÔLE: [1, 2] },
};
const CIVIL_QUOTAS = {
  small: {
    INVESTIGATION: [1, 2],
    PROTECTEUR: [0, 1],
    TUEUR: [0, 1],
    SUPPORT: [1, 2],
  },
  mid: {
    INVESTIGATION: [2, 2],
    PROTECTEUR: [1, 2],
    TUEUR: [1, 1],
    SUPPORT: [1, 2],
  },
  large: {
    INVESTIGATION: [2, 3],
    PROTECTEUR: [2, 2],
    TUEUR: [1, 2],
    SUPPORT: [2, 3],
  },
  xl: {
    INVESTIGATION: [3, 4],
    PROTECTEUR: [2, 3],
    TUEUR: [1, 2],
    SUPPORT: [2, 3],
  },
};
function acolytesCountFor(n) {
  return n <= 9 ? 1 : n <= 17 ? 2 : 3; // aligné constants.ts : 3 méchants ≤17, 4 à 18-20
}
function neutresCountFor(n) {
  return n <= 7 ? 0 : n <= 11 ? 1 : n <= 17 ? 2 : 3;
}
const NEUTRE_TYPE_WEIGHTS = { BÉNIN: 1.0, MAL: 0.45, CHAOS: 0.2 };

// drawByQuotas — tire jusqu'à `count` rôles en respectant min/max par type
function drawByQuotas(pool, quotas, count) {
  const picked = [];
  const used = new Set();
  const byType = {};
  for (const r of pool) (byType[r.type] ??= []).push(r);
  // 1) min par type
  for (const [t, [mn]] of Object.entries(quotas)) {
    for (let k = 0; k < mn && picked.length < count; k++) {
      const cand = (byType[t] || []).filter((r) => !used.has(r.slug));
      if (cand.length === 0) break;
      const r = weightedPick(cand, (x) => x.dw);
      used.add(r.slug);
      picked.push(r);
    }
  }
  // 2) remplir le reste en respectant max
  const typeCount = () => {
    const c = {};
    for (const r of picked) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  };
  let guard = 0;
  while (picked.length < count && guard++ < 200) {
    const c = typeCount();
    const cand = pool.filter(
      (r) => !used.has(r.slug) && (c[r.type] || 0) < (quotas[r.type]?.[1] ?? 0),
    );
    if (cand.length === 0) break;
    const r = weightedPick(cand, (x) => x.dw);
    used.add(r.slug);
    picked.push(r);
  }
  return picked;
}

// drawRoles — reproduction de src/engine/actions.ts
function drawRoles(n) {
  const eligible = ROLES.filter((r) => r.min <= n);
  const slugs = [];
  const take = (r) => {
    if (r && !slugs.includes(r.slug)) slugs.push(r.slug);
  };

  // Tueur principal (pondéré)
  const tueurs = eligible.filter((r) => r.type === "TUEUR" && r.faction === "Méchant");
  take(weightedPick(tueurs, (x) => x.dw));
  // MUSTs civils
  take(BY_SLUG.assistant_du_detective);
  take(BY_SLUG.majordome);
  // Exécuteur : PLUS MUST (aligné sur src/engine/actions.ts). Il concourt désormais
  // pour le slot Civil/TUEUR via les quotas (avec Cuisinier/Vengeur).

  // Acolytes
  const nAco = Math.min(acolytesCountFor(n), Math.max(0, CFG.mechantCap - 1));
  const acoPool = eligible.filter(
    (r) => r.faction === "Méchant" && r.type !== "TUEUR" && !slugs.includes(r.slug),
  );
  for (const r of drawByQuotas(acoPool, ACOLYTE_QUOTAS[bracket(n)], nAco)) take(r);

  // Neutres : pondération par type puis draw_weight ; 2e neutre type différent
  const nNeu = neutresCountFor(n);
  let neuPool = eligible.filter(
    (r) => r.faction === "Neutre" && r.slug !== "chasseur_de_vampire" && !slugs.includes(r.slug),
  );
  const chosenTypes = new Set();
  for (let k = 0; k < nNeu; k++) {
    let cand = neuPool.filter((r) => !slugs.includes(r.slug) && !chosenTypes.has(r.type));
    if (cand.length === 0) cand = neuPool.filter((r) => !slugs.includes(r.slug));
    if (cand.length === 0) break;
    // pondération combinée type-weight × draw_weight
    const r = weightedPick(cand, (x) => (NEUTRE_TYPE_WEIGHTS[x.type] ?? 0.2) * x.dw);
    chosenTypes.add(r.type);
    take(r);
  }

  // Civils (quotas)
  const remaining = n - slugs.length;
  const civPool = eligible.filter((r) => r.faction === "Civil" && !slugs.includes(r.slug));
  for (const r of drawByQuotas(civPool, CIVIL_QUOTAS[bracket(n)], remaining)) take(r);
  // filet
  if (slugs.length < n) {
    const fb = civPool.filter((r) => !slugs.includes(r.slug));
    for (const r of shuffle(fb)) {
      if (slugs.length >= n) break;
      take(r);
    }
  }
  return shuffle(slugs).slice(0, n);
}

// ─────────── Construction des joueurs ───────────
function makeGame(n) {
  const slugs = drawRoles(n);
  const players = slugs.map((slug, i) => {
    const r = BY_SLUG[slug];
    return {
      id: i,
      slug,
      originSlug: slug,
      faction: r.faction,
      type: r.type,
      role: r,
      alive: true,
      free: true,
      isTueur: slug === "tueur" || (r.type === "TUEUR" && r.faction === "Méchant"),
      converted: false,
      poisoned: false,
      linkedWith: null,
      shieldUntil: -1,
      blockedUntil: -1,
      vigilanteUsed: false,
      gamblerUsed: false,
      fioleUsed: false,
      transformed: false,
      suspByTown: P.baseSuspicionNoise * srand(), // estimation ville
      revealedMechant: false, // enquête confirmée
      // Oracle : prédit un camp gagnant (priors : Méchant/Civil ~45 %, Neutre ~10 %).
      prediction:
        slug === "oracle"
          ? srand() < 0.45
            ? "Méchant"
            : srand() < 0.82
              ? "Civil"
              : "Neutre"
          : null,
    };
  });
  // Entremetteur : lie 2 autres joueurs
  const ent = players.find((p) => p.slug === "entremetteur");
  if (ent) {
    const others = players.filter((p) => p.id !== ent.id);
    const a = pick(others);
    let b = pick(others.filter((p) => p.id !== a.id));
    if (b) {
      a.linkedWith = b.id;
      b.linkedWith = a.id;
      ent.pairIds = [a.id, b.id];
    }
  }
  return players;
}

// ─────────── Helpers d'état ───────────
const isMechantRole = (p) => p.faction === "Méchant";
const isVampire = (p) => p.slug === "vampire" || p.converted;
const isMechant = (p, players) => {
  if (p.slug === "heritier_dechu") {
    const realMech = players.some((q) => isMechantRole(q) && q.alive && q.free);
    return realMech; // allié si un vrai méchant vit
  }
  return isMechantRole(p);
};
const isBenign = (p) => p.faction === "Neutre" && p.type === "BÉNIN";
const isBlockingNeutre = (p, players) => {
  if (p.faction !== "Neutre" || p.type === "BÉNIN") return false;
  if (p.slug === "vampire") return false;
  if (p.slug === "chasseur_de_vampire") return false;
  if (p.slug === "entremetteur" || p.linkedWith != null) return false;
  if (p.slug === "heritier_dechu" && isMechant(p, players)) return false;
  return true;
};

// ─────────── Conditions de victoire (winConditions.ts) ───────────
function evaluateWin(players) {
  const real = players;
  const alive = real.filter((p) => p.alive && p.free);
  if (alive.length === 0) return { winner: null };

  const realMechAlive = alive.filter(isMechantRole).length;
  const mechAlive = alive.filter((p) => isMechant(p, players)).length;
  const vampAlive = alive.filter(isVampire).length;
  const nonVamp = alive.filter((p) => !isVampire(p)).length;
  const lovers = alive.filter((p) => p.linkedWith != null);
  const entActive = lovers.length === 2 && lovers[0].linkedWith === lovers[1].id;

  // — Solo neutres : seul survivant
  for (const slug of ["veuve_noire", "parieur_tricheur"]) {
    const me = alive.find((p) => p.slug === slug);
    if (me && alive.filter((p) => p.id !== me.id).length === 0) return { winner: slug };
  }
  // — Empoisonneur : tous les autres libres empoisonnés
  const emp = alive.find((p) => p.slug === "empoisonneur");
  if (emp) {
    const others = alive.filter((p) => p.id !== emp.id);
    if (others.length > 0 && others.every((p) => p.poisoned)) return { winner: "empoisonneur" };
  }
  // — Vampires : plus aucun non-vampire
  if (vampAlive >= 1 && nonVamp === 0) return { winner: "Vampires" };

  // — Méchants : PARITÉ
  const benign = alive.filter(isBenign).length;
  const opponents = alive.length - mechAlive - benign;
  const parityHit = CFG.parityStrict ? mechAlive > opponents : mechAlive >= opponents;
  if (mechAlive > 0 && parityHit) return { winner: "Méchants" };

  // — Amoureux
  if (entActive) {
    const others = alive.filter((p) => p.slug !== "entremetteur" && p.linkedWith == null);
    if (others.length === 0) return { winner: "Amoureux" };
  }

  // — Citoyens
  const entFactionAlive = entActive
    ? alive.filter((p) => p.slug === "entremetteur" || p.linkedWith != null).length
    : 0;
  const blocking = alive.filter((p) => {
    if (!isBlockingNeutre(p, players)) return false;
    if (p.slug === "entremetteur" && !entActive) return false;
    return true;
  }).length;
  if (mechAlive === 0 && vampAlive === 0 && entFactionAlive === 0 && blocking === 0)
    return { winner: "Civil" };

  return null;
}

// ─────────── Modèle d'enquête → précision du vote ───────────
function runInvestigations(players, cycle) {
  const investigators = players.filter(
    (p) => p.alive && p.free && p.faction === "Civil" && (p.role.invest || p.role.investPrison),
  );
  const targets = players.filter((p) => p.alive && p.free);
  for (const inv of investigators) {
    // cible : le plus suspect encore non confirmé, sinon aléatoire
    const cand = targets.filter((t) => t.id !== inv.id && !t.revealedMechant);
    if (cand.length === 0) continue;
    cand.sort((a, b) => b.suspByTown - a.suspByTown);
    const t = chance(0.6) ? cand[0] : pick(cand);
    let reliability =
      (typeof inv.role.invest === "number" ? inv.role.invest : 1) * P.investigatorReliability;
    // couverture méchante : usurpateur/falsificateur/tueur camouflé réduisent la fiabilité
    // RÈGLE LIVRÉE : seul l'Assistant du détective PERCE les couvertures ; tout autre
    // enquêteur (Policier compris) est trompé par la couverture de l'Usurpateur.
    if (
      inv.slug !== "assistant_du_detective" &&
      isMechantRole(t) &&
      (t.role.cover ||
        t.isTueur ||
        players.some((q) => q.alive && q.free && q.role.cover && isMechantRole(q)))
    ) {
      reliability *= P.coverReliabilityMalus;
    }
    // Resserrement de déduction en fin de partie : moins de suspects = plus fiable.
    const fieldBoost = Math.min(0.2, Math.max(0, (8 - targets.length) * 0.04));
    reliability = Math.min(0.98, reliability + fieldBoost);
    const trueMech = isMechant(t, players);
    if (chance(reliability)) {
      // résultat correct
      if (trueMech) {
        t.suspByTown += 0.6;
        if (chance(0.5)) t.revealedMechant = true;
      } else {
        t.suspByTown -= 0.3;
        if (chance(0.5)) t.cleared = true;
      } // innocenté confirmé
    } else {
      // résultat trompeur
      if (trueMech) {
        t.suspByTown -= 0.2;
      } else {
        t.suspByTown += 0.3;
      }
    }
  }
  // accusateur (méchant) : monte la suspicion d'un civil
  for (const acc of players.filter((p) => p.alive && p.free && p.role.frame)) {
    const civs = players.filter((p) => p.alive && p.free && p.faction === "Civil");
    if (civs.length) pick(civs).suspByTown += 0.4;
  }
  // léger bruit
  for (const t of targets) t.suspByTown += (srand() - 0.5) * P.baseSuspicionNoise;
}

// ─────────── Vote → emprisonnement ───────────
function runVote(players) {
  const voters = players.filter((p) => p.alive && p.free);
  if (voters.length <= 1) return null;
  const tally = new Map();
  const addVote = (id, w = 1) => tally.set(id, (tally.get(id) || 0) + w);

  // suspect n°1 de la ville — jamais un innocenté confirmé (cleared) ni la Veuve
  // noire (la table sait que voter contre elle = mort → personne ne l'accuse).
  const cands = voters.filter((p) => !p.cleared && p.slug !== "veuve_noire");
  const townTop = [...(cands.length ? cands : voters)].sort(
    (a, b) => b.suspByTown - a.suspByTown,
  )[0];

  for (const v of voters) {
    if (chance(P.abstainRate)) continue;
    if (isMechant(v, players)) {
      // méchant : pousse un civil (le plus crédible = le suspect ville s'il est civil, sinon un civil au hasard)
      const civs = voters.filter((p) => p.faction === "Civil" && p.id !== v.id);
      if (civs.length) addVote(pick(civs).id);
      continue;
    }
    // neutre non-aligné : vote ~ ville (suit le suspect) ou s'abstient
    if (v.faction === "Neutre") {
      if (chance(0.5) && townTop) addVote(townTop.id);
      continue;
    }
    // civil : coordonné sur le suspect n°1, sinon vote son propre top
    if (chance(P.townCoordination) && townTop && townTop.id !== v.id) addVote(townTop.id);
    else {
      const my = [...voters]
        .filter((p) => p.id !== v.id)
        .sort((a, b) => b.suspByTown - a.suspByTown)[0];
      if (my) addVote(my.id);
    }
  }
  if (tally.size === 0) return null;
  let best = null,
    bestN = -1;
  for (const [id, nv] of tally)
    if (nv > bestN) {
      bestN = nv;
      best = id;
    }
  return players.find((p) => p.id === best) ?? null;
}

// ─────────── Un cycle de jeu ───────────
function killPlayer(p, players, byMechant = false) {
  if (!p.alive) return false;
  p.alive = false;
  p.free = false;
  // chaîne amoureux
  if (p.linkedWith != null) {
    const lover = players.find((q) => q.id === p.linkedWith);
    if (lover && lover.alive) {
      lover.alive = false;
      lover.free = false;
    }
  }
  return true;
}

function mechantKill(players) {
  // Tueur courant
  const tueur = players.find((p) => p.alive && p.free && p.isTueur && isMechantRole(p));
  if (!tueur) return;
  const prey = players.filter((p) => p.alive && p.free && !isMechantRole(p) && !isVampire(p));
  if (prey.length === 0) return;
  // cible : préfère les protecteurs/enquêteurs (menace pour les méchants)
  prey.sort((a, b) => threat(b) - threat(a));
  const target = chance(0.6) ? prey[0] : pick(prey);

  // protections
  const guardians = players.filter(
    (p) => p.alive && p.free && p.faction === "Civil" && p.role.guard,
  );
  const shielders = players.filter((p) => p.alive && p.free && p.role.shield);
  // babysitter/ange/barman protègent une cible (devine la cible du tueur avec proba)
  let shielded = false;
  for (const s of shielders) {
    if (chance(P.majordomeGuessRate)) {
      shielded = true;
      break;
    }
  }
  if (target.shieldUntil >= 0) shielded = true;
  // majordome : s'il garde précisément la cible → échange mortel
  for (const g of guardians) {
    if (chance(P.majordomeGuessRate)) {
      // garde la cible : cible vit, majordome meurt, tueur meurt
      killPlayer(g, players);
      killPlayer(tueur, players);
      succession(players);
      return;
    }
  }
  if (shielded) return;
  if (chance(P.killerSuccessBase)) killPlayer(target, players, true);
}

function threat(p) {
  if (p.role.guard) return 5;
  if (p.role.invest) return 4;
  if (p.role.executioner) return 3;
  if (p.role.vigilante || p.role.avenger) return 3;
  return 1 + p.suspByTown;
}

function succession(players) {
  // Si plus de tueur libre vivant, promeut un acolyte
  const hasTueur = players.some((p) => p.alive && p.free && p.isTueur && isMechantRole(p));
  if (hasTueur) return;
  const acolytes = players.filter((p) => p.alive && p.free && isMechantRole(p) && !p.isTueur);
  if (acolytes.length) pick(acolytes).isTueur = true;
}

function neutralActions(players, cycle) {
  // Conservateur : ~2 distributions de relique/cycle, 5 % = Cœur du Manoir → victoire immédiate.
  const cons = players.find((p) => p.alive && p.free && p.slug === "conservateur");
  if (cons) {
    const draws = 2; // 1×/phase libre + 1×/rassemblement
    for (let d = 0; d < draws; d++) if (chance(0.05)) return { winner: "conservateur" };
  }
  // Imitateur : se transforme en le dernier mort (hérite faction/slug) dès qu'un mort existe.
  const imi = players.find((p) => p.alive && p.free && p.slug === "imitateur" && !p.transformed);
  if (imi && cycle >= 2) {
    const deads = players.filter((p) => !p.alive && p.id !== imi.id);
    if (deads.length) {
      const model = deads[deads.length - 1];
      imi.transformed = true;
      imi.faction = model.faction;
      imi.slug = model.slug;
      imi.type = model.type;
      imi.role = model.role;
      if (model.isTueur && model.faction === "Méchant") imi.isTueur = true;
      if (model.slug === "vampire" || model.converted) imi.converted = true;
    }
  }
  // Vampire : convertit
  const vamp = players.find((p) => p.alive && p.free && p.slug === "vampire");
  if (vamp && cycle % 2 === 1) {
    const prey = players.filter((p) => p.alive && p.free && !isVampire(p) && p.id !== vamp.id);
    if (prey.length && chance(P.vampireConvertSuccess)) pick(prey).converted = true;
  }
  // Empoisonneur : empoisonne 1/cycle
  const emp = players.find((p) => p.alive && p.free && p.slug === "empoisonneur");
  if (emp) {
    const prey = players.filter((p) => p.alive && p.free && p.id !== emp.id && !p.poisoned);
    if (prey.length) pick(prey).poisoned = true;
  }
  // Parieur tricheur : 1×/TOUR répétable (avant : 1×/partie). Chaque duel = 79 % de
  // tuer la cible, 21 % de mourir (3 dés garde le meilleur vs 1 d6). Répétable → il
  // peut enchaîner les paris pour tenter d'être seul survivant, mais chaque duel le
  // risque. Push-your-luck : le win-rate reste faible mais gagné par la prise de risque.
  const gam = players.find((p) => p.alive && p.free && p.slug === "parieur_tricheur");
  if (gam && cycle >= 2 && chance(0.5)) {
    const prey = players.filter((p) => p.alive && p.free && p.id !== gam.id);
    if (prey.length) {
      if (chance(0.79)) killPlayer(pick(prey), players);
      else killPlayer(gam, players);
    }
  }
  // Veuve noire : sa toile DISSUADE qu'on la vote (cf. runVote l'exclut du lynch) ;
  // quand on la confronte quand même, ses époux meurent → elle pioche dans le champ.
  const veuve = players.find((p) => p.alive && p.free && p.slug === "veuve_noire");
  if (veuve && cycle >= 2 && chance(0.45)) {
    const prey = players.filter((p) => p.alive && p.free && p.id !== veuve.id);
    if (prey.length) killPlayer(pick(prey), players);
  }
}

function civilKills(players, cycle) {
  // Cuisinier : 1× vigilante
  const cui = players.find((p) => p.alive && p.free && p.role.vigilante && !p.vigilanteUsed);
  if (cui && cycle >= 1 && chance(0.5)) {
    cui.vigilanteUsed = true;
    const prey = players.filter((p) => p.alive && p.free && p.id !== cui.id);
    if (prey.length) {
      // vise un suspect : touche un méchant sauf cuisinierHitsTown
      prey.sort((a, b) => b.suspByTown - a.suspByTown);
      const t = chance(1 - P.cuisinierHitsTown) ? prey[0] : pick(prey);
      killPlayer(t, players);
    }
  }
  // Apothicaire : fiole poison 1×
  const apo = players.find((p) => p.alive && p.free && p.role.fioles && !p.fioleUsed);
  if (apo && cycle >= 1 && chance(0.4)) {
    apo.fioleUsed = true;
    const prey = players.filter((p) => p.alive && p.free && p.id !== apo.id);
    if (prey.length) {
      prey.sort((a, b) => b.suspByTown - a.suspByTown);
      if (chance(0.6)) killPlayer(prey[0], players);
    }
  }
  // Exécuteur : tue un prisonnier ayant purgé 1 tour
  const exe = players.find((p) => p.alive && p.free && p.role.executioner);
  if (exe) {
    const prisoners = players.filter((p) => p.alive && !p.free);
    if (prisoners.length) {
      // préfère exécuter un prisonnier (au pif — la ville ne connaît pas toujours la faction)
      const victim = pick(prisoners);
      victim.alive = false;
    }
  }
}

// ─────────── Boucle de partie ───────────
function simulateGame(n) {
  const players = makeGame(n);
  let win = evaluateWin(players);
  for (let cycle = 1; cycle <= P.maxCycles && !win; cycle++) {
    // PHASE LIBRE
    const consWin = neutralActions(players, cycle);
    if (consWin) {
      win = consWin;
      break;
    }
    mechantKill(players);
    civilKills(players, cycle);
    succession(players);
    // expiration des boucliers temporaires
    for (const p of players) if (p.shieldUntil < cycle) p.shieldUntil = -1;
    win = evaluateWin(players);
    if (win) break;

    // ENQUÊTE + VOTE → PRISON
    runInvestigations(players, cycle);
    const lynched = runVote(players);
    if (lynched) {
      if (lynched.role.saintTrap) {
        win = { winner: "Méchants", saint: true };
        break;
      }
      lynched.free = false; // emprisonné
      lynched.imprisonedSince = cycle;
      // Buff optionnel : la prison révèle la faction → la ville innocente/confirme
      if (CFG.voteRevealFaction) {
        if (isMechant(lynched, players)) lynched.revealedMechant = true;
        else lynched.cleared = true;
      }
      succession(players); // si on emprisonne le tueur
    }
    win = evaluateWin(players);
    if (win) break;

    // libération éventuelle par avocat (léger) — un prisonnier civil peut ressortir
    const avocat = players.find((p) => p.alive && p.free && p.slug === "avocat");
    if (avocat && chance(0.15)) {
      const pr = players.find((p) => p.alive && !p.free);
      if (pr) pr.free = true;
    }
  }
  if (!win) win = { winner: "timeout" };
  return { win, players };
}

// ─────────── Agrégation ───────────
function classifyWinner(win, players) {
  const w = win.winner;
  if (w === "Civil") return "Civils";
  if (w === "Méchants") return "Méchants";
  if (w === "Vampires") return "Neutre:vampire";
  if (w === "Amoureux") return "Neutre:entremetteur";
  if (
    ["veuve_noire", "parieur_tricheur", "empoisonneur", "conservateur", "heritier_dechu"].includes(
      w,
    )
  )
    return "Neutre:" + w;
  if (w === "timeout") return "Timeout";
  return "Autre";
}

function runBatch(n, games) {
  const tally = {};
  const present = {}; // rôles neutres présents
  const neutreWinWhenPresent = {};
  for (let g = 0; g < games; g++) {
    const { win, players } = simulateGame(n);
    const cls = classifyWinner(win, players);
    tally[cls] = (tally[cls] || 0) + 1;
    // suivi neutres (par rôle d'ORIGINE : l'imitateur change de slug en cours de partie)
    const winner = win.winner;
    const winFaction = winner === "Civil" ? "Civil" : winner === "Méchants" ? "Méchant" : "Neutre";
    for (const p of players) {
      const os = p.originSlug;
      if (BY_SLUG[os].faction !== "Neutre") continue;
      present[os] = (present[os] || 0) + 1;
      let won = false;
      switch (os) {
        case "vampire":
          won = winner === "Vampires";
          break;
        case "entremetteur": {
          // Victoire dure (Amoureux) OU repli survie : couple brisé + entremetteur vivant & libre à la fin.
          if (winner === "Amoureux") {
            won = true;
            break;
          }
          if (p.alive && p.free) {
            const pair = (p.pairIds || []).map((id) => players.find((q) => q.id === id));
            const coupleIntact = pair.length === 2 && pair.every((q) => q && q.alive && q.free);
            won = !coupleIntact;
          }
          break;
        }
        case "empoisonneur":
          won = winner === "empoisonneur";
          break;
        case "veuve_noire":
          won = winner === "veuve_noire";
          break;
        case "parieur_tricheur":
          won = winner === "parieur_tricheur";
          break;
        case "conservateur":
          won = winner === "conservateur";
          break;
        case "heritier_dechu":
          won = winner === "Méchants" && p.alive && p.free;
          break; // gagne AVEC les méchants
        case "oracle":
          won = p.alive && p.free && p.prediction === winFaction;
          break;
        case "imitateur":
          if (p.transformed) {
            won =
              (winner === "Civil" && p.faction === "Civil") ||
              (winner === "Méchants" && p.faction === "Méchant") ||
              (winner === "Vampires" && (p.slug === "vampire" || p.converted)) ||
              winner === p.slug;
          }
          break;
      }
      if (won) neutreWinWhenPresent[os] = (neutreWinWhenPresent[os] || 0) + 1;
    }
  }
  return { tally, present, neutreWinWhenPresent };
}

// ─────────── Exports (pour le sweep) ───────────
export { P, CFG, runBatch, drawRoles, BY_SLUG, simulateGame };
import { fileURLToPath } from "node:url";
const _isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!_isMain) {
  /* importé : ne lance pas le main */
}

// ─────────── Main ───────────
const GAMES = Number(process.argv[2] || 20000);
const SIZES = [6, 8, 10, 12, 14, 16, 18, 20];
if (_isMain) {
  console.log(`\n=== SIMULATION D'ÉQUILIBRAGE — ${GAMES} parties / taille ===\n`);
  console.log("Paramètres comportementaux:", JSON.stringify(P));
  console.log("");

  const globalFaction = { Civils: 0, Méchants: 0, Neutre: 0, Timeout: 0, total: 0 };
  const gPresent = {},
    gWin = {};

  for (const n of SIZES) {
    const { tally, present, neutreWinWhenPresent } = runBatch(n, GAMES);
    for (const k of Object.keys(present)) gPresent[k] = (gPresent[k] || 0) + present[k];
    for (const k of Object.keys(neutreWinWhenPresent))
      gWin[k] = (gWin[k] || 0) + neutreWinWhenPresent[k];
    const civ = tally["Civils"] || 0;
    const mech = tally["Méchants"] || 0;
    const neu = Object.entries(tally)
      .filter(([k]) => k.startsWith("Neutre"))
      .reduce((s, [, v]) => s + v, 0);
    const to = tally["Timeout"] || 0;
    globalFaction.Civils += civ;
    globalFaction.Méchants += mech;
    globalFaction.Neutre += neu;
    globalFaction.Timeout += to;
    globalFaction.total += GAMES;

    const comp = drawRoles(n); // exemple de composition
    const mc = comp.filter((s) => BY_SLUG[s].faction === "Méchant").length;
    const cc = comp.filter((s) => BY_SLUG[s].faction === "Civil").length;
    const nc = comp.filter((s) => BY_SLUG[s].faction === "Neutre").length;

    console.log(
      `──────── ${n} JOUEURS  (compo type: ${cc} civils / ${mc} méchants / ${nc} neutres) ────────`,
    );
    console.log(`  Civils   : ${((100 * civ) / GAMES).toFixed(1)}%`);
    console.log(`  Méchants : ${((100 * mech) / GAMES).toFixed(1)}%`);
    console.log(
      `  Neutres  : ${((100 * neu) / GAMES).toFixed(1)}%   (timeout ${((100 * to) / GAMES).toFixed(1)}%)`,
    );
    // ratio civ/méchant hors neutres
    const cm = civ + mech;
    if (cm > 0)
      console.log(
        `  → Civils vs Méchants (parties tranchées): ${((100 * civ) / cm).toFixed(1)}% / ${((100 * mech) / cm).toFixed(1)}%`,
      );
    // détail neutres
    const neuDetail = Object.entries(tally)
      .filter(([k]) => k.startsWith("Neutre"))
      .sort((a, b) => b[1] - a[1]);
    if (neuDetail.length) {
      console.log("  Neutres gagnants (part des parties):");
      for (const [k, v] of neuDetail)
        console.log(
          `     ${k.replace("Neutre:", "").padEnd(18)} ${((100 * v) / GAMES).toFixed(2)}%`,
        );
    }
    // win-rate conditionnel des rôles neutres (quand présents)
    console.log("  Win-rate neutre QUAND présent dans la partie:");
    for (const slug of Object.keys(present).sort()) {
      const pr = present[slug],
        wn = neutreWinWhenPresent[slug] || 0;
      console.log(
        `     ${slug.padEnd(18)} présent ${((100 * pr) / GAMES).toFixed(0).padStart(3)}% des parties · win ${((100 * wn) / pr).toFixed(1)}%`,
      );
    }
    console.log("");
  }

  console.log("════════ GLOBAL (toutes tailles) ════════");
  const T = globalFaction.total;
  console.log(`  Civils   : ${((100 * globalFaction.Civils) / T).toFixed(1)}%`);
  console.log(`  Méchants : ${((100 * globalFaction.Méchants) / T).toFixed(1)}%`);
  console.log(`  Neutres  : ${((100 * globalFaction.Neutre) / T).toFixed(1)}%`);
  console.log(`  Timeout  : ${((100 * globalFaction.Timeout) / T).toFixed(1)}%`);
  const CM = globalFaction.Civils + globalFaction.Méchants;
  console.log(
    `  → Civils/Méchants seuls : ${((100 * globalFaction.Civils) / CM).toFixed(1)}% / ${((100 * globalFaction.Méchants) / CM).toFixed(1)}%  (cible 55/45)`,
  );

  console.log("\n════════ WIN-RATE NEUTRES — quand présent (toutes tailles) ════════");
  const order = Object.keys(gPresent).sort(
    (a, b) => (gWin[b] || 0) / gPresent[b] - (gWin[a] || 0) / gPresent[a],
  );
  for (const slug of order) {
    const pr = gPresent[slug],
      wn = gWin[slug] || 0;
    console.log(
      `  ${slug.padEnd(18)} présent ${((100 * pr) / T).toFixed(0).padStart(3)}% · win ${((100 * wn) / pr).toFixed(1).padStart(5)}%`,
    );
  }
} // fin _isMain
