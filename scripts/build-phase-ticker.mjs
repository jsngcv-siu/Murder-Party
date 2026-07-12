// Bundle l'Edge Function `phase-ticker` en UN SEUL fichier autonome.
//
// Le runtime Edge de Supabase (Deno) charge les fichiers source un par un et ne
// résout pas les imports sans extension (`@/…`, `./…`) du moteur partagé. On
// inline donc tout le moteur avec esbuild ; seul `@supabase/supabase-js` reste
// externe (résolu via jsr au runtime, cf. deno.json).
//
// Usage : node scripts/build-phase-ticker.mjs
// Puis  : npx supabase functions deploy phase-ticker --no-verify-jwt --project-ref <ref>
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fnDir = path.join(root, "supabase", "functions", "phase-ticker");

await esbuild.build({
  entryPoints: [path.join(root, "scripts", "phase-ticker.src.ts")],
  outfile: path.join(fnDir, "index.ts"),
  bundle: true,
  format: "esm",
  platform: "browser", // supabase-js browser build tourne en Deno (fetch global)
  target: "es2022",
  // `@supabase/supabase-js` reste externe → import bare résolu par deno.json (jsr).
  external: ["@supabase/supabase-js"],
  // Résout l'alias `@/…` du projet vers ./src (comme Vite/tsconfig paths).
  alias: { "@": path.join(root, "src") },
  banner: {
    js: "// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer. Source : index.src.ts. Régénérer : node scripts/build-phase-ticker.mjs",
  },
  logLevel: "info",
});

console.log("✓ phase-ticker bundlé →", path.relative(root, path.join(fnDir, "index.ts")));
