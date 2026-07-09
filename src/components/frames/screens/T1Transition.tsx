import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { Skull } from "lucide-react";
import type { FrameContext } from "../registry";
import { collectAnnouncements, sortTourEvents } from "./PA6Announces";
import { avatarOf } from "@/lib/avatars";
import { roleColor } from "@/lib/factionText";
import { AvatarImg } from "@/components/AvatarImg";
import { serverNow, useServerTimeOffset } from "@/lib/serverTime";
import { supabase } from "@/integrations/supabase/client";

// T1 = overlays de bascule de phase, refondus dans la direction artistique
// "The Board" (cf. design « Murder party dans un style Board - bois », page 11).
// Chaque bascule = un dossier tamponné épinglé sur un fond bois/liège, ficelle
// rouge tendue entre quatre punaises, polaroïds & post-its qui flottent autour.
//
// Durées d'intro/transition : source UNIQUE dans src/lib/phaseTiming.ts (partagée
// avec le moteur/démo/QA). Ré-export ici pour les nombreux imports historiques.
export { INTRO_MS, VOTE_RESULT_MS } from "@/lib/phaseTiming";
import { INTRO_MS, VOTE_RESULT_MS } from "@/lib/phaseTiming";

// ---------------------------------------------------------------------------
// Briques décoratives communes au plateau
// ---------------------------------------------------------------------------

/** Punaise rouge (ronde, brillante). Variante "claire" pour les fonds sombres. */
function Pin({
  size = 13,
  light = false,
  style,
}: {
  size?: number;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: light
          ? "radial-gradient(circle at 35% 30%,#ffd0b0,#c0392b)"
          : "radial-gradient(circle at 35% 30%,#ff8e98,#b01b2c)",
        boxShadow: "0 3px 6px rgba(0,0,0,.55)",
        ...style,
      }}
    />
  );
}

/** Ficelle rouge tendue entre les quatre punaises d'angle (full-bleed, étirée). */
function RedString() {
  const lines = (
    <>
      <line x1="40" y1="78" x2="244" y2="100" />
      <line x1="40" y1="78" x2="232" y2="548" />
      <line x1="244" y1="100" x2="54" y2="556" />
      <line x1="54" y1="556" x2="232" y2="548" />
    </>
  );
  return (
    <svg
      className="bd-string"
      viewBox="0 0 282 622"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <g fill="none" stroke="#b01f2c" strokeWidth="2.2" strokeLinecap="round" opacity=".95">
        {lines}
      </g>
      <g fill="none" stroke="#ef5566" strokeWidth="0.7" strokeLinecap="round" opacity=".7">
        {lines}
      </g>
    </svg>
  );
}

/** Les quatre punaises d'angle qui ancrent la ficelle. */
function CornerPins() {
  const spots = [
    { left: "14.2%", top: "12.5%" },
    { left: "86.5%", top: "16.1%" },
    { left: "19.1%", top: "89.4%" },
    { left: "82.3%", top: "88.1%" },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <span
          key={i}
          className="bd-pin"
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            transform: "translate(-50%,-50%)",
            zIndex: 6,
          }}
        >
          <Pin />
        </span>
      ))}
    </>
  );
}

const SCATTER_BASE: CSSProperties = {
  position: "absolute",
  zIndex: 4,
  boxShadow: "0 9px 16px -8px rgba(0,0,0,.7)",
};

// ---------------------------------------------------------------------------
// Décors par phase (polaroïds, post-its, stickers qui flottent autour)
// ---------------------------------------------------------------------------

function FreeScatter() {
  return (
    <>
      {/* Polaroïd "enquête" — soleil */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "6.4%",
          left: "5%",
          width: 76,
          background: "#f3ead7",
          padding: "5px 5px 4px",
          transform: "rotate(-7deg)",
        }}
      >
        <div
          style={{
            height: 46,
            background: "linear-gradient(160deg,#fbe6a6,#f3cd74)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 5,
              right: 6,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "radial-gradient(circle at 40% 35%,#fff6cf,#f0b73f)",
              boxShadow: "0 0 9px rgba(240,183,63,.85)",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: "48%",
              top: 0,
              bottom: 0,
              width: 1.5,
              background: "#c4a25a",
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "46%",
              height: 1.5,
              background: "#c4a25a",
            }}
          />
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 13,
            color: "#2b1d14",
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          enquête
        </div>
      </div>

      {/* Post-it "À FAIRE" */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "8%",
          right: "4%",
          width: 80,
          background: "#f2d35e",
          padding: "7px 9px 8px",
          transform: "rotate(5deg)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 6.5,
            letterSpacing: ".08em",
            color: "#7a5320",
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          À FAIRE
        </div>
        <div
          style={{
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 13,
            color: "#5a3410",
            lineHeight: 1.35,
          }}
        >
          ✓ fouiller
          <br />✓ agir
          <br />○ vivre
        </div>
      </div>

      {/* Polaroïd horloge "l'enquête" */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          bottom: "5.5%",
          left: "6%",
          width: 74,
          background: "#f3ead7",
          padding: "7px 6px 6px",
          transform: "rotate(-5deg)",
          zIndex: 7,
        }}
      >
        <span style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)" }}>
          <Pin size={11} />
        </span>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
            <circle cx="20" cy="20" r="17" fill="#fbf4e2" stroke="#a8772a" strokeWidth="2.5" />
            <line
              x1="20"
              y1="20"
              x2="20"
              y2="9"
              stroke="#3a2a18"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="20"
              y1="20"
              x2="28"
              y2="23"
              stroke="#3a2a18"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="20" cy="20" r="1.6" fill="#3a2a18" />
          </svg>
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12,
            color: "#2b1d14",
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          l'enquête
        </div>
      </div>

      {/* Stickers "explorer / discuter / capacité" */}
      <div
        className="bd-scatter"
        style={{
          position: "absolute",
          bottom: "6%",
          right: "6%",
          display: "flex",
          flexDirection: "column",
          gap: 7,
          alignItems: "flex-end",
          zIndex: 7,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 7,
            letterSpacing: ".12em",
            color: "#e7c48a",
            opacity: 0.85,
            marginBottom: 1,
          }}
        >
          À TOI D'AGIR
        </span>
        <span
          style={{
            whiteSpace: "nowrap",
            background: "#93cdd1",
            color: "#0d3b3e",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "2px 9px",
            transform: "rotate(1.5deg)",
            boxShadow: "0 4px 9px rgba(0,0,0,.45)",
          }}
        >
          explorer
        </span>
        <span
          style={{
            whiteSpace: "nowrap",
            background: "#ec84b0",
            color: "#5a1538",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "2px 9px",
            transform: "rotate(-1.5deg)",
            boxShadow: "0 4px 9px rgba(0,0,0,.45)",
          }}
        >
          discuter
        </span>
        <span
          style={{
            whiteSpace: "nowrap",
            background: "#f2d35e",
            color: "#5a3410",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "2px 9px",
            transform: "rotate(1deg)",
            boxShadow: "0 4px 9px rgba(0,0,0,.45)",
          }}
        >
          capacité
        </span>
      </div>
    </>
  );
}

