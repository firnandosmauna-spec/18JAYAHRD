-- Script untuk menyinkronkan ulang deposit_balance pada tabel suppliers
-- berdasarkan riwayat transaksi aktual di tabel supplier_deposits.
-- Gunakan script ini di Supabase SQL Editor.

WITH calculated_balances AS (
  SELECT 
    supplier_id,
    SUM(
      CASE 
        WHEN type = 'deposit' THEN amount
        WHEN type IN ('usage', 'refund') THEN -amount
        ELSE 0
      END
    ) as actual_deposit
  FROM supplier_deposits
  GROUP BY supplier_id
)
UPDATE suppliers s
SET deposit_balance = COALESCE(cb.actual_deposit, 0)
FROM calculated_balances cb
WHERE s.id = cb.supplier_id
  AND COALESCE(s.deposit_balance, 0) != COALESCE(cb.actual_deposit, 0);

-- Mengatur ulang saldo deposit supplier yang tidak memiliki riwayat transaksi di supplier_deposits
UPDATE suppliers s
SET deposit_balance = 0
WHERE NOT EXISTS (
  SELECT 1 FROM supplier_deposits sd WHERE sd.supplier_id = s.id
) AND COALESCE(s.deposit_balance, 0) != 0;

-- Tampilkan semua supplier dengan saldo saat ini setelah disinkronkan
SELECT id, name, deposit_balance FROM suppliers ORDER BY name;
