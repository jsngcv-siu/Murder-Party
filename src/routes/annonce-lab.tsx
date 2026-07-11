import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Backpack, Eye, Feather, Megaphone, Target, Zap, type LucideIcon } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";

export const Route = createFileRoute("/annonce-lab")({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw redirect({ to: "/" });
  },
  component: AnnonceLab,
});

type VariantId = "dispatch" | "timeline" | "folders";
type EventTone = "death" | "safe" | "secret" | "prison";

type AnnonceEvent = {
  id: string;
  subject: string;
  verb: string;
  detail: string;
  tone: EventTone;
  visibility: "Public" | "Prive" | "Etat";
  playerId?: string;
};

const events: AnnonceEvent[] = [
  {
    id: "death-dre",
    subject: "Dre",
    verb: "ne repond plus",
    detail: "Mort confirmee. La cause reste inconnue.",
    tone: "death",
    visibility: "Public",
    playerId: "dre",
  },
  {
    id: "save-bob",
    subject: "Attaque",
    verb: "empechee",
    detail: "Une protection a tenu. Aucun protecteur n'est revele.",
    tone: "safe",
    visibility: "Public",
  },
  {
    id: "letter-hana",
    subject: "Lettre",
    verb: "remise",
    detail: "Le contenu est ajoute au journal du destinataire.",
    tone: "secret",
    visibility: "Prive",
  },
  {
    id: "prison-cleo",
    subject: "Cleo",
    verb: "reste en prison",
    detail: "Vivante, mais sans vote au prochain tour.",
    tone: "prison",
    visibility: "Etat",
    playerId: "cleo",
  },
];

const variants: Array<{ id: VariantId; label: string; description: string }> = [
  {
    id: "dispatch",
    label: "A · La depeche",
    description: "Le fait majeur d'abord, puis les autres nouvelles. La plus directe sur mobile.",
  },
  {
    id: "timeline",
    label: "B · Le fil du tour",
    description: "Une chronologie numerotee pour comprendre l'ordre des effets.",
  },
  {
    id: "folders",
    label: "C · Les dossiers",
    description: "Les faits ranges par public, prive et etat pour retrouver une information vite.",
  },
];

const phaseSteps = [
  { key: "free", label: "Enquete" },
  { key: "annonce", label: "Annonce" },
  { key: "gathering", label: "Debat" },
  { key: "vote", label: "Vote" },
];

