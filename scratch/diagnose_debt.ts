import { supabase } from '../src/lib/supabase';

async function diagnose() {
  const { data: movements, error } = await supabase
    .from('stock_movements')
    .select(`
      id,
      created_at,
      reference,
      movement_type,
      payment_method_id,
      payment_methods (name),
      products (name, supplier_id, suppliers(name))
    `)
    .eq('movement_type', 'in');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const htg = movements.filter(m => {
    const pmName = (m.payment_methods as any)?.name || '';
    return pmName.toLowerCase().includes('hutang') || pmName.toLowerCase().includes('tempo');
  });

  console.log('Total "IN" movements:', movements.length);
  console.log('Total "Hutang/Tempo" movements:', htg.length);
  
  const skipped = htg.filter(m => !m.products?.supplier_id);
  console.log('Hutang movements with NO supplier_id on product:', skipped.length);

  const pmNames = Array.from(new Set(movements.map(m => (m.payment_methods as any)?.name).filter(Boolean)));
  console.log('Available Payment Method Names:', pmNames);
}

diagnose();
