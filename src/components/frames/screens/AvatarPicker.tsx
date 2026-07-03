// O4 — Sélecteur d'avatar. Un cadre cliquable affiche l'avatar choisi (polaroid)
// ou un [+] vide. Au clic, ouvre un Dialog : onglets par catégorie
// (Tous / Femmes / Hommes / Autres) + grille de polaroids (libres / pris /
// sélectionné). La liste est pilotée par le bucket Storage (cf. useAvatars).
import { useEffect, useMemo, useState } from "react";
import { useAvatars, refreshAvatars, AVATAR_CATEGORIES, type AvatarCategory } from "@/lib/avatars";
import { AvatarPolaroid } from "@/components/AvatarPolaroid";
import { Check, Lock, Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Pickable = { role_meta: Record<string, unknown> | null };

type Tab = "all" | AvatarCategory;
const TAB_LABELS: Record<Tab, string> = {
  all: "Tous",
  femmes: "Femmes",
  hommes: "Hommes",
  autres: "Autres",
};

export function AvatarPicker({
  players,
  currentId,
  onPick,
}: {
  players: Pickable[];
  currentId?: string;
  onPick: (id: string) => void;
}) {
  const avatars = useAvatars();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  // Recharge le bucket à l'ouverture : un avatar fraîchement uploadé apparaît.
  useEffect(() => {
    if (open) refreshAvatars();
  }, [open]);

  const taken = new Set(
    players
      .map((p) => (p.role_meta as Record<string, unknown>)?.avatar as string | undefined)
      .filter((a): a is string => !!a && a !== currentId),
  );
  const available = avatars.length - taken.size;
  const current = currentId ? avatars.find((a) => a.id === currentId) : undefined;

  // Onglets visibles = catégories réellement présentes dans le bucket.
  const presentCats = useMemo(
    () => AVATAR_CATEGORIES.filter((c) => avatars.some((a) => a.category === c)),
    [avatars],
  );
  const tabs: Tab[] = ["all", ...presentCats];
  const shown = tab === "all" ? avatars : avatars.filter((a) => a.category === tab);

  return (
    <div className="flex items-stretch gap-4">
      {/* Cadre cliquable : polaroid de l'avatar courant ou [+] */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative shrink-0 transition-all duration-200 touch-manipulation active:scale-95 hover:-translate-y-0.5"
        aria-label={current ? `Changer d'avatar (actuel ${current.name})` : "Choisir un avatar"}
      >
        {current ? (
          <div className="relative">
            <AvatarPolaroid avatar={current} size={96} selected caption={false} />
            <div className="absolute inset-0 grid place-items-center rounded-[3px] bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
                Changer
              </span>
            </div>
          </div>
        ) : (
          <div className="w-24 h-28 rounded-2xl border border-dashed border-border/70 bg-card/40 grid place-items-center text-muted-foreground group-hover:border-gold/60 group-hover:bg-card/70 group-hover:text-gold transition-colors">
            <Plus className="size-9" strokeWidth={1.5} />
          </div>
        )}
      </button>

      {/* Bloc texte à droite */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-1">
          {current ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Avatar sélectionné
              </div>
              <div className="text-[11px] text-muted-foreground/80 leading-snug">
                <Sparkles className="inline size-3 text-gold mr-1" />
                Une apparence pour le manoir.
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Avatar
              </div>
              <div className="text-base font-semibold text-foreground">Choisis ton avatar</div>
              <div className="text-[11px] text-muted-foreground/80 leading-snug">
                Une apparence pour le manoir.
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start text-[11px] text-gold hover:underline underline-offset-2 font-medium tabular-nums"
        >
          {available} / {avatars.length} libres · {current ? "Changer" : "Parcourir"}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-gold/30 bg-background/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-gold" />
              Choisis ton avatar
            </DialogTitle>
            <DialogDescription className="text-xs flex items-center gap-2">
              <span className="tabular-nums text-gold">{available}</span>
              <span className="text-muted-foreground">sur {avatars.length} disponibles</span>
            </DialogDescription>
          </DialogHeader>

          {/* Onglets catégories */}
          {tabs.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.12em] border transition-colors ${
                    tab === t
                      ? "border-gold/70 bg-gold/15 text-gold"
                      : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:border-gold/40"
                  }`}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          )}

          <div
            className="max-h-[58vh] overflow-y-auto overscroll-contain rounded-xl border border-border/50 bg-card/30 p-2.5"
            style={{ scrollbarWidth: "thin" }}
          >
            {shown.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Aucun avatar dans cette catégorie.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {shown.map((a) => {
                  const isTaken = taken.has(a.id);
                  const isMine = a.id === currentId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        if (isTaken && !isMine) return;
                        onPick(a.id);
                        setOpen(false);
                      }}
                      disabled={isTaken && !isMine}
                      title={a.name}
                      aria-label={a.name}
                      aria-pressed={isMine}
                      className={`group relative transition-all duration-150 active:scale-95 ${
                        isTaken && !isMine ? "cursor-not-allowed" : "hover:-translate-y-0.5"
                      }`}
                    >
                      <AvatarPolaroid
                        avatar={a}
                        size={100}
                        selected={isMine}
                        disabled={isTaken && !isMine}
                        className="w-full"
                      />
                      {isMine && (
                        <span className="absolute top-1 right-1 size-4 rounded-full bg-gold text-primary-foreground grid place-items-center z-10">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      )}
                      {isTaken && !isMine && (
                        <span className="absolute top-1 right-1 size-4 rounded-full bg-background/80 text-muted-foreground grid place-items-center z-10">
                          <Lock className="size-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-gold" /> Toi
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted" /> Pris
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-card border border-border" /> Libre
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
