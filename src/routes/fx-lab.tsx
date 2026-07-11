import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AvatarImg } from "@/components/AvatarImg";
import { ROLE_TYPE_META, roleTypeMeta } from "@/lib/roleTypeMeta";
import { requireLocalDevelopment } from "@/lib/localOnlyRoute";

export const Route = createFileRoute("/fx-lab")({
  beforeLoad: requireLocalDevelopment,
  component: FxLab,
});

// Bac à sable DA : pistes de fiche rôle (type au lieu de faction) + cadres de fréquence.
const DISPLAY = "var(--font-display)";

// Couleur de faction (ring + nom) — inchangée : c'est elle qui « fait comprendre »
// la faction, donc on retire le tag texte redondant.
const FACTION_COLOR: Record<string, string> = {
  Civil: "var(--citoyens)",
  Méchant: "var(--destructive)",
  Neutre: "var(--neutres)",
};

type RoleEx = {
  name: string;
  faction: "Civil" | "Méchant" | "Neutre";
  type: string; // clé ROLE_TYPE_META
  freq: string;
  avatar: string;
  cap: string;
};

// Deux exemples : un cas « aligné » (faction rouge = type rouge) et un cas
// « divergent » (faction bleue, type rose) pour montrer que couleur de faction
// et couleur de type coexistent sans se confondre.
const EXAMPLES: RoleEx[] = [
  {
    name: "Le Tueur",
    faction: "Méchant",
    type: "TUEUR",
    freq: "1× / Enquête",
    avatar: "leo",
    cap: "Une fois par Enquête, désigne 1 joueur vivant. Sa mort est annoncée à la prochaine Annonce.",
  },
  {
    name: "Le Barman",
    faction: "Civil",
    type: "SUPPORT",
    freq: "1× / tour",
    avatar: "hana",
    cap: "Sers un verre à un joueur : il est ivre au prochain tour et rate sa capacité.",
  },
];

// Teinte lisible sur le papier crème (assombrie).
const onPaper = (c: string, pct = 68) => `color-mix(in oklab, ${c} ${pct}%, black)`;

