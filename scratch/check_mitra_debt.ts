
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSupplierDebt() {
  const targetName = 'Mitra Kalimantan Bersaudara'
  console.log(`Checking for supplier: ${targetName}`)

  // 1. Check supplier
  const { data: suppliers, error: sError } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('name', `%${targetName}%`)

  if (sError) {
    console.error('Error fetching suppliers:', sError)
    return
  }

  if (!suppliers || suppliers.length === 0) {
    console.log('Supplier not found in suppliers table.')
    
    // Check stock movements for this name as a fallback/clue
    const { data: movs, error: mError } = await supabase
      .from('stock_movements')
      .select('*, products(name, suppliers(name))')
      .limit(10)
    
    console.log('Recent stock movements (to see structure):', movs)
    return
  }

  console.log('Found suppliers:', suppliers)

  const supplierIds = suppliers.map(s => s.id)

  // 2. Check invoices
  const { data: invoices, error: iError } = await supabase
    .from('purchase_invoices')
    .select('*')
    .in('supplier_id', supplierIds)

  console.log(`Found ${invoices?.length || 0} invoices for these suppliers.`)
  if (invoices && invoices.length > 0) {
    console.log('Invoices sample:', invoices.slice(0, 5))
  }

  // 3. Check stock movements that might be 'hutang' but not yet invoiced
  // We need to look for 'in' movements with 'hutang' payment method
  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select(`
      *,
      products (id, name, supplier_id, suppliers(id, name)),
      payment_methods (name)
    `)
    .eq('movement_type', 'in')
    .limit(100)

  if (movError) {
    console.error('Error fetching movements:', movError)
  } else {
    const targetMovs = movements.filter(m => {
      const prod = Array.isArray(m.products) ? m.products[0] : m.products
      const supp = prod?.suppliers
      const suppName = Array.isArray(supp) ? supp[0]?.name : supp?.name
      return suppName?.toLowerCase().includes(targetName.toLowerCase())
    })
    console.log(`Found ${targetMovs.length} stock movements for ${targetName}`)
    if (targetMovs.length > 0) {
      console.log('Movement sample:', targetMovs.slice(0, 2))
      console.log('Payment Methods sample:', targetMovs.map(m => (m.payment_methods as any)?.name))
    }
  }
}

checkSupplierDebt()
