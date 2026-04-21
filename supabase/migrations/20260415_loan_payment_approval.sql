-- Migration: Add payment approval workflow to loan payments
-- Run this in Supabase SQL Editor

-- 1. Add status and requested_by columns to employee_loan_payments
ALTER TABLE employee_loan_payments 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'approved' 
    CHECK (payment_status IN ('pending_approval', 'approved', 'rejected'));

ALTER TABLE employee_loan_payments 
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE employee_loan_payments 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE employee_loan_payments 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE employee_loan_payments 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Create a new RPC function to only insert a payment request (no balance deduction yet)
CREATE OR REPLACE FUNCTION submit_loan_payment_request(
    p_loan_id UUID,
    p_amount NUMERIC,
    p_payment_date TIMESTAMPTZ,
    p_payment_method TEXT,
    p_notes TEXT DEFAULT NULL,
    p_requested_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    -- Verify the loan exists and is approved
    IF NOT EXISTS (
        SELECT 1 FROM employee_loans 
        WHERE id = p_loan_id AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Kasbon tidak ditemukan atau belum disetujui';
    END IF;

    -- Insert payment request with pending_approval status (no balance change yet)
    INSERT INTO employee_loan_payments (
        loan_id,
        amount,
        payment_date,
        payment_method,
        notes,
        payment_status,
        requested_by
    ) VALUES (
        p_loan_id,
        p_amount,
        p_payment_date,
        p_payment_method,
        p_notes,
        'pending_approval',
        p_requested_by
    ) RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to approve a pending payment request (this deducts the balance)
CREATE OR REPLACE FUNCTION approve_loan_payment(
    p_payment_id UUID,
    p_approved_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_loan_id UUID;
    v_amount NUMERIC;
    v_current_remaining NUMERIC;
    v_new_remaining NUMERIC;
BEGIN
    -- Get payment details
    SELECT loan_id, amount INTO v_loan_id, v_amount
    FROM employee_loan_payments
    WHERE id = p_payment_id AND payment_status = 'pending_approval';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permintaan pembayaran tidak ditemukan atau sudah diproses';
    END IF;

    -- Get current remaining balance
    SELECT remaining_amount INTO v_current_remaining
    FROM employee_loans WHERE id = v_loan_id;

    v_new_remaining := GREATEST(0, v_current_remaining - v_amount);

    -- Update the payment to approved
    UPDATE employee_loan_payments
    SET 
        payment_status = 'approved',
        approved_by = p_approved_by,
        approved_at = NOW()
    WHERE id = p_payment_id;

    -- Deduct from loan balance
    IF v_new_remaining <= 0 THEN
        UPDATE employee_loans
        SET 
            remaining_amount = 0,
            status = 'paid_off',
            updated_at = NOW()
        WHERE id = v_loan_id;
    ELSE
        UPDATE employee_loans
        SET 
            remaining_amount = v_new_remaining,
            updated_at = NOW()
        WHERE id = v_loan_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to reject a payment request
CREATE OR REPLACE FUNCTION reject_loan_payment(
    p_payment_id UUID,
    p_approved_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE employee_loan_payments
    SET 
        payment_status = 'rejected',
        approved_by = p_approved_by,
        approved_at = NOW(),
        rejection_reason = p_reason
    WHERE id = p_payment_id AND payment_status = 'pending_approval';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permintaan pembayaran tidak ditemukan atau sudah diproses';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_loan_payment_request TO authenticated;
GRANT EXECUTE ON FUNCTION approve_loan_payment TO authenticated;
GRANT EXECUTE ON FUNCTION reject_loan_payment TO authenticated;

-- 6. Policy: employees can insert their own payment requests
-- (Assumes existing RLS; add if needed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employee_loan_payments' 
        AND policyname = 'employees_can_request_payments'
    ) THEN
        CREATE POLICY employees_can_request_payments ON employee_loan_payments
            FOR INSERT TO authenticated
            WITH CHECK (payment_status = 'pending_approval');
    END IF;
END $$;