function GatheringScatter() {
  return (
    <>
      {/* Polaroïd "suspect ?" — photo bleue rayée */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "6.4%",
          left: "5%",
          width: 74,
          background: "#f3ead7",
          padding: "5px 5px 4px",
          transform: "rotate(-7deg)",
        }}
      >
        <div
          style={{
            height: 44,
            background:
              "repeating-linear-gradient(45deg,#b0bdd2,#b0bdd2 5px,#bdc8da 5px,#bdc8da 10px)",
          }}
        />
        <div
          style={{
            textAlign: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 13,
            color: "#2b1d14",
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          suspect ?
        </div>
      </div>

      {/* Note jaune "qui ment ?" */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "8.4%",
          right: "5%",
          width: 70,
          height: 64,
          background: "#f2d35e",
          transform: "rotate(5deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: "Caveat,cursive",
          fontWeight: 700,
          fontSize: 15,
          color: "#5a3410",
          lineHeight: 1.05,
          padding: 4,
        }}
      >
        qui ment ?
      </div>

      {/* Polaroïd "le valet" — photo rose rayée */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          bottom: "8%",
          left: "8.5%",
          width: 68,
          background: "#f3ead7",
          padding: "5px 5px 4px",
          transform: "rotate(6deg)",
        }}
      >
        <div
          style={{
            height: 42,
            background:
              "repeating-linear-gradient(45deg,#c6a59c,#c6a59c 5px,#d4b4aa 5px,#d4b4aa 10px)",
          }}
        />
        <div
          style={{
            textAlign: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12,
            color: "#2b1d14",
            lineHeight: 1.1,
            marginTop: 2,
          }}
        >
          le valet
        </div>
      </div>

      {/* Sticker rose "menteur ?" */}
      <span
        className="bd-scatter"
        style={{
          position: "absolute",
          bottom: "18%",
          left: "20%",
          background: "#ec84b0",
          color: "#5a1538",
          fontFamily: "Caveat,cursive",
          fontWeight: 700,
          fontSize: 13,
          padding: "2px 9px",
          transform: "rotate(-3deg)",
          boxShadow: "0 4px 9px rgba(0,0,0,.4)",
          zIndex: 5,
        }}
      >
        menteur ?
      </span>
    </>
  );
}

function VoteScatter() {
  return (
    <>
      {/* Bulletin nul "1 voix" */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "6.4%",
          left: "4.5%",
          width: 70,
          background: "#f6efe0",
          padding: "7px 6px 5px",
          transform: "rotate(-7deg)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 6.5,
            letterSpacing: ".1em",
            color: "#9a7b52",
            textAlign: "center",
            borderBottom: "1px solid #d8c8a8",
            paddingBottom: 3,
          }}
        >
          — BULLETIN —
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 24,
            fontSize: 20,
            color: "#c2202f",
            fontFamily: "var(--font-display)",
          }}
        >
          ✗
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12,
            color: "#2b1d14",
            lineHeight: 1,
          }}
        >
          1 voix
        </div>
      </div>

      {/* Note jaune "ta voix" */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          top: "8.4%",
          right: "5%",
          width: 70,
          height: 64,
          background: "#f2d35e",
          transform: "rotate(5deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: "Caveat,cursive",
          fontWeight: 700,
          fontSize: 15,
          color: "#5a3410",
          lineHeight: 1.05,
          padding: 4,
        }}
      >
        ta voix
      </div>

      {/* Décompte griffonné */}
      <div
        className="bd-scatter"
        style={{
          ...SCATTER_BASE,
          bottom: "8.4%",
          left: "7%",
          width: 80,
          background: "#f6efe0",
          padding: "6px 8px",
          transform: "rotate(-5deg)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 6.5,
            letterSpacing: ".08em",
            color: "#9a7b52",
            textAlign: "center",
            borderBottom: "1px solid #d8c8a8",
            paddingBottom: 2,
            marginBottom: 3,
          }}
        >
          DÉCOMPTE
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12,
            color: "#2b1d14",
            lineHeight: 1.25,
          }}
        >
          <span>Marco</span>
          <span
            style={{
              color: "#c2202f",
              letterSpacing: "1.5px",
              fontFamily: "var(--font-display)",
              fontSize: 10,
            }}
          >
            ||||
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 12,
            color: "#2b1d14",
            lineHeight: 1.25,
          }}
        >
          <span>Inès</span>
          <span
            style={{
              color: "#9a7b52",
              letterSpacing: "1.5px",
              fontFamily: "var(--font-display)",
              fontSize: 10,
            }}
          >
            ||
          </span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Configuration des trois bascules tamponnées
