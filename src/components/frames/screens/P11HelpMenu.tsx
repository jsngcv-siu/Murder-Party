// P11 — Livre d'aide / Menu pause. Top-right sur tous les écrans pertinents.
// Onglets : Comment jouer · Les rôles · Mes infos partie.
import { useMemo, useRef, useState, type ElementType } from "react";
import type { FrameContext } from "../registry";
import type { RoleRow } from "@/engine/actions";
import { ITEM_CATALOG } from "@/engine/items";
import { RoleIcon } from "@/components/RoleIcon";
import { computeRoleFrequency, FREQ_COLORS } from "@/lib/roleAppearance";
import { highlightCapacity } from "@/lib/highlightCapacity";
import { extraInfoFor } from "@/lib/roleExtraInfo";
import { UsageCard } from "./P10Roles";
import {
  Shield,
  Swords,
  Search,
  Heart,
  VenetianMask,
  Skull,
  Flame,
  Smile,
  Home,
  LogOut,
  BookOpen,
  Target,
  Clock,
  Smartphone,
  Lightbulb,
  Sun,
  Bell,
  Gavel,
  Zap,
  Backpack,
  Feather,
  Megaphone,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  ShieldCheck,
  FlaskConical,
  Ban,
  Flag,
  Gauge,
  Moon,
  Repeat,
  Star,
  Hourglass,
  Info,
  Hand,
  Wine,
  Drama,
  Dices,
  Crosshair,
  Martini,
  type LucideIcon,
} from "lucide-react";
import { Sigil } from "@/components/Sigil";

type Tab = "howto" | "roles" | "objects" | "statuses";

const TABS: { id: Tab; Icon: LucideIcon; label: string; accent: string }[] = [
  { id: "howto", Icon: BookOpen, label: "Comment jouer", accent: "var(--primary)" },
  { id: "roles", Icon: VenetianMask, label: "Les rôles", accent: "oklch(0.74 0.15 300)" },
  { id: "objects", Icon: Backpack, label: "Les objets", accent: "oklch(0.80 0.14 75)" },
  { id: "statuses", Icon: ShieldCheck, label: "Les statuts", accent: "var(--citoyens)" },
];

