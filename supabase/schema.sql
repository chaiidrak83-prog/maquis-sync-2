-- ==============================================================================
-- MaquisSaaS - Schéma de Base de Données Supabase (PostgreSQL DDL)
-- Compatible Offline-First, Multi-Tenant et Row Level Security (RLS)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: Établissements (Maquis)
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'DECOUVERTE' NOT NULL CHECK (subscription_tier IN ('DECOUVERTE', 'ACCES', 'PREMIUM')),
    subscription_status VARCHAR(50) DEFAULT 'trial' NOT NULL CHECK (subscription_status IN ('trial', 'active', 'expired')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    ussd_template VARCHAR(255) DEFAULT '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. TABLE: Utilisateurs (Propriétaires, Gérants, Serveuses)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'WAITRESS')),
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'VALIDATED', 'REJECTED')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_phone_per_establishment UNIQUE (phone, establishment_id)
);

CREATE INDEX IF NOT EXISTS idx_users_phone_status ON public.users(phone, status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_establishment ON public.users(establishment_id);

-- 4. TABLE: Produits (Catalogue des Boissons)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    volume VARCHAR(50) NOT NULL, -- '33cl', '65cl', '1.5L', etc.
    price DECIMAL(10, 2) NOT NULL,
    initial_stock INTEGER DEFAULT 0 NOT NULL,
    current_stock INTEGER DEFAULT 0 NOT NULL,
    image_base64 TEXT, -- Image SVG ou data URL pour le cache hors-ligne
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_establishment ON public.products(establishment_id);

-- 5. TABLE: Ventes (Transactions globales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'MOBILE_MONEY')),
    is_synced BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_establishment ON public.sales(establishment_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);

-- 6. TABLE: Articles Vendus (Détails des Ventes)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- 7. TABLE: Ajustements de Stock
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    quantity_change INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL CHECK (reason IN ('CASSE', 'PERTE', 'LIVRAISON', 'ERREUR_SAISIE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. TABLE: Pointage des Présences (Attendances)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE,
    check_in_method VARCHAR(50) DEFAULT 'QR_CODE' NOT NULL CHECK (check_in_method IN ('QR_CODE', 'MANUAL')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. FONCTIONS ET TRIGGERS POUR L'ACTUALISATION DES TIMESTAMPS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_establishments_updated_at ON public.establishments;
CREATE TRIGGER set_establishments_updated_at
BEFORE UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_attendances_updated_at ON public.attendances;
CREATE TRIGGER set_attendances_updated_at
BEFORE UPDATE ON public.attendances
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. TRIGGER DÉDUCTION AUTOMATIQUE DU STOCK SUR VENTE
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale_item()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET current_stock = GREATEST(0, current_stock - NEW.quantity)
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER trigger_deduct_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_sale_item();

-- 11. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture/écriture permissives pour l'API anon (authentification via token ou clé de projet)
CREATE POLICY "Permissive select on establishments" ON public.establishments FOR SELECT USING (true);
CREATE POLICY "Permissive update on establishments" ON public.establishments FOR UPDATE USING (true);

CREATE POLICY "Permissive all on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Permissive all on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Permissive all on sales" ON public.sales FOR ALL USING (true);
CREATE POLICY "Permissive all on sale_items" ON public.sale_items FOR ALL USING (true);
CREATE POLICY "Permissive all on inventory_adjustments" ON public.inventory_adjustments FOR ALL USING (true);
CREATE POLICY "Permissive all on attendances" ON public.attendances FOR ALL USING (true);

-- 12. DONNÉES INITIALES (SEED DATA POUR TEST)
DO $$
DECLARE
    est_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    -- Insertion Établissement
    INSERT INTO public.establishments (id, name, subscription_tier, subscription_status, subscription_expires_at, ussd_template)
    VALUES (est_id, 'Maquis Le Grand Faso', 'DECOUVERTE', 'active', NOW() + INTERVAL '30 days', '*144*4*2*[MONTANT]*[NUMERO_CLIENT]#')
    ON CONFLICT (id) DO NOTHING;

    -- Insertion Utilisateurs démo
    INSERT INTO public.users (id, establishment_id, name, phone, pin_hash, role, status, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', est_id, 'Alassane Touré', '76000000', '1111', 'OWNER', 'VALIDATED', true),
    ('b0000000-0000-0000-0000-000000000002', est_id, 'Koffi Mensah', '70222222', '2222', 'MANAGER', 'VALIDATED', true),
    ('b0000000-0000-0000-0000-000000000003', est_id, 'Awa Diallo', '70123456', '3333', 'WAITRESS', 'VALIDATED', true),
    ('b0000000-0000-0000-0000-000000000004', est_id, 'Mariam Koné', '70890123', '4444', 'WAITRESS', 'PENDING', true),
    ('b0000000-0000-0000-0000-000000000005', est_id, 'Fatou Bamba', '77456789', '5555', 'WAITRESS', 'VALIDATED', false)
    ON CONFLICT (id) DO NOTHING;

    -- Insertion Produits démo
    INSERT INTO public.products (id, establishment_id, name, volume, price, initial_stock, current_stock, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', est_id, 'Brakina', '65cl', 900, 120, 120, true),
    ('c0000000-0000-0000-0000-000000000002', est_id, 'Sobebra', '65cl', 1000, 80, 80, true),
    ('c0000000-0000-0000-0000-000000000003', est_id, 'Guinness', '33cl', 1200, 15, 15, true),
    ('c0000000-0000-0000-0000-000000000004', est_id, 'Laafi (Eau)', '1.5L', 500, 4, 4, true)
    ON CONFLICT (id) DO NOTHING;
END $$;
