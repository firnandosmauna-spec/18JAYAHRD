import { supabase } from '../lib/supabase';
import type {
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseInvoice,
    PurchaseInvoiceItem,
    PurchaseStats
} from '../types/purchase';
import type { Product } from '../types/sales';

export class PurchaseService {
    // Supplier Management
    static async getSuppliers(): Promise<Supplier[]> {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    }

    static async getSupplier(id: string): Promise<Supplier | null> {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
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
