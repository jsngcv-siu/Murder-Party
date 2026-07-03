// V1 — Vote « grille de photos » (DA The Board) : cases polaroïd épinglées,
// l'accusé marqué d'une épingle + post-it rouge. Vote secret/anonyme.
import { useEffect, useState } from "react";
import type { FrameContext } from "../registry";
import { castVote, cancelVote } from "@/engine/actions";
import { supabase } from "@/integrations/supabase/client";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { AllyStamp } from "@/components/AllyStamp";
import { Lock } from "lucide-react";

export function V1Vote({ me, players, gameId, game, myRole, roles }: FrameContext) {
  const [target, setTarget] = useState<string | null>(null);
  // Le joueur Méchant (hors tueur solitaire) voit un tampon « ALLIÉ » sur les
  // photos de ses complices — pensé pour ressortir sur des fonds rouges.
  const viewerIsMechant = myRole?.faction === "Méchant";
  const isAlly = (pid: string, slug: string | null) =>
    viewerIsMechant && pid !== me.id && roles.get(slug ?? "")?.faction === "Méchant";
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [voterIds, setVoterIds] = useState<Set<string>>(new Set());
  const canVote = me.is_alive && !me.is_imprisoned;
  // Roster GELÉ à l'ouverture du vote. Sans ça, quand le timer tombe à 0,
  // `closeVote` emprisonne le plus voté et la propagation realtime de
  // `is_imprisoned` retire sa carte de la grille AVANT le changement de phase :
  // le verdict est alors spoilé (la case du plus voté disparaît sous les yeux du
  // joueur). On fige donc l'ensemble des joueurs affichés au montage — la carte
  // reste en place jusqu'à ce que l'écran de vote laisse place au résultat.
  const [rosterIds] = useState<Set<string>>(
    () => new Set(players.filter((p) => p.is_alive && !p.is_imprisoned && !p.is_mj && p.id !== me.id).map((p) => p.id)),
  );
  // Exclut le MJ (hors-partie) du panel de vote. On garde une carte tant que le
  // joueur est vivant, même s'il vient d'être emprisonné par le verdict.
  const aliveOthers = players.filter((p) => rosterIds.has(p.id) && p.is_alive && !p.is_mj);
  const aliveCount = players.filter((p) => p.is_alive && !p.is_imprisoned && !p.is_mj).length;

  useEffect(() => {
    let off = false;
    async function refresh() {
      const { data } = await supabase
        .from("votes")
        .select("voter_player_id, target_player_id")
        .eq("game_id", gameId)
        .eq("tour", game.current_tour);
      if (off) return;
      const rows = (data ?? []) as Array<{ voter_player_id: string; target_player_id: string }>;
      setVoterIds(new Set(rows.map((r) => r.voter_player_id)));
      const mine = rows.find((r) => r.voter_player_id === me.id);
      setVotedFor(mine?.target_player_id ?? null);
      if (mine) setTarget(mine.target_player_id);
    }
    void refresh();
    const ch = supabase
      .channel(`votes-${gameId}-${game.current_tour}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `game_id=eq.${gameId}` },
        () => void refresh()
      )
      .subscribe();
    return () => {
      off = true;
      void supabase.removeChannel(ch);
    };
  }, [gameId, me.id, game.current_tour]);

  async function submit() {
    if (!target) return;
    await castVote(gameId, me.id, target);
    setVotedFor(target);
  }
  async function abstain() {
    await cancelVote(gameId, me.id);
    setVotedFor(null);
    setTarget(null);
  }

  const progress = aliveCount > 0 ? Math.round((voterIds.size / aliveCount) * 100) : 0;

  if (!canVote) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background p-8 text-center">
        <Lock className="size-14 mx-auto mb-4 text-muted-foreground" aria-hidden />
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {me.is_alive ? "Tu es en prison" : "Tu n'es plus en vie"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {me.is_alive
            ? "Les prisonniers ne peuvent pas voter. Observe les autres joueurs depuis ta cellule."
            : "Tu ne peux plus voter, mais tu peux suivre les annonces et le conseil des morts."}
        </p>
        <div className="mt-6 text-[11px] text-muted-foreground font-mono bg-card/60 px-2 py-1 rounded-md border border-border">
          {voterIds.size}/{aliveCount} ont voté
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <div
            className="text-xs uppercase tracking-[0.14em] text-destructive font-semibold leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Vote ouvert · anonyme
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono bg-card/60 px-2 py-1 rounded-full border border-border">
          {voterIds.size}/{aliveCount} ont voté
        </div>
      </div>

      <div className="mt-4 mb-1">
        <h2 className="text-[28px] font-bold tracking-tight text-glow-gold leading-none" style={{ fontFamily: "var(--font-display)" }}>
          Qui emprisonner ?
        </h2>
        <p className="text-sm mt-1.5" style={{ fontFamily: "var(--font-hand)", fontSize: 17, color: "oklch(0.78 0.05 80)" }}>
          choisis qui part au trou — le vote est secret
        </p>
      </div>

      {/* Vote actuel */}
      {votedFor ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <span className="grid place-items-center size-5 rounded-full bg-gold text-primary-foreground text-[11px] font-bold">✓</span>
          <div className="text-sm">
            <span className="text-muted-foreground">Tu as voté pour</span>{" "}
            <span className="font-semibold text-foreground">
              {players.find((p) => p.id === votedFor)?.pseudo}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
          <span className="size-5 rounded-full border-2 border-muted-foreground/50" aria-hidden />
          <div className="text-sm text-muted-foreground">Tu n'as pas encore voté.</div>
        </div>
      )}

      {/* Grille de cases photo épinglées */}
      <div className="mt-4 flex-1 overflow-y-auto px-1 py-1">
        <div className="grid grid-cols-3 gap-3">
          {aliveOthers.map((p) => {
            const av = avatarOf((p.role_meta as Record<string, unknown>)?.avatar as string | undefined, p.id);
            const isSelected = target === p.id;
            const pinColor = isSelected ? "var(--primary)" : "oklch(0.80 0.15 78)";
            return (
              <button
                key={p.id}
                onClick={() => setTarget(p.id)}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="press relative touch-manipulation"
                aria-label={`Voter contre ${p.pseudo}`}
                aria-pressed={isSelected}
              >
                {/* Épingle */}
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 -top-1.5 z-10 size-3 rounded-full"
                  style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${pinColor} 70%, white), ${pinColor})`, boxShadow: "0 2px 3px oklch(0 0 0 / 0.5)" }}
                />
                {/* Case polaroïd */}
                <div
                  className="relative p-1.5 pb-2 transition-shadow"
                  style={{
                    background: "linear-gradient(180deg, oklch(0.95 0.02 90), oklch(0.90 0.03 82))",
                    boxShadow: isSelected
                      ? "0 0 0 2px var(--primary), 0 8px 18px -6px oklch(0.55 0.22 18 / 0.6)"
                      : "0 8px 16px -8px oklch(0 0 0 / 0.65)",
                  }}
                >
                  {/* Photo (carrée) + post-it « accusé » à cheval sur son bord bas */}
                  <div className="relative">
                    <div
                      className="relative aspect-square w-full overflow-hidden grid place-items-center"
                      style={{ background: "repeating-linear-gradient(45deg, oklch(0.72 0.04 240), oklch(0.72 0.04 240) 6px, oklch(0.78 0.04 240) 6px, oklch(0.78 0.04 240) 12px)" }}
                    >
                      <AvatarImg avatar={av} fill rounded="none" className="w-full h-full" />
                      {isAlly(p.id, p.role_slug) && <AllyStamp />}
                    </div>
                    {isSelected && (
                      <span
                        className="absolute left-1/2 bottom-0 z-30 px-2.5 py-0.5 leading-none whitespace-nowrap"
                        style={{
                          fontFamily: "var(--font-hand)",
                          fontWeight: 700,
                          fontSize: 13,
                          background: "var(--primary)",
                          color: "oklch(0.98 0.02 20)",
                          transform: "translate(-50%, 50%) rotate(-2deg)",
                          boxShadow: "0 4px 8px -3px oklch(0.55 0.22 18 / 0.6)",
                        }}
                      >
                        accusé
                      </span>
                    )}
                  </div>

                  {/* Nom manuscrit — abaissé, centré sous le post-it */}
                  <div
                    className="text-center mt-2.5 leading-none truncate px-1"
                    style={{ fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: 15, color: "oklch(0.28 0.03 45)" }}
                  >
                    {p.pseudo}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mt-4">
        <div
          className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span>Progression du vote</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-card overflow-hidden ring-1 ring-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-destructive/80 to-destructive transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={abstain}
          disabled={!votedFor}
          className="h-14 px-5 rounded-xl border border-border bg-card/50 text-sm font-medium text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-card/80 transition-colors"
        >
          S'abstenir
        </button>
        <button
          disabled={!target || target === votedFor}
          onClick={submit}
          className="flex-1 h-14 rounded-xl bg-gradient-to-r from-[oklch(0.58_0.22_22)] to-[oklch(0.50_0.22_22)] text-destructive-foreground font-bold text-sm uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-destructive/25 active:scale-[0.98] transition-transform"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {votedFor ? "Modifier mon vote" : "Valider mon vote"}
        </button>
      </div>
    </div>
  );
}
