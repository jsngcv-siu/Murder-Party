// Scénarios de rééquilibrage : impact quantifié de chaque levier sur la
// part des Civils (parties tranchées Civils/Méchants), toutes tailles.
import { P, CFG, runBatch } from "./balance.mjs";

const GAMES = Number(process.argv[2] || 5000);
const SIZES = [6, 8, 10, 12, 14, 15];

function measure() {
  let civ = 0,
    mech = 0,
    neu = 0;
  for (const n of SIZES) {
    const { tally } = runBatch(n, GAMES);
    civ += tally["Civils"] || 0;
    mech += tally["Méchants"] || 0;
    neu += Object.entries(tally)
      .filter(([k]) => k.startsWith("Neutre"))
      .reduce((s, [, v]) => s + v, 0);
  }
  const tot = SIZES.length * GAMES;
  return {
    civAll: (100 * civ) / tot,
    mechAll: (100 * mech) / tot,
    neuAll: (100 * neu) / tot,
    civShare: (100 * civ) / (civ + mech),
  };
}

function resetP() {
  Object.assign(P, {
    investigatorReliability: 0.8,
    coverReliabilityMalus: 0.45,
    townCoordination: 0.75,
    baseSuspicionNoise: 0.15,
    killerSuccessBase: 0.72,
    majordomeGuessRate: 0.3,
    vampireConvertSuccess: 0.78,
    cuisinierHitsTown: 0.45,
    maxCycles: 16,
    abstainRate: 0.15,
  });
  Object.assign(CFG, { parityStrict: false, mechantCap: 99, voteRevealFaction: false });
}

function run(name, mutate) {
  resetP();
  mutate();
  const r = measure();
  console.log(
    `${name.padEnd(46)} Civils ${r.civAll.toFixed(1).padStart(5)}% | Méchants ${r.mechAll.toFixed(1).padStart(5)}% | Neutres ${r.neuAll.toFixed(1).padStart(5)}%  → C/M ${r.civShare.toFixed(0)}/${(100 - r.civShare).toFixed(0)}`,
  );
}

console.log(`\n=== SCÉNARIOS DE RÉÉQUILIBRAGE (${GAMES} parties/taille × 6 tailles) ===`);
console.log("Cible : Civils 55 / Méchants 45 sur les parties tranchées.\n");

run("BASELINE (règles actuelles)", () => {});
console.log("");
console.log("— Leviers isolés —");
run("A. Vote révèle la faction (innocente/confirme)", () => {
  CFG.voteRevealFaction = true;
});
run("B. Méchants gagnent à la majorité stricte (>)", () => {
  CFG.parityStrict = true;
});
run("C. Plafond 3 méchants (retire le 4e à 14-15j)", () => {
  CFG.mechantCap = 3;
});
run("D. Couvertures affaiblies (malus 0.45→0.75)", () => {
  P.coverReliabilityMalus = 0.75;
});
run("E. Enquête plus fiable (0.80→0.90)", () => {
  P.investigatorReliability = 0.9;
});
run("F. Kills du Tueur plus rares (0.72→0.58)", () => {
  P.killerSuccessBase = 0.58;
});
run("G. Majordome/protect plus efficace (0.30→0.45)", () => {
  P.majordomeGuessRate = 0.45;
});
console.log("");
console.log("— Combinaisons —");
run("A+B (révélation + majorité stricte)", () => {
  CFG.voteRevealFaction = true;
  CFG.parityStrict = true;
});
run("A+C (révélation + plafond 3 méchants)", () => {
  CFG.voteRevealFaction = true;
  CFG.mechantCap = 3;
});
run("B+D (majorité stricte + couvertures faibles)", () => {
  CFG.parityStrict = true;
  P.coverReliabilityMalus = 0.75;
});
run("A+B+C (révélation + strict + plafond 3)", () => {
  CFG.voteRevealFaction = true;
  CFG.parityStrict = true;
  CFG.mechantCap = 3;
});
run("D+E+F (enquête forte + tueur doux)", () => {
  P.coverReliabilityMalus = 0.75;
  P.investigatorReliability = 0.9;
  P.killerSuccessBase = 0.58;
});
run("A+B+D (révélation + strict + couvertures faibles)", () => {
  CFG.voteRevealFaction = true;
  CFG.parityStrict = true;
  P.coverReliabilityMalus = 0.75;
});
