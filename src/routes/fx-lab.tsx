import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  Bell,
  BookOpen,
  Crown,
  Eye,
  Flame,
  Gavel,
  Gem,
  Hand,
  Lock,
  ScrollText,
  Shield,
  Sparkles,
  Timer,
  Vote,
  WandSparkles,
} from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";

export const Route = createFileRoute("/fx-lab")({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw redirect({ to: "/" });
  },
  component: FxLab,
});

const suspects = [
  { id: "alice", name: "Alice", role: "Le Temoin" },
  { id: "cleo", name: "Cleo", role: "Le Juge" },
  { id: "leo", name: "Leo", role: "Le Tueur" },
  { id: "hana", name: "Hana", role: "Le Facteur" },
  { id: "kya", name: "Kya", role: "Le Guetteur" },
  { id: "noe", name: "Noe", role: "L'Executeur" },
];

function FxLab() {
  const [activePreset, setActivePreset] = useState("vote");
  const sections = [
    { id: "vote", label: "Verdict" },
    { id: "role", label: "Role reveal" },
    { id: "item", label: "Objet" },
    { id: "danger", label: "Danger" },
    { id: "icons", label: "Icones" },
    { id: "board", label: "Board" },
  ];

  return (
    <div className="min-h-dvh bg-[#130806] text-foreground">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#130806]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground transition hover:text-gold">
              Accueil
            </Link>
            <span className="h-4 w-px bg-white/15" />
            <div>
              <div className="font-display text-[10px] uppercase tracking-[0.34em] text-gold">
                FX Lab
              </div>
              <h1 className="text-lg font-semibold">Motion et UI pour Murder Party</h1>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 md:flex">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActivePreset(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  activePreset === s.id
                    ? "bg-gold text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Panel title="Objectif">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Un terrain d'essai pour valider les effets avant de les intégrer aux vrais écrans :
              vote, annonces, capacités, inventaire, alertes et icônes.
            </p>
          </Panel>
          <Panel title="Principes UI">
            <div className="space-y-2 text-sm text-muted-foreground">
              <Principle icon={<Sparkles />} text="Une animation = une information de jeu." />
              <Principle icon={<Timer />} text="Les FX doivent finir vite et lisiblement." />
              <Principle icon={<Shield />} text="Toujours prévoir une version motion réduite." />
              <Principle icon={<Eye />} text="Les icônes doivent aider à scanner, pas décorer." />
            </div>
          </Panel>
          <Panel title="Palette proposée">
            <div className="grid grid-cols-2 gap-2">
              <Swatch name="Enquête" color="#e8b44a" />
              <Swatch name="Débat" color="#9b5cf6" />
              <Swatch name="Vote" color="#d12b3d" />
              <Swatch name="Objet" color="#55c7d8" />
            </div>
          </Panel>
        </aside>

        <section className="grid gap-5 xl:grid-cols-2">
          <FxCard id="vote" active={activePreset} title="Verdict de vote" kicker="avatar roulette">
            <VoteRouletteFx />
          </FxCard>
          <FxCard
            id="role"
            active={activePreset}
            title="Révélation de rôle"
            kicker="dossier scellé"
          >
            <RoleRevealFx />
          </FxCard>
          <FxCard id="item" active={activePreset} title="Nouvel objet" kicker="toast premium">
            <ItemToastFx />
          </FxCard>
          <FxCard
            id="danger"
            active={activePreset}
            title="Phase critique"
            kicker="timer sous tension"
          >
            <DangerTimerFx />
          </FxCard>
          <FxCard id="icons" active={activePreset} title="Système d'icônes" kicker="lisibilité">
            <IconSystemFx />
          </FxCard>
          <FxCard
            id="board"
            active={activePreset}
            title="Board de suspicion"
            kicker="fils et indices"
          >
            <BoardFx />
          </FxCard>
        </section>
      </main>
    </div>
  );
}

