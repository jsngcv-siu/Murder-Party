import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import {
  ResultBannerView,
  type BannerDisplay,
  type ResultTone,
} from "@/components/frames/screens/PA2Capability";
import type { RoleRow } from "@/engine/actions";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";

export const Route = createFileRoute("/result-lab")({
  beforeLoad: requireLocalDevelopment,
  component: ResultLab,
});

// ─────────────────────────────────────────────────────────────────────────
// Result Lab — présente le bandeau RÉSULTAT (Piste C) dans tous ses états,
// sans partie live. Rend le VRAI composant `ResultBannerView` avec des
// `BannerDisplay` factices → ce que le lab montre = ce que voit le joueur.
// ─────────────────────────────────────────────────────────────────────────

const NO_ROLES = new Map<string, RoleRow>();

const ORANGE = "oklch(0.77 0.15 70)"; // « En cours » / différé
const GREEN = "oklch(0.74 0.16 155)"; // « Fait » / succès

function accentFor(outcome: ResultTone): string {
  return outcome === "success"
    ? GREEN
    : outcome === "fail"
      ? "var(--mechants)"
      : outcome === "pending"
        ? ORANGE
        : "var(--citoyens)";
}

// Effet différé / confirmation → une seule ligne + pastille (pas de bloc résultat).
function mkAction(actionText: string, pending: boolean): BannerDisplay {
  return {
    tour: 2,
    time: "21:14",
    actionText,
    resultMsg: "",
    storedOutcome: undefined,
    showResultBlock: false,
    actionPending: pending,
    barAccent: pending ? ORANGE : GREEN,
  };
}

// Résultat informatif → action en petit + bloc résultat en avant.
function mkInfo(actionText: string, resultMsg: string, outcome: ResultTone): BannerDisplay {
  return {
    tour: 2,
    time: "21:14",
    actionText,
    resultMsg,
    storedOutcome: outcome,
    showResultBlock: true,
    actionPending: false,
    barAccent: accentFor(outcome),
  };
}

type Scenario = { label: string; note: string; myRoleSlug?: string; d: BannerDisplay };

const DEFERRED: Scenario[] = [
  {
    label: "Fiole de mort",
    note: "Effet différé — le doublon « intention de mort » disparaît.",
    d: mkAction("Tu as utilisé Fiole de mort sur Hana.", true),
  },
  {
    label: "Tueur",
    note: "Kill différé, résolu à l'Annonce.",
    d: mkAction("Tu as tenté de tuer Léo.", true),
  },
  {
    label: "Majordome",
    note: "Protection différée.",
    d: mkAction("Tu as servi Faye.", true),
  },
  {
    label: "Armurier",
    note: "Confirmation immédiate → pastille « Fait ».",
    d: mkAction("Tu as armé Milo.", false),
  },
  {
    label: "Offrir une fiole",
    note: "Don immédiat → « Fait ».",
    d: mkAction("Tu as offert une Fiole de vie à Faye.", false),
  },
];

const INFO: Scenario[] = [
  {
    label: "Policier",
    note: "Verdict d'enquête — l'info reste en avant.",
    d: mkInfo("Tu as arrêté Léo.", "🟠 Léo : soupçons", "info"),
  },
  {
    label: "Chasseur de vampire",
    note: "Verdict rouge (menace) — mode « verdict ».",
    myRoleSlug: "chasseur_de_vampire",
    d: mkInfo("Tu as traqué Jin.", "🔴 Jin EST un vampire — exécution à l'Annonce", "fail"),
  },
  {
    label: "Boussole",
    note: "Verdict vert (même camp) — mode « verdict ».",
    myRoleSlug: "boussole",
    d: mkInfo("Tu as orienté ta boussole vers Faye.", "Même camp", "success"),
  },
  {
    label: "Détective — trio",
    note: "Le trio est l'info : bloc conservé.",
    d: mkInfo("Tu as enquêté sur Milo.", "Trio : L'Ange Gardien · Le Tueur · La Boussole", "info"),
  },
  {
    label: "Fiole de clairvoyance",
    note: "Seule fiole qui informe : faction révélée.",
    d: mkInfo("Tu as utilisé Fiole de clairvoyance sur Faye.", "Faye = faction Civil", "info"),
  },
  {
    label: "Parieur — dés",
    note: "Issue des dés — mort différée à l'Annonce.",
    d: mkInfo("Tu as placé ton pari.", "🎲 5 > 3 — Léo perd le pari", "pending"),
  },
  {
    label: "Piste falsifiée",
    note: "Enquête brouillée : l'info « falsifié » reste utile.",
    d: mkInfo("Tu as arrêté Milo.", "Le joueur a été falsifié", "info"),
  },
];

function ResultLab() {
  return (
    <div className="min-h-dvh bg-[#130806] text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#130806]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <Link to="/" className="text-xs text-muted-foreground transition hover:text-gold">
            Accueil
          </Link>
          <span className="h-4 w-px bg-white/15" />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.34em] text-gold">
              Result Lab · bandeau Résultat
            </div>
            <h1 className="text-lg font-semibold">Piste C — action + pastille, résultat si utile</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Le bloc résultat ne s'affiche <strong className="text-foreground">que</strong> s'il apporte
          une info neuve (verdict, faction, trio, dés). Sinon on ne montre que la ligne d'action + une
          pastille <span className="text-[oklch(0.77_0.15_70)]">En cours</span> (différé) ou{" "}
          <span className="text-[oklch(0.74_0.16_155)]">Fait</span>.
        </p>

        <Section title="Effet différé / confirmation" subtitle="Une seule ligne — plus de doublon">
          {DEFERRED.map((s) => (
            <ScenarioCard key={s.label} s={s} />
          ))}
        </Section>

        <Section title="Résultat informatif" subtitle="Le bloc résultat est conservé (l'info)">
          {INFO.map((s) => (
            <ScenarioCard key={s.label} s={s} />
          ))}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ScenarioCard({ s }: { s: Scenario }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{s.label}</span>
        <span className="text-[10px] text-muted-foreground">
          {s.d.showResultBlock ? "bloc affiché" : "action seule"}
        </span>
      </div>
      <p className="mb-1 text-[11px] leading-snug text-muted-foreground">{s.note}</p>
      {/* Surface liège du jeu, pour que panel-v3 rende comme en partie. */}
      <div className="cork-surface rounded-lg px-3 pb-3">
        <ResultBannerView d={s.d} roles={NO_ROLES} myRoleSlug={s.myRoleSlug} />
      </div>
    </div>
  );
}
