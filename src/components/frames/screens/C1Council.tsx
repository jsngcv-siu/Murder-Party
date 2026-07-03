// Conseil des Morts : chat persisté avec ambiance verte fantomatique.
// Lecture étendue au Médium vivant. Les rôles des morts ne sont PAS affichés.
import type { FrameContext } from "../registry";
import { ChatPanel } from "@/components/ChatPanel";
import { Skull } from "lucide-react";

export function C1Council({ gameId, me, players }: FrameContext) {
  const dead = players.filter((p) => !p.is_alive && !p.is_mj);
  const isMedium = me.role_slug === "medium" && me.is_alive;
  const canRead = !me.is_alive || isMedium;
  const canWrite = !me.is_alive;

  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-5 text-center text-sm text-muted-foreground">
        Le conseil des morts est silencieux pour les vivants.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-5 bg-gradient-to-b from-emerald-950/60 via-background to-emerald-950/40 text-emerald-100">
      <div className="flex items-center gap-2">
        <Skull className="size-6 text-emerald-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" aria-hidden />
        <h2 className="text-lg font-semibold tracking-wide text-emerald-200">Conseil des Morts</h2>
      </div>
      <p className="text-xs text-emerald-300/70 mt-1">
        {isMedium ? "Tu écoutes en tant que Médium." : "Visible uniquement par les morts."}
      </p>
      <div className="mt-2 text-xs text-emerald-400/80">
        {dead.length} âme{dead.length > 1 ? "s" : ""} : {dead.map((d) => d.pseudo).join(" · ") || "—"}
      </div>
      <div className="flex-1 mt-3 min-h-0 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-2 shadow-[0_0_24px_-8px_rgba(74,222,128,0.35)]">
        <ChatPanel
          gameId={gameId} channel="council" meId={me.id} mePseudo={me.pseudo}
          canWrite={canWrite}
          anonymous
          placeholder="Murmurer aux ombres…" emptyText="Personne n'a parlé encore…"
        />
      </div>
    </div>
  );
}