export function P11HelpMenu({
  ctx,
  onClose,
  title = "Paramètres",
  allowedTabs,
  onLeave,
  onQuit,
}: {
  ctx: FrameContext;
  onClose: () => void;
  title?: string;
  allowedTabs?: Tab[];
  onLeave?: () => void;
  onQuit?: () => void;
}) {
  const tabs = allowedTabs ? TABS.filter((t) => allowedTabs.includes(t.id)) : TABS;
  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "howto");
  const [openRole, setOpenRole] = useState<RoleRow | null>(null);
  const cols = tabs.length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col max-w-md mx-auto">
      <header className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-border">
        <span className="text-sm font-semibold">{title}</span>
        <button
          onClick={onClose}
          aria-label="Fermer les paramètres"
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/70 transition active:scale-95"
        >
          <X className="size-4" /> Fermer
        </button>
      </header>

      <nav
        className="grid gap-1 p-2 border-b border-border bg-card/40"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => (
          <TabBtn
            key={t.id}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            Icon={t.Icon}
            label={t.label}
            accent={t.accent}
          />
        ))}
      </nav>

      <div className="flex-1 min-h-0 text-sm">
        {tab === "howto" && <HowTo ctx={ctx} />}
        {tab === "roles" && (
          <div className="h-full overflow-y-auto p-5">
            <RolesList ctx={ctx} onOpen={setOpenRole} />
          </div>
        )}
        {tab === "objects" && (
          <div className="h-full overflow-y-auto p-5">
            <ObjectsList />
          </div>
        )}
        {tab === "statuses" && (
          <div className="h-full overflow-y-auto p-5">
            <StatusList />
          </div>
        )}
      </div>

      {(onLeave || onQuit) && (
        <footer className="border-t border-border bg-card/60 p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {onLeave && (
            <button
              onClick={onLeave}
              className="w-full h-11 rounded-lg border border-border bg-card hover:bg-card/80 text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Home className="size-4" /> Retour à l'accueil
              <span className="text-[10px] text-muted-foreground">(la partie continue)</span>
            </button>
          )}
          {onQuit && (
            <button
              onClick={onQuit}
              className="w-full h-11 rounded-lg border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <LogOut className="size-4" /> Quitter la partie
            </button>
          )}
        </footer>
      )}

      {openRole && <RolePopup role={openRole} ctx={ctx} onClose={() => setOpenRole(null)} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  Icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-md transition-all ${
        active ? "bg-card/80 ring-1 ring-border shadow-sm" : "hover:bg-card/50"
      }`}
    >
      <Sigil active={active} size={26} accent={accent}>
        <Icon className="size-5" />
      </Sigil>
      <span
        className="text-[10px] uppercase tracking-wider font-semibold"
        style={{ color: active ? accent : "var(--muted-foreground)" }}
      >
        {label}
      </span>
    </button>
  );
}

// En-tête de slide (titre Cinzel + sous-titre).
function SlideHead({
  Icon,
  title,
  subtitle,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-4">
      <Icon className="size-6 mx-auto text-primary" aria-hidden />
      <h3
        className="mt-1.5 text-xl font-bold text-glow-gold leading-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
        {subtitle}
      </p>
    </div>
  );
}

// "Comment jouer" en slides horizontales (swipe sur mobile, flèches + points sur PC).
function HowTo({ ctx }: { ctx: FrameContext }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const slides: React.ReactNode[] = [
    // 1 — Le principe
    <div className="space-y-5" key="intro">
      <SlideHead Icon={BookOpen} title="Bienvenue" subtitle="Le principe" />

      {/* Hero dramatique — dégradé sang & or */}
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/25 p-5"
        style={{
          background:
            "linear-gradient(155deg, color-mix(in oklab, var(--mechants) 14%, var(--card)) 0%, var(--card) 55%, color-mix(in oklab, var(--primary) 12%, var(--card)) 100%)",
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 bg-mechants/15 rounded-full blur-2xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-8 -left-6 w-28 h-28 bg-primary/10 rounded-full blur-2xl"
          aria-hidden
        />
        <VenetianMask
          className="relative size-7 mx-auto mb-2.5 text-primary drop-shadow"
          aria-hidden
        />
        <p className="relative text-[15px] text-center leading-relaxed text-foreground">
          Un jeu à <span className="font-semibold text-primary">rôle caché</span>. Un{" "}
          <span className="font-semibold text-mechants">meurtre</span> a eu lieu&nbsp;: un{" "}
          <span className="font-semibold text-mechants">meurtrier</span> et ses{" "}
          <span className="font-semibold text-mechants">acolytes</span> se cachent parmi vous.
        </p>
        <p className="relative text-xs text-center italic text-muted-foreground mt-2">
          À vous de mener l'enquête… avant qu'il ne soit trop tard.
        </p>
      </div>

      <ol className="space-y-2.5">
        {[
          { t: "Tu reçois un rôle secret, avec une capacité bien à toi.", c: "var(--neutres)" },
          {
            t: "Chaque tour : tu agis en cachette, l'app révèle les dégâts, puis la table débat et vote.",
            c: "var(--primary)",
          },
          {
            t: "Ton camp l'emporte en remplissant sa condition de victoire.",
            c: "var(--citoyens)",
          },
        ].map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3"
          >
            <span
              className="shrink-0 grid place-items-center size-6 rounded-full text-[11px] font-bold border"
              style={{
                color: s.c,
                borderColor: `color-mix(in oklab, ${s.c} 45%, transparent)`,
                background: `color-mix(in oklab, ${s.c} 15%, transparent)`,
              }}
            >
              {i + 1}
            </span>
            <span className="text-sm text-muted-foreground leading-snug">{s.t}</span>
          </li>
        ))}
      </ol>
    </div>,

    // 2 — Le but
    <div className="space-y-4" key="goal">
      <SlideHead Icon={Target} title="Le but" subtitle="Trois camps" />
      <GoalCard
        Icon={Shield}
        title="Civils"
        tone="text-citoyens"
        ring="ring-citoyens/30"
        bg="bg-citoyens/8"
      >
        Démasquer et faire <b>emprisonner</b> les Méchants.
      </GoalCard>
      <GoalCard
        Icon={Swords}
        title="Méchants"
        tone="text-mechants"
        ring="ring-mechants/30"
        bg="bg-mechants/8"
      >
        Survivre et <b>éliminer</b> assez de Civils pour dominer.
      </GoalCard>
      <NeutresGoalCard />
    </div>,

    // 3 — Les 4 phases
    <div key="phases">
      <SlideHead Icon={Clock} title="Un tour, 4 phases" subtitle="La boucle du jeu" />
      <p className="text-[11px] text-muted-foreground mb-4 leading-snug text-center">
        Tu agis en secret, l'app révèle ce qui s'est passé, puis la table tranche.
      </p>
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />
        <PhaseStep
          number={1}
          Icon={Sun}
          title="Enquête"
          color="text-primary"
          accent="var(--primary)"
        >
          Tu circules, parles en privé et <b className="text-primary">utilises ta capacité</b> sur
          une cible. Tout se décide ici — mais{" "}
          <b className="text-foreground">rien n'est encore visible</b>.
        </PhaseStep>
        <PhaseStep
          number={2}
          Icon={Megaphone}
          title="Annonce"
          color="text-amber-400"
          accent="oklch(0.82 0.16 75)"
        >
          L'app révèle le <b className="text-amber-400">dénouement</b> :{" "}
          <b className="text-foreground">morts, prisons</b>, événements de la nuit — le résultat des
          capacités jouées en Enquête.
        </PhaseStep>
        <PhaseStep
          number={3}
          Icon={Bell}
          title="Débat"
          color="text-sky-400"
          accent="oklch(0.70 0.16 230)"
        >
          La table débat à voix haute :{" "}
          <b className="text-sky-300">accusations, défenses, déductions</b>. Aucune capacité ne se
          joue ici — <b className="text-sky-300">seule la parole compte</b>.
        </PhaseStep>
        <PhaseStep
          number={4}
          Icon={Gavel}
          title="Vote"
          color="text-destructive"
          accent="var(--destructive)"
        >
          Chacun désigne un suspect. Le plus voté part en <b className="text-orange-400">prison</b>{" "}
          (<b className="text-orange-400">capacité bloquée</b>). Puis un{" "}
          <b className="text-foreground">nouveau tour</b> commence.
        </PhaseStep>
      </div>
    </div>,

    // 4 — Ta capacité : à quel rythme l'utiliser (cadres dépliables → rôles concernés)
    <CapacitySlide ctx={ctx} key="usage" />,

    // 5 — Ton téléphone (interactif)
    <PhoneSlide key="phone" />,

    // 6 — Conseils
    <TipsSlide key="tips" />,
  ];

  const count = slides.length;
  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const c = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: c * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (el) setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-center overflow-y-auto px-5 py-5">
            {s}
          </div>
        ))}
      </div>

      {/* Navigation — flèches (PC) + points ; swipe natif sur mobile */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-t border-border bg-card/30">
        <button
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          aria-label="Précédent"
          className="grid place-items-center size-9 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 transition active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Page ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"}`}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(idx + 1)}
          disabled={idx === count - 1}
          aria-label="Suivant"
          className="grid place-items-center size-9 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 transition active:scale-95"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

