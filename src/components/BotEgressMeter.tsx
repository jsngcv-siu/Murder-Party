// Chip HUD (mode /demo) : affiche en direct l'egress ESTIMÉ que les bots lisent
// depuis Supabase. 100 % local — s'abonne au compteur (aucune requête réseau),
// donc l'affichage lui-même ne coûte aucun egress. Sert à voir l'effet des bots
// (et du réglage de vitesse) sur la consommation, en direct.
import { useEffect, useState } from "react";
import { Activity, RotateCcw } from "lucide-react";
import {
  meterSubscribe,
  meterReset,
  meterRateKoPerMin,
  type EgressStats,
} from "@/engine/qa/egressMeter";

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

export function BotEgressMeter() {
  const [s, setS] = useState<EgressStats>({ totalBytes: 0, reads: 0, startedAt: 0, lastAt: 0 });
  const [, forceTick] = useState(0);

  // Rafraîchit sur chaque lecture des bots…
  useEffect(() => meterSubscribe(setS), []);
  // …et une fois par seconde pour tenir le débit (Ko/min) à jour hors lecture.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const rate = meterRateKoPerMin(s);
  return (
    <span
      className="px-2 py-1.5 text-xs rounded border border-border flex items-center gap-1.5 text-muted-foreground"
      title="Egress estimé LU par les bots depuis le lancement (calcul 100% local, ne coûte aucun egress). Total · débit · nombre de lectures."
    >
      <Activity className="size-3.5 text-amber-300" />
      <span className="tabular-nums text-foreground">{fmtBytes(s.totalBytes)}</span>
      <span className="opacity-50">·</span>
      <span className="tabular-nums">{rate.toFixed(0)} Ko/min</span>
      <span className="opacity-50">·</span>
      <span className="tabular-nums">{s.reads} lect.</span>
      <button
        onClick={() => meterReset()}
        className="ml-0.5 opacity-60 hover:opacity-100"
        title="Remettre le compteur à zéro"
      >
        <RotateCcw className="size-3" />
      </button>
    </span>
  );
}
