import { useEffect } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function useBackButtonGuard() {
  useEffect(() => {
    if (!isStandalone()) return;

    // Empêche le bouton retour matériel de quitter l’app quand on est sur la page d’accueil.
    // On pousse un état bidon ; quand il est dépilé on le repousse immédiatement.
    history.pushState({ __backGuard: true }, "");

    const onPop = (e: PopStateEvent) => {
      if (e.state?.__backGuard) {
        history.pushState({ __backGuard: true }, "");
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
