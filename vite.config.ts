import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Déploiement : Nitro auto-détecte la cible au build (Vercel via VERCEL=1,
// sinon node-server). Pas de preset codé en dur — le même build fonctionne
// en local (`vite build` + `node .output/server/index.mjs`) et sur Vercel.
export default defineConfig({
  // __BUILD_TIME__ (date du build) remplacé statiquement au build. Le NUMÉRO de
  // version, lui, est manuel dans src/version.ts. Voir src/globals.d.ts pour les types.
  define: {
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
