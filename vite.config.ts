import { defineConfig } from "vite";
import { execSync } from "node:child_process";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Version affichée dans l'app (écran d'accueil) → savoir d'un coup d'œil quel
// commit est déployé. Sur Vercel, VERCEL_GIT_COMMIT_SHA est fourni au build ;
// en local, on lit le git courant. Chaque commit ⇒ hash différent ⇒ nouvelle version.
function resolveVersion(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) return sha.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

// Déploiement : Nitro auto-détecte la cible au build (Vercel via VERCEL=1,
// sinon node-server). Pas de preset codé en dur — le même build fonctionne
// en local (`vite build` + `node .output/server/index.mjs`) et sur Vercel.
export default defineConfig({
  // Remplacés statiquement au build (voir src/globals.d.ts pour les types).
  define: {
    __APP_VERSION__: JSON.stringify(resolveVersion()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // src/server.ts est notre entrée serveur custom (wrapper d'erreurs SSR).
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    viteReact(),
  ],
});
