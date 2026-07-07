// Bandeau de statuts du joueur — affiché sous le header de phase.
// V2 : combine la lecture legacy de role_meta + les lignes de la table
// `player_statuses` écrites par le resolver. Déduplique par label.
// Tap sur un badge → cadre explicatif déplié sous la rangée (au-dessus de l'UI).
import { useEffect, useState } from "react";
import type { PlayerRow } from "@/lib/game";
import { supabase } from "@/integrations/supabase/client";
import { type Tone, TONE_CLS, TONE_HUE } from "@/lib/tones";

// Couleur de glyphe d'un badge (traitement « Sigil » duotone), dérivée du ton :
// claire pour ressortir sur le disque sombre, même grammaire que les onglets.
function toneAccent(tone: Tone): string {
  const { hue, chroma } = TONE_HUE[tone];
  return `oklch(0.82 ${chroma} ${hue})`;
}
import {
  Ban,
  Crosshair,
  Dices,
  Drama,
  Flag,
  FlaskConical,
  Hand,
  Heart,
  Lock,
  Martini,
  ShieldCheck,
  Skull,
  Sparkles,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";

type StatusRow = {
  id: string;
  status_slug: string;
  source: string | null;
  active_from_tour: number;
  active_until_tour: number | null;
  payload: Record<string, unknown> | null;
};

// Chaque statut : une icône (séparée du label pour mieux ressortir) + un `Tone`
// défini dans la source unique @/lib/tones (vocabulaire partagé avec les modales).
const STATUS_BADGE: Record<string, { icon: LucideIcon; label: string; tone: Tone; desc: string }> =
  {
    protected: {
      icon: ShieldCheck,
      label: "Protégé",
      tone: "sky",
      desc: "Protection active : toute attaque te visant sera bloquée jusqu'à la fin de la durée.",
    },
    poisoned: {
      icon: FlaskConical,
      label: "Empoisonné",
      tone: "emerald",
      desc: "Poison en toi. Sans soin, c'est la mort au prochain rassemblement.",
    },
    blocked: {
      icon: Ban,
      label: "Bloqué",
      tone: "rose",
      desc: "Ta capacité de rôle ET tes objets sont bloqués ce tour-ci. Tu ne peux rien utiliser.",
    },
    blackmailed: {
      icon: Hand,
      label: "Chantage",
      tone: "redDark",
      desc: "Tu es sous chantage : ta capacité et tes objets sont bloqués ce tour-ci.",
    },
    drunk: {
      icon: Wine,
      label: "Ivre",
      tone: "amber",
      desc: "Le barman t'a servi un verre de trop : ta capacité et tes objets sont bloqués ce tour-ci.",
    },
    blessed: {
      icon: Sparkles,
      label: "Béni",
      tone: "yellow",
      desc: "Bénédiction active. Une grâce te protège — vois les détails du rôle qui l'a accordée.",
    },
    marked: {
      icon: Flag,
      label: "Suspect",
      tone: "orange",
      desc: "Un accusateur a jeté la suspicion sur toi en public. Cela peut influencer les votes.",
    },
    manipulated: {
      icon: Drama,
      label: "Manipulé",
      tone: "purple",
      desc: "Le Marionnettiste te manipule : ta capacité a été détournée ou bloquée.",
    },
    dice_loser: {
      icon: Dices,
      label: "Perdant aux dés",
      tone: "redDark",
      desc: "Tu as perdu le pari du tricheur. À la prochaine annonce, tu seras mort — sauf si une protection te sauve d'ici là.",
    },
    cible: {
      icon: Crosshair,
      label: "Ciblé",
      tone: "redDark",
      desc: "Le Tueur Stratège t'a marqué. Tu mourras à la prochaine annonce — sauf si une protection te sauve, ou s'il est neutralisé d'ici là.",
    },
  };

export function StatusBandeau({
  me,
  tour,
  players,
}: {
  me: PlayerRow;
  tour: number;
  players?: PlayerRow[];
}) {
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  // Badge dont l'explication est dépliée, en cadre sous la rangée de statuts.
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("player_statuses")
        .select("id, status_slug, source, active_from_tour, active_until_tour, payload")
        .eq("game_id", me.game_id)
        .eq("player_id", me.id);
      const rows = ((data ?? []) as StatusRow[]).filter(
        (s) =>
          s.active_from_tour <= tour &&
          (s.active_until_tour == null || s.active_until_tour >= tour),
      );
      setStatuses(rows);
    };
    void load();
    const ch = supabase
      .channel(`statuses-${me.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_statuses", filter: `player_id=eq.${me.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me.id, me.game_id, tour]);

  const meta = (me.role_meta ?? {}) as Record<string, unknown>;
  type Badge = { key: string; icon: LucideIcon; label: string; tone: Tone; desc: string };
  const badges: Badge[] = [];
  const pushDef = (
    key: string,
    def: { icon: LucideIcon; label: string; tone: Tone; desc?: string } | undefined,
  ) => {
    if (!def) return;
    badges.push({ key, icon: def.icon, label: def.label, tone: def.tone, desc: def.desc ?? "" });
  };

  // ─── Source 1 : lectures legacy depuis role_meta ───
  if (meta.poisoned === true) pushDef("poisoned", STATUS_BADGE.poisoned);
  const blackmail = meta.blackmail_until_cycle as number | undefined;
  const blackmailFrom = (meta.blackmail_from_cycle as number | undefined) ?? -Infinity;
  if (blackmail && blackmail >= tour && blackmailFrom <= tour)
    pushDef("blackmailed", STATUS_BADGE.blackmailed);
  const drunk = meta.drunk_until_cycle as number | undefined;
  const drunkFrom = (meta.drunk_from_cycle as number | undefined) ?? -Infinity;
  if (drunk && drunk >= tour && drunkFrom <= tour) pushDef("drunk", STATUS_BADGE.drunk);
  // 🛡️ Protégé : volontairement masqué côté joueur (visible uniquement par le MJ).
  const blocked = meta.blocked_until_cycle as number | undefined;
  const blockedFrom = (meta.blocked_from_cycle as number | undefined) ?? -Infinity;
  if (blocked && blocked >= tour && blockedFrom <= tour) pushDef("blocked", STATUS_BADGE.blocked);
  const markedUntil = meta.marked_suspect_until_cycle as number | undefined;
  const markedLegacy = meta.marked_suspect as boolean | undefined;
  if ((markedUntil && markedUntil >= tour) || markedLegacy) pushDef("marked", STATUS_BADGE.marked);
  const linkedId =
    (meta.linked_with as string | undefined) ?? (meta.linked_to as string | undefined);
  if (linkedId) {
    const partner = players?.find((p) => p.id === linkedId);
    badges.push({
      key: "lover",
      icon: Heart,
      label: partner ? `Amoureux · ${partner.pseudo}` : "Amoureux",
      tone: "pink",
      desc: "Lien amoureux : si l'un meurt, l'autre suit. Vous gagnez ensemble.",
    });
  }
  const blessed = meta.blessed_until_cycle as number | undefined;
  if (blessed && blessed >= tour) pushDef("blessed", STATUS_BADGE.blessed);
  const forcedCycle = meta.forced_action_cycle as number | undefined;
  if (forcedCycle && forcedCycle >= tour) pushDef("manipulated", STATUS_BADGE.manipulated);
  // 🎯 Ciblé par le Stratège : embuscade télégraphiée, mort à l'annonce du tour `resolves_tour`.
  const strategeMark = meta.targeted_by_stratege as { resolves_tour?: number } | undefined;
  if (strategeMark && (strategeMark.resolves_tour ?? -1) >= tour)
    pushDef("cible", STATUS_BADGE.cible);

  // ─── Source 2 : lignes player_statuses (resolver v2) ───
  for (const s of statuses) {
    if (s.status_slug === "protected") continue; // masqué côté joueur
    if (s.status_slug === "good_time") {
      const partner =
        (s.payload?.partner_pseudo as string | undefined) ??
        players?.find((p) => p.id === (s.payload?.partner_id as string | undefined))?.pseudo ??
        "quelqu'un";
      badges.push({
        key: "good_time",
        icon: Martini,
        label: "Bon moment",
        tone: "fuchsia",
        desc: `Tu as passé du bon temps avec ${partner}.`,
      });
      continue;
    }
    const def = STATUS_BADGE[s.status_slug];
    if (!def) continue;
    if (badges.some((b) => b.key === s.status_slug)) continue;
    pushDef(s.status_slug, def);
  }

  // Mort / prison
  if (!me.is_alive)
    badges.unshift({
      key: "dead",
      icon: Skull,
      label: "Mort",
      tone: "deadGreen",
      desc: "C'est la fin pour toi. Tu peux observer la partie et le chat des morts.",
    });
  else if (me.is_imprisoned)
    badges.unshift({
      key: "prison",
      icon: Lock,
      label: "Prison",
      tone: "stone",
      desc: "Tu es en prison : tu ne peux plus utiliser ta capacité jusqu'à ta libération.",
    });

  if (badges.length === 0) return null;
  const openBadge = openKey ? (badges.find((b) => b.key === openKey) ?? null) : null;
  return (
    <div className="max-w-md mx-auto w-full px-3 py-2 border-b border-border/40 bg-gradient-to-b from-card/50 to-card/20 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        <span
          className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-semibold pr-1 shrink-0 select-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Statuts
        </span>
        {badges.map((b) => {
          const Icon = b.icon;
          const accent = toneAccent(b.tone);
          const active = openKey === b.key;
          return (
            <button
              key={b.key}
              type="button"
              aria-expanded={active}
              onClick={() => setOpenKey((k) => (k === b.key ? null : b.key))}
              className={`shrink-0 inline-flex items-center gap-1 min-h-[24px] pl-1.5 pr-2 py-[3px] rounded-full border text-[10px] font-semibold tracking-wider uppercase transition-all active:scale-95 hover:brightness-125 hover:-translate-y-px ${TONE_CLS[b.tone]} ${active ? "brightness-125 -translate-y-px" : ""}`}
            >
              <span
                className="inline-flex items-center justify-center size-[18px] rounded-full"
                style={{
                  background: `color-mix(in oklab, ${accent} 18%, oklch(0.12 0.02 35 / 0.7))`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 38%, transparent)`,
                }}
              >
                <Icon className="size-3" style={{ color: accent }} />
              </span>
              <span className="leading-none">{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cadre explicatif déplié sous la rangée — codifié à la couleur du statut,
          il s'affiche au-dessus de l'UI (et non comme une notif tombante). */}
      {openBadge &&
        (() => {
          const accent = toneAccent(openBadge.tone);
          const Icon = openBadge.icon;
          return (
            <div
              className="anim-tab-in mt-2 flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
                background: `color-mix(in oklab, ${accent} 10%, oklch(0.14 0.02 35 / 0.85))`,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 14%, transparent)`,
              }}
            >
              <span
                className="mt-0.5 inline-flex shrink-0 items-center justify-center size-7 rounded-lg"
                style={{
                  background: `color-mix(in oklab, ${accent} 20%, oklch(0.12 0.02 35 / 0.8))`,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 40%, transparent)`,
                }}
              >
                <Icon className="size-4" style={{ color: accent }} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: accent }}
                >
                  {openBadge.label}
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-foreground/85">
                  {openBadge.desc || "Statut actif."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                aria-label="Fermer"
                className="shrink-0 -mr-1 -mt-0.5 size-6 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })()}
    </div>
  );
}
