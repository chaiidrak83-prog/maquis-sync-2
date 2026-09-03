# Instructions du Projet MaquisSaaS (GEMINI.md)

Ce document sert de guide de référence et d'instructions pour les agents IA et développeurs travaillant sur le projet **MaquisSaaS** (**MaquisSync**).

---

## 1. Vue d'Ensemble du Projet

**MaquisSaaS** est une plateforme SaaS conçue pour la gestion des maquis, bars et restaurants en Afrique de l'Ouest (Burkina Faso, Côte d'Ivoire, etc.). Elle est bâtie selon une architecture **Offline-First**, garantissant un fonctionnement sans interruption même en cas de coupure de réseau Internet.

Le projet est composé de deux briques principales :
1. **Le SaaS Web (Dashboard & Landing Page)** :
   - Présentation marketing et simulateur interactif.
   - Espace **Propriétaire** : Vue financière globale, rapports journaliers automatiques (WhatsApp), alertes de seuils critiques, gestion des abonnements.
   - Espace **Gérant** : Validation des nouvelles serveuses, gestion du catalogue de boissons, ajustements de stocks (casses, pertes, livraisons), historique des pointages.
2. **L'Application Mobile (Expo / React Native)** :
   - Conçue pour Android (package `com.maquissaas.mobile`).
   - Prise de commande ultra-rapide au format caisse (POS) pour les **serveuses**.
   - Paiements en espèces (Cash) et Mobile Money (Orange Money, Moov Money avec syntaxe USSD paramétrable `*144*4*2*[MONTANT]*[NUMERO_CLIENT]#`).
   - Pointage des présences par QR Code.

---

## 2. Stack Technique

| Composant | Technologie | Emplacement |
| :--- | :--- | :--- |
| **Frontend Web** | React 19, Vite 8, Lucide-react | Racine (`/`) |
| **Mobile** | React Native 0.81, Expo 54, Expo Router 6 | `/mobile` |
| **Base de Données** | Supabase (PostgreSQL 15+) | Cloud Supabase |
| **Authentification** | Supabase Auth (Email/Pass) + Téléphone/PIN | `src/services/api.js` & `mobile/` |
| **Schéma SQL** | PostgreSQL DDL avec RLS et Triggers | `supabase/schema.sql` |
| **Spécifications** | Documentation technique | `docs/database_schema.md` |

---

## 3. Structure des Dossiers

```text
Maquis saas 2/
├── .env.example              # Modèle des variables d'environnement Supabase (Web)
├── .env                      # Variables d'environnement locales (Web)
├── index.html                # Point d'entrée HTML
├── package.json              # Dépendances du SaaS Web
├── vite.config.js            # Configuration Vite
├── supabase/
│   └── schema.sql            # Script SQL complet pour Supabase (tables, RLS, triggers, seed)
├── docs/
│   └── database_schema.md    # Documentation du schéma et de la synchronisation
├── src/
│   ├── App.jsx               # Composant principal (Landing, Dashboards, Simulateur)
│   ├── main.jsx              # Point d'entrée React
│   ├── lib/
│   │   └── supabase.js       # Initialisation du client Supabase Web
│   └── services/
│       └── api.js            # Services CRUD & Auth (authService, productService, salesService...)
└── mobile/
    ├── app.json              # Configuration Expo (identifiant Android: com.maquissaas.mobile)
    ├── package.json          # Dépendances Expo / React Native
    ├── app/                  # Routes Expo Router
    │   ├── _layout.tsx       # Layout racine
    │   └── (tabs)/           # Navigation par onglets
    │       ├── index.tsx     # Écran principal
    │       └── explore.tsx   # Onglet secondaire
    ├── components/           # Composants UI React Native
    └── constants/            # Thèmes et couleurs
```

---

## 4. Base de Données & Supabase

Le schéma PostgreSQL dans [`supabase/schema.sql`](file:///c:/Users/hp/.gemini/antigravity/Maquis%20saas%202/supabase/schema.sql) gère les tables suivantes :

1. **`establishments`** : Établissements (Maquis), statut de l'abonnement (Découverte, Accès, Premium), syntaxe USSD.
2. **`users`** : Utilisateurs multi-rôles (`OWNER`, `MANAGER`, `WAITRESS`). Authentification par téléphone et code PIN (`pin_hash`) avec statut d'approbation (`PENDING`, `VALIDATED`, `REJECTED`).
3. **`products`** : Catalogue de boissons (nom, volume, prix, stock initial, stock actuel, image illustrative en base64 pour le cache hors-ligne).
4. **`sales`** : Transactions de vente globales (montant total, mode de paiement `CASH` ou `MOBILE_MONEY`).
5. **`sale_items`** : Lignes de commande détaillées rattachées à une vente (quantité, prix unitaire).
6. **`inventory_adjustments`** : Ajustements de stock (`CASSE`, `PERTE`, `LIVRAISON`, `ERREUR_SAISIE`).
7. **`attendances`** : Pointage des arrivées et départs par QR code ou saisie manuelle.

### Déduction Automatique des Stocks
Un trigger PostgreSQL (`trigger_deduct_stock_on_sale_item`) décrémente automatiquement le stock actuel (`current_stock`) dans `products` à chaque insertion d'un article dans `sale_items`.

---

## 5. Commandes Principales

### SaaS Web
```bash
# Démarrer le serveur de développement local (port 5173)
npm run dev

# Compiler pour la production
npm run build

# Vérifier la qualité du code (linter oxlint)
npm run lint
```

### Application Mobile (Expo)
```bash
cd mobile

# Démarrer Metro Bundler en mode local
npx expo start --offline

# Démarrer sur Android
npx expo start --android

# Réinitialiser le cache Metro en cas de problème
npx expo start -c
```

### Git & Déploiement
```bash
# Dépôt distant GitHub
git remote -v
# origin  https://github.com/chaiidrak83-prog/maquis-sync-2.git

# Pousser les modifications
git push origin main
```

---

## 6. Règles de Développement pour les Agents

1. **Priorité au Hors-Ligne (Offline-First)** :
   - Toutes les fonctionnalités de caisse et de prise de commande doivent pouvoir fonctionner localement même sans réseau.
   - En cas de reconnexion, synchroniser les ventes enregistrées vers Supabase.
2. **Gestion Multi-Rôles** :
   - **Propriétaire (Owner)** : Consultation globale, finances, configuration.
   - **Gérant (Manager)** : Validation des nouvelles recrues, stocks, catalogue.
   - **Serveuse (Waitress)** : Saisie de commandes, pointage, chiffre d'affaires personnel du shift.
3. **Intégrité de l'Environnement** :
   - Ne jamais hardcoder de clés secrètes dans le code source ; utiliser `.env`.
   - Conserver les modes de repli (fallback démo) si Supabase n'est pas encore connecté.