function FxLab() {
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
              FX Lab · bac à sable DA
            </div>
            <h1 className="text-lg font-semibold">Fiche rôle — types de rôle &amp; lisibilité</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <Panel title="Objectif">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sur la fiche rôle, on affiche le <strong className="text-foreground">type</strong> (Tueur,
              Investigation, Tromperie…) au lieu de la faction. Le tag de faction est retiré : la
              couleur de l'avatar et du nom la disent déjà. Reste à trouver le traitement de badge +
              la restylisation de la fréquence qui collent à la DA papier.
            </p>
          </Panel>

          <Panel title="Légende des types — pastilles">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {Object.values(ROLE_TYPE_META).map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: m.color }}
                  />
                  <span className="truncate text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Légende des types — avec icône">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(ROLE_TYPE_META).map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-2 rounded border px-2 py-1.5"
                  style={{
                    borderColor: `color-mix(in oklab, ${m.color} 35%, transparent)`,
                    background: `color-mix(in oklab, ${m.color} 10%, transparent)`,
                  }}
                >
                  <m.Icon className="size-3.5 shrink-0" style={{ color: m.color }} aria-hidden />
                  <span className="truncate text-[11px] text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground/70">
              À trancher : garder les icônes lucide (repère rapide) ou rester typographique (plus
              proche de la DA dossier).
            </p>
          </Panel>
        </aside>

        <section className="space-y-6">
          <article className="rounded-lg border border-gold/40 bg-[#1d0d0a] p-4 shadow-[0_0_0_1px_rgba(232,180,74,.15)]">
            <div className="mb-4">
              <div className="font-display text-[10px] uppercase tracking-[0.22em] text-gold">
                ★ Version définitive
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Fiche large (paysage, comme en jeu), type en tampon, cadre beige minimaliste,
                compteur de charges avec code couleur. Cliquable en démo — sera automatique une fois
                branché.
              </p>
              <FreqColorLegend />
            </div>
            <div className="flex flex-col items-center gap-5">
              <DefinitiveCard
                ex={CHARGE_EXAMPLES[0]}
                canAct
                note="Enquête en cours → capacité utilisable (vert)."
              />
              <DefinitiveCard
                ex={CHARGE_EXAMPLES[2]}
                canAct={false}
                note="Hors phase / bloqué → charge dispo mais pas actionnable (orange)."
              />
              <DefinitiveCard
                ex={CHARGE_EXAMPLES[1]}
                canAct
                initialUsed={1}
                note="2×/partie, 1 charge déjà utilisée (creux) + 1 restante (vert)."
              />
            </div>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Variantes de couleurs</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Palettes du code couleur des charges (utilisable / pas maintenant / utilisée) à
                comparer sur le papier crème. Dis-moi laquelle et je l'applique à la fiche.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHARGE_PALETTES.map((p) => (
                <ColorVariantRow key={p.name} p={p} />
              ))}
            </div>
          </article>

          <Piste
            id="A"
            title="Puce + libellé encre"
            desc="Point coloré + type en petites capitales Special Elite, fréquence en texte discret. Le plus éditorial, zéro pilule."
            render={badgesDot}
          />
          <Piste
            id="B"
            title="Tampon encreur"
            desc="Type comme un tampon légèrement incliné (cadre fin dans la couleur du type). Fréquence à côté, sans fond criard."
            render={badgesStamp}
          />
          <Piste
            id="C"
            title="Filet coloré"
            desc="Un filet dans la couleur du type sous le nom + libellé. Rien qui ressemble à un bouton — juste une règle de composition."
            render={badgesRule}
          />
          <Piste
            id="D"
            title="Onglet classé"
            desc="Type comme un onglet de dossier (coin haut arrondi). Fréquence en petit tampon monospace en bas."
            render={badgesTab}
          />

          <article className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Fréquence de jeu — cadres &amp; effets</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Traitements de la cadence (« 1×/Enquête », « 2×/partie », « Passif »…) en accent
                or — la fréquence n'est pas liée au type. Chaque tuile montre l'effet sur 3 cas.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FreqTile name="Pastille de charges" render={freqPips} />
              <FreqTile name="Cachet de cire" render={freqWax} />
              <FreqTile name="Ticket perforé" render={freqTicket} />
              <FreqTile name="Étiquette ficelée" render={freqTag} />
              <FreqTile name="Tampon ×N" render={freqStamp} />
              <FreqTile name="Cartouche à coins" render={freqBracket} />
              <FreqTile name="Ruban" render={freqRibbon} />
              <FreqTile name="Onglet fréquence" render={freqTab} />
            </div>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Interactif — compteur de charges (dans un cadre)</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Type en tampon (piste B) + un cadre « Capacité » qui enferme le compteur cliquable :
                on voit d'un coup combien d'usages restent <em>et</em> si la capacité a déjà été
                utilisée. Clique le compteur pour consommer une charge / recharger (démo).
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChargeCard ex={CHARGE_EXAMPLES[0]} variant="pips" />
              <ChargeCard ex={CHARGE_EXAMPLES[1]} variant="pips" />
              <ChargeCard ex={CHARGE_EXAMPLES[2]} variant="wax" />
            </div>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Cadre minimaliste — beige</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sans label « Capacité », compteur compact (jetons + « N×/portée »), cadre beige.
                Trois épaisseurs de cadre à comparer. Toujours cliquable (démo).
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MiniCard ex={CHARGE_EXAMPLES[0]} kind="box" />
              <MiniCard ex={CHARGE_EXAMPLES[1]} kind="outline" />
              <MiniCard ex={CHARGE_EXAMPLES[2]} kind="rule" />
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function Piste({
  id,
  title,
  desc,
  render,
}: {
  id: string;
  title: string;
  desc: string;
  render: (ex: RoleEx) => ReactNode;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-gold/40 font-display text-xs text-gold">
          {id}
        </span>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {EXAMPLES.map((ex) => (
          <Dossier key={ex.name} ex={ex}>
            {render(ex)}
          </Dossier>
        ))}
      </div>
    </article>
  );
}

