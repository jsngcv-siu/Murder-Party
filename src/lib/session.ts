// Identité Supabase Auth anonyme (signInAnonymously).
// On garde un session_id local (rétro-compat) pour les bots, mais l'identité
// faisant autorité côté DB est `auth.uid()`.
import { supabase } from "@/integrations/supabase/client";

const KEY = "mp_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

const PSEUDO_KEY = "mp_pseudo";
export function getStoredPseudo(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PSEUDO_KEY) ?? "";
}
export function setStoredPseudo(p: string) {
  window.localStorage.setItem(PSEUDO_KEY, p);
}

// ─────────────── Anonymous auth ───────────────
let authPromise: Promise<string> | null = null;

/** Garantit qu'un user Supabase Auth (anonyme) existe. Retourne son uid. */
export function ensureAuth(): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve("");
  if (authPromise) return authPromise;
  authPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) return data.session.user.id;
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.user) {
      authPromise = null; // permet un retry
      throw error ?? new Error("Auth anonyme indisponible.");
    }
    return signed.user.id;
  })();
  return authPromise;
}

/** Renvoie l'uid courant (vide si pas encore prêt — penser à await ensureAuth d'abord). */
export function getAuthUserIdSync(): string | null {
  // Lecture instantanée depuis le storage Supabase (sans round-trip réseau).
  // useAuthUserId() ci-dessous est plus fiable côté React.
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
            "sb-" + (import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "") + "-auth-token",
          )
        : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string } };
    return parsed?.user?.id ?? null;
  } catch {
    return null;
  }
}
