// P1 — Écran de garde : état neutre par défaut (DA « tableau d'enquête »).
// Avatar carré + pseudo + statuts + phase. AUCUN rôle affiché ici (principe §1.1).
import type { FrameContext } from "../registry";
import { avatarOf, phaseLabel } from "@/lib/avatars";
import { AvatarImg } from "@/components/AvatarImg";
import { FlaskConical, ShieldCheck, Wine, type LucideIcon } from "lucide-react";

export function P1Garde({ me, game, players }: FrameContext) {
  const meta = (me.role_meta ?? {}) as Record<string, unknown>;
  const avatar = avatarOf(meta.avatar as string | undefined, me.id);
  const aliveCount = players.filter((p) => p.is_alive && !p.is_mj).length;
  const phase = phaseLabel(game.current_phase, game.current_tour);

  const statuses: { Icon: LucideIcon; label: string; tone: string }[] = [];
  if (meta.poisoned)
    statuses.push({ Icon: FlaskConical, label: "Empoisonné", tone: "text-destructive" });
  if (meta.drunk) statuses.push({ Icon: Wine, label: "Ivre", tone: "text-amber-400" });
  if (meta.protected_until_cycle && (meta.protected_until_cycle as number) >= game.current_tour)
    statuses.push({ Icon: ShieldCheck, label: "Protégé", tone: "text-[oklch(0.72_0.13_230)]" });

  return (
    <div className="h-full flex flex-col bg-background p-6">
      {/* Repère de phase « dossier » */}
      <div
        className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span>{phase}</span>
        <span>{aliveCount} vivants</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Avatar = photo carrée (franc), cerclée d'or détective. */}
        <div
          className="size-32 overflow-hidden bg-card flex items-center justify-center"
          style={{
            boxShadow: "0 0 0 2px oklch(0.80 0.15 78 / 0.45), 0 12px 32px -8px oklch(0 0 0 / 0.7)",
          }}
        >
          <AvatarImg avatar={avatar} size={128} rounded="none" />
        </div>

        <h1
          className="mt-4 text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "oklch(0.85 0.15 82)" }}
        >
          {me.pseudo}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{avatar.label}</p>

        {statuses.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {statuses.map((s) => {
              const Icon = s.Icon;
              return (
                <span
                  key={s.label}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-border ${s.tone}`}
                >
                  <Icon className="size-3" aria-hidden /> {s.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground italic">
        Yeux en haut. Le jeu se joue à la table.
      </p>
    </div>
  );
}
