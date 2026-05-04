-- Migration: Add atomic deletion for loan payments
-- This ensures balance is restored correctly when a payment is deleted

CREATE OR REPLACE FUNCTION delete_loan_payment(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_loan_id UUID;
    v_amount NUMERIC;
    v_status TEXT;
    v_current_remaining NUMERIC;
    v_new_remaining NUMERIC;
BEGIN
    -- 1. Get payment details before deletion
    SELECT loan_id, amount, payment_status INTO v_loan_id, v_amount, v_status
    FROM employee_loan_payments
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Catatan pembayaran tidak ditemukan';
    END IF;

    -- 2. Only restore balance if the payment was 'approved'
    IF v_status = 'approved' THEN
        -- Get current balance
        SELECT remaining_amount INTO v_current_remaining
        FROM employee_loans
        WHERE id = v_loan_id;

        v_new_remaining := v_current_remaining + v_amount;

        -- Update loan balance and status
        UPDATE employee_loans
        SET 
            remaining_amount = v_new_remaining,
            status = 'approved', -- Restore status to approved if it was paid_off
            updated_at = NOW()
        WHERE id = v_loan_id;
    END IF;

    -- 3. Delete the payment record
    DELETE FROM employee_loan_payments
    WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_loan_payment TO authenticated;
