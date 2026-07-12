import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { ChevronDown, Droplet, Feather } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { avatarOf, useAvatars } from "@/lib/avatars";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";

export const Route = createFileRoute("/fx-lab")({
  beforeLoad: requireLocalDevelopment,
  component: FxLab,
});

// ─────────────────────────────────────────────────────────────────────────
// FX Lab — onglet « Annonces » (PA6). Direction retenue : A « Cartes typées ».
// Fond de carte teinté par type + photo-signal (polaroïd barré = mort, photo
// barreaudée = prison, sceau de sang = morsure). Ici : 3 déclinaisons de A qui
// font varier la HIÉRARCHIE de lecture pour maximiser la lisibilité.
// ─────────────────────────────────────────────────────────────────────────

const DISPLAY = "var(--font-display)";

const CREAM = "#ecd7b0";
const CREAM_SOFT = "#bda57d";
const GOLD = "#e8b44a";
const DEATH = "#c2202f";
// Vraies couleurs de faction du jeu (styles.css) — Civil = bleu, Méchant = rouge.
const CIVIL = "var(--citoyens)"; // oklch(0.72 0.16 230)
const MECHANT = "var(--mechants)"; // oklch(0.62 0.24 22)
const BITE = "#c0304a";

type Tone = "death" | "prison" | "bite";

type AnnEvent = {
  id: string;
  tour: number;
  tone: Tone;
  name?: string;
  avatar?: string;
  title: string;
  meta?: string;
  factionLabel?: string;
  factionColor?: string;
  testament?: boolean;
};

const EVENTS: AnnEvent[] = [
  {
    id: "d-faye",
    tour: 2,
    tone: "death",
    name: "Faye",
    avatar: "kya",
    title: "Faye n'est plus en vie",
    factionLabel: "Civile",
    factionColor: CIVIL,
    testament: true,
  },
  {
    id: "p-jin",
    tour: 2,
    tone: "prison",
    name: "Jin",
    avatar: "leo",
    title: "Jin part en prison",
    // Pas de durée affichée : l'emprisonnement peut durer plusieurs tours.
  },
  {
    id: "d-milo",
    tour: 1,
    tone: "death",
    name: "Milo",
    avatar: "hana",
    title: "Milo n'est plus en vie",
    factionLabel: "Méchante",
    factionColor: MECHANT,
  },
  {
    id: "b-1",
    tour: 1,
    tone: "bite",
    title: "Un joueur a été mordu cette nuit",
    meta: "Rôle et cible tenus secrets",
  },
];

// Teintes de fond + encres par type (reprises des vrais écrans du manoir).
const TINT: Record<Tone, { bg: string; ink: string; sub: string; kick: string; darkBg: boolean }> = {
  death: { bg: "linear-gradient(180deg,#f6efdd,#ece1c6)", ink: "#2b1d14", sub: "#6f573b", kick: DEATH, darkBg: false },
  // Fond prison renforcé : ocre-bronze plus profond (thème cachot / fer), pour
  // contraster avec les barreaux d'acier de la photo.
  prison: { bg: "linear-gradient(180deg,#d9b163,#b07f2c)", ink: "#4a2f08", sub: "#6f4a12", kick: "#5a3608", darkBg: false },
  bite: { bg: "linear-gradient(160deg,#6e1320,#511019)", ink: "#ffe7c2", sub: "#e2a390", kick: "#e9a18d", darkBg: true },
};
const KICKER: Record<Tone, string> = { death: "Décès", prison: "Prison", bite: "Rumeur" };

function toursOf(events: AnnEvent[]): number[] {
  return Array.from(new Set(events.map((e) => e.tour))).sort((a, b) => b - a);
}

// ───────────────────────── Éléments-signal réutilisables ─────────────────────────

// ── Format polaroïd EXACT du « mur des suspects » (PA3Suspicions) ──────────

// Croix « décès » barrant la photo (deux traits rouge sang). Copie conforme.
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

