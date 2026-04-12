import { supabase } from '../src/lib/supabase';

async function verifyData() {
  console.log('--- Suppliers ---');
  const { data: sups } = await supabase.from('suppliers').select('id, name').limit(5);
  console.log(sups);

  console.log('--- Invoices ---');
  const { data: invs } = await supabase.from('purchase_invoices').select('id, supplier_id, invoice_number, total_amount, payment_status, status').limit(5);
  console.log(invs);

  console.log('--- Stock Movements (Hutang) ---');
  const { data: movs } = await supabase.from('stock_movements')
    .select('id, reference, payment_method_id, products(name, supplier_id)')
    .eq('movement_type', 'in')
    .limit(10);
  
  if (movs) {
    for (const m of movs) {
       const pmId = (m as any).payment_method_id;
       if (pmId) {
         const { data: pm } = await supabase.from('payment_methods').select('name').eq('id', pmId).single();
         console.log(`Mov ${m.id} | PM: ${pm?.name} | Product Supplier: ${(m as any).products?.supplier_id}`);
       }
    }
  }
}

verifyData();
