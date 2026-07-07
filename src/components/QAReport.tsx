// QA report UI — surfaced in /demo. A compact live summary (severity counts)
// and a full grouped report (by category → role) with collapsible evidence and
// a copy-to-Markdown button so findings can be pasted straight into a ticket.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCopy, Check, Trash2 } from "lucide-react";
import {
  type QAFinding,
  type Severity,
  type Category,
  SEVERITY_META,
  CATEGORY_META,
} from "@/engine/qa/types";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "info"];
const CATEGORY_ORDER: Category[] = ["rules", "leak", "bug", "ux"];

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "border-red-500/50 text-red-300 bg-red-500/10",
  high: "border-orange-500/50 text-orange-300 bg-orange-500/10",
  medium: "border-amber-400/50 text-amber-200 bg-amber-400/10",
  info: "border-sky-500/50 text-sky-300 bg-sky-500/10",
};

function sevRank(s: Severity) {
  return SEVERITY_META[s].order;
}

// ── Compact live summary (left column of the demo) ──────────────────────────
export function QASeverityCounts({
  findings,
  onOpen,
}: {
  findings: QAFinding[];
  onOpen: () => void;
}) {
  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, info: 0 };
    for (const f of findings) c[f.severity] += 1;
    return c;
  }, [findings]);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded border border-border/60 bg-background/40 px-2.5 py-2 hover:bg-secondary/30 transition"
      title="Ouvrir le rapport QA"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Rapport QA
        </span>
        <span className="text-[10px] text-muted-foreground">
          {findings.length} problème{findings.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {SEVERITY_ORDER.map((s) => (
          <span
            key={s}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] border ${SEVERITY_TONE[s]} ${counts[s] === 0 ? "opacity-35" : ""}`}
          >
            {SEVERITY_META[s].emoji} {counts[s]}
          </span>
        ))}
      </div>
    </button>
  );
}

// ── Markdown export ─────────────────────────────────────────────────────────
function toMarkdown(findings: QAFinding[]): string {
  const lines: string[] = ["# Rapport QA — bots agents", ""];
  lines.push(`_${findings.length} problème(s) détecté(s)._`, "");
  // Groupe par partie (récente en tête), puis par catégorie → sévérité.
  const games = new Map<string, QAFinding[]>();
  for (const f of findings) {
    const code = f.gameCode ?? "—";
    const arr = games.get(code);
    if (arr) arr.push(f);
    else games.set(code, [f]);
  }
  const ordered = [...games.entries()].sort(
    (a, b) =>
      Math.max(...b[1].map((i) => i.lastSeenAt)) - Math.max(...a[1].map((i) => i.lastSeenAt)),
  );
  for (const [code, items] of ordered) {
    lines.push(`# Partie ${code} (${items.length})`, "");
    for (const cat of CATEGORY_ORDER) {
      const inCat = items
        .filter((f) => f.category === cat)
        .sort((a, b) => sevRank(a.severity) - sevRank(b.severity));
      if (inCat.length === 0) continue;
      lines.push(
        `## ${CATEGORY_META[cat].emoji} ${CATEGORY_META[cat].label} (${inCat.length})`,
        "",
      );
      for (const f of inCat) {
        const sev = SEVERITY_META[f.severity];
        const role = f.roleName ? ` · _${f.roleName}_` : "";
        const seen = f.count > 1 ? ` ·×${f.count}` : "";
        lines.push(`- ${sev.emoji} **${f.title}**${role} — tour ${f.tour}/${f.phase}${seen}`);
        lines.push(`  ${f.detail}`);
        if (f.evidence) lines.push("  ```json", `  ${JSON.stringify(f.evidence)}`, "  ```");
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

// ── Full report view (modal body) ──────────────────────────────────────────
export function QAReport({ findings, onClear }: { findings: QAFinding[]; onClear?: () => void }) {
  const [copied, setCopied] = useState(false);

  // Journal PAR PARTIE : on regroupe d'abord par code de partie (la plus récente
  // en tête), puis par catégorie → sévérité à l'intérieur. Chaque partie a donc
  // son propre log identifiable, sans mélange entre parties.
  const byGame = useMemo(() => {
    const m = new Map<string, QAFinding[]>();
    for (const f of findings) {
      const code = f.gameCode ?? "—";
      const arr = m.get(code);
      if (arr) arr.push(f);
      else m.set(code, [f]);
    }
    return [...m.entries()]
      .map(([code, items]) => ({
        code,
        items,
        last: Math.max(...items.map((i) => i.lastSeenAt)),
        cats: CATEGORY_ORDER.map((cat) => ({
          cat,
          items: items
            .filter((f) => f.category === cat)
            .sort(
              (a, b) => sevRank(a.severity) - sevRank(b.severity) || b.lastSeenAt - a.lastSeenAt,
            ),
        })).filter((g) => g.items.length > 0),
      }))
      .sort((a, b) => b.last - a.last);
  }, [findings]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(findings));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked; no-op
    }
  }

  if (findings.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Aucun problème détecté pour l'instant. Lance une partie et laisse les bots jouer.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {findings.length} problème{findings.length > 1 ? "s" : ""} · {byGame.length} partie
          {byGame.length > 1 ? "s" : ""} · récente en tête
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              onClick={onClear}
              className="px-2 py-1 text-[11px] rounded border border-border hover:bg-secondary/40 flex items-center gap-1.5"
            >
              <Trash2 className="size-3" /> Vider
            </button>
          )}
          <button
            onClick={copy}
            className="px-2 py-1 text-[11px] rounded border border-gold/40 text-gold hover:bg-gold/10 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="size-3" /> Copié
              </>
            ) : (
              <>
                <ClipboardCopy className="size-3" /> Copier (Markdown)
              </>
            )}
          </button>
        </div>
      </div>

      {byGame.map((game, gi) => (
        <div key={game.code} className="rounded-lg border border-border/60 bg-background/30 p-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                Partie
              </span>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
                {game.code}
              </span>
              {gi === 0 && (
                <span className="text-[9px] uppercase tracking-wider text-emerald-300/80">
                  la plus récente
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {game.items.length} problème{game.items.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3">
            {game.cats.map((g) => (
              <section key={g.cat}>
                <h3 className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span>{CATEGORY_META[g.cat].emoji}</span> {CATEGORY_META[g.cat].label}
                  <span className="text-muted-foreground/60">· {g.items.length}</span>
                </h3>
                <div className="space-y-1.5">
                  {g.items.map((f) => (
                    <FindingCard key={f.id} f={f} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FindingCard({ f }: { f: QAFinding }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_META[f.severity];
  return (
    <div className={`rounded-lg border px-3 py-2 ${SEVERITY_TONE[f.severity]}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start gap-2"
      >
        <span className="mt-0.5 shrink-0">{sev.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-foreground/95 leading-snug">{f.title}</span>
            <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
              t{f.tour}/{f.phase}
              {f.count > 1 ? ` ×${f.count}` : ""}
            </span>
          </div>
          {f.roleName && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Rôle : {f.roleName}
              {f.botPseudo ? ` · ${f.botPseudo}` : ""}
            </div>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </span>
      </button>
      {open && (
        <div className="mt-2 pl-6 space-y-2">
          <p className="text-xs text-foreground/80 leading-relaxed">{f.detail}</p>
          {f.evidence && (
            <pre className="text-[10px] font-mono bg-background/50 border border-border/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(f.evidence, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
