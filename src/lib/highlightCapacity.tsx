// Met en valeur les notions clés d'un texte de capacité SANS le modifier :
// gras + couleur sémantique (timing, tuer, protéger, info, subversion, contrôle).
// Deux palettes : « paper » (sur le papier crème du dossier de révélation) et
// « dark » (sur les fonds sombres : écran Capacité, fiches de rôle du menu d'aide).
import type { ReactNode } from "react";

type Variant = "paper" | "dark";

// Teintes lisibles sur papier crème (L ≈ 0.45, chroma soutenu).
const PAPER = {
  time: "oklch(0.46 0.13 68)",
  kill: "oklch(0.50 0.21 25)",
  guard: "oklch(0.43 0.15 150)",
  info: "oklch(0.45 0.16 252)",
  subvert: "oklch(0.46 0.19 320)",
  control: "oklch(0.49 0.16 48)",
} as const;

// Teintes lumineuses sur fond sombre (L ≈ 0.75).
const DARK = {
  time: "oklch(0.82 0.14 75)",
  kill: "oklch(0.70 0.20 25)",
  guard: "oklch(0.75 0.16 155)",
  info: "oklch(0.74 0.14 240)",
  subvert: "oklch(0.76 0.16 320)",
  control: "oklch(0.81 0.15 62)",
} as const;

const GROUP_KEY: Record<string, keyof typeof PAPER | ""> = {
  freq: "time",
  kill: "kill",
  guard: "guard",
  info: "info",
  subvert: "subvert",
  control: "control",
  civil: "info",
  mechant: "kill",
  vampire: "subvert",
  neutre: "subvert",
  num: "",
};

// Alternative « mot entier » : démarre sur une frontière de mot (pas de lettre
// avant) et consomme la fin du mot, accents inclus (\p{L}).
const wordStems = (arr: string[]) => `(?<![\\p{L}])(?:${arr.join("|")})\\p{L}*`;

const CAPACITY_RE = new RegExp(
  [
    // Fréquence / timing (unités composées) — priorité maximale
    // « fois par X » ET « fois dans la partie » (formulation des rôles 1×/partie).
    `(?<freq>\\d+\\s*×\\s*\\/\\s*(?:jour|partie|phase\\s*libre|enquête|rassemblement|débat|tour|cycle)(?:\\s*max)?|(?:une|deux|trois|quatre|\\d+)\\s+fois\\s+(?:par|dans)\\s+(?:la\\s+|le\\s+)?(?:phase\\s*libre|enquête|rassemblement|débat|tour|cycle|partie|jour)|à\\s+chaque\\s+(?:phase\\s*libre|enquête|rassemblement|débat|tour|cycle|jour)|à\\s+la\\s+première\\s+(?:phase\\s*libre|enquête)|au\\s+premier\\s+(?:rassemblement|débat|tour)|au\\s+setup|cooldown\\s*\\d*|\\bpermanent\\b|\\bsetup\\b)`,
    `(?<kill>${wordStems(["tuer", "tue", "tué", "tués", "tuée", "tuées", "élimin", "meur", "mort", "exécut", "décès", "abat"])})`,
    `(?<guard>${wordStems(["protège", "protég", "protection", "soign", "bouclier", "immunit", "béni", "bénit", "annul", "sauv", "veille"])})`,
    `(?<info>${wordStems(["apprend", "découvr", "connaît", "conna", "révèl", "révél", "examin", "vérifi", "enquêt", "identité", "prophéti", "inspect"])})`,
    `(?<subvert>${wordStems(["converti", "convertit", "infect", "empoisonn", "manipul", "déguis", "falsifi", "envoût", "signé", "sign", "forge", "forgé", "contrefa", "imit"])})`,
    `(?<control>${wordStems(["bloqu", "emprisonn", "prison", "suspect", "suspici", "chantage", "verrouill", "piège"])})`,
    `(?<civil>${wordStems(["citoyen", "civil"])})`,
    `(?<mechant>${wordStems(["méchant", "mechant"])})`,
    `(?<vampire>${wordStems(["vampire"])})`,
    `(?<neutre>${wordStems(["neutre"])})`,
    `(?<num>\\d+)`,
  ].join("|"),
  "giu",
);

export function highlightCapacity(
  text: string | null | undefined,
  variant: Variant = "paper",
): ReactNode {
  if (!text) return text ?? null;
  const palette = variant === "dark" ? DARK : PAPER;
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(CAPACITY_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const which = Object.keys(m.groups ?? {}).find((k) => m.groups?.[k] != null) ?? "num";
    const gk = GROUP_KEY[which];
    const color = gk ? palette[gk] : "";
    out.push(
      <span key={key++} style={{ fontWeight: 700, ...(color ? { color } : null) }}>
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