function FxCard({
  id,
  active,
  title,
  kicker,
  children,
}: {
  id: string;
  active: string;
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`min-h-[360px] overflow-hidden rounded-lg border bg-[#1d0d0a] transition ${
        id === "vote" ? "xl:col-span-2" : ""
      } ${
        active === id ? "border-gold/70 shadow-[0_0_0_1px_rgba(232,180,74,.25)]" : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {kicker}
          </div>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-gold">
          FX
        </span>
      </div>
      <div className="min-h-[300px] p-4">{children}</div>
    </article>
  );
}

function VoteRouletteFx() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const winner = "leo";
  const winnerData = suspects.find((p) => p.id === winner) ?? suspects[0];

  const play = () => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = gsap.utils.toArray<HTMLElement>(".vote-avatar", root);
    const fxNodes = gsap.utils.toArray<HTMLElement>(".verdict-fx", root);
    timelineRef.current?.kill();
    gsap.killTweensOf([...nodes, ...fxNodes]);
    const targetIndex = suspects.findIndex((p) => p.id === winner);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(winner);
      gsap.set(nodes, { clearProps: "all" });
      gsap.set(fxNodes, { autoAlpha: 1, clearProps: "transform" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(nodes, { scale: 1, y: 0, rotation: 0 });
      gsap.set(".verdict-stamp", { autoAlpha: 0, scale: 0.82, rotation: -7 });
      gsap.set(".verdict-paper", { y: 10, rotation: -1.5, scale: 0.98 });
      gsap.set(".verdict-ray", { scaleX: 0, autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      timelineRef.current = tl;
      tl.to(".verdict-paper", { y: 0, rotation: -0.4, scale: 1, duration: 0.32 }).to(
        ".verdict-ray",
        { scaleX: 1, autoAlpha: 1, stagger: 0.045, duration: 0.28 },
        0.12,
      );
      for (let i = 0; i < nodes.length * 2 + targetIndex + 1; i++) {
        const node = nodes[i % nodes.length];
        const id = node.dataset.id ?? null;
        const last = i === nodes.length * 2 + targetIndex;
        tl.to(node, {
          scale: last ? 1.24 : 1.13,
          y: last ? -8 : -4,
          rotation: last ? -2 : 0,
          duration: last ? 0.18 : 0.055,
          ease: "power2.out",
          onStart: () => setActive(id),
        }).to(node, {
          scale: last ? 1.16 : 1,
          y: last ? -3 : 0,
          rotation: last ? -1 : 0,
          duration: last ? 0.42 : 0.055,
          ease: "power2.out",
        });
      }
      tl.to(".verdict-stamp", { autoAlpha: 1, scale: 1, duration: 0.36, ease: "back.out(1.8)" }).to(
        ".verdict-final-avatar",
        { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1 },
        "-=0.2",
      );
    }, root);
    return () => ctx.revert();
  };

  useEffect(() => {
    const cleanup = play();
    return () => {
      timelineRef.current?.kill();
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative grid min-h-[640px] place-items-center overflow-hidden rounded border border-[#5b3226] bg-[#1a0b08] p-3 text-[#f3dfb8] sm:p-5"
    >
      <div className="absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_50%_0%,rgba(232,180,74,.22),transparent_42%),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:100%_100%,22px_22px,22px_22px]" />
      <div className="absolute left-0 top-0 h-full w-1 bg-[#c2202f]" />
      <div className="relative flex w-full max-w-[390px] flex-col rounded-[2rem] border border-[#5b3226] bg-[#24100c]/92 p-3 shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] sm:p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#5b3226] pb-3">
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.28em] text-gold">
              resultat du vote
            </div>
            <div className="mt-1 text-xs text-[#d7bd8a]">Tour 3 - verdict final</div>
          </div>
          <div className="rounded border border-[#7a4637] bg-[#130806] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f1c35c]">
            vote clos
          </div>
        </div>
        <div className="mb-4 flex items-end justify-center gap-1.5">
          {suspects.map((p) => (
            <div
              key={p.id}
              data-id={p.id}
              className={`vote-avatar relative h-12 w-10 overflow-hidden rounded border bg-[#f7ecd2] p-0.5 sm:h-14 sm:w-11 ${
                active === p.id
                  ? "border-gold shadow-[0_12px_30px_-14px_rgba(232,180,74,.95)]"
                  : "border-[#d7c39c]/65"
              }`}
            >
              <AvatarImg id={p.id} fill rounded="none" />
              {active === p.id && (
                <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-[#c2202f]" />
              )}
            </div>
          ))}
        </div>
        <div className="verdict-paper verdict-fx relative mx-auto w-full overflow-hidden rounded-sm border border-[#cdb686] bg-[#efe3c7] px-4 py-6 text-center text-[#351c12] shadow-[0_24px_60px_-34px_rgba(0,0,0,.9)]">
          <span className="verdict-ray verdict-fx absolute left-0 top-7 h-px w-full origin-left bg-[#c2202f]/45" />
          <span className="verdict-ray verdict-fx absolute bottom-9 left-0 h-px w-full origin-left bg-[#9a7b52]/35" />
          <div className="verdict-final-avatar relative mx-auto mb-4 h-24 w-20 overflow-hidden rounded border border-[#b99b61] bg-[#f7ecd2] p-1 shadow-lg">
            <AvatarImg id={winnerData.id} fill rounded="none" />
          </div>
          <div className="font-display text-[10px] uppercase tracking-[0.24em] text-[#9a7b52]">
            verdict des urnes
          </div>
          <div className="mt-2 text-3xl font-bold">{winnerData.name}</div>
          <div className="verdict-stamp verdict-fx mx-auto mt-4 w-fit rotate-[-4deg] rounded border-2 border-[#c2202f] px-5 py-1 font-display text-xl text-[#c2202f]">
            EMPRISONNE
          </div>
        </div>
        <div className="mt-4 rounded border border-[#5b3226] bg-[#1a0b08]/80 px-3 py-3 text-center text-xs leading-relaxed text-[#d7bd8a]">
          La decision est appliquee. La partie reprend apres l'annonce.
        </div>
      </div>
    </div>
  );
}

function RoleRevealFx() {
  const rootRef = useRef<HTMLDivElement>(null);
  const play = () => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".seal",
        { scale: 0.65, rotation: -16, autoAlpha: 0 },
        { scale: 1, rotation: -5, autoAlpha: 1, duration: 0.35 },
      )
        .fromTo(
          ".role-card",
          { y: 24, rotationX: 12, autoAlpha: 0 },
          { y: 0, rotationX: 0, autoAlpha: 1, duration: 0.45 },
          "-=0.05",
        )
        .fromTo(
          ".role-chip",
          { y: 12, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.25 },
          "-=0.15",
        )
        .to(".halo", { scale: 1.08, autoAlpha: 0.8, duration: 0.35, yoyo: true, repeat: 1 }, 0.25);
    }, root);
    return () => ctx.revert();
  };
  useEffect(() => {
    play();
  }, []);
  return (
    <div ref={rootRef} className="relative grid h-full place-items-center">
      <button
        onClick={play}
        className="absolute right-0 top-0 rounded border border-white/10 px-2 py-1 text-xs"
      >
        Rejouer
      </button>
      <div className="role-card relative w-72 rounded border border-gold/40 bg-[#efe3c7] p-5 text-[#2b160d] shadow-2xl">
        <div className="halo absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25 blur-2xl" />
        <div className="relative">
          <div className="seal absolute -right-3 -top-8 grid h-16 w-16 place-items-center rounded-full border-2 border-[#a8772a] bg-[#d9a846] text-[#4a260f]">
            <Crown className="h-7 w-7" />
          </div>
          <div className="font-display text-[10px] uppercase tracking-[0.24em] text-[#8a6737]">
            dossier confidentiel
          </div>
          <h3 className="mt-2 font-display text-3xl">Le Juge</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5d3d22]">
            Une fois par partie, annule la foule et rends ton propre verdict.
          </p>
          <div className="mt-5 flex gap-2">
            <Badge icon={<Gavel />} text="Verdict" />
            <Badge icon={<Shield />} text="Civil" />
            <Badge icon={<Gem />} text="Rare" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemToastFx() {
  const rootRef = useRef<HTMLDivElement>(null);
  const play = () => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".item-toast",
        { x: 36, autoAlpha: 0, scale: 0.96 },
        { x: 0, autoAlpha: 1, scale: 1, duration: 0.38, ease: "back.out(1.5)" },
      );
      gsap.fromTo(
        ".item-ray",
        { scaleY: 0, autoAlpha: 0 },
        { scaleY: 1, autoAlpha: 1, stagger: 0.04, duration: 0.26, ease: "power2.out" },
      );
      gsap.to(".item-icon", {
        rotation: "8_short",
        yoyo: true,
        repeat: 3,
        duration: 0.12,
        ease: "sine.inOut",
      });
    }, root);
    return () => ctx.revert();
  };
  useEffect(() => {
    play();
  }, []);
  return (
    <div ref={rootRef} className="relative flex h-full items-center justify-center">
      <button
        onClick={play}
        className="absolute right-0 top-0 rounded border border-white/10 px-2 py-1 text-xs"
      >
        Rejouer
      </button>
      <div className="item-toast relative w-80 overflow-hidden rounded-lg border border-cyan-300/30 bg-[#102329] p-4 shadow-2xl">
        <span className="item-ray absolute left-6 top-0 h-full w-px origin-top bg-cyan-200/30" />
        <span className="item-ray absolute left-10 top-0 h-full w-px origin-top bg-cyan-200/20" />
        <div className="relative flex items-center gap-3">
          <div className="item-icon grid h-14 w-14 place-items-center rounded bg-cyan-300/15 text-cyan-200">
            <ScrollText className="h-7 w-7" />
          </div>
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">
              nouvel objet
            </div>
            <div className="text-base font-semibold text-cyan-50">Lettre scellée</div>
            <div className="text-xs text-cyan-100/65">Un indice privé vient d'arriver.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DangerTimerFx() {
  const rootRef = useRef<HTMLDivElement>(null);
  const play = () => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        ".danger-ring",
        { scale: 0.86, autoAlpha: 0.4 },
        { scale: 1.05, autoAlpha: 1, duration: 0.28, ease: "power2.out", repeat: 5, yoyo: true },
      )
        .to(
          ".danger-bar",
          { scaleX: 0.18, transformOrigin: "left center", duration: 1.8, ease: "power3.inOut" },
          0,
        )
        .fromTo(
          ".danger-copy",
          { y: 8, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.3 },
          0.25,
        );
    }, root);
    return () => ctx.revert();
  };
  useEffect(() => {
    play();
  }, []);
  return (
    <div ref={rootRef} className="relative grid h-full place-items-center">
      <button
        onClick={play}
        className="absolute right-0 top-0 rounded border border-white/10 px-2 py-1 text-xs"
      >
        Rejouer
      </button>
      <div className="relative w-80 rounded-lg border border-red-400/30 bg-[#2a0d10] p-5">
        <div className="danger-ring absolute right-4 top-4 h-16 w-16 rounded-full border border-red-300/40 bg-red-500/10 blur-[1px]" />
        <div className="flex items-center gap-3 text-red-100">
          <Timer className="h-7 w-7 text-red-300" />
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.24em] text-red-200/70">
              vote presque clos
            </div>
            <div className="font-mono text-3xl tabular-nums">00:08</div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
          <div className="danger-bar h-full w-full rounded-full bg-gradient-to-r from-red-300 to-red-600" />
        </div>
        <p className="danger-copy mt-4 text-sm text-red-100/75">
          Dernière chance pour changer le destin.
        </p>
      </div>
    </div>
  );
}

function IconSystemFx() {
  const items = [
    {
      icon: <BookOpen />,
      label: "Enquête",
      tone: "text-amber-200 border-amber-300/30 bg-amber-300/10",
    },
    { icon: <Bell />, label: "Annonce", tone: "text-sky-200 border-sky-300/30 bg-sky-300/10" },
    {
      icon: <Hand />,
      label: "Débat",
      tone: "text-violet-200 border-violet-300/30 bg-violet-300/10",
    },
    { icon: <Vote />, label: "Vote", tone: "text-red-200 border-red-300/30 bg-red-300/10" },
    {
      icon: <Lock />,
      label: "Prison",
      tone: "text-orange-200 border-orange-300/30 bg-orange-300/10",
    },
    {
      icon: <WandSparkles />,
      label: "Pouvoir",
      tone: "text-cyan-200 border-cyan-300/30 bg-cyan-300/10",
    },
  ];
  return (
    <div className="grid h-full content-center gap-3">
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 rounded border p-3 ${item.tone}`}
          >
            <span className="grid h-10 w-10 place-items-center rounded bg-black/20 [&_svg]:h-5 [&_svg]:w-5">
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="rounded border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
        Direction : icône claire + couleur de phase + libellé court. Le joueur scanne l'état sans
        lire un paragraphe.
      </div>
    </div>
  );
}

