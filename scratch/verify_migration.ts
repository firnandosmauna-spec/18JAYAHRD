import { supabase } from '../src/lib/supabase'

async function verify() {
  console.log('--- VERIFYING MIGRATION ---')
  
  // 1. Count invoices created by migration
  const { data: invoices, error: invError } = await supabase
    .from('purchase_invoices')
    .select('id, invoice_number, total_amount, supplier_id, suppliers(name)')
    .like('notes', '%Migrated from Movement ID%')
  
  if (invError) {
    console.error('Error fetching invoices:', invError)
    return
  }

  console.log(`Migration result: ${invoices.length} invoices were pulled.`)
  
  if (invoices.length > 0) {
    const totalMigrated = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    console.log(`Total migrated debt value: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalMigrated)}`)
    
    console.log('\nTop 5 Migrated Invoices:')
    invoices.slice(0, 5).forEach(inv => {
      console.log(`- ${inv.invoice_number}: ${(inv as any).suppliers?.name || 'Unknown Supplier'} - ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.total_amount)}`)
    })
  }

  // 2. Double check for any remaining candidates that might have been missed
  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select('id, payment_methods(name)')
    .eq('movement_type', 'in')
  
  if (movError) return

  const candidates = (movements || []).filter(m => {
    const pmName = ((m as any).payment_methods?.name || '').toLowerCase()
    return pmName.includes('hutang') || pmName.includes('tempo') || pmName.includes('kredit')
  })

  console.log(`\nRemaining candidates in stock_movements: ${candidates.length}`)
}

verify()
