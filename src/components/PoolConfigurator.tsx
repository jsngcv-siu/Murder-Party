// Configurateur de rôles ouvert depuis le lobby par le lead/host.
// Deux onglets :
//  • Pool   : cible de joueurs + slots faction/type, rôle exact ou Auto.
//  • Bannis : grille visuelle de tous les rôles, bascule banni/autorisé.
// Les rôles bannis sont retirés des candidats du pool en direct.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type GameRow, MIN_PLAYERS, MAX_PLAYERS } from "@/lib/game";
import type { RoleRow } from "@/engine/actions";
import {
  asPoolConfig,
  buildDefaultPool,
  expandSlotTypes,
  type PoolConfig,
  type PoolSlot,
} from "@/lib/poolConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  Lock,
  RefreshCw,
  Dices,
  Shield,
  Swords,
  VenetianMask,
  Ban,
  Check,
  type LucideIcon,
} from "lucide-react";
import { RoleIcon } from "@/components/RoleIcon";
import { roleTypeMeta, FACTION_TOKEN } from "@/lib/roleTypeMeta";
import { toast } from "sonner";

// Rôles obligatoires : non bannissables.
const PROTECTED = new Set(["tueur", "assistant_du_detective", "majordome"]);

const FACTION_COLORS: Record<string, string> = {
  Civil: "border-primary/40 bg-primary/5",
  Méchant: "border-destructive/40 bg-destructive/5",
  Neutre: "border-gold/40 bg-gold/5",
};

const FACTION_LABELS: Record<string, { Icon: LucideIcon; label: string }> = {
  Civil: { Icon: Shield, label: "Civils" },
  Méchant: { Icon: Swords, label: "Méchants" },
  Neutre: { Icon: VenetianMask, label: "Neutres" },
};

// Libellés courts pour les slots à type unique OU uni ("A/B/C"). Sans ça, une
// union comme "INVESTIGATION/TROMPERIE/CONTRÔLE" était coupée par CSS (truncate)
// et devenait illisible ("INVESTIGATION/T…"). On abrège chaque type et on laisse
// le tout passer sur 2 lignes ; le libellé complet reste dispo au survol (title).
const SHORT_TYPE: Record<string, string> = {
  INVESTIGATION: "Enquête",
  TROMPERIE: "Tromperie",
  CONTRÔLE: "Contrôle",
  PROTECTEUR: "Protec.",
  SUPPORT: "Support",
  TUEUR: "Tueur",
  BÉNIN: "Bénin",
  MAL: "Malin",
  CHAOS: "Chaos",
};
function shortSlotType(type: string): string {
  return type
    .split("/")
    .map((t) => SHORT_TYPE[t.trim()] ?? t.trim())
    .join(" / ");
}

