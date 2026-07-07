// Sélecteur de rôles à bannir du pool, affiché au MJ dans le lobby.
// Persiste dans games.banned_roles (text[]). Tueur et Détective non bannissables.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameRow } from "@/lib/game";
import type { RoleRow } from "@/engine/actions";
import { Ban, Check, ChevronDown } from "lucide-react";
import { RoleIcon } from "@/components/RoleIcon";

const PROTECTED = new Set(["tueur", "assistant_du_detective", "majordome"]);

export function RolePoolEditor({ game }: { game: GameRow }) {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [open, setOpen] = useState(false);
  const [banned, setBanned] = useState<Set<string>>(new Set(game.banned_roles ?? []));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBanned(new Set(game.banned_roles ?? []));
  }, [game.banned_roles]);

  useEffect(() => {
    void supabase
      .from("roles")
      .select("*")
      .eq("set_id", "set1")
      .eq("emergent", false)
      .eq("is_disabled", false)
      .order("type")
      .order("name_fr")
      .then(({ data }) => setRoles((data ?? []) as RoleRow[]));
  }, []);

  const groups = useMemo(() => {
    const g: Record<string, RoleRow[]> = {};
    for (const r of roles) {
      const k = r.faction || r.type || "Autre";
      (g[k] ||= []).push(r);
    }
    return g;
  }, [roles]);

  async function toggle(slug: string) {
    if (PROTECTED.has(slug)) return;
    const next = new Set(banned);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setBanned(next);
    setBusy(true);
    await supabase
      .from("games")
      .update({ banned_roles: Array.from(next) as never })
      .eq("id", game.id);
    setBusy(false);
  }

  return (
    <div className="rounded-md border border-border bg-card/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wider"
      >
        <span className="flex items-center gap-2">
          <Ban className="size-4 text-destructive" /> Bannir des rôles ({banned.size})
        </span>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto">
          <p className="text-[11px] text-muted-foreground">
            Les rôles bannis ne seront pas tirés. Tueur et Assistant du Détective sont obligatoires.
          </p>
          {Object.entries(groups).map(([faction, list]) => (
            <div key={faction}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {faction}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {list.map((r) => {
                  const isBan = banned.has(r.slug);
                  const locked = PROTECTED.has(r.slug);
                  return (
                    <button
                      key={r.slug}
                      onClick={() => toggle(r.slug)}
                      disabled={locked || busy}
                      className={`text-left text-xs px-2 py-1.5 rounded border transition flex items-center gap-1.5 ${
                        locked
                          ? "opacity-40 border-border bg-card"
                          : isBan
                            ? "border-destructive/60 bg-destructive/10 text-destructive line-through"
                            : "border-border bg-card hover:bg-card/80"
                      }`}
                      title={
                        locked
                          ? "Rôle obligatoire"
                          : isBan
                            ? "Bannis — clique pour réactiver"
                            : "Clique pour bannir"
                      }
                    >
                      {isBan ? (
                        <Ban className="size-3 shrink-0" />
                      ) : (
                        <Check className="size-3 shrink-0 opacity-50" />
                      )}
                      <RoleIcon role={r} size={16} />
                      <span className="truncate">{r.name_fr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