// Coquille fidèle à la vraie fiche (role-zone paper pin) — seul le bloc badges change.
function Dossier({ ex, children }: { ex: RoleEx; children: ReactNode }) {
  const fc = FACTION_COLOR[ex.faction];
  return (
    <div className="role-zone paper pin px-4 pb-4 pt-5">
      <div className="mb-2 font-display text-[9px] uppercase tracking-[0.16em] text-[color:var(--paper-ink-soft)]">
        Dossier — ton rôle
      </div>
      <div className="flex items-center gap-3.5">
        <div
          className="relative size-[52px] shrink-0 overflow-hidden rounded-full"
          style={{
            boxShadow: `0 0 0 1.5px color-mix(in oklab, ${fc} 55%, transparent), 0 0 18px -6px ${fc}`,
          }}
        >
          <AvatarImg id={ex.avatar} fill rounded="none" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="text-xl font-bold leading-tight"
            style={{ fontFamily: DISPLAY, color: onPaper(fc, 72) }}
          >
            {ex.name}
          </h2>
          <div className="mt-1.5">{children}</div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[color:var(--paper-ink)]">
        {ex.cap}
      </p>
    </div>
  );
}

// ─────────────────────────── Pistes de badges ───────────────────────────

// A — puce + libellé + fréquence texte
function badgesDot(ex: RoleEx) {
  const m = roleTypeMeta(ex.type);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: m.color }} />
        <span
          className="font-display text-[11px] uppercase tracking-[0.14em]"
          style={{ color: onPaper(m.color) }}
        >
          {m.label}
        </span>
      </span>
      <span className="text-[11px] text-[color:var(--paper-ink-soft)]">· {ex.freq}</span>
    </div>
  );
}

// Tampon de type seul (réutilisé par la piste B et la version définitive).
function typeStampChip(type: string) {
  const m = roleTypeMeta(type);
  return (
    <span
      className="inline-flex -rotate-2 items-center rounded-[3px] border px-2 py-0.5 font-display text-[11px] uppercase tracking-[0.14em]"
      style={{
        color: onPaper(m.color),
        borderColor: `color-mix(in oklab, ${m.color} 55%, transparent)`,
        background: `color-mix(in oklab, ${m.color} 10%, transparent)`,
      }}
    >
      {m.label}
    </span>
  );
}

// B — tampon encreur incliné + fréquence à côté
function badgesStamp(ex: RoleEx) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {typeStampChip(ex.type)}
      <span className="text-[11px] text-[color:var(--paper-ink-soft)]">{ex.freq}</span>
    </div>
  );
}

// C — filet coloré sous le nom + libellé
function badgesRule(ex: RoleEx) {
  const m = roleTypeMeta(ex.type);
  return (
    <div className="space-y-1">
      <span className="block h-[2px] w-9 rounded-full" style={{ background: m.color }} />
      <div className="flex flex-wrap items-center gap-x-2">
        <span
          className="font-display text-[11px] uppercase tracking-[0.16em]"
          style={{ color: onPaper(m.color) }}
        >
          {m.label}
        </span>
        <span className="text-[11px] text-[color:var(--paper-ink-soft)]">· {ex.freq}</span>
      </div>
    </div>
  );
}

