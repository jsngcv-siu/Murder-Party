import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createGame, joinGame } from "@/lib/game";
import { setStoredPseudo, getStoredPseudo } from "@/lib/session";
import { useBackButtonGuard } from "@/hooks/useBackButtonGuard";
import { APP_VERSION } from "@/version";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Murder Party — assistant de jeu" },
      {
        name: "description",
        content:
          "Application compagnon pour parties Murder Party à rôles cachés. 6 à 15 joueurs + 1 Maître du Jeu.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  useBackButtonGuard();
  return (
    <div className="min-h-dvh flex flex-col relative">
      {/* Liens outillage : dev uniquement — jamais exposés aux joueurs en prod. */}
      {import.meta.env.DEV && (
        <>
          <Link
            to="/dev"
            className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] inline-flex items-center justify-center tap-target text-xs font-medium text-muted-foreground hover:text-gold transition z-50 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur"
          >
            🧪 Dev
          </Link>
          <Link
            to="/demo"
            className="absolute top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] inline-flex items-center justify-center tap-target text-xs font-medium text-muted-foreground hover:text-gold transition z-50 px-3 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur"
          >
            🎬 Démo
          </Link>
        </>
      )}
      <BrandHeader subtitle="Assistant de partie" />
      <main className="flex-1 px-5 pb-10 max-w-md mx-auto w-full">
        <ResumeBanner />
        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-6 bg-card/60 ring-gold">
            <TabsTrigger value="join">Rejoindre</TabsTrigger>
            <TabsTrigger value="create">Créer</TabsTrigger>
          </TabsList>
          <TabsContent value="join">
            <JoinForm />
          </TabsContent>
          <TabsContent value="create">
            <CreateForm />
          </TabsContent>
        </Tabs>
      </main>
      <VersionBadge />
    </div>
  );
}

/** Version déployée (numéro manuel src/version.ts + date de build auto). Permet
 *  de vérifier d'un coup d'œil que l'URL publique sert bien la dernière version. */
function VersionBadge() {
  const built = (() => {
    try {
      return new Date(__BUILD_TIME__).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();
  return (
    <footer className="pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 text-center">
      <span className="text-[10px] font-mono tracking-wide text-muted-foreground/50 select-all">
        V {APP_VERSION}
        {built ? ` · ${built}` : ""}
      </span>
    </footer>
  );
}

function ResumeBanner() {
  const nav = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("mp_last_game");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { code?: string; ts?: number };
      // On garde la proposition pendant 24h max.
      if (parsed?.code && parsed.ts && Date.now() - parsed.ts < 24 * 3600 * 1000) {
        setCode(parsed.code);
      }
    } catch {}
  }, []);
  if (!code) return null;
  return (
    <Card className="bg-mystic ring-gold/60 elevate p-4 mb-4 flex items-center justify-between gap-3">
      <div className="text-sm">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          Dernière partie
        </div>
        <div className="font-mono font-bold tracking-[0.3em] text-gold">{code}</div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            try {
              window.localStorage.removeItem("mp_last_game");
            } catch {}
            setCode(null);
          }}
        >
          Effacer
        </Button>
        <Button
          size="sm"
          className="bg-gold text-primary-foreground font-semibold press"
          onClick={() => nav({ to: "/g/$code", params: { code } })}
        >
          Reprendre
        </Button>
      </div>
    </Card>
  );
}

