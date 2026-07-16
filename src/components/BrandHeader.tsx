import { Link } from "@tanstack/react-router";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="px-6 pt-[max(2.5rem,var(--safe-top))] pb-6 text-center">
      <Link to="/" className="inline-block group">
        <h1 className="brand-title text-3xl font-bold tracking-wide text-gold transition-transform duration-300 group-hover:scale-[1.02]">
          MURDER · PARTY
        </h1>
        {/* Filet doré décoratif sous le titre. */}
        <span
          aria-hidden
          className="mx-auto mt-2 block h-px w-28 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.80 0.17 78 / 0.7), transparent)",
          }}
        />
      </Link>
      {subtitle && (
        <p className="mt-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">{subtitle}</p>
      )}
    </header>
  );
}
