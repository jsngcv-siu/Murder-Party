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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const state = channel.presenceState() as Record<string, unknown[]>;
      const presentIds = Object.keys(state);
      if (presentIds.length === 0) {
        setIsDriver(false);
        return;
      }
      // Élection déterministe : plus petit id présent (ordre lexicographique
      // stable sur des UUID). Tous les clients aboutissent au même gagnant.
      const elected = presentIds.reduce((min, id) => (id < min ? id : min));
      setIsDriver(elected === selfId);
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ id: selfId, at: Date.now() });
        }
      });

    return () => {
      setIsDriver(false);
      void supabase.removeChannel(channel);
    };
  }, [gameId, selfId, enabled]);

  return isDriver;
}
