// Reusable chat panel backed by chat_messages table + realtime.
// UI : bulles modernes, gradient accent, composer focus-glow, avatars colorés.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = {
  id: string;
  channel: string;
  author_player_id: string;
  author_pseudo: string;
  body: string;
  created_at: string;
};

type Accent = "gold" | "destructive";

const ACCENTS: Record<Accent, {
  mineBubble: string;
  mineText: string;
  ring: string;
  sendBtn: string;
  dot: string;
}> = {
  gold: {
    mineBubble: "bg-gradient-to-br from-amber-400/90 to-yellow-500/80 text-zinc-900 shadow-[0_4px_16px_-4px_rgba(245,196,67,0.35)]",
    mineText: "text-amber-200",
    ring: "focus-within:ring-amber-400/50 focus-within:border-amber-400/60",
    sendBtn: "bg-gradient-to-br from-amber-400 to-yellow-500 text-zinc-900 hover:brightness-110 shadow-[0_4px_14px_-4px_rgba(245,196,67,0.5)]",
    dot: "bg-amber-400",
  },
  destructive: {
    mineBubble: "bg-gradient-to-br from-rose-500/90 to-red-600/80 text-white shadow-[0_4px_16px_-4px_rgba(244,63,94,0.4)]",
    mineText: "text-rose-200",
    ring: "focus-within:ring-rose-500/50 focus-within:border-rose-500/60",
    sendBtn: "bg-gradient-to-br from-rose-500 to-red-600 text-white hover:brightness-110 shadow-[0_4px_14px_-4px_rgba(244,63,94,0.5)]",
    dot: "bg-rose-500",
  },
};

// Couleur stable par auteur (pour distinguer les pseudos dans un même chat).
const AUTHOR_PALETTE = [
  "text-sky-300", "text-emerald-300", "text-violet-300", "text-orange-300",
  "text-fuchsia-300", "text-teal-300", "text-cyan-300", "text-lime-300",
];
function colorForAuthor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AUTHOR_PALETTE[h % AUTHOR_PALETTE.length];
}
function initials(pseudo: string): string {
  const t = pseudo.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : t.slice(0, 2)).toUpperCase();
}

export function ChatPanel({
  gameId,
  channel,
  meId,
  mePseudo,
  canWrite,
  placeholder = "Écrire un message…",
  emptyText = "Aucun message.",
  accent = "gold",
  anonymous = false,
}: {
  gameId: string;
  channel: string;
  meId: string;
  mePseudo: string;
  canWrite: boolean;
  placeholder?: string;
  emptyText?: string;
  accent?: Accent;
  anonymous?: boolean;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const a = ACCENTS[accent];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select()
        .eq("game_id", gameId)
        .eq("channel", channel)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMsgs((data ?? []) as Msg[]);
    }
    void load();

    const ch = supabase
      .channel(`chat-${channel}-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `game_id=eq.${gameId}` },
        (payload) => {
          const m = payload.new as Msg;
          if (m.channel !== channel) return;
          setMsgs((cur) => [...cur, m].slice(-200));
        }
      )
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [gameId, channel]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!canWrite || busy) return;
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setText("");
    await supabase.from("chat_messages").insert({
      game_id: gameId, channel, author_player_id: meId, author_pseudo: mePseudo, body,
    });
    setBusy(false);
    inputRef.current?.focus();
  }

  // Regroupe les messages consécutifs du même auteur (≤ 60s d'écart).
  const grouped = useMemo(() => {
    const out: Array<{ key: string; mine: boolean; authorId: string; authorLabel: string; items: Msg[] }> = [];
    let last: typeof out[number] | null = null;
    for (const m of msgs) {
      const mine = m.author_player_id === meId;
      const authorLabel = anonymous ? (mine ? "Toi" : "Anonyme") : m.author_pseudo;
      const groupKey = anonymous ? (mine ? "me" : "anon") : m.author_player_id;
      const tNew = new Date(m.created_at).getTime();
      const tLast = last ? new Date(last.items[last.items.length - 1].created_at).getTime() : 0;
      if (last && last.mine === mine && (anonymous ? last.authorLabel === authorLabel : last.authorId === groupKey) && tNew - tLast < 60_000) {
        last.items.push(m);
      } else {
        last = { key: m.id, mine, authorId: groupKey, authorLabel, items: [m] };
        out.push(last);
      }
    }
    return out;
  }, [msgs, meId, anonymous]);

  return (
    <div className="h-full flex flex-col">
      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto rounded-xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm p-3 space-y-3"
      >
        {grouped.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10 text-muted-foreground">
            <div className={`mb-3 h-2 w-2 rounded-full ${a.dot} animate-pulse`} />
            <p className="text-xs italic">{emptyText}</p>
          </div>
        )}

        {grouped.map((g) => {
          const color = anonymous ? "text-muted-foreground" : colorForAuthor(g.authorId);
          const headLabel = g.authorLabel;
          return (
            <div key={g.key} className={`flex gap-2 ${g.mine ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`mt-auto h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  g.mine
                    ? `${a.mineBubble} border-transparent`
                    : `bg-muted/60 ${color} border-border/60`
                }`}
                aria-hidden
              >
                {anonymous ? (g.mine ? "✦" : "?") : initials(headLabel)}
              </div>

              <div className={`flex flex-col gap-1 max-w-[78%] ${g.mine ? "items-end" : "items-start"}`}>
                {!g.mine && (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>
                    {headLabel}
                  </span>
                )}
                {g.items.map((m, i) => (
                  <div
                    key={m.id}
                    className={`group relative px-3 py-1.5 text-sm leading-snug rounded-2xl break-words ${
                      g.mine
                        ? `${a.mineBubble} ${g.items.length > 1 && i < g.items.length - 1 ? "rounded-br-md" : ""} ${i > 0 ? "rounded-tr-md" : ""}`
                        : `bg-muted/50 text-foreground/95 border border-border/40 ${g.items.length > 1 && i < g.items.length - 1 ? "rounded-bl-md" : ""} ${i > 0 ? "rounded-tl-md" : ""}`
                    }`}
                  >
                    <span className="whitespace-pre-wrap">{m.body}</span>
                    <span className={`pointer-events-none absolute -bottom-4 text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${g.mine ? "right-1" : "left-1"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {canWrite ? (
        <div className={`mt-3 flex items-end gap-2 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-1.5 transition-all ring-2 ring-transparent ${a.ring}`}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none max-h-28"
            style={{ minHeight: "2.5rem" }}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !text.trim()}
            aria-label="Envoyer"
            className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${a.sendBtn} active:scale-95`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-border/50 bg-muted/20 px-3 py-2.5 text-center">
          <p className="text-[11px] text-muted-foreground italic inline-flex items-center gap-1"><Lock className="size-3" aria-hidden /> Lecture seule</p>
        </div>
      )}
    </div>
  );
}
