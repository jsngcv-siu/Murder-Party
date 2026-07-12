import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuth, getStoredPseudo, setStoredPseudo } from "@/lib/session";
import { joinGame, type GameRow, type PlayerRow, MIN_PLAYERS, MAX_PLAYERS } from "@/lib/game";
import { startGame as engineStartGame, addBotPlayer, addBotPlayers } from "@/engine/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandHeader } from "@/components/BrandHeader";
import { toast } from "sonner";
import { Bot, BookOpen, Copy, Crown, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { avatarOf } from "@/lib/avatars";
import { AvatarPolaroid } from "@/components/AvatarPolaroid";
import { AvatarImg } from "@/components/AvatarImg";
import { AvatarPicker } from "@/components/frames/screens/AvatarPicker";
import { PlayerShell } from "@/components/PlayerShell";
import { PoolConfigurator } from "@/components/PoolConfigurator";
import { P11HelpMenu } from "@/components/frames/screens/P11HelpMenu";
import type { RoleRow } from "@/engine/actions";
import type { FrameContext } from "@/components/frames/registry";

export const Route = createFileRoute("/g/$code")({
  component: GamePage,
});

function GamePage() {
  const { code } = Route.useParams();
  const [game, setGame] = useState<GameRow | null>(null);
  const [me, setMe] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsPseudo, setNeedsPseudo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  // Debounce serial realtime player events into a single refetch to éviter
  // un re-render à chaque mutation (gros lag perceptible quand 8+ joueurs
  // bougent en même temps).
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refetchPlayers() {
      const gid = gameIdRef.current;
      if (!gid) return;
      const uid = userIdRef.current;
      const { data: ps } = await supabase
        .from("players")
        .select()
        .eq("game_id", gid)
        .order("joined_at", { ascending: true })
        // Départage déterministe : sans lui, deux joueurs au même `joined_at`
        // (bots créés en lot) sortent dans un ordre Postgres arbitraire, qui
        // varie d'un refetch à l'autre → les listes de joueurs « bougent ».
        .order("id", { ascending: true });
      if (cancelled) return;
      const list = (ps ?? []) as PlayerRow[];
      setPlayers(list);
      if (uid) {
        const meRow = list.find((p) => p.user_id === uid);
        if (meRow) setMe(meRow);
      }
    }

    function schedulePlayersRefetch() {
      if (refetchTimerRef.current) return; // déjà programmé
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null;
        void refetchPlayers();
      }, 120);
    }

    async function load() {
      const uid = await ensureAuth();
      if (cancelled) return;
      userIdRef.current = uid;
      setUserId(uid);

      // Lookup via la vue publique (anon-safe) pour récupérer l'id.
      const { data: pub } = await supabase
        .from("games_public" as never)
        .select("id")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (cancelled) return;
      const gameId = (pub as { id?: string } | null)?.id;
      if (!gameId) {
        toast.error("Partie introuvable.");
        setLoading(false);
        return;
      }

      const { data: g } = await supabase.from("games").select().eq("id", gameId).maybeSingle();
      if (cancelled) return;
      // Si pas accès direct (RLS), on bascule sur le flow rejoindre.
      if (!g) {
        gameIdRef.current = gameId;
        setNeedsPseudo(true);
        setLoading(false);
        return;
      }
      const game = g as GameRow;
      gameIdRef.current = game.id;
      setGame(game);
      // Mémorise le dernier code rejoint pour la reconnexion auto depuis l'accueil.
      try {
        if (game.status !== "ended") {
          window.localStorage.setItem(
            "mp_last_game",
            JSON.stringify({ code: code.toUpperCase(), ts: Date.now() }),
          );
        } else {
          window.localStorage.removeItem("mp_last_game");
        }
      } catch {
        /* localStorage indisponible (mode privé) — sans effet sur la partie */
      }

      const { data: ps } = await supabase
        .from("players")
        .select()
        .eq("game_id", game.id)
        .order("joined_at", { ascending: true })
        // Même départage déterministe que refetchPlayers (cf. plus bas).
        .order("id", { ascending: true });
      if (cancelled) return;
      const list = (ps ?? []) as PlayerRow[];
      setPlayers(list);
      const meRow = list.find((p) => p.user_id === uid);
      if (meRow) setMe(meRow);
      else setNeedsPseudo(true);
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`game-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        schedulePlayersRefetch();
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `code=eq.${code.toUpperCase()}`,
        },
        (payload) => setGame(payload.new as GameRow),
      )
      .subscribe();

    // ─── Resync au retour en avant-plan ───
    // En arrière-plan (onglet inactif, app minimisée, écran verrouillé), le
    // navigateur peut suspendre les WebSockets Supabase Realtime : on rate
    // alors des updates de game/players. On force un refetch dès que l'onglet
    // (ou l'app PWA) redevient visible.
    async function refetchGame() {
      const gid = gameIdRef.current;
      if (!gid) return;
      const { data: g } = await supabase.from("games").select().eq("id", gid).maybeSingle();
      if (!cancelled && g) setGame(g as GameRow);
    }
    function onVisible() {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      void refetchGame();
      void refetchPlayers();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
    }

    return () => {
      cancelled = true;
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      void supabase.removeChannel(channel);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onVisible);
      }
    };
    // Ne pas inclure userId : il est lu via ref, et l'inclure ré-abonnait
    // le channel et doublait tous les events (cause majeure de lag).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!game && !needsPseudo) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center gap-4">
        <h2 className="text-xl font-semibold">Partie introuvable</h2>
        <Link to="/" className="text-primary underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }
  if (needsPseudo)
    return (
      <JoinAsLatePlayer
        code={code}
        onJoined={(p) => {
          setMe(p);
          setNeedsPseudo(false);
        }}
      />
    );
  if (game!.status === "lobby")
    return <LobbyView game={game!} players={players} me={me!} userId={userId!} />;
  return <GameShell game={game!} me={me!} players={players} />;
}

// ─────────────── Late join ───────────────
function JoinAsLatePlayer({ code, onJoined }: { code: string; onJoined: (p: PlayerRow) => void }) {
  const [pseudo, setPseudo] = useState(getStoredPseudo());
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pseudo.trim()) return;
    setLoading(true);
    try {
      const { player } = await joinGame({ code, pseudo: pseudo.trim() });
      setStoredPseudo(pseudo.trim());
      onJoined(player);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-dvh flex flex-col">
      <BrandHeader subtitle={`Partie ${code.toUpperCase()}`} />
      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full">
        <Card className="bg-mystic ring-gold p-6 shadow-card">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pseudo">Choisis ton pseudo</Label>
              <Input
                id="pseudo"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value.slice(0, 10))}
                maxLength={10}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gold text-primary-foreground font-semibold"
            >
              {loading ? "…" : "Rejoindre"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}

// ─────────────── Lobby Sans MJ ───────────────
function LobbyView({
  game,
  players,
  me,
  userId,
}: {
  game: GameRow;
  players: PlayerRow[];
  me: PlayerRow;
  userId: string;
}) {
  const isHost = userId != null && game.mj_user_id === userId;
  const playerCount = game.mode_detective_player
    ? players.length
    : players.filter((p) => !p.is_mj).length;
  const poolCfg = game.pool_config as { targetPlayers?: number } | null;
  const target = poolCfg?.targetPlayers ?? 10;
  const canStart = isHost && playerCount === target;
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lobbyRoles, setLobbyRoles] = useState<Map<string, RoleRow>>(new Map());
  useEffect(() => {
    if (!helpOpen || lobbyRoles.size > 0) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("roles").select().eq("set_id", "set1");
      if (cancelled) return;
      const m = new Map<string, RoleRow>();
      for (const r of (data ?? []) as RoleRow[]) m.set(r.slug, r);
      setLobbyRoles(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [helpOpen, lobbyRoles.size]);
  const helpCtx = {
    game,
    me,
    myRole: null,
    players,
    roles: lobbyRoles,
    gameId: game.id,
  } as unknown as FrameContext;
  // Override optimiste : on affiche immédiatement le nouvel avatar sélectionné,
  // sans attendre l'aller-retour realtime (qui peut prendre ~1s).
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | undefined>();
  const myAvatar =
    optimisticAvatar ?? ((me.role_meta as Record<string, unknown>)?.avatar as string | undefined);

  function copyCode() {
    void navigator.clipboard.writeText(game.code);
    toast.success("Code copié");
  }

  async function transferHost(targetPlayer: PlayerRow) {
    if (!isHost) return;
    const role = game.mode_detective_player ? "lead" : "MJ";
    if (!confirm(`Transférer le ${role} à ${targetPlayer.pseudo} ?`)) return;
    if (!game.mode_detective_player) {
      await supabase.from("players").update({ is_mj: false }).eq("id", me.id);
      await supabase.from("players").update({ is_mj: true }).eq("id", targetPlayer.id);
    }
    await supabase
      .from("games")
      .update({
        mj_session_id: targetPlayer.session_id,
        mj_user_id: targetPlayer.user_id,
      } as never)
      .eq("id", game.id);
    toast.success(`${role} transféré à ${targetPlayer.pseudo}`);
  }

  async function pickAvatar(id: string) {
    const meta = { ...(me.role_meta as Record<string, unknown>), avatar: id };
    setOptimisticAvatar(id); // UI immédiate
    await supabase
      .from("players")
      .update({ role_meta: meta as never })
      .eq("id", me.id);
  }
  async function startGame() {
    setBusy(true);
    try {
      await engineStartGame(game.id);
      toast.success("Partie lancée — rôles distribués");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de lancement");
    } finally {
      setBusy(false);
    }
  }
  async function addBot() {
    setBusy(true);
    try {
      const p = await addBotPlayer(game.id);
      if (p) toast.success(`🤖 ${p.pseudo} ajouté`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }
  async function fillBots(count: number) {
    if (count <= 0) return;
    setBusy(true);
    try {
      const n = await addBotPlayers(game.id, count);
      if (n > 0) toast.success(n === 1 ? "🤖 Bot ajouté" : `🤖 ${n} bots ajoutés`);
      else toast.error("Impossible d'ajouter des bots");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }
  async function clearBots(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("players").delete().in("id", ids);
      if (error) toast.error("Impossible de retirer les bots.");
      else toast.success(ids.length === 1 ? "Bot retiré" : `${ids.length} bots retirés`);
    } finally {
      setBusy(false);
    }
  }
  async function removePlayer(player: PlayerRow) {
    if (!isHost) return;
    const action = player.pseudo.startsWith("Bot ") ? "supprimer" : "exclure";
    if (!confirm(`${action === "supprimer" ? "Supprimer" : "Exclure"} ${player.pseudo} ?`)) return;
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) toast.error("Impossible de supprimer le joueur.");
    else toast.success(`${player.pseudo} ${action === "supprimer" ? "supprimé" : "exclu"}`);
  }

  const visiblePlayers = players.filter((p) => game.mode_detective_player || !p.is_mj);
  const mjPlayer = !game.mode_detective_player ? players.find((p) => p.is_mj) : undefined;
  const progressPct = Math.min(100, Math.round((playerCount / target) * 100));
  // Nb de bots pour atteindre la cible d'un seul coup (borné par le max de joueurs).
  const fillCount = Math.max(0, Math.min(target, MAX_PLAYERS) - playerCount);
  const botIds = visiblePlayers.filter((p) => p.pseudo.startsWith("Bot ")).map((p) => p.id);
  // Emplacements « fantômes » à montrer jusqu'à la cible (max 8 pour rester compact).
  const ghostCount = Math.min(Math.max(0, target - playerCount), 8);

  return (
    <div className="min-h-dvh flex flex-col relative">
      <BrandHeader subtitle="Salon d'attente" />
      <button
        onClick={() => setHelpOpen(true)}
        className="press fixed top-3 right-3 z-30 h-11 w-11 rounded-full bg-card/90 border border-primary/40 backdrop-blur flex items-center justify-center text-primary shadow-glow"
        aria-label="Livre d'aide — rôles & règles"
        title="Livre d'aide — rôles & règles"
      >
        <BookOpen className="size-5" />
      </button>
      <main className="flex-1 px-5 pb-12 pt-2 max-w-md mx-auto w-full space-y-6">
        {/* ── Code de partie ─────────────────────────────────────── */}
        <Card className="relative overflow-hidden bg-mystic border-gold/30 elevate p-6 shadow-glow text-center">
          <div className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.16_75/0.18),transparent_60%)]" />
          <div className="relative space-y-3">
            <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              <span className="h-px w-8 bg-gold/40" />
              <span>Code de partie</span>
              <span className="h-px w-8 bg-gold/40" />
            </div>
            <button
              onClick={copyCode}
              className="block mx-auto text-5xl font-mono font-bold tracking-[0.45em] text-gold tap-target hover:scale-[1.02] active:scale-95 transition-transform"
              style={{ textShadow: "0 0 24px oklch(0.78 0.16 75 / 0.35)" }}
            >
              {game.code}
            </button>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                onClick={copyCode}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-gold gap-1.5 h-7"
              >
                <Copy className="size-3.5" /> Copier le code
              </Button>
              <span className="text-muted-foreground/40">·</span>
              <span className="px-2 py-0.5 rounded-full border border-gold/30 bg-gold/5 text-[10px] text-gold font-semibold uppercase tracking-[0.18em]">
                {game.mode_detective_player ? "🎲 Joueur Only" : "🎩 Mode MJ"}
              </span>
            </div>
          </div>
        </Card>

        {/* ── Avatar ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading>Ton avatar</SectionHeading>
          <Card className="p-4 bg-card/70 border-border/60 elevate backdrop-blur-sm">
            <AvatarPicker players={players} currentId={myAvatar} onPick={pickAvatar} />
          </Card>
        </section>

        {/* ── Joueurs ────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <SectionHeading icon={<Users className="size-3.5" />}>Joueurs</SectionHeading>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
              <span>
                <span className="text-foreground font-semibold">{playerCount}</span> / {target}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>min {MIN_PLAYERS}</span>
            </div>
          </div>

          {/* Jauge cible */}
          <div className="h-1 rounded-full bg-border/40 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${playerCount === target ? "bg-gold shadow-[0_0_12px_oklch(0.78_0.16_75/0.6)]" : "bg-gold/50"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <Card className="p-3 bg-card/70 border-border/60 elevate space-y-1.5">
            {mjPlayer &&
              (() => {
                const av = avatarOf(
                  (mjPlayer.role_meta as Record<string, unknown>)?.avatar as string | undefined,
                  mjPlayer.id,
                );
                return (
                  <div className="flex items-center justify-between rounded-lg bg-gold/10 border border-gold/40 px-3 py-2.5">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <AvatarImg
                        avatar={av}
                        size={40}
                        rounded="md"
                        className="shrink-0 ring-1 ring-border/50"
                      />
                      <span className="font-medium truncate">{mjPlayer.pseudo}</span>
                      {mjPlayer.user_id != null && mjPlayer.user_id === me.user_id && (
                        <span className="text-[9px] uppercase text-primary tracking-wider shrink-0">
                          (toi)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-gold text-[10px] font-bold uppercase tracking-[0.15em] shrink-0">
                      <Crown className="size-3" /> MJ
                    </span>
                  </div>
                );
              })()}

            {visiblePlayers.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground italic">
                Aucun joueur pour l'instant…
              </div>
            )}

            <ul className="space-y-1.5 stagger">
              {visiblePlayers.map((p) => {
                const avId =
                  p.id === me.id
                    ? myAvatar
                    : ((p.role_meta as Record<string, unknown>)?.avatar as string | undefined);
                const av = avatarOf(avId, p.id);
                const isPlayerHost = p.user_id != null && p.user_id === game.mj_user_id;
                const isBot = p.pseudo.startsWith("Bot ");
                const isMe = p.user_id != null && p.user_id === me.user_id;
                return (
                  <li
                    key={p.id}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                      isMe
                        ? "bg-gold/5 border border-gold/30"
                        : "bg-secondary/30 border border-transparent hover:bg-secondary/50"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <AvatarImg
                        avatar={av}
                        size={40}
                        rounded="md"
                        className="shrink-0 ring-1 ring-border/50"
                      />
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium truncate">{p.pseudo}</span>
                        {isMe && (
                          <span className="text-[9px] uppercase tracking-wider text-gold shrink-0">
                            toi
                          </span>
                        )}
                        {isBot && (
                          <span className="text-[10px] shrink-0" title="Bot">
                            🤖
                          </span>
                        )}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPlayerHost && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary"
                          title="Lead : pilote le lancement"
                        >
                          <Crown className="size-3" /> Lead
                        </span>
                      )}
                      {isHost && !isPlayerHost && !isBot && (
                        <button
                          onClick={() => transferHost(p)}
                          className="text-[10px] uppercase tracking-wider text-gold hover:text-primary-foreground border border-gold/40 hover:bg-gold rounded-md px-1.5 py-1 transition flex items-center gap-1"
                          title={`Transférer le lead à ${p.pseudo}`}
                        >
                          <Crown className="size-3" />
                        </button>
                      )}
                      {isHost && isBot && (
                        <button
                          onClick={() => removePlayer(p)}
                          className="text-[10px] text-destructive hover:text-white border border-destructive/40 hover:bg-destructive rounded-md px-1.5 py-1 transition flex items-center gap-1"
                          title={`Supprimer ${p.pseudo}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                      {isHost && !isPlayerHost && !isBot && !isMe && (
                        <button
                          onClick={() => removePlayer(p)}
                          className="text-[10px] text-destructive hover:text-white border border-destructive/40 hover:bg-destructive rounded-md px-1.5 py-1 transition flex items-center gap-1"
                          title={`Exclure ${p.pseudo}`}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {isHost && (
              <div className="mt-1.5 space-y-2">
                {/* Emplacements libres jusqu'à la cible — touche pour ajouter un bot */}
                {ghostCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: ghostCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={addBot}
                        disabled={busy}
                        title="Emplacement libre — ajouter un bot"
                        className="press size-10 rounded-md border border-dashed border-border/60 text-muted-foreground/50 grid place-items-center hover:border-gold/50 hover:text-gold transition disabled:opacity-40"
                      >
                        <Plus className="size-4" />
                      </button>
                    ))}
                    {target - playerCount > ghostCount && (
                      <span className="size-10 grid place-items-center text-[10px] text-muted-foreground/60 tabular-nums">
                        +{target - playerCount - ghostCount}
                      </span>
                    )}
                  </div>
                )}
                {/* Actions bots */}
                <div className="flex items-center gap-1.5">
                  {playerCount < MAX_PLAYERS && (
                    <Button
                      onClick={addBot}
                      disabled={busy}
                      variant="outline"
                      size="sm"
                      className="press flex-1 border-dashed border-border/70 hover:border-gold/60 hover:text-gold gap-1.5"
                    >
                      <Bot className="size-3.5" /> Ajouter un bot
                    </Button>
                  )}
                  {playerCount < MAX_PLAYERS && fillCount > 1 && (
                    <Button
                      onClick={() => fillBots(fillCount)}
                      disabled={busy}
                      variant="outline"
                      size="sm"
                      className="press shrink-0 border-dashed border-gold/50 text-gold hover:bg-gold/10 gap-1.5 whitespace-nowrap"
                      title={`Ajouter ${fillCount} bots pour atteindre la cible (${target})`}
                    >
                      <Bot className="size-3.5" /> Compléter +{fillCount}
                    </Button>
                  )}
                  {botIds.length > 0 && (
                    <Button
                      onClick={() => clearBots(botIds)}
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      className="press shrink-0 text-destructive hover:bg-destructive/10 gap-1.5 whitespace-nowrap"
                      title="Retirer tous les bots"
                    >
                      <Trash2 className="size-3.5" /> Vider ({botIds.length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* ── Durées des phases ──────────────────────────────────── */}
        <section className="space-y-3">
          <SectionHeading>Durées des phases</SectionHeading>
          <Card className="p-4 bg-card/70 border-border/60 elevate space-y-2.5">
            <PhaseDurationRow
              label="Enquête"
              value={game.phase_duration_free_s ?? 30}
              onChange={(v) => updatePhaseDur(game.id, { free: v })}
              editable={isHost}
            />
            <PhaseDurationRow
              label="Débat"
              value={game.phase_duration_gathering_s ?? 30}
              onChange={(v) => updatePhaseDur(game.id, { gathering: v })}
              editable={isHost}
            />
            <PhaseDurationRow
              label="Vote"
              value={game.phase_duration_vote_s ?? 30}
              onChange={(v) => updatePhaseDur(game.id, { vote: v })}
              editable={isHost}
              min={25}
            />
          </Card>
        </section>

        {isHost && <PoolConfigurator game={game} />}

        {isHost && (
          <section className="space-y-3">
            <SectionHeading>Variantes</SectionHeading>
            <Card className="p-4 bg-card/70 border-border/60 elevate">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={game.variant === "suspicion"}
                  onChange={async (e) => {
                    const next = e.target.checked ? "suspicion" : null;
                    await supabase
                      .from("games")
                      .update({ variant: next } as never)
                      .eq("id", game.id);
                  }}
                  className="mt-1 size-4 accent-gold shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Variante Suspicion</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Pas de vote manuel : à la phase de vote, le joueur le plus marqué « Suspect »
                    dans les tableaux de suspicions des joueurs vivants ou en prison est éliminé. En
                    cas d'égalité, personne n'est éliminé.
                  </div>
                </div>
              </label>
            </Card>
          </section>
        )}

        {/* ── Bouton lancer (sticky) ─────────────────────────────── */}
        <div className="sticky bottom-3 z-10 pt-2">
          {isHost ? (
            <Button
              onClick={startGame}
              disabled={!canStart || busy}
              className={`press w-full h-14 bg-gold text-primary-foreground text-base font-semibold shadow-glow disabled:opacity-40 disabled:shadow-none border border-gold/30 backdrop-blur ${canStart && !busy ? "sheen" : ""}`}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Lancement…
                </>
              ) : playerCount < target ? (
                `Encore ${target - playerCount} joueur(s) — cible ${target}`
              ) : playerCount > target ? (
                `Trop de joueurs (${playerCount}/${target})`
              ) : (
                <>
                  Lancer la partie · {playerCount}/{target}
                </>
              )}
            </Button>
          ) : (
            <div className="rounded-lg border border-border/60 bg-card/80 backdrop-blur px-4 py-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-gold" />
              En attente du lead pour lancer…
            </div>
          )}
        </div>
      </main>
      {helpOpen && (
        <P11HelpMenu
          ctx={helpCtx}
          onClose={() => setHelpOpen(false)}
          title="📖 Livre d'aide"
          allowedTabs={["howto", "roles"]}
        />
      )}
    </div>
  );
}

