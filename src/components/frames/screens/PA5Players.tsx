// PA5 — Annuaire des joueurs (DA The Board) : liste verticale, photos carrées
// (rounded-none), badge d'état façon dossier (En vie / Prison / Mort). Révèle
// ton propre rôle (or) et la faction des défunts, comme avant.
import type { FrameContext } from "../registry";
import { RoleIcon } from "@/components/RoleIcon";
import { avatarOf } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { Lock, Skull, Users } from "lucide-react";

// Badges d'état calés sur la DA : vert vif (en vie), ambre (prison),
// vert spectral (mort) — cohérent avec le cimetière.
const STATE_STYLE = {
  alive: { text: "#5fae7a", border: "rgba(95,174,138,.4)", bg: "rgba(95,174,138,.1)" },
  prison: { text: "#e0a040", border: "rgba(224,160,64,.4)", bg: "rgba(224,160,64,.1)" },
  dead: { text: "#5f9e82", border: "rgba(95,158,130,.3)", bg: "rgba(95,158,130,.1)" },
} as const;

export function PA5Players({ players, me, roles }: FrameContext) {
  const others = players.filter((p) => !p.is_mj);
  const aliveCount = others.filter((p) => p.is_alive).length;

  const factionTone = (faction: string | undefined) => {
    if (faction === "Civil") return "var(--citoyens)";
    if (faction === "Méchant") return "var(--mechants)";
    if (faction === "Neutre") return "var(--neutres)";
    return "var(--muted-foreground)";
  };

  return (
    <div className="h-full flex flex-col bg-background p-5 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="font-display text-base tracking-wide flex items-center gap-2 text-foreground">
          <Users className="size-4 text-primary" aria-hidden /> Joueurs
        </div>
        <span className="font-display text-[11px] text-muted-foreground tabular-nums">
          {others.length} · {aliveCount} en vie
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 stagger">
        {others.map((p) => {
          const role = p.role_slug ? roles.get(p.role_slug) : null;
          const meta = (p.role_meta ?? {}) as Record<string, unknown>;
          const cleaned = meta.cleaned === true;
          const isMe = p.id === me.id;
          const av = avatarOf(meta.avatar as string | undefined, p.id);

          const state = !p.is_alive ? "dead" : p.is_imprisoned ? "prison" : "alive";
          const badge = STATE_STYLE[state];
          const badgeLabel = state === "dead" ? "Mort" : state === "prison" ? "Prison" : "En vie";

          // Sous-ligne de révélation : mon rôle (or) ou la faction d'un défunt.
          let reveal: React.ReactNode = null;
          if (isMe && role) {
            reveal = (
              <span className="text-gold inline-flex items-center gap-1 text-[10px]">
                <RoleIcon role={role} size={13} /> {role.name_fr}
              </span>
            );
          } else if (!p.is_alive && role) {
            reveal = cleaned ? (
              <span className="italic text-muted-foreground text-[10px]">Identité effacée</span>
            ) : (
              <span
                className="text-[10px] font-medium"
                style={{ color: factionTone(role.faction) }}
              >
                {role.faction}
              </span>
            );
          }

          return (
            <div
              key={p.id}
              className="relative flex items-center gap-3 rounded-[10px] border border-border bg-white/[0.04] px-2.5 py-2 transition active:scale-[0.99]"
            >
              <div className={`relative shrink-0 ${!p.is_alive ? "grayscale opacity-75" : ""}`}>
                <AvatarImg avatar={av} size={36} rounded="none" className="size-9 object-cover" />
                {!p.is_alive && (
                  <span className="absolute -bottom-1 -right-1 size-4 grid place-items-center bg-[#0c0b0e] text-[#5f9e82] ring-1 ring-[#0c0b0e]">
                    <Skull className="size-2.5" aria-hidden />
                  </span>
                )}
                {p.is_imprisoned && p.is_alive && (
                  <span className="absolute -bottom-1 -right-1 size-4 grid place-items-center bg-[#0c0b0e] text-[#e0a040] ring-1 ring-[#0c0b0e]">
                    <Lock className="size-2.5" aria-hidden />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold text-sm leading-tight truncate ${!p.is_alive ? "line-through opacity-70" : ""}`}
                >
                  {p.pseudo}
                  {isMe && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary align-middle">
                      toi
                    </span>
                  )}
                </div>
                {reveal && <div className="mt-0.5">{reveal}</div>}
              </div>

              <span
                className="shrink-0 font-display text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-[5px] border"
                style={{ color: badge.text, borderColor: badge.border, backgroundColor: badge.bg }}
              >
                {badgeLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