export function PoolConfigurator({ game }: { game: GameRow }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [config, setConfig] = useState<PoolConfig>(
    () =>
      asPoolConfig((game as unknown as { pool_config?: unknown }).pool_config) ??
      buildDefaultPool(10),
  );
  const [banned, setBanned] = useState<Set<string>>(new Set(game.banned_roles ?? []));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("roles")
      .select("*")
      .eq("set_id", "set1")
      .eq("emergent", false)
      .eq("is_disabled", false)
      .then(({ data }) => setRoles((data ?? []) as RoleRow[]));
  }, []);

  // Resync if game.pool_config changes externally.
  useEffect(() => {
    const ext = asPoolConfig((game as unknown as { pool_config?: unknown }).pool_config);
    if (ext) setConfig(ext);
  }, [game]);

  useEffect(() => {
    setBanned(new Set(game.banned_roles ?? []));
  }, [game.banned_roles]);

  const roleBySlug = useMemo(() => {
    const m = new Map<string, RoleRow>();
    for (const r of roles) m.set(r.slug, r);
    return m;
  }, [roles]);

  function updateSlot(id: string, patch: Partial<PoolSlot>) {
    setConfig((c) => ({ ...c, slots: c.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }

  function setTarget(n: number) {
    const target = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    // Préserve les slugs choisis là où la nouvelle forme est compatible.
    const fresh = buildDefaultPool(target);
    const oldBySig = new Map<string, string>();
    for (const s of config.slots) {
      if (s.slug && !s.locked) oldBySig.set(`${s.faction}|${s.type}`, s.slug);
    }
    for (const s of fresh.slots) {
      if (!s.locked) {
        const reuse = oldBySig.get(`${s.faction}|${s.type}`);
        if (reuse) {
          s.slug = reuse;
          oldBySig.delete(`${s.faction}|${s.type}`);
        }
      }
    }
    setConfig(fresh);
  }

  function regenerate() {
    setConfig(buildDefaultPool(config.targetPlayers));
  }

  // Bascule un rôle banni / autorisé (persiste immédiatement, indépendant du pool).
  async function toggleBan(slug: string) {
    if (PROTECTED.has(slug)) return;
    const willBan = !banned.has(slug);
    // Garde-fou : refuser un ban qui viderait un slot NON-flexible (dernier rôle d'un
    // type dont un slot AUTO a besoin). Un slot en union qui garde d'autres types
    // disponibles n'est PAS bloqué — il prendra simplement un autre type au tirage.
    if (willBan) {
      const nextBanned = new Set(banned).add(slug);
      const emptied = config.slots.find((s) => {
        if (s.slug) return false; // slot épinglé sur un rôle précis : hors périmètre
        const types = expandSlotTypes(s.type);
        const hasCandidate = roles.some(
          (r) =>
            r.faction === s.faction &&
            types.includes(r.type ?? "") &&
            r.slug !== "chasseur_de_vampire" &&
            r.emergent !== true &&
            r.is_disabled !== true &&
            (r.min_players ?? 6) <= config.targetPlayers &&
            !nextBanned.has(r.slug),
        );
        return !hasCandidate;
      });
      if (emptied) {
        const role = roles.find((r) => r.slug === slug);
        toast.error(
          `Impossible de bannir ${role?.name_fr ?? slug} : ce serait le dernier rôle « ${shortSlotType(
            emptied.type,
          )} » côté ${FACTION_LABELS[emptied.faction]?.label ?? emptied.faction}, un slot obligatoire ne pourrait plus se remplir.`,
        );
        return;
      }
    }
    const next = new Set(banned);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setBanned(next);
    const { error } = await supabase
      .from("games")
      .update({ banned_roles: Array.from(next) as never })
      .eq("id", game.id);
    if (error) {
      toast.error("Impossible de mettre à jour les bannis.");
      setBanned(new Set(game.banned_roles ?? []));
    }
  }

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("games")
      .update({ pool_config: config as never })
      .eq("id", game.id);
    setBusy(false);
    if (error) {
      toast.error("Échec de la sauvegarde : " + error.message);
    } else {
      toast.success("Pool sauvegardé");
      setOpen(false);
    }
  }

  async function clearPool() {
    if (!confirm("Repasser en tirage 100% automatique ?")) return;
    setBusy(true);
    await supabase
      .from("games")
      .update({ pool_config: null as never })
      .eq("id", game.id);
    setBusy(false);
    toast.success("Pool réinitialisé");
    setOpen(false);
  }

  // Groupe les slots par faction pour l'affichage.
  const grouped = useMemo(() => {
    const g: Record<string, PoolSlot[]> = { Civil: [], Méchant: [], Neutre: [] };
    for (const s of config.slots) g[s.faction]?.push(s);
    return g;
  }, [config]);

  // Rôles groupés par faction pour la grille des bannis.
  const rolesByFaction = useMemo(() => {
    const g: Record<string, RoleRow[]> = { Méchant: [], Civil: [], Neutre: [] };
    for (const r of roles) (g[r.faction] ??= []).push(r);
    for (const k of Object.keys(g)) g[k].sort((a, b) => a.name_fr.localeCompare(b.name_fr));
    return g;
  }, [roles]);

  const hasCustom = !!(game as unknown as { pool_config?: unknown }).pool_config;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-between px-4 py-3 rounded-md border border-border bg-card/60 text-sm font-semibold uppercase tracking-wider hover:bg-card/80 transition">
          <span className="flex items-center gap-2">
            <Settings2 className="size-4 text-gold" /> Rôles & pool
          </span>
          <span className="text-[10px] text-muted-foreground normal-case tracking-normal flex items-center gap-1.5">
            <span>{hasCustom ? `✓ ${config.targetPlayers} slots` : "Auto"}</span>
            {banned.size > 0 && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <Ban className="size-3" /> {banned.size}
              </span>
            )}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[85vh] sm:h-[700px] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-gold" /> Rôles & pool
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pool" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 w-full grid grid-cols-2">
            <TabsTrigger value="pool" className="gap-1.5">
              <Settings2 className="size-3.5" /> Pool
            </TabsTrigger>
            <TabsTrigger value="bans" className="gap-1.5">
              <Ban className="size-3.5" /> Bannis{banned.size > 0 ? ` (${banned.size})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* ─────────── Onglet Pool ─────────── */}
          <TabsContent
            value="pool"
            className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-4 data-[state=inactive]:hidden"
          >
            {/* Cible joueurs */}
            <div className="flex items-center gap-3 p-3 rounded-md bg-card/60 border border-border">
              <span className="text-sm font-medium flex-1">Cible de joueurs</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={config.targetPlayers <= MIN_PLAYERS}
                  onClick={() => setTarget(config.targetPlayers - 1)}
                >
                  −
                </Button>
                <span className="font-mono text-lg w-8 text-center">{config.targetPlayers}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={config.targetPlayers >= MAX_PLAYERS}
                  onClick={() => setTarget(config.targetPlayers + 1)}
                >
                  +
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={regenerate}
                title="Régénérer un pool par défaut"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>

            {/* Composition : répartition par faction, codée couleur */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(["Méchant", "Civil", "Neutre"] as const).map((f) => {
                const n = grouped[f]?.length ?? 0;
                if (n === 0) return null;
                const tok = FACTION_TOKEN[f];
                const F = FACTION_LABELS[f];
                return (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      color: tok,
                      borderColor: `color-mix(in oklab, ${tok} 35%, transparent)`,
                      backgroundColor: `color-mix(in oklab, ${tok} 10%, transparent)`,
                    }}
                  >
                    {F && <F.Icon className="size-3.5" aria-hidden />}
                    <span className="uppercase tracking-wider">{F?.label ?? f}</span>
                    <span className="tabular-nums opacity-90">{n}</span>
                  </span>
                );
              })}
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {config.slots.length} rôle{config.slots.length > 1 ? "s" : ""}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Slots verrouillés <Lock className="inline size-3" /> = rôles obligatoires. Pour les
              autres, choisis un rôle précis ou laisse en <em>Auto</em>{" "}
              <Dices className="inline size-3" /> (tirage pondéré dans le pool faction+type).
            </p>

            {/* Slots par faction */}
            {(["Méchant", "Civil", "Neutre"] as const).map((faction) => {
              const list = grouped[faction] ?? [];
              if (list.length === 0) return null;
              return (
                <div
                  key={faction}
                  className={`rounded-md border p-3 space-y-2 ${FACTION_COLORS[faction]}`}
                >
                  <h3 className="text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                    {(() => {
                      const F = FACTION_LABELS[faction];
                      return F ? (
                        <>
                          <F.Icon className="size-3.5" aria-hidden /> {F.label}
                        </>
                      ) : (
                        faction
                      );
                    })()}{" "}
                    <span className="text-muted-foreground">({list.length})</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {list.map((slot) => {
                      // Rôles candidats pour ce slot : même faction+type, non bannis, non émergents.
                      const acceptedTypes = expandSlotTypes(slot.type);
                      const candidates = roles.filter(
                        (r) =>
                          r.faction === faction &&
                          acceptedTypes.includes(r.type) &&
                          !banned.has(r.slug),
                      );
                      const lockedSingle = slot.locked && candidates.length <= 1;
                      const tm = roleTypeMeta(slot.type);
                      const selected = slot.slug ? roleBySlug.get(slot.slug) : null;
                      const tok = FACTION_TOKEN[faction] ?? "var(--muted-foreground)";
                      return (
                        <li key={slot.id} className="flex items-center gap-2">
                          {/* Type, codé couleur + icône */}
                          <span
                            className="inline-flex items-start gap-1 w-24 sm:w-32 shrink-0 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: tm.color }}
                            title={slot.type}
                          >
                            <tm.Icon className="size-3.5 shrink-0 mt-0.5" aria-hidden />
                            <span className="leading-tight break-words min-w-0">
                              {shortSlotType(slot.type)}
                            </span>
                            {slot.locked && <Lock className="size-3 text-gold shrink-0 mt-0.5" />}
                          </span>
                          {/* Aperçu du rôle choisi (ou dé = Auto) */}
                          <span
                            className="size-7 shrink-0 grid place-items-center rounded-full overflow-hidden border"
                            style={{
                              borderColor: `color-mix(in oklab, ${tok} 45%, transparent)`,
                              backgroundColor: `color-mix(in oklab, ${tok} 8%, transparent)`,
                            }}
                            aria-hidden
                          >
                            {selected ? (
                              <RoleIcon
                                role={selected}
                                size={26}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dices className="size-3.5 text-muted-foreground" />
                            )}
                          </span>
                          <select
                            value={slot.slug ?? ""}
                            onChange={(e) => updateSlot(slot.id, { slug: e.target.value || null })}
                            disabled={lockedSingle}
                            className="flex-1 min-w-0 text-xs bg-input/60 border border-border rounded px-2 py-1.5 disabled:opacity-70"
                          >
                            {!slot.locked && (
                              <option value="">
                                Auto ({candidates.length} possible{candidates.length > 1 ? "s" : ""}
                                )
                              </option>
                            )}
                            {candidates.map((r) => (
                              <option key={r.slug} value={r.slug}>
                                {r.icon ?? ""} {r.name_fr}
                              </option>
                            ))}
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Dices className="size-3" /> Les slots en Auto seront tirés au lancement parmi les
              rôles de leur faction+type, pondérés par draw_weight.
            </div>
          </TabsContent>

          {/* ─────────── Onglet Bannis ─────────── */}
          <TabsContent
            value="bans"
            className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-4 data-[state=inactive]:hidden"
          >
            <p className="text-[11px] text-muted-foreground">
              Touche un rôle pour le bannir : il ne sera jamais tiré. Tueur, Majordome et Assistant
              du détective sont obligatoires <Lock className="inline size-3" />.
            </p>
            {(["Méchant", "Civil", "Neutre"] as const).map((faction) => {
              const list = rolesByFaction[faction] ?? [];
              if (list.length === 0) return null;
              const tok = FACTION_TOKEN[faction];
              const F = FACTION_LABELS[faction];
              const bannedHere = list.filter((r) => banned.has(r.slug)).length;
              return (
                <div key={faction} className="space-y-2">
                  <h3
                    className="text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5"
                    style={{ color: tok }}
                  >
                    {F && <F.Icon className="size-3.5" aria-hidden />} {F?.label ?? faction}
                    <span className="text-muted-foreground">
                      ({list.length - bannedHere}/{list.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {list.map((r) => {
                      const isBan = banned.has(r.slug);
                      const locked = PROTECTED.has(r.slug);
                      return (
                        <button
                          key={r.slug}
                          onClick={() => toggleBan(r.slug)}
                          disabled={locked}
                          title={
                            locked
                              ? "Rôle obligatoire"
                              : isBan
                                ? "Banni — touche pour réactiver"
                                : "Touche pour bannir"
                          }
                          className={`group relative flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                            locked
                              ? "opacity-50 cursor-default"
                              : "hover:brightness-110 active:scale-[0.98]"
                          } ${isBan ? "border-destructive/60 bg-destructive/10" : ""}`}
                          style={
                            isBan
                              ? undefined
                              : {
                                  borderColor: `color-mix(in oklab, ${tok} 30%, transparent)`,
                                  backgroundColor: `color-mix(in oklab, ${tok} 7%, transparent)`,
                                }
                          }
                        >
                          <span className="relative shrink-0">
                            <RoleIcon
                              role={r}
                              size={26}
                              className={`rounded-full ${isBan ? "grayscale opacity-60" : ""}`}
                            />
                            {isBan && (
                              <span className="absolute -bottom-1 -right-1 grid place-items-center size-3.5 rounded-full bg-destructive text-white">
                                <Ban className="size-2.5" />
                              </span>
                            )}
                          </span>
                          <span
                            className={`min-w-0 flex-1 text-[11px] font-medium leading-tight truncate ${isBan ? "text-destructive line-through" : "text-foreground"}`}
                          >
                            {r.name_fr}
                          </span>
                          {locked ? (
                            <Lock className="size-3 shrink-0 text-gold" />
                          ) : (
                            !isBan && (
                              <Check className="size-3 shrink-0 opacity-0 group-hover:opacity-50 transition" />
                            )
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 shrink-0 border-t border-border pt-3">
          {hasCustom && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearPool}
              disabled={busy}
              className="text-destructive"
            >
              Réinitialiser le pool
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-gold text-primary-foreground"
          >
            {busy ? "…" : "Sauvegarder le pool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
