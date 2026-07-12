// Hook React d'offset horloge serveur. La logique PURE (serverNow, serverNowISO,
// mesure d'offset) vit dans `serverClock.ts` — sans React — pour que le moteur
// (tickPhase…) soit réutilisable côté serveur (Edge Function Deno) sans embarquer
// React. On ré-exporte serverNow/serverNowISO ici pour ne casser aucun import
// existant : `import { serverNow, useServerTimeOffset } from "@/lib/serverTime"`.
import { useEffect, useState } from "react";
import { fetchOffset, getCachedOffset } from "@/lib/serverClock";

export { serverNow, serverNowISO } from "@/lib/serverClock";

/** Hook React : déclenche un fetch au mount, retourne l'offset connu. Re-sync
 *  périodiquement ET au réveil de l'appli pour éviter d'afficher un timer faux
 *  juste après un retour de veille. */
export function useServerTimeOffset(): number {
  const [offset, setOffset] = useState<number>(getCachedOffset());
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
