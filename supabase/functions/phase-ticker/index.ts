// Edge Function `phase-ticker` — avancement des phases CÔTÉ SERVEUR.
//
// Déclenchée toutes les ~5 s par pg_cron (voir le guide de déploiement). Fait
// tourner le MÊME moteur que les clients (`tickPhase`), mais avec la clé
// service-role, indépendamment de tout téléphone ouvert → les phases avancent
// même app fermée / téléphone en veille. C'est un FILET : le `tickPhase` client
// garde le timing précis (bascule pile à 0:00) ; le verrou serveur
// `claim_phase_tick` garantit qu'un seul (client OU serveur) exécute la
// transition. Appeler la fonction avant l'heure est sans effet (phaseTickDue
// renvoie false), donc l'endpoint est sûr même ouvert (--no-verify-jwt).
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

  const { data: games, error } = await admin
    .from("games")
    .select("id")
    .eq("status", "in_progress");
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
