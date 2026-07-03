// Sweep de sensibilité : balaye précision d'enquête × létalité du Tueur,
// pour localiser le point de calibrage Civils/Méchants = 55/45.
import { P, runBatch } from "./balance.mjs";

const GAMES = Number(process.argv[2] || 6000);
const SIZES = [8, 10, 12];

function civShare(overrides) {
  Object.assign(P, overrides);
  let civ = 0, mech = 0;
  for (const n of SIZES) {
    const { tally } = runBatch(n, GAMES);
    civ += tally["Civils"] || 0;
    mech += tally["Méchants"] || 0;
  }
  return 100 * civ / (civ + mech);
}

console.log(`\n=== SWEEP DE SENSIBILITÉ (${GAMES} parties/taille, tailles 8/10/12) ===`);
console.log("Valeur = part des Civils parmi les parties tranchées Civils/Méchants (cible 55%)\n");

const relValues = [0.55, 0.65, 0.75, 0.85, 0.95];
const killValues = [0.50, 0.60, 0.70, 0.80];
const coverValues = [0.45, 0.70, 0.90];

// Table 1 : reliability × killerSuccess (cover fixé baseline 0.45)
console.log("TABLE 1 — précision d'enquête (lignes) × létalité Tueur (colonnes), cover malus = 0.45");
process.stdout.write("  reliab\\kill |");
for (const k of killValues) process.stdout.write(`  ${k.toFixed(2)} `);
console.log();
for (const rel of relValues) {
  process.stdout.write(`     ${rel.toFixed(2)}     |`);
  for (const k of killValues) {
    const v = civShare({ investigatorReliability: rel, killerSuccessBase: k, coverReliabilityMalus: 0.45, townCoordination: 0.75 });
    const mark = Math.abs(v - 55) <= 4 ? "*" : " ";
    process.stdout.write(` ${v.toFixed(0).padStart(3)}%${mark}`);
  }
  console.log();
}

// Table 2 : effet du "cover malus" (réalisme des couvertures méchantes)
console.log("\nTABLE 2 — impact du malus de couverture (usurpateur/falsificateur/tueur camouflé)");
console.log("  reliability=0.80, killerSuccess=0.70, townCoordination=0.75");
for (const cv of coverValues) {
  const v = civShare({ investigatorReliability: 0.80, killerSuccessBase: 0.70, coverReliabilityMalus: cv, townCoordination: 0.75 });
  console.log(`     cover malus ${cv.toFixed(2)}  → Civils ${v.toFixed(1)}%`);
}

// Table 3 : coordination de la ville
console.log("\nTABLE 3 — coordination de la ville au vote");
console.log("  reliability=0.80, killerSuccess=0.70, cover=0.45");
for (const c of [0.5, 0.65, 0.8, 0.95]) {
  const v = civShare({ investigatorReliability: 0.80, killerSuccessBase: 0.70, coverReliabilityMalus: 0.45, townCoordination: c });
  console.log(`     coordination ${c.toFixed(2)} → Civils ${v.toFixed(1)}%`);
}
console.log("\n(* = dans la cible 55±4%)");