function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {icon && <span className="text-gold">{icon}</span>}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {children}
      </h2>
      <span className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
    </div>
  );
}

async function updatePhaseDur(
  gameId: string,
  patch: { free?: number; gathering?: number; vote?: number },
) {
  const upd: {
    phase_duration_free_s?: number;
    phase_duration_gathering_s?: number;
    phase_duration_vote_s?: number;
  } = {};
  if (patch.free !== undefined) upd.phase_duration_free_s = patch.free;
  if (patch.gathering !== undefined) upd.phase_duration_gathering_s = patch.gathering;
  if (patch.vote !== undefined) upd.phase_duration_vote_s = patch.vote;
  const { error } = await supabase
    .from("games")
    .update(upd as never)
    .eq("id", gameId);
  if (error) toast.error("Impossible de mettre à jour la durée.");
}

function PhaseDurationRow({
  label,
  value,
  onChange,
  editable,
  min = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  editable: boolean;
  min?: number;
}) {
  // État local pour éviter de poster en DB à chaque keystroke / saut de re-render via realtime.
  // Le push DB est debouncé (300ms) ; en attendant la valeur reste fluide localement.
  const [local, setLocal] = useState<number>(value);
  const editingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync depuis le serveur SEULEMENT quand on n'est pas en train d'éditer.
  useEffect(() => {
    if (!editingRef.current) setLocal(value);
  }, [value]);

  function flush(v: number) {
    const clamped = Math.max(min, Math.min(1800, v));
    setLocal(clamped);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      editingRef.current = false;
      onChange(clamped);
    }, 300);
    editingRef.current = true;
  }

  const minutes = Math.floor(local / 60);
  const seconds = local % 60;

  // Strings éditables pour éviter que le "0" ne bloque la saisie dans <input type="number">
  const [minStr, setMinStr] = useState(String(minutes));
  const [secStr, setSecStr] = useState(String(seconds));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setMinStr(String(Math.floor(local / 60)));
      setSecStr(String(local % 60));
    }
  }, [local]);

  function parseNum(s: string) {
    const n = parseInt(s.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
  }

  if (!editable) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/90">{label}</span>
        <span className="text-sm font-mono text-muted-foreground">
          {minutes} min {seconds} s
        </span>
      </div>
    );
  }

  // Pas à pas : 15 s pour rester fluide au pouce ; long-press géré nativement par les clics répétés.
  function step(delta: number) {
    const next = Math.max(min, Math.min(1800, local + delta));
    flush(next);
    setMinStr(String(Math.floor(next / 60)));
    setSecStr(String(next % 60));
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground/90 flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-15)}
          disabled={local <= min}
          className="h-9 w-9 rounded-lg bg-card border border-border text-base font-bold disabled:opacity-30 active:scale-95 transition touch-manipulation"
          aria-label="Diminuer de 15 secondes"
        >
          −
        </button>
        <Input
          type="text"
          inputMode="numeric"
          value={minStr}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
            setMinStr(raw);
            const m = parseNum(raw);
            const s = parseNum(secStr) % 60;
            flush(m * 60 + s);
          }}
          onFocus={() => {
            focusedRef.current = true;
            editingRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            editingRef.current = false;
            const m = parseNum(minStr);
            const s = parseNum(secStr) % 60;
            setMinStr(String(m));
            flush(m * 60 + s);
          }}
          className="w-12 h-9 text-center bg-input/50"
        />
        <span className="text-[11px] text-muted-foreground">m</span>
        <Input
          type="text"
          inputMode="numeric"
          value={secStr}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
            setSecStr(raw);
            const m = parseNum(minStr);
            const s = parseNum(raw) % 60;
            flush(m * 60 + s);
          }}
          onFocus={() => {
            focusedRef.current = true;
            editingRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            editingRef.current = false;
            const m = parseNum(minStr);
            const s = parseNum(secStr) % 60;
            setSecStr(String(s));
            flush(m * 60 + s);
          }}
          className="w-12 h-9 text-center bg-input/50"
        />
        <span className="text-[11px] text-muted-foreground">s</span>
        <button
          type="button"
          onClick={() => step(15)}
          disabled={local >= 1800}
          className="h-9 w-9 rounded-lg bg-card border border-border text-base font-bold disabled:opacity-30 active:scale-95 transition touch-manipulation"
          aria-label="Augmenter de 15 secondes"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─────────────── Game shell — délégué à PlayerShell ───────────────
function GameShell({ game, me, players }: { game: GameRow; me: PlayerRow; players: PlayerRow[] }) {
  return <PlayerShell game={game} me={me} players={players} />;
}