// D — onglet de dossier + fréquence monospace
function badgesTab(ex: RoleEx) {
  const m = roleTypeMeta(ex.type);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <span
        className="inline-flex items-center rounded-t-md border-x border-t px-2 pb-1 pt-0.5 font-display text-[10px] uppercase tracking-[0.12em]"
        style={{
          color: onPaper(m.color),
          borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)`,
          background: `color-mix(in oklab, ${m.color} 16%, transparent)`,
        }}
      >
        {m.label}
      </span>
      <span
        className="rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-tight"
        style={{
          color: "var(--paper-ink-soft)",
          borderColor: "color-mix(in oklab, var(--paper-ink) 25%, transparent)",
        }}
      >
        {ex.freq}
      </span>
    </div>
  );
}

// ─────────────────────── Fréquences : cadres & effets ───────────────────────

const GOLD = "var(--accent)";
const INK = "var(--paper-ink)";
const INKSOFT = "var(--paper-ink-soft)";
const RED = "var(--primary)";
const FREQ_SAMPLES = ["1×/Enquête", "2×/partie", "Passif"];

// "1×/Enquête" → { count: 1, scope: "Enquête" } · "Passif" → { passive: true }.
function parseFreq(label: string) {
  const m = label.match(/^(\d+)\s*×\s*\/\s*(.+)$/);
  if (m) return { count: Number(m[1]), scope: m[2], passive: false };
  return { count: 0, scope: label, passive: true };
}

function FreqTile({ name, render }: { name: string; render: (label: string) => ReactNode }) {
  return (
    <div className="paper rounded-md px-3 py-3">
      <div className="mb-3 font-display text-[9px] uppercase tracking-[0.16em] text-[color:var(--paper-ink-soft)]">
        {name}
      </div>
      <div className="flex flex-col items-start gap-3">
        {FREQ_SAMPLES.map((s) => (
          <div key={s}>{render(s)}</div>
        ))}
      </div>
    </div>
  );
}

// Pastille de charges — un point par usage + portée.
function freqPips(label: string) {
  const f = parseFreq(label);
  return (
    <span className="inline-flex items-center gap-1.5">
      {f.passive ? (
        <span className="size-1.5 rounded-full border" style={{ borderColor: INKSOFT }} />
      ) : (
        <span className="flex gap-0.5">
          {Array.from({ length: f.count }).map((_, i) => (
            <span key={i} className="size-1.5 rounded-full" style={{ background: GOLD }} />
          ))}
        </span>
      )}
      <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: INKSOFT }}>
        {f.passive ? f.scope : `/ ${f.scope}`}
      </span>
    </span>
  );
}

// Cachet de cire — pastille bombée rouge avec le compte.
function freqWax(label: string) {
  const f = parseFreq(label);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="grid size-6 place-items-center rounded-full font-display text-[10px] leading-none"
        style={{
          background: `radial-gradient(circle at 34% 30%, color-mix(in oklab, ${RED} 78%, white), ${RED})`,
          color: "var(--paper)",
          boxShadow: "inset 0 -1px 2px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.25)",
        }}
      >
        {f.passive ? "∙" : `×${f.count}`}
      </span>
      <span className="text-[11px]" style={{ color: INK }}>
        {f.scope}
      </span>
    </span>
  );
}

// Ticket perforé — bord gauche en pointillés (perforation).
function freqTicket(label: string) {
  return (
    <span
      className="inline-flex items-center rounded-r-sm py-0.5 pl-2 pr-2 font-mono text-[11px]"
      style={{
        color: INK,
        border: `1px solid color-mix(in oklab, ${INK} 25%, transparent)`,
        borderLeft: `2px dashed ${GOLD}`,
      }}
    >
      {label}
    </span>
  );
}

// Étiquette ficelée — forme de tag pointu + œillet.
function freqTag(label: string) {
  return (
    <span
      className="relative inline-flex items-center py-0.5 pl-4 pr-2.5 font-mono text-[11px]"
      style={{
        color: INK,
        background: `color-mix(in oklab, ${GOLD} 16%, transparent)`,
        clipPath: "polygon(14% 0, 100% 0, 100% 100%, 14% 100%, 0 50%)",
      }}
    >
      <span
        className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
        style={{ border: `1px solid color-mix(in oklab, ${INK} 45%, transparent)` }}
      />
      {label}
    </span>
  );
}

// Tampon ×N — cadre encreur incliné, compte en gros.
function freqStamp(label: string) {
  const f = parseFreq(label);
  return (
    <span
      className="inline-flex -rotate-3 items-baseline gap-1 rounded-[3px] border-2 px-1.5 py-0.5 font-display"
      style={{ color: RED, borderColor: `color-mix(in oklab, ${RED} 60%, transparent)` }}
    >
      {f.passive ? (
        <span className="text-[10px] uppercase tracking-wide">{f.scope}</span>
      ) : (
        <>
          <span className="text-sm leading-none">×{f.count}</span>
          <span className="text-[8px] uppercase tracking-wide">{f.scope}</span>
        </>
      )}
    </span>
  );
}

// Cartouche à coins — équerres façon dossier.
function freqBracket(label: string) {
  const corners = [
    "left-0 top-0 border-l border-t",
    "right-0 top-0 border-r border-t",
    "left-0 bottom-0 border-l border-b",
    "right-0 bottom-0 border-r border-b",
  ];
  return (
    <span className="relative inline-block px-2.5 py-1 font-mono text-[11px]" style={{ color: INK }}>
      {label}
      {corners.map((c, i) => (
        <span key={i} className={`absolute size-1.5 ${c}`} style={{ borderColor: GOLD }} />
      ))}
    </span>
  );
}

// Ruban — bannière à extrémités entaillées.
function freqRibbon(label: string) {
  return (
    <span
      className="inline-flex items-center px-3 py-0.5 font-display text-[10px] uppercase tracking-[0.1em]"
      style={{
        color: "var(--paper)",
        background: RED,
        clipPath: "polygon(0 0, 100% 0, 93% 50%, 100% 100%, 0 100%, 7% 50%)",
      }}
    >
      {label}
    </span>
  );
}

// Onglet fréquence — languette de dossier (coin haut arrondi).
function freqTab(label: string) {
  return (
    <span
      className="inline-flex items-center rounded-t-md border-x border-t px-2 pb-1 pt-0.5 font-mono text-[10px]"
      style={{
        color: INK,
        borderColor: `color-mix(in oklab, ${GOLD} 45%, transparent)`,
        background: `color-mix(in oklab, ${GOLD} 16%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

// ──────────────────── Interactif : compteur de charges ────────────────────

const SUCCESS = "var(--success)";
// Beige du cadre (ton sable chaud, plus clair que l'encre brune) — à ajuster.
const BEIGE = "oklch(0.79 0.045 78)";
// Code couleur des charges : vert = utilisable, orange = dispo mais pas maintenant.
const GREEN = "var(--success)";
const ORANGE = "oklch(0.72 0.17 55)";

// Accorde la mention de recharge selon la portée (tour = masc., Enquête = fém.,
// partie = pas de recharge en cours de jeu).
function rechargeClause(scope: string) {
  const s = scope.toLowerCase();
  if (s.includes("tour")) return "recharge au prochain tour";
  if (s.includes("enqu")) return "recharge à la prochaine Enquête";
  if (s.includes("parti")) return "pour cette partie";
  return `recharge à la prochaine ${scope}`;
}

const CHARGE_EXAMPLES: RoleEx[] = [
  {
    name: "Le Tueur",
    faction: "Méchant",
    type: "TUEUR",
    freq: "1×/Enquête",
    avatar: "leo",
    cap: "Une fois par Enquête, désigne 1 joueur vivant. Sa mort est annoncée à la prochaine Annonce.",
  },
  {
    name: "La Voyante",
    faction: "Civil",
    type: "INVESTIGATION",
    freq: "2×/partie",
    avatar: "kya",
    cap: "Sonde un joueur : découvre s'il t'apparaît innocent ou suspect.",
  },
  {
    name: "Le Barman",
    faction: "Civil",
    type: "SUPPORT",
    freq: "1×/tour",
    avatar: "hana",
    cap: "Sers un verre à un joueur : il est ivre au prochain tour et rate sa capacité.",
  },
];

function ChargeCard({ ex, variant }: { ex: RoleEx; variant: "pips" | "wax" }) {
  return (
    <Dossier ex={ex}>
      <div className="space-y-2.5">
        {badgesStamp(ex)}
        <CapacityFrame freq={ex.freq} variant={variant} />
      </div>
    </Dossier>
  );
}

// Cadre « Capacité » : encadre le compteur interactif pour le poser comme un
// bloc à part entière sous le badge de type.
function CapacityFrame({ freq, variant }: { freq: string; variant: "pips" | "wax" }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{
        borderColor: `color-mix(in oklab, ${INK} 22%, transparent)`,
        background: `color-mix(in oklab, ${INK} 4%, transparent)`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="font-display text-[9px] uppercase tracking-[0.18em]"
          style={{ color: INKSOFT }}
        >
          Capacité
        </span>
        <span
          className="h-px flex-1"
          style={{ background: `color-mix(in oklab, ${INK} 15%, transparent)` }}
        />
      </div>
      {variant === "pips" ? <ChargeTracker freq={freq} /> : <WaxCharge freq={freq} />}
    </div>
  );
}

// Jetons cliquables : plein = charge dispo, creux = déjà utilisée. Ligne d'état
// dessous. Clic = consommer la charge suivante (ou tout recharger si épuisée).
function ChargeTracker({ freq }: { freq: string }) {
  const f = parseFreq(freq);
  const [used, setUsed] = useState(0);
  if (f.passive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: INKSOFT }}>
        <span className="size-1.5 rounded-full border" style={{ borderColor: INKSOFT }} />
        Passif — toujours actif
      </span>
    );
  }
  const total = f.count;
  const allUsed = used >= total;
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setUsed(allUsed ? 0 : used + 1)}
        title={allUsed ? "Recharger (démo)" : "Utiliser une charge (démo)"}
        className="-mx-1.5 inline-flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-black/5"
      >
        <span className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => {
            const spent = i < used;
            return (
              <span
                key={i}
                className="size-3.5 rounded-full transition-all duration-200"
                style={
                  spent
                    ? {
                        border: `1px solid color-mix(in oklab, ${INK} 30%, transparent)`,
                        opacity: 0.5,
                        transform: "scale(0.85)",
                      }
                    : {
                        background: GOLD,
                        boxShadow: `0 0 0 1.5px color-mix(in oklab, ${GOLD} 35%, transparent)`,
                      }
                }
              />
            );
          })}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: INKSOFT }}>
          / {f.scope}
        </span>
      </button>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span
          className="size-1.5 rounded-full"
          style={{ background: allUsed ? RED : SUCCESS }}
        />
        <span style={{ color: allUsed ? onPaper(RED) : onPaper(SUCCESS) }}>
          {allUsed
            ? `Épuisée — ${rechargeClause(f.scope)}`
            : `Prête — ${total - used}/${total} dispo`}
        </span>
      </div>
    </div>
  );
}

