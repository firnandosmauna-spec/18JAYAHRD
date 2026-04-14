-- Cleanup script for duplicate loan payments
-- 1. Identify and delete duplicate payments made today for the same loan 
-- (Keeps only one payment if multiple payments with same amount were made within a 1-hour window)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY loan_id, amount, (EXTRACT(EPOCH FROM payment_date)::BIGINT / 3600)
           ORDER BY payment_date ASC
         ) as row_num
  FROM public.employee_loan_payments
  WHERE payment_date >= CURRENT_DATE
)
DELETE FROM public.employee_loan_payments
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- 2. Recalculate remaining_amount for ALL loans based on current payment history
-- This ensures the 'Accounting-First' logic is applied to fix any broken balances
DO $$
DECLARE
    r RECORD;
    v_total_paid DECIMAL;
BEGIN
    FOR r IN SELECT id, amount FROM public.employee_loans LOOP
        -- Calculate total paid
        SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
        FROM public.employee_loan_payments
        WHERE loan_id = r.id;
        
        -- Update the loan balance
        UPDATE public.employee_loans
        SET remaining_amount = GREATEST(0, r.amount - v_total_paid),
            status = CASE 
                WHEN (r.amount - v_total_paid) <= 0 THEN 'paid_off'::VARCHAR
                ELSE status
            END
        WHERE id = r.id;
    END LOOP;
END;
$$;

-- Verification query
SELECT 
    e.name, 
    l.amount as plafon, 
    l.remaining_amount as sisa_sekarang,
    (SELECT COUNT(*) FROM public.employee_loan_payments WHERE loan_id = l.id) as jumlah_cicilan
FROM public.employee_loans l
JOIN public.employees e ON l.employee_id = e.id
WHERE l.remaining_amount > 0;
