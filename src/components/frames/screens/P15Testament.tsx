// P15 — Onglet Testament : écriture libre du dernier mot, visible au cimetière à la mort.
import type { FrameContext } from "../registry";
import { TestamentEditor } from "@/components/TestamentEditor";
import { Feather } from "lucide-react";

export function P15Testament({ me }: FrameContext) {
  return (
    <div className="cork-surface h-full flex flex-col overflow-y-auto">
      {/* Bandeau héro : icône cachetée + intention */}
      <header className="relative px-5 pt-7 pb-5 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-16 h-40 opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.80 0.17 78 / 0.25), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3.5">
          <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gold text-primary-foreground elevate shrink-0">
            <Feather className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Testament
            </div>
            <h2
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-display)", color: "oklch(0.88 0.13 84)" }}
            >
              Tes dernières paroles
            </h2>
          </div>
        </div>
        <p className="relative mt-3.5 text-sm leading-relaxed text-muted-foreground">
          Rédige dès maintenant le message qui sera révélé au cimetière en cas de mort. Modifiable à
          tout moment tant que le cœur bat.
        </p>
      </header>

      <div className="px-5 pb-8">
        <TestamentEditor me={me} />
      </div>
    </div>
  );
}
