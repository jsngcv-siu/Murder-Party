// P10 — Onglet "Les rôles" : fiche par rôle, recherche.
// Source : table `roles` (set1) déjà chargée dans le contexte.
import { useMemo, useState, type ElementType } from "react";
import type { FrameContext } from "../registry";
import { RoleIcon } from "@/components/RoleIcon";
import { computeRoleFrequency, FREQ_COLORS } from "@/lib/roleAppearance";
import {
  Shield,
  Swords,
  Search,
  Heart,
  VenetianMask,
  Anchor,
  Skull,
  Flame,
  Smile,
  Library,
} from "lucide-react";

export function P10Roles({ roles }: FrameContext) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const arr = Array.from(roles.values())
      .filter((r) => r.is_disabled !== true)
      .sort((a, b) => a.name_fr.localeCompare(b.name_fr));
    if (!q.trim()) return arr;
    const k = q.toLowerCase();
    return arr.filter(
      (r) => r.name_fr.toLowerCase().includes(k) || (r.description ?? "").toLowerCase().includes(k),
    );
  }, [roles, q]);

  const detail = open ? roles.get(open) : null;

  // Couleur de faction (halo de la fiche + sous-titre). Le Vampire suit le camp Méchant visuellement.
  const factionColor = (r: { faction: string; slug: string }) => {
    if (r.slug === "vampire") return "var(--vampires)";
    if (r.faction === "Civil") return "var(--citoyens)";
    if (r.faction === "Méchant") return "var(--mechants)";
    if (r.faction === "Neutre") return "var(--neutres)";
    return "var(--muted-foreground)";
  };

  return (
    <div className="h-full flex flex-col bg-background p-5">
      <div className="font-display text-base tracking-wide flex items-center gap-2 text-foreground">
        <Library className="size-4 text-primary" aria-hidden /> Les rôles
      </div>
      <div className="relative mt-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un rôle…"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-gold/40"
        />
      </div>
      <div className="flex-1 mt-3 overflow-y-auto -mx-2 px-2">
        {list.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">Aucun rôle trouvé</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {list.map((r) => {
              const fc = factionColor(r);
              return (
                <button
                  key={r.slug}
                  onClick={() => setOpen(r.slug)}
                  className="flex flex-col items-center text-center rounded-xl border border-border bg-white/[0.03] px-2 pt-3 pb-2.5 transition hover:border-gold/40 hover:brightness-110 active:scale-[0.98]"
                >
                  <div
                    className="size-14 grid place-items-center rounded-full overflow-hidden"
                    style={{
                      background:
                        "radial-gradient(circle at 38% 30%, oklch(0.26 0.02 300), oklch(0.18 0.015 300))",
                      boxShadow: `0 0 0 2px color-mix(in oklab, ${fc} 38%, transparent), inset 0 0 12px oklch(0 0 0 / 0.4)`,
                    }}
                  >
                    <RoleIcon role={r} size={56} className="w-full h-full object-cover" />
                  </div>
                  <div className="font-display text-[11.5px] leading-tight mt-2 text-foreground line-clamp-2">
                    {r.name_fr}
                  </div>
                  <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: fc }}>
                    {r.faction} · {r.type}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-6 max-w-md mx-auto">
          <button
            onClick={() => setOpen(null)}
            className="self-start text-sm text-muted-foreground"
          >
            ← retour
          </button>
          <div className="mt-3 text-center">
            <div className="flex justify-center">
              <RoleIcon role={detail} size={96} />
            </div>
            <h2
              className="mt-2 text-2xl font-bold text-gold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {detail.name_fr}
            </h2>
            <UsageCard role={detail} />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {/* Faction */}
              <span
                className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
                style={{
                  color:
                    detail.faction === "Civil"
                      ? "var(--citoyens)"
                      : detail.faction === "Méchant"
                        ? "var(--mechants)"
                        : "var(--neutres)",
                  borderColor:
                    detail.faction === "Civil"
                      ? "oklch(0.72 0.16 230 / 0.35)"
                      : detail.faction === "Méchant"
                        ? "oklch(0.62 0.24 22 / 0.35)"
                        : "oklch(0.80 0.12 300 / 0.40)",
                  backgroundColor:
                    detail.faction === "Civil"
                      ? "oklch(0.72 0.16 230 / 0.12)"
                      : detail.faction === "Méchant"
                        ? "oklch(0.62 0.24 22 / 0.12)"
                        : "oklch(0.80 0.12 300 / 0.14)",
                }}
              >
                {detail.faction}
              </span>

              {/* Type */}
              {(() => {
                const meta: Record<string, { icon: ElementType; color: string }> = {
                  PROTECTEUR: { icon: Shield, color: "oklch(0.70 0.18 145)" },
                  TUEUR: { icon: Swords, color: "oklch(0.62 0.24 22)" },
                  INVESTIGATION: { icon: Search, color: "oklch(0.65 0.14 220)" },
                  SUPPORT: { icon: Heart, color: "oklch(0.75 0.12 20)" },
                  TROMPERIE: { icon: VenetianMask, color: "oklch(0.65 0.12 300)" },
                  BOULET: { icon: Anchor, color: "oklch(0.60 0.06 230)" },
                  MAL: { icon: Skull, color: "oklch(0.55 0.20 22)" },
                  CHAOS: { icon: Flame, color: "oklch(0.75 0.18 50)" },
                  BÉNIN: { icon: Smile, color: "oklch(0.70 0.14 150)" },
                };
                const t = meta[detail.type ?? ""] ?? {
                  icon: Shield,
                  color: "var(--muted-foreground)",
                };
                const Icon = t.icon;
                return (
                  <span
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
                    style={{
                      color: t.color,
                      borderColor: t.color.replace(")", " / 0.35)"),
                      backgroundColor: t.color.replace(")", " / 0.12)"),
                    }}
                  >
                    <Icon className="size-3" />
                    {detail.type}
                  </span>
                );
              })()}

              {/* Difficulté */}
              {(() => {
                const fcolor =
                  detail.faction === "Civil"
                    ? "var(--citoyens)"
                    : detail.faction === "Méchant"
                      ? "var(--mechants)"
                      : "var(--neutres)";
                const bcolor =
                  detail.faction === "Civil"
                    ? "oklch(0.72 0.16 230 / 0.12)"
                    : detail.faction === "Méchant"
                      ? "oklch(0.62 0.24 22 / 0.12)"
                      : "oklch(0.80 0.12 300 / 0.14)";
                const brcolor =
                  detail.faction === "Civil"
                    ? "oklch(0.72 0.16 230 / 0.35)"
                    : detail.faction === "Méchant"
                      ? "oklch(0.62 0.24 22 / 0.35)"
                      : "oklch(0.80 0.12 300 / 0.40)";
                return (
                  <span
                    className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold border"
                    style={{ color: fcolor, borderColor: brcolor, backgroundColor: bcolor }}
                  >
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: fcolor }}
                    />
                    {detail.difficulte}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="mt-4 overflow-y-auto text-sm space-y-3">
            {detail.description && <p className="text-muted-foreground">{detail.description}</p>}
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Capacité</div>
              <p className="whitespace-pre-wrap rounded bg-card border border-border p-3 text-sm">
                {detail.capacite_full_text}
              </p>
            </div>
            {(() => {
              const all = Array.from(roles.values());
              const freq = computeRoleFrequency(detail, all);
              return (
                <div className={`rounded border p-3 ${FREQ_COLORS[freq.level]}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest opacity-80">
                      Fréquence en jeu
                    </div>
                    <div className="text-xs font-bold">{freq.label}</div>
                  </div>
                  {freq.brackets.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      {freq.brackets.map((b) => (
                        <div key={b.players} className="rounded bg-background/40 py-1">
                          <div className="text-[9px] opacity-70">{b.players} joueurs</div>
                          <div className="text-sm font-semibold">{b.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-[10px] opacity-80 leading-snug">{freq.hint}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPhaseActivation(p?: string | null): string {
  if (!p) return "";
  const s = p.toLowerCase().replace(/_/g, " ").trim();
  if (s === "continu") return "Permanent";
  if (s === "setup") return "Au setup";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function usageDetailFor(slug: string): string | null {
  if (slug === "executeur" || slug === "juge") return "1× ≤ 10 j · 2× 11–13 j · 3× 14 j +";
  if (slug === "cleaner") return "1× < 10 j · 2× 10 j +";
  if (slug === "apothicaire") return "max 3 fois sur la partie";
  return null;
}

export function UsageCard({
  role,
}: {
  role: { slug: string; usage_label: string; phase_activation: string | null };
}) {
  const detail = usageDetailFor(role.slug);
  const phase = formatPhaseActivation(role.phase_activation);
  return (
    <div className="mt-3 flex justify-center">
      <div className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-gold/30 bg-gold/5 px-4 py-2 max-w-full">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Fréquence d'utilisation
        </div>
        <div className="text-sm font-semibold text-gold">{role.usage_label}</div>
        {detail && <div className="text-[10px] text-muted-foreground">{detail}</div>}
        {phase && <div className="text-[10px] text-muted-foreground">{phase}</div>}
      </div>
    </div>
  );
}