// ---------------------------------------------------------------------------

type PhaseKey = "free" | "gathering" | "vote";

type TransitionDef = {
  bg: string;
  dust: { color: string; opacity: number };
  topDecor?: ReactNode;
  header: string;
  stampWord: string;
  stampColor: string;
  stampBg?: string;
  stampFontSize: number;
  subtitle: ReactNode;
  emoji: string;
  emojiBg: string;
  scatter: ReactNode;
};

// Couronne de rayons solaires + halo (uniquement Enquête).
const SunRays = (
  <>
    <div
      style={{
        position: "absolute",
        top: -150,
        left: "50%",
        transform: "translateX(-50%)",
        width: 360,
        height: 360,
        background:
          "repeating-conic-gradient(from 4deg at 50% 50%,rgba(255,228,150,.18) 0deg 5deg,transparent 5deg 19deg)",
        borderRadius: "50%",
        pointerEvents: "none",
        WebkitMaskImage: "radial-gradient(circle,#000 26%,transparent 60%)",
        maskImage: "radial-gradient(circle,#000 26%,transparent 60%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: -44,
        left: "50%",
        transform: "translateX(-50%)",
        width: 230,
        height: 230,
        borderRadius: "50%",
        background: "radial-gradient(circle,rgba(255,226,150,.55),transparent 66%)",
        pointerEvents: "none",
      }}
    />
  </>
);

const TRANSITIONS: Record<PhaseKey, TransitionDef> = {
  free: {
    bg: "radial-gradient(120% 62% at 50% 0%,rgba(247,202,96,.32),transparent 52%),radial-gradient(circle at 50% 46%,#7a5226,#2a1b10 86%)",
    dust: { color: "rgba(0,0,0,.14)", opacity: 0.4 },
    topDecor: SunRays,
    header: "— L'ENQUÊTE COMMENCE —",
    stampWord: "ENQUÊTE",
    stampColor: "#a8772a",
    stampFontSize: 22,
    subtitle: (
      <>
        Fouillez, agissez —<br />
        vivez votre rôle.
      </>
    ),
    emoji: "☀️",
    emojiBg: "radial-gradient(circle at 36% 30%,#f0c46a,#a8772a 72%)",
    scatter: <FreeScatter />,
  },
  gathering: {
    bg: "radial-gradient(circle at 50% 30%,#6e3a2e,#34191a 82%)",
    dust: { color: "rgba(0,0,0,.18)", opacity: 0.6 },
    header: "— CONVOCATION —",
    stampWord: "DÉBAT",
    stampColor: "#7a4fa6",
    stampFontSize: 22,
    subtitle: (
      <>
        Débattez des annonces
        <br />
        &amp; confondez les coupables.
      </>
    ),
    emoji: "🔔",
    emojiBg: "radial-gradient(circle at 36% 30%,#b878c8,#6e2a86 72%)",
    scatter: <GatheringScatter />,
  },
  vote: {
    bg: "radial-gradient(120% 58% at 50% 6%,rgba(209,43,61,.22),transparent 52%),radial-gradient(circle at 50% 42%,#3a1519,#120a0c 87%)",
    dust: { color: "rgba(255,255,255,.025)", opacity: 0.6 },
    header: "— LE VERDICT —",
    stampWord: "VOTE",
    stampColor: "#c2202f",
    stampBg: "rgba(194,32,47,.06)",
    stampFontSize: 22,
    subtitle: (
      <>
        Désignez le coupable —<br />
        que justice soit faite.
      </>
    ),
    emoji: "⚖️",
    emojiBg: "radial-gradient(circle at 36% 30%,#e0563f,#9e1f2e 72%)",
    scatter: <VoteScatter />,
  },
};

// ---------------------------------------------------------------------------
// Animation d'entrée (coupée si prefers-reduced-motion)
// ---------------------------------------------------------------------------