// Barreaux d'acier + cadre de fer (photo visible derrière). Copie conforme.
function PrisonBars() {
  const bar = {
    width: "5%",
    background: "linear-gradient(90deg, #34383e 0%, #c8cdd3 32%, #8b9199 56%, #34383e 100%)",
    boxShadow: "1.5px 0 2px oklch(0 0 0 / 0.4)",
  };
  return (
    <span aria-hidden className="absolute inset-0 z-20 pointer-events-none">
      {["16%", "37%", "58%", "79%"].map((left) => (
        <span key={left} className="absolute top-0 bottom-0" style={{ left, ...bar }} />
      ))}
      <span
        className="absolute inset-0"
        style={{ border: "4px solid #1e2024", boxShadow: "inset 0 0 0 1px oklch(0.72 0.02 250 / 0.3)" }}
      />
    </span>
  );
}

// Polaroïd d'annonce : même cadre/photo/légende que les suspicions. `ringColor`
// colore le contour du cadre — à la mort, on y met la couleur de faction.
function AnnouncePolaroid({
  seed,
  name,
  tone,
  ringColor,
  w = 72,
}: {
  seed: string;
  name: string;
  tone: Tone;
  ringColor?: string;
  w?: number;
}) {
  const av = avatarOf(null, seed);
  // Angle du scotch « à la main », déterministe par seed (comme PA3Suspicions).
  const tapeRot = seed.length % 2 === 0 ? -4 : 3.5;
  return (
    <div
      className="relative shrink-0 p-1 pb-2"
      style={{
        width: w,
        background: "linear-gradient(180deg, oklch(0.95 0.02 90), oklch(0.90 0.03 82))",
        boxShadow: ringColor
          ? `0 0 0 2.5px ${ringColor}, 0 0 16px -2px ${ringColor}, 0 7px 14px -8px oklch(0 0 0 / 0.7)`
          : "0 7px 14px -8px oklch(0 0 0 / 0.7)",
      }}
    >
      {/* Bout de scotch translucide à cheval sur le bord haut (DA suspicions). */}
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
      <div className="relative">
        <div
          className="relative aspect-square w-full overflow-hidden grid place-items-center"
          style={{
            background:
              "repeating-linear-gradient(45deg, oklch(0.72 0.04 240), oklch(0.72 0.04 240) 6px, oklch(0.78 0.04 240) 6px, oklch(0.78 0.04 240) 12px)",
          }}
        >
          <AvatarImg avatar={av} fill rounded="none" className="w-full h-full" />
          {tone === "death" && <DeadCross />}
          {tone === "prison" && <PrisonBars />}
        </div>
      </div>
      <div
        className="text-center mt-2.5 leading-none truncate px-1"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: 13, color: "oklch(0.28 0.03 45)" }}
      >
        {name}
      </div>
    </div>
  );
}

