// Bandeau "🎯 Le tueur a ciblé : X" affiché en haut de l'écran pour tous les
// Méchants (Tueur + Acolytes) pendant la phase libre courante. Lit la
// dernière role_action du Tueur sur le tour courant.
import { useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow, PlayerRow } from "@/lib/game";

interface Props {
  game: GameRow;
  players: PlayerRow[];
}

export function KillerTargetBanner({ game, players }: Props) {
  const [targetPseudo, setTargetPseudo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Trouver le joueur Tueur
      const tueur = players.find((p) => p.role_slug === "tueur");
      if (!tueur) { if (!cancelled) setTargetPseudo(null); return; }
      const { data } = await supabase
        .from("role_actions")
        .select("target_player_id, payload, tour")
        .eq("game_id", game.id)
        .eq("actor_player_id", tueur.id)
        .eq("tour", game.current_tour)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { target_player_id: string | null; payload: Record<string, unknown> } | null;
      if (!row?.target_player_id) { setTargetPseudo(null); return; }
      const effect = (row.payload?.effect as string | undefined) ?? "";
      if (effect !== "kill") { setTargetPseudo(null); return; }
      const t = players.find((p) => p.id === row.target_player_id);
      setTargetPseudo(t?.pseudo ?? null);
    }
    void load();
    const ch = supabase.channel(`killer-target-${game.id}-${game.current_tour}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_actions", filter: `game_id=eq.${game.id}` }, () => void load())
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [game.id, game.current_tour, players]);

  if (!targetPseudo) return null;
  if (game.current_phase !== "free") return null;

  return (
    <div className="px-3 py-1.5 text-center text-xs bg-destructive/15 border-b border-destructive/40 text-destructive font-semibold tracking-wide inline-flex items-center justify-center gap-1.5 w-full">
      <Crosshair className="size-3.5 shrink-0" aria-hidden /> Le Tueur a ciblé : <span className="font-bold">{targetPseudo}</span>
    </div>
  );
}
