// Régie — vue d'ensemble TEMPS RÉEL de la démo. Affiche TOUS les joueurs en même
// temps avec le flux d'événements (notifications) que CHACUN reçoit sur son écran,
// plus le flux MJ omniscient. But : suivre une partie simulée par les bots et
// repérer les bugs « visibles côté joueur » (effet manquant, info fuitée, notif en
// double) sans avoir à incarner chaque joueur l'un après l'autre.
//
// 100% LECTURE SEULE et 100% DÉMO : ce composant n'est importé que par /demo.
// Il ne touche jamais le moteur ni le vrai jeu (aucun import croisé côté /g/$code).
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import type { PlayerRow, RoleRow } from "@/engine/actions";
import { RoleIcon } from "@/components/RoleIcon";
import { X, Radio } from "lucide-react";

type Notif = {
  id: string;
  player_id: string | null;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
};

const PER_CARD_LIMIT = 40;

export function RegieView({
  gameId,
  gameCode,
  players,
  roles,
  onClose,
}: {
  gameId: string;
  gameCode?: string | null;
  players: PlayerRow[];
  roles: Map<string, RoleRow>;
  onClose: () => void;
}) {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  // Chargement initial + abonnement live aux nouvelles notifications.
  useEffect(() => {
    let active = true;
    void supabase
      .from("notifications")
      .select("id, player_id, title, body, type, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(600)
      .then(({ data }) => {
        if (active) setNotifs((data ?? []) as Notif[]);
      });
    const ch = supabase
      .channel(`regie-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `game_id=eq.${gameId}`,
        },
        (p) => {
          const row = p.new as Notif;
          setNotifs((prev) => [row, ...prev].slice(0, 1200));
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [gameId]);

  // Index notif → par destinataire (player_id) ; null = flux MJ/public.
  const byPlayer = useMemo(() => {
    const m = new Map<string, Notif[]>();
    const mj: Notif[] = [];
    for (const n of notifs) {
      if (n.player_id === null) mj.push(n);
      else {
        const arr = m.get(n.player_id);
        if (arr) arr.push(n);
        else m.set(n.player_id, [n]);
      }
    }
    return { m, mj };
  }, [notifs]);

  const realPlayers = useMemo(
    () => players.filter((p) => !p.is_mj).sort((a, b) => a.pseudo.localeCompare(b.pseudo)),
    [players],
  );

  const statusOf = (p: PlayerRow): { label: string; tone: string } => {
    if (!p.is_alive) return { label: "💀 mort", tone: "text-destructive/80" };
    if (p.is_imprisoned) return { label: "🔒 prison", tone: "text-amber-300/90" };
    return { label: "✓ vivant", tone: "text-emerald-300/80" };
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background/97 backdrop-blur-sm flex flex-col">
      {/* Barre de titre */}
      <div className="shrink-0 px-4 h-12 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-gold" />
          <span
            className="text-[10px] uppercase tracking-[0.3em] text-gold font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Régie temps réel
          </span>
          {gameCode && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">
              {gameCode}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            — ce que voit chaque joueur, en direct
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-secondary/40"
          title="Fermer la régie"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Grille : 1 carte par joueur + 1 carte MJ/public */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Carte MJ omnisciente */}
          <FeedCard
            title="🎙️ MJ / public"
            subtitle={`${byPlayer.mj.length} évènements omniscients`}
            accent="oklch(0.78 0.16 75)"
            notifs={byPlayer.mj.slice(0, PER_CARD_LIMIT)}
          />

          {realPlayers.map((p) => {
            const role = p.role_slug ? (roles.get(p.role_slug) ?? null) : null;
            const st = statusOf(p);
            const feed = (byPlayer.m.get(p.id) ?? []).slice(0, PER_CARD_LIMIT);
            return (
              <FeedCard
                key={p.id}
                title={p.pseudo}
                role={role}
                statusLabel={st.label}
                statusTone={st.tone}
                subtitle={role ? role.name_fr : "— pas de rôle —"}
                notifs={feed}
              />
            );
          })}
        </div>
        {notifs.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            En attente d'évènements… lance la partie et laisse les bots jouer.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function FeedCard({
  title,
  subtitle,
  role,
  statusLabel,
  statusTone,
  accent,
  notifs,
}: {
  title: string;
  subtitle?: string;
  role?: RoleRow | null;
  statusLabel?: string;
  statusTone?: string;
  accent?: string;
  notifs: Notif[];
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card/40 overflow-hidden max-h-[42vh]">
      <header className="shrink-0 px-2.5 py-2 border-b border-border/70 flex items-center gap-2">
        {role !== undefined && role && <RoleIcon role={role} size={18} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-semibold text-sm truncate"
              style={accent ? { color: accent } : undefined}
            >
              {title}
            </span>
            {statusLabel && (
              <span className={`text-[10px] shrink-0 ${statusTone ?? ""}`}>{statusLabel}</span>
            )}
          </div>
          {subtitle && <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 min-h-0">
        {notifs.length === 0 ? (
          <div className="text-[10px] text-muted-foreground italic px-1.5 py-2 text-center">
            aucun évènement
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              className="rounded border border-border/40 bg-background/40 px-2 py-1.5 text-[11px] leading-snug"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground/90 truncate">{n.title}</span>
                <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                  {new Date(n.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              {n.body && (
                <div className="text-foreground/70 mt-0.5 whitespace-pre-wrap break-words">
                  {n.body}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