// Variante sceau de cire : rouge intact = dispo, gris estampé = utilisée.
function WaxCharge({ freq }: { freq: string }) {
  const f = parseFreq(freq);
  const [used, setUsed] = useState(false);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setUsed((v) => !v)}
        title={used ? "Recharger (démo)" : "Utiliser (démo)"}
        className="-mx-1 inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-black/5"
      >
        <span
          className="grid size-7 place-items-center rounded-full font-display text-[11px] leading-none transition-all duration-200"
          style={
            used
              ? {
                  background: `color-mix(in oklab, ${INK} 20%, var(--paper))`,
                  color: INKSOFT,
                  boxShadow: "inset 0 -1px 2px rgba(0,0,0,.2)",
                }
              : {
                  background: `radial-gradient(circle at 34% 30%, color-mix(in oklab, ${RED} 78%, white), ${RED})`,
                  color: "var(--paper)",
                  boxShadow:
                    "inset 0 -1px 2px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.25)",
                }
          }
        >
          {f.passive ? "∙" : `×${f.count}`}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: INKSOFT }}>
          / {f.scope}
        </span>
      </button>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="size-1.5 rounded-full" style={{ background: used ? RED : SUCCESS }} />
        <span style={{ color: used ? onPaper(RED) : onPaper(SUCCESS) }}>
          {used ? `Utilisée — ${rechargeClause(f.scope)}` : "Disponible"}
        </span>
      </div>
    </div>
  );
}

