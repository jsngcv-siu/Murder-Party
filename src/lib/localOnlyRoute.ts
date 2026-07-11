import { redirect } from "@tanstack/react-router";

/**
 * Bloque les bacs à sable et galeries hors du serveur Vite local.
 *
 * `DEV` est vrai uniquement avec `vite dev`. Les aperçus et déploiements de
 * production suivent donc le même comportement que Vercel : retour à l'accueil.
 */
export function requireLocalDevelopment(): void {
  if (!import.meta.env.DEV) throw redirect({ to: "/" });
}
