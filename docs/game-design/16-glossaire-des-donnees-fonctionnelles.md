# 16 — Glossaire des données fonctionnelles

Les informations que le jeu doit **conceptuellement connaître** pour fonctionner — indépendamment de tout stockage ou modèle technique. Colonnes : propriétaire logique, visibilité (renvoie aux classes de [08](08-information-secrete-et-visibilite.md)), création, durée, modifiable, dépendances, **criticité de reprise** (indispensable pour reprendre une partie interrompue ?).

## Session

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Code de partie | Identifiant à 6 caractères pour rejoindre | La partie | Publique (à qui le détient) | Création | Vie de la partie | Non | Indispensable |
| Mode | MJ / Joueur Only | La partie | Publique | Création | Vie de la partie | Non | Indispensable |
| Statut de partie | Salon → Salle d'attente → En cours → Terminée | La partie | Publique | Création | — | Par le jeu seul | Indispensable |
| Paramètres de durée | Durées d'Enquête/Débat/Vote | La partie | Publique (salon) | Salon | Vie de la partie | Hôte (avant lancement) | Indispensable |
| Variante Suspicion | Option activée ou non | La partie | Publique (salon) | Salon | Vie de la partie | Hôte (avant lancement) | Indispensable |
| Configuration du pool | Slots (faction, type, rôle épinglé, verrou) + bans | La partie | Hôte (salon) | Salon | Jusqu'au tirage | Hôte | Non (après tirage) |
| Drapeau de pause | Suspension de l'avancement | La partie | Publique | En partie | Ponctuel | MJ | Indispensable |
| Vainqueur + raison | Camp gagnant et explication | La partie | Publique | Fin | Jusqu'à purge | Non | Indispensable (fin) |

## Participants

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Identité de session | Reconnaissance stable d'un appareil/joueur sans compte | Le joueur | Système | Première visite | Persistante | Non | Indispensable |
| Pseudo | Nom affiché (≤10 caractères) | Le joueur | Publique | Entrée | Partie | Avant lancement (`À CONFIRMER` après) | Indispensable |
| Avatar | Portrait choisi | Le joueur | Publique | Salon | Partie | Oui (salon) | Souhaitable |
| Qualité (joueur / MJ / bot) | Nature du participant | La partie | Publique (couronnes) | Entrée | Partie | Transfert lead/MJ | Indispensable |
| Présence | Le participant est-il actif à l'instant | Système | Système (sert aux mécanismes internes) | Continu | Éphémère | — | Non |

## Rôles et factions

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Rôle attribué | Le rôle secret d'un joueur | Le joueur (secret) | Privée joueur (+MJ) | Lancement | Partie | Par règle uniquement (Imitateur, successions) | Indispensable |
| Faction courante | Camp effectif (peut changer : conversion) | Le joueur | Privée joueur (+équipes concernées) | Lancement | Partie | Morsure, successions | Indispensable |
| Rôle d'origine | Trace avant conversion/copie | Le joueur | Privée (révélée en fin) | À l'événement | Partie | Non | Importante |
| Couverture (Usurpateur) | Faux rôle civil verrouillé | Le joueur | Sert les réponses d'enquête | Tour 1 | Partie | Non (après verrouillage) | Indispensable |
| Connaissances d'équipe | Liste des alliés (Méchants, clan, couple) | Les groupes | Privée faction | Lancement / événement | Partie | Évolue (conversions) | Indispensable |
| Catalogue des rôles | Définitions : nom, faction, type, texte de capacité, subtilités, limites, poids de tirage, effectif minimal | Le jeu | Publique (aide) | Hors partie | Permanente | Éditoriale | Indispensable |

## Phases et temps

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Tour courant | Numéro de cycle | La partie | Publique | Lancement | — | Jeu | Indispensable |
| Phase courante | Enquête/Annonce/Débat/Vote | La partie | Publique | Transitions | — | Jeu / MJ | Indispensable |
| Horodatage de début de phase | Référence du chrono, sur l'horloge commune | La partie | Publique | Transition | Phase | Non | Indispensable |
| Horloge de référence | Temps « officiel » partagé | Système | Système | Continu | — | — | Indispensable |

