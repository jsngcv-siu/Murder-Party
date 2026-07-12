import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering). En environnement
  // Deno (Edge Function), `import.meta.env` est absent → on lit ce qui existe.
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const nodeEnv = typeof process !== "undefined" ? (process.env ?? {}) : {};
  const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || nodeEnv.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || nodeEnv.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. See .env.example.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * Injecte un client Supabase — utilisé UNIQUEMENT côté serveur (Edge Function
 * `phase-ticker`) pour faire tourner le moteur avec la clé service-role (RLS
 * contournée, pas de navigateur). À appeler AVANT tout accès au moteur ; en
 * navigateur on ne l'appelle jamais → création lazy normale via Vite env.
 */
export function setSupabaseClient(client: ReturnType<typeof createSupabaseClient>): void {
  _supabase = client;
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
