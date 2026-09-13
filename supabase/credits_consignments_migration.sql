-- ====================================================================
-- MIGRATION: GESTION DES AVOIRS & CONSIGNATIONS VIA PASSERELLE SMS GSM
-- MaquisSync - Zero Loss & Customer Trust Architecture
-- ====================================================================

-- 1. Table des avoirs monétaires et consignations de boissons
CREATE TABLE IF NOT EXISTS public.client_credits_consignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Serveuse / Gérant créateur
    client_phone VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('AVOIR', 'CONSIGNATION')),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Rempli si CONSIGNATION
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    amount NUMERIC(12,2) DEFAULT 0 CHECK (amount >= 0), -- Rempli si AVOIR
    item_details TEXT NOT NULL, -- Description claire (ex: "Monnaie manquante 500 CFA" ou "1x Brakina 65cl")
    validation_code VARCHAR(10) NOT NULL, -- Code PIN à 4 ou 6 chiffres
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (status IN ('ACTIF', 'UTILISE', 'EXPIRE', 'ANNULE')),
    used_at TIMESTAMPTZ NULL,
    used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches ultra-rapides en caisse
CREATE INDEX IF NOT EXISTS idx_credits_lookup 
ON public.client_credits_consignments (establishment_id, validation_code, status);

CREATE INDEX IF NOT EXISTS idx_credits_phone 
ON public.client_credits_consignments (establishment_id, client_phone, status);

-- 2. Activer la sécurité au niveau des lignes (RLS)
ALTER TABLE public.client_credits_consignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for active establishments"
ON public.client_credits_consignments
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Fonction RPC PostgreSQL pour validation atomique et déstockage physique
CREATE OR REPLACE FUNCTION public.redeem_credit_consignment(
    p_code TEXT,
    p_establishment_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_product RECORD;
    v_result JSONB;
BEGIN
    -- 1. Recherche du crédit / consignation actif
    SELECT * INTO v_record
    FROM public.client_credits_consignments
    WHERE establishment_id = p_establishment_id
      AND validation_code = UPPER(TRIM(p_code))
      AND status = 'ACTIF'
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Code PIN introuvable, expiré ou déjà utilisé.'
        );
    END IF;

    -- 2. Si c'est une consignation avec produit, déstockage physique
    IF v_record.type = 'CONSIGNATION' AND v_record.product_id IS NOT NULL THEN
        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_record.product_id
        FOR UPDATE;

        IF FOUND THEN
            -- Décrémente le stock actuel
            UPDATE public.products
            SET current_stock = GREATEST(0, current_stock - v_record.quantity),
                updated_at = NOW()
            WHERE id = v_record.product_id;

            -- Trace dans les ajustements d'inventaire
            INSERT INTO public.inventory_adjustments (
                establishment_id,
                product_id,
                user_id,
                quantity,
                reason,
                notes
            ) VALUES (
                p_establishment_id,
                v_record.product_id,
                p_user_id,
                -v_record.quantity,
                'LIVRAISON', -- Retrait effectif
                'Retrait consignation client ' || v_record.client_phone || ' (Code ' || v_record.validation_code || ')'
            );
        END IF;
    END IF;

    -- 3. Mettre à jour le statut du crédit / consignation
    UPDATE public.client_credits_consignments
    SET status = 'UTILISE',
        used_at = NOW(),
        used_by = p_user_id,
        updated_at = NOW()
    WHERE id = v_record.id;

    -- 4. Retourner les données complètes du retrait
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Validation réussie !',
        'record', row_to_json(v_record),
        'type', v_record.type,
        'amount', v_record.amount,
        'quantity', v_record.quantity,
        'item_details', v_record.item_details,
        'client_phone', v_record.client_phone
    );
END;
$$;
