// Élection du « pilote » de partie via Supabase Realtime Presence.
//
// Problème résolu : l'avancement des phases (tickPhase) et les bots ne doivent
// être pilotés que par UN seul client à la fois (sinon courses sur le resolver /
// le dépouillement). Historiquement c'était l'host — donc si l'host se
// déconnectait, la partie se figeait pour tout le monde, et le rythme dépendait
// d'un téléphone précis.
//
// Ici, tous les clients présents rejoignent un canal Presence par partie. Le
// pilote est élu de façon DÉTERMINISTE : le client présent au plus petit id.
// Tous les clients calculent la même élection → un seul se croit pilote. Si le
// pilote part, la Presence se met à jour partout et le suivant (nouveau plus
// petit id présent) reprend AUTOMATIQUEMENT, sans rien écrire ni déranger les
// autres. Aucune dépendance à un appareil particulier.
//
// ⚠️ Piège « pilote figé » (corrigé V0.211) : un client en arrière-plan (onglet
// inactif, appli minimisée, téléphone verrouillé) reste PRÉSENT dans Presence —
// mais ses timers JS sont suspendus par le navigateur. S'il a le plus petit id,
// il « gagne » l'élection et n'exécute pourtant RIEN : les bots ne jouent plus,
// personne ne vote, le tueur ne frappe pas, alors que les phases (arbitrées côté
// serveur) continuent d'avancer. Correctif : chaque client émet un BATTEMENT DE
// CŒUR (re-track périodique) et l'élection n'admet que les clients dont le
// battement est RÉCENT. Un client endormi ne bat plus → il est écarté → le plus
// petit id ENCORE VIVANT reprend la main. Les battements sont horodatés sur
// l'horloge serveur (serverNow) pour rester comparables malgré le décalage
// d'horloge entre appareils.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { serverNow } from "@/lib/serverClock";

// Cadence du battement de cœur et seuil de péremption. Un client qui n'a pas
// battu depuis STALE_MS est réputé endormi (≈ 2-3 battements manqués) et exclu
// de l'élection. HEARTBEAT_MS ≪ STALE_MS pour tolérer un battement raté isolé.
// 5 s / 13 s (au lieu de 3 s / 8 s) : la présence est le flux realtime le plus
// bavard (chaque client diffuse à tous les autres, ~N²). Rallonger de 2 s ne
// coûte que ~2 s de détection de bascule de pilote — invisible, car les phases
// sont arbitrées côté serveur par le ticker en parallèle.
const HEARTBEAT_MS = 5000;
const STALE_MS = 13000;

type PresenceMeta = { id?: string; at?: number };

/**
 * Retourne `true` si CE client est le pilote élu de la partie.
 * @param gameId  Partie concernée (null → désactivé).
 * @param selfId  Identifiant stable de ce client (id du joueur).
 * @param enabled Coupe l'élection (ex. démo qui a son propre pilote).
 */
export function usePhaseDriver(
  gameId: string | null | undefined,
  selfId: string | null | undefined,
  enabled = true,
): boolean {
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    if (!enabled || !gameId || !selfId) {
      setIsDriver(false);
      return;
    }

    const channel = supabase.channel(`drive:${gameId}`, {
      config: { presence: { key: selfId } },
    });

    const recompute = () => {
      const state = channel.presenceState() as Record<string, PresenceMeta[]>;
      const now = serverNow();
      // Ne retenir que les clients au battement RÉCENT (donc réellement actifs).
      // On s'inclut toujours : on vient de battre, on se sait vivant — ça garantit
      // au moins un candidat même pendant la fenêtre de bascule.
      const liveIds = Object.entries(state)
        .filter(([id, metas]) => {
          if (id === selfId) return true;
          const lastAt = metas.reduce(
            (m, meta) => Math.max(m, typeof meta?.at === "number" ? meta.at : 0),
            0,
          );
          return now - lastAt < STALE_MS;
        })
        .map(([id]) => id);
      if (liveIds.length === 0) {
        setIsDriver(false);
        return;
      }
      // Élection déterministe : plus petit id VIVANT (ordre lexicographique stable
      // sur des UUID). Tous les clients actifs aboutissent au même gagnant.
      const elected = liveIds.reduce((min, id) => (id < min ? id : min));
      setIsDriver(elected === selfId);
    };

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ id: selfId, at: serverNow() });
          // Battement de cœur : re-track régulier pour prouver qu'on est éveillé,
          // suivi d'un recompute (un pilote endormi n'émet PAS d'événement
          // « leave » — il faut ré-évaluer la fraîcheur périodiquement pour
          // reprendre la main). Un client en arrière-plan voit ce timer suspendu :
          // il cesse de battre et se fait donc écarter par les clients éveillés.
          heartbeat = setInterval(() => {
            void channel.track({ id: selfId, at: serverNow() });
            recompute();
          }, HEARTBEAT_MS);
        }
      });

    return () => {
      setIsDriver(false);
      if (heartbeat) clearInterval(heartbeat);
      void supabase.removeChannel(channel);
    };
  }, [gameId, selfId, enabled]);

  return isDriver;
}
