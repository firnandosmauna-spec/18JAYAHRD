import { supabase } from '@/lib/supabase';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseStats,
  SupplierDeposit
} from '@/types/purchase';
import type { Product } from '@/types/sales';

export class PurchaseService {
  // Supplier Management
  static async getSuppliers(): Promise<Supplier[]> {
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (suppliersError) throw suppliersError;

    // Fetch semua transaksi deposit untuk menghitung saldo terkini
    const { data: deposits } = await supabase
      .from('supplier_deposits')
      .select('supplier_id, amount, type');

    // Hitung deposit_balance dari riwayat transaksi (lebih akurat dari kolom cached)
    const depositMap = (deposits || []).reduce((acc: Record<string, number>, d) => {
      const type = (d.type || '').toLowerCase().trim();
      const isNegative = ['usage', 'payment', 'penggunaan'].includes(type);
      const delta = isNegative ? -Number(d.amount) : Number(d.amount);
      acc[d.supplier_id] = (acc[d.supplier_id] || 0) + delta;
      return acc;
    }, {});

    // Fetch ALL unpaid invoices using batching to overcome the 1000-row limit
    let allInvoices: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMoreInvoices = true;

    while (hasMoreInvoices) {
      const { data: invBatch, error: invError } = await supabase
        .from('purchase_invoices')
        .select('supplier_id, total_amount, paid_amount')
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .range(from, from + limit - 1);

      if (invError) {
        console.warn('Error fetching supplier debts batch:', invError);
        break;
      }

      if (!invBatch || invBatch.length === 0) {
        hasMoreInvoices = false;
      } else {
        allInvoices = [...allInvoices, ...invBatch];
        if (invBatch.length < limit) hasMoreInvoices = false;
        from += limit;
      }
    }

    try {
      // Aggregate debt per supplier
      const debtMap = (allInvoices || []).reduce((acc: any, inv) => {
        const debt = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);
        acc[inv.supplier_id] = (acc[inv.supplier_id] || 0) + debt;
        return acc;
      }, {});

      const result = (suppliers || []).map(s => {
        const debtFromInvoices = debtMap[s.id] || 0;
        // Gunakan saldo yang ada di tabel supplier sebagai base, 
        // dan pastikan tidak hilang saat ada kalkulasi history
        return {
          ...s,
          deposit_balance: Number(s.deposit_balance || 0),
          total_debt: Number(debtFromInvoices || 0)
        };
      });

      console.log(`Fetched ${result.length} suppliers. Total deposit: ${result.reduce((a, s) => a + (s.deposit_balance || 0), 0)}`);
      return result;
    } catch (error) {
      console.error('Error in getSuppliers process:', error);
      return suppliers || [];
    }
  }

  static async getSupplier(id: string): Promise<Supplier | null> {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!supplier) return null;

    // Fetch unpaid invoice totals for this supplier
    const { data: invoices } = await supabase
      .from('purchase_invoices')
      .select('total_amount, paid_amount')
      .eq('supplier_id', id)
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled');

    const totalDebt = (invoices || []).reduce((sum, inv) => {
      return sum + ((inv.total_amount || 0) - (inv.paid_amount || 0));
    }, 0);

    const isHutang = supplier.payment_method?.toLowerCase() === 'hutang';
    return {
      ...supplier,
      total_debt: isHutang ? totalDebt : 0
    };
  }

  static async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Purchase Order Management
  static async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createPurchaseOrder(
    order: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id'>[]
  ): Promise<PurchaseOrder> {
    const { data: orderData, error: orderError } = await supabase
      .from('purchase_orders')
      .insert(order)
      .select()
      .single();

    if (orderError) throw orderError;

    if (items.length > 0) {
      const orderItems = items.map(item => ({
        ...item,
        purchase_order_id: orderData.id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    }

    return this.getPurchaseOrder(orderData.id) as Promise<PurchaseOrder>;
  }

  static async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePurchaseOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Purchase Invoice Management
  static async getPurchaseInvoicesBySupplier(supplierId: string): Promise<PurchaseInvoice[]> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`
        *,
        payment_method:payment_methods(id, name)
      `)
      .eq('supplier_id', supplierId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`
        *,
        supplier:suppliers(*),
        purchase_order:purchase_orders(*),
        payment_method:payment_methods(id, name),
        items:purchase_invoice_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | null> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`
        *,
        supplier:suppliers(*),
        purchase_order:purchase_orders(*),
        payment_method:payment_methods(id, name),
        items:purchase_invoice_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createPurchaseInvoice(
    invoice: Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Omit<PurchaseInvoiceItem, 'id' | 'purchase_invoice_id'>[]
  ): Promise<PurchaseInvoice> {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('purchase_invoices')
      .insert(invoice)
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    if (items.length > 0) {
      const invoiceItems = items.map(item => ({
        ...item,
        purchase_invoice_id: invoiceData.id
      }));

      const { error: itemsError } = await supabase
        .from('purchase_invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;
    }

    return this.getPurchaseInvoice(invoiceData.id) as Promise<PurchaseInvoice>;
  }

  static async updatePurchaseInvoice(id: string, updates: Partial<PurchaseInvoice>): Promise<PurchaseInvoice> {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePurchaseInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Statistics and Reports
  static async getPurchaseStats(): Promise<PurchaseStats> {
    const [
      ordersResult,
      invoicesResult,
      suppliersResult,
      productsResult
    ] = await Promise.all([
      supabase.from('purchase_orders').select('total_amount, status'),
      supabase.from('purchase_invoices').select('total_amount, payment_status, due_date'),
      supabase.from('suppliers').select('id, name'),
      supabase.from('products').select('id, name')
    ]);

    const orders = ordersResult.data || [];
    const invoices = invoicesResult.data || [];

    const totalExpenses = invoices
      .filter(inv => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const pendingInvoices = invoices.filter(inv => inv.payment_status === 'unpaid').length;
    const overdueInvoices = invoices.filter(inv =>
      inv.payment_status === 'unpaid' && new Date(inv.due_date) < new Date()
    ).length;

    return {
      totalExpenses,
      totalOrders: orders.length,
      totalInvoices: invoices.length,
      pendingInvoices,
      overdueInvoices,
      topSuppliers: [], // TODO: Implement detailed stats
      topProducts: [], // TODO: Implement detailed stats
      monthlyExpenses: [] // TODO: Implement detailed stats
    };
  }

  // Deposit Management
  static async getSupplierDeposits(supplierId: string): Promise<SupplierDeposit[]> {
    const { data, error } = await supabase
      .from('supplier_deposits')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addSupplierDeposit(deposit: Omit<SupplierDeposit, 'id' | 'created_at'>): Promise<SupplierDeposit> {
    console.log('Adding supplier deposit:', deposit);
    const { data, error } = await supabase
      .from('supplier_deposits')
      .insert(deposit)
      .select()
      .single();

    if (error) {
      console.error('Error adding supplier deposit:', error);
      throw error;
    }
    
    // UPDATE SALDO DI TABEL SUPPLIERS (PENTING!)
    const { data: currentSupp } = await supabase.from('suppliers').select('deposit_balance').eq('id', deposit.supplier_id).single();
    const currentBalance = Number(currentSupp?.deposit_balance || 0);
    const delta = (deposit.type || '').toLowerCase().trim() === 'usage' || 
                  (deposit.type || '').toLowerCase().trim() === 'payment' ||
                  (deposit.type || '').toLowerCase().trim() === 'penggunaan'
                  ? -Number(deposit.amount) : Number(deposit.amount);
    
    await supabase.from('suppliers')
      .update({ deposit_balance: currentBalance + delta })
      .eq('id', deposit.supplier_id);

    console.log('Supplier deposit added and balance updated successfully:', data);
    return data;
  }

  static async updateSupplierDeposit(id: string, updates: Partial<SupplierDeposit>): Promise<SupplierDeposit> {
    const { data, error } = await supabase
      .from('supplier_deposits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteSupplierDeposit(id: string): Promise<void> {
    // Ambil data sebelum dihapus untuk menyesuaikan saldo
    const { data: deposit } = await supabase.from('supplier_deposits').select('*').eq('id', id).single();
    
    const { error } = await supabase
      .from('supplier_deposits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (deposit) {
      const { data: currentSupp } = await supabase.from('suppliers').select('deposit_balance').eq('id', deposit.supplier_id).single();
      const currentBalance = Number(currentSupp?.deposit_balance || 0);
      const delta = deposit.type === 'deposit' ? Number(deposit.amount) : -Number(deposit.amount);
      
      await supabase.from('suppliers')
        .update({ deposit_balance: currentBalance - delta })
        .eq('id', deposit.supplier_id);
    }
  }

  // Utility Methods
  static generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `PO-${year}${month}-${timestamp}`;
  }

  static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `PINV-${year}${month}-${timestamp}`;
  }
}