// PA3 — Suspicions « le mur » (DA The Board) : tableau de liège, photos polaroïd
// épinglées (grille 3×N), ficelle rouge, et bandeau « coin corné » plié dans
// l'angle haut-droit de chaque photo (verdict encré, visage dégagé).
// Cycle au tap : Neutre → Safe(innocent) → Doute(un doute) → Suspect.
// Persistance : role_meta.suspicion_board (server) + miroir localStorage (offline).
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import type { FrameContext } from "../registry";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { AllyStamp } from "@/components/AllyStamp";
import { PrisonBars } from "@/components/PrisonBars";
import { supabase } from "@/integrations/supabase/client";

type Level = 0 | 1 | 2 | 3;

// Chaque niveau : libellé (a11y) + couleur (token suspicion) + libellé/encre du
// bandeau « coin corné ».
const LEVELS = [
  { label: "", token: "var(--suspicion-0)", ribbon: "", ink: "" },
  {
    label: "innocent",
    token: "var(--suspicion-1)",
    ribbon: "Innocent",
    ink: "oklch(0.97 0.03 155)",
  },
  { label: "un doute", token: "var(--suspicion-2)", ribbon: "Douteux", ink: "oklch(0.28 0.06 70)" },
  { label: "suspect", token: "var(--suspicion-3)", ribbon: "Suspect", ink: "oklch(0.96 0.03 25)" },
] as const;

// Petite dispersion « épinglé à la main » déterministe par position.
const ROT = [-2, 1.4, -1.1, 1.8, -1.6, 1, -0.8, 1.6, -1.3];

// Hash stable d'un id → entier positif. On ancre rotation/scotch dessus (et non
// sur l'index de la liste) : ainsi une photo garde exactement sa place et son
// angle même si l'ordre du tableau `players` change entre deux refetch realtime
// (ex. joueurs au même `joined_at` → ordre Postgres non déterministe).
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

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

  // Ordre stable par id : évite tout réordonnancement des photos entre deux
  // refetch realtime (l'ordre Postgres n'est pas garanti à `joined_at` égal).
  const others = players
    .filter((p) => p.id !== me.id && !p.is_mj)
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return (
    <div className="cork-surface h-full flex flex-col">
      {/* Bandeau héro : intention de l'onglet (mêmes codes que le Testament). */}
      <header className="relative shrink-0 overflow-hidden px-5 pt-7 pb-4">
        <div
          className="pointer-events-none absolute inset-x-0 -top-16 h-40 opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.58 0.20 22 / 0.28), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground elevate">
            <Target className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Suspicions
            </div>
            <h2
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "oklch(0.72 0.19 22)" }}
            >
              Le mur des suspects
            </h2>
          </div>
        </div>
        <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
          Classe chaque joueur :{" "}
          <span className="font-semibold" style={{ color: "var(--suspicion-1)" }}>
            innocent
          </span>
          ,{" "}
          <span className="font-semibold" style={{ color: "var(--suspicion-2)" }}>
            un doute
          </span>{" "}
          ou{" "}
          <span className="font-semibold" style={{ color: "var(--suspicion-3)" }}>
            suspect
          </span>
          . Visible <span className="font-semibold text-foreground">par toi seul</span>.
        </p>
      </header>

      {/* Fond liège plein — les photos sont épinglées directement sur le mur. */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative">
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
            {others.map((p) => {
              const lvl = (levels[p.id] ?? 0) as Level;
              const L = LEVELS[lvl];
              const av = avatarOf(
                (p.role_meta as Record<string, unknown>)?.avatar as string | undefined,
                p.id,
              );
              const dim = !p.is_alive;
              // Rotation/scotch ancrés sur l'id (et non l'index) : stables même
              // si l'ordre de la liste bouge.
              const h = hashId(p.id);
              const rot = ROT[h % ROT.length];
              // Léger décalage d'angle du scotch, déterministe et « à la main ».
              const tapeRot = h % 2 === 0 ? -4 : 3.5;
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
                    {/* Bout de scotch (DA) — translucide, neutre, à cheval sur le bord
                        haut ; passe devant tout le reste (photo, croix, ruban). */}
                    <span
                      aria-hidden
                      className="absolute left-1/2 -top-1.5 z-40"
                      style={{
                        width: 36,
                        height: 15,
                        transform: `translateX(-50%) rotate(${tapeRot}deg)`,
                        background: "oklch(0.82 0.02 80 / 0.34)",
                        boxShadow: "0 1px 2px oklch(0 0 0 / 0.3)",
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
                        {p.is_alive && p.is_imprisoned && <PrisonBars />}
                        {/* Verdict : bandeau « coin corné » plié dans l'angle haut-droit */}
                        {lvl > 0 && (
                          <span
                            aria-hidden
                            className="absolute top-0 right-0 z-20 overflow-hidden pointer-events-none"
                            style={{ width: 56, height: 56 }}
                          >
                            <b
                              className="absolute flex items-center justify-center"
                              style={{
                                width: 82,
                                height: 16,
                                top: 12,
                                right: -20,
                                transform: "rotate(45deg)",
                                fontFamily: "var(--font-display)",
                                fontWeight: 400,
                                fontSize: 9,
                                lineHeight: 1,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                background: L.token,
                                color: L.ink,
                                boxShadow: "0 1px 3px oklch(0 0 0 / 0.45)",
                              }}
                            >
                              {L.ribbon}
                            </b>
                          </span>
                        )}
                      </div>
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
