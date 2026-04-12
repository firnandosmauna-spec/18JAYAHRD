-- SQL MIGRATION SCRIPT: Pull Existing Supplier Debt from Stock Movements
-- Instructions: Run this script in the Supabase SQL Editor to migrate historical debts.

DO $$
DECLARE
    mov_rec RECORD;
    new_invoice_id UUID;
    invoice_num TEXT;
    has_created_by BOOLEAN;
BEGIN
    -- Check if created_by column exists in purchase_invoices
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_invoices' AND column_name = 'created_by'
    ) INTO has_created_by;

    FOR mov_rec IN 
        SELECT 
            sm.id,
            sm.created_at,
            sm.reference,
            sm.product_id,
            sm.quantity,
            sm.unit_price,
            sm.notes,
            p.supplier_id,
            p.cost,
            p.name as product_name,
            pm.name as payment_method_name
        FROM public.stock_movements sm
        JOIN public.products p ON sm.product_id = p.id
        JOIN public.payment_methods pm ON sm.payment_method_id = pm.id
        WHERE sm.movement_type = 'in'
          AND (
            LOWER(pm.name) LIKE '%hutang%' OR 
            LOWER(pm.name) LIKE '%tempo%' OR 
            LOWER(pm.name) LIKE '%kredit%'
          )
          AND p.supplier_id IS NOT NULL
          -- Exclude if already invoiced (avoid duplicates)
          AND NOT EXISTS (
              SELECT 1 FROM public.purchase_invoices pi 
              WHERE pi.invoice_number = sm.reference 
                 OR pi.notes LIKE '%' || sm.id::text || '%'
          )
    LOOP
        -- Generate auto invoice number with timestamp to ensure uniqueness
        invoice_num := 'INV-AUTO-MIG-' || EXTRACT(EPOCH FROM mov_rec.created_at)::text;
        
        -- 1. Insert into purchase_invoices
        EXECUTE format('
            INSERT INTO public.purchase_invoices (
                supplier_id,
                invoice_number,
                invoice_date,
                due_date,
                status,
                payment_status,
                subtotal,
                tax_amount,
                discount_amount,
                total_amount,
                paid_amount,
                notes
                %s
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 %s
            ) RETURNING id',
            CASE WHEN has_created_by THEN ', created_by' ELSE '' END,
            CASE WHEN has_created_by THEN ', ''Migration Script''' ELSE '' END
        )
        INTO new_invoice_id
        USING 
            mov_rec.supplier_id,
            invoice_num,
            mov_rec.created_at::DATE,
            (mov_rec.created_at + INTERVAL '30 days')::DATE,
            'received',
            'unpaid',
            mov_rec.quantity * COALESCE(mov_rec.unit_price, mov_rec.cost, 0),
            0,
            0,
            mov_rec.quantity * COALESCE(mov_rec.unit_price, mov_rec.cost, 0),
            0,
            'Migrated from Movement ID: ' || mov_rec.id || '. Orig Ref: ' || COALESCE(mov_rec.reference, 'None');

        -- 2. Insert into purchase_invoice_items
        INSERT INTO public.purchase_invoice_items (
            purchase_invoice_id,
            product_id,
            quantity,
            unit_price,
            discount_percentage,
            line_total,
            notes
        ) VALUES (
            new_invoice_id,
            mov_rec.product_id,
            mov_rec.quantity,
            COALESCE(mov_rec.unit_price, mov_rec.cost, 0),
            0,
            mov_rec.quantity * COALESCE(mov_rec.unit_price, mov_rec.cost, 0),
            'Stock Movement Ref: ' || mov_rec.id
        );

        -- 3. Update stock movement reference to point to new invoice (only if it was empty)
        IF mov_rec.reference IS NULL OR mov_rec.reference = '' OR mov_rec.reference LIKE 'MSK-%' THEN
            UPDATE public.stock_movements 
            SET reference = invoice_num 
            WHERE id = mov_rec.id;
        END IF;

    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully.';
END $$;
