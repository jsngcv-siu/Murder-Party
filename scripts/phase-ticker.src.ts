// SOURCE de l'Edge Function `phase-ticker`. NE PAS déployer ce fichier : c'est
// l'entrée d'esbuild. Le fichier réellement déployé est `index.ts` (bundle
// autonome généré par `node scripts/build-phase-ticker.mjs`).
//
// Pourquoi bundler : le runtime Edge (Deno) charge les fichiers un par un et
// n'applique pas `sloppy-imports` → il ne résout pas les imports sans extension
// (`@/…`, `./…`) du moteur partagé. On inline donc tout le moteur dans un seul
// fichier ; seul `@supabase/supabase-js` reste externe (résolu via jsr au
// runtime, cf. deno.json).
//
// La fonction fait tourner le MÊME moteur que les clients (`tickPhase`) avec la
// clé service-role → les phases avancent côté serveur, app fermée. FILET : le
// tickPhase client garde le timing précis ; le verrou `claim_phase_tick`
// garantit une exécution unique client↔serveur. Appeler avant l'heure est sans
// effet (phaseTickDue = false) → endpoint sûr même ouvert (--no-verify-jwt).
import { createClient } from "@supabase/supabase-js";
import { setSupabaseClient } from "@/integrations/supabase/client";
import { tickPhase } from "@/engine/actions";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Client service-role (RLS contournée) injecté dans le moteur partagé.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  setSupabaseClient(admin as never);

  const { data: games, error } = await admin.from("games").select("id").eq("status", "in_progress");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let ticked = 0;
  for (const g of (games ?? []) as Array<{ id: string }>) {
    try {
      // tickPhase gère lui-même : pause, phase non due, verrou, resolver.
      await tickPhase(g.id);
      ticked++;
    } catch (e) {
      console.error("[phase-ticker] tickPhase failed for", g.id, e);
    }
  }

  return new Response(JSON.stringify({ games: games?.length ?? 0, ticked }), {
    headers: { "content-type": "application/json" },
  });
});
