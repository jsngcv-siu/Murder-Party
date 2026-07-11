import { useEffect, useMemo, useState } from "react";
import type { FrameContext } from "../registry";
import {
  readInventory,
  itemIsUsable,
  itemNeedsTarget,
  consumeItem,
  itemFaction,
  type Item,
  type ItemOrigin,
} from "@/engine/items";
import { factionToken, factionTag, factionLabel, itemBorderStyle } from "@/lib/factionText";
import { ItemIcon } from "@/components/ItemIcon";
import { supabase } from "@/integrations/supabase/client";
import { CapabilityCard, type ActionRow } from "./PA2Capability";
import type { RoleRow } from "@/engine/actions";
import type { PlayerRow } from "@/lib/game";

import { toast } from "sonner";
import { Backpack, Ban, Shield } from "lucide-react";

export function PA4Notebook({ gameId, me, myRole, game, players, roles }: FrameContext) {
  const [openItem, setOpenItem] = useState<Item | null>(null);
  const [useItemMode, setUseItemMode] = useState<Item | null>(null);
  const [pickedTargetId, setPickedTargetId] = useState<string | null>(null);
  const [letterText, setLetterText] = useState("");
  const [useBusy, setUseBusy] = useState(false);

  const inventory = useMemo<Item[]>(
    () => readInventory(me.role_meta as Record<string, unknown> | null),
    [me.role_meta],
  );

  // Objets verrouillés UNIQUEMENT par un statut bloquant (chantage / blocage / ivresse).
  // Les restrictions normales de capacité (phase, cooldown, épuisée) ne bloquent pas les objets.
  const meMeta = (me.role_meta ?? {}) as Record<string, unknown>;
  const tour = game.current_tour;
  const blockedReason: string | null =
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

  // Note : la notif volante "nouvel objet" est désormais pilotée par PlayerShell
  // (pour se déclencher depuis n'importe quel onglet). Ici on n'affiche que le
  // résultat d'utilisation d'un objet (toast plus bas).

  // Regroupement « dossier » : ce qui appelle une action (À utiliser) en tête,
  // puis les pièces à consulter, puis les objets déjà utilisés (Classés).
  const usable = inventory.filter((it) => !it.consumed && itemIsUsable(it.slug, it.payload));
  const consultable = inventory.filter((it) => !it.consumed && !itemIsUsable(it.slug, it.payload));
  const classes = inventory.filter((it) => it.consumed);

  return (
    <div className="cork-surface h-full flex flex-col p-5 overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Backpack className="size-3.5" aria-hidden /> Inventaire
        </div>
        <div
          className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Affaire · Tour {game.current_tour}
        </div>
      </div>
      <p className="mt-2.5 text-[10px] text-muted-foreground italic">
        Objets reçus durant la partie. Touche une pièce pour l'examiner et l'utiliser.
      </p>
      {inventory.length > 0 && (
        <div className="mt-2.5 rounded-xl border border-panel-border/70 bg-panel/40 px-3 py-2">
          <div
            className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Clé des sceaux
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
            {(
              [
                ["Civil", "Civil"],
                ["Méchant", "Méchant"],
                ["Neutre", "Neutre"],
                ["Système", "Le Manoir"],
                [null, "Origine inconnue"],
              ] as const
            ).map(([key, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Seal faction={key} size={16} /> {label}
              </span>
            ))}
          </div>
        </div>
      )}
      {blockedReason && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-3 py-2 text-sm text-rose-200/90">
          <Ban className="size-4 shrink-0 text-rose-300/80" aria-hidden /> {blockedReason} — tes
          objets sont aussi verrouillés ce tour.
        </div>
      )}
      {inventory.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <span className="sticky-note text-sm">Aucune pièce au dossier</span>
          <p className="text-xs text-muted-foreground italic">
            Les objets reçus durant la partie apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="mt-1">
          {usable.length > 0 && (
            <>
              <SectionHead label="À utiliser" count={usable.length} />
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {usable.map((it) => (
                  <ItemCard key={it.id} it={it} onOpen={setOpenItem} />
                ))}
              </div>
            </>
          )}
          {consultable.length > 0 && (
            <>
              <SectionHead label="Consultable" count={consultable.length} />
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {consultable.map((it) => (
                  <ItemCard key={it.id} it={it} onOpen={setOpenItem} />
                ))}
              </div>
            </>
          )}
          {classes.length > 0 && (
            <>
              <SectionHead label="Classés" count={classes.length} />
              <div className="mt-2 grid grid-cols-3 gap-2.5">
                {classes.map((it) => (
                  <ItemCard key={it.id} it={it} onOpen={setOpenItem} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ItemLog
        gameId={gameId}
        meId={me.id}
        players={players as unknown as PlayerRow[]}
        roles={roles}
      />

      {/* Modale détail : description + bouton Utiliser */}
      {openItem && !useItemMode && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={() => setOpenItem(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <span
                className="mb-2 size-20 grid place-items-center overflow-hidden rounded-full text-5xl"
                style={{
                  boxShadow: `0 0 0 2px color-mix(in oklab, ${factionToken(itemFaction(openItem))} 55%, transparent)`,
                  background: `color-mix(in oklab, ${factionToken(itemFaction(openItem))} 10%, transparent)`,
                }}
              >
                <ItemIcon item={openItem} size={80} rounded="full" emojiFontSize={48} />
              </span>
              <h3 className="text-lg font-semibold">{openItem.name}</h3>
              <span
                className="mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] uppercase font-semibold border"
                style={{
                  color: factionToken(itemFaction(openItem)),
                  borderColor: `color-mix(in oklab, ${factionToken(itemFaction(openItem))} 40%, transparent)`,
                  backgroundColor: `color-mix(in oklab, ${factionToken(itemFaction(openItem))} 12%, transparent)`,
                }}
              >
                {factionLabel(itemFaction(openItem))}
              </span>
              {openItem.received_from && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reçu de : {openItem.received_from}
                </p>
              )}
            </div>
            {isFragmentItem(openItem) ? (
              <div className="mt-4">
                <FragmentPaper
                  text={fragmentHalfText(openItem.description)}
                  half={(openItem.payload?.half as "A" | "B" | null | undefined) ?? null}
                />
                <p className="mt-3 px-2 text-center text-[11px] italic leading-snug text-muted-foreground">
                  ✂️ Ce n'est qu'une{" "}
                  <span className="text-foreground/80 not-italic font-medium">moitié</span> de
                  message. Un autre invité détient l'autre morceau — retrouvez-vous pour le
                  reconstituer.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-foreground/90">{openItem.description}</p>
            )}
            {openItem.payload &&
              Object.keys(openItem.payload).length > 0 &&
              openItem.slug === "lettre" && (
                <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs italic">
                  « {String(openItem.payload.message ?? "")} »
                </div>
              )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpenItem(null)}
                className="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium"
              >
                Fermer
              </button>
              {!openItem.consumed && itemIsUsable(openItem.slug, openItem.payload) && (
                <button
                  disabled={!!blockedReason}
                  onClick={() => {
                    if (blockedReason) return;
                    setUseItemMode(openItem);
                    setPickedTargetId(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  title={blockedReason ?? undefined}
                >
                  {blockedReason ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Ban className="size-4" aria-hidden /> Bloqué
                    </span>
                  ) : (
                    "Utiliser"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale d'utilisation : sélection cible + confirmation */}
      {useItemMode && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={() => {
            if (!useBusy) {
              setUseItemMode(null);
              setOpenItem(null);
            }
          }}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <ItemIcon item={useItemMode} size={40} rounded="lg" emojiFontSize={30} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Utiliser
                </div>
                <div className="font-semibold">{useItemMode.name}</div>
              </div>
            </div>
            {useItemMode.slug === "lettre" && (
              <div className="mt-4">
                <div className="text-xs uppercase text-muted-foreground mb-1">
                  Ton message anonyme
                </div>
                <textarea
                  value={letterText}
                  onChange={(e) => setLetterText(e.target.value.slice(0, 80))}
                  maxLength={80}
                  rows={3}
                  placeholder="Écris ta lettre (80 caractères max)…"
                  className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold"
                />
                <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                  {letterText.length}/80
                </div>
              </div>
            )}
            {itemNeedsTarget(useItemMode.slug, useItemMode.payload) === "single" ? (
              <>
                <div className="mt-4 text-xs uppercase text-muted-foreground">
                  {useItemMode.slug === "lettre" ? "Envoyer à" : "Choisis une cible"}
                </div>
                {/* Objets de protection : raccourci "Sur moi" */}
                {useItemMode.slug === "fiole_vie" && (
                  <button
                    onClick={() => setPickedTargetId(me.id)}
                    className={`mt-2 w-full h-11 rounded-lg text-sm font-semibold transition ${
                      pickedTargetId === me.id
                        ? "bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/20"
                    } inline-flex items-center justify-center gap-1.5`}
                  >
                    <Shield className="size-4" aria-hidden /> Sur moi
                  </button>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 overflow-y-auto min-h-0">
                  {players
                    .filter((p) => !p.is_mj && p.is_alive && !p.is_imprisoned && p.id !== me.id)
                    .map((p) => {
                      const sel = pickedTargetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPickedTargetId(p.id)}
                          className={`h-11 rounded-lg text-sm transition ${sel ? "bg-primary/20 text-primary ring-1 ring-primary" : "bg-muted/40 hover:bg-muted"}`}
                        >
                          {p.pseudo}
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Aucune cible requise.</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  if (!useBusy) {
                    setUseItemMode(null);
                    setLetterText("");
                  }
                }}
                disabled={useBusy}
                className="flex-1 py-2.5 rounded-lg bg-muted text-sm font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                disabled={
                  useBusy ||
                  !!blockedReason ||
                  (itemNeedsTarget(useItemMode.slug, useItemMode.payload) === "single" &&
                    !pickedTargetId) ||
                  (useItemMode.slug === "lettre" && letterText.trim().length === 0)
                }
                onClick={async () => {
                  if (useBusy) return;
                  if (blockedReason) {
                    toast("Bloqué", { description: blockedReason });
                    return;
                  }
                  setUseBusy(true);
                  const target = pickedTargetId
                    ? (players.find((p) => p.id === pickedTargetId) ?? null)
                    : null;
                  const rolesForUse = new Map<
                    string,
                    { slug: string; name_fr: string; icon: string; faction: string }
                  >();
                  roles.forEach((r, k) =>
                    rolesForUse.set(k, {
                      slug: r.slug,
                      name_fr: r.name_fr,
                      icon: r.icon,
                      faction: r.faction as string,
                    }),
                  );
                  const itemToUse: Item =
                    useItemMode.slug === "lettre"
                      ? {
                          ...useItemMode,
                          payload: {
                            ...(useItemMode.payload ?? {}),
                            message: letterText.trim().slice(0, 80),
                          },
                        }
                      : useItemMode;
                  const r = await consumeItem({
                    gameId,
                    actorId: me.id,
                    actorPseudo: me.pseudo,
                    item: itemToUse,
                    target,
                    tour: game.current_tour,
                    rolesBySlug: rolesForUse,
                  });
                  toast(r.ok ? `${useItemMode.icon} ${useItemMode.name}` : "Erreur", {
                    description: r.message,
                    duration: 4500,
                  });
                  setUseBusy(false);
                  setUseItemMode(null);
                  setOpenItem(null);
                  setPickedTargetId(null);
                  setLetterText("");
                }}
                className="flex-1 py-2.5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold disabled:opacity-40"
              >
                {useBusy ? "…" : useItemMode.slug === "lettre" ? "Envoyer" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Indice fragmenté ────────────────────────────────────────────────────
// Un indice « Lettre déchirée » : une info coupée en 2 moitiés illisibles
// seules, portées par 2 joueurs ≠ la cible. On le présente comme un vrai bout
// de papier déchiré (cadre difforme, bord arraché du côté de la coupure) avec
// la moitié de texte dessus, et une note sous le cadre rappelant que l'autre
// morceau est détenu par un autre invité.

function Seal({ faction, size = 18 }: { faction: ItemOrigin | null; size?: number }) {
  const color = factionToken(faction);
  return (
    <span
      aria-label={"Provenance : " + factionLabel(faction)}
      className="inline-grid shrink-0 place-items-center rounded-sm border text-[9px] font-bold leading-none"
      style={{
        width: size,
        height: size,
        color,
        borderColor: color,
        backgroundColor: "var(--panel)",
      }}
    >
      {factionTag(faction)}
    </span>
  );
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <span
        className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
      <span className="inline-grid min-w-5 place-items-center rounded-full border border-panel-border/80 bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {count}
      </span>
      <span className="h-px flex-1 bg-panel-border/60" aria-hidden />
    </div>
  );
}

function ItemCard({ it, onOpen }: { it: Item; onOpen: (item: Item) => void }) {
  const faction = itemFaction(it);
  const isConsumed = !!it.consumed;
  const cardClass =
    "press relative flex aspect-square min-h-24 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border p-2 text-center transition focus-visible:outline-none disabled:cursor-not-allowed " +
    (isConsumed ? "border-border bg-card/30 opacity-40" : "elevate hover:-translate-y-0.5");
  return (
    <button
      type="button"
      onClick={() => onOpen(it)}
      disabled={isConsumed}
      className={cardClass}
      style={itemBorderStyle(it, { consumed: isConsumed })}
    >
      {!isConsumed && <Seal faction={faction} size={18} />}
      <ItemIcon item={it} size={44} rounded="lg" emojiFontSize={30} className="leading-none" />
      <span className="line-clamp-2 text-[10px] font-medium leading-tight text-foreground">
        {it.name}
      </span>
      {isConsumed && (
        <span className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">Classé</span>
      )}
    </button>
  );
}

function isFragmentItem(it: Item): boolean {
  return it.slug === "indice" && !!(it.payload as Record<string, unknown> | undefined)?.fragment;
}

/** Retire une éventuelle note « ✂️ … » collée au texte (anciennes parties). */
function fragmentHalfText(description: string): string {
  const idx = description.indexOf("✂️");
  return (idx >= 0 ? description.slice(0, idx) : description).trim();
}

function FragmentPaper({ text, half }: { text: string; half: "A" | "B" | null | undefined }) {
  // La déchirure est du côté où le morceau se raccorde à l'autre moitié :
  // moitié A → bord arraché à DROITE, moitié B → à GAUCHE.
  const tornRight = half !== "B";
  const clip = tornRight
    ? "polygon(0% 0%, 88% 0%, 94% 6%, 85% 12%, 93% 19%, 86% 26%, 94% 33%, 85% 40%, 93% 47%, 86% 54%, 94% 61%, 85% 68%, 93% 75%, 86% 82%, 94% 89%, 87% 95%, 92% 100%, 0% 100%)"
    : "polygon(12% 0%, 100% 0%, 100% 100%, 8% 100%, 13% 95%, 6% 89%, 15% 82%, 7% 75%, 14% 68%, 6% 61%, 15% 54%, 7% 47%, 14% 40%, 6% 33%, 15% 26%, 7% 19%, 14% 12%, 6% 6%)";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        filter: "drop-shadow(0 12px 16px rgba(0,0,0,.5))",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "86%",
          minHeight: 118,
          padding: tornRight ? "20px 40px 26px 22px" : "20px 22px 26px 40px",
          background: "linear-gradient(155deg,#f8efd6 0%,#efe1bd 55%,#e4d2a8 100%)",
          clipPath: clip,
          transform: "rotate(-1.6deg)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 8,
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "#a9874e",
          }}
        >
          Moitié {half ?? "?"}
        </span>
        <p
          style={{
            fontFamily: "Caveat, cursive",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1.25,
            color: "#2b1d14",
            margin: "6px 0 0",
            wordBreak: "break-word",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

// Résultat + historique des OBJETS utilisés (miroir de l'onglet Capacité, pour
// l'inventaire). Réutilise CapabilityCard (kind="item").
function ItemLog({
  gameId,
  meId,
  players,
  roles,
}: {
  gameId: string;
  meId: string;
  players: PlayerRow[];
  roles: Map<string, RoleRow>;
}) {
  const [actions, setActions] = useState<ActionRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("role_actions")
        .select("id,tour,phase,payload,result,created_at,target_player_id,target_player_id_2")
        .eq("game_id", gameId)
        .eq("actor_player_id", meId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      setActions(
        ((data ?? []) as ActionRow[]).filter(
          (a) => !!(a.payload as Record<string, unknown> | null)?.item,
        ),
      );
    }
    void load();
    const ch = supabase
      .channel(`item-log-${meId}`)
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

  if (actions.length === 0) return null;
  const latest = actions[0];
  const rest = actions.slice(1);
  return (
    <div className="mt-6">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        Dernier objet utilisé
      </div>
      <CapabilityCard
        kind="item"
        highlight
        tour={latest.tour}
        phase={latest.phase}
        created_at={latest.created_at}
        payload={latest.payload}
        result={latest.result}
        target_player_id={latest.target_player_id}
        target_player_id_2={latest.target_player_id_2}
        players={players}
        roles={roles}
      />
      {rest.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-5 mb-2">
            Historique des objets
          </div>
          <ul className="space-y-2">
            {rest.map((a) => (
              <li key={a.id}>
                <CapabilityCard
                  kind="item"
                  tour={a.tour}
                  phase={a.phase}
                  created_at={a.created_at}
                  payload={a.payload}
                  result={a.result}
                  target_player_id={a.target_player_id}
                  target_player_id_2={a.target_player_id_2}
                  players={players}
                  roles={roles}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