## Actions, votes et effets

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Intention | Action différée en attente (auteur, catégorie, cible(s), origine, préconditions) | Le jeu | Système (MJ en aperçu) | Enquête | Jusqu'à résolution | Annulable par règle | Indispensable |
| Dénouement d'action | Résultat (réussite/échec/info) rattaché à l'action | L'auteur | Privée joueur | Résolution | Historique | Non | Importante |
| Compteurs d'usage | Usages consommés (par tour, par partie, budgets, alternances, délais de réutilisation) | Le joueur | Privée joueur | Au fil du jeu | Partie | Jeu | Indispensable |
| Vote du tour | Bulletin secret (votant → cible) ou abstention | Le votant | Privée joueur (bulletins) ; participation agrégée publique | Vote | Le tour | Remplaçable jusqu'à clôture | Indispensable (tour courant) |
| Verdict du tour | Résultat du dépouillement (emprisonné, égalité) | La partie | Publique | Clôture | Historique | Non | Indispensable |
| Statuts de joueur | Empoisonné, bloqué, béni, ivre, manipulé, protégé, marqué, amoureux… avec leur fenêtre | Le joueur | Privée joueur (+MJ) ; certains publics (marque Suspect) | Effets | Selon statut | Jeu | Indispensable |
| État vital | Vivant / condamné (mort différée) / mort ; libre / emprisonné (avec date d'écrou) | Le joueur | État public (vivant/prison/mort) ; la condamnation différée est cachée | Événements | Partie | Jeu | Indispensable |
| Marquages spécialisés | Patrouille, garde levée, aspersion, photos prises, « époux », paires du duel, protégés désignés… | Le jeu | Privée selon règle | Enquête | Selon règle | Jeu | Indispensable |

## Objets et inventaire

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Objet | Nature, description, charge, **couleur d'origine** (survit au vol) | Le détenteur | Privée joueur (inspectable par règle) | Setup / dons / livraisons | Jusqu'à consommation | Transférable (vol, braquage, duplication, don) | Indispensable |
| Inventaire | Objets détenus, y compris par les morts (pillables) | Le joueur | Privée joueur | Continu | Partie | Jeu | Indispensable |
| Compteur objet/tour | « 1 objet par tour » | Le joueur | Système | Usage | Le tour | Jeu | Indispensable |
| Indices distribués | Contenus des indices/fragments et leurs porteurs | Les porteurs | Privée joueur | Setup | Partie | Non | Importante |

## Événements et historique fonctionnel

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Dépêche publique | Entrée de Gazette (mort+faction, prison, libération, événement anonyme, exécution) avec son rang chronologique | La partie | Publique | Événement | Historique | Non | Indispensable |
| Notification privée | Message ciblé à un joueur (modale, information de rôle) | Le destinataire | Privée joueur | Événement | Historique | Non | Importante |
| Journal MJ | Version omnisciente des événements | Le MJ | MJ | Continu | Partie | Non | Importante (Mode MJ) |
| Testament | Texte du joueur, publié à sa mort | Le joueur | Privée → publique (mort) | Rédaction | Partie | Tant que vivant | Importante |
| Chats | Équipe méchante, Conseil des Morts, parloir | Les canaux | Privée faction/canal | Continu | Partie | Ajout seul | Importante |
| Mur des suspicions | Classement privé des autres joueurs | Le joueur | Privée (espionnable ; agrégée en variante) | Continu | Partie | Oui | Importante (variante : indispensable) |
| Journal des visiteurs | Qui a agi sur un joueur surveillé, dans l'ordre | Le Guetteur | Privée joueur | Surveillance | Historique | Non | Importante |
| Suivi de lecture | Annonces lues/non lues | Le joueur (par appareil) | Locale | Continu | Local | Oui | Non (cosmétique) |

## Déconnexions et cycle de vie

| Donnée | Définition | Propriétaire | Visibilité | Création | Durée | Modifiable | Reprise |
|---|---|---|---|---|---|---|---|
| Dernière partie rejointe | Référence de reprise rapide (< 24 h) | Le joueur (appareil) | Locale | Entrée en partie | 24 h / fin | Effaçable | Utile |
| Échéances de purge | Fin + ~30 min ; lancement + 4 h | Système | Système | Fin / création | — | — | — |
