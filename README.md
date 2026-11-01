# LINK

Application sociale internationale pour trouver avec qui partager concerts, festivals, rooftops, voyages et sorties — iOS, Android et web.

- **Prototype en ligne** : https://1blazeleplufor.github.io/link-app/
- **Dossier de cadrage (Phase 0)** : https://1blazeleplufor.github.io/link-app/cadrage.html · [version Markdown](documentation/PHASE0_CADRAGE.md)

## Contenu du dépôt

| Dossier | Contenu | État |
|---|---|---|
| `prototype/` | Prototype web interactif (vanilla JS, une seule page) : 6 langues, 13 villes, 3 directions visuelles, données de démo | Fonctionne, testé en navigateur |
| `docs/` | Site publié sur GitHub Pages (prototype + dossier de cadrage), généré automatiquement | Déployé par `.github/workflows/pages.yml` |
| `supabase/` | Migrations PostgreSQL (schéma, RLS, fonctions métier), données de référence, Edge Functions (paiement Stripe, webhook, QR, scan, identité), tests de sécurité | Schéma + 41 tests OK ; fonctions à déployer |
| `shared/` | Logique partagée app + serveur : prix, recommandations expliquées, QR tournant, règles d'invitation | 14 tests OK |
| `mobile/` | App Expo / React Native (iOS + Android) | Écrite, à installer et compiler |
| `admin/` | Console de modération (Next.js) | Première page |
| `documentation/` | Dossier de cadrage | — |

## Lancer chaque partie

```bash
# Prototype
cd prototype && ./build.sh          # régénère prototype/index.html et docs/index.html
open ../docs/index.html

# Tests de sécurité de la base (PostgreSQL local requis)
supabase/tests/run.sh

# Tests de la logique partagée (Node 22 + tsx)
cd shared && npx tsx --test test/*.test.ts

# Cohérence des 6 langues
node scripts/check-i18n.mjs

# App mobile
cd mobile && npm install && npx expo install --fix
cp .env.example .env.local          # renseigner les clés Supabase / Stripe de TEST
npx expo start                      # puis i (iOS) ou a (Android)

# Backend Supabase (CLI Supabase requis)
supabase link --project-ref <ref>
supabase db push && psql "$DB_URL" -f supabase/seed.sql
scripts/sync-shared.sh && supabase functions deploy
supabase secrets set TICKETING_MODE=test STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… TICKET_QR_SECRET=… KYC_API_KEY=… KYC_WEBHOOK_SECRET=… ALLOWED_ORIGINS=…
```

## Variables d'environnement

Aucun secret n'est dans le dépôt. Modèles : `mobile/.env.example`, `admin/.env.example`. Secrets serveur (Supabase) :

| Variable | Rôle |
|---|---|
| `TICKETING_MODE` | `disabled` (défaut) / `test` / `live`. `live` seulement avec contrat et droits de vente confirmés |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiements (clé `sk_test_` obligatoire en mode test) |
| `LINK_FEE_RATE` | Commission LINK, `0` au lancement |
| `TICKET_QR_SECRET` | Signature des QR tournants (32+ caractères aléatoires) |
| `KYC_PROVIDER`, `KYC_API_URL`, `KYC_API_KEY`, `KYC_WEBHOOK_SECRET`, `KYC_SIGNATURE_HEADER`, `KYC_RETURN_URL` | Prestataire de vérification d'identité |
| `ALLOWED_ORIGINS` | CORS strict pour les fonctions |

## Règles de sécurité clés (appliquées côté serveur et testées)

- Âge minimum 18 ans imposé par la base ; la date de naissance n'est jamais exposée (vue `public_profiles`).
- Seul le webhook du prestataire d'identité peut marquer quelqu'un comme vérifié.
- Invitations et messages : identité vérifiée obligatoire, blocages respectés, 20 invitations / 24 h maximum.
- Sorties publiques visibles seulement après modération ; sorties privées visibles des seuls membres et invités.
- Billets émis uniquement après paiement confirmé (webhook idempotent, montant vérifié), QR tournant signé, usage unique, révocation au remboursement.
- Chaque décision de modération et de vérification est journalisée (`audit_logs`).

## Prochaines étapes

Voir la section 10 du [dossier de cadrage](documentation/PHASE0_CADRAGE.md).
