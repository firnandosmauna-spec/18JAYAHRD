const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://omfzoasehiecuzaudblp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTczNjIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING SUPPLIERS ---');
  const { data: supps } = await supabase.from('suppliers').select('id, name').ilike('name', '%Mitra Kalimantan%');
  console.log('Suppliers:', JSON.stringify(supps, null, 2));

  const targetId = supps && supps[0] ? supps[0].id : null;
  console.log('Target ID for Mitra Kalimantan:', targetId);

  console.log('\n--- CHECKING INVOICE 94 ---');
  const { data: inv94 } = await supabase.from('purchase_invoices').select('*').ilike('invoice_number', '%94%');
  console.log('Invoice 94:', JSON.stringify(inv94, null, 2));

  if (targetId) {
    console.log('\n--- CHECKING RAW MOVEMENTS FOR MITRA KALIMANTAN ---');
    const { data: movs } = await supabase
      .from('stock_movements')
      .select('id, reference, product_id')
      .eq('movement_type', 'in');
    
    // Manual filter products since products!inner might fail if not configured
    const { data: prods } = await supabase.from('products').select('id, supplier_id').eq('supplier_id', targetId);
    const prodIds = new Set(prods.map(p => p.id));
    
    const filteredMovs = (movs || []).filter(m => prodIds.has(m.product_id));

    console.log(`Found ${filteredMovs.length} raw movements.`);
    if (filteredMovs.length > 0) {
      console.log('Sample Movements:', JSON.stringify(filteredMovs.slice(0, 5), null, 2));
    }
  }
}

check();
