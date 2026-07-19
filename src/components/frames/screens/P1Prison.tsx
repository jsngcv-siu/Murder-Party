import type { FrameContext } from "../registry";
import { RoleIcon } from "@/components/RoleIcon";
import { ChatPanel } from "@/components/ChatPanel";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { Bird, Eye, KeyRound, Lock, MessageSquare, Vote, Zap, type LucideIcon } from "lucide-react";

// Marqueur de l'état, posé par le PlayerShell (cf. lib/statePalette) : l'orange
// du tampon « PRISON ». Repli pour les contextes hors shell (galerie /dev).
//
// Cet écran peignait auparavant TOUTE sa propre DA en orange chaud (fond dégradé,
// titres, cartes) et dessinait ses propres barreaux en `repeating-linear-gradient`.
// Hérité d'avant la colorimétrie d'état, ça entrait en conflit avec la cellule
// froide du shell — et doublonnait la vraie texture de barreaux. Il ne porte plus
// que le marqueur ; le monde autour vient du shell.
const STAMP = "var(--state-accent, oklch(0.77 0.15 62))";
const SURFACE = "color-mix(in oklab, var(--card) 78%, transparent)";
const EDGE = "color-mix(in oklab, var(--border) 85%, transparent)";

export function P1Prison({ me, myRole, players, gameId, game }: FrameContext) {
  const isMe = me.is_imprisoned;
  const otherPrisoners = players.filter((p) => p.is_imprisoned && p.id !== me.id);
  // Parloir : ouvert par le Geôlier pour CE tour → chat privé dans la cellule.
  const parloirOpen =
    ((me.role_meta as Record<string, unknown> | null)?.parloir_open_cycle as number | undefined) ===
    game.current_tour;

  // ─── Vue : non emprisonné ───
  if (!isMe) {
    return (
      <div className="h-full flex flex-col bg-background p-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="size-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.30 0.10 55), oklch(0.22 0.06 50))",
              boxShadow:
                "0 0 0 1px oklch(0.55 0.20 55 / 0.4), 0 8px 24px -8px oklch(0.55 0.20 55 / 0.4)",
            }}
          >
            <Lock className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[oklch(0.72_0.18_55)]">
              Cellule
            </div>
            <h2
              className="text-xl font-bold leading-tight truncate"
              style={{ fontFamily: "var(--font-display)", color: "oklch(0.92 0.04 80)" }}
            >
              Prison du village
            </h2>
          </div>
        </div>

        {/* Status libre */}
        <div
          className="rounded-2xl p-4 border flex items-center gap-3"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.20 0.06 145 / 0.35), oklch(0.18 0.03 35 / 0.5))",
            borderColor: "oklch(0.55 0.15 145 / 0.35)",
          }}
        >
          <Bird className="size-6 shrink-0" aria-hidden />
          <div>
            <div className="text-sm font-semibold" style={{ color: "oklch(0.92 0.10 145)" }}>
              Tu es libre
            </div>
            <div className="text-xs text-muted-foreground">
              Tu peux voter et utiliser ta capacité normalement.
            </div>
          </div>
        </div>

        {/* Liste prisonniers */}
        {otherPrisoners.length > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                Prisonniers
              </div>
              <div
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: "oklch(0.55 0.20 55 / 0.18)",
                  color: "oklch(0.85 0.18 60)",
                }}
              >
                {otherPrisoners.length}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 stagger">
              {otherPrisoners.map((p) => {
                const av = avatarOf(
                  ((p.role_meta ?? {}) as Record<string, unknown>).avatar as string | undefined,
                  p.id,
                );
                return (
                  <div
                    key={p.id}
                    className="elevate rounded-xl p-3 border flex items-center gap-2.5"
                    style={{
                      background: "oklch(0.20 0.05 50 / 0.4)",
                      borderColor: "oklch(0.45 0.15 55 / 0.3)",
                    }}
                  >
                    <div
                      className="size-9 rounded-none flex items-center justify-center overflow-hidden shrink-0"
                      style={{ background: "oklch(0.16 0.04 50 / 0.7)" }}
                    >
                      <AvatarImg avatar={av} size={36} rounded="none" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: "oklch(0.92 0.06 60)" }}
                      >
                        {p.pseudo}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Lock className="size-3" aria-hidden /> En cellule
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center text-xs text-muted-foreground py-6 rounded-xl border border-dashed border-border">
            Aucun prisonnier pour le moment.
          </div>
        )}
      </div>
    );
  }

  // ─── Vue : emprisonné ───
  const myAv = avatarOf(
    ((me.role_meta ?? {}) as Record<string, unknown>).avatar as string | undefined,
    me.id,
  );

  return (
    // Aucun fond propre : la cellule (pierre froide + texture de barreaux) est
    // déjà peinte par le shell, exactement comme sous le voile « Maintiens pour
    // révéler ». Cet écran ne pose que son contenu par-dessus.
    <div className="h-full flex flex-col overflow-y-auto relative">
      <div className="relative z-10 p-5 space-y-5">
        {/* Hero cellule */}
        <div className="text-center pt-2">
          <div
            className="text-[10px] uppercase tracking-[0.3em] font-semibold inline-flex items-center justify-center gap-1"
            style={{ color: STAMP }}
          >
            <Lock className="size-3" aria-hidden /> Cellule
          </div>
          <h2
            className="text-3xl font-bold mt-2"
            style={{
              color: STAMP,
              fontFamily: "var(--font-display)",
              textShadow: `0 0 28px color-mix(in oklab, ${STAMP} 45%, transparent)`,
            }}
          >
            Tu es en prison
          </h2>
          <p className="mt-2 text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
            Tu observes les débats et chats publics mais tu ne peux ni voter ni utiliser ta
            capacité.
          </p>
        </div>

        {/* Restrictions visuelles */}
        <div className="grid grid-cols-3 gap-2 stagger">
          {(
            [
              { Icon: Vote, label: "Vote", off: true },
              { Icon: Zap, label: "Capacité", off: true },
              { Icon: Eye, label: "Observer", off: false },
            ] as Array<{ Icon: LucideIcon; label: string; off: boolean }>
          ).map((r) => (
            // Bloqué / autorisé restent ROUGE et VERT : c'est une lecture
            // sémantique (`--destructive` / `--success`), pas la teinte du lieu.
            // Elle ne doit donc pas suivre l'état — et elle apporte au passage la
            // variété de couleur qui manquerait sur un écran monochrome.
            <div
              key={r.label}
              className="rounded-xl p-2.5 text-center border"
              style={{
                background: r.off
                  ? "color-mix(in oklab, var(--destructive) 14%, transparent)"
                  : "color-mix(in oklab, var(--success) 14%, transparent)",
                borderColor: r.off
                  ? "color-mix(in oklab, var(--destructive) 40%, transparent)"
                  : "color-mix(in oklab, var(--success) 40%, transparent)",
              }}
            >
              <div
                className="flex justify-center"
                style={{
                  color: r.off
                    ? "color-mix(in oklab, var(--destructive) 70%, white)"
                    : "var(--success)",
                }}
              >
                <r.Icon className="size-5" aria-hidden />
              </div>
              <div
                className="text-[10px] mt-1 font-semibold uppercase tracking-wider"
                style={{
                  color: r.off
                    ? "color-mix(in oklab, var(--destructive) 55%, white)"
                    : "color-mix(in oklab, var(--success) 75%, white)",
                }}
              >
                {r.label}
              </div>
              <div className="text-[9px] mt-0.5 text-muted-foreground">
                {r.off ? "Bloqué" : "Autorisé"}
              </div>
            </div>
          ))}
        </div>

        {/* Carte rôle */}
        <div
          className="rounded-2xl p-4 border flex items-center gap-3"
          style={{
            background: SURFACE,
            borderColor: `color-mix(in oklab, ${STAMP} 38%, transparent)`,
            boxShadow: `0 0 32px -4px color-mix(in oklab, ${STAMP} 22%, transparent)`,
          }}
        >
          <div
            className="size-14 rounded-none flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: "color-mix(in oklab, var(--background) 70%, transparent)",
              boxShadow: `0 0 0 2px color-mix(in oklab, ${STAMP} 45%, transparent)`,
            }}
          >
            <AvatarImg avatar={myAv} size={56} rounded="none" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: `color-mix(in oklab, ${STAMP} 82%, white)` }}
            >
              Ton rôle (visible en cellule)
            </div>
            <div
              className="mt-0.5 text-lg font-semibold flex items-center gap-2 text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <RoleIcon role={myRole} size={22} />
              {myRole?.name_fr ?? "—"}
            </div>
          </div>
        </div>

        {/* Parloir — remplace le testament (déjà dans son onglet dédié). Fermé :
            cadre grisé ; ouvert par le Geôlier : chat privé actif dans la cellule. */}
        {parloirOpen ? (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: SURFACE,
              borderColor: "oklch(0.60 0.16 45 / 0.5)",
              boxShadow: "0 0 32px -6px oklch(0.60 0.16 45 / 0.35)",
            }}
          >
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 border-b"
              style={{ borderColor: "oklch(0.60 0.16 45 / 0.3)" }}
            >
              <KeyRound className="size-4 shrink-0" style={{ color: "oklch(0.78 0.16 55)" }} />
              <div className="min-w-0">
                <div
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "oklch(0.85 0.12 60)" }}
                >
                  Parloir ouvert
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Le Geôlier te parle à travers les barreaux — réponds… ou mens.
                </div>
              </div>
            </div>
            <div className="p-2">
              <ChatPanel
                gameId={gameId}
                channel={`parloir-${me.id}-${game.current_tour}`}
                meId={me.id}
                mePseudo={me.pseudo}
                canWrite
                placeholder="Répondre au Geôlier…"
                emptyText="Le Geôlier ne t'a encore rien demandé."
              />
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl border border-dashed p-4 flex items-center gap-3 opacity-70"
            style={{ background: SURFACE, borderColor: EDGE }}
          >
            <MessageSquare className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-muted-foreground">Parloir fermé</div>
              <div className="text-[11px] text-muted-foreground/80 leading-snug">
                Un geôlier peut venir t'ouvrir un chat privé pendant l'Enquête. Tu seras prévenu ici.
              </div>
            </div>
          </div>
        )}

        {/* Co-détenus */}
        {otherPrisoners.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div
                className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: `color-mix(in oklab, ${STAMP} 84%, white)` }}
              >
                Co-détenus
              </div>
              <div
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: `color-mix(in oklab, ${STAMP} 22%, transparent)`,
                  color: `color-mix(in oklab, ${STAMP} 80%, white)`,
                }}
              >
                {otherPrisoners.length}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 stagger">
              {otherPrisoners.map((p) => {
                const av = avatarOf(
                  ((p.role_meta ?? {}) as Record<string, unknown>).avatar as string | undefined,
                  p.id,
                );
                return (
                  <div
                    key={p.id}
                    className="elevate rounded-xl p-3 border flex items-center gap-2.5"
                    style={{ background: SURFACE, borderColor: EDGE }}
                  >
                    <div
                      className="size-9 rounded-none flex items-center justify-center overflow-hidden shrink-0"
                      style={{
                        background: "color-mix(in oklab, var(--background) 75%, transparent)",
                      }}
                    >
                      <AvatarImg avatar={av} size={36} rounded="none" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate text-foreground">
                        {p.pseudo}
                      </div>
                      <div
                        className="text-[10px] inline-flex items-center gap-1"
                        style={{ color: `color-mix(in oklab, ${STAMP} 78%, white)` }}
                      >
                        <Lock className="size-2.5" aria-hidden /> En cellule
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