function AnnonceLab() {
  const [variant, setVariant] = useState<VariantId>("dispatch");
  const [compact, setCompact] = useState(false);
  const active = variants.find((item) => item.id === variant) ?? variants[0];

  return (
    <div className="min-h-dvh bg-[#120806] text-foreground">
      <header className="sticky top-0 z-30 border-b border-[#5f3526] bg-[#160806]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/demo" className="shrink-0 text-xs text-[#d9c6a2]/70 hover:text-gold">
              retour demo
            </Link>
            <div className="min-w-0">
              <div className="font-display text-[10px] uppercase tracking-[0.26em] text-gold">
                The board - annonce
              </div>
              <h1 className="truncate text-base font-semibold">Prototype DA joueur</h1>
            </div>
          </div>
          <button
            onClick={() => setCompact((value) => !value)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#704129] bg-[#24100c] px-3 text-xs text-[#ecd7b0] transition hover:border-gold/60"
          >
            <Eye className="size-4" />
            {compact ? "Confort" : "Dense"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[280px_minmax(360px,430px)_1fr]">
        <aside className="order-2 space-y-3 lg:order-none">
          <Panel title="Choix d'ecran">
            <div className="space-y-2">
              {variants.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setVariant(item.id)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    variant === item.id
                      ? "border-gold bg-gold text-[#24100c]"
                      : "border-[#6a3b27] bg-[#1d0c08] text-[#e8d7b7] hover:bg-[#28120d]"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={`mt-1 block text-xs leading-snug ${
                      variant === item.id ? "text-[#3b2116]" : "text-[#bda57d]"
                    }`}
                  >
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="DA appliquee">
            <div className="space-y-2 text-sm leading-snug text-[#d8c3a0]/82">
              <CheckLine text="Topbar, phase et onglets restent ceux du joueur." />
              <CheckLine text="Annonce traitee comme un journal du tour." />
              <CheckLine text="Insignes/tampons crees pour les effets." />
              <CheckLine text="Aucun role ni faction revele sans raison gameplay." />
            </div>
          </Panel>
        </aside>

        <div className="order-1 lg:order-none">
          <PhoneShell compact={compact}>
            {variant === "dispatch" && <DispatchView compact={compact} />}
            {variant === "timeline" && <TimelineView compact={compact} />}
            {variant === "folders" && <FoldersView compact={compact} />}
          </PhoneShell>
        </div>

        <section className="order-3 space-y-4 lg:order-none">
          <Panel title="Direction active">
            <h2 className="text-xl font-semibold text-[#f2e3c2]">{active.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#d8c3a0]/75">{active.description}</p>
          </Panel>

          <Panel title="Codes de lecture">
            <div className="grid grid-cols-2 gap-2">
              <ToneLegend tone="death" label="mort" />
              <ToneLegend tone="safe" label="protege" />
              <ToneLegend tone="secret" label="prive" />
              <ToneLegend tone="prison" label="prison" />
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function PhoneShell({ children, compact }: { children: ReactNode; compact: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[430px]">
      <div className="overflow-hidden rounded-[28px] border border-[#704129] bg-[#080302] p-2 shadow-[0_30px_90px_-36px_rgba(0,0,0,.95)]">
        <div
          className={`relative flex flex-col overflow-hidden rounded-[22px] border border-[#2e1811] bg-background ${
            compact ? "min-h-[680px]" : "min-h-[760px]"
          }`}
        >
          <MockTopbar />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          <MockTabs />
        </div>
      </div>
    </div>
  );
}

function MockTopbar() {
  return (
    <div className="border-b border-border bg-card/95 px-3 pb-2 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-gold">
            Tour 3
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate text-foreground">Cleo</span>
            <span className="size-1 rounded-full bg-border" />
            <span className="truncate">Le Juge</span>
          </div>
        </div>
        <div className="shrink-0 rounded-md border border-[var(--phase-annonce)]/40 bg-[var(--phase-annonce-wash)] px-2.5 py-1 text-right font-display text-xl leading-none text-[var(--phase-annonce)]">
          0:08
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {phaseSteps.map((step) => {
          const active = step.key === "annonce";
          return (
            <span
              key={step.key}
              className={`rounded-md py-1 text-center font-display text-[8px] uppercase tracking-[0.08em] ${
                active ? "bg-gold text-[#211006]" : "bg-white/[0.055] text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full w-[72%] rounded-full bg-gold" />
      </div>
    </div>
  );
}

function MockTabs() {
  const tabs: Array<{ label: string; icon: LucideIcon; active?: boolean; accent: string }> = [
    { label: "Inventaire", icon: Backpack, accent: "oklch(0.78 0.15 55)" },
    { label: "Suspicions", icon: Target, accent: "var(--destructive)" },
    { label: "Annonces", icon: Megaphone, active: true, accent: "var(--phase-annonce)" },
    { label: "Testament", icon: Feather, accent: "oklch(0.74 0.15 300)" },
    { label: "Capacite", icon: Zap, accent: "var(--primary)" },
  ];

  return (
    <nav className="relative grid grid-cols-5 border-t border-border bg-card/95 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <span className="pointer-events-none absolute left-[40%] top-0 h-0.5 w-1/5">
        <span className="mx-auto block h-0.5 w-8 rounded-full bg-gold shadow-[0_0_10px_2px_color-mix(in_oklab,var(--gold)_55%,transparent)]" />
      </span>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.label}
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] transition ${
              tab.active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" style={tab.active ? { color: tab.accent } : undefined} />
            <span className="truncate">{tab.label}</span>
            {tab.active && (
              <span
                className="absolute right-5 top-2 size-2 rounded-full"
                style={{ background: tab.accent }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function DispatchView({ compact }: { compact: boolean }) {
  const death = events.find((event) => event.tone === "death");
  const remaining = events.filter((event) => event.id !== death?.id);

  return (
    <ScreenBody>
      <JournalHeader eyebrow="La depeche du tour" title="Les faits, sans detour" />
      {death && <MajorFact event={death} />}
      <CompactSummary />
      <div className="space-y-2">
        {remaining.map((event) => (
          <EventRow key={event.id} event={event} compact={compact} />
        ))}
      </div>
    </ScreenBody>
  );
}

function TimelineView({ compact }: { compact: boolean }) {
  return (
    <ScreenBody>
      <JournalHeader eyebrow="Fil du tour · 4 faits" title="Dans quel ordre ?" />
      <div className="relative space-y-2 pl-9">
        <span className="absolute bottom-8 left-[13px] top-4 w-px bg-[#e8b44a]/60" />
        {events.map((event, index) => (
          <TimelineRow key={event.id} event={event} index={index + 1} compact={compact} />
        ))}
      </div>
      <p className="font-hand text-center text-base text-[#d8c3a0]/80">
        Du fait public au nouvel etat du manoir.
      </p>
    </ScreenBody>
  );
}

function FoldersView({ compact }: { compact: boolean }) {
  const groups = [
    { label: "Public", note: "A dire a toute la table", tone: "death" as const },
    { label: "Prive", note: "Seulement dans ton journal", tone: "secret" as const },
    { label: "Etat", note: "Ce qui reste vrai", tone: "prison" as const },
  ];

  return (
    <ScreenBody>
      <JournalHeader eyebrow="Classeur du manoir" title="Retrouver un fait" />
      <div className="space-y-3">
        {groups.map((group) => {
          const groupEvents = events.filter((event) => event.visibility === group.label);
          const cfg = toneConfig(group.tone);
          return (
            <section
              key={group.label}
              className="relative rounded-md border border-[#d7c493]/65 bg-[#eee0bf] px-3 pb-3 pt-4 text-[#2c1a10] shadow-[0_12px_24px_-20px_rgba(0,0,0,.95)]"
            >
              <span
                className="absolute -top-2 left-3 rotate-[-2deg] px-3 py-0.5 font-hand text-base font-bold"
                style={{ color: cfg.ink, background: cfg.wash, border: `1px solid ${cfg.line}` }}
              >
                {group.label} · {groupEvents.length}
              </span>
              <p className="mb-2 mt-1 text-[11px] text-[#6f573b]">{group.note}</p>
              <div className="space-y-1.5">
                {groupEvents.map((event) => (
                  <FolderRow key={event.id} event={event} compact={compact} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </ScreenBody>
  );
}

function ScreenBody({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(232,180,74,.10),transparent_42%)] px-4 py-4">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,230,170,.07)_1px,transparent_1.5px)] [background-size:8px_8px]" />
      <div className="pointer-events-none absolute inset-x-10 top-24 h-px rotate-[-8deg] bg-[#9e1d32]/45" />
      <div className="pointer-events-none absolute bottom-32 left-5 right-16 h-px rotate-[7deg] bg-[#9e1d32]/35" />
      <div className="relative z-10 flex min-h-full flex-col gap-3">{children}</div>
    </div>
  );
}

function JournalHeader({
  eyebrow = "Annonces - le journal",
  title = "Le manoir tranche",
}: {
  eyebrow?: string;
  title?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-[#d7c493]/70 bg-[#efe3c7] px-4 py-3 text-[#2c1a10] shadow-[0_18px_34px_-24px_rgba(0,0,0,.9)]">
      <span className="absolute -top-2 left-11 h-5 w-20 rotate-[-4deg] bg-[#b9a06d]/55" />
      <span className="absolute right-4 top-4 font-display text-[11px] uppercase tracking-[0.16em] text-[#9b372f]">
        tour 3
      </span>
      <div className="font-display text-[10px] uppercase tracking-[0.22em] text-[#8b6b36]">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-display text-[25px] leading-tight">{title}</h2>
      <p className="mt-2 max-w-[270px] text-sm leading-snug text-[#6f573b]">
        Les faits publics sont fixes. Les secrets restent dans les journaux concernes.
      </p>
    </div>
  );
}

function MajorFact({ event }: { event: AnnonceEvent }) {
  const cfg = toneConfig(event.tone);

  return (
    <div className="relative rounded-md border border-[#d7c493]/70 bg-[#f0e2bf] p-3 text-[#2c1a10] shadow-[0_16px_30px_-24px_rgba(0,0,0,.9)]">
      <div className="flex gap-3">
        <div className="relative w-[62px] shrink-0 rotate-[-3deg] bg-[#fbfaf6] p-1 pb-3 shadow-[0_7px_14px_-8px_rgba(0,0,0,.75)]">
          <div className="relative h-[62px] overflow-hidden border border-[#d8c9a9]">
            <AvatarImg avatar="dre" fill rounded="none" />
            <span className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rotate-[-18deg] bg-[#b02a35]/85" />
          </div>
          <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold shadow-[0_2px_4px_rgba(0,0,0,.4)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[10px] uppercase tracking-[0.18em] text-[#9b372f]">
            Fait majeur
          </div>
          <div className="mt-1 text-xl font-bold leading-tight">
            <span style={{ color: cfg.ink }}>{event.subject}</span> {event.verb}
          </div>
          <p className="mt-1 text-sm leading-snug text-[#6f573b]">{event.detail}</p>
        </div>
      </div>
      <RubberStamp tone={event.tone} className="absolute right-3 top-3 opacity-30" />
    </div>
  );
}

function CompactSummary() {
  return (
    <div className="flex items-center justify-between rounded-md border border-[#6a3b27] bg-[#1d0c08] px-3 py-2 text-xs">
      <span className="font-display uppercase tracking-[0.12em] text-[#e8b44a]">4 faits actés</span>
      <span className="text-[#d8c3a0]/75">2 publics · 1 prive · 1 etat</span>
    </div>
  );
}

function EventRow({ event, compact }: { event: AnnonceEvent; compact: boolean }) {
  const cfg = toneConfig(event.tone);

  return (
    <article className="w-full rounded-md border border-border bg-card/78 px-3 py-3 text-left">
      <div className="flex gap-3">
        <RubberStamp tone={event.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                <span style={{ color: cfg.ink }}>{event.subject}</span> {event.verb}
              </div>
              {!compact && (
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{event.detail}</p>
              )}
            </div>
            <VisibilityTag event={event} />
          </div>
        </div>
      </div>
    </article>
  );
}

function FolderRow({ event, compact }: { event: AnnonceEvent; compact: boolean }) {
  const cfg = toneConfig(event.tone);

  return (
    <article className="flex items-start gap-2 rounded-sm border border-[#c8b58b]/70 bg-[#f7ecd3]/78 px-2.5 py-2">
      <RubberStamp tone={event.tone} small />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight">
          <span style={{ color: cfg.ink }}>{event.subject}</span> {event.verb}
        </div>
        {!compact && (
          <p className="mt-0.5 text-[11px] leading-snug text-[#6f573b]">{event.detail}</p>
        )}
      </div>
    </article>
  );
}

function TimelineRow({
  event,
  index,
  compact,
}: {
  event: AnnonceEvent;
  index: number;
  compact: boolean;
}) {
  const cfg = toneConfig(event.tone);

  return (
    <div className="relative">
      <span
        className="absolute -left-9 top-3 grid size-7 place-items-center rounded-full border bg-background font-display text-[11px]"
        style={{ borderColor: cfg.line, color: cfg.ink }}
      >
        {index}
      </span>
      <EventRow event={event} compact={compact} />
    </div>
  );
}

function VisibilityTag({ event }: { event: AnnonceEvent }) {
  const cfg = toneConfig(event.tone);

  return (
    <span
      className="shrink-0 rounded-sm border px-1.5 py-0.5 font-display text-[9px] uppercase tracking-[0.14em]"
      style={{ borderColor: cfg.line, color: cfg.ink, background: cfg.wash }}
    >
      {event.visibility}
    </span>
  );
}

function RubberStamp({
  tone,
  small = false,
  className = "",
}: {
  tone: EventTone;
  small?: boolean;
  className?: string;
}) {
  const cfg = toneConfig(tone);
  const size = small ? "size-7" : "size-10";

  return (
    <span
      className={`relative inline-grid ${size} shrink-0 place-items-center rounded-[3px] border-2 ${className}`}
      style={{ borderColor: cfg.line, background: cfg.wash, color: cfg.ink }}
      aria-hidden
    >
      <StampGlyph tone={tone} color={cfg.ink} small={small} />
      <span
        className="pointer-events-none absolute inset-[3px] rounded-[2px] border"
        style={{ borderColor: cfg.line }}
      />
    </span>
  );
}

function StampGlyph({ tone, color, small }: { tone: EventTone; color: string; small?: boolean }) {
  const scale = small ? 0.75 : 1;

  if (tone === "death") {
    return (
      <span
        className="relative block rounded-full border-2"
        style={{ width: 22 * scale, height: 22 * scale, borderColor: color }}
      >
        <span
          className="absolute rounded-full"
          style={{ left: 5 * scale, top: 6 * scale, width: 3, height: 3, background: color }}
        />
        <span
          className="absolute rounded-full"
          style={{ right: 5 * scale, top: 6 * scale, width: 3, height: 3, background: color }}
        />
        <span
          className="absolute left-1/2 rounded-b-full border-b-2"
          style={{
            bottom: 5 * scale,
            width: 9 * scale,
            height: 5 * scale,
            transform: "translateX(-50%)",
            borderColor: color,
          }}
        />
      </span>
    );
  }

  if (tone === "safe") {
    return (
      <span
        className="block border-2"
        style={{
          width: 18 * scale,
          height: 22 * scale,
          borderColor: color,
          clipPath: "polygon(50% 0,100% 20%,86% 82%,50% 100%,14% 82%,0 20%)",
        }}
      />
    );
  }

  if (tone === "secret") {
    return (
      <span
        className="relative block border-2"
        style={{ width: 22 * scale, height: 15 * scale, borderColor: color }}
      >
        <span
          className="absolute left-0 top-0 h-full w-full"
          style={{
            background: `linear-gradient(145deg, transparent 47%, ${color} 49%, ${color} 53%, transparent 55%)`,
          }}
        />
      </span>
    );
  }

  return (
    <span
      className="flex items-center justify-center gap-1 border-2"
      style={{ width: 22 * scale, height: 22 * scale, borderColor: color }}
    >
      <span className="h-[70%] w-0.5" style={{ background: color }} />
      <span className="h-[70%] w-0.5" style={{ background: color }} />
      <span className="h-[70%] w-0.5" style={{ background: color }} />
    </span>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#6a3b27] bg-[#1b0c08] p-4">
      <div className="font-display text-[10px] uppercase tracking-[0.24em] text-[#c6a560]">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7f9a5f]" />
      <span>{text}</span>
    </div>
  );
}

function ToneLegend({ tone, label }: { tone: EventTone; label: string }) {
  const cfg = toneConfig(tone);

  return (
    <div className="flex items-center gap-2 rounded-md border border-[#6a3b27] bg-[#24100c] px-2 py-2">
      <span
        className="size-5 rounded-sm border"
        style={{ background: cfg.wash, borderColor: cfg.line }}
      />
      <span className="text-xs text-[#ecd7b0]">{label}</span>
    </div>
  );
}

function toneConfig(tone: EventTone) {
  const map: Record<EventTone, { ink: string; line: string; wash: string }> = {
    death: {
      ink: "#e3645d",
      line: "rgba(227,100,93,.48)",
      wash: "rgba(176,42,53,.13)",
    },
    safe: {
      ink: "#a9c78a",
      line: "rgba(169,199,138,.44)",
      wash: "rgba(127,154,95,.13)",
    },
    secret: {
      ink: "#e8b44a",
      line: "rgba(232,180,74,.48)",
      wash: "rgba(232,180,74,.13)",
    },
    prison: {
      ink: "#b992c9",
      line: "rgba(185,146,201,.44)",
      wash: "rgba(141,104,165,.15)",
    },
  };

  return map[tone];
}
