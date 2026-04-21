-- =============================================
-- FIX: Hapus deposit dari Cahaya Racing Star (Batu)
-- dan pastikan hanya Cahaya Racing Star yang punya 600.000
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. Lihat kedua supplier
SELECT id, name, deposit_balance FROM suppliers WHERE name ILIKE '%cahaya%racing%' ORDER BY name;

-- 2. Hapus riwayat deposit dari Cahaya Racing Star (Batu)
DELETE FROM supplier_deposits 
WHERE supplier_id = (SELECT id FROM suppliers WHERE name ILIKE '%cahaya%racing%batu%');

-- 3. Reset deposit_balance Cahaya Racing Star (Batu) ke 0
UPDATE suppliers SET deposit_balance = 0 WHERE name ILIKE '%cahaya%racing%batu%';

-- 4. Cek apakah Cahaya Racing Star (tanpa Batu) sudah benar 600.000
SELECT id, name, deposit_balance FROM suppliers WHERE name ILIKE '%cahaya%racing%' AND name NOT ILIKE '%batu%';

-- 5. Jika belum 600.000, perbaiki:
-- Hapus riwayat lama
DELETE FROM supplier_deposits 
WHERE supplier_id = (SELECT id FROM suppliers WHERE name ILIKE '%cahaya%racing%' AND name NOT ILIKE '%batu%');

-- Reset ke 0
UPDATE suppliers SET deposit_balance = 0 
WHERE name ILIKE '%cahaya%racing%' AND name NOT ILIKE '%batu%';

-- Insert 1 entry bersih 600.000
INSERT INTO supplier_deposits (supplier_id, amount, type, description)
VALUES (
    (SELECT id FROM suppliers WHERE name ILIKE '%cahaya%racing%' AND name NOT ILIKE '%batu%'),
    600000,
    'deposit',
    'Saldo deposit awal (koreksi data)'
);

-- 6. Verifikasi semua
SELECT id, name, deposit_balance FROM suppliers WHERE name ILIKE '%cahaya%racing%' ORDER BY name;
