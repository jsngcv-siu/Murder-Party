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
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // src/server.ts est notre entrée serveur custom (wrapper d'erreurs SSR).
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    viteReact(),
  ],
});