// ─────────────── Cadres minimalistes (beige) — compteur compact ───────────────

// Compteur compact : jetons pleins (dispo) / creux (utilisés) + « N×/portée ».
// Pas de phrase d'état — l'info « épuisée » passe par les jetons + l'infobulle.
function ChargeTrackerMini({ freq }: { freq: string }) {
  const f = parseFreq(freq);
  const [used, setUsed] = useState(0);
  if (f.passive) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: INKSOFT }}>
        Passif
      </span>
    );
  }
  const total = f.count;
  const allUsed = used >= total;
  return (
    <button
      type="button"
      onClick={() => setUsed(allUsed ? 0 : used + 1)}
      title={allUsed ? "Recharger (démo)" : "Utiliser une charge (démo)"}
      className="inline-flex items-center gap-1.5"
    >
      <span className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const spent = i < used;
          return (
            <span
              key={i}
              className="size-2.5 rounded-full transition-all duration-200"
              style={
                spent
                  ? {
                      border: `1px solid color-mix(in oklab, ${INK} 30%, transparent)`,
                      opacity: 0.5,
                      transform: "scale(0.85)",
                    }
                  : {
                      background: GOLD,
                      boxShadow: `0 0 0 1px color-mix(in oklab, ${GOLD} 35%, transparent)`,
                    }
              }
            />
          );
        })}
      </span>
      <span className="font-mono text-[10px]" style={{ color: allUsed ? INKSOFT : INK }}>
        {total}×/{f.scope}
      </span>
    </button>
  );
}

