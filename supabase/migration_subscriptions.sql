-- ==============================================================================
-- MaquisSaaS - Migration Abonnements & Notifications Push
-- Table: subscriptions (statut_paiement, plan, montant, expo_push_token)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    establishment_name VARCHAR(255) DEFAULT 'Mon Maquis',
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('Découverte', 'Accès', 'Premium')),
    montant INTEGER NOT NULL CHECK (montant IN (9900, 14900, 19900)),
    statut_paiement VARCHAR(50) DEFAULT 'en_attente' NOT NULL CHECK (statut_paiement IN ('en_attente', 'actif')),
    expo_push_token VARCHAR(255),
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(statut_paiement);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS statut_paiement VARCHAR(50) DEFAULT 'actif';
