// O5 — Révélation rôle : décompte 3-2-1 cinématique, fiche complète animée.
// On marque revealed_at en sortie. Animations GSAP coupées si prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import { highlightCapacity } from "@/lib/highlightCapacity";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { supabase } from "@/integrations/supabase/client";
import type { RoleRow } from "@/engine/actions";
import { RoleIcon } from "@/components/RoleIcon";
import { RoleDossierSlider } from "@/components/RoleDossierSlider";
import { frequencyChips } from "@/lib/roleUsageChips";
import {
  CapacityChargeChip,
  TypeStamp,
  FactionBadge,
  isScaledUsage,
  UsageScaleBadge,
  stripScalingSentence,
} from "./PA2Capability";
import { extraInfoFor } from "@/lib/roleExtraInfo";
import { Sparkles, Settings } from "lucide-react";
import { P11HelpMenu } from "./P11HelpMenu";
import type { FrameContext } from "../registry";

gsap.registerPlugin(SplitText);

type RevealPlayer = { id: string; role_meta: Record<string, unknown> | null };

export function O5Reveal({
  player,
  role,
  onDone,
  skipCountdown = false,
  alreadyAck = false,
  readyCount,
  total,
  helpCtx,
}: {
  player: RevealPlayer;
  role: RoleRow;
  onDone: () => void;
  skipCountdown?: boolean;
  /** Le joueur a DÉJÀ validé (ex. rechargement de page pendant l'attente) : on
   *  saute le décompte et on affiche directement l'écran d'attente sur la fiche. */
  alreadyAck?: boolean;
  /** Nombre de joueurs prêts / total (bots inclus) — affiché sur le bouton. */
  readyCount?: number;
  total?: number;
  /** Contexte de jeu : active le bouton Paramètres (aide « Comment jouer »,
   *  rôles, objets, statuts) pendant la révélation — demande Jason 2026-07-18. */
  helpCtx?: FrameContext;
}) {
  const [count, setCount] = useState(3);
  const [helpOpen, setHelpOpen] = useState(false);
  // Après avoir cliqué « Entrer » (ou si on a déjà validé), on reste sur la fiche
  // en mode attente jusqu'à ce que tout le monde soit prêt (lancement auto).
  const [waiting, setWaiting] = useState(alreadyAck);
  useEffect(() => {
    if (waiting && total != null && (readyCount ?? 0) >= total) onDone();
  }, [waiting, readyCount, total, onDone]);
  // skipCountdown : aperçu /dev — on saute le décompte 3-2-1 et on montre le dossier.
  const [phase, setPhase] = useState<"countdown" | "card">(skipCountdown ? "card" : "countdown");

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      setPhase("card");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, phase]);

  // ─── Décompte : chaque chiffre « claque » à l'écran ───
  const countRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== "countdown") return;
    const el = countRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { scale: 1.8, opacity: 0, filter: "blur(8px)" },
        { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "back.out(2)" },
      );
    });
    return () => mm.revert();
  }, [count, phase]);

  // ─── Carte : composition orchestrée (halo, icône, nom, fiche, CTA) ───
  const cardRootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase !== "card") return;
    const root = cardRootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let split: SplitText | null = null;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".reveal-aura", { scale: 0.4, opacity: 0, duration: 0.9, ease: "power2.out" }, 0)
        .from(
          ".reveal-icon",
          { scale: 0.3, opacity: 0, rotate: -18, duration: 0.85, ease: "back.out(1.7)" },
          0.1,
        )
        .from(".reveal-kicker", { y: 10, opacity: 0, duration: 0.4 }, 0.25);

      if (nameRef.current) {
        // words,chars : chaque mot reste insécable (wrapper inline-block) → le
        // retour à la ligne se fait entre mots, jamais au milieu d'un mot.
        split = SplitText.create(nameRef.current, { type: "words,chars" });
        tl.from(
          split.chars,
          {
            yPercent: 110,
            opacity: 0,
            rotateX: -80,
            stagger: 0.04,
            duration: 0.6,
            ease: "back.out(1.5)",
          },
          0.35,
        );
      }
      tl.from(".reveal-meta", { y: 8, opacity: 0, duration: 0.4 }, 0.5)
        .from(".reveal-capacity", { y: 16, opacity: 0, duration: 0.5 }, 0.68)
        .from(".reveal-cta", { y: 14, opacity: 0, duration: 0.5 }, 0.8);

      // Respiration continue du halo derrière l'icône.
      gsap.to(".reveal-aura", {
        scale: 1.12,
        opacity: 0.85,
        duration: 2.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.9,
      });

      return () => {
        split?.revert();
      };
    });
    return () => mm.revert();
  }, [phase]);

  async function ack() {
    const meta = {
      ...(player.role_meta as Record<string, unknown>),
      revealed_at: new Date().toISOString(),
    };
    await supabase
      .from("players")
      .update({ role_meta: meta as never })
      .eq("id", player.id);
    // Si on connaît le décompte de prêts, on passe en attente (lancement auto
    // quand tout le monde est prêt). Sinon (ex. aperçu /dev), on entre direct.
    if (total != null) setWaiting(true);
    else onDone();
  }

  if (phase === "countdown") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.18 0.04 40) 0%, oklch(0.11 0.02 35) 70%)",
        }}
      >
        {/* Anneaux concentriques qui pulsent doucement derrière le chiffre. */}
        <div
          aria-hidden
          className="pointer-events-none absolute size-[280px] rounded-full border border-gold/15 pulse-gold"
        />
        <div className="relative text-center">
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Révélation</div>
          <div
            ref={countRef}
            key={count}
            className="text-[8rem] font-bold text-glow-gold mt-4 leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {count === 0 ? <Sparkles className="size-24 mx-auto" aria-hidden /> : count}
          </div>
          <div className="text-xs text-muted-foreground mt-6">
            Cache ton écran des autres joueurs.
          </div>
        </div>
      </div>
    );
  }

  const dossierNo =
    (Math.abs([...role.slug].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % 89) + 10;
  const freqs = frequencyChips(role);
  // Aligné sur l'onglet Capacité : même texte nettoyé (cleanCapacity) + retrait
  // de la phrase de barème pour les rôles scalés (affichée en visuel).
  const extra = extraInfoFor(role.slug);
  const rawCapacity = extra?.cleanCapacity ?? role.capacite_full_text ?? "";
  const capacityText = isScaledUsage(role.slug) ? stripScalingSentence(rawCapacity) : rawCapacity;
  const pc = total ?? 0;

  return (
    <div
      ref={cardRootRef}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -2%, oklch(0.24 0.06 45) 0%, oklch(0.13 0.03 35) 58%)",
      }}
    >
      {/* Paramètres pendant la révélation : les nouveaux venus lisent
          « Comment jouer », le codex des rôles, objets et statuts. */}
      {helpCtx && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Ouvrir l'aide et les paramètres"
          className="absolute right-4 top-[max(1rem,var(--safe-top))] z-10 grid place-items-center size-10 rounded-full ring-1 ring-panel-border bg-panel text-muted-foreground hover:text-foreground hover:brightness-110 transition active:scale-95"
        >
          <Settings className="size-5" aria-hidden />
        </button>
      )}
      {helpCtx && helpOpen && (
        <P11HelpMenu ctx={helpCtx} title="Aide" onClose={() => setHelpOpen(false)} />
      )}
      <div className="min-h-full flex flex-col items-center px-5 pt-[max(2.25rem,var(--safe-top))] pb-[max(2.25rem,var(--safe-bottom))] max-w-md mx-auto">
        {/* En-tête confidentiel */}
        <div className="reveal-kicker text-center">
          <div
            className="text-[12px] font-bold uppercase tracking-[0.3em]"
            style={{ fontFamily: "var(--font-display)", color: "oklch(0.82 0.13 82)" }}
          >
            Dossier confidentiel
          </div>
          <div
            className="mt-1 text-base"
            style={{ fontFamily: "var(--font-hand)", color: "oklch(0.80 0.06 70)" }}
          >
            ne le montre à personne
          </div>
        </div>

        {/* Dossier papier */}
        <div
          className="reveal-card relative mt-6 w-full"
          style={{
            background: "linear-gradient(180deg, oklch(0.94 0.02 88), oklch(0.90 0.03 82))",
            color: "var(--paper-ink)",
            borderRadius: "4px",
            boxShadow:
              "0 22px 50px -18px oklch(0 0 0 / 0.85), inset 0 0 0 1px oklch(0.55 0.06 60 / 0.25)",
          }}
        >
          {/* Scotch */}
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rotate-[-2deg]"
            style={{
              background: "oklch(0.82 0.03 80 / 0.45)",
              boxShadow: "0 2px 4px oklch(0 0 0 / 0.25)",
            }}
          />

          <div className="p-5 pt-6">
            {/* Référence + tampon CONFIDENTIEL */}
            <div className="flex items-start justify-between gap-2">
              <div
                className="text-[9px] uppercase tracking-[0.12em] leading-snug"
                style={{ fontFamily: "var(--font-display)", color: "var(--paper-ink-soft)" }}
              >
                Dossier N° {dossierNo}
                <br />
                Ton rôle
              </div>
              <span
                className="shrink-0 text-[9px] uppercase tracking-[0.1em] px-2 py-1 rounded-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--primary)",
                  border: "2px solid var(--primary)",
                  transform: "rotate(3deg)",
                  opacity: 0.9,
                }}
              >
                Confidentiel
              </span>
            </div>

            {/* Nom centré et prominent, puis rangée : emblème (gauche) + faction/type */}
            <div className="mt-3">
              <h1
                ref={nameRef}
                className="text-[30px] font-bold leading-tight text-center"
                style={{ fontFamily: "var(--font-display)", color: "var(--paper-ink)" }}
              >
                {role.name_fr}
              </h1>
              <div className="reveal-meta mt-3 flex items-center gap-4">
                <div className="relative shrink-0">
                  <span
                    className="reveal-aura absolute inset-0 rounded-full blur-xl"
                    style={{ background: "oklch(0.80 0.15 82 / 0.4)" }}
                    aria-hidden
                  />
                  <div
                    className="reveal-icon relative size-[84px] rounded-full overflow-hidden bg-white"
                    style={{
                      boxShadow:
                        "0 0 0 3px oklch(0.55 0.06 60 / 0.3), 0 6px 14px -6px oklch(0 0 0 / 0.5)",
                    }}
                  >
                    <RoleIcon role={role} size={84} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <FactionBadge faction={role.faction} />
                  <TypeStamp type={role.type} />
                </div>
              </div>
              {/* Fréquence TOUJOURS sur sa propre ligne, sous faction/type.
                  Rôles scalés : barème visuel + total de la partie. */}
              <div className="mt-2.5">
                {isScaledUsage(role.slug) ? (
                  <UsageScaleBadge slug={role.slug} playerCount={pc} />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {freqs.map((f, i) => (
                      <CapacityChargeChip key={i} label={f} state="green" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="my-4 h-px" style={{ background: "oklch(0.55 0.05 60 / 0.3)" }} />

            {/* Capacité + subtilités en SLIDER horizontal — même grammaire que le
                RoleDossierSlider de l'onglet Capacité (page 0 = capacité, pages
                suivantes = subtilités, on glisse d'une feuille à l'autre). */}
            <div className="reveal-capacity">
              <RoleDossierSlider
                pages={[
                  <div key="cap" className="px-6">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.16em]"
                      style={{ fontFamily: "var(--font-display)", color: "var(--paper-ink-soft)" }}
                    >
                      Capacité
                    </span>
                    <p
                      className="mt-2 text-[15px] leading-snug whitespace-pre-line"
                      style={{ color: "var(--paper-ink)" }}
                    >
                      {highlightCapacity(capacityText)}
                    </p>
                  </div>,
                  ...(extra?.pages ?? [])
                    .filter((pg) => pg.notes.length > 0)
                    .map((pg, i) => (
                      <div key={`sub-${i}`} className="px-6">
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.16em]"
                          style={{
                            fontFamily: "var(--font-display)",
                            color: "var(--paper-ink-soft)",
                          }}
                        >
                          {pg.title ?? "Subtilités"}
                        </span>
                        <div className="mt-2 space-y-2">
                          {pg.notes.map((n, j) => (
                            <div
                              key={j}
                              className="rounded-md px-2.5 py-2"
                              style={{
                                background: "color-mix(in oklab, var(--paper-ink) 5%, transparent)",
                                border:
                                  "1px solid color-mix(in oklab, var(--paper-ink) 14%, transparent)",
                              }}
                            >
                              <div
                                className="text-[10px] font-bold uppercase tracking-[0.1em]"
                                style={{
                                  fontFamily: "var(--font-display)",
                                  color: "var(--paper-ink-soft)",
                                }}
                              >
                                {n.tag}
                              </div>
                              <div
                                className="mt-0.5 text-[12.5px] leading-snug"
                                style={{ color: "var(--paper-ink)" }}
                              >
                                {highlightCapacity(n.body)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )),
                ]}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={ack}
          disabled={waiting}
          className="reveal-cta press sheen mt-6 h-14 w-full rounded-xl font-bold text-base tracking-wide uppercase disabled:opacity-80"
          style={{
            background: "var(--gradient-gold)",
            color: "oklch(0.26 0.05 60)",
            fontFamily: "var(--font-display)",
            boxShadow: "0 12px 26px -8px oklch(0.62 0.16 70 / 0.6)",
          }}
        >
          {waiting ? "En attente des autres…" : "Entrer dans la partie"}
          {total != null ? ` · ${readyCount ?? 0}/${total}` : ""}
        </button>
        <p className="reveal-cta mt-7 text-[11px] text-center text-muted-foreground">
          {waiting
            ? "La partie démarre dès que tout le monde est prêt."
            : "Les autres joueurs seront prévenus quand tu seras prêt."}
        </p>
      </div>
    </div>
  );
}
