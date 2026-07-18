// Micro-simulation du PYROMANE (lot 5) — modèle dédié, dans l'esprit de
// balance.mjs (indicatif, pas une preuve). Question posée : le barème de
// victoire 2 (≤10 j.) / 3 (11-15) / 4 (16+) donne-t-il un win-rate « quand
// présent » raisonnable pour un Neutre/MAL (~cible 25-40 %, cf. Empoisonneur
// ~36 %) ? L'intégration complète des nouveaux rôles à balance.mjs se fera à
// l'ACTIVATION (les rôles sont désactivés d'ici là).
//
// Modèle par tour :
//   • ~1,15 mort/tour d'autres causes (nuit + vote), réparties au hasard ;
//   • le Pyromane asperge 1 vivant/tour (plafond barème+1, les morts sortent) ;
//   • il risque le vote/l'enquête comme les autres (prob. de mourir ∝ morts/vivants) ;
//   • il craque l'allumette dès que les aspergés vivants et LIBRES ≥ barème
//     (stratégie gloutonne) ; chaque aspergé brûle sauf protection (12 %) et
//     sauf prison (8 % d'être détenu au moment du feu) ;
//   • victoire si morts-par-feu ≥ barème (il doit être vivant).
// Usage : node sim/pyromane.mjs [nbParties=20000]

const GAMES = Number(process.argv[2] ?? 20000);
const rand = Math.random;

// Barème RETENU (2026-07-18) après calage : l'ancien « 2 aux petites tables »
// donnait ~45-50 % → trop fort. À 3/4, tout rentre dans la cible (22-38 %).
function threshold(n) {
  if (n <= 15) return 3;
  return 4;
}

function simulate(n) {
  const need = threshold(n);
  const cap = need + 1;
  let alive = n;
  let pyroAlive = true;
  const doused = []; // true = encore vivant
  let fireKills = 0;
  let ignited = false;

  for (let tour = 1; tour <= 14 && pyroAlive && alive > 3; tour++) {
    // Morts d'autres causes (~1,15/tour, arrondi stochastique)
    const deaths = 1 + (rand() < 0.15 ? 1 : 0);
    for (let d = 0; d < deaths; d++) {
      if (rand() < 1 / alive) {
        pyroAlive = false;
        break;
      }
      // Un aspergé peut mourir d'autre chose (proportion des vivants)
      const aliveDoused = doused.filter(Boolean).length;
      if (aliveDoused > 0 && rand() < aliveDoused / alive) {
        const idx = doused.findIndex(Boolean);
        doused[idx] = false;
      }
      alive--;
    }
    if (!pyroAlive) break;

    // Aspersion (plafond sur les vivants)
    if (!ignited && doused.filter(Boolean).length < cap) doused.push(true);

    // Allumette gloutonne
    const ready = doused.filter(Boolean).length;
    if (!ignited && ready >= need) {
      ignited = true;
      for (let i = 0; i < doused.length; i++) {
        if (!doused[i]) continue;
        const imprisoned = rand() < 0.08;
        const protectedNow = rand() < 0.12;
        if (!imprisoned && !protectedNow) {
          fireKills++;
          doused[i] = false;
          alive--;
        }
      }
      break; // la partie se joue après, mais son sort est scellé ici
    }
  }
  return pyroAlive && fireKills >= need;
}

console.log(`=== PYROMANE — ${GAMES} parties par taille (indicatif) ===`);
console.log(`(cible qualitative : Neutre/MAL « quand présent » ≈ 25-40 %)`);
for (const n of [8, 10, 12, 14, 16, 18, 20]) {
  let wins = 0;
  for (let g = 0; g < GAMES; g++) if (simulate(n)) wins++;
  const pct = ((100 * wins) / GAMES).toFixed(1);
  console.log(`  ${String(n).padStart(2)} joueurs (barème ${threshold(n)}) : ${pct}% de victoires`);
}
