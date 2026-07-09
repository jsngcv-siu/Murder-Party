// Headless reproduction of src/engine/qa/expectations.ts :: auditRoleStatic,
// run over EVERY role in the set (not just those drawn in a single game).
// Mirrors allowedActivePhases / parseTotalLimit from src/engine/actions.ts.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Config Supabase = MÊME source de vérité que l'app (le .env à la racine).
// AUCUNE URL/clé en dur : l'ancien hardcode (svxjejyaytytfwjnkubv) avait survécu
// au passage du projet à eqcfagjvbiwhsofzmqtg → l'audit interrogeait une base
// morte. En lisant le .env, le script suit toujours le vrai projet de l'app.
// Ordre : variables d'environnement d'abord, puis .env à la racine.
function loadEnv() {
  const out = { ...process.env };
  try {
    const envPath = fileURLToPath(new URL("../.env", import.meta.url));
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && out[m[1]] == null) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* pas de .env → on se rabat sur process.env seul */
  }
  return out;
}

const env = loadEnv();
// NB : ne PAS nommer ces constantes `URL`/`KEY` — `const URL` masquerait la
// classe globale `URL` sur tout le module et casserait `new URL()` dans loadEnv.
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Config Supabase manquante. Renseigne VITE_SUPABASE_URL et " +
      "VITE_SUPABASE_PUBLISHABLE_KEY dans .env (à la racine du projet) ou dans l'environnement.",
  );
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/roles?set_id=eq.set1&select=*`, {
  headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
});
const roles = await res.json();
if (!Array.isArray(roles)) {
  console.error("Fetch failed:", roles);
  process.exit(1);
}

// ── engine mirrors ──────────────────────────────────────────────────────────
// Refonte boucle : toutes les capacités actives se jouent en ENQUÊTE (`free`).
// Le Débat ne porte aucune capacité active → allowedActivePhases est constant.
function allowedActivePhases(_role) {
  return new Set(["free"]);
}
function parseTotalLimit(role, n) {
  const lbl = role.usage_label ?? "";
  if (role.slug === "cleaner") return n >= 10 ? 2 : 1;
  if (role.slug === "mouchard") return 1;
  if (/1×\/partie/i.test(lbl)) return 1;
  const m = lbl.match(/max\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (role.slug === "apothicaire") return 3;
  if (role.slug === "executeur" || role.slug === "juge") {
    if (n <= 10) return 1;
    if (n <= 13) return 2;
    return 3;
  }
  return Infinity;
}

// ── prose parsing (verbatim from expectations.ts) ───────────────────────────
const textOf = (r) => `${r.capacite_full_text ?? ""}`.toLowerCase();
function phasesMentionedInText(r) {
  const t = textOf(r);
  return {
    free: /phase\s+libre|en\s+journée|la\s+journée|pendant\s+le\s+jour/.test(t),
    gathering: /rassemblement/.test(t),
  };
}
const oneShotMentioned = (r) =>
  /une\s+seule\s+fois|1×\s*\/\s*partie|une\s+fois\s+par\s+partie|usage\s+unique|à\s+usage\s+unique/.test(
    textOf(r),
  );
const passiveMentioned = (r) =>
  /\bpassif\b|\bpassive\b|automatiquement|de\s+façon\s+automatique/.test(textOf(r));
function hasTargetingVerb(r) {
  const t = textOf(r);
  if (/\b(désigne|vise|pointe)\b/.test(t)) return true;
  if (
    /\b(protège|empoisonne|tue|emprisonne|élimine|lie|lier|unis|unir|marie)\s+(un|une|le|la|ce|cet|cette|\d)/.test(
      t,
    )
  )
    return true;
  if (
    /\b(choisis|sélectionne)\s+(un|une|1|2|deux|le|la)\s*(joueur|cible|voisin|allié|alliée|victime|époux|amoureux|membre|coéquipier|convive|invité)/.test(
      t,
    )
  )
    return true;
  return false;
}

function auditRoleStatic(role, n) {
  const out = [];
  const exp = {
    allowedPhases: allowedActivePhases(role),
    totalLimit: parseTotalLimit(role, n),
    isPassive: (role.target_mode ?? "single") === "none",
  };
  const mentioned = phasesMentionedInText(role);

  // Refonte boucle : tout se joue en Enquête. Un texte parlant encore de
  // « rassemblement » est un vestige legacy à migrer.
  if (mentioned.gathering && !mentioned.free && !exp.isPassive)
    out.push(["high", "rules", `texte parle encore de « rassemblement » — capacité en ENQUÊTE`]);
  if (oneShotMentioned(role) && exp.totalLimit === Infinity)
    out.push(["medium", "rules", `texte annonce usage unique mais moteur n'impose AUCUNE limite`]);
  if (exp.isPassive && hasTargetingVerb(role) && !passiveMentioned(role))
    out.push(["medium", "ux", `carte passive (target_mode=none) mais le texte demande de CIBLER`]);
  if (!exp.isPassive && passiveMentioned(role) && !hasTargetingVerb(role))
    out.push(["info", "ux", `carte décrite « passive » mais target_mode attend une cible`]);
  return out;
}

// ── run over every role, several player counts (limits depend on n) ─────────
const SIZES = [6, 8, 10, 12, 14, 15];
const bySlug = {};
let total = 0;
for (const r of roles) {
  const seen = new Set();
  for (const n of SIZES) {
    for (const [sev, cat, msg] of auditRoleStatic(r, n)) {
      const k = `${sev}|${cat}|${msg}`;
      if (seen.has(k)) continue;
      seen.add(k);
      (bySlug[r.slug] ??= {
        name: r.name_fr,
        faction: r.faction,
        type: r.type,
        findings: [],
      }).findings.push({ sev, cat, msg });
      total++;
    }
  }
}

console.log(`\n=== AUDIT STATIQUE (texte carte ↔ moteur) — ${roles.length} rôles set1 ===\n`);
const order = { high: 0, medium: 1, info: 2 };
const flagged = Object.entries(bySlug).sort(
  (a, b) =>
    Math.min(...a[1].findings.map((f) => order[f.sev])) -
    Math.min(...b[1].findings.map((f) => order[f.sev])),
);
if (flagged.length === 0) {
  console.log("✅ Aucun écart texte↔moteur détecté sur l'ensemble des rôles.");
} else {
  for (const [slug, info] of flagged) {
    console.log(`● ${info.name} (${slug}) — ${info.faction}/${info.type}`);
    for (const f of info.findings) {
      const icon = f.sev === "high" ? "🔴" : f.sev === "medium" ? "🟠" : "🔵";
      console.log(`    ${icon} [${f.cat}] ${f.msg}`);
    }
  }
}
console.log(
  `\n${total} finding(s) sur ${flagged.length} rôle(s). ${roles.length - flagged.length} rôles sans écart.`,
);

// Coverage sanity: roles missing core display fields.
console.log("\n=== CONTRÔLES DE COMPLÉTUDE (champs carte) ===");
let gaps = 0;
for (const r of roles.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const miss = [];
  if (!r.capacite_full_text) miss.push("capacite_full_text");
  if (!r.usage_label && !r.frequency_label) miss.push("usage/frequency_label");
  if (!r.faction) miss.push("faction");
  if (!r.type) miss.push("type");
  if (r.target_mode == null) miss.push("target_mode");
  if (miss.length) {
    console.log(`  ⚠️  ${r.name_fr} (${r.slug}) manque: ${miss.join(", ")}`);
    gaps++;
  }
}
if (!gaps) console.log("  ✅ Tous les rôles ont leurs champs d'affichage essentiels.");
