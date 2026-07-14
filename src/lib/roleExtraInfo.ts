// Subtilités de rôle — « infos supplémentaires » du dossier joueur.
//
// But : sortir les nuances mécaniques (camouflages, pièges, timings, exceptions)
// du texte de capacité — où elles étaient jusque-là entassées sans hiérarchie —
// et les présenter sur une (ou plusieurs) page(s) dédiée(s) qu'on révèle en
// slidant la feuille du dossier. Une note = un titre court (`tag`) + une phrase.
//
// `cleanCapacity` (optionnel) remplace, sur la page 1 du dossier, le
// `capacite_full_text` de la base quand celui-ci contenait ces subtilités en
// vrac (ex. Assistant, Policier). On ne touche PAS à la base : override d'affichage.
//
// Le `body` est passé tel quel à `highlightCapacity(body, "paper")` au rendu :
// écris-le en français simple, les notions clés se colorent toutes seules.

export interface RoleNote {
  /** Titre court de la note (2-4 mots), rendu en petit label. */
  tag: string;
  /** Phrase d'explication (français simple, colorée automatiquement). */
  body: string;
}

export interface RoleInfoPage {
  /** Titre de la page (ex. « Subtilités », « À retenir »). */
  title: string;
  notes: RoleNote[];
}

export interface RoleExtraInfo {
  /** Remplace le texte de capacité affiché page 1 (override d'affichage). */
  cleanCapacity?: string;
  /** Une ou plusieurs pages de subtilités révélées en slidant. */
  pages: RoleInfoPage[];
}