// Sceau de sang — signal « morsure » (annonce anonyme, sans photo de joueur).
function BloodSeal({ size = 44 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 34% 30%, color-mix(in oklab, ${BITE} 78%, white), ${BITE})`,
        boxShadow: "0 4px 9px -3px rgba(0,0,0,.6), inset 0 0 0 2px rgba(255,255,255,.14)",
      }}
    >
      <Droplet className="size-4" style={{ color: "#fff" }} aria-hidden />
    </span>
  );
}

function ToneMedia({ e, w }: { e: AnnEvent; w: number }) {
  if (e.tone === "bite") return <BloodSeal size={Math.round(w * 0.62)} />;
  return (
    <AnnouncePolaroid
      seed={e.avatar ?? e.id}
      name={e.name!}
      tone={e.tone}
      ringColor={e.tone === "death" ? e.factionColor : undefined}
      w={w}
    />
  );
}

function FactionPill({ label, color, big }: { label: string; color: string; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-[0.08em] ${big ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"}`}
      style={{
        fontFamily: DISPLAY,
        // Cadre à la vraie couleur de faction (bleu Civil / rouge Méchant), bien
        // présent ; texte légèrement assombri pour rester lisible sur le papier.
        color: `color-mix(in oklab, ${color} 72%, black)`,
        border: `1.5px solid ${color}`,
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

// Bouton Testament — clairement cliquable : cadre + fond + verbe d'action.
function TestamentButton({ dark }: { dark?: boolean }) {
  if (dark) {
    return (
      <button
        type="button"
        className="press inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "#2b1d14", borderColor: GOLD, background: GOLD }}
      >
        <Feather className="size-3" aria-hidden />
        Lire le testament
      </button>
    );
  }
  return (
    <button
      type="button"
      className="press inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] shadow-sm"
      style={{
        color: "#7a4f16",
        borderColor: "#c4a05a",
        background: "linear-gradient(180deg,#f8edcb,#efd9a0)",
      }}
    >
      <Feather className="size-3" aria-hidden />
      Lire le testament
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function FxLab() {
  useAvatars(); // re-render quand le bucket d'avatars a chargé (photos réelles)
  return (
    <div className="min-h-dvh bg-[#130806] text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#130806]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
          <Link to="/" className="text-xs text-muted-foreground transition hover:text-gold">
            Accueil
          </Link>
          <span className="h-4 w-px bg-white/15" />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.34em] text-gold">
              FX Lab · onglet Annonces
            </div>
            <h1 className="text-lg font-semibold">Direction A — 3 déclinaisons lisibilité</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Base commune : cartes teintées par type + photo-signal (conservées). Ce qui change d'une
          déclinaison à l'autre, c'est la <strong className="text-foreground">hiérarchie de lecture</strong>.
          Dans un jeu de déduction, la <strong className="text-foreground">faction révélée</strong> à la
          mort est l'info la plus utile — chaque piste la met plus ou moins en avant.
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <PisteColumn
            id="A1"
            title="Grand titre"
            desc="On enlève le mini-label (la teinte + la photo disent déjà le type) et on grossit la phrase-clé. L'œil lit une seule chose : qui + quoi. Faction en pastille sous le titre."
          >
            <PhoneFrame>
              <DirHero />
            </PhoneFrame>
          </PisteColumn>

          <PisteColumn
            id="A2"
            title="Faction en évidence"
            desc="La faction révélée devient la vedette : grosse pastille colorée alignée à droite, lue d'un coup pour tout le tour. Idéal pour scanner « qui était méchant »."
          >
            <PhoneFrame>
              <DirFaction />
            </PhoneFrame>
          </PisteColumn>

          <PisteColumn
            id="A3"
            title="Compact dense"
            desc="Cartes plus fines, photo réduite, une ligne forte + point de faction inline. Tout le tour tient sans scroller : la lisibilité vient de voir tout d'un coup."
          >
            <PhoneFrame>
              <DirCompact />
            </PhoneFrame>
          </PisteColumn>
        </div>
      </main>
    </div>
  );
}

function PisteColumn({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="grid h-6 shrink-0 place-items-center rounded-full border border-gold/40 px-1.5 font-display text-[11px] text-gold">
          {id}
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex justify-center">{children}</div>
    </section>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full max-w-[360px] overflow-hidden rounded-[26px] border border-black/60 shadow-2xl"
      style={{ background: "radial-gradient(120% 80% at 50% -10%, #2a1410 0%, #1a0c08 45%, #120705 100%)" }}
    >
      <div className="h-[640px] overflow-y-auto px-4 pb-8 pt-5">{children}</div>
    </div>
  );
}

function ScreenHeader() {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: CREAM_SOFT }}>
          Chroniques du manoir
        </div>
        <h2 className="mt-0.5 font-display text-2xl font-bold" style={{ color: CREAM }}>
          Tour 2
        </h2>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold"
        style={{ borderColor: "#6a3b27", color: CREAM, background: "#1d0c08" }}
      >
        Joueurs
        <ChevronDown className="size-3.5" style={{ color: CREAM_SOFT }} aria-hidden />
      </button>
    </div>
  );
}

function TourLabel({ tour }: { tour: number }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center gap-2">
      <span className="font-display text-[11px] uppercase tracking-[0.16em]" style={{ color: GOLD }}>
        Tour {tour}
      </span>
      <span className="h-px flex-1" style={{ background: "#4a2a1e" }} />
    </div>
  );
}

