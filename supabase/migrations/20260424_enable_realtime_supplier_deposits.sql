-- ============================================================
-- Enable Supabase Realtime for supplier_deposits & suppliers
-- Jalankan di Supabase SQL Editor agar kartu deposit sinkron
-- ============================================================

-- Aktifkan realtime untuk tabel supplier_deposits
ALTER PUBLICATION supabase_realtime ADD TABLE supplier_deposits;

-- Aktifkan realtime untuk tabel suppliers (agar deposit_balance sync)
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

-- Pastikan REPLICA IDENTITY = FULL agar Supabase bisa kirim old/new row data
ALTER TABLE supplier_deposits REPLICA IDENTITY FULL;
ALTER TABLE suppliers REPLICA IDENTITY FULL;
