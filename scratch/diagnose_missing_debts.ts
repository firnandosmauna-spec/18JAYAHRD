import { supabase } from '../src/lib/supabase'

async function diagnose() {
  console.log('--- DIAGNOSING MISSING DEBTS ---')
  
  // 1. Get all 'in' stock movements with payment methods
  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select(`
      id,
      created_at,
      reference,
      product_id,
      payment_method_id,
      payment_methods (name),
      products (name, supplier_id)
    `)
    .eq('movement_type', 'in')
  
  if (movError) {
    console.error('Error fetching movements:', movError)
    return
  }

  // 2. Filter movements that look like "Hutang"
  const candidates = (movements || []).filter(m => {
    const pmName = ((m as any).payment_methods?.name || '').toLowerCase()
    const isCash = pmName.includes('cash') || pmName.includes('tunai')
    // For diagnositcs, let's look for anything that is explicitly Hutang or has no PM
    return pmName.includes('hutang') || pmName.includes('tempo') || pmName === ''
  })

  console.log(`Found ${candidates.length} movements with debt-like payment methods.`)

  // 3. Check which ones have invoices
  const { data: invoices, error: invError } = await supabase
    .from('purchase_invoices')
    .select('invoice_number')
  
  if (invError) {
    console.error('Error fetching invoices:', invError)
    return
  }

  const existingInvs = new Set((invoices || []).map(i => i.invoice_number))
  
  const uninvoiced = candidates.filter(m => {
    return !m.reference || !existingInvs.has(m.reference)
  })

  console.log(`Found ${uninvoiced.length} movements that are NOT invoiced yet.`)
  
  uninvoiced.slice(0, 5).forEach(m => {
    console.log(`- ID: ${m.id}, Date: ${m.created_at}, PM: ${(m as any).payment_methods?.name}, Product: ${(m as any).products?.name}, SupplierID: ${(m as any).products?.supplier_id}`)
  })
}

diagnose()
