import { supabase } from '../src/lib/supabase';

async function injectDummy() {
  console.log('--- Starting Dummy Injection ---');
  
  // 1. Get a valid supplier
  const { data: suppliers, error: supError } = await supabase
    .from('suppliers')
    .select('id, name')
    .limit(1);

  if (supError || !suppliers || suppliers.length === 0) {
    console.error('No suppliers found to inject into.');
    return;
  }

  const supplier = suppliers[0];
  console.log(`Injecting into supplier: ${supplier.name} (${supplier.id})`);

  const invoiceNumber = `TEST-DUMMY-${Date.now().toString().slice(-4)}`;

  // 2. Insert Invoice
  const { data: invoice, error: invError } = await supabase
    .from('purchase_invoices')
    .insert({
      supplier_id: supplier.id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      status: 'received',
      payment_status: 'unpaid',
      total_amount: 123456,
      paid_amount: 0,
      notes: 'DATA UJI COBA - SILAKAN HAPUS NANTI',
      created_by: 'system_test'
    })
    .select()
    .single();

  if (invError) {
    console.error('Error inserting invoice:', invError);
    return;
  }

  console.log('Dummy Invoice created successfully:', invoice.id);

  // 3. Insert Item
  const { error: itemError } = await supabase
    .from('purchase_invoice_items')
    .insert({
      purchase_invoice_id: invoice.id,
      product_id: null, // Test with null product if allowed
      quantity: 1,
      unit_price: 123456,
      line_total: 123456,
      notes: 'Item data uji coba'
    });

  if (itemError) {
    console.error('Error inserting item (but invoice was created):', itemError);
  }

  console.log('--- Injection Complete ---');
}

injectDummy();