function BoardFx() {
  const rootRef = useRef<HTMLDivElement>(null);
  const play = () => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.fromTo(
        ".board-card",
        { y: 18, autoAlpha: 0, rotation: -3 },
        { y: 0, autoAlpha: 1, rotation: 0, stagger: 0.08, duration: 0.28 },
      )
        .fromTo(
          ".board-line",
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", stagger: 0.08, duration: 0.32 },
          "-=0.12",
        )
        .fromTo(
          ".board-pin",
          { scale: 0 },
          { scale: 1, stagger: 0.04, duration: 0.18, ease: "back.out(2)" },
          "-=0.35",
        );
    }, root);
    return () => ctx.revert();
  };
  useEffect(() => {
    play();
  }, []);
  return (
    <div ref={rootRef} className="relative h-full rounded-lg bg-[#26150e] p-5">
      <button
        onClick={play}
        className="absolute right-3 top-3 rounded border border-white/10 px-2 py-1 text-xs"
      >
        Rejouer
      </button>
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <line
          className="board-line"
          x1="85"
          y1="76"
          x2="255"
          y2="170"
          stroke="#d12b3d"
          strokeWidth="2"
        />
        <line
          className="board-line"
          x1="255"
          y1="170"
          x2="120"
          y2="240"
          stroke="#d12b3d"
          strokeWidth="2"
        />
        <line
          className="board-line"
          x1="120"
          y1="240"
          x2="85"
          y2="76"
          stroke="#d12b3d"
          strokeWidth="2"
        />
      </svg>
      <BoardNote className="left-7 top-8" title="Indice" body="Un alibi trop propre." />
      <BoardNote className="right-7 top-28" title="Suspect" body="A parlé en dernier." />
      <BoardNote className="bottom-7 left-20" title="Vote" body="2 voix contre Léo." />
    </div>
  );
}

function BoardNote({ className, title, body }: { className: string; title: string; body: string }) {
  return (
    <div
      className={`board-card absolute w-32 rounded bg-[#efe3c7] p-3 text-[#2b160d] shadow-xl ${className}`}
    >
      <span className="board-pin absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-red-400 shadow" />
      <div className="font-display text-[10px] uppercase tracking-[0.18em] text-[#9a7b52]">
        {title}
      </div>
      <div className="mt-1 text-sm font-semibold">{body}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1d0d0a] p-4">
      <h2 className="mb-3 font-display text-[10px] uppercase tracking-[0.24em] text-gold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Principle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 [&_svg]:mt-0.5 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-gold">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-2">
      <span className="block h-8 rounded" style={{ background: color }} />
      <span className="mt-1 block text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

function Badge({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="role-chip inline-flex items-center gap-1 rounded border border-[#a8772a]/35 bg-[#a8772a]/10 px-2 py-1 text-xs text-[#5d3d22] [&_svg]:h-3.5 [&_svg]:w-3.5">
      {icon}
      {text}
    </span>
  );
}