function JoinForm() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState(getStoredPseudo());
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !pseudo.trim()) return;
    setLoading(true);
    try {
      const { game } = await joinGame({ code, pseudo: pseudo.trim() });
      setStoredPseudo(pseudo.trim());
      nav({ to: "/g/$code", params: { code: game.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-mystic ring-gold elevate p-6 shadow-card">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="code" className="uppercase tracking-wider text-xs text-muted-foreground">
            Code de partie
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="text-center text-2xl tracking-[0.4em] font-mono tap-target h-14 bg-input/50"
            autoComplete="off"
            inputMode="text"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="pseudo"
            className="uppercase tracking-wider text-xs text-muted-foreground"
          >
            Ton pseudo
          </Label>
          <Input
            id="pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 10))}
            placeholder="Anastasia"
            maxLength={10}
            className="tap-target h-12 bg-input/50"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gold text-primary-foreground font-semibold shadow-glow press"
        >
          {loading ? "Connexion…" : "Rejoindre la partie"}
        </Button>
      </form>
    </Card>
  );
}

function CreateForm() {
  const nav = useNavigate();
  const [pseudo, setPseudo] = useState(getStoredPseudo());
  const [loading, setLoading] = useState<"mj" | "player_only" | null>(null);
  const [step, setStep] = useState<"form" | "mode">("form");

  function continueToMode(e: React.FormEvent) {
    e.preventDefault();
    if (!pseudo.trim()) return;
    setStep("mode");
  }

  async function launch(mode: "mj" | "player_only") {
    setLoading(mode);
    try {
      const { game } = await createGame({
        mjPseudo: pseudo.trim(),
        // true = Joueur Only (hôte joue), false = MJ classique (hôte pilote)
        modeDetectivePlayer: mode === "player_only",
      });
      setStoredPseudo(pseudo.trim());
      toast.success(`Partie créée : ${game.code}`);
      nav({ to: "/g/$code", params: { code: game.code } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer la partie.");
      setLoading(null);
    }
  }

  if (step === "mode") {
    return (
      <Card className="bg-mystic ring-gold elevate p-6 shadow-card space-y-4">
        <button
          type="button"
          onClick={() => setStep("form")}
          disabled={!!loading}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          ← Retour
        </button>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Choisis ton mode</h2>
          <p className="text-xs text-muted-foreground">
            Tu peux le changer plus tard en recréant une partie.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void launch("mj")}
          disabled={!!loading}
          className="press w-full text-left rounded-lg border-2 border-border bg-card/60 hover:border-gold hover:bg-card hover:-translate-y-0.5 transition p-5 space-y-2 disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎩</span>
            <span className="font-semibold text-base">Mode MJ</span>
            {loading === "mj" && <span className="text-xs text-muted-foreground ml-auto">…</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tu pilotes la partie depuis un dashboard. Tu ne joues pas, tu fais les annonces et
            arbitres. Le rôle MJ peut être transféré à un autre joueur depuis le salon.
          </p>
        </button>

        <button
          type="button"
          onClick={() => void launch("player_only")}
          disabled={!!loading}
          className="press w-full text-left rounded-lg border-2 border-border bg-card/60 hover:border-gold hover:bg-card hover:-translate-y-0.5 transition p-5 space-y-2 disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <span className="font-semibold text-base">Mode Joueur Only</span>
            {loading === "player_only" && (
              <span className="text-xs text-muted-foreground ml-auto">…</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pas de MJ. Tu paramètres la partie depuis le salon puis tu reçois un rôle comme les
            autres. Tu peux servir de lead à la table pour rythmer les annonces.
          </p>
        </button>
      </Card>
    );
  }

  return (
    <Card className="bg-mystic ring-gold elevate p-6 shadow-card">
      <form onSubmit={continueToMode} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="mj-pseudo"
            className="uppercase tracking-wider text-xs text-muted-foreground"
          >
            Ton pseudo
          </Label>
          <Input
            id="mj-pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value.slice(0, 10))}
            maxLength={10}
            placeholder="Anastasia"
            className="tap-target h-12 bg-input/50"
            autoComplete="off"
          />
        </div>

        <Button
          type="submit"
          disabled={!pseudo.trim()}
          className="w-full h-12 bg-gold text-primary-foreground font-semibold shadow-glow press disabled:opacity-50"
        >
          Continuer →
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          6 à 15 joueurs. Code à 6 caractères généré automatiquement.
        </p>
      </form>
    </Card>
  );
}