// Coquille commune : itère les tours et rend une carte par event.
function Screen({ Card }: { Card: (props: { e: AnnEvent }) => ReactNode }) {
  const tours = toursOf(EVENTS);
  return (
    <div>
      <ScreenHeader />
      {tours.map((tour) => (
        <div key={tour} className="mb-4">
          <TourLabel tour={tour} />
          <div className="flex flex-col gap-2.5">
            {EVENTS.filter((e) => e.tour === tour).map((e) => (
              <Card key={e.id} e={e} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function cardStyle(tone: Tone) {
  return { background: TINT[tone].bg, boxShadow: "0 6px 14px -10px rgba(0,0,0,.7)" };
}

// ─────────────────────────── A1 · Grand titre ───────────────────────────
// Pas de mini-kicker. Titre agrandi. Faction en pastille sous le titre.

function DirHero() {
  return <Screen Card={HeroCard} />;
}

function HeroCard({ e }: { e: AnnEvent }) {
  const t = TINT[e.tone];
  return (
    <div className="flex items-center gap-3 rounded-md p-3" style={cardStyle(e.tone)}>
      <ToneMedia e={e} w={72} />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight" style={{ fontFamily: DISPLAY, color: t.ink }}>
          {e.title}
        </div>
        {(e.factionLabel || e.meta || e.testament) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {e.factionLabel ? (
              <FactionPill label={e.factionLabel} color={e.factionColor!} />
            ) : e.meta ? (
              <span className="text-[11px] italic" style={{ color: t.sub }}>
                {e.meta}
              </span>
            ) : null}
            {e.testament && <TestamentButton dark={t.darkBg} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── A2 · Faction en évidence ───────────────────────────
// Grosse pastille de faction alignée à droite, colonne constante à scanner.

function DirFaction() {
  return <Screen Card={FactionCard} />;
}

function FactionCard({ e }: { e: AnnEvent }) {
  const t = TINT[e.tone];
  return (
    <div className="flex items-center gap-3 rounded-md p-3" style={cardStyle(e.tone)}>
      <ToneMedia e={e} w={48} />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: t.kick }}>
          {KICKER[e.tone]}
        </div>
        <div className="mt-0.5 text-[13px] leading-tight" style={{ fontFamily: DISPLAY, color: t.ink }}>
          {e.title}
        </div>
        {e.testament && <div className="mt-1">{<TestamentButton dark={t.darkBg} />}</div>}
      </div>
      {/* Colonne droite constante : faction (mort) ou état (autres) */}
      <div className="flex shrink-0 flex-col items-end">
        {e.factionLabel ? (
          <>
            <span className="mb-1 text-[8px] uppercase tracking-[0.12em]" style={{ color: t.sub }}>
              Faction
            </span>
            <FactionPill label={e.factionLabel} color={e.factionColor!} big />
          </>
        ) : (
          <span className="max-w-[84px] text-right text-[10px] italic leading-tight" style={{ color: t.sub }}>
            {e.meta}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── A3 · Compact dense ───────────────────────────
// Fines rangées, photo réduite, une ligne forte + point de faction inline.

function DirCompact() {
  return <Screen Card={CompactCard} />;
}

function CompactCard({ e }: { e: AnnEvent }) {
  const t = TINT[e.tone];
  return (
    <div className="flex items-center gap-2.5 rounded-md py-2 pl-2.5 pr-3" style={cardStyle(e.tone)}>
      <ToneMedia e={e} w={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-tight" style={{ fontFamily: DISPLAY, color: t.ink }}>
          {e.title}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-tight">
          {e.factionLabel ? (
            <>
              <span className="size-2 rounded-full" style={{ background: e.factionColor }} />
              <span style={{ color: `color-mix(in oklab, ${e.factionColor} 60%, black)` }}>
                {e.factionLabel}
              </span>
            </>
          ) : (
            <span className="italic" style={{ color: t.sub }}>
              {e.meta}
            </span>
          )}
        </div>
      </div>
      {e.testament && <TestamentButton dark={t.darkBg} />}
    </div>
  );
}
