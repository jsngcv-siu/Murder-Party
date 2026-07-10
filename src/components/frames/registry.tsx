// Contexte partagé passé à chaque écran de frame (état LIVE du joueur incarné).
//
// NB : l'ancien catalogue `FRAMES` / `frameById` / `SECTIONS` a été retiré — il
// était mort (importé nulle part). En production, les écrans sont montés en
// direct par `PlayerShell`, et la galerie `/dev` construit ses propres scènes.
// Ce fichier ne porte donc plus que le type de contexte partagé.
import type { PlayerRow, GameRow, RoleRow } from "@/engine/actions";

export type FrameContext = {
  game: GameRow;
  me: PlayerRow;
  myRole: RoleRow | null;
  players: PlayerRow[];
  roles: Map<string, RoleRow>;
  gameId: string;
  /** Si défini : la capacité est pilotée par le Marionnettiste (lui = puppeteerId, me = marionnette).
   *  Désactive l'overlay "Manipulé" et bypasse le blocage côté engine. */
  puppeteerOverride?: { puppeteerId: string; puppeteerPseudo: string };
  /** Sandbox /dev uniquement : force le camp gagnant de la frame de fin (E1)
   *  sans dépendre de la base. Ignoré en partie réelle. */
  devWinner?: string;
  /** Sandbox /dev uniquement : verdict de vote injecté pour prévisualiser
   *  l'écran de résultat sans notification Supabase réelle. */
  devVoteVerdict?: {
    target_id: string | null;
    tour?: number;
    tied?: boolean;
    counts?: Record<string, number>;
  };
};
