import { supabase } from '@/lib/supabase'

export const supplierDebtService = {
  // --- Invoices ---

  async getAllInvoices() {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`
        *,
        supplier:suppliers (
          id,
          name
        )
      `)
      .order('invoice_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getInvoicesBySupplier(supplierId: string) {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`
        *,
        supplier:suppliers (
          id,
          name
        )
      `)
      .eq('supplier_id', supplierId)
      .neq('status', 'cancelled')
      .neq('status', 'draft')
      .order('invoice_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async updateInvoice(id: string, updates: any) {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getInvoiceItems(invoiceId: string) {
    const { data, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        *,
        product:products (
          name,
          unit,
          volume,
          sku
        )
      `)
      .eq('purchase_invoice_id', invoiceId)

    if (error) throw error
    return data || []
  },

  // --- Payments ---

  async getAllPayments() {
    const { data, error } = await supabase
      .from('purchase_payments')
      .select(`
        *,
        supplier:suppliers (
          id,
          name
        ),
        invoice:purchase_invoices (
          invoice_number
        )
      `)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createPayment(payment: any) {
    const { data, error } = await supabase
      .from('purchase_payments')
      .insert(payment)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // --- Summary ---

  async getDebtSummary() {
    // 1. Fetch all suppliers from master data
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name')

    if (suppliersError) throw suppliersError

    // 2. Fetch unpaid invoice totals
    const { data: invoices, error: invoicesError } = await supabase
      .from('purchase_invoices')
      .select('supplier_id, total_amount, paid_amount')
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled')

    if (invoicesError) throw invoicesError

    // 3. Aggregate debt per supplier
    const debtMap = (invoices || []).reduce((acc: any, curr: any) => {
      const debt = (Number(curr.total_amount || 0) - Number(curr.paid_amount || 0))
      acc[curr.supplier_id] = (acc[curr.supplier_id] || 0) + debt
      return acc
    }, {})

    const countMap = (invoices || []).reduce((acc: any, curr: any) => {
      acc[curr.supplier_id] = (acc[curr.supplier_id] || 0) + 1
      return acc
    }, {})

    // 4. Map back to all suppliers, ensuring field names match UI expectations
    return (suppliers || []).map(s => ({
      supplierId: s.id,
      supplierName: s.name,
      totalDebt: debtMap[s.id] || 0,
      invoiceCount: countMap[s.id] || 0
    }))
  },

  async syncAllSupplierDebts() {
    console.group('=== DEEP HISTORY SYNC REPORT ===')
    
    let totalMigratedInvoices = 0
    let totalMigratedItems = 0
    let totalMovementsScanned = 0
    let totalCandidatesFound = 0
    
    // 1. Fetch ALL existing invoices for de-duplication
    const { data: allExistingInvoices, error: invFetchError } = await supabase
      .from('purchase_invoices')
      .select('invoice_number')
    
    if (invFetchError) throw invFetchError
    const existingInvNumbers = new Set((allExistingInvoices || []).map(i => i.invoice_number))

    // 2. Fetch 'in' stock movements in batches to overcome Supabase 1000-row limit
    let hasMore = true
    let page = 0
    const pageSize = 1000
    const htgCandidates: any[] = []

    // Helper to safely get relationship data (handles array or object)
    const getRel = (obj: any, key: string) => {
      if (!obj || !obj[key]) return null
      return Array.isArray(obj[key]) ? obj[key][0] : obj[key]
    }

    while (hasMore) {
      console.log(`Fetching movements page ${page}...`)
      const { data: batch, error: movError } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products (id, name, supplier_id, cost),
          payment_methods (name)
        `)
        .eq('movement_type', 'in')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('created_at', { ascending: false })

      if (movError) {
        console.error('Error fetching batch:', movError)
        hasMore = false
        break
      }

      if (!batch || batch.length === 0) {
        hasMore = false
        break
      }

      totalMovementsScanned += batch.length

      // Filter this batch
      const batchCandidates = batch.filter(m => {
        const pm = getRel(m, 'payment_methods')
        const prod = getRel(m, 'products')
        
        const pmName = (pm?.name || '').toLowerCase()
        const isCash = pmName.includes('cash') || pmName.includes('tunai')
        const isDebtPM = pmName.includes('hutang') || pmName.includes('tempo') || pmName.includes('kredit')
        
        // If it's explicitly debt, OR if it's not cash and has no PM (legacy)
        const isHutang = isDebtPM || (!isCash && pmName === '')
        
        const isAlreadyInvoiced = m.reference && existingInvNumbers.has(m.reference)
        // Check if it's an auto-reference but somehow missing from current invoices
        const isAutoRefMissing = m.reference && m.reference.startsWith('INV-AUTO-') && !existingInvNumbers.has(m.reference)
        
        const hasSupplier = prod?.supplier_id
        
        // We include it if it's hutang and not invoiced, OR if the auto-ref is missing
        return (isHutang && !isAlreadyInvoiced) || isAutoRefMissing && hasSupplier
      })

      htgCandidates.push(...batchCandidates)
      totalCandidatesFound += batchCandidates.length

      if (batch.length < pageSize) hasMore = false
      page++
    }

    console.log(`Scanned ${totalMovementsScanned} movements. Found ${totalCandidatesFound} candidates.`)

    // 3. Group candidates by reference
    const groups: Record<string, any[]> = {}
    htgCandidates.forEach(m => {
      const prod = getRel(m, 'products')
      const groupKey = m.reference || `GROUP-${prod?.supplier_id || 'unknown'}-${new Date(m.created_at).toISOString().split('T')[0]}`
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(m)
    })

    // 4. Migrate each group
    for (const [ref, groupMovs] of Object.entries(groups)) {
      try {
        const firstMov = groupMovs[0]
        const prod = getRel(firstMov, 'products')
        const supplierId = prod?.supplier_id

        if (!supplierId) continue

        const itemsToInsert = groupMovs.map(m => {
          const mProd = getRel(m, 'products')
          const price = m.unit_price || mProd?.cost || 0
          return {
            product_id: m.product_id,
            quantity: m.quantity,
            unit_price: price,
            line_total: m.quantity * price,
            mov_id: m.id
          }
        })

        const totalAmount = itemsToInsert.reduce((sum, item) => sum + item.line_total, 0)
        if (totalAmount <= 0) continue

        const invoiceNumber = ref.startsWith('GROUP-') 
          ? `INV-AUTO-MIG-${Date.now().toString().slice(-6)}-${firstMov.id.slice(0, 4)}` 
          : ref

        const { data: invoice, error: invError } = await supabase
          .from('purchase_invoices')
          .insert({
            supplier_id: supplierId,
            invoice_number: invoiceNumber,
            invoice_date: new Date(firstMov.created_at).toISOString().split('T')[0],
            due_date: new Date(new Date(firstMov.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'received',
            payment_status: 'unpaid',
            total_amount: totalAmount,
            paid_amount: 0,
            notes: `Auto-migrated (${groupMovs.length} item)`,
            created_by: 'system_migration'
          })
          .select()
          .single()

        if (invError) {
          console.error(`Error creating invoice ${invoiceNumber}:`, invError)
          continue
        }

        await supabase.from('purchase_invoice_items').insert(itemsToInsert.map(item => ({
          purchase_invoice_id: invoice.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          notes: `Migrated from Stock Mov: ${item.mov_id}`
        })))

        for (const m of groupMovs) {
          if (!m.reference) {
            await supabase.from('stock_movements').update({ reference: invoiceNumber }).eq('id', m.id)
          }
        }

        totalMigratedInvoices++
        totalMigratedItems += groupMovs.length

      } catch (err) {
        console.error('Fatal error in sync loop:', err)
      }
    }

    // --- CLEANUP DIAGNOSTIC DUMMY ---
    try {
      await supabase.from('purchase_invoices').delete().like('invoice_number', 'DIAG-TEST-%')
    } catch (cleanupErr) {
      console.error('Cleanup failed:', cleanupErr)
    }

    const report = `Pindai ${totalMovementsScanned} riwayat, temukan ${totalCandidatesFound} nota potensial. Berhasil migrasi ${totalMigratedInvoices} nota baru ke modul hutang.`
    console.log(report)
    console.groupEnd()
    
    return report
  }
}
