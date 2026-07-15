// Testament — parchemin scellé (DA « tableau d'enquête »).
// Permet à un joueur (mort ou prisonnier) de rédiger / mettre à jour son
// testament, révélé au cimetière à sa mort. Sauvegarde automatique (debounce),
// sans bouton. Le rendu imite un parchemin vieilli : papier réglé, scotch
// (qui dépasse du haut pour l'effet « collé ») et écriture manuscrite (Caveat).
import { useEffect, useRef, useState } from "react";
import { setTestament } from "@/engine/actions";
import type { PlayerRow } from "@/engine/actions";
import { TestamentPaper, TestamentTitle } from "@/components/TestamentPaper";

type SaveState = "idle" | "saving" | "saved";

export function TestamentEditor({ me }: { me: PlayerRow }) {
  const initial =
    ((me.role_meta as Record<string, unknown> | null)?.testament as string | undefined) ?? "";
  const [text, setText] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const lastSavedRef = useRef(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync uniquement si la valeur distante change ET qu'on n'a pas d'édition locale en cours.
  useEffect(() => {
    if (initial !== lastSavedRef.current && text === lastSavedRef.current) {
      setText(initial);
      lastSavedRef.current = initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Autosave debounced (700ms après la dernière frappe)
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === lastSavedRef.current.trim()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState("saving");
    timerRef.current = setTimeout(async () => {
      try {
        await setTestament(me.id, trimmed);
        lastSavedRef.current = trimmed;
        setState("saved");
        setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 1500);
      } catch {
        setState("idle");
      }
    }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, me.id]);

  const saveLabel =
    state === "saving" ? "Encrage…" : state === "saved" ? "✓ Scellé" : "Sauvegarde auto";

  return (
    <div className="mt-6">
      {/* Parchemin — coquille partagée avec la lecture au cimetière. */}
      <TestamentPaper>
        <TestamentTitle>Mes dernières volontés</TestamentTitle>
        <div
          className="mt-2 mb-3 flex items-center justify-between"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-[8.5px] tracking-[0.1em]" style={{ color: "oklch(0.55 0.07 60)" }}>
            SCELLÉ — RÉVÉLÉ À TA MORT
          </span>
          <span
            className="text-[8.5px] px-2 py-0.5 rounded-sm"
            style={{
              color: "oklch(0.45 0.06 55)",
              border: "1px solid oklch(0.62 0.08 60 / 0.5)",
            }}
          >
            brouillon
          </span>
        </div>

        {/* Encre manuscrite sur les lignes du parchemin */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder="À qui me lira, si vous tenez ceci, c'est que la nuit a eu ma peau…"
          rows={4}
          aria-label="Ton testament"
          className="w-full bg-transparent border-0 outline-none resize-none p-0"
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: 19,
            lineHeight: "28px",
            color: "oklch(0.32 0.05 45)",
            caretColor: "oklch(0.32 0.05 45)",
          }}
        />
      </TestamentPaper>

      {/* Pied : compteur + état de sauvegarde (la « cire » se fige quand c'est scellé) */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[10px] text-muted-foreground tabular-nums">{text.length}/280</span>
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{
              background:
                state === "saving"
                  ? "oklch(0.80 0.15 78)"
                  : state === "saved"
                    ? "oklch(0.68 0.16 150)"
                    : "oklch(0.55 0.22 18)",
            }}
          />
          {saveLabel}
        </span>
      </div>
    </div>
  );
}
