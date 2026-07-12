// Horloge serveur — logique PURE, SANS React. Utilisable à la fois côté
// navigateur ET côté serveur (Edge Function Deno) : le moteur (tickPhase…) ne
// doit embarquer aucune dépendance navigateur. Le hook React `useServerTimeOffset`
// vit à côté dans `serverTime.ts` (qui ré-exporte serverNow/serverNowISO).
//
// Offset entre l'horloge locale et l'horloge serveur Supabase (ms), estimé sur
// plusieurs pings en gardant le round-trip le plus court (le moins bruité).
import { supabase } from "@/integrations/supabase/client";

let cachedOffset: number | null = null;
let inflight: Promise<number> | null = null;

/** Un aller-retour : renvoie {offset, rtt} ou null si échec. */
async function pingOnce(): Promise<{ offset: number; rtt: number } | null> {
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc("server_now_ms" as never);
    const t1 = Date.now();
    if (error || data == null) return null;
    const serverMs = Number(data);
    const rtt = t1 - t0;
    const offset = serverMs + Math.floor(rtt / 2) - t1;
    return { offset, rtt };
  } catch {
    return null;
  }
}

async function measureOffset(samples = 5): Promise<number> {
  const results: { offset: number; rtt: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const r = await pingOnce();
    if (r) results.push(r);
  }
  if (results.length === 0) return cachedOffset ?? 0;
  results.sort((a, b) => a.rtt - b.rtt);
  const best = results[0].offset;
  cachedOffset = best;
  return best;
}

export async function fetchOffset(): Promise<number> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      return await measureOffset();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Offset connu (0 tant qu'aucun ping n'a abouti). */
export function getCachedOffset(): number {
  return cachedOffset ?? 0;
}

/** Maintenant côté serveur, en ms epoch. */
export function serverNow(): number {
  return Date.now() + (cachedOffset ?? 0);
}

/** Maintenant côté serveur, en ISO — à utiliser pour ÉCRIRE tout timestamp de
 *  phase (phase_started_at). Garantit que l'écriture et la lecture des timers
 *  partagent la MÊME horloge (serveur), même si l'horloge locale dérive. */
export function serverNowISO(): string {
  return new Date(serverNow()).toISOString();
}

// Pré-charge l'offset dès le chargement du module (navigateur uniquement). Côté
// serveur (Deno / SSR) : pas de window → serverNow() = Date.now() (l'Edge Function
// tourne déjà sur l'infra Supabase, horloge ~alignée avec la base).
if (typeof window !== "undefined") void fetchOffset();
