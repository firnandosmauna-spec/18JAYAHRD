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

    // Fetch unpaid invoice totals per supplier
    const { data: invoices, error: invoicesError } = await supabase
      .from('purchase_invoices')
      .select('supplier_id, total_amount, paid_amount')
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled');

    try {
      if (invoicesError) {
        console.warn('Error fetching supplier debts:', invoicesError);
        return suppliers || [];
      }

      // Aggregate debt per supplier
      const debtMap = (invoices || []).reduce((acc: any, inv) => {
        const debt = (inv.total_amount || 0) - (inv.paid_amount || 0);
        acc[inv.supplier_id] = (acc[inv.supplier_id] || 0) + debt;
        return acc;
      }, {});

      const result = (suppliers || []).map(s => {
        const debtFromInvoices = debtMap[s.id] || 0;
        
        return {
          ...s,
          total_debt: debtFromInvoices > 0 ? debtFromInvoices : 0
        };
      });

      console.log(`Fetched ${result.length} suppliers with balances`);
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
    
    console.log('Supplier deposit added successfully:', data);
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
    const { error } = await supabase
      .from('supplier_deposits')
      .delete()
      .eq('id', id);

    if (error) throw error;
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