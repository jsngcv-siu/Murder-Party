// PA2 — Onglet "Capacité" du joueur, désormais structuré en sous-onglets :
//   Rôle (Drama) · Historique (ScrollText) · Victoire (Trophy) · Chat (MessageCircle)
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import type { FrameContext } from "../registry";
import { supabase } from "@/integrations/supabase/client";
import {
  executeCapability,
  whyCannotUse,
  usesOf,
  parseTotalLimit,
  type CapabilityResult,
  type RoleRow,
} from "@/engine/actions";
import { describeWinCondition } from "@/engine/winCondText";
import { ChatPanel } from "@/components/ChatPanel";
import { colorize } from "@/lib/factionText";
import { highlightCapacity } from "@/lib/highlightCapacity";
import { RoleIcon } from "@/components/RoleIcon";
import { AvatarImg } from "@/components/AvatarImg";
import { ITEM_CATALOG, RELIQUE_CATALOG, type ItemOrigin } from "@/engine/items";
import { factionToken } from "@/lib/factionText";
import { avatarOf, type AvatarDef } from "@/lib/avatars";
import {
  Axe,
  Ban,
  Bird,
  Check,
  ChefHat,
  CircleCheck,
  CircleHelp,
  Crown,
  Dices,
  Drama,
  Droplet,
  Eraser,
  Eye,
  FlaskConical,
  Heart,
  History,
  Hourglass,
  Info,
  KeyRound,
  Lock,
  LockOpen,
  MessageCircle,
  Moon,
  Network,
  NotebookPen,
  Orbit,
  Radar,
  Scale,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Stethoscope,
  Swords,
  Target,
  TriangleAlert,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Sigil } from "@/components/Sigil";
import { frequencyChips } from "@/lib/roleUsageChips";

// Couleur DA (token de faction / accent) par ton de panneau de rôle. Source UNIQUE
// consommée par PanelCard pour la bordure, le fond, le label ET le glyphe Sigil —
// au lieu de couleurs Tailwind brutes (violet-500…) qui dérivaient des hues de faction.
//  • neutres (violet) : fuchsia / violet / purple
//  • citoyens (bleu)  : indigo / sky
//  • mechants (rouge) : red / rose / pink
//  • accent (or)      : amber / yellow
//  • vert fonctionnel : emerald (protection / poison — pas de token DA dédié)
const PANEL_TOKEN: Record<PanelTone, string> = {
  fuchsia: "var(--neutres)",
  violet: "var(--neutres)",
  purple: "var(--neutres)",
  indigo: "var(--citoyens)",
  sky: "var(--citoyens)",
  amber: "var(--accent)",
  yellow: "var(--accent)",
  rose: "var(--mechants)",
  pink: "var(--mechants)",
  red: "var(--mechants)",
  emerald: "oklch(0.74 0.16 155)",
  neutral: "var(--muted-foreground)",
};

function playerAvatar(p: { id?: string; role_meta?: unknown }): AvatarDef {
  const meta = (p.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}) as Record<
    string,
    unknown
  >;
  return avatarOf(meta.avatar as string | undefined, p.id);
}

