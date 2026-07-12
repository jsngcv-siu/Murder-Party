// Offset entre l'horloge locale et l'horloge serveur Supabase (en ms).
// Permet de synchroniser les timers de phase entre plusieurs appareils dont
// les horloges système peuvent dériver de plusieurs secondes.
//
// Robustesse (socle "A") : au lieu d'un seul aller-retour (sensible au jitter
// réseau), on prend PLUSIEURS échantillons et on garde celui dont le round-trip
// est le plus court — c'est l'estimation la moins bruitée (l'aller ≈ le retour).
// On re-synchronise aussi au RÉVEIL de l'appli (retour d'onglet / de veille /
// de réseau), pas seulement toutes les 5 minutes : un téléphone qui dort peut
// voir son horloge sauter, et on veut qu'il se recale AVANT de réafficher un
// timer faux.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedOffset: number | null = null;
let inflight: Promise<number> | null = null;

/** Un aller-retour : renvoie {offset, rtt} ou null si échec. */
async function pingOnce(): Promise<{ offset: number; rtt: number } | null> {
  try {
    const t0 = Date.now();
    // RPC non typée — la fonction `server_now_ms` est créée côté DB.
    const { data, error } = await supabase.rpc("server_now_ms" as never);
    const t1 = Date.now();
    if (error || data == null) return null;
    const serverMs = Number(data);
    const rtt = t1 - t0;
    // Compense la latence aller en supposant ~moitié du round-trip.
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
  if (results.length === 0) {
    // Réseau injoignable : on garde l'offset connu s'il existe, sinon 0.
    return cachedOffset ?? 0;
  }
  // Garde l'échantillon au round-trip le plus court : c'est celui où
  // l'hypothèse "aller = retour" est la plus fiable (moins de jitter).
  results.sort((a, b) => a.rtt - b.rtt);
  const best = results[0].offset;
  cachedOffset = best;
  return best;
}

async function fetchOffset(): Promise<number> {
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

/** Hook React : déclenche un fetch au mount, retourne l'offset connu. Re-sync
 *  périodiquement ET au réveil de l'appli pour éviter d'afficher un timer faux
 *  juste après un retour de veille. */
export function useServerTimeOffset(): number {
  const [offset, setOffset] = useState<number>(cachedOffset ?? 0);
  useEffect(() => {
    let off = false;
    const resync = () => {
      void fetchOffset().then((o) => {
        if (!off) setOffset(o);
      });
    };
    resync();
    // Re-sync toutes les 5 minutes pour éviter la dérive longue.
    const id = setInterval(resync, 5 * 60 * 1000);
    // Re-sync au réveil : retour d'onglet, focus fenêtre, retour réseau.
    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", resync);
      window.addEventListener("online", resync);
    }
    return () => {
      off = true;
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", resync);
        window.removeEventListener("online", resync);
      }
    };
  }, []);
  return offset;
}
