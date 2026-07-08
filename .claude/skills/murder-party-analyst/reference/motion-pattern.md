# Écran de capacité animé — pattern GSAP maison

Comment animer l'écran de capacité d'un rôle **dans le style déjà en place** du projet.
Ne pas réinventer : copier l'idiome des écrans existants.

## Stack (déjà installée)

- `gsap` + `@gsap/react` (`useGSAP`) — dans `package.json`.
- `tw-animate-css` pour les micro-anims CSS.
- Skills de référence : **gsap-react** (hook `useGSAP`), **gsap-timeline** (choréo),
  **gsap-plugins** (SplitText…), **gsap-performance** (60fps). **ui-ux-pro-max** §7 pour
  le *quand/comment* (durées, easing, sens du mouvement).

## Écrans de référence à copier (vrai code du projet)

| Fichier | Ce qu'il montre |
|---|---|
| `src/components/frames/screens/O5Reveal.tsx` | révélation : timeline + `gsap.matchMedia()` + SplitText + aura en boucle |
| `src/components/frames/screens/T1Transition.tsx` | choréo `gsap.context` + timeline + stagger + `back.out()` |
| `src/components/DiceDuelModal.tsx` | capacité spectaculaire (dés qui roulent, séquençage `await`) |
| `src/components/frames/screens/E1EndGame.tsx` | SplitText sur un titre |
| `src/components/GameToast.tsx` | usage minimal de `useGSAP` |

## Règles maison (non négociables)

1. **Reduced-motion TOUJOURS** via `gsap.matchMedia()` — les animations ne tournent que sous
   `"(prefers-reduced-motion: no-preference)"`. C'est le pattern de O5Reveal/T1Transition/E1EndGame.
2. **Cleanup auto** : `useGSAP(() => {...}, { scope: ref })` (ou `gsap.context`) → pas de fuite au démontage.
3. **Timeline avec `defaults: { ease: "power3.out" }`** + position params (`0`, `0.15`, `0.3`…) pour séquencer.
4. **Vocabulaire d'easing du projet** : `power3.out`/`power2.out` (entrées douces), `back.out(1.4)`→`back.out(2)` (pops tactiles), `sine.inOut` (boucles ambiantes).
5. **Durées** (ui-ux-pro-max §7) : micro-interactions 150–300 ms, transitions ≤ 400–500 ms. Stagger 40–60 ms/élément.
6. **Cible via classes** (`.cap-aura`, `.cap-cta`) scopées au `ref`, pas des refs individuelles partout.
7. **Anime `transform`/`opacity`** (pas width/height/top/left) → 60fps.

## Skeleton — panel de capacité d'un nouveau rôle

À poser dans `PA2Capability.tsx` (ou un sous-composant importé), à côté des panels existants.

```tsx
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";

function MonRoleCapabilityPanel(/* props: cibles, onAct… */) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Joué UNIQUEMENT si l'utilisateur n'a pas demandé de réduire le mouvement.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".cap-aura",   { scale: 0.4, opacity: 0, duration: 0.9, ease: "power2.out" }, 0)
          .from(".cap-title",  { y: 12, opacity: 0, duration: 0.45 }, 0.15)
          .from(".cap-target", { y: 16, opacity: 0, stagger: 0.06, duration: 0.4, ease: "back.out(1.4)" }, 0.3)
          .from(".cap-cta",    { scale: 0.85, opacity: 0, duration: 0.5, ease: "back.out(1.6)" }, 0.5);
        // Aura ambiante en boucle (respiration).
        gsap.to(".cap-aura", { scale: 1.06, repeat: -1, yoyo: true, duration: 1.8, ease: "sine.inOut" });
      });
    },
    { scope: root }, // cleanup auto au démontage
  );

  return (
    <div ref={root} className="relative">
      <div className="cap-aura absolute inset-0 -z-10 rounded-full blur-2xl bg-gold/20" />
      <h2 className="cap-title">Titre de la capacité</h2>
      {/* liste de cibles → chaque item className="cap-target" */}
      <button className="cap-cta press">Confirmer</button>
    </div>
  );
}
```

## Feedback de résultat (succès / échec)

Après `runCapacity()` (le handler renommé), un petit pop suffit :

```tsx
// succès : rebond ; échec : léger shake
gsap.fromTo(resultRef.current,
  { scale: 0.9, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.4, ease: ok ? "back.out(2)" : "power2.out" });
```

Pour un titre percutant (révélation, verdict), réutiliser **SplitText** comme dans `O5Reveal`/`E1EndGame`
(`gsap.registerPlugin(SplitText)` en tête de module, puis anim par caractères/mots).

## Checklist avant de livrer un écran animé

- [ ] `gsap.matchMedia()` — testé avec *prefers-reduced-motion: reduce* (aucune anim, contenu lisible immédiatement).
- [ ] `{ scope: ref }` (ou `gsap.context`) → pas de warning ni fuite au démontage.
- [ ] Durées ≤ 500 ms, une ou deux anims clés (pas de sapin de Noël).
- [ ] Seulement `transform`/`opacity`. Vérifier dans le preview (60fps, pas de layout shift).
- [ ] Cohérent avec le vocabulaire d'easing existant (`power3.out`, `back.out`).
