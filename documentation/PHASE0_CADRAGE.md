# LINK — Dossier de cadrage (Phase 0)

*Préparé par Claude pour Indira Henry · 2 novembre 2026 · version 1*

Ce dossier répond à la Phase 0 du cahier des charges LINK : architecture recommandée, services à ouvrir et leurs coûts, risques, MVP, critères d'acceptation, directions de marque et décisions qui t'attendent. Il s'appuie sur ce qui a déjà été construit et testé cette nuit (voir la matrice en section 9).

**Liens utiles**
- Prototype à essayer sur téléphone : https://1blazeleplufor.github.io/link-app/
- Code source complet : https://github.com/1blazeleplufor/link-app

---

## 1. Résumé en une minute

- **LINK peut se construire avec une seule base de code** pour iPhone et Android (React Native + Expo), un backend Supabase (PostgreSQL) et Stripe pour les paiements. C'est le choix qui coûte le moins au démarrage tout en tenant la charge, la sécurité et la billetterie.
- **Ce qui existe déjà** : un prototype cliquable en 6 langues, et une vraie base technique : schéma de base de données, règles de sécurité testées (41 contrôles automatiques passent), paiement et billets côté serveur, application mobile.
- **Ce qui bloque le lancement n'est pas technique** : il faut une société (ou un statut) au nom de LINK, des comptes Apple / Google / Stripe / prestataire d'identité, des contrats avec des organisateurs pour vendre des billets, et des textes juridiques (CGU, confidentialité).
- **Budget de départ réaliste** : environ 100 € de frais fixes la première année hors développement (comptes stores), puis 25 à 100 €/mois de services, plus des frais à l'usage (paiements, vérifications d'identité).

## 2. Architecture recommandée

| Brique | Choix | Pourquoi |
|---|---|---|
| App iOS + Android | **React Native + Expo + TypeScript** (Expo Router) | Une seule base de code, accès natif (caméra pour le scan, notifications push, localisation approximative, Apple Pay / Google Pay via Stripe). Builds et publication stores via EAS. |
| Backend & base | **Supabase** (PostgreSQL managé, Auth, Storage, Realtime, Edge Functions) | Les règles d'accès sont écrites *dans la base* (Row Level Security) : même si l'app est contournée, personne ne lit un message ou un billet qui n'est pas le sien. Hébergement possible en UE (Francfort/Paris) pour le RGPD. |
| Paiements | **Stripe** (Payment Sheet + Connect pour reverser aux organisateurs) | Couvre les 10 pays des 13 villes, Apple Pay / Google Pay, remboursements, litiges, versements aux organisateurs. Aucun numéro de carte ne transite par LINK. |
| Vérification d'identité | **Veriff** (recommandé), alternatives Onfido, Persona, Didit | Flux hébergé (pièce + selfie + détection du vivant), webhook signé. LINK ne garde que le résultat et une référence. |
| Console admin | **Next.js** sur Vercel, connexion staff avec MFA | Mêmes règles de sécurité que l'app ; chaque décision de modération est journalisée. |
| Notifications | Expo Push (APNs / FCM) | Catégories et heures calmes réglables, marketing en opt-in seulement. |
| Cartes | Mapbox ou Google Maps Platform (à arbitrer selon le prix au volume) | Positions toujours approximatives pour les personnes. |
| Suivi d'erreurs | Sentry ; analytics respectueux de la vie privée (PostHog UE ou Plausible) | Pas de revente de données, consentement pour la mesure non essentielle. |

