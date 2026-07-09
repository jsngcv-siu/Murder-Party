// Offset entre l'horloge locale et l'horloge serveur Supabase (en ms).
// Permet de synchroniser les timers de phase entre plusieurs appareils dont
// les horloges système peuvent dériver de plusieurs secondes.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedOffset: number | null = null;
let inflight: Promise<number> | null = null;

async function fetchOffset(): Promise<number> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const t0 = Date.now();
      // RPC non typée — la fonction `server_now_ms` est créée côté DB.
      const { data, error } = await supabase.rpc("server_now_ms" as never);
      const t1 = Date.now();
      if (error || data == null) throw error ?? new Error("no data");
      const serverMs = Number(data);
      // Compense la latence aller en supposant ~moitié du round-trip.
      const rtt = t1 - t0;
      const offset = serverMs + Math.floor(rtt / 2) - t1;
      cachedOffset = offset;
      return offset;
    } catch {
      cachedOffset = 0;
      return 0;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Maintenant côté serveur, en ms epoch. */
export function serverNow(): number {
  return Date.now() + (cachedOffset ?? 0);
}

/** Maintenant côté serveur, en ISO — à utiliser pour ÉCRIRE tout timestamp de
 *  phase (phase_started_at). Garantit que l'écriture et la lecture des timers
 *  partagent la MÊME horloge (serveur), même si l'horloge du téléphone dérive. */
export function serverNowISO(): string {
  return new Date(serverNow()).toISOString();
}

// Pré-charge l'offset dès le chargement du module (client uniquement) : le moteur
// (tickPhase, setPhase…) peut ainsi lire/écrire en heure serveur sans attendre
// qu'un composant monte le hook. Sur le serveur (SSR) on garde l'horloge locale.
if (typeof window !== "undefined") void fetchOffset();

/** Hook React : déclenche un fetch au mount, retourne l'offset connu. */
export function useServerTimeOffset(): number {
  const [offset, setOffset] = useState<number>(cachedOffset ?? 0);
  useEffect(() => {
    let off = false;
    void fetchOffset().then((o) => {
      if (!off) setOffset(o);
    });
    // Re-sync toutes les 5 minutes pour éviter la dérive longue.
    const id = setInterval(
      () => {
        void fetchOffset().then((o) => {
          if (!off) setOffset(o);
        });
      },
      5 * 60 * 1000,
    );
    return () => {
      off = true;
      clearInterval(id);
    };
  }, []);
  return offset;
}