function MiniFrame({ kind, children }: { kind: "box" | "outline" | "rule"; children: ReactNode }) {
  if (kind === "box")
    return (
      <span
        className="inline-flex rounded-md border px-2.5 py-1.5"
        style={{ borderColor: BEIGE, background: `color-mix(in oklab, ${BEIGE} 14%, transparent)` }}
      >
        {children}
      </span>
    );
  if (kind === "outline")
    return (
      <span className="inline-flex rounded-md border px-2 py-1" style={{ borderColor: BEIGE }}>
        {children}
      </span>
    );
  return (
    <span className="inline-flex border-l-2 py-0.5 pl-2" style={{ borderColor: BEIGE }}>
      {children}
    </span>
  );
}

function MiniCard({ ex, kind }: { ex: RoleEx; kind: "box" | "outline" | "rule" }) {
  return (
    <Dossier ex={ex}>
      <div className="space-y-2.5">
        {badgesStamp(ex)}
        <MiniFrame kind={kind}>
          <ChargeTrackerMini freq={ex.freq} />
        </MiniFrame>
      </div>
    </Dossier>
  );
}

// ─────────────────────── Version définitive (large) ───────────────────────

// Compteur définitif : code couleur vert / orange / creux.
// - creux  : charge déjà utilisée
// - vert   : charge restante ET actionnable maintenant
// - orange : charge restante mais pas actionnable là (phase, blocage…)
function DefinitiveTracker({
  freq,
  canAct,
  initialUsed = 0,
  green = GREEN,
  orange = ORANGE,
}: {
  freq: string;
  canAct: boolean;
  initialUsed?: number;
  green?: string;
  orange?: string;
}) {
  const f = parseFreq(freq);
  const [used, setUsed] = useState(initialUsed);
  if (f.passive) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: INKSOFT }}>
        Passif
      </span>
    );
  }
  const total = f.count;
  const allUsed = used >= total;
  const onClick = () => {
    if (allUsed) setUsed(0);
    else if (canAct) setUsed(used + 1);
  };
  const title = allUsed
    ? "Recharger (démo)"
    : canAct
      ? "Utiliser une charge (démo)"
      : "Dispo mais pas actionnable maintenant";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5"
      style={{ cursor: !allUsed && !canAct ? "not-allowed" : "pointer" }}
    >
      <span className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const spent = i < used;
          const color = canAct ? green : orange;
          return (
            <span
              key={i}
              className="size-2.5 rounded-full transition-all duration-200"
              style={
                spent
                  ? {
                      border: `1px solid color-mix(in oklab, ${INK} 30%, transparent)`,
                      opacity: 0.5,
                      transform: "scale(0.85)",
                    }
                  : {
                      background: color,
                      boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 40%, transparent)`,
                    }
              }
            />
          );
        })}
      </span>
      <span className="font-mono text-[10px]" style={{ color: allUsed ? INKSOFT : INK }}>
        {total}×/{f.scope}
      </span>
    </button>
  );
}

function DefinitiveCard({
  ex,
  canAct,
  initialUsed = 0,
  note,
  green,
  orange,
}: {
  ex: RoleEx;
  canAct: boolean;
  initialUsed?: number;
  note: string;
  green?: string;
  orange?: string;
}) {
  return (
    <div className="w-full max-w-xl">
      <Dossier ex={ex}>
        <div className="flex flex-wrap items-center gap-2">
          {typeStampChip(ex.type)}
          <MiniFrame kind="box">
            <DefinitiveTracker
              freq={ex.freq}
              canAct={canAct}
              initialUsed={initialUsed}
              green={green}
              orange={orange}
            />
          </MiniFrame>
        </div>
      </Dossier>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function FreqColorLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ background: GREEN }} />
        Utilisable maintenant
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ background: ORANGE }} />
        Dispo, pas maintenant
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-full border"
          style={{ borderColor: "currentColor", opacity: 0.6 }}
        />
        Utilisée
      </span>
    </div>
  );
}

// ─────────────────── Variantes de couleurs (code des charges) ───────────────────

type ChargePalette = { name: string; green: string; orange: string };

const CHARGE_PALETTES: ChargePalette[] = [
  { name: "Vert · Orange (actuel)", green: "var(--success)", orange: "oklch(0.72 0.17 55)" },
  { name: "Émeraude · Ambre", green: "oklch(0.72 0.16 158)", orange: "oklch(0.8 0.15 78)" },
  { name: "Sauge · Terracotta", green: "oklch(0.66 0.09 150)", orange: "oklch(0.62 0.16 42)" },
  { name: "Jade · Safran", green: "oklch(0.7 0.13 168)", orange: "oklch(0.78 0.16 68)" },
  { name: "Olive · Rouille", green: "oklch(0.68 0.11 130)", orange: "oklch(0.58 0.15 38)" },
  { name: "Menthe · Cuivre", green: "oklch(0.76 0.12 165)", orange: "oklch(0.66 0.14 50)" },
];

function StateDot({ color }: { color: string }) {
  return (
    <span
      className="size-2.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 0 1px color-mix(in oklab, ${color} 40%, transparent)` }}
    />
  );
}

function ColorVariantRow({ p }: { p: ChargePalette }) {
  return (
    <div className="paper rounded-md px-3 py-2.5">
      <div
        className="mb-2 font-display text-[9px] uppercase tracking-[0.16em]"
        style={{ color: INKSOFT }}
      >
        {p.name}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]" style={{ color: INK }}>
        <span className="inline-flex items-center gap-1.5">
          <StateDot color={p.green} />
          utilisable
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StateDot color={p.orange} />
          pas maintenant
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full border"
            style={{ borderColor: `color-mix(in oklab, ${INK} 30%, transparent)`, opacity: 0.5 }}
          />
          utilisée
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-1"
          style={{ borderColor: BEIGE, background: `color-mix(in oklab, ${BEIGE} 14%, transparent)` }}
        >
          <span className="flex gap-1">
            <StateDot color={p.green} />
            <StateDot color={p.green} />
          </span>
          <span className="font-mono text-[10px]" style={{ color: INK }}>
            2×/partie
          </span>
        </span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
      <h2 className="mb-3 font-display text-[10px] uppercase tracking-[0.24em] text-gold">
        {title}
      </h2>
      {children}
    </section>
  );
}