function useBoardIntro(rootRef: React.RefObject<HTMLDivElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".bd-backdrop", { opacity: 0, duration: 0.5 }, 0)
          .from(".bd-string", { opacity: 0, duration: 0.6 }, 0.05)
          .from(
            ".bd-pin",
            { scale: 0, opacity: 0, stagger: 0.05, duration: 0.4, ease: "back.out(2)" },
            0.12,
          )
          .from(
            ".bd-scatter",
            { scale: 0.6, opacity: 0, y: 10, stagger: 0.06, duration: 0.45, ease: "back.out(1.4)" },
            0.18,
          )
          .from(".bd-card", { scale: 0.85, opacity: 0, duration: 0.5, ease: "back.out(1.3)" }, 0.32)
          .from(".bd-stamp", { scale: 1.6, opacity: 0, duration: 0.4, ease: "back.out(2)" }, 0.58)
          .from(".bd-emoji", { scale: 0, opacity: 0, duration: 0.5, ease: "back.out(1.8)" }, 0.64);
        // Respiration continue de l'emblème.
        gsap.to(".bd-emoji", {
          y: -3,
          duration: 1.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1,
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ---------------------------------------------------------------------------
// Le dossier tamponné central, commun aux trois bascules
// ---------------------------------------------------------------------------

function DossierCard({ def, tour }: { def: TransitionDef; tour: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        className="bd-card"
        style={{
          position: "relative",
          width: "min(80%, 250px)",
          background: "linear-gradient(180deg,#f6eedd,#e8daba)",
          borderRadius: 3,
          padding: "30px 22px 28px",
          transform: "rotate(-1.6deg)",
          boxShadow: "0 24px 46px -18px rgba(0,0,0,.85)",
          zIndex: 8,
        }}
      >
        <span
          style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}
        >
          <Pin size={16} />
        </span>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 9,
            letterSpacing: ".24em",
            color: "#9a7b52",
            textAlign: "center",
          }}
        >
          {def.header}
        </div>

        <div style={{ margin: "18px 0 2px", display: "flex", justifyContent: "center" }}>
          <div
            className="bd-stamp"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: def.stampFontSize,
              letterSpacing: ".06em",
              color: def.stampColor,
              border: `2.5px solid ${def.stampColor}`,
              borderRadius: 5,
              padding: "7px 16px",
              transform: "rotate(-3.5deg)",
              background: def.stampBg ?? "transparent",
              opacity: 0.96,
              whiteSpace: "nowrap",
            }}
          >
            {def.stampWord}
          </div>
        </div>

        <p
          style={{
            fontFamily: "Caveat,cursive",
            fontWeight: 700,
            fontSize: 20,
            color: "#4a3322",
            textAlign: "center",
            lineHeight: 1.15,
            margin: "16px 4px 0",
          }}
        >
          {def.subtitle}
        </p>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
          }}
        >
          <span style={{ height: 1, width: 32, background: "#cbb78f" }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: ".22em",
              color: "#9a7b52",
            }}
          >
            TOUR {tour}
          </span>
          <span style={{ height: 1, width: 32, background: "#cbb78f" }} />
        </div>

        <span
          className="bd-emoji"
          style={{
            position: "absolute",
            top: -16,
            right: -12,
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: def.emojiBg,
            boxShadow: "0 6px 12px -3px rgba(0,0,0,.6),inset 0 0 0 2.5px rgba(255,255,255,.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            transform: "rotate(-8deg)",
          }}
        >
          {def.emoji}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay de bascule (forced-sync) — Enquête / Débat / vote
// ---------------------------------------------------------------------------

