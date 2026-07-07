// PA3 — Suspicions « le mur » (DA The Board) : tableau de liège, photos polaroïd
// épinglées (grille 3×N), post-its de suspicion à cheval sur la photo, ficelle
// rouge, points d'interrogation orange (doute) et taches de sang (suspect).
// Cycle au tap : Neutre → Safe(innocent) → Doute(un doute) → Suspect.
// Persistance : role_meta.suspicion_board (server) + miroir localStorage (offline).
import { useEffect, useState } from "react";
import type { FrameContext } from "../registry";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { AllyStamp } from "@/components/AllyStamp";
import { supabase } from "@/integrations/supabase/client";

type Level = 0 | 1 | 2 | 3;

// Chaque niveau : libellé de post-it + couleur (token suspicion) + couleur d'encre.
const LEVELS = [
  { label: "", token: "var(--suspicion-0)", ink: "" },
  { label: "innocent", token: "var(--suspicion-1)", ink: "oklch(0.22 0.05 150)" },
  { label: "un doute", token: "var(--suspicion-2)", ink: "oklch(0.30 0.06 70)" },
  { label: "suspect", token: "var(--suspicion-3)", ink: "oklch(0.98 0.02 20)" },
] as const;

// Petite dispersion « épinglé à la main » déterministe par position.
const ROT = [-2, 1.4, -1.1, 1.8, -1.6, 1, -0.8, 1.6, -1.3];

// Décor « doute » : ? orange agrandis, posés sur les coins/la bande blanche.
const DOUTE_MARKS = [
  { top: -8, right: -3, size: 30, rot: 12 },
  { bottom: -5, left: 2, size: 23, rot: -12 },
];
// Décor « suspect » : taches de sang agrandies, sur les coins (partie blanche).
const BLOOD = [
  { top: -7, left: -5, w: 30, h: 25, rot: -14, o: 0.85 },
  { bottom: -4, right: 1, w: 21, h: 17, rot: 16, o: 0.72 },
];

// Croix « décès » barrant la photo d'un joueur mort (deux traits rouge sang).
function DeadCross() {
  return (
    <span aria-hidden className="absolute inset-0 z-20 pointer-events-none">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <g
          stroke="oklch(0.46 0.22 25)"
          strokeWidth="8"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 1px 2px oklch(0 0 0 / 0.65))" }}
        >
          <line x1="16" y1="16" x2="84" y2="84" />
          <line x1="84" y1="16" x2="16" y2="84" />
        </g>
      </svg>
    </span>
  );
}

// Chaînes d'acier traversant en diagonale la photo d'un joueur emprisonné.
function PrisonChains() {
  return (
    <span aria-hidden className="absolute inset-0 z-20 pointer-events-none">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <g strokeLinecap="round" style={{ filter: "drop-shadow(0 1px 2px oklch(0 0 0 / 0.7))" }}>
          {/* Ombre sous les maillons pour le relief */}
          <line
            x1="-6"
            y1="34"
            x2="106"
            y2="64"
            stroke="oklch(0.20 0.01 250)"
            strokeWidth="11"
            strokeDasharray="1 10"
          />
          <line
            x1="-6"
            y1="70"
            x2="106"
            y2="40"
            stroke="oklch(0.20 0.01 250)"
            strokeWidth="11"
            strokeDasharray="1 10"
          />
          {/* Maillons métalliques */}
          <line
            x1="-6"
            y1="34"
            x2="106"
            y2="64"
            stroke="oklch(0.74 0.015 250)"
            strokeWidth="8"
            strokeDasharray="1 10"
          />
          <line
            x1="-6"
            y1="70"
            x2="106"
            y2="40"
            stroke="oklch(0.74 0.015 250)"
            strokeWidth="8"
            strokeDasharray="1 10"
          />
        </g>
      </svg>
    </span>
  );
}

