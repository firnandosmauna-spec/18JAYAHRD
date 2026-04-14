-- Create a function to process loan payments atomically
CREATE OR REPLACE FUNCTION public.process_loan_payment(
  p_loan_id UUID,
  p_amount DECIMAL,
  p_payment_date TIMESTAMPTZ,
  p_payment_method TEXT,
  p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_remaining DECIMAL;
  v_new_remaining DECIMAL;
  v_status TEXT;
  v_payment_id UUID;
BEGIN
  -- 1. Get current loan balance and lock the row for update
  SELECT remaining_amount, status INTO v_remaining, v_status
  FROM public.employee_loans
  WHERE id = p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan profile not found';
  END IF;

  -- 2. Insert the payment record
  INSERT INTO public.employee_loan_payments (
    loan_id,
    amount,
    payment_date,
    payment_method,
    notes
  ) VALUES (
    p_loan_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_notes
  ) RETURNING id INTO v_payment_id;

  -- 3. Calculate new balance
  v_new_remaining := GREATEST(0, v_remaining - p_amount);
  
  -- 4. Update status if paid off
  IF v_new_remaining <= 0 THEN
    v_status := 'paid_off';
  END IF;

  -- 5. Update the loan balance
  UPDATE public.employee_loans
  SET 
    remaining_amount = v_new_remaining,
    status = v_status,
    updated_at = NOW()
  WHERE id = p_loan_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'new_remaining', v_new_remaining,
    'status', v_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
