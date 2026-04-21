-- ========================================================
-- FIX: Sinkronisasi deposit_balance suppliers
-- Jalankan di Supabase SQL Editor
-- ========================================================

-- 1. Buat fungsi untuk sinkronisasi saldo deposit
CREATE OR REPLACE FUNCTION sync_all_supplier_deposit_balances()
RETURNS void AS $$
BEGIN
    -- Update saldo berdasarkan riwayat transaksi supplier_deposits
    UPDATE suppliers s
    SET deposit_balance = COALESCE(calc.balance, 0)
    FROM (
        SELECT 
            supplier_id,
            SUM(
                CASE 
                    WHEN type = 'deposit' THEN amount
                    WHEN type IN ('usage', 'refund') THEN -amount
                    ELSE 0
                END
            ) as balance
        FROM supplier_deposits
        GROUP BY supplier_id
    ) calc
    WHERE s.id = calc.supplier_id;

    -- Set ke 0 untuk supplier yang tidak punya riwayat deposit
    UPDATE suppliers s
    SET deposit_balance = 0
    WHERE NOT EXISTS (
        SELECT 1 FROM supplier_deposits sd WHERE sd.supplier_id = s.id
    ) AND COALESCE(s.deposit_balance, 0) != 0;
END;
$$ LANGUAGE plpgsql;

-- 2. Pastikan trigger tetap berjalan untuk operasi berikutnya
CREATE OR REPLACE FUNCTION update_supplier_deposit_balance()
RETURNS TRIGGER AS $$
DECLARE
    delta NUMERIC(15, 2) := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'deposit') THEN
            delta := NEW.amount;
        ELSE
            delta := -NEW.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverse old amount
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        
        -- Add new amount
        IF (NEW.type = 'deposit') THEN
            delta := delta + NEW.amount;
        ELSE
            delta := delta - NEW.amount;
        END IF;
        
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = NEW.supplier_id;
        
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'deposit') THEN
            delta := -OLD.amount;
        ELSE
            delta := OLD.amount;
        END IF;
        UPDATE suppliers SET deposit_balance = deposit_balance + delta WHERE id = OLD.supplier_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate trigger
DROP TRIGGER IF EXISTS trg_update_supplier_deposit_balance ON supplier_deposits;
CREATE TRIGGER trg_update_supplier_deposit_balance
AFTER INSERT OR UPDATE OR DELETE ON supplier_deposits
FOR EACH ROW EXECUTE FUNCTION update_supplier_deposit_balance();

-- 4. JALANKAN SINKRONISASI SEKARANG
SELECT sync_all_supplier_deposit_balances();

-- 5. Tampilkan hasil
SELECT id, name, deposit_balance FROM suppliers ORDER BY name;
