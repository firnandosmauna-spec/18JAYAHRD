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

  async syncAllSupplierDebts(targetSupplierId?: string) {
    console.group('=== DEEP HISTORY SYNC REPORT ===');
    console.log('[Sync Debug] Started for Supplier ID:', targetSupplierId);
    let totalMigratedInvoices = 0;
    let totalMovementsScanned = 0;
    let alreadyInvoicedCount = 0;
    let updatedInvoicesCount = 0;

    try {
      // 1. Diagnostics & Repair (Simplified for stability)
      const targetSuppId = targetSupplierId || '2fa96adc-bfb9-44c6-a25d-d9a254a26d55';

      // 2. Fetch existing invoice item links
      const { data: allItems } = await supabase.from('purchase_invoice_items').select('notes');
      const invoicedMovementIds = new Set<string>();
      allItems?.forEach(item => {
        const match = item.notes?.match(/(?:Migrated from Stock Mov|Auto-generated from movement): ([a-f0-9-]+)/i);
        if (match && match[1]) invoicedMovementIds.add(match[1]);
      });

      // 3. Batch Scan Movements
      let hasMore = true;
      let page = 0;
      while (hasMore) {
        const { data: batch } = await supabase.from('stock_movements')
          .select('*, products(id, name, supplier_id, cost)')
          .eq('type', 'in')
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (!batch || batch.length === 0) break;
        console.log(`[Sync Debug] Page ${page} batch size: ${batch.length}`);
        
        const htgCandidates = batch.filter(m => {
          const p = m.products;
          const suppId = Array.isArray(p) ? p[0]?.supplier_id : (p as any)?.supplier_id;
          
          if (suppId === targetSuppId) {
            console.log(`[Sync Debug] Found movement for target supplier:`, {
              id: m.id,
              ref: m.reference,
              invoiced: invoicedMovementIds.has(m.id)
            });
          }

          if (!suppId || suppId !== targetSuppId) return false;
          if (invoicedMovementIds.has(m.id)) { alreadyInvoicedCount++; return false; }
          return true;
        });
        
        if (htgCandidates.length > 0) {
          console.log(`[Sync Debug] Found ${htgCandidates.length} new candidates for this page!`);
        }

        // Group & Migrate
        const groups: Record<string, any[]> = {};
        htgCandidates.forEach(m => {
          const ref = m.reference || `AUTO-${new Date(m.created_at).getTime()}`;
          if (!groups[ref]) groups[ref] = [];
          groups[ref].push(m);
        });

        for (const [ref, group] of Object.entries(groups)) {
          const totalAmount = group.reduce((sum, m) => sum + (m.quantity * (m.unit_price || 0)), 0);
          const { data: newInv, error: invErr } = await supabase.from('purchase_invoices').insert({
            supplier_id: targetSuppId,
            invoice_number: ref,
            total_amount: totalAmount,
            paid_amount: 0,
            payment_status: 'unpaid',
            status: 'received',
            notes: `Auto-Migrated (${group.length} item)`
          }).select().single();

          if (newInv) {
            totalMigratedInvoices++;
            for (const m of group) {
              await supabase.from('purchase_invoice_items').insert({
                purchase_invoice_id: newInv.id,
                product_id: m.product_id,
                quantity: m.quantity,
                unit_price: m.unit_price || 0,
                line_total: m.quantity * (m.unit_price || 0),
                notes: `Auto-generated from movement: ${m.id}`
              });
            }
          }
        }
        if (batch.length < 1000) hasMore = false;
        page++;
      }

      // 4. Phase 12: Cross-Supplier Invoice Repair (Agresif)
      const { data: allInvItems } = await supabase
        .from('purchase_invoice_items')
        .select('purchase_invoice_id, notes');

      for (const item of (allInvItems || [])) {
        const mIdMatch = item.notes?.match(/(?:Migrated from Stock Mov|Auto-generated from movement): ([a-f0-9-]+)/i);
        if (mIdMatch && mIdMatch[1]) {
          const mId = mIdMatch[1];
          // Check if this movement belongs to our target supplier
          const { data: mov } = await supabase
            .from('stock_movements')
            .select('products(supplier_id)')
            .eq('id', mId)
            .single();
          
          const actualSuppId = (mov?.products as any)?.supplier_id;
          if (actualSuppId === targetSuppId) {
            // This item SHOULD belong to our target supplier. Ensure the invoice matches.
            const { data: inv } = await supabase
              .from('purchase_invoices')
              .select('id, supplier_id')
              .eq('id', item.purchase_invoice_id)
              .single();
            
            if (inv && inv.supplier_id !== targetSuppId) {
              console.log(`[Phase 12] RE-ASSIGNING invoice ${inv.id} to ${targetSuppId}`);
              await supabase.from('purchase_invoices').update({ supplier_id: targetSuppId }).eq('id', inv.id);
              updatedInvoicesCount++;
            }
          }
        }
      }

      // 5. Final Recalculate
      const { data: finalInvs } = await supabase.from('purchase_invoices')
        .select('*, purchase_invoice_items(*)')
        .eq('supplier_id', targetSuppId);

      for (const inv of (finalInvs || [])) {
        const items = (inv as any).purchase_invoice_items || [];
        const calcTotal = items.reduce((sum: number, it: any) => sum + (it.line_total || 0), 0);
        if (Math.abs(calcTotal - inv.total_amount) > 0.01) {
          await supabase.from('purchase_invoices').update({ total_amount: calcTotal }).eq('id', inv.id);
          updatedInvoicesCount++;
        }
      }

    } finally {
      console.groupEnd();
    }

    return `Selesai. Memindai ${totalMovementsScanned} data. Berhasil sinkron ${totalMigratedInvoices} nota baru & perbarui ${updatedInvoicesCount} saldo.`;
  },

  async getInvoiceItems(invoiceId: string) {
    const { data, error } = await supabase
      .from('purchase_invoice_items')
      .select(`
        *,
        product:products (
          id,
          name
        )
      `)
      .eq('purchase_invoice_id', invoiceId);

    if (error) throw error;
    return data || [];
  },

  async getPaymentsBySupplier(supplierId: string) {
    const { data, error } = await supabase
      .from('purchase_payments')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getSupplierDeposits(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_deposits')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addSupplierDeposit(deposit: any) {
    const { data, error } = await supabase
      .from('supplier_deposits')
      .insert(deposit)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSupplierDeposit(id: string) {
    const { error } = await supabase
      .from('supplier_deposits')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async syncAllSupplierDeposits() {
    console.log('[Sync Deposit] Starting nuclear reconciliation...');
    // 1. Fetch all suppliers
    const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('id, name, deposit_balance');
    if (sErr) throw sErr;
    
    // 2. Fetch all deposit history using batching
    let allDeposits: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data: batch, error: dErr } = await supabase.from('supplier_deposits').select('supplier_id, amount, type').range(from, from + limit - 1);
      if (dErr) throw dErr;
      if (!batch || batch.length === 0) hasMore = false;
      else {
        allDeposits = [...allDeposits, ...batch];
        if (batch.length < limit) hasMore = false;
        from += limit;
      }
    }
    
    // 3. Aggregate totals
    const depositMap = (allDeposits || []).reduce((acc: any, d) => {
      const type = (d.type || '').toLowerCase().trim();
      
      // SANITIZE AMOUNT: Handle strings with dots/commas (Indonesian format)
      let rawAmount = d.amount;
      if (typeof rawAmount === 'string') {
        // Remove all non-numeric characters except maybe a single decimal point if it's there
        // But usually in this DB it's just dots for thousands.
        rawAmount = rawAmount.replace(/[^0-9,-]/g, '').replace(',', '.');
      }
      const amount = Number(rawAmount || 0) || 0;
      
      const negativeTypes = ['usage', 'payment', 'adjustment_out', 'bayar', 'penggunaan', 'out'];
      let delta = negativeTypes.includes(type) ? -amount : amount;
      
      acc[d.supplier_id] = (acc[d.supplier_id] || 0) + delta;
      return acc;
    }, {});
    
    let updatedCount = 0;
    const nameMap: Record<string, number> = {};
    const duplicates: string[] = [];
    
    // 4. Detect Duplicates for reporting
    suppliers.forEach(s => {
      nameMap[s.name] = (nameMap[s.name] || 0) + 1;
      if (nameMap[s.name] === 2) duplicates.push(s.name);
    });

    // 5. Update each supplier balance (Protect against negatives)
    for (const s of (suppliers || [])) {
      let newBalance = depositMap[s.id] || 0;
      
      if (newBalance < 0) newBalance = 0;

      const oldBalance = Number(s.deposit_balance || 0);
      if (Math.abs(newBalance - oldBalance) > 1) {
        await supabase.from('suppliers').update({ 
          deposit_balance: newBalance,
          updated_at: new Date().toISOString() 
        }).eq('id', s.id);
        updatedCount++;
      }
    }
    
    let report = `Sinkronisasi Selesai. Memperbaiki ${updatedCount} data.`;
    if (duplicates.length > 0) {
      report += `\nPERINGATAN: Ditemukan ${duplicates.length} Supplier GANDA (${duplicates.join(', ')}). Segera hubungi admin untuk penggabungan data agar saldo tidak terbagi dua!`;
    }
    
    return report;
  }
};
