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
    const debtMap = invoices?.reduce((acc: any, curr: any) => {
      const debt = (Number(curr.total_amount) - Number(curr.paid_amount))
      acc[curr.supplier_id] = (acc[curr.supplier_id] || 0) + debt
      return acc
    }, {})

    const countMap = invoices?.reduce((acc: any, curr: any) => {
      acc[curr.supplier_id] = (acc[curr.supplier_id] || 0) + 1
      return acc
    }, {})

    // 4. Map back to all suppliers
    return (suppliers || []).map(s => ({
      supplierId: s.id,
      supplierName: s.name,
      totalDebt: debtMap?.[s.id] || 0,
      invoiceCount: countMap?.[s.id] || 0
    }))
  }
}