function SaintBlockedLog({ gameId, meId }: { gameId: string; meId: string }) {
  const [logs, setLogs] = useState<
    Array<{ id: string; title: string; body: string | null; created_at: string }>
  >([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, created_at")
        .eq("game_id", gameId)
        .eq("player_id", meId)
        .eq("type", "saint_block_log")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled)
        setLogs(
          (data ?? []) as Array<{
            id: string;
            title: string;
            body: string | null;
            created_at: string;
          }>,
        );
    }
    void load();
    const ch = supabase
      .channel(`saint-log-${gameId}-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `game_id=eq.${gameId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId]);
  if (logs.length === 0) {
    return (
      <div className="mt-2 text-[11px] text-yellow-200/60 italic">
        Aucune attaque tentée contre ton bénit pour l'instant.
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-yellow-300/70">
        Actions annulées
      </div>
      {logs.map((l) => (
        <div
          key={l.id}
          className="rounded bg-yellow-500/10 border border-yellow-400/30 px-2 py-1 text-[11px] text-yellow-100"
        >
          {l.body ?? l.title}
        </div>
      ))}
    </div>
  );
}

type SubTab = "role" | "history" | "win" | "chat";

// ── Helpers partagés Historique / Bannière Dernier résultat
const phaseLabel = (p: string) =>
  p === "free" ? "Enquête" : p === "gathering" ? "Débat" : p === "vote" ? "Vote" : p;

function actionTargetsLabel(
  a: { target_player_id: string | null; target_player_id_2?: string | null },
  players: { id: string; pseudo: string }[],
): string {
  const name = (id: string | null | undefined) =>
    id ? (players.find((p) => p.id === id)?.pseudo ?? "?") : null;
  const t1 = name(a.target_player_id);
  const t2 = name(a.target_player_id_2);
  if (t1 && t2) return `→ ${t1} & ${t2}`;
  if (t1) return `→ ${t1}`;
  return "";
}

export function actionSummary(
  payload: Record<string, unknown>,
  fallbackResult?: Record<string, unknown>,
): string {
  // Priorité : le message humain stocké après exécution.
  const msg =
    (fallbackResult?.message as string | undefined) ?? (payload.message as string | undefined);
  if (msg) return msg;
  const summary =
    (fallbackResult?.summary as string | undefined) ?? (payload.summary as string | undefined);
  if (summary) return summary;
  // Conservateur : affiche la relique distribuée même sans résultat enregistré.
  if (payload.effect === "relique_distribute") {
    const variant = payload.variant as string | undefined;
    if (variant) {
      const def = RELIQUE_CATALOG[variant as keyof typeof RELIQUE_CATALOG];
      if (def) return `${def.icon} ${def.name} confiée.`;
    }
  }
  // Pas de message disponible : on évite d'exposer le slug technique.
  return "Capacité utilisée.";
}

// ───────── Présentation illustrative du résultat
type ResultTone = "success" | "fail" | "info" | "pending";
type ParsedResult = { tone: ResultTone; icon: string; headline: string; details: string };

const SUCCESS_RX =
  /\b(réussi|succès|soigné|protégé|sauvé|tué|empoisonné|empris|condamn|révélé|découvert|confirmé|trouvé|identifié|volé|hérit|libéré|mordu|chargé|verrouill|enregistr|posté|placé|distribu|confiée?)\b/i;
const FAIL_RX =
  /\b(échec|raté|rien|aucun|bloqué|impossible|introuvable|épuisée?|hors phase|refusé|annulé|falsifi)\b/i;
const LEADING_EMOJI = /^([\p{Extended_Pictographic}](?:\uFE0F)?)\s*/u;

function parseResultMessage(raw: string): ParsedResult {
  const text = (raw ?? "").trim();
  let icon = "";
  let body = text;
  const m = text.match(LEADING_EMOJI);
  if (m) {
    icon = m[1];
    body = text.slice(m[0].length).trim();
  }
  let headline = body;
  let details = "";
  const splitIdx = body.search(/(?:\.\s+|[!?]\s+|\n)/);
  if (splitIdx >= 0 && splitIdx < body.length - 1) {
    headline = body.slice(0, splitIdx + 1).trim();
    details = body.slice(splitIdx + 1).trim();
  }
  let tone: ResultTone = "info";
  if (FAIL_RX.test(body) && !SUCCESS_RX.test(body)) tone = "fail";
  else if (SUCCESS_RX.test(body)) tone = "success";
  // icon reste "" si le message ne porte pas d'emoji de tête → ResultBlock rend
  // alors une icône Lucide tonale (plus d'emoji de secours injecté ici).
  return { tone, icon, headline: headline || "Action enregistrée.", details };
}

export function ResultBlock({
  raw,
  roles,
  size = "md",
  outcome,
  verdict = false,
}: {
  raw: string;
  roles: Map<string, RoleRow>;
  size?: "sm" | "md";
  outcome?: ResultTone;
  verdict?: boolean;
}) {
  const r = parseResultMessage(raw);
  // Ton fiable (depuis result.outcome) prioritaire sur la déduction par regex.
  const tone: ResultTone = outcome ?? r.tone;
  const toneAccent =
    tone === "success"
      ? "oklch(0.78 0.18 145)"
      : tone === "fail"
        ? "oklch(0.70 0.20 25)"
        : tone === "pending"
          ? "oklch(0.80 0.15 70)"
          : "oklch(0.75 0.10 250)";
  const toneBadgeBg =
    tone === "success"
      ? "oklch(0.78 0.18 145 / 0.14)"
      : tone === "fail"
        ? "oklch(0.70 0.20 25 / 0.14)"
        : tone === "pending"
          ? "oklch(0.80 0.15 70 / 0.14)"
          : "oklch(0.75 0.10 250 / 0.14)";
  const toneLabel =
    tone === "success"
      ? "Réussi"
      : tone === "fail"
        ? "Échec"
        : tone === "pending"
          ? "En cours"
          : "Info";
  // Icône Lucide tonale (chrome). On garde l'emoji de tête du message moteur
  // seulement quand on n'a pas de ton fiable (outcome) — sinon icône cohérente.
  const ToneIcon: LucideIcon =
    tone === "success"
      ? CircleCheck
      : tone === "fail"
        ? TriangleAlert
        : tone === "pending"
          ? Hourglass
          : Info;
  const msgEmoji = outcome ? "" : r.icon;
  // Volontairement CONCIS : on n'affiche que l'info clé (headline), pas de sous-ligne.
  const headlineCls = size === "sm" ? "text-[13px] leading-snug" : "text-[15px] leading-snug";
  // Mode « verdict » (ex : Boussole) : le résultat EST une info binaire colorée
  // (vert = même camp, rouge = camps opposés). On colore le texte et on masque le
  // badge « Réussi/Échec » qui serait trompeur pour une simple lecture.
  return (
    <div className="flex items-start gap-2">
      {msgEmoji ? (
        <span className="shrink-0 text-xl leading-none mt-0.5" aria-hidden>
          {msgEmoji}
        </span>
      ) : (
        <ToneIcon className="shrink-0 size-5 mt-0.5" style={{ color: toneAccent }} aria-hidden />
      )}
      <div
        className={`min-w-0 flex-1 ${headlineCls} font-semibold ${verdict ? "" : "text-foreground"}`}
        style={verdict ? { color: toneAccent } : undefined}
      >
        {colorize(r.headline, roles)}
      </div>
      {!verdict && (
        <span
          className="shrink-0 text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded-full"
          style={{ color: toneAccent, background: toneBadgeBg }}
        >
          {toneLabel}
        </span>
      )}
    </div>
  );
}

// ───────── État de l'action (carte claire sous le rôle)
// Traduit le motif de whyCannotUse() en statut lisible + un indice de TIMING dans
// la boucle (Enquête → Annonce). Copie non-genrée.
function capabilityState(
  blockedReason: string | null,
  mode: string,
): { label: string; Icon: LucideIcon; cls: string; hint: string } | null {
  if (mode === "none")
    return {
      label: "Capacité passive",
      Icon: Moon,
      cls: "text-muted-foreground bg-muted/40 border-border",
      hint: "Automatique — rien à faire de ta part.",
    };
  if (!blockedReason)
    return {
      label: "À utiliser ce tour",
      Icon: Zap,
      cls: "text-gold bg-gold/12 border-gold/40",
      hint: "C'est le moment d'agir · le dénouement est révélé à l'Annonce.",
    };
  if (/^Déjà utilisé/i.test(blockedReason))
    return {
      label: "Action faite",
      Icon: Check,
      cls: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40",
      hint: "C'est joué · rendez-vous à l'Annonce.",
    };
  if (/épuisée/i.test(blockedReason))
    return {
      label: "Capacité épuisée",
      Icon: Ban,
      cls: "text-muted-foreground bg-muted/40 border-border",
      hint: "Plus aucune utilisation disponible.",
    };
  if (/cooldown/i.test(blockedReason))
    return {
      label: "En récupération",
      Icon: Hourglass,
      cls: "text-amber-300 bg-amber-500/12 border-amber-500/40",
      hint: "Bientôt de nouveau disponible.",
    };
  // Autres motifs (mauvaise phase, Stratège…) : on affiche le motif tel quel.
  return {
    label: blockedReason,
    Icon: Hourglass,
    cls: "text-amber-300 bg-amber-500/12 border-amber-500/40",
    hint: "Indisponible pour l'instant.",
  };
}

// Déduit un ton FIABLE à partir des données (CapabilityResult.ok + type de rôle),
// au lieu de le deviner par regex sur le texte. Persisté dans result.outcome.
function deriveOutcome(
  r: { ok: boolean; pending?: boolean; reveal?: Record<string, unknown> },
  role: RoleRow | null,
): ResultTone {
  if (!r.ok) return "fail";
  if (r.pending) return "pending"; // effet différé : issue inconnue jusqu'au resolver
  // Boussole : vert si même camp, rouge si camps opposés (demande explicite UX).
  if (role?.slug === "boussole" && typeof r.reveal?.same === "boolean")
    return r.reveal.same ? "success" : "fail";
  // Chasseur de Vampire : rouge si la cible EST un vampire (menace + exécution),
  // vert si elle ne l'est pas (cible blanchie). Cohérent avec les emojis 🔴/🟢.
  if (role?.slug === "chasseur_de_vampire" && typeof r.reveal?.isVampire === "boolean")
    return r.reveal.isVampire ? "fail" : "success";
  // Enquêtes (y compris l'Héritier déchu, dont le résultat est une simple
  // info « suspicieux ou non » comme le Policier) : ton neutre.
  if (role?.type === "INVESTIGATION" || role?.slug === "heritier_dechu") return "info";
  return "success";
}

// ───────── Chrome unifié des panneaux de rôle ─────────
// Un seul style partagé : rounded-xl, bordure/fond cohérents, en-tête
// « icône + label » standardisé. Chaque panneau garde sa couleur thématique
// via `tone`, mais la structure devient identique partout.
type PanelTone =
  | "fuchsia"
  | "violet"
  | "purple"
  | "indigo"
  | "sky"
  | "amber"
  | "yellow"
  | "rose"
  | "pink"
  | "emerald"
  | "red"
  | "neutral";

function PanelCard({
  tone = "neutral",
  icon: Icon,
  label,
  action,
  children,
  className = "",
}: {
  tone?: PanelTone;
  icon?: LucideIcon;
  label?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const accent = PANEL_TOKEN[tone];
  return (
    <div
      className={`mt-3 rounded-xl border p-3.5 text-xs ${className}`}
      style={{
        borderColor: `color-mix(in oklab, ${accent} 35%, transparent)`,
        background: `color-mix(in oklab, ${accent} 6%, transparent)`,
      }}
    >
      {(label || Icon || action) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold"
            style={{ color: accent }}
          >
            {Icon && (
              <Sigil active size={18} accent={accent}>
                <Icon className="size-3.5" aria-hidden />
              </Sigil>
            )}
            {label}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PA2Capability(ctx: FrameContext) {
  const { me, myRole, game, players, roles, gameId } = ctx;
  const isMechant = myRole?.faction === "Méchant";
  const isMedium = myRole?.slug === "medium";
  const chatAvailable = (isMechant && me.is_alive) || (isMedium && me.is_alive) || !me.is_alive;

  const [tab, setTab] = useState<SubTab>("role");

  return (
    <div className="h-full flex flex-col bg-background">
      <nav className="grid grid-cols-4 gap-1.5 p-2 border-b border-border bg-gradient-to-b from-card/60 to-card/20">
        <TabBtn
          active={tab === "role"}
          onClick={() => setTab("role")}
          icon={<Drama className="size-5" />}
          label="Rôle"
          accent="oklch(0.74 0.15 300)"
        />
        <TabBtn
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<ScrollText className="size-5" />}
          label="Historique"
          accent="var(--citoyens)"
        />
        <TabBtn
          active={tab === "win"}
          onClick={() => setTab("win")}
          icon={<Trophy className="size-5" />}
          label="Victoire"
          accent="var(--primary)"
        />
        <TabBtn
          active={tab === "chat"}
          onClick={() => chatAvailable && setTab("chat")}
          icon={<MessageCircle className="size-5" />}
          label="Chat"
          accent="var(--vampires)"
          disabled={!chatAvailable}
        />
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "role" && <RoleTab ctx={ctx} />}
        {tab === "history" && (
          <HistoryTab gameId={gameId} meId={me.id} players={players} roles={roles} />
        )}
        {tab === "win" && <WinTab me={me} myRole={myRole} players={players} />}
        {tab === "chat" && chatAvailable && (
          <ChatTab
            gameId={gameId}
            meId={me.id}
            mePseudo={me.pseudo}
            isMedium={!!isMedium}
            isDead={!me.is_alive}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  disabled,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
        disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "bg-card/70 ring-1 ring-border"
            : "text-muted-foreground hover:text-foreground hover:bg-card/40"
      }`}
    >
      <Sigil active={active} size={30} accent={accent}>
        {icon}
      </Sigil>
      <span
        className="text-[10px] uppercase tracking-wider font-semibold leading-none"
        style={active && accent ? { color: accent } : undefined}
      >
        {label}
      </span>
    </button>
  );
}

// ───────── Sous-onglet : Rôle (ex-vue principale)
function RoleTab({ ctx }: { ctx: FrameContext }) {
  const { me, myRole, game, players, roles, gameId, puppeteerOverride } = ctx;
  const meMeta = (me.role_meta ?? {}) as Record<string, unknown>;
  const playerCount = players.filter((p) => !p.is_mj).length;
  const blockedReason = myRole
    ? whyCannotUse(
        myRole,
        meMeta,
        game.current_tour,
        playerCount,
        game.current_phase as "free" | "gathering" | "vote",
      )
    : null;
  // Blocage STATUT uniquement (chantage / blocage / ivresse) — distinct des
  // restrictions normales (mauvaise phase, cooldown, capacité épuisée…).
  const tour = game.current_tour;
  const rawStatusBlockReason: string | null =
    ((meMeta.blackmail_until_cycle as number | undefined) ?? -1) >= tour &&
    ((meMeta.blackmail_from_cycle as number | undefined) ?? -Infinity) <= tour
      ? "Sous chantage"
      : ((meMeta.blocked_until_cycle as number | undefined) ?? -1) >= tour &&
          ((meMeta.blocked_from_cycle as number | undefined) ?? -Infinity) <= tour
        ? "Capacité bloquée"
        : ((meMeta.drunk_until_cycle as number | undefined) ?? -1) >= tour &&
            ((meMeta.drunk_from_cycle as number | undefined) ?? -Infinity) <= tour
          ? "Ivre — servi par le barman"
          : null;
  // Si le Marionnettiste pilote cette capacité, on ignore le blocage qu'il a lui-même posé.
  const statusBlockReason =
    puppeteerOverride && rawStatusBlockReason === "Capacité bloquée" ? null : rawStatusBlockReason;
  const [targets, setTargets] = useState<string[]>([]);
  const [result, setResult] = useState<CapabilityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  const [fiole, setFiole] = useState<"heal" | "poison" | "reveal">("heal");

  const mode = (myRole?.target_mode ?? "single") as
    | "none"
    | "single"
    | "double"
    | "multi"
    | "self_or_other";
  const needed = mode === "double" ? 2 : mode === "multi" ? 3 : mode === "none" ? 0 : 1;
  const minTargets = mode === "double" ? 2 : needed;
  const aliveOthers = players.filter(
    (p) => p.is_alive && !p.is_imprisoned && !p.is_mj && p.id !== me.id,
  );
  let targetable = mode === "self_or_other" ? [me, ...aliveOthers] : aliveOthers;
  // Oracle : ne cible plus un joueur, mais une faction (UI dédiée plus bas).
  const isOraclePending = myRole?.slug === "oracle" && !meMeta.prophecy;
  const [oracleFaction, setOracleFaction] = useState<"Civil" | "Méchant" | "Neutre" | null>(null);
  // Imitateur : restreint la cible au dernier joueur mort (s'il existe)
  let imitateurLastDead: (typeof players)[number] | null = null;
  if (myRole?.slug === "imitateur" && !meMeta.imitated_slug) {
    const deads = players.filter((p) => !p.is_alive && !p.is_mj);
    deads.sort((a, b) => {
      const da =
        (((a.role_meta ?? {}) as Record<string, unknown>).death_cycle as number | undefined) ?? 0;
      const db =
        (((b.role_meta ?? {}) as Record<string, unknown>).death_cycle as number | undefined) ?? 0;
      return db - da;
    });
    imitateurLastDead = deads[0] ?? null;
    targetable = imitateurLastDead ? [imitateurLastDead] : [];
  }

  // Bandeau de résultat : auto-effacement après 3s pour ne pas encombrer l'UI.
  useEffect(() => {
    if (!result) return;
    const id = setTimeout(() => setResult(null), 3000);
    return () => clearTimeout(id);
  }, [result]);

  // Entrée animée (GSAP) de l'en-tête à l'ouverture de l'onglet. Coupée si
  // l'utilisateur préfère réduire les animations (matchMedia).
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(
      { ok: "(prefers-reduced-motion: no-preference)" },
      () => {
        gsap.from(".role-zone", {
          autoAlpha: 0,
          y: 8,
          scale: 0.98,
          duration: 0.45,
          ease: "back.out(1.4)",
        });
      },
      el,
    );
    return () => mm.revert();
  }, [myRole?.slug]);

  const isApothicaire = myRole?.slug === "apothicaire";
  const isMechantTeam = myRole?.faction === "Méchant";
  const flasksUsed = (meMeta.flasks_used as string[] | undefined) ?? [];
  const fiolesAvail: Array<{ id: "heal" | "poison" | "reveal"; label: string; Icon: LucideIcon }> =
    [
      { id: "heal", label: "Soin", Icon: FlaskConical },
      { id: "poison", label: "Poison", Icon: Skull },
      { id: "reveal", label: "Vérité", Icon: Search },
    ].filter((f) => !flasksUsed.includes(f.id)) as Array<{
      id: "heal" | "poison" | "reveal";
      label: string;
      Icon: LucideIcon;
    }>;

  const allies = isMechantTeam
    ? players.filter(
        (p) =>
          !p.is_mj &&
          p.id !== me.id &&
          (() => {
            const r = roles.get(p.role_slug ?? "");
            return r?.faction === "Méchant";
          })(),
      )
    : [];

  function toggleTarget(id: string) {
    setTargets((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (mode === "single" || mode === "self_or_other") return [id];
      if (mode === "double") return cur.length >= 2 ? [cur[1], id] : [...cur, id];
      return [...cur, id];
    });
  }

  async function runCapacity(overrides?: {
    extra?: Record<string, unknown>;
    skipTargetCheck?: boolean;
    targetIds?: string[];
  }) {
    if (busy) return;
    const effectiveTargets = overrides?.targetIds ?? targets;
    if (!overrides?.skipTargetCheck && mode !== "none" && effectiveTargets.length < minTargets)
      return;
    setBusy(true);
    const targetRows = effectiveTargets
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const baseExtra: Record<string, unknown> | undefined =
      overrides?.extra ?? (isApothicaire ? { fiole } : undefined);
    const extra: Record<string, unknown> | undefined = puppeteerOverride
      ? { ...(baseExtra ?? {}), __puppet_call: true, __puppeteer_id: puppeteerOverride.puppeteerId }
      : baseExtra;
    const r = await executeCapability({
      gameId,
      actor: me,
      role: myRole,
      targets: targetRows,
      tour: game.current_tour,
      phase: game.current_phase as "free" | "gathering" | "vote",
      allPlayers: players,
      rolesBySlug: roles,
      extra,
    });

    setResult(r);
    if (r.ok && r.message) {
      const { data: last } = await supabase
        .from("role_actions")
        .select("id")
        .eq("game_id", gameId)
        .eq("actor_player_id", me.id)
        .eq("tour", game.current_tour)
        .eq("phase", game.current_phase as "free" | "gathering" | "vote")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastId = (last as { id: string } | null)?.id;
      if (lastId) {
        await supabase
          .from("role_actions")
          .update({
            result: {
              summary: r.message,
              outcome: deriveOutcome(r, myRole),
              ...(r.reveal ? { reveal: r.reveal } : {}),
            } as never,
          })
          .eq("id", lastId);
      }
    }
    setTargets([]);
    setBusy(false);
  }

  // ─── Blocage total : capacité ET objets verrouillés ce tour.
  // Pour TOUS les rôles (passifs compris), on coupe l'écran de capacité.
  if (statusBlockReason) {
    return (
      <div className="p-5 flex flex-col">
        <div className="flex items-center gap-3">
          <RoleIcon role={myRole} size={56} />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Ton rôle
            </div>
            <h2 className="text-base font-bold">{myRole?.name_fr ?? "—"}</h2>
          </div>
        </div>
        {/* Statuts affichés uniquement dans la barre du haut (StatusBandeau) */}
        <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-center space-y-2">
          <Ban className="size-9 mx-auto text-rose-300" aria-hidden />
          <div className="text-lg font-semibold text-rose-200">Capacité bloquée</div>
          <div className="text-sm text-rose-100/80">{statusBlockReason}</div>
          <div className="text-xs text-muted-foreground mt-2">
            Ta capacité de rôle <b>et</b> tes objets sont inutilisables jusqu'à la fin de ce tour.
          </div>
        </div>
      </div>
    );
  }

  // ── Détermine si le bouton "Utiliser" générique doit s'afficher (sticky en bas)
  const showGenericUseBtn =
    mode !== "none" &&
    !isOraclePending &&
    myRole?.slug !== "cuisinier" &&
    myRole?.slug !== "vengeur" &&
    myRole?.slug !== "juge" &&
    myRole?.slug !== "executeur" &&
    myRole?.slug !== "paranoiaque" &&
    !(myRole?.slug === "saint" && meMeta.saint_used === true);
  const showAngeGardienBtn = myRole?.slug === "ange_gardien";
  // Le motif de blocage est désormais porté par le chip « Ton action » en haut —
  // plus besoin de le répéter dans le pied de page. Celui-ci ne s'affiche que s'il
  // y a un vrai bouton d'action ou une erreur ponctuelle à montrer.
  const hasStickyFooter = showGenericUseBtn || showAngeGardienBtn || (!!result && !result.ok);

  return (
    <div ref={rootRef} className={`p-5 flex flex-col ${hasStickyFooter ? "pb-40" : ""}`}>
      {/* Hero du rôle — icône cerclée de la couleur de faction, nom Cinzel, badges */}
      {(() => {
        const f = myRole?.slug === "vampire" ? "Méchant" : myRole?.faction;
        const factionColor =
          f === "Civil"
            ? "var(--citoyens)"
            : f === "Méchant"
              ? "var(--destructive)"
              : "var(--neutres)";
        const orig = (meMeta as Record<string, unknown>).original_slug as string | undefined;
        const origRole = orig ? roles.get(orig) : null;
        const freqs = frequencyChips(myRole);
        return (
          <div className="role-zone">
            <div className="flex items-center gap-3.5">
              <div
                className="relative shrink-0 rounded-full"
                style={{
                  boxShadow: `0 0 0 1.5px color-mix(in oklab, ${factionColor} 55%, transparent), 0 0 18px -5px ${factionColor}`,
                }}
              >
                <RoleIcon role={myRole} size={52} />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-xl font-bold leading-tight text-glow-gold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {myRole?.name_fr ?? "—"}
                </h2>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {myRole && (
                    <span
                      className="text-[9px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-md border"
                      style={{
                        color: factionColor,
                        borderColor: `color-mix(in oklab, ${factionColor} 35%, transparent)`,
                        background: `color-mix(in oklab, ${factionColor} 12%, transparent)`,
                      }}
                    >
                      {f}
                    </span>
                  )}
                  {freqs.map((f, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-gold/40 bg-gold/10 text-gold"
                    >
                      {f}
                    </span>
                  ))}
                  {origRole && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ex {origRole.name_fr}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {myRole?.capacite_full_text && (
              <p
                onClick={() => setCapOpen((v) => !v)}
                title={capOpen ? "Réduire" : "Voir toute la capacité"}
                className={`mt-3 text-xs text-muted-foreground leading-relaxed cursor-pointer ${capOpen ? "" : "line-clamp-3"}`}
              >
                {highlightCapacity(myRole.capacite_full_text, "dark")}
              </p>
            )}
          </div>
        );
      })()}

      {/* Statut + timing dans la boucle (Enquête → Annonce) */}
      {(() => {
        if (!myRole) return null;
        const st = capabilityState(blockedReason, mode);
        if (!st) return null;
        return (
          <div className={`mt-4 rounded-xl border p-3 flex items-start gap-3 ${st.cls}`}>
            <st.Icon className="size-5 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em]">{st.label}</div>
              {st.hint && (
                <div className="text-[11px] opacity-80 mt-0.5 leading-snug">{st.hint}</div>
              )}
            </div>
          </div>
        );
      })()}

      {isMechantTeam && (
        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Liste de tes alliés
          </div>
          {allies.length > 0 ? (
            allies.map((a) => {
              const r = roles.get(a.role_slug ?? "");
              const aMeta = (a.role_meta ?? {}) as Record<string, unknown>;
              const originalSlug =
                typeof aMeta.original_slug === "string" ? aMeta.original_slug : null;
              const originalRole = originalSlug ? roles.get(originalSlug) : null;
              const roleLabel = r?.name_fr ?? "?";
              const extra = originalRole ? ` (${originalRole.name_fr})` : "";
              return (
                <div key={a.id} className="flex items-center gap-2">
                  <RoleIcon role={r} size={18} />
                  <span className="font-medium">{a.pseudo}</span>
                  <span className="text-muted-foreground">
                    — {roleLabel}
                    {extra}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground italic">Aucun allié visible.</div>
          )}
        </div>
      )}

      {/* Statuts affichés uniquement dans la barre du haut (StatusBandeau) */}
      {(() => {
        const partnerId =
          (meMeta.beloved_id as string | undefined) ??
          (meMeta.etre_cher as string | undefined) ??
          (meMeta.lover_id as string | undefined) ??
          null;
        if (!partnerId) return null;
        const partner = players.find((p) => p.id === partnerId);
        if (!partner) return null;
        const isLover = myRole?.slug === "entremetteur" || !!meMeta.linked_with;
        return (
          <div className="mt-3 rounded-lg border border-pink-400/40 bg-gradient-to-r from-pink-500/10 to-rose-500/10 px-3 py-2 text-xs text-pink-200 flex items-center gap-2">
            <Heart className="size-4 shrink-0 text-pink-300" aria-hidden />
            <span>
              Lien avec <span className="font-semibold text-pink-100">{partner.pseudo}</span>
              {isLover ? ". Si l'un meurt, l'autre suit. Vous gagnez ensemble." : "."}
            </span>
          </div>
        );
      })()}

      {myRole?.slug === "temoin" && (
        <WitnessRevealPanel meId={me.id} gameId={gameId} players={players} roles={roles} />
      )}
      {myRole?.slug === "voisin" && (
        <NeighborWatchPanel
          gameId={gameId}
          watchTargetId={(meMeta.watch_target as string | undefined) ?? null}
          watchSetCycle={(meMeta.watch_set_cycle as number | undefined) ?? null}
          players={players}
          roles={roles}
          tour={game.current_tour}
        />
      )}
      {(myRole?.slug === "cartomancien" || myRole?.slug === "journaliste") && (
        <CartomancienBoardPanel
          targetId={(meMeta.card_target_id as string | undefined) ?? null}
          targetCycle={(meMeta.card_target_cycle as number | undefined) ?? null}
          tour={game.current_tour}
          players={players}
        />
      )}
      {myRole?.slug === "veuve_noire" && (
        <VeuveNoireTrackerPanel
          gameId={gameId}
          meId={me.id}
          pairs={(meMeta.veuve_pairs as Array<{ tour: number; pair: string[] }> | undefined) ?? []}
          players={players}
          tour={game.current_tour}
        />
      )}
      {myRole?.slug === "guetteur" && (
        <GuetteurVisitsPanel
          gameId={gameId}
          meId={me.id}
          players={players}
          roles={roles}
          tour={game.current_tour}
        />
      )}
      {myRole?.slug === "paranoiaque" && (
        <ParanoiaquePanel
          targetId={(meMeta.paranoid_target_id as string | undefined) ?? null}
          targetPseudoFallback={(meMeta.paranoid_target_pseudo as string | undefined) ?? null}
          players={players}
          used={usesOf(meMeta, "paranoiaque") > 0}
          busy={busy}
          blocked={!!blockedReason}
          onAct={(choice) => void runCapacity({ extra: { choice }, skipTargetCheck: true })}
        />
      )}
      {myRole?.slug === "medecin_legiste" && <LegisteAutopsiesPanel gameId={gameId} meId={me.id} />}
      {myRole?.slug === "avocat" && <AvocatPrisonPanel players={players} roles={roles} />}
      {isOraclePending && (
        <PanelCard tone="fuchsia" icon={Sparkles} label="Prophétie — choisis le camp gagnant">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "Civil", label: "Civils", Icon: Shield },
                { id: "Méchant", label: "Méchants", Icon: Swords },
                { id: "Neutre", label: "Neutres", Icon: Orbit },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setOracleFaction(f.id)}
                className={`h-12 rounded-lg text-sm transition inline-flex flex-col items-center justify-center gap-1 ${oracleFaction === f.id ? "bg-fuchsia-500/30 text-fuchsia-50 ring-1 ring-fuchsia-400" : "bg-card/60 hover:bg-card"}`}
              >
                <f.Icon className="size-4" aria-hidden /> {f.label}
              </button>
            ))}
          </div>
          <button
            disabled={busy || !oracleFaction}
            onClick={() =>
              runCapacity({ extra: { faction: oracleFaction }, skipTargetCheck: true })
            }
            className="mt-3 h-11 w-full rounded-lg bg-fuchsia-500/30 ring-1 ring-fuchsia-400 text-fuchsia-50 font-semibold disabled:opacity-40"
          >
            {busy ? "…" : "Verrouiller la prophétie"}
          </button>
        </PanelCard>
      )}
      {myRole?.slug === "oracle" && typeof meMeta.prophecy === "string" && (
        <PanelCard tone="fuchsia" icon={Sparkles} label="Prophétie verrouillée">
          Victoire prédite : <span className="font-semibold">les {meMeta.prophecy as string}</span>.
        </PanelCard>
      )}
      {myRole?.slug === "usurpateur" && !meMeta.cover_slug && (
        <UsurpateurCoverChoice meId={me.id} meMeta={meMeta} roles={roles} />
      )}
      {myRole?.slug === "usurpateur" &&
        typeof meMeta.cover_slug === "string" &&
        (() => {
          const r = roles.get(meMeta.cover_slug as string);
          return r ? (
            <PanelCard tone="red" icon={Drama} label="Couverture verrouillée">
              <span className="font-semibold inline-flex items-center gap-1">
                <RoleIcon role={r} size={16} /> {r.name_fr}
              </span>
              . Toutes les enquêtes te désigneront ainsi.
            </PanelCard>
          ) : null;
        })()}
      {myRole?.slug === "imitateur" && !meMeta.imitated_slug && (
        <PanelCard tone="amber" icon={Drama} label="Imitation">
          Tu peux copier le rôle du <span className="font-semibold">dernier joueur mort</span>
          {imitateurLastDead
            ? ` : ${imitateurLastDead.pseudo}.`
            : " — mais personne n'est encore mort."}
        </PanelCard>
      )}
      {myRole?.slug === "imitateur" &&
        typeof meMeta.imitated_slug === "string" &&
        (() => {
          const r = roles.get(meMeta.imitated_slug as string);
          return r ? (
            <PanelCard tone="amber" icon={Drama} label="Imitation active" className="space-y-1">
              <div>
                Tu imites désormais :{" "}
                <span className="font-semibold inline-flex items-center gap-1">
                  <RoleIcon role={r} size={16} /> {r.name_fr}
                </span>
                .
              </div>
              {r.capacite_full_text && (
                <div className="text-amber-100/80 italic whitespace-pre-wrap text-[11px] mt-1 pt-1 border-t border-amber-400/20">
                  {r.capacite_full_text}
                </div>
              )}
            </PanelCard>
          ) : null;
        })()}
      {myRole?.slug === "heritier_dechu" && (
        <PanelCard tone="yellow" icon={Crown} label="Héritier déchu">
          À chaque Enquête, désigne une cible : tu apprends si elle{" "}
          <span className="font-semibold">éveille les soupçons</span> ou non. Tu gagnes en vie avec
          les Méchants à la fin de la partie.
        </PanelCard>
      )}

      {myRole?.slug === "parieur_tricheur" && (
        <PanelCard tone="amber" icon={Dices} label="Le pari truqué">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 shrink-0">
              <MiniDie value={6} />
              <MiniDie value={5} />
            </span>
            <div className="text-amber-100/90 leading-snug">
              Tu lances <span className="font-bold">2 dés à 6 faces</span> et gardes le{" "}
              <span className="font-bold">meilleur</span> ; ta cible n'en lance qu'
              <span className="font-bold">un</span>. Le plus petit nombre meurt à la prochaine
              annonce — <span className="font-semibold">égalité&nbsp;: on relance</span>.
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-200/70 italic">
            Le duel s'animera sur ton écran et celui de ta cible.
          </div>
        </PanelCard>
      )}

      {(myRole?.slug === "vampire" || meMeta.converted === true) &&
        (() => {
          const clan = players.filter(
            (p) =>
              p.is_alive &&
              p.id !== me.id &&
              (p.role_slug === "vampire" ||
                (p.role_meta as Record<string, unknown> | null)?.converted === true),
          );
          return (
            <PanelCard tone="red" icon={Droplet} label="Ton clan vampire">
              {meMeta.converted === true && (
                <div className="text-[11px] text-red-300/80 italic mb-1">
                  Morsure subie — tu rejoins les Vampires.
                </div>
              )}
              {clan.length === 0 ? (
                <div className="text-red-300/70 italic">
                  Personne d'autre pour l'instant. Mords pour agrandir le clan.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {clan.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded bg-red-500/15 border border-red-400/30"
                    >
                      {c.pseudo}
                    </span>
                  ))}
                </div>
              )}
            </PanelCard>
          );
        })()}

      {myRole?.slug === "empoisonneur" &&
        (() => {
          const others = players.filter((p) => p.id !== me.id && !p.is_mj);
          const poisoned = others.filter(
            (p) => p.is_alive && (p.role_meta as Record<string, unknown> | null)?.poisoned === true,
          );
          const remaining = others.filter(
            (p) =>
              p.is_alive &&
              !p.is_imprisoned &&
              (p.role_meta as Record<string, unknown> | null)?.poisoned !== true,
          );
          return (
            <PanelCard
              tone="emerald"
              icon={FlaskConical}
              label="Suivi d'empoisonnement"
              action={
                <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                  Live
                </span>
              }
            >
              <div className="text-[11px] text-emerald-300/80 italic mb-2">
                Victoire : tous les survivants hors prison sont empoisonnés.
              </div>

              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">
                  Empoisonnés ({poisoned.length})
                </div>
                {poisoned.length === 0 ? (
                  <div className="text-emerald-300/60 italic">Aucun pour l'instant.</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {poisoned.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40"
                      >
                        {p.pseudo}
                        {p.is_imprisoned && <Lock className="size-2.5" aria-hidden />}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">
                  À empoisonner ({remaining.length})
                </div>
                {remaining.length === 0 ? (
                  <div className="text-emerald-200 font-semibold inline-flex items-center gap-1.5">
                    <Trophy className="size-4" aria-hidden /> Tous les survivants libres sont
                    empoisonnés !
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {remaining.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-200"
                      >
                        {p.pseudo}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </PanelCard>
          );
        })()}

      {myRole?.slug === "marionnettiste" && <MarionnettistePanel ctx={ctx} />}

      {myRole?.slug === "saint" &&
        meMeta.saint_used === true &&
        (() => {
          const tgtId = meMeta.saint_target_id as string | undefined;
          const tgtPseudo =
            (meMeta.saint_target_pseudo as string | undefined) ??
            players.find((p) => p.id === tgtId)?.pseudo ??
            "?";
          return (
            <PanelCard tone="yellow" icon={Sparkles} label="Sainte bénédiction">
              <div className="mb-1 text-sm">
                Tu protèges : <span className="text-yellow-50 font-bold">{tgtPseudo}</span>
              </div>
              <div className="text-[11px] text-yellow-200/80 italic">
                La bénédiction annule toute action malveillante (méchants & neutres MAL/CHAOS)
                pendant 2 tours complets.
              </div>
              <SaintBlockedLog gameId={gameId} meId={me.id} />
            </PanelCard>
          );
        })()}

      {(() => {
        // Overlay Manipulé : si moi je suis marionnette ce tour, voile violet bloquant.
        // Désactivé quand le Marionnettiste pilote ma capacité (puppeteerOverride).
        if (puppeteerOverride) return null;
        const forcedCycle = meMeta.forced_action_cycle as number | undefined;
        if (typeof forcedCycle !== "number" || forcedCycle < game.current_tour) return null;
        const forcedTargetId = meMeta.forced_target_id as string | undefined;
        const forcedTarget = forcedTargetId ? players.find((p) => p.id === forcedTargetId) : null;
        return (
          <div className="mt-3 rounded-xl border-2 border-purple-400/60 bg-gradient-to-br from-purple-600/25 to-fuchsia-600/15 px-4 py-3 text-sm text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.25)]">
            <div className="flex items-center gap-2 font-bold text-base mb-1">
              <Drama className="size-6 animate-pulse text-purple-300" aria-hidden />
              <span>Manipulation en cours</span>
            </div>
            <div className="text-purple-200/90 text-xs">
              {forcedTarget ? (
                <>
                  À la prochaine Annonce, tu frapperas{" "}
                  <span className="font-semibold text-purple-50">{forcedTarget.pseudo}</span> sans
                  le vouloir.
                </>
              ) : (
                "Ton corps n'est plus à toi — quelqu'un guide ta main."
              )}
            </div>
          </div>
        );
      })()}

      {myRole?.slug === "ange_gardien" &&
        (() => {
          const wardId =
            (meMeta.ward as string | undefined) ?? (meMeta.protege_id as string | undefined);
          const ward = wardId ? players.find((p) => p.id === wardId) : null;
          const wardPseudo = ward?.pseudo ?? (meMeta.ward_pseudo as string | undefined) ?? null;
          return (
            <PanelCard tone="emerald" icon={ShieldCheck} label="Cible à protéger">
              {wardPseudo ? (
                <div className="flex items-center gap-3">
                  {ward && (
                    <AvatarImg
                      avatar={playerAvatar(ward)}
                      size={40}
                      className="ring-1 ring-emerald-500/30"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold text-emerald-50 truncate">{wardPseudo}</div>
                    <div className="text-[11px] text-emerald-200/80">
                      Active ton bouclier (1×/partie) pour la protéger d'une mort.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-emerald-200/80 italic">
                  Ta cible te sera attribuée à la première Enquête.
                </div>
              )}
            </PanelCard>
          );
        })()}

      {myRole?.slug === "falsificateur" && (
        <FalsificateurPanel meId={me.id} players={players} roles={roles} />
      )}

      {!NO_LAST_RESULT_ROLES.has(myRole?.slug ?? "") && (
        <LastResultBanner
          gameId={gameId}
          meId={me.id}
          players={players}
          roles={roles}
          currentTour={game.current_tour}
          myRoleSlug={myRole?.slug}
        />
      )}

      {myRole?.slug === "juge" &&
        (() => {
          const used = usesOf(meMeta, "juge");
          const total = parseTotalLimit(myRole, playerCount);
          const remaining = Math.max(0, total - used);
          return (
            <JugePrisonPanel
              players={players}
              currentTour={game.current_tour}
              busy={busy}
              blocked={!!blockedReason}
              remaining={remaining}
              total={total === Infinity ? null : total}
              onRelease={(id) => void runCapacity({ targetIds: [id], skipTargetCheck: true })}
            />
          );
        })()}
      {myRole?.slug === "executeur" &&
        (() => {
          const used = usesOf(meMeta, "executeur");
          const total = parseTotalLimit(myRole, playerCount);
          const remaining = Math.max(0, total - used);
          return (
            <ExecuteurPrisonPanel
              players={players}
              currentTour={game.current_tour}
              busy={busy}
              blocked={!!blockedReason}
              remaining={remaining}
              total={total === Infinity ? null : total}
              onExecute={(id) => void runCapacity({ targetIds: [id], skipTargetCheck: true })}
            />
          );
        })()}

      {isApothicaire && (
        <div className="mt-3">
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 mb-2">
            Choisis une fiole à <span className="font-semibold">offrir</span> à un joueur : il
            l'utilisera comme il veut depuis son Carnet. Tu dois en offrir au moins 2 sur 3. Pour en{" "}
            <span className="font-semibold">garder une</span> et l'utiliser toi-même, passe par ton
            Carnet (1 maximum).
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            <span>Choisis ta fiole à offrir</span>
            <span>
              Offertes : {(meMeta.fioles_given as number | undefined) ?? 0} · Gardée :{" "}
              {(meMeta.fioles_self_used as number | undefined) ?? 0}/1
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {fiolesAvail.length === 0 && (
              <div className="col-span-3 text-xs text-muted-foreground italic">
                Toutes les fioles ont été utilisées.
              </div>
            )}
            {fiolesAvail.map((f) => (
              <button
                key={f.id}
                onClick={() => setFiole(f.id)}
                className={`h-12 rounded-lg text-sm transition inline-flex flex-col items-center justify-center gap-1 ${fiole === f.id ? "bg-primary/20 text-primary ring-1 ring-primary" : "bg-card/60 hover:bg-card"}`}
              >
                <f.Icon className="size-4" aria-hidden /> {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {myRole?.slug === "cuisinier" && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-1.5">
          <ChefHat className="size-4 shrink-0 mt-0.5" aria-hidden />{" "}
          <span>
            Capacité passive — tu as reçu un couteau au début de la partie. Utilise-le depuis ton
            inventaire.
          </span>
        </div>
      )}
      {myRole?.slug === "vengeur" && !meMeta.etre_cher && !meMeta.beloved_id && (
        <VengeurBelovedChoice meId={me.id} players={players} roles={roles} />
      )}
      {myRole?.slug === "vengeur" &&
        Boolean(meMeta.etre_cher || meMeta.beloved_id) &&
        (() => {
          const belovedId =
            (meMeta.beloved_id as string | undefined) ?? (meMeta.etre_cher as string | undefined);
          const beloved = players.find((p) => p.id === belovedId);
          const unlocked = meMeta.kill_unlocked === true;
          return (
            <div className="mt-3 rounded-lg border border-pink-400/40 bg-pink-500/10 px-3 py-2 text-xs text-pink-200 flex items-start gap-1.5">
              <Heart className="size-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                Être cher verrouillé :{" "}
                <span className="font-semibold">{beloved?.pseudo ?? "?"}</span>.
                {unlocked ? (
                  <span className="inline-flex items-center gap-1">
                    {" "}
                    <Swords className="size-3.5" aria-hidden /> Vengeance débloquée — utilise ton
                    couteau depuis l'inventaire.
                  </span>
                ) : (
                  " Tu recevras un couteau si il/elle meurt."
                )}
              </span>
            </div>
          );
        })()}
      {mode !== "none" &&
        !isOraclePending &&
        myRole?.slug !== "cuisinier" &&
        myRole?.slug !== "vengeur" &&
        myRole?.slug !== "juge" &&
        myRole?.slug !== "executeur" &&
        myRole?.slug !== "paranoiaque" &&
        !(myRole?.slug === "saint" && meMeta.saint_used === true) &&
        !(blockedReason != null && /^Déjà utilisé/.test(blockedReason)) && (
          <>
            <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {myRole?.instruction_verb ?? "Cible"}{" "}
              {needed > 1 ? `(${targets.length}/${needed})` : ""}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {targetable.map((p, idx) => {
                const sel = targets.includes(p.id);
                // 2 par ligne : on oppose le trait rouge (toujours vers l'extérieur)
                // et on renvoie le libellé « CIBLE » vers l'intérieur.
                const isLeft = idx % 2 === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleTarget(p.id)}
                    style={{
                      WebkitTapHighlightColor: "transparent",
                      background: sel
                        ? `linear-gradient(${isLeft ? "90deg" : "270deg"}, oklch(0.32 0.14 22 / 0.55), oklch(0.20 0.05 30 / 0.35))`
                        : undefined,
                    }}
                    className={`relative overflow-hidden min-h-[58px] rounded-xl px-3 py-2 flex items-center gap-2.5 touch-manipulation active:scale-[0.97] transition ${
                      isLeft ? "flex-row text-left" : "flex-row-reverse text-right"
                    } ${sel ? "ring-1 ring-primary/55" : "bg-card/60 ring-1 ring-border hover:bg-card"}`}
                  >
                    {/* Trait rouge extérieur (gauche pour col. gauche, droite pour col. droite) */}
                    {sel && (
                      <span
                        aria-hidden
                        className={`absolute inset-y-0 w-[3px] bg-primary ${isLeft ? "left-0" : "right-0"}`}
                        style={{ boxShadow: "0 0 12px -1px var(--primary)" }}
                      />
                    )}
                    <AvatarImg avatar={playerAvatar(p)} size={34} className="shrink-0" />
                    <span
                      className={`flex-1 truncate font-semibold ${sel ? "text-foreground" : "text-foreground/90"}`}
                    >
                      {p.id === me.id ? "Soi-même" : p.pseudo}
                    </span>
                    {sel ? (
                      <span
                        className="shrink-0 text-[10px] font-bold tracking-[0.12em] text-primary"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        CIBLE ✓
                      </span>
                    ) : (
                      <span className="shrink-0 text-lg text-muted-foreground leading-none">
                        {isLeft ? "›" : "‹"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      {mode === "none" && <div className="mt-3" />}
      {myRole?.slug === "cleaner" &&
        (() => {
          const armed = meMeta.clean_armed === true;
          const usedCount = usesOf(meMeta, "cleaner");
          const total = parseTotalLimit(myRole, playerCount);
          const remaining = Math.max(0, total - usedCount);
          const exhausted = remaining <= 0;
          return (
            <PanelCard
              tone="neutral"
              icon={Eraser}
              label="Cleaner"
              action={
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${armed ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-muted text-muted-foreground"}`}
                >
                  <span
                    className={`size-2 rounded-full ${armed ? "bg-emerald-400" : "bg-muted-foreground/60"}`}
                    aria-hidden
                  />
                  {armed ? "ARMÉ" : "INACTIF"}
                </span>
              }
            >
              <p className="text-sm text-foreground mb-3">
                {armed
                  ? "Le prochain meurtre du Tueur sera effacé. Aucune annonce publique, pas d'autopsie."
                  : "Arme l'effaceur pour cacher le prochain meurtre du Tueur."}
              </p>
              <button
                disabled={busy || !!blockedReason}
                onClick={() => runCapacity()}
                className={`w-full h-11 rounded-lg font-semibold disabled:opacity-40 ring-1 transition-colors ${armed ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/50 hover:bg-emerald-500/30" : "bg-primary/10 text-primary ring-primary/30 hover:bg-primary/20"}`}
              >
                {busy ? "…" : armed ? "Désarmer le Cleaner" : "Armer le Cleaner"}
              </button>
              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Utilisations restantes
                </span>
                <span
                  className={`text-sm font-bold ${exhausted ? "text-destructive" : "text-foreground"}`}
                >
                  {remaining} / {total === Infinity ? "∞" : total}
                </span>
              </div>
            </PanelCard>
          );
        })()}
      {myRole?.slug === "conservateur" && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-1.5">
          <KeyRound className="size-4 shrink-0 mt-0.5" aria-hidden />{" "}
          <span>Désigne un joueur ci-dessous : il recevra une relique maudite au hasard.</span>
        </div>
      )}

      {hasStickyFooter && (
        <div className="sticky bottom-0 left-0 right-0 -mx-5 -mb-5 mt-4 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-md border-t border-border z-20 space-y-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.6)]">
          {result && !result.ok && (
            <div className="rounded-lg px-3 py-2 text-sm bg-destructive/15 ring-1 ring-destructive/40 text-destructive font-medium">
              {result.message}
            </div>
          )}
          {showGenericUseBtn && (
            <button
              disabled={
                busy ||
                !!blockedReason ||
                targets.length < minTargets ||
                (isApothicaire && fiolesAvail.length === 0)
              }
              onClick={() => void runCapacity()}
              style={{
                WebkitTapHighlightColor: "transparent",
                background: "var(--gradient-gold)",
                color: "oklch(0.26 0.05 60)", // encre foncée : contraste fort sur l'or
                transform: "rotate(-1.5deg)",
                fontFamily: "var(--font-display)",
                boxShadow: "0 10px 22px -8px oklch(0.62 0.16 70 / 0.55)",
              }}
              className="block w-full h-14 my-1 rounded-xl font-bold text-base tracking-wide uppercase disabled:opacity-40 active:scale-[0.98] transition touch-manipulation"
            >
              {busy
                ? "…"
                : isApothicaire
                  ? `Offrir la fiole${targets.length > 0 ? ` à 1 joueur` : ""}`
                  : `Utiliser${targets.length > 0 ? ` (${targets.length}/${needed})` : ""}`}
            </button>
          )}
          {showAngeGardienBtn && (
            <button
              disabled={busy || !!blockedReason}
              onClick={() => runCapacity()}
              className="w-full h-12 rounded-lg bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/50 font-semibold disabled:opacity-40"
            >
              {busy ? (
                "…"
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="size-4" aria-hidden /> Activer le bouclier
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ───────── Marionnettiste : panneau d'état + ouverture de l'onglet capacité de la marionnette
function MarionnettistePanel({ ctx }: { ctx: FrameContext }) {
  const { me, game, players } = ctx;
  const meMeta = (me.role_meta ?? {}) as Record<string, unknown>;
  const puppetId = meMeta.puppet_id as string | undefined;
  const puppetActiveTour = meMeta.puppet_active_tour as number | undefined;
  const [open, setOpen] = useState(false);

  if (!puppetId || typeof puppetActiveTour !== "number") return null;
  const puppet = players.find((p) => p.id === puppetId);
  if (!puppet) return null;
  const puppetRole = ctx.roles.get(puppet.role_slug ?? "") ?? null;

  // Programmée pour un tour futur
  if (puppetActiveTour > game.current_tour) {
    return (
      <PanelCard tone="red" icon={Drama} label="Marionnette préparée">
        <div>
          Au prochain tour, tu prendras le contrôle de{" "}
          <span className="font-semibold">{puppet.pseudo}</span>.
        </div>
      </PanelCard>
    );
  }
  // Tour passé : plus rien à piloter
  if (puppetActiveTour < game.current_tour) {
    return (
      <PanelCard tone="neutral" icon={Drama} label="Manipulation terminée">
        <div>
          Manipulation de <span className="font-medium">{puppet.pseudo}</span> terminée.
        </div>
      </PanelCard>
    );
  }
  // puppetActiveTour === current_tour → contrôle actif
  const puppetCtx: FrameContext = {
    ...ctx,
    me: puppet,
    myRole: puppetRole,
    puppeteerOverride: { puppeteerId: me.id, puppeteerPseudo: me.pseudo },
  };
  return (
    <>
      <PanelCard tone="red" icon={Drama} label="Manipulation en cours">
        <div className="text-purple-200/90 text-xs mb-3">
          Tu contrôles <span className="font-semibold text-purple-50">{puppet.pseudo}</span>
          {puppetRole ? (
            <>
              {" "}
              — rôle : <span className="font-semibold">{puppetRole.name_fr}</span>
            </>
          ) : null}
          . Sa capacité lui est bloquée, mais tu peux l'utiliser à sa place.
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-full h-11 rounded-lg bg-purple-500/30 ring-1 ring-purple-400 text-purple-50 font-semibold hover:bg-purple-500/40"
        >
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden /> Voir l'onglet capacité du manipulé
          </span>
        </button>
      </PanelCard>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border-2 border-purple-400/60 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-purple-400/30 bg-purple-500/10">
              <div className="text-xs">
                <div className="uppercase tracking-wider text-purple-300 inline-flex items-center gap-1.5">
                  <Drama className="size-3.5" aria-hidden /> Capacité pilotée
                </div>
                <div className="font-semibold text-purple-50">
                  {puppet.pseudo}
                  {puppetRole ? ` — ${puppetRole.name_fr}` : ""}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-card text-sm hover:bg-card/80"
              >
                Fermer
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RoleTab ctx={puppetCtx} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ───────── Falsificateur : panneau listant les joueurs falsifiés par moi
function FalsificateurPanel({
  meId,
  players,
  roles,
}: {
  meId: string;
  players: Array<{ id: string; pseudo: string; role_slug?: string | null; role_meta?: unknown }>;
  roles: Map<string, RoleRow>;
}) {
  const falsified = players
    .map((p) => {
      const meta = (p.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}) as Record<
        string,
        unknown
      >;
      if (meta.falsified !== true || meta.falsified_by !== meId) return null;
      return { p, tour: (meta.falsified_at_tour as number | undefined) ?? null };
    })
    .filter((x): x is { p: (typeof players)[number]; tour: number | null } => !!x);

  return (
    <PanelCard
      tone="red"
      icon={NotebookPen}
      label="Joueurs falsifiés"
      action={
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-destructive/15 text-destructive font-semibold tabular-nums">
          {falsified.length}
        </span>
      }
    >
      {falsified.length === 0 ? (
        <div className="text-[11px] text-muted-foreground italic">
          Aucun joueur falsifié pour l'instant.
        </div>
      ) : (
        <div className="space-y-1.5">
          {falsified.map(({ p, tour }) => {
            const meta = (
              p.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}
            ) as Record<string, unknown>;
            const r = roles.get(p.role_slug ?? "");
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg bg-background/40 border border-border/40 px-2 py-1.5"
              >
                <AvatarImg
                  id={p.id}
                  avatar={avatarOf(meta.avatar as string | undefined, p.id)}
                  size={26}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground/95 truncate">{p.pseudo}</div>
                  {r && (
                    <div className="text-[10px] text-muted-foreground truncate inline-flex items-center gap-1">
                      <RoleIcon role={r} size={12} /> {r.name_fr}
                    </div>
                  )}
                </div>
                {tour != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-200/80 font-semibold tabular-nums">
                    T{tour}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ───────── Liste des rôles qui n'ont PAS besoin du bandeau "Dernier résultat"
// (panneau dédié, action purement passive, ou setup unique avec affichage propre)
const NO_LAST_RESULT_ROLES = new Set<string>([
  "temoin",
  "voisin",
  "usurpateur",
  "avocat",
  "guetteur",
  "cuisinier",
  "juge",
  "medecin_legiste",
  "medium",
  "cartomancien",
  "journaliste",
  "veuve_noire",
  "paranoiaque",
  "oracle",
  "entremetteur",
  "imitateur",
  "vengeur",
  "ange_gardien",
  "saint",
  // Décision joueur : pas de bandeau (panneau dédié ou pas d'info utile)
  "cleaner",
  "marionnettiste",
  "falsificateur",
  "empoisonneur",
  "vampire",
  "conservateur",
]);

// ───────── Bannière persistante : Dernier résultat de capacité
type LastRow = {
  id: string;
  tour: number;
  phase: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  target_player_id: string | null;
  target_player_id_2: string | null;
  created_at: string;
};

// Description neutre de l'action menée par le joueur, sans révéler l'issue.
const ACTION_DESCRIPTIONS: Record<string, (t1?: string, t2?: string) => string> = {
  accusateur: (t) => `Tu as accusé ${t ?? "un joueur"}.`,
  ange_gardien: (t) => `Tu as protégé ${t ?? "un joueur"}.`,
  apothicaire: (t) => `Tu as offert une fiole à ${t ?? "un joueur"}.`,
  armurier: (t) => `Tu as armé ${t ?? "un joueur"}.`,
  assistant_du_detective: (t) => `Tu as enquêté sur ${t ?? "un joueur"}.`,
  avocat: (t) => `Tu as défendu ${t ?? "un joueur"}.`,
  babysitter: (t) => `Tu as veillé sur ${t ?? "un joueur"}.`,
  barman: (t) => `Tu as servi un verre à ${t ?? "un joueur"}.`,
  boussole: (t) => `Tu as orienté ta boussole vers ${t ?? "un joueur"}.`,
  cartomancien: (t) => `Tu as tiré les cartes pour ${t ?? "un joueur"}.`,
  chasseur_de_vampire: (t) => `Tu as traqué ${t ?? "un joueur"}.`,
  cleaner: (t) => `Tu as nettoyé les traces de ${t ?? "un joueur"}.`,
  conservateur: (t) => `Tu as confié une relique à ${t ?? "un joueur"}.`,
  croque_mitaine: (t) => `Tu as effrayé ${t ?? "un joueur"}.`,
  cuisinier: () => `Tu as préparé ton plat.`,
  empoisonneur: (t) => `Tu as empoisonné ${t ?? "un joueur"}.`,
  entremetteur: (t, t2) =>
    t && t2 ? `Tu as lié ${t} et ${t2}.` : `Tu as tenté de lier deux joueurs.`,
  executeur: (t) => `Tu as désigné ${t ?? "un joueur"} comme cible.`,
  facteur: (t) => `Tu as posté un message à ${t ?? "un joueur"}.`,
  falsificateur: (t) =>
    t ? `Tu as falsifié des informations visant ${t}.` : `Tu as falsifié des informations.`,
  guetteur: (t) => `Tu as surveillé ${t ?? "un joueur"}.`,
  heritier_dechu: (t) => `Tu as enquêté sur ${t ?? "un joueur"}.`,
  imitateur: (t) => `Tu as imité ${t ?? "un joueur"}.`,
  journaliste: (t) => `Tu as enquêté sur ${t ?? "un joueur"}.`,
  juge: (t) => `Tu as jugé ${t ?? "un joueur"}.`,
  maitre_chanteur: (t) => `Tu as fait chanter ${t ?? "un joueur"}.`,
  majordome: (t) => `Tu as servi ${t ?? "un joueur"}.`,
  marionnettiste: (t, t2) =>
    t && t2 ? `Tu as manipulé ${t} et ${t2}.` : `Tu as manipulé ${t ?? "un joueur"}.`,
  medecin_legiste: (t) => `Tu as autopsié ${t ?? "un joueur"}.`,
  medium: () => `Tu as contacté les morts.`,
  mouchard: (t) => `Tu as espionné ${t ?? "un joueur"}.`,
  oracle: (t) => (t ? `Tu as consulté ton oracle sur ${t}.` : `Tu as consulté ton oracle.`),
  paranoiaque: (t) => `Tu as scruté ${t ?? "un joueur"}.`,
  parieur_tricheur: () => `Tu as placé ton pari.`,
  policier: (t) => `Tu as arrêté ${t ?? "un joueur"}.`,
  saint: (t) => `Tu as béni ${t ?? "un joueur"}.`,
  stratege: (t) => `Tu as marqué ${t ?? "une cible"} pour ton embuscade.`,
  temoin: (t) => `Tu as observé ${t ?? "un joueur"}.`,
  tueur: (t) => `Tu as tenté de tuer ${t ?? "un joueur"}.`,
  usurpateur: (t) => `Tu as usurpé ${t ?? "un joueur"}.`,
  vampire: (t) => `Tu as mordu ${t ?? "un joueur"}.`,
  vengeur: (t) => `Tu as ciblé ${t ?? "un joueur"} pour ta vengeance.`,
  veuve_noire: (t) => `Tu as séduit ${t ?? "un joueur"}.`,
  voisin: (t) => `Tu as rendu visite à ${t ?? "un joueur"}.`,
  voleur: (t) => `Tu as volé ${t ?? "un joueur"}.`,
};

function describeAction(slug: string | null | undefined, t1?: string, t2?: string): string {
  const fn = slug ? ACTION_DESCRIPTIONS[slug] : null;
  if (fn) return fn(t1, t2);
  if (t1 && t2) return `Tu as ciblé ${t1} et ${t2}.`;
  if (t1) return `Tu as ciblé ${t1}.`;
  return `Action enregistrée.`;
}

function LastResultBanner({
  gameId,
  meId,
  players,
  roles,
  currentTour,
  myRoleSlug,
}: {
  gameId: string;
  meId: string;
  players: Array<{ id: string; pseudo: string; role_meta?: unknown }>;
  roles: Map<string, RoleRow>;
  currentTour: number;
  myRoleSlug?: string | null;
}) {
  const [last, setLast] = useState<LastRow | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadId = 0;
    async function load() {
      const myId = ++loadId;
      const { data } = await supabase
        .from("role_actions")
        .select("id,tour,phase,payload,result,target_player_id,target_player_id_2,created_at")
        .eq("game_id", gameId)
        .eq("actor_player_id", meId)
        .eq("tour", currentTour)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || myId !== loadId) return;
      setLast((data ?? null) as LastRow | null);
    }
    void load();
    const ch = supabase
      .channel(`last-result-${meId}-${currentTour}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "role_actions",
          filter: `actor_player_id=eq.${meId}`,
        },
        (p) => {
          const row = p.new as LastRow;
          if (!row || row.tour !== currentTour) return;
          setLast((prev) => (prev && prev.id === row.id ? prev : row));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "role_actions",
          filter: `actor_player_id=eq.${meId}`,
        },
        (p) => {
          const row = p.new as LastRow;
          if (!row || row.tour !== currentTour) return;
          setLast((prev) =>
            prev && prev.id === row.id
              ? { ...prev, payload: row.payload ?? prev.payload, result: row.result ?? prev.result }
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId, currentTour]);

  if (!last || dismissedId === last.id) return null;

  const t1 = last.target_player_id ? players.find((p) => p.id === last.target_player_id) : null;
  const t2 = last.target_player_id_2 ? players.find((p) => p.id === last.target_player_id_2) : null;
  const time = new Date(last.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const actionText = describeAction(myRoleSlug, t1?.pseudo, t2?.pseudo);
  // Issue réelle (message stocké après résolution), distincte de la simple
  // description d'action. Si rien de signifiant → état « en attente ».
  const resultMsg = actionSummary(last.payload ?? {}, last.result ?? undefined);
  const hasOutcome =
    !!resultMsg && resultMsg !== "Capacité utilisée." && resultMsg.trim() !== actionText.trim();
  // Ton fiable depuis result.outcome (persisté), sinon repli regex.
  const storedOutcome = (last.result as Record<string, unknown> | null)?.outcome as
    | ResultTone
    | undefined;
  const tone: ResultTone =
    storedOutcome ?? (hasOutcome ? parseResultMessage(resultMsg).tone : "info");
  const cardTint = !hasOutcome
    ? "border-gold/30 bg-gold/[0.05]"
    : tone === "success"
      ? "border-emerald-500/40 bg-emerald-500/[0.07]"
      : tone === "fail"
        ? "border-rose-500/40 bg-rose-500/[0.07]"
        : tone === "pending"
          ? "border-amber-500/40 bg-amber-500/[0.06]"
          : "border-sky-500/40 bg-sky-500/[0.06]";

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Résultat
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          T{last.tour} · {time}
        </span>
      </div>

      <div
        key={last.id}
        className={`result-reveal relative rounded-xl border ${cardTint} p-3.5 pr-9`}
      >
        <button
          onClick={() => setDismissedId(last.id)}
          aria-label="Masquer"
          className="absolute top-2 right-2 w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 flex items-center justify-center text-base leading-none"
        >
          ×
        </button>

        {hasOutcome ? (
          <>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/90 mb-1.5 truncate">
              {colorize(actionText, roles)}
            </div>
            <ResultBlock
              raw={resultMsg}
              roles={roles}
              outcome={storedOutcome}
              verdict={myRoleSlug === "boussole" || myRoleSlug === "chasseur_de_vampire"}
            />
          </>
        ) : (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-lg leading-none mt-0.5" aria-hidden>
              ⏳
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-foreground leading-snug">
                {colorize(actionText, roles)}
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground leading-snug">
                Action enregistrée. Le dénouement arrive à l'Annonce.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────── Sous-onglet : Historique (capacités utilisées)

export type ActionRow = {
  id: string;
  tour: number;
  phase: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
  target_player_id: string | null;
  target_player_id_2: string | null;
};

export function CapabilityCard({
  tour,
  phase,
  created_at,
  payload,
  result,
  target_player_id,
  target_player_id_2,
  players,
  roles,
  highlight = false,
  kind = "capability",
}: {
  tour: number;
  phase: string;
  created_at: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  target_player_id: string | null;
  target_player_id_2: string | null;
  players: { id: string; pseudo: string; role_meta?: unknown }[];
  roles: Map<string, RoleRow>;
  highlight?: boolean;
  kind?: "capability" | "item";
}) {
  const recap = actionSummary(payload ?? {}, result ?? undefined);
  const isItem = kind === "item";
  const itemSlug = isItem ? (payload?.item as string | undefined) : undefined;
  const itemIcon =
    itemSlug && itemSlug in ITEM_CATALOG
      ? ITEM_CATALOG[itemSlug as keyof typeof ITEM_CATALOG].icon
      : "🎒";
  const itemName = isItem ? (payload?.name as string | undefined) : undefined;
  // Couleur de provenance de l'objet (faction de la source), si tracée.
  const itemFac = isItem
    ? ((payload?.origin_faction as ItemOrigin | null | undefined) ?? null)
    : null;
  const itemFacColor = isItem ? factionToken(itemFac) : null;

  const tp1 = target_player_id ? (players.find((p) => p.id === target_player_id) ?? null) : null;
  const tp2 = target_player_id_2
    ? (players.find((p) => p.id === target_player_id_2) ?? null)
    : null;
  const targets = [tp1, tp2].filter((p): p is NonNullable<typeof p> => !!p);

  const time = new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const accent = highlight ? "gold" : isItem ? "cyan" : "muted";
  const accentBar = accent === "gold" ? "bg-gold" : accent === "cyan" ? "bg-cyan-400" : "bg-border";
  const accentText =
    accent === "gold" ? "text-gold" : accent === "cyan" ? "text-cyan-300" : "text-muted-foreground";

  const headLabel = isItem ? (itemName ?? "Objet") : "Capacité";
  // Étiquette de nature : « Objet » pour tout objet ; « Objet · Capacité » pour
  // le couteau du Cuisinier (objet qui EST sa capacité de rôle).
  const isObjectCapacity = isItem && (payload?.object_capacity as boolean | undefined) === true;
  const natureTag = isItem ? (isObjectCapacity ? "Objet · Capacité" : "Objet") : null;

  return (
    <div className="relative rounded-lg border border-border/60 bg-card/40 pl-3 pr-3 py-2.5">
      <div
        aria-hidden
        className={`absolute inset-y-1.5 left-0 w-[2px] rounded-r opacity-70 ${itemFacColor ? "" : accentBar}`}
        style={itemFacColor ? { background: itemFacColor } : undefined}
      />

      {/* Ligne 1 : icône + label + cibles avatars + temps */}
      <div className="flex items-center gap-2">
        {isItem ? (
          <span
            className="shrink-0 text-base leading-none"
            style={{ color: itemFacColor ?? undefined }}
          >
            {itemIcon}
          </span>
        ) : (
          <Zap className={`shrink-0 size-4 ${accentText}`} aria-hidden />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/90">
          {headLabel}
        </span>
        {natureTag && (
          <span className="shrink-0 rounded-full bg-cyan-400/15 text-cyan-300 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ring-1 ring-cyan-400/30">
            {natureTag}
          </span>
        )}
        {targets.length > 0 && (
          <>
            <span className="text-muted-foreground text-xs">→</span>
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {targets.map((p) => {
                const meta = (
                  p.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}
                ) as Record<string, unknown>;
                return (
                  <span key={p.id} className="inline-flex items-center gap-1 min-w-0">
                    <AvatarImg
                      id={p.id}
                      avatar={avatarOf(meta.avatar as string | undefined, p.id)}
                      size={16}
                    />
                    <span className="text-xs font-medium text-foreground/85 truncate">
                      {p.pseudo}
                    </span>
                  </span>
                );
              })}
            </div>
          </>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          T{tour} · {time}
        </span>
      </div>

      {/* Résultat */}
      <div className="mt-1.5">
        <ResultBlock
          raw={recap}
          roles={roles}
          size="sm"
          outcome={(result as Record<string, unknown> | null)?.outcome as ResultTone | undefined}
          verdict={(payload as Record<string, unknown> | null)?.effect === "compare"}
        />
      </div>
    </div>
  );
}

function HistoryTab({
  gameId,
  meId,
  players,
  roles,
}: {
  gameId: string;
  meId: string;
  players: { id: string; pseudo: string; role_meta?: unknown }[];
  roles: Map<string, RoleRow>;
}) {
  const [actions, setActions] = useState<ActionRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: a } = await supabase
        .from("role_actions")
        .select("id,tour,phase,payload,result,created_at,target_player_id,target_player_id_2")
        .eq("game_id", gameId)
        .eq("actor_player_id", meId)
        .order("created_at", { ascending: false })
        .limit(60);
      if (cancelled) return; // évite qu'une requête d'un ancien joueur écrase les données du joueur courant
      setActions((a ?? []) as ActionRow[]);
    }
    void load();
    const ch = supabase
      .channel(`history-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_actions",
          filter: `actor_player_id=eq.${meId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId]);

  // Les objets ont désormais leur propre historique dans l'onglet Inventaire —
  // ici on n'affiche que les capacités (plus de filtre « Objets »).
  const visible = actions.filter((a) => !(a.payload as Record<string, unknown>)?.item);

  // Group by tour (descending)
  const byTour = new Map<number, ActionRow[]>();
  for (const a of visible) {
    if (!byTour.has(a.tour)) byTour.set(a.tour, []);
    byTour.get(a.tour)!.push(a);
  }
  const tours = Array.from(byTour.keys()).sort((a, b) => b - a);

  return (
    <div className="p-5 space-y-4">
      {/* Intro */}
      <div className="rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground text-center">
        Retrouve ici <span className="text-foreground font-medium">tes capacités utilisées</span> et
        ce que tu as appris, tour par tour.{" "}
        <span className="text-muted-foreground/70">
          (Les objets sont dans l'onglet Inventaire.)
        </span>
      </div>

      {/* Timeline par tour */}
      {tours.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center">
          <History className="size-7 mx-auto mb-2 opacity-60" aria-hidden />
          <div className="text-sm text-muted-foreground">Rien encore.</div>
          <div className="text-xs text-muted-foreground mt-1">
            Tes actions et leurs résultats apparaîtront ici.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {tours.map((t) => (
            <section key={t}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-[11px] font-bold text-gold">
                  {t}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Tour {t}
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className="text-[10px] text-muted-foreground">
                  {byTour.get(t)!.length} action{byTour.get(t)!.length > 1 ? "s" : ""}
                </div>
              </div>
              <ul className="space-y-2">
                {byTour.get(t)!.map((a) => {
                  const isItem = !!(a.payload as Record<string, unknown>)?.item;
                  return (
                    <li key={a.id}>
                      <CapabilityCard
                        tour={a.tour}
                        phase={a.phase}
                        created_at={a.created_at}
                        payload={a.payload}
                        result={a.result}
                        target_player_id={a.target_player_id}
                        target_player_id_2={a.target_player_id_2}
                        players={players}
                        roles={roles}
                        kind={isItem ? "item" : "capability"}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────── Sous-onglet : Victoire (faction + condition dynamique)
function WinTab({
  me,
  myRole,
  players,
}: {
  me: import("@/engine/actions").PlayerRow;
  myRole: import("@/engine/actions").RoleRow | null;
  players: import("@/engine/actions").PlayerRow[];
}) {
  const { factionLabel, lines } = describeWinCondition(me, myRole, players);
  const factionColor =
    myRole?.faction === "Civil"
      ? "text-sky-300 border-sky-500/40 bg-sky-500/5"
      : myRole?.faction === "Méchant"
        ? "text-destructive border-destructive/40 bg-destructive/5"
        : myRole?.slug === "vampire"
          ? "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/5"
          : "text-amber-300 border-amber-500/40 bg-amber-500/5";

  return (
    <div className="p-5 space-y-4">
      <div className={`rounded-xl border p-4 ${factionColor}`}>
        <div className="text-[10px] uppercase tracking-widest opacity-70">Ta faction</div>
        <div className="text-2xl font-bold mt-1">{factionLabel}</div>
        <div className="text-xs mt-1 opacity-80 inline-flex items-center gap-1">
          <RoleIcon role={myRole} size={16} /> {myRole?.name_fr}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Ta condition de victoire
        </div>
        {lines.map((l, i) => (
          <p key={i} className="text-sm leading-relaxed">
            {l}
          </p>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic text-center">
        Cette condition s'actualise selon les événements de la partie.
      </p>
    </div>
  );
}

// ───────── Sous-onglet : Chat (méchants / médium / cimetière)
function ChatTab({
  gameId,
  meId,
  mePseudo,
  isMedium,
  isDead,
}: {
  gameId: string;
  meId: string;
  mePseudo: string;
  isMedium: boolean;
  isDead: boolean;
}) {
  // Mort ou Médium → Conseil des morts ; sinon → chat Méchants
  const channel = isDead || isMedium ? "council" : "mechants";
  const canWrite = isDead || (!isMedium && !isDead); // médium = écoute seule
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {channel === "council" ? (
          <>
            <Skull className="size-3.5" aria-hidden /> Conseil des morts
          </>
        ) : (
          <>
            <Droplet className="size-3.5" aria-hidden /> Conseil des Méchants
          </>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel
          gameId={gameId}
          channel={channel}
          meId={meId}
          mePseudo={mePseudo}
          canWrite={canWrite}
          anonymous={isMedium && !isDead}
          emptyText={channel === "council" ? "Les ombres se taisent…" : "Personne n'a parlé."}
        />
      </div>
    </div>
  );
}

// StatusBadges supprimé : doublon avec StatusBandeau (barre du haut).

// ───────── Panneau passif Témoin : Civil aléatoire révélé en setup (T1 free)
function WitnessRevealPanel({
  gameId,
  meId,
  players,
  roles,
}: {
  gameId: string;
  meId: string;
  players: import("@/engine/actions").PlayerRow[];
  roles: Map<string, RoleRow>;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("role_actions")
        .select("target_player_id,payload")
        .eq("game_id", gameId)
        .eq("actor_player_id", meId)
        .order("created_at", { ascending: false })
        .limit(20);
      const row = (data ?? []).find(
        (r) => (r as { payload: { effect?: string } }).payload?.effect === "temoin_reveal",
      ) as { target_player_id: string | null } | undefined;
      setTargetId(row?.target_player_id ?? null);
    }
    void load();
    const ch = supabase
      .channel(`temoin-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "role_actions",
          filter: `actor_player_id=eq.${meId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId]);

  const target = targetId ? (players.find((p) => p.id === targetId) ?? null) : null;
  const targetRole = target ? roles.get(target.role_slug ?? "") : null;

  return (
    <PanelCard tone="amber" icon={Eye} label="Témoignage — Civil reconnu">
      {!target && (
        <div className="mt-2 text-xs text-muted-foreground italic">
          En attente de la 1ʳᵉ Enquête…
        </div>
      )}
      {target && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-background/40 border border-amber-500/30 p-3">
          <RoleIcon role={targetRole} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-amber-100 truncate">{target.pseudo}</div>
            <div className="text-sm text-amber-300/90 truncate">{targetRole?.name_fr ?? "?"}</div>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono">
            Civil
          </div>
        </div>
      )}
    </PanelCard>
  );
}

// ───────── Panneau passif Voisin : actions vues sur la cible surveillée
function NeighborWatchPanel({
  gameId,
  watchTargetId,
  watchSetCycle,
  players,
  roles,
  tour,
}: {
  gameId: string;
  watchTargetId: string | null;
  watchSetCycle: number | null;
  players: import("@/engine/actions").PlayerRow[];
  roles: Map<string, RoleRow>;
  tour: number;
}) {
  const [actors, setActors] = useState<Array<{ actor_player_id: string; tour: number }>>([]);
  useEffect(() => {
    if (!watchTargetId) {
      setActors([]);
      return;
    }
    async function load() {
      let q = supabase
        .from("role_actions")
        .select("actor_player_id,tour")
        .eq("game_id", gameId)
        .or(`target_player_id.eq.${watchTargetId},target_player_id_2.eq.${watchTargetId}`);
      if (typeof watchSetCycle === "number") q = q.gte("tour", watchSetCycle);
      const { data } = await q.order("created_at", { ascending: false }).limit(40);
      // Dédup : un même acteur ne compte qu'une fois par tour, même s'il a effectué plusieurs actions.
      const seen = new Set<string>();
      const unique: typeof actors = [];
      for (const row of (data ?? []) as typeof actors) {
        const key = `${row.actor_player_id}:${row.tour}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(row);
      }
      setActors(unique);
    }
    void load();
    const ch = supabase
      .channel(`voisin-${watchTargetId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "role_actions" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, watchTargetId, watchSetCycle]);

  const targetName = watchTargetId
    ? (players.find((p) => p.id === watchTargetId)?.pseudo ?? "?")
    : null;
  return (
    <PanelCard tone="indigo" icon={Radar} label="Surveillance">
      {!watchTargetId && (
        <div className="mt-1 text-muted-foreground italic">Désigne quelqu'un à surveiller.</div>
      )}
      {watchTargetId && (
        <>
          <div className="mt-1 text-foreground/90">
            Cible : <span className="font-semibold">{targetName}</span> · {actors.length}{" "}
            visiteur(s)
          </div>
          {actors.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {actors.map((a, i) => {
                const p = players.find((pp) => pp.id === a.actor_player_id);
                const pm = (p?.role_meta ?? {}) as Record<string, unknown>;
                // Le Voisin apprend le RÔLE du visiteur. On respecte la couverture
                // de l'Usurpateur (cover_slug) comme les autres enquêtes.
                const slug =
                  (typeof pm.cover_slug === "string" ? pm.cover_slug : p?.role_slug) ?? "";
                const r = slug ? roles.get(slug) : null;
                return (
                  <li key={i} className="text-foreground/80 flex items-center gap-1.5 flex-wrap">
                    <span className="text-muted-foreground">Tour {a.tour} ·</span>
                    <span className="font-semibold">{p?.pseudo ?? "Joueur inconnu"}</span>
                    {r && (
                      <span className="inline-flex items-center gap-1 text-foreground/70">
                        — <RoleIcon role={r} size={14} /> {r.name_fr}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </PanelCard>
  );
}

// ───────── Avocat : liste des prisonniers + leur faction (passif)
function AvocatPrisonPanel({
  players,
  roles,
}: {
  players: import("@/engine/actions").PlayerRow[];
  roles: Map<string, RoleRow>;
}) {
  const prisoners = players.filter((p) => p.is_imprisoned && p.is_alive && !p.is_mj);

  const factionStyle = (
    faction: string | undefined,
  ): { bg: string; border: string; text: string; Icon: LucideIcon; label: string } => {
    switch (faction) {
      case "Civil":
        return {
          bg: "oklch(0.20 0.08 230 / 0.35)",
          border: "oklch(0.55 0.18 230 / 0.45)",
          text: "var(--citoyens)",
          Icon: Shield,
          label: "Civil",
        };
      case "Méchant":
        return {
          bg: "oklch(0.20 0.10 22 / 0.4)",
          border: "oklch(0.55 0.22 22 / 0.5)",
          text: "var(--mechants)",
          Icon: Swords,
          label: "Méchant",
        };
      case "Neutre":
        return {
          bg: "oklch(0.20 0.08 75 / 0.3)",
          border: "oklch(0.55 0.16 75 / 0.45)",
          text: "var(--neutres)",
          Icon: Orbit,
          label: "Neutre",
        };
      default:
        return {
          bg: "oklch(0.22 0.02 35 / 0.5)",
          border: "oklch(0.40 0.02 35 / 0.5)",
          text: "var(--muted-foreground)",
          Icon: CircleHelp,
          label: "Inconnu",
        };
    }
  };

  return (
    <PanelCard
      tone="amber"
      icon={Scale}
      label="Dossiers de prison"
      action={
        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/18 text-amber-200">
          {prisoners.length}
        </span>
      }
    >
      <div className="text-[11px] text-muted-foreground mb-2">Tu lis la faction des détenus.</div>

      {prisoners.length === 0 ? (
        <div
          className="rounded-xl border border-dashed py-5 text-center text-xs text-muted-foreground"
          style={{ borderColor: "oklch(0.40 0.06 80 / 0.4)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Bird className="size-4" aria-hidden /> Aucun joueur en prison actuellement.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {prisoners.map((p) => {
            const meta = (
              p.role_meta && typeof p.role_meta === "object" ? p.role_meta : {}
            ) as Record<string, unknown>;
            // Usurpateur : sa couverture (faux rôle Civil) fait foi pour toute enquête,
            // y compris la lecture de faction par l'Avocat — sinon on révèle qu'il est Méchant.
            const r = roles.get((meta.cover_slug as string | undefined) ?? p.role_slug ?? "");
            const av = avatarOf(meta.avatar as string | undefined, p.id);
            const fs = factionStyle(r?.faction);
            return (
              <div
                key={p.id}
                className="rounded-xl border p-2.5 flex items-center gap-3"
                style={{
                  background: "oklch(0.18 0.04 35 / 0.55)",
                  borderColor: "oklch(0.32 0.04 35 / 0.6)",
                }}
              >
                <div className="relative shrink-0">
                  <div
                    className="size-11 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: "oklch(0.22 0.06 50 / 0.8)",
                      boxShadow: `0 0 0 2px ${fs.border}`,
                    }}
                  >
                    <AvatarImg avatar={av} size={44} rounded="lg" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center bg-[oklch(0.20_0.07_55)] border border-[oklch(0.55_0.20_55_/_0.5)]">
                    <Lock className="size-2.5" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: "oklch(0.94 0.04 80)" }}
                  >
                    {p.pseudo}
                  </div>
                  <div
                    className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold"
                    style={{
                      background: fs.bg,
                      borderColor: fs.border,
                      color: fs.text,
                    }}
                  >
                    <fs.Icon className="size-3" aria-hidden />
                    <span>Faction&nbsp;: {fs.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

// ───────── Cartomancien : panneau de cible verrouillée + modal "Voir le tableau"
function CartomancienBoardPanel({
  targetId,
  targetCycle,
  tour,
  players,
}: {
  targetId: string | null;
  targetCycle: number | null;
  tour: number;
  players: import("@/engine/actions").PlayerRow[];
}) {
  const [open, setOpen] = useState(false);
  const locked = !!targetId && targetCycle === tour;
  const target = targetId ? (players.find((p) => p.id === targetId) ?? null) : null;

  const LABELS = ["Neutre", "Safe", "Doute", "Suspect"];
  const RING_CLASS = ["ring-white/40", "ring-emerald-400", "ring-yellow-400", "ring-red-500"];
  const TEXT_CLASS = [
    "text-muted-foreground",
    "text-emerald-400",
    "text-yellow-400",
    "text-red-500",
  ];

  const board = (target?.role_meta as Record<string, unknown> | undefined)?.suspicion_board as
    | Record<string, 0 | 1 | 2 | 3>
    | undefined;
  const list = target ? players.filter((p) => p.id !== target.id && !p.is_mj) : [];

  return (
    <>
      <PanelCard tone="fuchsia" icon={Sparkles} label="Lecture des cartes">
        {!locked && (
          <div className="text-muted-foreground italic">
            Désigne 1 joueur ci-dessous. Une fois verrouillé, tu pourras consulter son tableau de
            suspicions. Le verrou se réinitialise à chaque nouveau tour.
          </div>
        )}
        {locked && target && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-foreground/90">
              Cible verrouillée : <span className="font-semibold">{target.pseudo}</span>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="text-[11px] px-3 py-1.5 rounded-md bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/40 hover:bg-fuchsia-500/30"
            >
              <span className="inline-flex items-center gap-1.5">
                <Eye className="size-3.5" aria-hidden /> Voir le tableau
              </span>
            </button>
          </div>
        )}
      </PanelCard>

      {open && target && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border border-fuchsia-400/40 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-fuchsia-300 inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5" aria-hidden /> Tableau live
                </div>
                <h3 className="text-lg font-bold">Suspicions de {target.pseudo}</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>
            {list.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Aucun joueur à afficher.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {list.map((p) => {
                  const lvl = (board?.[p.id] ?? 0) as 0 | 1 | 2 | 3;
                  const dim = !p.is_alive;
                  return (
                    <div
                      key={p.id}
                      className={`flex flex-col items-center gap-1.5 rounded-xl bg-card p-2 ${dim ? "opacity-40" : ""}`}
                    >
                      <div
                        className={`rounded-full ring-4 ring-offset-2 ring-offset-card ${RING_CLASS[lvl]}`}
                      >
                        <AvatarImg avatar={playerAvatar(p)} size={56} className="bg-background" />
                      </div>
                      <div className="text-[11px] font-medium truncate w-full text-center">
                        {p.pseudo}
                      </div>
                      <div className={`text-[9px] uppercase tracking-wider ${TEXT_CLASS[lvl]}`}>
                        {LABELS[lvl]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[10px] text-muted-foreground italic">
              Lecture en temps réel. Le verrou expire au prochain tour.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ───────── Veuve noire : tracker des cibles épousées (compte à rebours + dernier vote)
function VeuveNoireTrackerPanel({
  gameId,
  meId,
  pairs,
  players,
  tour,
}: {
  gameId: string;
  meId: string;
  pairs: Array<{ tour: number; pair: string[] }>;
  players: import("@/engine/actions").PlayerRow[];
  tour: number;
}) {
  const currentPair = pairs.find((p) => p.tour === tour) ?? null;
  const targetIds = currentPair?.pair ?? [];
  const [votes, setVotes] = useState<Record<string, string>>({});
  useEffect(() => {
    if (targetIds.length === 0) {
      setVotes({});
      return;
    }
    async function load() {
      const { data } = await supabase
        .from("votes")
        .select("voter_player_id,target_player_id")
        .eq("game_id", gameId)
        .eq("tour", tour)
        .in("voter_player_id", targetIds);
      const map: Record<string, string> = {};
      for (const v of (data ?? []) as Array<{
        voter_player_id: string;
        target_player_id: string;
      }>) {
        map[v.voter_player_id] = v.target_player_id;
      }
      setVotes(map);
    }
    void load();
    const ch = supabase
      .channel(`veuve-${meId}-${tour}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `game_id=eq.${gameId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId, tour, targetIds.join(",")]);

  return (
    <PanelCard tone="purple" icon={Network} label={`Toile tendue · T${tour}`}>
      {!currentPair && (
        <div className="mt-1 text-muted-foreground italic">
          Aucune cible ce tour — désigne 1 ou 2 joueurs.
        </div>
      )}
      {currentPair && (
        <ul className="mt-1 space-y-1">
          {targetIds.map((id) => {
            const p = players.find((pp) => pp.id === id);
            const voteTargetId = votes[id];
            const voteTargetName = voteTargetId
              ? (players.find((pp) => pp.id === voteTargetId)?.pseudo ?? "?")
              : null;
            const votedAgainstMe = voteTargetId === meId;
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="font-semibold">{p?.pseudo ?? "?"}</span>
                <span
                  className={votedAgainstMe ? "text-destructive font-bold" : "text-foreground/70"}
                >
                  {!voteTargetId && "n'a pas encore voté"}
                  {voteTargetId && votedAgainstMe && (
                    <span className="inline-flex items-center gap-1">
                      <TriangleAlert className="size-3" aria-hidden /> a voté contre toi → mort à la
                      prochaine Annonce
                    </span>
                  )}
                  {voteTargetId && !votedAgainstMe && `vote → ${voteTargetName}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {pairs.filter((p) => p.tour !== tour).length > 0 && (
        <div className="mt-2 pt-2 border-t border-purple-500/20 text-muted-foreground">
          Paires précédentes : {pairs.filter((p) => p.tour !== tour).length}
        </div>
      )}
    </PanelCard>
  );
}

// ───────── Parieur : mini-dé à 6 faces (illustration de l'onglet capacité)
// Le vrai duel animé se joue dans DiceDuelModal (plein écran, sur les 2 joueurs).
const MINI_PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [30, 28],
    [70, 28],
    [30, 50],
    [70, 50],
    [30, 72],
    [70, 72],
  ],
};
function MiniDie({ value, size = 26 }: { value: number; size?: number }) {
  const pips = MINI_PIPS[Math.min(6, Math.max(1, value))] ?? MINI_PIPS[1];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`Dé ${value}`}>
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="22"
        fill="oklch(0.97 0.02 90)"
        stroke="oklch(0.78 0.16 85)"
        strokeWidth="5"
      />
      {pips.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="10" fill="oklch(0.2 0.02 35)" />
      ))}
    </svg>
  );
}

// ───────── Usurpateur : choix de couverture parmi 3 cartes
function UsurpateurCoverChoice({
  meId,
  meMeta,
  roles,
}: {
  meId: string;
  meMeta: Record<string, unknown>;
  roles: Map<string, RoleRow>;
}) {
  const [busy, setBusy] = useState(false);
  const choices = (meMeta.cover_choices as string[] | undefined) ?? [];
  if (choices.length === 0) return null;

  async function pick(slug: string) {
    if (busy) return;
    setBusy(true);
    const { data: cur } = await supabase
      .from("players")
      .select("role_meta")
      .eq("id", meId)
      .maybeSingle();
    const m = ((cur as { role_meta: Record<string, unknown> } | null)?.role_meta ?? {}) as Record<
      string,
      unknown
    >;
    await supabase
      .from("players")
      .update({
        role_meta: { ...m, cover_slug: slug, cover_choices: null } as never,
      })
      .eq("id", meId);
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-3 text-xs text-violet-200">
      <div className="font-semibold uppercase tracking-wider text-violet-300 mb-2 inline-flex items-center gap-1.5">
        <Drama className="size-3.5" aria-hidden /> Choisis ta couverture
      </div>
      <div className="grid grid-cols-3 gap-2">
        {choices.map((s) => {
          const r = roles.get(s);
          if (!r) return null;
          return (
            <button
              key={s}
              disabled={busy}
              onClick={() => pick(s)}
              className="rounded-lg border border-violet-400/40 bg-card/60 hover:bg-violet-500/20 transition px-2 py-3 flex flex-col items-center gap-1 disabled:opacity-40"
            >
              <RoleIcon role={r} size={32} />
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                {r.name_fr}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 italic opacity-80">
        Le choix est définitif. Toutes les enquêtes te désigneront ainsi.
      </div>
    </div>
  );
}

// ───────── Vengeur : choix de l'être cher (1ère Enquête, définitif)
function VengeurBelovedChoice({
  meId,
  players,
  roles,
}: {
  meId: string;
  players: import("@/engine/actions").PlayerRow[];
  roles: Map<string, RoleRow>;
}) {
  const [busy, setBusy] = useState(false);
  // Les 2 Civils proposés au setup (role_meta.vengeur_choices). Repli legacy : tous les Civils.
  const meMeta = (players.find((p) => p.id === meId)?.role_meta ?? {}) as Record<string, unknown>;
  const proposedIds = (meMeta.vengeur_choices as string[] | undefined) ?? [];
  const choices =
    proposedIds.length > 0
      ? players.filter((p) => proposedIds.includes(p.id) && p.is_alive && !p.is_mj)
      : players.filter((p) => {
          if (p.id === meId || !p.is_alive || p.is_mj) return false;
          return roles.get(p.role_slug ?? "")?.faction === "Civil";
        });

  async function pick(targetId: string) {
    if (busy) return;
    setBusy(true);
    const { data: cur } = await supabase
      .from("players")
      .select("role_meta")
      .eq("id", meId)
      .maybeSingle();
    const m = ((cur as { role_meta: Record<string, unknown> } | null)?.role_meta ?? {}) as Record<
      string,
      unknown
    >;
    await supabase
      .from("players")
      .update({
        role_meta: {
          ...m,
          etre_cher: targetId,
          beloved_id: targetId,
          pending_beloved_choice: false,
        } as never,
      })
      .eq("id", meId);
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-lg border border-pink-400/40 bg-pink-500/10 px-3 py-3 text-xs text-pink-200">
      <div className="font-semibold uppercase tracking-wider text-pink-300 mb-2 inline-flex items-center gap-1.5">
        <Heart className="size-3.5" aria-hidden /> Choisis ton être cher
      </div>
      {proposedIds.length > 0 && (
        <div className="mb-2 opacity-80">
          Ces 2 joueurs sont des Civils. Choisis lequel sera ton être cher.
        </div>
      )}
      {choices.length === 0 ? (
        <div className="italic opacity-80">Aucun Civil disponible.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {choices.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() => pick(p.id)}
              className="rounded-lg border border-pink-400/40 bg-card/60 hover:bg-pink-500/20 transition px-3 py-3 text-sm font-medium text-foreground disabled:opacity-40 flex items-center gap-2"
            >
              <AvatarImg avatar={playerAvatar(p)} size={28} className="shrink-0" />
              <span className="flex-1 truncate text-center">{p.pseudo}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 italic opacity-80">
        Le choix est définitif. Si il/elle meurt, tu recevras un couteau de vengeance.
      </div>
    </div>
  );
}

// ───────── Guetteur : visites en direct sur soi (tour courant)
function GuetteurVisitsPanel({
  gameId,
  meId,
  players,
  roles,
  tour,
}: {
  gameId: string;
  meId: string;
  players: import("@/engine/actions").PlayerRow[];
  roles: Map<string, RoleRow>;
  tour: number;
}) {
  const [actors, setActors] = useState<Array<{ actor_player_id: string; tour: number }>>([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("role_actions")
        .select("actor_player_id,tour")
        .eq("game_id", gameId)
        .eq("tour", tour)
        .or(`target_player_id.eq.${meId},target_player_id_2.eq.${meId}`)
        .order("created_at", { ascending: false });
      setActors((data ?? []) as typeof actors);
    }
    void load();
    const ch = supabase
      .channel(`guetteur-${meId}-${tour}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "role_actions",
          filter: `game_id=eq.${gameId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId, tour]);
  return (
    <PanelCard tone="sky" icon={Eye} label={`Visites · Tour ${tour}`}>
      {actors.length === 0 && (
        <div className="mt-1 text-muted-foreground italic">
          Personne ne t'a visité pour l'instant.
        </div>
      )}
      {actors.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {actors.map((a, i) => {
            const p = players.find((pp) => pp.id === a.actor_player_id);
            return (
              <li key={i} className="text-foreground/80">
                • {p?.pseudo ?? "?"}
              </li>
            );
          })}
        </ul>
      )}
    </PanelCard>
  );
}

// ───────── Juge : liste live des prisonniers, libération après 1 tour complet
function JugePrisonPanel({
  players,
  currentTour,
  busy,
  blocked,
  remaining,
  total,
  onRelease,
}: {
  players: import("@/engine/actions").PlayerRow[];
  currentTour: number;
  busy: boolean;
  blocked: boolean;
  remaining: number;
  total: number | null;
  onRelease: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const prisoners = players.filter((p) => p.is_imprisoned && !p.is_mj);

  // Si le prisonnier sélectionné disparaît (libéré, mort), désélectionner.
  useEffect(() => {
    if (selected && !prisoners.some((p) => p.id === selected)) setSelected(null);
  }, [prisoners, selected]);

  const selectedReady = selected
    ? (() => {
        const p = prisoners.find((pp) => pp.id === selected);
        if (!p) return false;
        const m = (p.role_meta as Record<string, unknown> | null) ?? {};
        const since = (m.imprisoned_since_cycle as number | undefined) ?? currentTour;
        const pending = (m.pending_release_for_cycle as number | undefined) ?? 0;
        return currentTour > since && pending !== currentTour + 1;
      })()
    : false;

  return (
    <PanelCard
      tone="amber"
      icon={Scale}
      label={`Prisonniers · Tour ${currentTour}`}
      action={
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining <= 0 ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40" : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30"}`}
        >
          {remaining <= 0
            ? "Épuisé"
            : `${remaining}${total !== null ? ` / ${total}` : ""} restante${remaining > 1 ? "s" : ""}`}
        </span>
      }
    >
      <div className="text-[10px] text-amber-200/70 mb-2 italic">
        La libération prend effet au début du tour suivant — le prisonnier pourra ainsi agir.
      </div>
      {prisoners.length === 0 ? (
        <div className="text-muted-foreground italic">Aucun joueur en prison actuellement.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {prisoners.map((p) => {
            const meta = (p.role_meta ?? {}) as Record<string, unknown>;
            const since = (meta.imprisoned_since_cycle as number | undefined) ?? currentTour;
            const pending = (meta.pending_release_for_cycle as number | undefined) ?? 0;
            const isPending = pending === currentTour + 1;
            const ready = currentTour > since && !isPending;
            const isSel = selected === p.id;
            return (
              <button
                key={p.id}
                disabled={!ready}
                onClick={() => ready && setSelected(isSel ? null : p.id)}
                className={`h-12 rounded-lg text-sm transition px-2 flex flex-col items-center justify-center ${
                  isPending
                    ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/60 cursor-not-allowed"
                    : !ready
                      ? "bg-card/30 text-muted-foreground/40 cursor-not-allowed opacity-50"
                      : isSel
                        ? "bg-primary/20 text-primary ring-1 ring-primary"
                        : "bg-card/60 hover:bg-card text-foreground"
                }`}
                title={
                  isPending
                    ? "Libération programmée pour le prochain tour"
                    : ready
                      ? "Sélectionner"
                      : "Doit purger un tour complet"
                }
              >
                <span className="font-medium flex items-center gap-2">
                  <AvatarImg avatar={playerAvatar(p)} size={24} />
                  <Lock className="size-3" aria-hidden /> {p.pseudo}
                </span>
                {isPending && (
                  <span className="text-[9px] uppercase tracking-wider">libération programmée</span>
                )}
                {!isPending && !ready && (
                  <span className="text-[9px] uppercase tracking-wider">vient d'arriver</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button
        disabled={!selected || !selectedReady || busy || blocked}
        onClick={() => {
          if (selected && selectedReady) {
            onRelease(selected);
            setSelected(null);
          }
        }}
        className="mt-3 h-12 w-full rounded-lg bg-gold text-primary-foreground font-semibold disabled:opacity-40"
      >
        {busy ? (
          "…"
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <LockOpen className="size-4" aria-hidden /> Programmer la libération
          </span>
        )}
      </button>
    </PanelCard>
  );
}

// ───────── Exécuteur : liste live des prisonniers, exécution après 1 tour complet
function ExecuteurPrisonPanel({
  players,
  currentTour,
  busy,
  blocked,
  remaining,
  total,
  onExecute,
}: {
  players: import("@/engine/actions").PlayerRow[];
  currentTour: number;
  busy: boolean;
  blocked: boolean;
  remaining: number;
  total: number | null;
  onExecute: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const prisoners = players.filter((p) => p.is_imprisoned && !p.is_mj);

  useEffect(() => {
    if (selected && !prisoners.some((p) => p.id === selected)) {
      setSelected(null);
      setConfirm(false);
    }
  }, [prisoners, selected]);

  const selectedReady = selected
    ? (() => {
        const p = prisoners.find((pp) => pp.id === selected);
        if (!p) return false;
        const since =
          ((p.role_meta as Record<string, unknown> | null)?.imprisoned_since_cycle as
            | number
            | undefined) ?? currentTour;
        return currentTour > since;
      })()
    : false;

  return (
    <PanelCard
      tone="rose"
      icon={Axe}
      label={`Prisonniers — Tour ${currentTour}`}
      action={
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${remaining <= 0 ? "bg-rose-500/30 text-rose-200 ring-1 ring-rose-400/60" : "bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30"}`}
        >
          {remaining <= 0
            ? "Épuisé"
            : `${remaining}${total !== null ? ` / ${total}` : ""} restante${remaining > 1 ? "s" : ""}`}
        </span>
      }
    >
      {prisoners.length === 0 ? (
        <div className="text-muted-foreground italic">Aucun joueur en prison actuellement.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {prisoners.map((p) => {
            const meta = (p.role_meta ?? {}) as Record<string, unknown>;
            const since = (meta.imprisoned_since_cycle as number | undefined) ?? currentTour;
            const ready = currentTour > since;
            const isSel = selected === p.id;
            return (
              <button
                key={p.id}
                disabled={!ready}
                onClick={() => {
                  if (ready) {
                    setSelected(isSel ? null : p.id);
                    setConfirm(false);
                  }
                }}
                className={`h-12 rounded-lg text-sm transition px-2 flex flex-col items-center justify-center ${
                  !ready
                    ? "bg-card/30 text-muted-foreground/40 cursor-not-allowed opacity-50"
                    : isSel
                      ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400"
                      : "bg-card/60 hover:bg-card text-foreground"
                }`}
                title={ready ? "Sélectionner" : "Doit purger un tour complet"}
              >
                <span className="font-medium flex items-center gap-2">
                  <AvatarImg avatar={playerAvatar(p)} size={24} />
                  <Lock className="size-3" aria-hidden /> {p.pseudo}
                </span>
                {!ready && (
                  <span className="text-[9px] uppercase tracking-wider">vient d'arriver</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button
        disabled={!selected || !selectedReady || busy || blocked}
        onClick={() => {
          if (!selected || !selectedReady) return;
          if (!confirm) {
            setConfirm(true);
            return;
          }
          onExecute(selected);
          setSelected(null);
          setConfirm(false);
        }}
        className="mt-3 h-12 w-full rounded-lg bg-rose-600 text-white font-semibold disabled:opacity-40"
      >
        {busy ? (
          "…"
        ) : confirm ? (
          <span className="inline-flex items-center gap-1.5">
            <TriangleAlert className="size-4" aria-hidden /> Confirmer l'exécution
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Axe className="size-4" aria-hidden /> Exécuter
          </span>
        )}
      </button>
    </PanelCard>
  );
}

// ───────── Médecin légiste : journal des autopsies reçues
function LegisteAutopsiesPanel({ gameId, meId }: { gameId: string; meId: string }) {
  const [items, setItems] = useState<Array<{ body: string; created_at: string }>>([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("body,created_at")
        .eq("game_id", gameId)
        .eq("player_id", meId)
        .eq("type", "autopsy")
        .order("created_at", { ascending: false })
        .limit(10);
      setItems((data ?? []) as Array<{ body: string; created_at: string }>);
    }
    void load();
    const ch = supabase
      .channel(`legiste-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `player_id=eq.${meId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [gameId, meId]);
  return (
    <PanelCard tone="rose" icon={Stethoscope} label="Autopsies récentes">
      {items.length === 0 && (
        <div className="mt-1 text-muted-foreground italic">Aucune autopsie réalisée.</div>
      )}
      {items.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {items.map((it, i) => (
            <li key={i} className="text-foreground/80">
              • {it.body}
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

function ParanoiaquePanel({
  targetId,
  targetPseudoFallback,
  players,
  used,
  busy,
  blocked,
  onAct,
}: {
  targetId: string | null;
  targetPseudoFallback: string | null;
  players: { id: string; pseudo: string; is_alive: boolean }[];
  used: boolean;
  busy: boolean;
  blocked: boolean;
  onAct: (choice: "protect" | "kill") => void;
}) {
  const [choice, setChoice] = useState<"protect" | "kill" | null>(null);
  const tgt = targetId ? players.find((p) => p.id === targetId) : null;
  const pseudo = tgt?.pseudo ?? targetPseudoFallback ?? "?";
  const targetDead = tgt ? !tgt.is_alive : false;

  if (used) {
    return (
      <PanelCard tone="neutral" icon={Target} label="Paranoïaque">
        <div className="text-muted-foreground">
          Capacité utilisée. Cible : <span className="font-semibold text-foreground">{pseudo}</span>
          .
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      tone="amber"
      icon={Target}
      label="Ta cible"
      action={<span className="text-sm font-bold text-foreground">{pseudo}</span>}
    >
      <div className="text-[11px] text-muted-foreground mb-3">
        À toi de deviner sa faction. 1× dans la partie : protège-la ou tue-la (résolu à
        l'Annonce).
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy || blocked || targetDead}
          onClick={() => setChoice("protect")}
          className={`h-12 rounded-lg text-sm font-semibold transition ${
            choice === "protect"
              ? "bg-sky-500/30 text-sky-100 ring-1 ring-sky-400"
              : "bg-card/60 hover:bg-card text-foreground"
          } disabled:opacity-40 inline-flex items-center justify-center gap-1.5`}
        >
          <Shield className="size-4" aria-hidden /> Protéger
        </button>
        <button
          disabled={busy || blocked || targetDead}
          onClick={() => setChoice("kill")}
          className={`h-12 rounded-lg text-sm font-semibold transition ${
            choice === "kill"
              ? "bg-rose-500/30 text-rose-100 ring-1 ring-rose-400"
              : "bg-card/60 hover:bg-card text-foreground"
          } disabled:opacity-40 inline-flex items-center justify-center gap-1.5`}
        >
          <Swords className="size-4" aria-hidden /> Tuer
        </button>
      </div>
      {targetDead && (
        <div className="mt-2 text-xs text-rose-300">
          Ta cible est morte — capacité inutilisable.
        </div>
      )}
      <button
        disabled={!choice || busy || blocked || targetDead}
        onClick={() => choice && onAct(choice)}
        className="mt-3 h-11 w-full rounded-lg bg-gold text-primary-foreground font-semibold disabled:opacity-40"
      >
        {busy ? "…" : "Valider"}
      </button>
    </PanelCard>
  );
}