function GoalCard({
  Icon,
  title,
  tone,
  ring,
  bg,
  children,
}: {
  Icon: LucideIcon;
  title: string;
  tone: string;
  ring: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${ring} ${bg} p-3.5`}>
      <div className="shrink-0 w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
        <Icon className={`size-5 ${tone}`} aria-hidden />
      </div>
      <div>
        <div className={`text-sm font-bold ${tone}`}>{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5 leading-snug">{children}</div>
      </div>
    </div>
  );
}

// Les trois sous-camps neutres, regroupés par comportement (couleurs dédiées).
const NEUTRE_SOUSCAMPS: {
  Icon: LucideIcon;
  color: string;
  label: string;
  goal: string;
  ex: string;
}[] = [
  {
    Icon: Star,
    color: "oklch(0.80 0.12 300)",
    label: "Solitaires",
    goal: "Remplissent un objectif personnel et pacifique — sans tuer.",
    ex: "Oracle, Entremetteur…",
  },
  {
    Icon: VenetianMask,
    color: "var(--vampires)",
    label: "Subversifs",
    goal: "Convertissent ou infectent la table pour la retourner à leur cause.",
    ex: "Vampire, Empoisonneur, Veuve noire…",
  },
  {
    Icon: Swords,
    color: "oklch(0.70 0.19 35)",
    label: "Tueurs neutres",
    goal: "Éliminent pour leur propre compte, selon leur quota secret.",
    ex: "Taupe, Veuve noire, Parieur tricheur…",
  },
];

function NeutresGoalCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border ring-neutres/30 bg-neutres/8 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-3.5 text-left active:scale-[0.99] transition"
        aria-expanded={open}
      >
        <div className="shrink-0 w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
          <VenetianMask className="size-5 text-neutres" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-neutres">Neutres</span>
            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutres/70 rounded-full border border-neutres/30 px-1.5 py-0.5">
              3 sous-camps
            </span>
          </div>
          <div className="text-sm text-muted-foreground mt-0.5 leading-snug">
            Chacun a sa propre <b>condition de victoire</b>.
          </div>
        </div>
        <ChevronDown
          className={`size-4 mt-1 shrink-0 text-neutres transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0.5 space-y-1.5">
          {NEUTRE_SOUSCAMPS.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border p-2.5"
              style={{
                borderColor: `color-mix(in oklab, ${s.color} 32%, transparent)`,
                background: `color-mix(in oklab, ${s.color} 9%, transparent)`,
              }}
            >
              <div className="flex items-center gap-2">
                <s.Icon className="size-4 shrink-0" style={{ color: s.color }} aria-hidden />
                <span className="text-[13px] font-bold" style={{ color: s.color }}>
                  {s.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground leading-snug mt-1">{s.goal}</div>
              <div
                className="text-[10px] italic mt-1"
                style={{ color: `color-mix(in oklab, ${s.color} 70%, var(--muted-foreground))` }}
              >
                {s.ex}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseStep({
  number,
  Icon,
  title,
  color,
  accent,
  children,
}: {
  number: number;
  Icon: LucideIcon;
  title: string;
  color: string;
  accent?: string;
  children: React.ReactNode;
}) {
  const tint = accent ?? "var(--primary)";
  return (
    <div className="relative">
      <div
        className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-card border flex items-center justify-center text-[10px] font-bold shadow-sm z-10"
        style={{ color: tint, borderColor: `color-mix(in oklab, ${tint} 55%, transparent)` }}
      >
        {number}
      </div>
      <div
        className="rounded-xl border p-3.5"
        style={{
          borderColor: `color-mix(in oklab, ${tint} 28%, var(--border))`,
          background: `linear-gradient(100deg, color-mix(in oklab, ${tint} 14%, var(--card)) 0%, color-mix(in oklab, var(--card) 70%, transparent) 80%)`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`size-4 ${color}`} aria-hidden />
          <span className={`text-sm font-bold ${color}`}>{title}</span>
        </div>
        <div className="text-sm text-muted-foreground leading-snug">{children}</div>
      </div>
    </div>
  );
}

// Slide "Ton téléphone" — onglets en accordéon (touche pour le détail) + cadres
// de statuts réels (mêmes badges duotone que la StatusBandeau en jeu).
const ONGLETS: { Icon: LucideIcon; accent: string; label: string; detail: string }[] = [
  {
    Icon: Zap,
    accent: "var(--primary)",
    label: "Capacité",
    detail:
      "Le cœur de ton rôle : choisis ta cible, lis le résultat de tes actions, et accède au chat secret si ton rôle en a un.",
  },
  {
    Icon: Target,
    accent: "var(--destructive)",
    label: "Suspicions",
    detail:
      "Note ton niveau de soupçon sur chaque joueur (de « sûr » à « suspect »). C'est privé — personne ne le voit.",
  },
  {
    Icon: Megaphone,
    accent: "var(--citoyens)",
    label: "Annonces",
    detail:
      "Le journal du manoir : toutes les morts, prisons et événements, tour par tour. Ta meilleure source d'indices.",
  },
  {
    Icon: Backpack,
    accent: "oklch(0.78 0.15 55)",
    label: "Inventaire",
    detail: "Les objets que tu as reçus. Touche-en un pour voir son effet et l'utiliser.",
  },
  {
    Icon: Feather,
    accent: "oklch(0.74 0.15 300)",
    label: "Testament",
    detail:
      "Écris un dernier message, révélé au cimetière si tu meurs. Une ultime accusation… ou un mensonge.",
  },
];

const STATUTS: { Icon: LucideIcon; color: string; label: string; effet: string }[] = [
  {
    Icon: ShieldCheck,
    color: "oklch(0.72 0.16 230)",
    label: "Protégé",
    effet: "Toute attaque qui te vise est bloquée.",
  },
  {
    Icon: FlaskConical,
    color: "oklch(0.74 0.16 155)",
    label: "Empoisonné",
    effet: "Sans soin, tu meurs à la prochaine Annonce.",
  },
  {
    Icon: Ban,
    color: "oklch(0.65 0.22 18)",
    label: "Bloqué",
    effet: "Capacité et objets inutilisables ce tour.",
  },
  {
    Icon: Sparkles,
    color: "oklch(0.85 0.16 95)",
    label: "Béni",
    effet: "Les actions malveillantes qui te visent sont annulées.",
  },
  {
    Icon: Flag,
    color: "oklch(0.78 0.16 55)",
    label: "Suspect",
    effet: "Accusé en public — ça pèse sur les votes.",
  },
  {
    Icon: Lock,
    color: "oklch(0.80 0.14 75)",
    label: "Prison",
    effet: "Capacité bloquée jusqu'à ta libération.",
  },
  {
    Icon: Skull,
    color: "oklch(0.74 0.10 150)",
    label: "Mort",
    effet: "Tu observes la partie et rejoins le chat des morts.",
  },
];

function PhoneSlide() {
  const [open, setOpen] = useState<string | null>("Capacité");
  return (
    <div className="space-y-5">
      <SlideHead Icon={Smartphone} title="Ton téléphone" subtitle="Touche pour le détail" />

      <div>
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">
          Tes onglets
        </h4>
        <div className="space-y-1.5">
          {ONGLETS.map((o) => {
            const isOpen = open === o.label;
            return (
              <div
                key={o.label}
                className="rounded-xl border border-border bg-card/40 overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : o.label)}
                  className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition"
                >
                  <o.Icon className="size-5 shrink-0" style={{ color: o.accent }} aria-hidden />
                  <span className="flex-1 text-sm font-semibold">{o.label}</span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <p className="px-3 pb-3 -mt-1 text-xs text-muted-foreground leading-relaxed">
                    {o.detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1 font-semibold">
          Les statuts
        </h4>
        <p className="text-[11px] text-muted-foreground mb-2.5 leading-snug">
          Affichés en haut de ton écran. Les principaux et leur effet :
        </p>
        <div className="space-y-1.5">
          {STATUTS.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span
                className="shrink-0 inline-flex items-center gap-1 w-[124px] pl-1 pr-2 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-tight"
                style={{
                  color: s.color,
                  borderColor: `color-mix(in oklab, ${s.color} 38%, transparent)`,
                  background: `color-mix(in oklab, ${s.color} 12%, transparent)`,
                }}
              >
                <span
                  className="inline-flex items-center justify-center size-[18px] rounded-full shrink-0"
                  style={{
                    background: `color-mix(in oklab, ${s.color} 18%, oklch(0.12 0.02 35 / 0.7))`,
                  }}
                >
                  <s.Icon className="size-3" style={{ color: s.color }} aria-hidden />
                </span>
                <span className="truncate">{s.label}</span>
              </span>
              <span className="text-[11px] text-muted-foreground leading-snug">{s.effet}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Slide "Ta capacité" — chaque cadence est un bouton dépliable qui révèle les
// rôles concernés (icône + nom). La cadence est déduite du `usage_label`
// (source de vérité documentée) avec repli sur `phase_activation`.
type Cadence = "passive" | "free" | "once" | "limited";

function cadenceOf(role: RoleRow): Cadence {
  const lbl = (role.usage_label ?? "").toLowerCase();
  const phase = (role.phase_activation ?? "").toLowerCase();
  if (/permanent|passi/.test(lbl) || /permanent/.test(phase)) return "passive";
  if (/1×\s*\/\s*partie|1x\/partie/.test(lbl)) return "once";
  if (
    /limit|scaled|max\s*\d|\/\s*cycle\s*max/.test(lbl) ||
    ["executeur", "juge", "cleaner", "apothicaire"].includes(role.slug)
  )
    return "limited";
  // Refonte boucle : toutes les capacités actives se jouent en Enquête → "free".
  if (/setup/.test(lbl) || /setup/.test(phase)) return "passive";
  return "free";
}

const CADENCE_META: {
  key: Cadence;
  Icon: LucideIcon;
  color: string;
  label: string;
  desc: string;
}[] = [
  {
    key: "passive",
    Icon: Moon,
    color: "var(--muted-foreground)",
    label: "Passive",
    desc: "S'active toute seule — rien à faire de ta part.",
  },
  {
    key: "free",
    Icon: Repeat,
    color: "var(--primary)",
    label: "Chaque Enquête",
    desc: "Réutilisable à chaque tour, sur une nouvelle cible.",
  },
  {
    key: "once",
    Icon: Star,
    color: "oklch(0.82 0.16 75)",
    label: "1× par partie",
    desc: "Un seul usage : choisis bien ton moment.",
  },
  {
    key: "limited",
    Icon: Hourglass,
    color: "oklch(0.72 0.18 45)",
    label: "Limitée",
    desc: "Quelques usages seulement, parfois selon le nombre de joueurs.",
  },
];

function CapacitySlide({ ctx }: { ctx: FrameContext }) {
  // Cadres dépliables → rôles concernés par chaque rythme d'utilisation.
  const [open, setOpen] = useState<Cadence | null>(null);
  const byCadence = useMemo(() => {
    const map = new Map<Cadence, RoleRow[]>();
    for (const r of ctx.roles.values()) {
      const c = cadenceOf(r);
      const arr = map.get(c) ?? [];
      arr.push(r);
      map.set(c, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name_fr.localeCompare(b.name_fr));
    return map;
  }, [ctx.roles]);

  return (
    <div className="space-y-4">
      <SlideHead Icon={Gauge} title="Ta capacité" subtitle="Touche pour voir les rôles" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        Chaque rôle agit à son propre rythme. Touche un cas pour découvrir{" "}
        <b className="text-foreground">quels rôles</b> s'y rattachent :
      </p>
      <div className="space-y-2">
        {CADENCE_META.map((u) => {
          const roles = byCadence.get(u.key) ?? [];
          const isOpen = open === u.key;
          return (
            <div
              key={u.key}
              className="rounded-xl border bg-card/40 overflow-hidden transition-colors"
              style={{
                borderColor: isOpen
                  ? `color-mix(in oklab, ${u.color} 45%, transparent)`
                  : "var(--border)",
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : u.key)}
                className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition"
                aria-expanded={isOpen}
              >
                <span
                  className="shrink-0 grid place-items-center size-9 rounded-lg border"
                  style={{
                    color: u.color,
                    borderColor: `color-mix(in oklab, ${u.color} 35%, transparent)`,
                    background: `color-mix(in oklab, ${u.color} 10%, transparent)`,
                  }}
                >
                  <u.Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: u.color }}>
                    {u.label}
                  </div>
                  <div className="text-xs text-muted-foreground leading-snug">{u.desc}</div>
                </div>
                <span
                  className="shrink-0 text-[10px] font-bold rounded-full px-1.5 py-0.5 border tabular-nums"
                  style={{
                    color: u.color,
                    borderColor: `color-mix(in oklab, ${u.color} 30%, transparent)`,
                    background: `color-mix(in oklab, ${u.color} 8%, transparent)`,
                  }}
                >
                  {roles.length}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-0.5">
                  {roles.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground italic py-2">
                      Aucun rôle dans cette catégorie.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {roles.map((r) => (
                        <div
                          key={r.slug}
                          className="flex flex-col items-center gap-1 rounded-lg p-1.5"
                          style={{ background: `color-mix(in oklab, ${u.color} 7%, transparent)` }}
                          title={r.name_fr}
                        >
                          <RoleIcon role={r} size={36} />
                          <div className="text-[9px] text-center leading-tight line-clamp-2 text-muted-foreground">
                            {r.name_fr}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Lightbulb className="size-4 shrink-0 text-primary mt-0.5" aria-hidden />
        <p className="text-[11px] text-muted-foreground leading-snug">
          Ta fréquence exacte (et le moment où tu peux agir) est indiquée sur ta fiche, dans
          l'onglet <b className="text-foreground">Capacité</b>.
        </p>
      </div>
    </div>
  );
}

// Slide "Conseils" — cartes-boutons dépliables : titre + détail/exemple/subtilité.
// Pensé pour rendre le jeu « clé en main », même quand une partie est difficile.
const TIPS: {
  Icon: LucideIcon;
  accent: string;
  title: string;
  lead: string;
  detail: React.ReactNode;
}[] = [
  {
    Icon: Megaphone,
    accent: "oklch(0.82 0.16 75)",
    title: "Lis les Annonces comme un détective",
    lead: "Chaque mort, protection ou prison est un indice.",
    detail: (
      <>
        Croise le <b className="text-foreground">qui</b>, le{" "}
        <b className="text-foreground">quand</b> et le <b className="text-foreground">comment</b> de
        chaque événement.
        <span className="block mt-1.5 italic">
          Exemple : une cible « Protégée » qui survit révèle qu'un Protecteur veillait sur elle… et
          qu'on a essayé de la tuer.
        </span>
      </>
    ),
  },
  {
    Icon: VenetianMask,
    accent: "var(--mechants)",
    title: "Le téléphone ne joue pas à ta place",
    lead: "La vraie partie se passe à la table.",
    detail: (
      <>
        L'app arbitre, mais c'est à voix haute que tu{" "}
        <b className="text-foreground">accuses, défends, mens et manipules</b>.
        <span className="block mt-1.5 italic">
          Subtilité : un silence trop prudent est aussi suspect qu'une accusation maladroite.
        </span>
      </>
    ),
  },
  {
    Icon: Search,
    accent: "var(--citoyens)",
    title: "Connais tes adversaires",
    lead: "Ouvre l'onglet Les rôles avant et pendant la partie.",
    detail: (
      <>
        Savoir quelles capacités existent change ta lecture des événements.
        <span className="block mt-1.5 italic">
          Exemple : si tu sais qu'un Empoisonneur peut exister, une mort « différée » d'un tour
          devient un indice, pas un mystère.
        </span>
      </>
    ),
  },
  {
    Icon: Gauge,
    accent: "var(--primary)",
    title: "Dose ta capacité",
    lead: "Surtout celles en 1× par partie.",
    detail: (
      <>
        Une capacité unique gâchée au premier tour ne reviendra pas — mais gardée trop longtemps,
        elle meurt avec toi.
        <span className="block mt-1.5 italic">
          Subtilité : agis quand l'info que tu as est la plus fiable, pas dès que tu en as
          l'occasion.
        </span>
      </>
    ),
  },
  {
    Icon: Target,
    accent: "var(--destructive)",
    title: "Note tes suspicions",
    lead: "L'onglet Suspicions est privé — personne ne le voit.",
    detail: (
      <>
        Marque chaque joueur de « sûr » à « suspect » et fais évoluer ta lecture tour après tour.
        <span className="block mt-1.5 italic">
          Exemple : recoupe qui a voté contre qui avec qui est mort ensuite — les coïncidences
          trahissent les camps.
        </span>
      </>
    ),
  },
  {
    Icon: Gavel,
    accent: "oklch(0.78 0.16 55)",
    title: "Le vote emprisonne, il ne tue pas",
    lead: "Le plus voté part en prison : sa capacité est bloquée.",
    detail: (
      <>
        C'est une arme pour <b className="text-foreground">neutraliser un rôle dangereux</b> sans
        preuve absolue — le temps d'y voir plus clair.
        <span className="block mt-1.5 italic">
          Subtilité : emprisonner un innocent utile (Médecin, Détective) fait le jeu des Méchants.
          Vise juste.
        </span>
      </>
    ),
  },
];

function TipsSlide() {
  // Cartes-conseils dépliables (clé en main pour les nouveaux joueurs).
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <SlideHead Icon={Lightbulb} title="Conseils" subtitle="Touche pour les détails" />
      <p className="text-[11px] text-muted-foreground -mt-1 text-center leading-snug">
        Le jeu peut être corsé — voici les clés pour t'y retrouver dès la première partie.
      </p>
      <div className="space-y-2">
        {TIPS.map((tip) => {
          const isOpen = open === tip.title;
          return (
            <div
              key={tip.title}
              className="rounded-xl border overflow-hidden transition-colors"
              style={{
                borderColor: isOpen
                  ? `color-mix(in oklab, ${tip.accent} 45%, transparent)`
                  : "var(--border)",
                background: isOpen
                  ? `color-mix(in oklab, ${tip.accent} 8%, transparent)`
                  : "color-mix(in oklab, var(--card) 40%, transparent)",
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : tip.title)}
                className="w-full flex items-start gap-3 p-3 text-left active:scale-[0.99] transition"
                aria-expanded={isOpen}
              >
                <span
                  className="shrink-0 grid place-items-center size-9 rounded-lg border"
                  style={{
                    color: tip.accent,
                    borderColor: `color-mix(in oklab, ${tip.accent} 35%, transparent)`,
                    background: `color-mix(in oklab, ${tip.accent} 12%, transparent)`,
                  }}
                >
                  <tip.Icon className="size-5" aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{tip.title}</span>
                  {!isOpen && (
                    <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
                      {tip.lead}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`size-4 mt-1 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <p className="px-3 pb-3 -mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {tip.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Légende des types de rôles (mêmes icônes/couleurs que le badge "type" de la fiche).
const TYPE_LEGEND: { Icon: LucideIcon; color: string; label: string; desc: string }[] = [
  {
    Icon: Shield,
    color: "oklch(0.70 0.18 145)",
    label: "Protecteur",
    desc: "Protège un joueur d'une attaque.",
  },
  { Icon: Swords, color: "oklch(0.62 0.24 22)", label: "Tueur", desc: "Élimine des joueurs." },
  {
    Icon: Search,
    color: "oklch(0.65 0.14 220)",
    label: "Investigation",
    desc: "Récolte des infos (rôle, faction…).",
  },
  {
    Icon: Heart,
    color: "oklch(0.75 0.12 20)",
    label: "Support",
    desc: "Aide, soigne ou lie les joueurs.",
  },
  {
    Icon: VenetianMask,
    color: "oklch(0.65 0.12 300)",
    label: "Tromperie",
    desc: "Déguise, brouille les pistes, manipule.",
  },
  { Icon: Skull, color: "oklch(0.55 0.20 22)", label: "Mal", desc: "Pouvoirs malveillants." },
  { Icon: Flame, color: "oklch(0.75 0.18 50)", label: "Chaos", desc: "Sème le désordre." },
  {
    Icon: Smile,
    color: "oklch(0.70 0.14 150)",
    label: "Bénin",
    desc: "Inoffensif, rôle d'ambiance.",
  },
];

function RolesList({ ctx, onOpen }: { ctx: FrameContext; onOpen: (r: RoleRow) => void }) {
  const all = useMemo(
    // Le codex joueur ne montre que les rôles réellement jouables : on exclut les
    // rôles désactivés en base (ex. le Détective, remplacé par l'Assistant). Les
    // rôles émergents (ex. Chasseur de Vampire) restent visibles : un joueur peut
    // les rencontrer en partie.
    () =>
      Array.from(ctx.roles.values())
        .filter((r) => !r.is_disabled)
        .sort((a, b) => a.name_fr.localeCompare(b.name_fr)),
    [ctx.roles],
  );
  const [q, setQ] = useState("");
  const [faction, setFaction] = useState<"all" | "Civil" | "Méchant" | "Neutre">("all");
  const [legendOpen, setLegendOpen] = useState(false);

  const factions = [
    {
      key: "all" as const,
      label: "Tous",
      Icon: Sparkles,
      tone: "text-gold",
      ring: "ring-gold/40",
      bg: "bg-gold/10",
    },
    {
      key: "Civil" as const,
      label: "Civils",
      Icon: Shield,
      tone: "text-citoyens",
      ring: "ring-citoyens/40",
      bg: "bg-citoyens/10",
    },
    {
      key: "Méchant" as const,
      label: "Méchants",
      Icon: Swords,
      tone: "text-destructive",
      ring: "ring-destructive/40",
      bg: "bg-destructive/10",
    },
    {
      key: "Neutre" as const,
      label: "Neutres",
      Icon: VenetianMask,
      tone: "text-neutres",
      ring: "ring-neutres/40",
      bg: "bg-neutres/10",
    },
  ];

  const counts = useMemo(() => {
    const c = { all: all.length, Civil: 0, Méchant: 0, Neutre: 0 } as Record<string, number>;
    for (const r of all) {
      if (r.faction === "Civil") c.Civil++;
      else if (r.faction === "Méchant" || r.slug === "vampire") c.Méchant++;
      else c.Neutre++;
    }
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return all.filter((r) => {
      const isVamp = r.slug === "vampire";
      const f = isVamp ? "Méchant" : r.faction;
      if (faction !== "all" && f !== faction) return false;
      if (!k) return true;
      return r.name_fr.toLowerCase().includes(k) || (r.description ?? "").toLowerCase().includes(k);
    });
  }, [all, q, faction]);

  const toneFor = (r: RoleRow) => {
    const f = r.slug === "vampire" ? "Méchant" : r.faction;
    if (f === "Civil")
      return {
        ring: "ring-citoyens/30",
        bg: "bg-citoyens/8",
        tone: "text-citoyens",
        label: "Civil",
      };
    if (f === "Méchant")
      return {
        ring: "ring-destructive/30",
        bg: "bg-destructive/8",
        tone: "text-destructive",
        label: "Méchant",
      };
    return { ring: "ring-neutres/30", bg: "bg-neutres/8", tone: "text-neutres", label: "Neutre" };
  };

  return (
    <div className="space-y-3">
      {/* Recherche */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher un rôle"
          placeholder="Rechercher un rôle…"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
      </div>

      {/* Filtres faction en chips */}
      <div className="grid grid-cols-4 gap-1.5">
        {factions.map((f) => {
          const active = faction === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFaction(f.key)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg ring-1 transition ${
                active
                  ? `${f.bg} ${f.ring} ${f.tone}`
                  : "bg-card/40 ring-border text-muted-foreground hover:bg-card"
              }`}
            >
              <f.Icon className="size-4" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-wider leading-tight">
                {f.label}
              </span>
              <span className="text-[9px] opacity-70">{counts[f.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Légende des types de rôles (dépliable) */}
      <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left active:scale-[0.99] transition"
        >
          <Info className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="flex-1 text-xs font-semibold">Comprendre les types de rôles</span>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${legendOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {legendOpen && (
          <div className="px-3 pb-3 pt-0.5 space-y-1.5">
            {TYPE_LEGEND.map((t) => (
              <div key={t.label} className="flex items-center gap-2.5">
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 w-[120px] px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-tight"
                  style={{
                    color: t.color,
                    borderColor: `color-mix(in oklab, ${t.color} 35%, transparent)`,
                    background: `color-mix(in oklab, ${t.color} 12%, transparent)`,
                  }}
                >
                  <t.Icon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug">{t.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grille compacte */}
      {filtered.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8">Aucun rôle trouvé</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((r) => {
            const t = toneFor(r);
            return (
              <button
                key={r.slug}
                onClick={() => onOpen(r)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-2.5 ring-1 ${t.ring} ${t.bg} hover:brightness-125 hover:scale-[1.02] transition-all`}
                title={r.name_fr}
              >
                <RoleIcon role={r} size={44} />
                <div className="text-[11px] font-medium text-center leading-tight line-clamp-2">
                  {r.name_fr}
                </div>
                <span
                  className={`text-[8px] font-semibold uppercase tracking-wider ${t.tone} opacity-80`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-center text-muted-foreground pt-1">
        {filtered.length} rôle{filtered.length > 1 ? "s" : ""} · touche pour ouvrir la fiche
      </div>
    </div>
  );
}

function RolePopup({
  role,
  ctx,
  onClose,
}: {
  role: RoleRow;
  ctx: FrameContext;
  onClose: () => void;
}) {
  const typeMeta: Record<string, { icon: ElementType; color: string }> = {
    PROTECTEUR: { icon: Shield, color: "oklch(0.70 0.18 145)" },
    TUEUR: { icon: Swords, color: "oklch(0.62 0.24 22)" },
    INVESTIGATION: { icon: Search, color: "oklch(0.65 0.14 220)" },
    SUPPORT: { icon: Heart, color: "oklch(0.75 0.12 20)" },
    TROMPERIE: { icon: VenetianMask, color: "oklch(0.65 0.12 300)" },
    MAL: { icon: Skull, color: "oklch(0.55 0.20 22)" },
    CHAOS: { icon: Flame, color: "oklch(0.75 0.18 50)" },
    BÉNIN: { icon: Smile, color: "oklch(0.70 0.14 150)" },
  };
  const t = typeMeta[role.type ?? ""] ?? { icon: Shield, color: "var(--muted-foreground)" };
  const TIcon = t.icon;
  const fcolor =
    role.faction === "Civil"
      ? "var(--citoyens)"
      : role.faction === "Méchant"
        ? "var(--mechants)"
        : "var(--neutres)";
  const fbg =
    role.faction === "Civil"
      ? "oklch(0.72 0.16 230 / 0.12)"
      : role.faction === "Méchant"
        ? "oklch(0.62 0.24 22 / 0.12)"
        : "oklch(0.80 0.12 300 / 0.14)";
  const fbr =
    role.faction === "Civil"
      ? "oklch(0.72 0.16 230 / 0.35)"
      : role.faction === "Méchant"
        ? "oklch(0.62 0.24 22 / 0.35)"
        : "oklch(0.80 0.12 300 / 0.40)";
  const allRoles = Array.from(ctx.roles.values());
  const freq = computeRoleFrequency(role, allRoles);

  const typeBg = t.color.startsWith("var(") ? "var(--muted)" : t.color.replace(")", " / 0.14)");
  const typeBr = t.color.startsWith("var(") ? "var(--border)" : t.color.replace(")", " / 0.4)");

  return (
    <div className="fixed inset-0 z-[60] bg-background/96 backdrop-blur-md flex flex-col max-w-md mx-auto">
      {/* Barre retour */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-lg border border-border bg-card/70 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition active:scale-95"
        >
          <ChevronLeft className="size-4" /> Retour
        </button>
        <span
          className="text-[10px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: fcolor }}
        >
          Dossier de rôle
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-8">
        {/* Hero faction-tinté */}
        <div
          className="relative overflow-hidden rounded-2xl border px-5 pt-6 pb-5 text-center"
          style={{
            borderColor: fbr,
            background: `linear-gradient(168deg, ${fbg}, color-mix(in oklab, var(--card) 55%, transparent) 72%)`,
          }}
        >
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-3xl"
            style={{ background: fbg }}
            aria-hidden
          />
          <div className="relative flex justify-center">
            <div
              className="rounded-full"
              style={{
                boxShadow: `0 0 0 2px color-mix(in oklab, ${fcolor} 55%, transparent), 0 0 28px -6px ${fcolor}`,
              }}
            >
              <RoleIcon role={role} size={92} className="rounded-full" />
            </div>
          </div>
          <h2
            className="relative mt-3 text-[26px] font-bold leading-tight text-glow-gold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {role.name_fr}
          </h2>
          {/* Badges faction · type · difficulté */}
          <div className="relative mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
              style={{ color: fcolor, borderColor: fbr, backgroundColor: fbg }}
            >
              {role.faction}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
              style={{ color: t.color, borderColor: typeBr, backgroundColor: typeBg }}
            >
              <TIcon className="size-3" />
              {role.type}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
              style={{ color: fcolor, borderColor: fbr, backgroundColor: fbg }}
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: fcolor }}
              />
              {role.difficulte}
            </span>
          </div>
          <UsageCard role={role} />
        </div>

        {/* Capacité — texte mis en valeur (cleanCapacity si dispo, comme la fiche en jeu) */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="size-3.5" style={{ color: fcolor }} aria-hidden />
            <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">
              Capacité
            </span>
          </div>
          <p className="whitespace-pre-line rounded-xl border border-border bg-card/60 p-3.5 text-[14px] leading-relaxed">
            {highlightCapacity(
              extraInfoFor(role.slug)?.cleanCapacity ?? role.capacite_full_text,
              "dark",
            )}
          </p>
        </div>

        {/* Subtilités — nuances mécaniques détaillées (mêmes notes que la fiche en jeu) */}
        {(() => {
          const notes = extraInfoFor(role.slug)?.pages.flatMap((pg) => pg.notes) ?? [];
          if (notes.length === 0) return null;
          return (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info className="size-3.5" style={{ color: fcolor }} aria-hidden />
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground">
                  Subtilités
                </span>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3.5">
                {notes.map((n, i) => (
                  <div key={i} className="relative pl-3">
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full"
                      style={{ background: `color-mix(in oklab, ${fcolor} 55%, var(--border))` }}
                    />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {n.tag}
                    </div>
                    <div className="mt-0.5 text-[13px] leading-relaxed">
                      {highlightCapacity(n.body, "dark")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Fréquence en jeu */}
        <div className={`mt-4 rounded-xl border p-3.5 ${FREQ_COLORS[freq.level]}`}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest opacity-80">Fréquence en jeu</div>
            <div className="text-xs font-bold">{freq.label}</div>
          </div>
          {freq.brackets.length > 0 && (
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              {freq.brackets.map((b) => (
                <div key={b.players} className="rounded-lg bg-background/40 py-1.5">
                  <div className="text-[9px] opacity-70">{b.players} joueurs</div>
                  <div className="text-sm font-semibold">{b.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] opacity-80 leading-snug">{freq.hint}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet "Les objets" : base de référence des objets du jeu. ───
const OBJ_ACCENT: Record<string, string> = {
  fiole_mort: "oklch(0.62 0.20 25)",
  fiole_vie: "oklch(0.70 0.16 150)",
  fiole_clairvoyance: "oklch(0.70 0.15 300)",
  couteau: "oklch(0.65 0.16 30)",
  lettre: "oklch(0.74 0.13 300)",
};

function CatalogCard({
  accent,
  glyph,
  name,
  desc,
}: {
  accent: string;
  glyph: React.ReactNode;
  name: string;
  desc: string;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-3"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 28%, var(--border))`,
        background: `color-mix(in oklab, ${accent} 7%, transparent)`,
      }}
    >
      <span
        className="shrink-0 grid place-items-center size-10 rounded-lg text-xl"
        style={{
          background: `color-mix(in oklab, ${accent} 14%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 30%, transparent)`,
        }}
      >
        {glyph}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold" style={{ color: accent }}>
          {name}
        </div>
        <div className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function ObjectsList() {
  const indiceAccent = "oklch(0.80 0.15 75)";
  return (
    <div className="space-y-2.5">
      <SlideHead Icon={Backpack} title="Les objets" subtitle="Le coffre du manoir" />
      <CatalogCard
        accent={indiceAccent}
        glyph="🧩"
        name="Indice"
        desc="Une information vraie sur la composition de cette partie, remise à certains invités dès le début. Certains indices sont coupés en deux moitiés : il faut réunir les deux porteurs pour révéler le secret."
      />
      {Object.values(ITEM_CATALOG).map((it) => (
        <CatalogCard
          key={it.slug}
          accent={OBJ_ACCENT[it.slug] ?? "var(--primary)"}
          glyph={it.icon}
          name={it.name}
          desc={it.description}
        />
      ))}
    </div>
  );
}

// ─── Onglet "Les statuts" : base de référence des statuts du jeu. ───
const STATUS_CATALOG: { Icon: LucideIcon; color: string; label: string; desc: string }[] = [
  {
    Icon: ShieldCheck,
    color: "oklch(0.72 0.16 230)",
    label: "Protégé",
    desc: "Toute attaque qui te vise est bloquée pour la durée.",
  },
  {
    Icon: FlaskConical,
    color: "oklch(0.74 0.16 155)",
    label: "Empoisonné",
    desc: "Sans soin, tu meurs à la prochaine Annonce.",
  },
  {
    Icon: Ban,
    color: "oklch(0.65 0.22 18)",
    label: "Bloqué",
    desc: "Capacité et objets inutilisables ce tour.",
  },
  {
    Icon: Hand,
    color: "oklch(0.58 0.18 18)",
    label: "Chantage",
    desc: "Sous chantage : capacité et objets bloqués ce tour.",
  },
  {
    Icon: Wine,
    color: "oklch(0.78 0.14 70)",
    label: "Ivre",
    desc: "Un verre de trop : capacité et objets bloqués ce tour.",
  },
  {
    Icon: Sparkles,
    color: "oklch(0.85 0.16 95)",
    label: "Béni",
    desc: "Les actions malveillantes qui te visent sont annulées.",
  },
  {
    Icon: Flag,
    color: "oklch(0.78 0.16 55)",
    label: "Suspect",
    desc: "Accusé en public — ça pèse sur les votes.",
  },
  {
    Icon: Drama,
    color: "oklch(0.70 0.15 300)",
    label: "Manipulé",
    desc: "Le Marionnettiste détourne ou bloque ta capacité.",
  },
  {
    Icon: Dices,
    color: "oklch(0.62 0.20 18)",
    label: "Perdant aux dés",
    desc: "Pari du tricheur perdu : mort à la prochaine annonce, sauf protection.",
  },
  {
    Icon: Crosshair,
    color: "oklch(0.62 0.20 18)",
    label: "Ciblé",
    desc: "Marqué par le Tueur Stratège : mort à la prochaine annonce, sauf protection.",
  },
  {
    Icon: Heart,
    color: "oklch(0.75 0.16 0)",
    label: "Amoureux",
    desc: "Lié à un autre joueur : si l'un meurt, l'autre suit. Vous gagnez ensemble.",
  },
  {
    Icon: Martini,
    color: "oklch(0.72 0.16 330)",
    label: "Bon moment",
    desc: "Tu as passé du bon temps avec quelqu'un.",
  },
  {
    Icon: Lock,
    color: "oklch(0.80 0.14 75)",
    label: "Prison",
    desc: "Capacité bloquée jusqu'à ta libération.",
  },
  {
    Icon: Skull,
    color: "oklch(0.74 0.10 150)",
    label: "Mort",
    desc: "Tu observes la partie et rejoins le chat des morts.",
  },
];

function StatusList() {
  return (
    <div className="space-y-2.5">
      <SlideHead Icon={ShieldCheck} title="Les statuts" subtitle="Ce qui peut t'affecter" />
      {STATUS_CATALOG.map((s) => (
        <CatalogCard
          key={s.label}
          accent={s.color}
          glyph={<s.Icon className="size-5" style={{ color: s.color }} aria-hidden />}
          name={s.label}
          desc={s.desc}
        />
      ))}
    </div>
  );
}
