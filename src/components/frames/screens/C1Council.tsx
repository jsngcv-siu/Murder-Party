// Conseil des Morts : chat persisté avec ambiance verte fantomatique.
// Lecture étendue au Médium vivant. Les rôles des morts ne sont PAS affichés.
import type { FrameContext } from "../registry";
import { ChatPanel } from "@/components/ChatPanel";
import { Skull } from "lucide-react";

// Accents dérivés de l'accent d'ÉTAT posé par le PlayerShell (--reveal-title,
// teinte des morts). Un Médium VIVANT lit aussi cet écran : chez lui la variable
// n'existe pas, d'où le repli vert — le seul endroit où le Conseil porte encore
// sa propre couleur, précisément parce que le shell autour est brun.
const COUNCIL_ACCENT = "var(--reveal-title, oklch(0.85 0.13 160))";
const COUNCIL_TITLE = `color-mix(in oklab, ${COUNCIL_ACCENT} 88%, white)`;
const COUNCIL_INK = `color-mix(in oklab, ${COUNCIL_ACCENT} 40%, white)`;
const COUNCIL_MUTED = `color-mix(in oklab, ${COUNCIL_ACCENT} 72%, transparent)`;
const COUNCIL_GLOW = `color-mix(in oklab, ${COUNCIL_ACCENT} 45%, transparent)`;

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
    // Aucun fond propre : c'est le shell qui porte déjà la teinte des morts
    // (cf. lib/statePalette). Cet écran avait son propre dégradé émeraude, hérité
    // d'avant la colorimétrie d'état — deux verts différents se rencontraient
    // sous le bandeau de statuts et la couture se voyait. Les accents ci-dessous
    // sont dérivés du token d'état, donc toujours d'accord avec lui.
    <div className="h-full flex flex-col p-5" style={{ color: COUNCIL_INK }}>
      <div className="flex items-center gap-2">
        <Skull
          className="size-6"
          style={{ color: COUNCIL_ACCENT, filter: `drop-shadow(0 0 8px ${COUNCIL_GLOW})` }}
          aria-hidden
        />
        <h2 className="text-lg font-semibold tracking-wide" style={{ color: COUNCIL_TITLE }}>
          Conseil des Morts
        </h2>
      </div>
      <p className="text-xs mt-1" style={{ color: COUNCIL_MUTED }}>
        {isMedium ? "Tu écoutes en tant que Médium." : "Visible uniquement par les morts."}
      </p>
      <div className="mt-2 text-xs" style={{ color: COUNCIL_MUTED }}>
        {dead.length} âme{dead.length > 1 ? "s" : ""} :{" "}
        {dead.map((d) => d.pseudo).join(" · ") || "—"}
      </div>
      <div
        className="flex-1 mt-3 min-h-0 rounded-lg border p-2"
        style={{
          borderColor: `color-mix(in oklab, ${COUNCIL_ACCENT} 34%, transparent)`,
          background: `color-mix(in oklab, ${COUNCIL_ACCENT} 8%, transparent)`,
          boxShadow: `0 0 24px -8px ${COUNCIL_GLOW}`,
        }}
      >
        <ChatPanel
          gameId={gameId}
          channel="council"
          meId={me.id}
          mePseudo={me.pseudo}
          canWrite={canWrite}
          anonymous
          placeholder="Murmurer aux ombres…"
          emptyText="Personne n'a parlé encore…"
        />
      </div>
    </div>
  );
}
