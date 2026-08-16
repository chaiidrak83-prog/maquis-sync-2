# Spécifications de la Base de Données - MaquisSaaS

Ce document détaille les schémas de base de données pour le serveur (PostgreSQL) et le client Offline-First (WatermelonDB).

---

## 1. Schéma Serveur (PostgreSQL SQL DDL)

Le schéma PostgreSQL gère la persistance globale, les abonnements multi-locataires (multi-tenant), les relations complexes et l'historique complet pour la comptabilité.

```sql
-- Activation de l'extension UUID pour la génération des clés primaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des Établissements (Maquis)
CREATE TABLE establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'DECOUVERTE' NOT NULL, -- 'DECOUVERTE', 'ACCES', 'PREMIUM'
    subscription_status VARCHAR(50) DEFAULT 'trial' NOT NULL, -- 'trial', 'active', 'expired'
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    ussd_template VARCHAR(255) DEFAULT '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#' NOT NULL, -- Syntaxe USSD paramétrable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des Utilisateurs (Propriétaires, Gérants, Serveuses)
-- Note: Pas d'email obligatoire pour les serveuses (Phone + PIN)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'OWNER', 'MANAGER', 'WAITRESS'
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'VALIDATED', 'REJECTED'
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- SOFT DELETE pour le turnover
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_phone_per_establishment UNIQUE (phone, establishment_id)
);

-- Index pour accélérer l'authentification Téléphone + PIN
CREATE INDEX idx_users_phone_status ON users(phone, status) WHERE is_active = TRUE;

-- Table des Produits (Catalogue dynamique de boissons)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    volume VARCHAR(50) NOT NULL, -- '33cl', '65cl', '1.5L', etc.
    price DECIMAL(10, 2) NOT NULL,
    initial_stock INTEGER DEFAULT 0 NOT NULL,
    current_stock INTEGER DEFAULT 0 NOT NULL,
    image_base64 TEXT, -- Image illustrative encodée en base64 pour affichage hors-ligne
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- SOFT DELETE pour le catalogue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des Ventes (Transactions)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Si la serveuse est désactivée, on garde la vente
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'MOBILE_MONEY'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table des Articles Vendus (Détails des ventes)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Si le produit est désactivé, on garde l'historique
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL
);

-- Table des Ajustements de Stock (Effectués par les gérants)
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    quantity_change INTEGER NOT NULL, -- ex: -6 pour bouteilles cassées, +24 pour livraison
    reason VARCHAR(255) NOT NULL, -- 'CASSE', 'PERTE', 'LIVRAISON', 'ERREUR_SAISIE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table de Pointage des Présences (Check-in/Check-out par QR Code)
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE,
    check_in_method VARCHAR(50) DEFAULT 'QR_CODE' NOT NULL, -- 'QR_CODE', 'MANUAL'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table d'Audit de Synchronisation (WatermelonDB Sync)
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_info VARCHAR(255),
    last_pulled_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 2. Schéma Client (WatermelonDB Schema)

Déclaration du schéma dans WatermelonDB pour le stockage local SQLite sur l'application mobile.

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'users',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string', isIndexed: true },
        { name: 'pin_hash', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'establishment_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'volume', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'initial_stock', type: 'number' },
        { name: 'current_stock', type: 'number' },
        { name: 'image_base64', type: 'string', isOptional: true }, -- Champ image hors-ligne ajouté
        { name: 'is_active', type: 'boolean' },
        { name: 'establishment_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'sales',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'total_amount', type: 'number' },
        { name: 'payment_method', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'sale_items',
      columns: [
        { name: 'sale_id', type: 'string', isIndexed: true },
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'attendances',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'check_in', type: 'number' },
        { name: 'check_out', type: 'number', isOptional: true },
        { name: 'check_in_method', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'inventory_adjustments',
      columns: [
        { name: 'product_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'quantity_change', type: 'number' },
        { name: 'reason', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
  ]
})
```
