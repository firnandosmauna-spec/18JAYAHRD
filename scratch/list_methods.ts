import { supabase } from '../src/lib/supabase';

async function listPaymentMethods() {
  console.log('--- Listing All Payment Methods Used in Purchases ---');
  
  const { data: movements, error } = await supabase
    .from('stock_movements')
    .select(`
      id,
      payment_method_id,
      payment_methods (name)
    `)
    .eq('movement_type', 'in');

  if (error) {
    console.error('Error fetching movements:', error);
    return;
  }

  const methodCounts: Record<string, number> = {};
  movements.forEach(m => {
    const name = (m.payment_methods as any)?.name || 'NONE/NULL';
    methodCounts[name] = (methodCounts[name] || 0) + 1;
  });

  console.log('Payment Method Summary:');
  Object.entries(methodCounts).forEach(([name, count]) => {
    console.log(`- ${name}: ${count} movements`);
  });
  
  console.log('--- End of Report ---');
}

listPaymentMethods();