**Environnements séparés** : développement, staging (mode test Stripe et prestataire d'identité en sandbox), production. Les clés ne sont jamais dans le code (fichiers `.env.example` fournis, secrets dans Supabase et EAS).

### Décisions techniques (ADR)

1. **ADR-01 — Expo plutôt que deux apps natives.** Une équipe réduite livre iOS et Android en même temps ; les besoins (caméra, push, paiement, localisation) sont tous couverts par des modules Expo maintenus. Révisable si une fonctionnalité exige du natif pur.
2. **ADR-02 — Sécurité dans la base, pas seulement dans l'app.** Invitations et messages passent par des fonctions SQL qui revérifient l'identité vérifiée, les blocages et les quotas. Testé automatiquement.
3. **ADR-03 — Les billets ne sont émis que par le serveur, après confirmation de Stripe.** Le webhook est idempotent : un événement reçu deux fois n'émet pas de billets en double ; un montant différent est refusé.
4. **ADR-04 — QR code tournant.** Le QR change toutes les 30 secondes (signature HMAC), une capture d'écran devient vite inutilisable, et chaque billet ne passe qu'une fois à l'entrée.
5. **ADR-05 — Billetterie derrière un interrupteur.** `TICKETING_MODE = disabled | test | live`, plus un drapeau `sale_enabled` par événement. Afficher un événement ne donne jamais le droit d'en vendre les billets.
6. **ADR-06 — Villes, langues et catégories sont des données.** Les 13 villes prioritaires sont configurées ; l'admin en ajoute d'autres sans modifier l'app.

## 3. Comptes à ouvrir et coûts

Les tarifs ci-dessous ont été relevés le 2 novembre 2026 sur les sites des fournisseurs. Ils évoluent : à revérifier au moment de souscrire.

| Service | À quoi ça sert | Coût | Qui ouvre |
|---|---|---|---|
| Apple Developer Program | Publier sur l'App Store, Sign in with Apple, Apple Pay | 99 $/an | Indira (au nom de la société de préférence, avec un numéro D-U-N-S) |
| Google Play Console | Publier sur Google Play | 25 $ une fois | Indira |
| Supabase | Base, comptes, stockage, temps réel, fonctions | Gratuit pour développer, **Pro 25 $/mois** en production | Indira (le développeur est invité) |
| Stripe | Paiements, remboursements, versements aux organisateurs | Cartes UE standard **1,5 % + 0,25 €**, premium 2,8 % + 0,25 €, britanniques 2,5 % + 0,25 €, internationales 3,15 % + 0,25 €, +2 % en cas de conversion de devise. Connect : **2 € par organisateur actif/mois + 0,25 % + 0,10 € par versement** si LINK fixe ses propres tarifs | La société LINK (KYC Stripe obligatoire) |
| Veriff (identité) | Pièce + selfie + vivacité | Essential **49 $/mois minimum, 0,80 $ par vérification** ; Plus 99 $/mois, 1,39 $ (avec revue humaine) ; contrôle PEP/sanctions +0,64 $ | La société LINK |
| Expo EAS | Compilation et envoi aux stores | Offre gratuite suffisante au début | Indira |
| Nom de domaine + e-mail | Site vitrine, e-mails de connexion, support | ~15 à 60 €/an | Indira |
| Vercel (console admin) | Héberger la console | Gratuit au début | Indira |
| Juriste (ponctuel) | CGU, confidentialité, contrats organisateurs, revente de billets | Devis à demander | Indira |

**Exemple de coût d'usage** : 1 000 personnes vérifiées par mois ≈ 800 $ chez Veriff (Essential). Un billet à 20 € payé par carte UE standard coûte 0,55 € de frais Stripe.

## 4. Ce qui est faisable tout de suite / ce qui dépend d'autre chose

**Faisable immédiatement (déjà commencé)** : app et navigation, 6 langues, profils et préférences, découverte locale / internationale / personnalisée, sorties publiques modérées et privées, invitations et messagerie sécurisées, blocage et signalement, console de modération, export des données personnelles.

**Dépend d'un compte ou d'un contrat**
- Connexion Apple et Google : comptes développeurs.
- Vérification d'identité réelle : contrat prestataire et clés API.
- Paiement réel : compte Stripe de la société, mode test d'abord.
- **Vente de billets d'un événement donné** : un contrat avec l'organisateur ou une API qui accorde explicitement le droit de vendre. Sans cela, l'événement est affiché sans bouton d'achat.
- Événements en grand nombre : partenariats ou API officielles (pas de scraping de sites sans autorisation).
- Publication sur les stores : comptes, politique de confidentialité en ligne, fiche App Store / Play.

**Dépend d'une validation juridique** : CGU et règles communautaires, politique de confidentialité et registre des traitements RGPD, conditions de vente et de remboursement des billets, règles d'âge et d'alcool par pays (21+ fréquent à New York), conservation des messages.

## 5. Risques principaux et parades

| Risque | Parade prévue |
|---|---|
| Revente de billets sans droit (litiges, interdictions locales, revente illicite en France) | Interrupteur par événement, contrat obligatoire avant activation, catégories A/B/C/D distinguées dans les données. |
| Comptes mineurs, prédateurs, faux profils | Âge ≥ 18 imposé par la base, vérification d'identité avant tout contact, blocage immédiat, signalement « semble mineur », sanctions graduées et journal d'audit. |
| Règles Apple / Google sur les paiements | Les billets d'événements physiques relèvent des « biens et services consommés hors de l'app » (règle App Store 3.1.3(e)) : paiement par Stripe, pas par l'achat intégré Apple. À revérifier au dépôt. |
| Données sensibles d'identité | Jamais stockées chez LINK : seulement statut, date et référence du prestataire. |
| Coût de la vérification d'identité qui grimpe vite | Vérifier seulement avant la première invitation ou le premier message, pas à l'inscription ; découverte ouverte sans vérification. |
| Sécurité des sorties (soirées, voyages) | Conseils de sécurité dans les messages, lieux de rendez-vous publics, adresse privée partagée seulement après accord de l'hôte. |
| Dépendance à un fournisseur | Couches d'abstraction : sources d'événements, prestataire d'identité et paiement sont interchangeables. |

## 6. MVP proposé (premier lancement)

1. Inscription e-mail / téléphone / Apple / Google, profil, préférences, 6 langues.
2. Découverte d'événements dans les 13 villes (événements partenaires + sorties communautaires modérées) avec les 3 modes.
3. Vérification d'identité, puis invitations, groupes et messagerie.
4. Sorties publiques (modérées) et privées.
5. Blocage, signalement, console de modération.
6. **Billetterie en mode test** pour 1 ou 2 organisateurs partenaires, passée en réel seulement après contrat.

Hors MVP : dating (facultatif, désactivé par défaut), comptes organisateurs en libre-service, cartes interactives, recommandations avancées, monétisation.

## 7. Critères d'acceptation du MVP

Chaque critère a (ou aura) un test automatique dans le dépôt :
- l'app s'installe et fonctionne sur iPhone et Android ;
- inscription / connexion / déconnexion de tous les appareils ;
- profils et préférences enregistrés côté serveur ;
- 13 villes configurées + recherche de n'importe quelle autre ville ;
- parcours essentiels traduits en 6 langues (contrôle automatique des traductions : **OK**) ;
- un utilisateur non vérifié ne peut ni inviter ni écrire (**testé**) ;
- une sortie publique n'apparaît qu'après modération ; une sortie privée n'apparaît jamais aux autres (**testé**) ;
- un billet n'est émis qu'après paiement confirmé, une seule fois, et ne passe qu'une fois à l'entrée (**testé**) ;
- un remboursement révoque le billet (**testé**) ;
- personne ne lit les commandes, billets ou messages des autres (**testé**).

## 8. Directions de marque à valider

Les trois directions sont **visibles et comparables dans le prototype** (Profil → Direction visuelle, ou dès l'écran d'accueil). Rien n'est figé tant que tu n'as pas choisi.

| Direction | Palette | Typo titres | Esprit |
|---|---|---|---|
| **Fiesta** | corail, tournesol, sarcelle sur fond chaud | Bricolage Grotesque | festif, chaleureux, « apéro entre potes » |
| **Midnight Club** | rose néon, cyan sur bleu nuit (toujours sombre) | Unbounded | nightlife, clubs, festivals |
| **Riviera** | bleu méditerranée, citron, menthe | Syne | voyages, été, rooftops, chic décontracté |

Le logo actuel (« LINK » + deux points qui se rejoignent) est un placeholder : un vrai logo et un dépôt de marque (INPI / EUIPO, à vérifier : le nom « LINK » est très courant) sont à prévoir.

## 9. Ce qui fonctionne réellement aujourd'hui

| Élément | État | Preuve |
|---|---|---|
| Prototype web (6 langues, 3 directions, tous les parcours) | ✅ En ligne | Lien en haut ; parcours testés automatiquement dans un navigateur |
| Schéma de base (utilisateurs, vérifications, villes, événements, sorties, invitations, messages, signalements, commandes, paiements, billets, scans, notifications, rôles, audit) | ✅ Écrit et testé | `supabase/migrations`, 41 contrôles de sécurité passent sur PostgreSQL |
| Logique partagée (prix, recommandations expliquées, QR tournant, règles d'invitation) | ✅ Testée | 14 tests unitaires |
| Fonctions serveur (paiement, webhook Stripe, QR, scan, identité) | 🟡 Écrites, pas encore exécutées | Il faut un projet Supabase et des clés de test |
| App mobile Expo (connexion, découverte, personnes, création, activités, messages, profil, billet, vérification) | 🟡 Écrite, pas encore compilée | L'installation des dépendances n'était pas possible depuis l'environnement de cette nuit |
| Console de modération | 🟡 Première page écrite | À compléter (Phase 6) |
| Vérification d'identité réelle | ⛔ Bloquée | Contrat prestataire |
| Paiement réel / vente de billets | ⛔ Bloqué | Compte Stripe de la société + contrats organisateurs |
| Publication App Store / Google Play | ⛔ Bloquée | Comptes développeurs, textes juridiques |
| Catalogue d'événements réels | ⛔ Bloqué | Partenariats / API autorisées |

Dans le prototype, les événements et les profils sont **fictifs** et marqués comme tels ; la vérification et le paiement y sont **simulés** et affichés « TEST ».

## 10. Plan de travail proposé

| Étape | Contenu | Prérequis |
|---|---|---|
| 1 (1 à 2 semaines) | Choix de la marque, création des comptes, projet Supabase en UE, premier build de test sur ton téléphone (TestFlight / test interne Android) | Tes réponses en section 11 |
| 2 (2 à 4 semaines) | Profils, vérification d'identité en sandbox, découverte branchée sur la vraie base, modération | Compte Veriff (sandbox gratuite) |
| 3 (3 à 5 semaines) | Social complet : invitations, groupes, messagerie temps réel, notifications | — |
| 4 (3 à 4 semaines) | Billetterie en mode test avec un organisateur pilote, scan à l'entrée | Compte Stripe, 1 contrat organisateur |
| 5 (2 à 3 semaines) | Console admin complète, QA, accessibilité, textes juridiques, fiches stores | Juriste |
| 6 | Bêta fermée dans 1 ou 2 villes (Paris d'abord ?), puis ouverture progressive | — |

## 11. Questions qui bloquent vraiment une décision

1. **Quelle direction visuelle** (Fiesta, Midnight Club, Riviera, ou un mélange) ?
2. **Structure juridique** : LINK sera-t-elle portée par une société existante ou à créer (nécessaire pour Stripe, Apple, les contrats) ?
3. **Ville pilote** pour la bêta : Paris seule, ou Paris + une autre ?
4. **Organisateurs partenaires** : as-tu déjà des contacts (lieux, collectifs, festivals) prêts à vendre via LINK ?
5. **Budget mensuel** acceptable pour les services au démarrage (vérification d'identité surtout) ?

---

*Sources des tarifs : [Stripe – tarifs France](https://stripe.com/fr/pricing), [Stripe Connect – tarifs](https://stripe.com/fr/connect/pricing), [Veriff – offres self-serve](https://veriff.com/plans/self-serve), [Supabase – comparatif des offres 2026](https://www.nocode.mba/topics/backend-app-development), [forum développeurs Apple sur les paiements hors app](https://developer.apple.com/forums/thread/767360).*