function PhaseIntro({
  game,
  phase,
  delayMs = 0,
}: {
  game: FrameContext["game"];
  phase: PhaseKey;
  delayMs?: number;
}) {
  const def = TRANSITIONS[phase];
  // `delayMs` décale la fenêtre d'affichage : pour l'Enquête qui suit un
  // vote, la bascule "LE JOUR SE LÈVE" n'apparaît qu'après l'écran de résultat.
  const started = game.phase_started_at ? new Date(game.phase_started_at).getTime() + delayMs : 0;
  const serverOffset = useServerTimeOffset();
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!started) return;
    const update = () => setNow(serverNow());
    update();

    const interval = setInterval(update, 200);
    const stopAfter = Math.max(0, started + INTRO_MS + 250 - serverNow());
    const stop = setTimeout(() => {
      update();
      clearInterval(interval);
    }, stopAfter);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [started, serverOffset]);

  const rootRef = useRef<HTMLDivElement>(null);
  const elapsed = now - started;
  const visible = started > 0 && elapsed >= 0 && elapsed <= INTRO_MS;
  useBoardIntro(rootRef, [started, visible, phase]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className="absolute inset-0 z-50 overflow-hidden">
      {/* Plateau */}
      <div className="bd-backdrop absolute inset-0" style={{ background: def.bg }} aria-hidden />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${def.dust.color} 1px,transparent 1.5px)`,
          backgroundSize: "7px 7px",
          opacity: def.dust.opacity,
        }}
        aria-hidden
      />
      {def.topDecor}
      <RedString />
      {def.scatter}
      <CornerPins />
      <DossierCard def={def} tour={game.current_tour} />
    </div>
  );
}

export function T1Transition(ctx: FrameContext) {
  return <PhaseIntro game={ctx.game} phase="gathering" />;
}

export function T2VoteIntro(ctx: FrameContext) {
  return <PhaseIntro game={ctx.game} phase="vote" />;
}

export function T3FreeIntro(ctx: FrameContext) {
  return <PhaseIntro game={ctx.game} phase="free" />;
}

// Verdict du vote, joué à la FIN de la phase Vote (après la fenêtre de vote de
// durée `phase_duration_s`), juste avant le passage au tour suivant.
export function VoteOutro(ctx: FrameContext) {
  const dur = ctx.game.phase_duration_s ?? 0;
  return <VoteResultScreen ctx={ctx} offsetMs={INTRO_MS + dur * 1000} />;
}

// ---------------------------------------------------------------------------
// Écran de RÉSULTAT du vote — verdict joué à la FIN de la phase Vote
// ---------------------------------------------------------------------------
// Affiché pendant VOTE_RESULT_MS après la fenêtre de vote (via VoteOutro),
// AVANT le passage au tour suivant. Annonce le verdict (emprisonnement, égalité
// tranchée au sort, ou personne) sans jamais révéler rôle/faction. Les données
// viennent de la notif `vote_result` broadcastée par closeVote.

type VotePayload = { target_id: string | null; tied?: boolean; counts?: Record<string, number> };

function VoteResultScreen({ ctx, offsetMs = 0 }: { ctx: FrameContext; offsetMs?: number }) {
  const { game, players } = ctx;
  // `offsetMs` décale la fenêtre : le verdict s'affiche à la FIN de la phase Vote
  // (après la fenêtre de vote = INTRO_MS + durée), avant le passage au tour suivant.
  const started = game.phase_started_at ? new Date(game.phase_started_at).getTime() + offsetMs : 0;
  useServerTimeOffset();
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    if (!started) return;
    const appear = started - serverNow();
    const disappear = started + VOTE_RESULT_MS - serverNow();
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (appear > 0) timers.push(setTimeout(() => setNow(serverNow()), appear + 20));
    if (disappear > 0) timers.push(setTimeout(() => setNow(serverNow()), disappear + 50));
    return () => timers.forEach(clearTimeout);
  }, [started]);

  // Verdict authoritatif : dernière notif vote_result de la partie (le vote qui
  // vient de se clore). `undefined` = en cours de chargement.
  const [verdict, setVerdict] = useState<VotePayload | null | undefined>(undefined);
  useEffect(() => {
    let off = false;
    void (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("payload")
        .eq("game_id", game.id)
        .eq("type", "vote_result")
        .order("created_at", { ascending: false })
        .limit(1);
      if (off) return;
      const p = ((data ?? [])[0] as { payload: VotePayload | null } | undefined)?.payload ?? null;
      setVerdict(p);
    })();
    return () => {
      off = true;
    };
  }, [game.id, game.current_tour]);

  const rootRef = useRef<HTMLDivElement>(null);
  const elapsed = now - started;
  const visible = started > 0 && elapsed >= 0 && elapsed <= VOTE_RESULT_MS;
  useBoardIntro(rootRef, [started, visible]);

  // Fallback si la notif n'est pas (encore) disponible : on déduit l'emprisonné
  // du tour COURANT depuis l'état joueurs (verdict `null` = requête sans ligne).
  const derived =
    players.find((p) => {
      const m = (p.role_meta ?? {}) as Record<string, unknown>;
      return (
        p.is_imprisoned && (m.imprisoned_since_cycle as number | undefined) === game.current_tour
      );
    }) ?? null;

  const loading = verdict === undefined;
  const hasCounts = !!verdict;
  const targetId = verdict ? verdict.target_id : (derived?.id ?? null);
  const tied = verdict?.tied ?? false;
  const target = targetId ? (players.find((p) => p.id === targetId) ?? null) : null;
  const votes = targetId ? (verdict?.counts?.[targetId] ?? 0) : 0;
  const av = target
    ? avatarOf(
        (target.role_meta as Record<string, unknown>)?.avatar as string | undefined,
        target.id,
      )
    : undefined;
  const votedTour = game.current_tour;
  const candidates = useMemo(
    () =>
      players
        .filter((p) => !p.is_mj)
        .slice()
        .sort((a, b) => {
          const byVotes = (verdict?.counts?.[b.id] ?? 0) - (verdict?.counts?.[a.id] ?? 0);
          if (byVotes !== 0) return byVotes;
          return a.pseudo.localeCompare(b.pseudo);
        })
        .slice(0, 8),
    [players, verdict?.counts],
  );
  const candidateIds = candidates.map((p) => p.id).join("|");
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (!targetId || candidates.length === 0) {
      setActiveCandidateId(null);
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setActiveCandidateId(targetId);
      gsap.set(root.querySelectorAll(".vr-candidate"), { clearProps: "all" });
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const nodes = gsap.utils.toArray<HTMLElement>(".vr-candidate", root);
        const targetIndex = candidates.findIndex((p) => p.id === targetId);
        if (nodes.length === 0 || targetIndex < 0) {
          setActiveCandidateId(targetId);
          return;
        }
        const steps = nodes.length * 2 + targetIndex + 1;
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        gsap.set(nodes, { scale: 1, y: 0, rotation: 0 });
        for (let i = 0; i < steps; i++) {
          const node = nodes[i % nodes.length];
          const id = node.dataset.playerId ?? null;
          const isLast = i === steps - 1;
          tl.to(node, {
            scale: isLast ? 1.28 : 1.16,
            y: isLast ? -7 : -4,
            rotation: isLast ? -3 : 0,
            duration: isLast ? 0.18 : 0.07,
            onStart: () => setActiveCandidateId(id),
          }).to(node, {
            scale: isLast ? 1.18 : 1,
            y: isLast ? -4 : 0,
            rotation: isLast ? -2 : 0,
            duration: isLast ? 0.42 : 0.06,
          });
        }
        tl.fromTo(
          ".vr-final-ring",
          { scale: 0.78, autoAlpha: 0 },
          { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(1.8)" },
          ">-0.18",
        );
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [visible, targetId, candidateIds, candidates]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className="absolute inset-0 z-50 overflow-hidden">
      <div
        className="bd-backdrop absolute inset-0"
        style={{ background: TRANSITIONS.vote.bg }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.025) 1px,transparent 1.5px)",
          backgroundSize: "7px 7px",
          opacity: 0.6,
        }}
        aria-hidden
      />
      <RedString />
      <CornerPins />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        <div
          className="bd-card"
          style={{
            position: "relative",
            width: "min(82%, 272px)",
            background: "linear-gradient(180deg,#f6eedd,#e8daba)",
            borderRadius: 3,
            padding: "26px 22px 24px",
            transform: "rotate(-1.4deg)",
            boxShadow: "0 24px 46px -18px rgba(0,0,0,.85)",
            zIndex: 8,
          }}
        >
          <span
            style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)" }}
          >
            <Pin size={16} />
          </span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: ".24em",
              color: "#9a7b52",
              textAlign: "center",
            }}
          >
            — LE VERDICT DES URNES —
          </div>

          {loading ? (
            <p
              style={{
                fontFamily: "Caveat,cursive",
                fontWeight: 700,
                fontSize: 20,
                color: "#4a3322",
                textAlign: "center",
                lineHeight: 1.2,
                margin: "28px 4px",
              }}
            >
              Le dépouillement s'achève…
            </p>
          ) : target ? (
            <>
              <div
                style={{
                  margin: "15px -8px 6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minHeight: 46,
                }}
              >
                {candidates.map((p) => {
                  const meta = (p.role_meta ?? {}) as Record<string, unknown>;
                  const candidateAv = avatarOf(meta.avatar as string | undefined, p.id);
                  const active = activeCandidateId === p.id;
                  const winner = targetId === p.id;
                  return (
                    <div
                      key={p.id}
                      data-player-id={p.id}
                      className="vr-candidate"
                      style={{
                        position: "relative",
                        width: 34,
                        height: 39,
                        flex: "0 0 auto",
                        borderRadius: 4,
                        padding: 2,
                        background: winner
                          ? "#fff7dd"
                          : active
                            ? "#f6e4b6"
                            : "rgba(255,255,255,.42)",
                        border: `1.5px solid ${
                          winner && active ? "#c2202f" : active ? "#a8772a" : "#d8c8a8"
                        }`,
                        boxShadow: active
                          ? "0 8px 16px -8px rgba(0,0,0,.75)"
                          : "0 4px 10px -9px rgba(0,0,0,.65)",
                        opacity: active || winner ? 1 : 0.68,
                      }}
                    >
                      <AvatarImg avatar={candidateAv} fill rounded="none" />
                      {winner && active && (
                        <span
                          className="vr-final-ring"
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: -5,
                            borderRadius: 8,
                            border: "2px solid #c2202f",
                            boxShadow: "0 0 0 2px rgba(194,32,47,.16),0 0 18px rgba(194,32,47,.42)",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ margin: "16px 0 4px", display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    position: "relative",
                    width: 96,
                    background: "#fbfaf6",
                    padding: "6px 6px 3px",
                    transform: "rotate(-3deg)",
                    boxShadow: "0 8px 16px -6px rgba(0,0,0,.6)",
                  }}
                >
                  <div style={{ position: "relative", width: 84, height: 90, overflow: "hidden" }}>
                    <AvatarImg avatar={av} fill rounded="none" />
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily: "Caveat,cursive",
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#2b1d14",
                      lineHeight: 1.1,
                      marginTop: 2,
                    }}
                  >
                    {target.pseudo}
                  </div>
                </div>
              </div>
              <div
                className="bd-stamp"
                style={{
                  margin: "6px auto 0",
                  width: "fit-content",
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  letterSpacing: ".06em",
                  color: "#c2202f",
                  border: "2.5px solid #c2202f",
                  borderRadius: 5,
                  padding: "6px 16px",
                  transform: "rotate(-3.5deg)",
                  background: "rgba(194,32,47,.06)",
                }}
              >
                EMPRISONNÉ
              </div>
              <p
                style={{
                  fontFamily: "Caveat,cursive",
                  fontWeight: 700,
                  fontSize: 17,
                  color: "#4a3322",
                  textAlign: "center",
                  lineHeight: 1.2,
                  margin: "13px 4px 0",
                }}
              >
                {tied ? (
                  <>
                    Égalité tranchée au sort —<br />
                    le manoir a désigné.
                  </>
                ) : hasCounts ? (
                  <>
                    <b>{votes}</b> voix l'envoient au trou.
                  </>
                ) : (
                  <>La sentence est tombée.</>
                )}
              </p>
            </>
          ) : (
            <>
              <div style={{ margin: "18px 0 2px", display: "flex", justifyContent: "center" }}>
                <div
                  className="bd-stamp"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    letterSpacing: ".06em",
                    color: "#9a7b52",
                    border: "2.5px solid #9a7b52",
                    borderRadius: 5,
                    padding: "6px 15px",
                    transform: "rotate(-3deg)",
                  }}
                >
                  AUCUN VERDICT
                </div>
              </div>
              <p
                style={{
                  fontFamily: "Caveat,cursive",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#4a3322",
                  textAlign: "center",
                  lineHeight: 1.2,
                  margin: "16px 4px 0",
                }}
              >
                Personne ne part en prison
                <br />
                ce tour-ci.
              </p>
            </>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
            }}
          >
            <span style={{ height: 1, width: 30, background: "#cbb78f" }} />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 9,
                letterSpacing: ".22em",
                color: "#9a7b52",
              }}
            >
              TOUR {votedTour}
            </span>
            <span style={{ height: 1, width: 30, background: "#cbb78f" }} />
          </div>

          <span
            className="bd-emoji"
            style={{
              position: "absolute",
              top: -16,
              right: -12,
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "radial-gradient(circle at 36% 30%,#e0563f,#9e1f2e 72%)",
              boxShadow: "0 6px 12px -3px rgba(0,0,0,.6),inset 0 0 0 2.5px rgba(255,255,255,.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              transform: "rotate(-8deg)",
            }}
          >
            ⚖️
          </span>
        </div>
      </div>
    </div>
  );
}

// Entrée en Enquête : la première Enquête (tour 1) n'est précédée
// d'aucun vote → bascule directe. Le verdict du vote est désormais montré à la
// FIN de la phase Vote (VoteOutro), donc l'entrée en Enquête est une bascule
// simple et identique à chaque tour.
export function FreeEntry(ctx: FrameContext) {
  return <PhaseIntro game={ctx.game} phase="free" />;
}

// ---------------------------------------------------------------------------
// AnnonceScreen — la « gazette » persistante de la phase ANNONCE
// ---------------------------------------------------------------------------
// Écran affiché pendant toute la phase "annonce" (entre l'Enquête et le
// Débat). Présente le dénouement du tour — morts, prisons, événements
// rares du MJ — sous forme de dépêches de presse épinglées. Données réelles
// issues du resolver (collectAnnouncements), pas du mock.

export function AnnonceScreen({ game, players, roles }: FrameContext) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tour = game.current_tour;
  const events = sortTourEvents(collectAnnouncements(players).filter((e) => e.tour === tour));
  const isMjMode = !game.mode_detective_player;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(
          ".gz-emoji",
          { scale: 0.2, opacity: 0, rotate: -20, duration: 0.6, ease: "back.out(1.7)" },
          0,
        )
          .from(".gz-title", { y: 10, opacity: 0, duration: 0.4 }, 0.15)
          .from(".gz-item", { y: 16, opacity: 0, stagger: 0.1, duration: 0.45 }, 0.3);
        gsap.to(".gz-emoji", {
          y: -4,
          duration: 1.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 0.9,
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [tour]);

  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const openPlayer = openPlayerId ? players.find((p) => p.id === openPlayerId) : null;
  const openMeta = (openPlayer?.role_meta ?? {}) as Record<string, unknown>;
  const openAv = avatarOf(openMeta.avatar as string | undefined, openPlayer?.id);
  const openTestament =
    typeof openMeta.testament === "string" && (openMeta.testament as string).length > 0
      ? (openMeta.testament as string)
      : null;

  return (
    <div
      ref={rootRef}
      className="relative min-h-full"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% 14%,rgba(232,180,74,.18),transparent 64%),linear-gradient(180deg,#1c1509,#0f0c06)",
        color: "#ece3d4",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(247,237,215,.02) 1px,transparent 1.5px)",
          backgroundSize: "7px 7px",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col">
        {/* Une de la gazette */}
        <div
          className="px-5 pt-11 pb-3 text-center border-b"
          style={{ borderColor: "rgba(255,255,255,.07)" }}
        >
          <div className="gz-emoji" style={{ fontSize: 38, lineHeight: 1 }}>
            📣
          </div>
          <div
            className="mt-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: ".22em",
              color: "#a89a7e",
            }}
          >
            CHRONIQUES DU MANOIR
          </div>
          <div
            className="mt-0.5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 27,
              color: "#f2d35e",
              textShadow: "0 0 22px rgba(232,180,74,.5)",
            }}
          >
            Annonce
          </div>
          <div
            className="mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 9,
              letterSpacing: ".28em",
              color: "#8a7f6f",
            }}
          >
            TOUR {tour} · DÉNOUEMENT
          </div>
        </div>

        {/* Dépêches du tour */}
        <div className="px-4 pt-4 pb-2 flex-1">
          <div
            className="gz-title mb-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 10,
              letterSpacing: ".14em",
              color: "#e8b44a",
            }}
          >
            ANNONCES DU TOUR · {events.length}
          </div>

          {events.length === 0 ? (
            <div
              className="gz-item rounded-sm px-4 py-8 text-center"
              style={{ background: "linear-gradient(180deg,#f7f0df,#e7dcc2)", color: "#6a5444" }}
            >
              <div style={{ fontSize: 26 }}>🕯️</div>
              <p className="mt-2 text-xs italic">
                Le manoir est calme… aucune nouvelle ce tour-ci.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((e, i) => (
                <GazetteCard
                  key={i}
                  event={e}
                  roles={roles}
                  onOpenTestament={(pid) => setOpenPlayerId(pid)}
                />
              ))}
            </div>
          )}
        </div>

        <p className="px-5 pt-1 pb-6 text-center text-[11px] italic" style={{ color: "#9a8d76" }}>
          {isMjMode
            ? "En attente du Débat… le MJ va ouvrir la discussion."
            : "Le Débat va s'ouvrir…"}
        </p>
      </div>

      {/* Modal testament */}
      {openPlayerId && openPlayer && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-6 pt-[max(1.5rem,env(safe-area-inset-top))] max-w-md mx-auto">
          <button
            onClick={() => setOpenPlayerId(null)}
            className="self-start text-sm text-muted-foreground hover:text-foreground transition"
          >
            ← retour
          </button>
          <div className="mt-4 text-center">
            <div className="flex justify-center drop-shadow-lg">
              <AvatarImg avatar={openAv} size={80} />
            </div>
            <h2 className="mt-3 text-2xl font-bold font-display">{openPlayer.pseudo}</h2>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest flex items-center justify-center gap-1">
              <Skull className="size-3.5" aria-hidden /> Défunt
            </div>
          </div>
          {openTestament ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm italic relative">
              <div className="absolute -top-2 left-3 px-2 bg-background text-[10px] uppercase tracking-widest text-amber-400">
                Testament
              </div>
              « {openTestament} »
            </div>
          ) : (
            <p className="mt-6 text-center text-xs text-muted-foreground italic">
              Aucun testament laissé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Dépêche de presse épinglée — rend un événement réel du tour dans le style
// "gazette" du mock (morts / prison / événement rare du MJ).
function GazetteCard({
  event,
  roles,
  onOpenTestament,
}: {
  event: ReturnType<typeof collectAnnouncements>[number];
  roles: FrameContext["roles"];
  onOpenTestament: (id: string) => void;
}) {
  if (event.kind === "death") {
    const meta = (event.player.role_meta ?? {}) as Record<string, unknown>;
    const av = avatarOf(meta.avatar as string | undefined, event.player.id);
    const cleaned = !!meta.death_cleaned;
    const role = roles.get(event.player.role_slug ?? "");
    const faction = cleaned ? "Effacé" : (role?.faction ?? "Inconnue");
    const factionColor = cleaned ? "#8a7458" : roleColor(role);
    const hasTestament =
      typeof meta.testament === "string" && (meta.testament as string).length > 0;
    return (
      <div
        className="gz-item"
        style={{
          position: "relative",
          background: "linear-gradient(180deg,#f7f0df,#e7dcc2)",
          border: "1px solid #ddcfac",
          borderRadius: 3,
          padding: "12px 13px 13px",
          transform: "rotate(-0.7deg)",
          boxShadow: "0 17px 30px -12px rgba(0,0,0,.85)",
        }}
      >
        <span style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)" }}>
          <Pin size={12} />
        </span>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: ".16em",
            color: "#b03a3a",
          }}
        >
          ⚑ DÉPÊCHE · UN MORT
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 8 }}>
          {/* Polaroïd du défunt — photo barrée */}
          <div
            style={{
              position: "relative",
              flex: "none",
              width: 56,
              background: "#fbfaf6",
              padding: "4px 4px 2px",
              transform: "rotate(-3deg)",
              boxShadow: "0 6px 12px -5px rgba(0,0,0,.6)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 48,
                height: 56,
                overflow: "hidden",
                filter: "grayscale(1)",
                opacity: 0.9,
              }}
            >
              <AvatarImg avatar={av} fill rounded="none" />
              <svg
                viewBox="0 0 48 56"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                aria-hidden
              >
                <line
                  x1="7"
                  y1="8"
                  x2="41"
                  y2="48"
                  stroke="#d12b3d"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity=".9"
                />
                <line
                  x1="41"
                  y1="8"
                  x2="7"
                  y2="48"
                  stroke="#d12b3d"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity=".9"
                />
              </svg>
            </div>
            <div
              style={{
                textAlign: "center",
                fontFamily: "Caveat,cursive",
                fontWeight: 700,
                fontSize: 12,
                color: "#2b1d14",
                lineHeight: 1.1,
                marginTop: 1,
              }}
            >
              {event.player.pseudo} †
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                color: "#2b1d14",
                lineHeight: 1.12,
              }}
            >
              {event.player.pseudo} n'est plus en vie
            </div>
            {event.reason && (
              <div
                style={{
                  fontSize: 10,
                  color: "#6a5444",
                  fontStyle: "italic",
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {event.reason}
              </div>
            )}
            <div
              style={{
                marginTop: 4,
                fontFamily: "var(--font-display)",
                fontSize: 9,
                letterSpacing: ".06em",
                color: factionColor,
              }}
            >
              · {faction}
            </div>
            {hasTestament && (
              <button
                onClick={() => onOpenTestament(event.player.id)}
                style={{
                  marginTop: 6,
                  fontFamily: "var(--font-display)",
                  fontSize: 8.5,
                  letterSpacing: ".08em",
                  color: "#9a6f2a",
                  border: "1px solid #c4a05a",
                  borderRadius: 3,
                  padding: "2px 7px",
                  background: "transparent",
                }}
              >
                ✒ LIRE LE TESTAMENT
              </button>
            )}
          </div>
        </div>
        <span
          style={{
            position: "absolute",
            right: 9,
            bottom: 9,
            fontFamily: "var(--font-display)",
            fontSize: 12.5,
            letterSpacing: ".05em",
            color: "#c2202f",
            border: "2.5px solid #c2202f",
            borderRadius: 4,
            padding: "2px 9px",
            transform: "rotate(-7deg)",
            opacity: 0.9,
          }}
        >
          DÉCÈS
        </span>
      </div>
    );
  }

  if (event.kind === "prison") {
    return (
      <div
        className="gz-item"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg,#fbe6c6,#f1d29c)",
          border: "1px solid #d99c4a",
          borderRadius: 3,
          padding: "8px 11px",
          transform: "rotate(0.6deg)",
          boxShadow: "0 7px 14px -10px rgba(0,0,0,.65)",
        }}
      >
        <span style={{ position: "absolute", top: -4, left: 14 }}>
          <Pin size={9} />
        </span>
        {/* Barreaux de prison sur le côté gauche */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 26,
            background: "repeating-linear-gradient(90deg,#8a5a1c 0 2.5px,transparent 2.5px 7.5px)",
            opacity: 0.5,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 26 }}>
          <span
            style={{
              flex: "none",
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              background: "radial-gradient(circle at 36% 30%,#f4a948,#c4711a 72%)",
              boxShadow: "0 3px 7px -3px rgba(0,0,0,.5),inset 0 0 0 1.5px rgba(255,255,255,.2)",
            }}
          >
            🔒
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 11.5,
                color: "#6a4012",
                lineHeight: 1.1,
              }}
            >
              {event.player.pseudo} part en prison
            </div>
            <div style={{ fontSize: 8.5, color: "#a36f24", fontStyle: "italic", marginTop: 1 }}>
              Écarté·e du tour.
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 7,
              letterSpacing: ".06em",
              color: "#fff",
              background: "#c4711a",
              borderRadius: 3,
              padding: "2px 6px",
              transform: "rotate(-3deg)",
              boxShadow: "0 2px 5px -2px rgba(0,0,0,.45)",
            }}
          >
            PRISON
          </span>
        </div>
      </div>
    );
  }

  // special — événement rare du MJ (morsure, émergence du Chasseur…)
  return (
    <div
      className="gz-item"
      style={{
        position: "relative",
        background: "linear-gradient(160deg,#6e1320,#511019)",
        borderRadius: 3,
        padding: "9px 11px",
        boxShadow: "0 8px 16px -10px rgba(0,0,0,.7)",
      }}
    >
      <span style={{ position: "absolute", top: -4, left: 14 }}>
        <Pin size={9} light />
      </span>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 7,
          letterSpacing: ".16em",
          color: "#e9a18d",
        }}
      >
        ★ ÉVÉNEMENT DU MJ · RARE
      </div>
      <div
        style={{ fontSize: 12, color: "#ffe7c2", marginTop: 3, paddingRight: 28, lineHeight: 1.25 }}
      >
        {event.text}
      </div>
      <span
        style={{
          position: "absolute",
          right: -7,
          bottom: -8,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "radial-gradient(circle at 36% 30%,#e0563f,#9e1f2e 72%)",
          boxShadow: "0 4px 9px -3px rgba(0,0,0,.6),inset 0 0 0 2px rgba(255,255,255,.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          transform: "rotate(-8deg)",
        }}
      >
        🦇
      </span>
    </div>
  );
}