export const ROLE_EXTRA_INFO: Record<string, RoleExtraInfo> = {
  // ─────────────────────────── CIVILS ───────────────────────────
  ange_gardien: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Cible imposée",
            body: "Tu ne choisis pas qui tu protèges : le manoir te confie une cible au hasard dès le départ.",
          },
          {
            tag: "Un seul tour couvert",
            body: "1×/partie. Le bouclier ne protège que le tour où tu l'actives : s'il n'y a pas d'attaque ce tour-là, il est gaspillé.",
          },
          {
            tag: "Lis le danger",
            body: "Tout est dans le timing : active-le le tour où tu sens ta cible menacée, pas trop tôt.",
          },
          {
            tag: "Sauvetage muet",
            body: "Ta cible ignore qu'elle est veillée — et n'apprendra jamais que tu l'as sauvée.",
          },
        ],
      },
    ],
  },
  apothicaire: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Trois fioles uniques",
            body: "Poison (tue), Vie (protège), Clairvoyance (révèle la faction). Chacune ne sert qu'une fois.",
          },
          {
            tag: "Une par tour",
            body: "Tu ne peux utiliser qu'une seule fiole par tour. Garde ou offre les autres.",
          },
          {
            tag: "Offrir une fiole",
            body: "Tu peux confier une fiole à un autre joueur : c'est lui qui l'utilisera. Idéal pour armer un allié sûr.",
          },
        ],
      },
    ],
  },
  assistant_du_detective: {
    cleanCapacity:
      "1×/tour. Désigne 1 joueur : le manoir te renvoie un trio de rôles — le vrai, plus 2 leurres. À toi de deviner lequel est réel.",
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Un vrai, deux faux",
            body: "Le trio mêle le vrai rôle de ta cible et 2 leurres tirés au hasard. Rien n'indique lequel est le bon.",
          },
          {
            tag: "Des leurres crédibles",
            body: "Les faux rôles sont du même genre que le vrai — un tueur est noyé parmi d'autres profils dangereux : le trio oriente sans prouver.",
          },
          {
            tag: "Tu perces les masques",
            body: "Seul enquêteur à démasquer l'Usurpateur ET le Tueur : ils figurent sous leur vrai rôle dans ton trio, là où les autres enquêtes les prennent pour des Civils.",
          },
        ],
      },
    ],
  },
  avocat: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Uniquement la prison",
            body: "Tu vois la faction des joueurs actuellement emprisonnés — et de personne d'autre.",
          },
          {
            tag: "Sans détenu, aveugle",
            body: "Tant que les cellules sont vides, ta capacité ne t'apprend rien. Pousse la table aux emprisonnements.",
          },
        ],
      },
    ],
  },
  babysitter: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Protège mais endort",
            body: "Ta cible survit au prochain tour, mais sa capacité est désactivée. Ne borde pas un allié actif au mauvais moment.",
          },
          {
            tag: "Effet différé",
            body: "La protection couvre le tour suivant, pas le tour où tu la déclenches.",
          },
          {
            tag: "La cible est prévenue",
            body: "Elle sait qu'elle est gardée : un signal utile pour un allié… ou un indice offert à un ennemi.",
          },
        ],
      },
    ],
  },
  barman: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Deux cibles, un tirage",
            body: "Tu désignes 2 joueurs. Le hasard (50/50) décide lequel est protégé — et se retrouve ivre.",
          },
          {
            tag: "Protection incertaine",
            body: "Tu ne choisis pas lequel des deux est réellement à l'abri : c'est un pari.",
          },
          {
            tag: "L'ivresse gêne",
            body: "Le joueur ivre a sa capacité bloquée le tour suivant. Utile aussi pour ralentir un suspect.",
          },
        ],
      },
    ],
  },
  boussole: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Même camp, oui ou non",
            body: "Tu apprends seulement si 2 joueurs sont de la même faction — jamais leurs rôles.",
          },
          {
            tag: "Vert = alliés",
            body: "Résultat vert : même camp. Rouge : camps opposés.",
          },
          {
            tag: "Tu ne perces rien",
            body: "Seul l'Assistant du détective démasque les déguisements. Pour toi, l'Usurpateur et le Tueur ressortent comme des Civils, et une cible falsifiée ne renvoie rien.",
          },
          {
            tag: "Piège des Neutres",
            body: "Deux Neutres ressortent « même camp », alors qu'ils ne partagent pas forcément le même objectif de victoire.",
          },
        ],
      },
    ],
  },
  cuisinier: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Un Civil qui tue",
            body: "Tu reçois un couteau au départ : tu peux éliminer une personne. Un rôle rare et important pour les civils.",
          },
          {
            tag: "Arme à protéger",
            body: "Le couteau est un objet de ton inventaire : un voleur pourrait te le subtiliser avant que tu ne l'utilises.",
          },
          {
            tag: "Tuer un Civil te trahit",
            body: "Si ta lame frappe un Civil, tu ressors « suspect » à la police : attention à la cible que tu choisis.",
          },
          {
            tag: "Frappe à froid",
            body: "Sers-toi de ton coup au bon moment : une fois le couteau utilisé, tu es un Civil sans capacité.",
          },
        ],
      },
    ],
  },
  executeur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Le bourreau du manoir",
            body: "Tu ne peux exécuter qu'un joueur ayant passé un tour complet en prison.",
          },
          {
            tag: "Dépend du vote",
            body: "Sans emprisonnement, pas de cible : ta puissance suit les décisions de la table.",
          },
          {
            tag: "Exécution publique",
            body: "L'exécution révèle le rôle complet du condamné à toute la table — une info précieuse… ou la preuve que tu t'es trompé.",
          },
          {
            tag: "À double tranchant",
            body: "Un détenu peut être innocent. Exécute à tort et tu affaiblis ton propre camp.",
          },
        ],
      },
    ],
  },
  facteur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Lettre anonyme",
            body: "Ta cible reçoit une « lettre » dans son inventaire, sans savoir qu'elle vient de toi.",
          },
          {
            tag: "Un relais de message",
            body: "Le joueur que tu vises peut à son tour écrire un texte de 80 caractères et l'adresser au joueur de son choix.",
          },
          {
            tag: "Signé, jamais par toi",
            body: "Ce message part signé du nom de son expéditeur : le destinataire sait de qui il vient, mais toi, le Facteur, restes dans l'ombre.",
          },
          {
            tag: "Outil social",
            body: "Aucun effet mécanique direct : c'est un moyen de communiquer, semer un doute ou tisser une confiance.",
          },
        ],
      },
    ],
  },
  guetteur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Journal en direct",
            body: "Pendant le tour choisi, ta cible et l'ordre de ses visiteurs sont enregistrés au fil des actions.",
          },
          {
            tag: "Démasque les attaques",
            body: "Voir qui a visité une future victime révèle souvent le Tueur ou le Croque-mitaine.",
          },
          {
            tag: "Historique consultable",
            body: "Tu gardes accès aux relevés des tours précédents pour recouper les allées et venues.",
          },
        ],
      },
    ],
  },
  juge: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Rouvre une cellule",
            body: "Tu libères un joueur emprisonné depuis au moins un tour complet.",
          },
          {
            tag: "Contre les erreurs",
            body: "Idéal pour sauver un innocent injustement voté — mais tu peux aussi relâcher un vrai Méchant.",
          },
        ],
      },
    ],
  },
  majordome: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Protection à contre",
            body: "Si une attaque est bel et bien parée : ta cible survit, l'attaquant meurt… et toi aussi.",
          },
          {
            tag: "Sacrifice ciblé",
            body: "Seule une attaque interceptée déclenche l'échange — l'assassin tombe avec toi, révélant un Méchant.",
          },
          {
            tag: "Sans attaque, rien",
            body: "Si personne ne vise ta cible, tu ne meurs pas : protéger « à vide » est sans risque.",
          },
        ],
      },
    ],
  },
  medecin_legiste: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Autopsie automatique",
            body: "À chaque mort, tu apprends le rôle exact du défunt, sans rien avoir à faire.",
          },
          {
            tag: "Le Cleaner t'aveugle",
            body: "Si le corps a été nettoyé par le Cleaner, le rôle reste masqué. Un « inconnu » trahit sa présence.",
          },
        ],
      },
    ],
  },
  medium: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Écoute les morts",
            body: "Tu lis en permanence le chat du Conseil des morts.",
          },
          {
            tag: "Lecture seule",
            body: "Tu ne peux jamais y écrire : impossible de répondre aux défunts ni de te trahir par ce canal.",
          },
        ],
      },
    ],
  },
  policier: {
    cleanCapacity: "1×/tour. Désigne 1 joueur : verdict binaire, Méchant ou non.",
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Trois lames passent blanches",
            body: "Le Tueur, le Croque-mitaine et le Stratège t'apparaissent « non-Méchant ». Un verdict innocent n'écarte jamais ces trois-là.",
          },
          {
            tag: "Tout Neutre est suspect",
            body: "Chaque Neutre ressort « soupçons », même un rôle inoffensif (Oracle, Empoisonneur…). Suspect n'est pas Méchant.",
          },
          {
            tag: "L'Usurpateur te berne",
            body: "L'Usurpateur ressort sous sa couverture Civil : tu le vois « non-Méchant ». Seul l'Assistant du détective le démasque.",
          },
          {
            tag: "Faction, pas rôle",
            body: "Tu n'obtiens qu'un « Méchant : oui/non » — jamais le rôle précis.",
          },
        ],
      },
    ],
  },
  saint: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Immunité totale",
            body: "Ta bénédiction rend un joueur (toi compris) intouchable pendant 2 tours complets.",
          },
          {
            tag: "Piège mortel",
            body: "Si le Saint est emprisonné par un vote, les Civils perdent immédiatement. Reste hors de soupçon.",
          },
          {
            tag: "Un seul usage",
            body: "1×/partie : choisis avec soin qui vaut la bénédiction.",
          },
        ],
      },
    ],
  },
  temoin: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Un allié sûr",
            body: "Dès le départ, tu connais l'identité et le rôle exact d'un Civil : une confiance garantie.",
          },
          {
            tag: "À exploiter finement",
            body: "Cet allié ignore que tu le connais. Défendre trop ouvertement quelqu'un peut te griller.",
          },
        ],
      },
    ],
  },
  vengeur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Deux Civils connus",
            body: "Tu choisis ton être cher parmi 2 Civils proposés : tu sais donc que ces deux-là sont sûrs.",
          },
          {
            tag: "Armé par le deuil",
            body: "Tu ne reçois ton couteau que si ton être cher meurt. Sans ça, tu restes un Civil sans capacité.",
          },
          {
            tag: "Vengeance faillible",
            body: "Ton couteau est une attaque comme une autre : une protection peut sauver ta cible, et rien ne garantit que tu frappes le vrai coupable.",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── MÉCHANTS ───────────────────────────
  cartomancien: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Lis les soupçons",
            body: "Tu vois le tableau de suspicion d'une cible : ses anneaux et couleurs, pour ton camp.",
          },
          {
            tag: "Jamais les notes",
            body: "Le texte écrit à la main reste privé : tu n'obtiens que les marquages colorés.",
          },
        ],
      },
    ],
  },
  cleaner: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Efface un mort",
            body: "Sur une victime d'une attaque méchante, tu supprimes son rôle : faction publique « Inconnue », Légiste aveuglé.",
          },
          {
            tag: "Attaques concernées",
            body: "Tueur, Croque-mitaine, ou tout objet d'origine méchante (couteau de l'Armurier, même volé ou joué par un Civil).",
          },
          {
            tag: "Rare et précieux",
            body: "1×/partie — 2× à 10 joueurs ou plus. À réserver aux morts qui pourraient trahir ton camp.",
          },
        ],
      },
    ],
  },
  croque_mitaine: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Deux proies, une mort",
            body: "Tu désignes 2 joueurs : le hasard choisit lequel meurt.",
          },
          {
            tag: "Le survivant est prévenu",
            body: "L'autre cible reçoit « Vous avez survécu à un danger » : elle sait qu'on l'a visée.",
          },
          {
            tag: "Insoupçonné",
            body: "Tu ressors « non-Méchant » à la police : un contrôle ne te trahit pas.",
          },
        ],
      },
    ],
  },
  maitre_chanteur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Musèle une capacité",
            body: "Ta cible a sa capacité désactivée le tour suivant. Vise les gêneurs (enquêteurs, protecteurs).",
          },
          {
            tag: "Statut visible",
            body: "La cible reçoit le statut « sous chantage » : elle sait qu'elle est bloquée, sans savoir par qui.",
          },
        ],
      },
    ],
  },
  marionnettiste: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Tu joues à sa place",
            body: "Tu prends le contrôle de la capacité de ta cible et la déclenches toi-même, une seule fois.",
          },
          {
            tag: "Cible bloquée",
            body: "La cible voit le statut « Manipulé » et ne peut plus agir ce tour.",
          },
          {
            tag: "Retourne une arme",
            body: "Fais tuer un allié de ta cible, ou gaspille une capacité civile précieuse en la détournant.",
          },
        ],
      },
    ],
  },
  mouchard: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Un rôle dès le départ",
            body: "Au setup, tu apprends le rôle exact d'un joueur de ton choix. Révélation permanente.",
          },
          {
            tag: "Avantage d'ouverture",
            body: "Cette info précoce oriente ton camp : partage-la aux Méchants pour cibler ou éviter les bons joueurs.",
          },
        ],
      },
    ],
  },
  stratege: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Mort annoncée",
            body: "Ta cible marquée est prévenue qu'elle est visée — et le message révèle qu'un Stratège la traque. Elle meurt à l'Annonce du tour suivant.",
          },
          {
            tag: "Fenêtre de contre",
            body: "Une protection peut la sauver, ou toi être neutralisé avant : la marque n'est pas garantie.",
          },
          {
            tag: "Couteau de secours",
            body: "Tu as aussi un couteau pour frapper immédiatement, sans délai ni avertissement.",
          },
          {
            tag: "Blanchi par la police",
            body: "Comme les autres tueurs, tu ressors « non-Méchant » à la police.",
          },
        ],
      },
    ],
  },
  tueur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Camouflé en Citoyen",
            body: "Toutes les enquêtes te prennent pour un Civil : Policier « non-Méchant », Boussole « même camp », Mouchard « Citoyen ». Seul l'Assistant du détective te voit sous ton vrai rôle.",
          },
          {
            tag: "La lame se transmet",
            body: "Si tu es emprisonné ou tué, un Acolyte vivant et libre devient Tueur au hasard. Le crime survit.",
          },
          {
            tag: "Tes alliés te suivent",
            body: "Tes complices Méchants sont prévenus de ta cible. La victime, elle, n'est avertie de rien.",
          },
          {
            tag: "Une frappe par Enquête",
            body: "La mort n'est révélée qu'à l'Annonce suivante : soigne tes alibis d'ici là.",
          },
        ],
      },
    ],
  },
  usurpateur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Fausse identité fixe",
            body: "Au setup, tu choisis 1 couverture parmi 3 rôles absents. Elle est verrouillée pour toute la partie.",
          },
          {
            tag: "Trompe les enquêtes",
            body: "Toutes les enquêtes sur toi renvoient ce faux rôle — parfait pour te faire passer pour un Civil.",
          },
          {
            tag: "Faille : l'Assistant",
            body: "L'Assistant du détective, lui, te voit sous ton vrai rôle — « L'Usurpateur » figure dans son trio. Méfie-toi de qui pourrait l'être.",
          },
        ],
      },
    ],
  },

  // ─────────────────────────── NEUTRES ───────────────────────────
  chasseur_de_vampire: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Éveillé par le sang",
            body: "Tu n'apparais qu'après la 1re morsure du Vampire : avant, ta chasse n'a pas commencé.",
          },
          {
            tag: "Détecteur de crocs",
            body: "Chaque tour, tu apprends si une cible est Vampire ou non.",
          },
          {
            tag: "Immunisé",
            body: "La morsure ne peut ni te tuer ni te convertir : traque sans crainte d'être retourné.",
          },
        ],
      },
    ],
  },
  empoisonneur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Victoire par le poison",
            body: "Tu gagnes si tous les survivants hors de prison sont empoisonnés. Joue la patience.",
          },
          {
            tag: "La prison t'échappe",
            body: "Un joueur emprisonné ne compte pas : garde un œil sur les cellules pour ta condition de victoire.",
          },
          {
            tag: "Suivi en direct",
            body: "Ton panneau liste en temps réel qui est empoisonné et qui reste à atteindre.",
          },
        ],
      },
    ],
  },
  entremetteur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Deux destins liés",
            body: "Au setup, tu lies 2 autres joueurs : si l'un meurt, l'autre meurt automatiquement.",
          },
          {
            tag: "Protège le couple",
            body: "Tu gagnes si les deux liés survivent jusqu'à la fin : veille discrètement sur eux.",
          },
        ],
      },
    ],
  },
  heritier_dechu: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Faux Civil",
            body: "Tu enquêtes (« Méchant ou non ») sous des airs honnêtes, mais tu joues pour les Méchants.",
          },
          {
            tag: "Condition de victoire",
            body: "Tu gagnes avec les Méchants si un Tueur est encore en vie à la fin de la partie.",
          },
          {
            tag: "Double jeu",
            body: "Rends-toi utile aux Civils pour gagner leur confiance, tout en protégeant le Tueur.",
          },
        ],
      },
    ],
  },
  imitateur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Hérite d'un mort",
            body: "1×/partie, tu prends intégralement le rôle du dernier joueur mort — capacité comprise.",
          },
          {
            tag: "Question de timing",
            body: "Attends la mort d'un rôle qui t'arrange : un mauvais mort t'enferme dans un rôle faible.",
          },
          {
            tag: "Suspect avant l'héritage",
            body: "Tant que tu n'as pas copié, tu apparais suspect au Policier.",
          },
        ],
      },
    ],
  },
  oracle: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Parie sur un camp",
            body: "À la 1re Enquête, tu choisis une prophétie : victoire des Civils, des Méchants, ou d'un Neutre.",
          },
          {
            tag: "Rester en vie",
            body: "Tu ne gagnes que si ta prophétie se réalise ET que tu es vivant à la fin. Survivre est ta priorité.",
          },
        ],
      },
    ],
  },
  parieur_tricheur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Dés truqués",
            body: "En duel, tu lances 3 dés et gardes le meilleur ; ta cible n'en lance qu'un. La chance penche pour toi.",
          },
          {
            tag: "Le perdant meurt",
            body: "Le plus petit score meurt à la prochaine Annonce (une protection peut le sauver). Égalité : on relance.",
          },
          {
            tag: "Ton pari te tue",
            body: "Si tu perds un pari, c'est toi qui tombes. Tu gagnes seulement en restant le dernier en vie.",
          },
        ],
      },
    ],
  },
  vampire: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Mords et convertis",
            body: "Chaque tour (cooldown 1 phase), tu convertis un non-vampire : ton clan grandit dans l'ombre.",
          },
          {
            tag: "La 1re morsure sonne l'alarme",
            body: "Elle déclenche une annonce publique anonyme et fait émerger le Chasseur de Vampire.",
          },
          {
            tag: "Victoire par le nombre",
            body: "Le clan l'emporte en dominant le manoir : équilibre discrétion et vitesse de conversion.",
          },
        ],
      },
    ],
  },
  veuve_noire: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Deux proies piégées",
            body: "Chaque Enquête, tu désignes 2 cibles. Si l'une d'elles vote contre toi, les deux meurent.",
          },
          {
            tag: "Arme de dissuasion",
            body: "La menace protège autant que le piège : bien annoncée, elle décourage les votes contre toi.",
          },
        ],
      },
    ],
  },
  armurier: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Don anonyme",
            body: "Tu remets un couteau à un joueur vivant : il ignore que l'arme vient de toi.",
          },
          {
            tag: "Une lame par Enquête",
            body: "1×/Enquête. Le porteur peut s'en servir une fois pour tuer — la mort tombe à l'Annonce.",
          },
          {
            tag: "À double tranchant",
            body: "Tu ne choisis pas qui il vise : arme un joueur en qui tu as confiance.",
          },
        ],
      },
    ],
  },
  paranoiaque: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Cible imposée",
            body: "Le manoir t'assigne une cible au hasard : tu ne la choisis pas.",
          },
          {
            tag: "Protéger ou tuer",
            body: "1×/partie, tu tranches : la protéger ou la tuer (résolu à l'Annonce). À toi de deviner son camp.",
          },
          {
            tag: "Un seul coup",
            body: "Ta décision est définitive : aucune seconde chance si tu te trompes.",
          },
        ],
      },
    ],
  },
  journaliste: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Espionne un tableau",
            body: "Tu lis le tableau de suspicions d'un joueur jusqu'au prochain tour : tu vois qui il soupçonne.",
          },
          {
            tag: "Verrou d'un tour",
            body: "Le lien se réinitialise à chaque tour : choisis bien qui tu surveilles.",
          },
          {
            tag: "Aveuglé par la falsification",
            body: "Si ta cible a été falsifiée, tu ne lis rien de fiable.",
          },
        ],
      },
    ],
  },
  voleur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Objet le plus récent",
            body: "Tu dérobes le dernier objet reçu par ta cible — vivante ou morte.",
          },
          {
            tag: "Fouille les morts",
            body: "Les cadavres gardent leurs objets : un mort est une proie facile à détrousser.",
          },
          {
            tag: "Main vide",
            body: "Si ta cible n'a aucun objet, ton tour est perdu.",
          },
        ],
      },
    ],
  },
  conservateur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Reliques au hasard",
            body: "Tu confies une relique tirée au sort : certaines aident, d'autres piègent leur porteur.",
          },
          {
            tag: "Le Cœur du Manoir",
            body: "Une relique rarissime : la confier déclenche ta victoire immédiate.",
          },
          {
            tag: "Deux dons par tour",
            body: "Tu distribues jusqu'à 2 reliques par Enquête.",
          },
        ],
      },
    ],
  },
  accusateur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Marque suspecte",
            body: "Tu désignes un joueur : il apparaît suspect à toute la table pendant 1 tour.",
          },
          {
            tag: "Pression sur le vote",
            body: "La marque oriente les soupçons — pratique pour pousser un lynchage.",
          },
          {
            tag: "Bloqué par la bénédiction",
            body: "Un joueur béni par le Saint échappe à ton accusation.",
          },
        ],
      },
    ],
  },
  voisin: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Surveille une porte",
            body: "Tu observes un joueur : tu apprends le rôle de tous ceux qui viennent le cibler.",
          },
          {
            tag: "Repère les rôdeurs",
            body: "Idéal pour démasquer un tueur ou un manipulateur qui s'en prend à ton voisin.",
          },
          {
            tag: "Aveuglé par la falsification",
            body: "Si ta cible a été falsifiée, tes observations ne révèlent rien.",
          },
        ],
      },
    ],
  },
  falsificateur: {
    pages: [
      {
        title: "Subtilités",
        notes: [
          {
            tag: "Piste brouillée",
            body: "Tu maquilles un joueur : toute enquête sur lui renvoie « falsifié » et ne révèle rien.",
          },
          {
            tag: "Effet permanent",
            body: "La falsification dure jusqu'à la fin de la partie — un seul geste, protection durable.",
          },
          {
            tag: "Couvre un allié",
            body: "Parfait pour cacher un Méchant des Policiers, Détectives et autres fouineurs.",
          },
        ],
      },
    ],
  },
};

/** Récupère les infos supplémentaires d'un rôle (ou null s'il n'en a pas). */
export function extraInfoFor(slug: string | null | undefined): RoleExtraInfo | null {
  if (!slug) return null;
  return ROLE_EXTRA_INFO[slug] ?? null;
}