export function PA3Suspicions({ me, players, gameId, myRole, roles }: FrameContext) {
  const key = `mp_notes_${gameId}_${me.id}`;
  const myMeta = (me.role_meta ?? {}) as Record<string, unknown>;
  // Tampon « ALLIÉ » sur les photos des complices Méchants (vue Méchant).
  const viewerIsMechant = myRole?.faction === "Méchant";
  const isAlly = (pid: string, slug: string | null) =>
    viewerIsMechant && pid !== me.id && roles.get(slug ?? "")?.faction === "Méchant";

  const [levels, setLevels] = useState<Record<string, Level>>({});

  // Charge mes notes : priorité role_meta, fallback localStorage.
  useEffect(() => {
    const fromMeta = (myMeta.suspicion_board as Record<string, Level> | undefined) ?? null;
    if (fromMeta && Object.keys(fromMeta).length) {
      setLevels(fromMeta);
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setLevels(JSON.parse(raw));
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function bump(pid: string) {
    const cur = levels[pid] ?? 0;
    const next = ((cur + 1) % 4) as Level;
    const nx = { ...levels, [pid]: next };
    setLevels(nx);
    window.localStorage.setItem(key, JSON.stringify(nx));
    // Persistance server pour permettre l'espionnage par le Cartomancien.
    await supabase
      .from("players")
      .update({ role_meta: { ...myMeta, suspicion_board: nx } as never })
      .eq("id", me.id);
  }

  const others = players.filter((p) => p.id !== me.id && !p.is_mj);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tableau de liège encadré bois */}
      <div className="flex-1 overflow-y-auto p-3">
        <div
          className="relative rounded-xl p-3"
          style={{
            backgroundColor: "var(--cork)",
            backgroundImage: [
              // grain de liège (speckles sombres + clairs)
              "radial-gradient(oklch(0 0 0 / 0.13) 1px, transparent 1.7px)",
              "radial-gradient(oklch(1 0 0 / 0.05) 1px, transparent 1.7px)",
              // halo chaud en haut + vignette sombre en bas
              "radial-gradient(135% 80% at 50% -12%, oklch(0.48 0.09 46 / 0.55), transparent 55%)",
              "radial-gradient(125% 120% at 50% 118%, oklch(0.19 0.04 34 / 0.6), transparent 58%)",
            ].join(","),
            backgroundSize: "7px 7px, 11px 11px, 100% 100%, 100% 100%",
            backgroundPosition: "0 0, 3px 4px, 0 0, 0 0",
            boxShadow:
              "inset 0 0 0 6px var(--wood), inset 0 0 0 7px oklch(0 0 0 / 0.45), inset 0 0 0 9px var(--wood-dark), inset 0 0 60px oklch(0 0 0 / 0.55)",
          }}
        >
          {/* Ficelle rouge décorative reliant le mur */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 w-full h-full"
            style={{ opacity: 0.45 }}
          >
            <polyline
              points="20%,12% 52%,34% 28%,56% 74%,50% 46%,78%"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative grid grid-cols-3 gap-x-3.5 gap-y-5 px-1">
            {others.map((p, i) => {
              const lvl = (levels[p.id] ?? 0) as Level;
              const L = LEVELS[lvl];
              const av = avatarOf(
                (p.role_meta as Record<string, unknown>)?.avatar as string | undefined,
                p.id,
              );
              const dim = !p.is_alive;
              const rot = ROT[i % ROT.length];
              const pinColor = lvl > 0 ? L.token : "oklch(0.80 0.15 78)";
              return (
                <button
                  key={p.id}
                  onClick={() => bump(p.id)}
                  style={{ WebkitTapHighlightColor: "transparent", transform: `rotate(${rot}deg)` }}
                  className={`press relative touch-manipulation ${dim ? "opacity-45" : ""}`}
                  aria-label={`${p.pseudo}${L.label ? ` — ${L.label}` : ""}`}
                >
                  {/* Cadre polaroïd — contour coloré selon le niveau de suspicion */}
                  <div
                    className="relative p-1 pb-2"
                    style={{
                      background:
                        "linear-gradient(180deg, oklch(0.95 0.02 90), oklch(0.90 0.03 82))",
                      boxShadow:
                        lvl > 0
                          ? `0 0 0 2.5px ${L.token}, 0 0 16px -2px ${L.token}, 0 7px 14px -8px oklch(0 0 0 / 0.7)`
                          : "0 7px 14px -8px oklch(0 0 0 / 0.7)",
                    }}
                  >
                    {/* Épingle */}
                    <span
                      aria-hidden
                      className="absolute left-1/2 -translate-x-1/2 -top-1 size-2.5 rounded-full z-10"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${pinColor} 70%, white), ${pinColor})`,
                        boxShadow: "0 2px 3px oklch(0 0 0 / 0.5)",
                      }}
                    />
                    {/* Photo (carrée) + post-it à cheval sur son bord bas */}
                    <div className="relative">
                      <div
                        className="relative aspect-square w-full overflow-hidden grid place-items-center"
                        style={{
                          background:
                            "repeating-linear-gradient(45deg, oklch(0.72 0.04 240), oklch(0.72 0.04 240) 6px, oklch(0.78 0.04 240) 6px, oklch(0.78 0.04 240) 12px)",
                        }}
                      >
                        <AvatarImg avatar={av} fill rounded="none" className="w-full h-full" />
                        {/* Tampon ALLIÉ (vue Méchant) */}
                        {isAlly(p.id, p.role_slug) && <AllyStamp />}
                        {/* Mort : croix barrant la photo. Prison : chaînes en travers. */}
                        {!p.is_alive && <DeadCross />}
                        {p.is_alive && p.is_imprisoned && <PrisonChains />}
                      </div>
                      {/* Post-it de suspicion — à cheval entre la photo et la bande blanche, centré */}
                      {lvl > 0 && (
                        <span
                          className="absolute left-1/2 bottom-0 z-30 px-2 py-0.5 leading-none whitespace-nowrap"
                          style={{
                            fontFamily: "var(--font-hand)",
                            fontWeight: 700,
                            fontSize: 11,
                            background: L.token,
                            color: L.ink,
                            transform: "translate(-50%, 50%) rotate(-2deg)",
                            boxShadow: "0 3px 6px -2px oklch(0 0 0 / 0.5)",
                          }}
                        >
                          {L.label}
                        </span>
                      )}
                    </div>

                    {/* Nom manuscrit — abaissé, centré sous le post-it */}
                    <div
                      className="text-center mt-2.5 leading-none truncate px-1"
                      style={{
                        fontFamily: "var(--font-hand)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "oklch(0.28 0.03 45)",
                      }}
                    >
                      {p.pseudo}
                    </div>

                    {/* Doute : ? agrandis, posés sur les coins (partie blanche) */}
                    {lvl === 2 &&
                      DOUTE_MARKS.map((m, k) => {
                        const { size, rot: r, ...pos } = m;
                        return (
                          <span
                            key={k}
                            aria-hidden
                            className="absolute font-bold pointer-events-none z-20"
                            style={{
                              ...pos,
                              fontFamily: "var(--font-display)",
                              fontSize: size,
                              color: "oklch(0.72 0.19 55)",
                              textShadow: "0 1px 3px oklch(0 0 0 / 0.6)",
                              transform: `rotate(${r}deg)`,
                            }}
                          >
                            ?
                          </span>
                        );
                      })}

                    {/* Suspect : taches de sang agrandies, sur les coins (partie blanche) */}
                    {lvl === 3 &&
                      BLOOD.map((b, k) => {
                        const { w, h, rot: r, o, ...pos } = b;
                        return (
                          <span
                            key={k}
                            aria-hidden
                            className="absolute pointer-events-none z-20"
                            style={{
                              ...pos,
                              width: w,
                              height: h,
                              background:
                                "radial-gradient(circle at 40% 35%, oklch(0.46 0.22 25), oklch(0.34 0.20 22) 55%, transparent 74%)",
                              borderRadius: "60% 40% 55% 45%",
                              transform: `rotate(${r}deg)`,
                              opacity: o,
                            }}
                          />
                        );
                      })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aide en bas */}
      <div className="shrink-0 px-4 py-3 text-center">
        <span
          className="inline-block rounded-full px-4 py-1.5 text-sm bg-card/70 border border-border"
          style={{ fontFamily: "var(--font-hand)", color: "oklch(0.86 0.05 80)" }}
        >
          touche une photo → marque-la
        </span>
      </div>
    </div>
  );
}
