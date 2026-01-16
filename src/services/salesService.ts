import { supabase } from '@/lib/supabase';
import type { 
  Customer, 
  Product, 
  SalesOrder, 
  SalesOrderItem, 
  SalesInvoice, 
  SalesInvoiceItem,
  SalesStats 
} from '@/types/sales';

export class SalesService {
  // Customer Management
  static async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Product Management
  static async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Sales Order Management
  static async getSalesOrders(): Promise<SalesOrder[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(*),
        items:sales_order_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getSalesOrder(id: string): Promise<SalesOrder | null> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(*),
        items:sales_order_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createSalesOrder(
    order: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Omit<SalesOrderItem, 'id' | 'sales_order_id'>[]
  ): Promise<SalesOrder> {
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .insert(order)
      .select()
      .single();
    
    if (orderError) throw orderError;

    if (items.length > 0) {
      const orderItems = items.map(item => ({
        ...item,
        sales_order_id: orderData.id
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
    }

    return this.getSalesOrder(orderData.id) as Promise<SalesOrder>;
  }

  static async updateSalesOrder(id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteSalesOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Sales Invoice Management
  static async getSalesInvoices(): Promise<SalesInvoice[]> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(`
        *,
        customer:customers(*),
        sales_order:sales_orders(*),
        items:sales_invoice_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getSalesInvoice(id: string): Promise<SalesInvoice | null> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(`
        *,
        customer:customers(*),
        sales_order:sales_orders(*),
        items:sales_invoice_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createSalesInvoice(
    invoice: Omit<SalesInvoice, 'id' | 'created_at' | 'updated_at' | 'items'>,
    items: Omit<SalesInvoiceItem, 'id' | 'sales_invoice_id'>[]
  ): Promise<SalesInvoice> {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('sales_invoices')
      .insert(invoice)
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;

    if (items.length > 0) {
      const invoiceItems = items.map(item => ({
        ...item,
        sales_invoice_id: invoiceData.id
      }));

      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) throw itemsError;
    }

    return this.getSalesInvoice(invoiceData.id) as Promise<SalesInvoice>;
  }

  static async updateSalesInvoice(id: string, updates: Partial<SalesInvoice>): Promise<SalesInvoice> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteSalesInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_invoices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Statistics and Reports
  static async getSalesStats(): Promise<SalesStats> {
    const [
      ordersResult,
      invoicesResult,
      customersResult,
      productsResult
    ] = await Promise.all([
      supabase.from('sales_orders').select('total_amount, status'),
      supabase.from('sales_invoices').select('total_amount, payment_status, due_date'),
      supabase.from('customers').select('id, name'),
      supabase.from('products').select('id, name')
    ]);

    const orders = ordersResult.data || [];
    const invoices = invoicesResult.data || [];
    
    const totalRevenue = invoices
      .filter(inv => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const pendingInvoices = invoices.filter(inv => inv.payment_status === 'unpaid').length;
    const overdueInvoices = invoices.filter(inv => 
      inv.payment_status === 'unpaid' && new Date(inv.due_date) < new Date()
    ).length;

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalInvoices: invoices.length,
      pendingInvoices,
      overdueInvoices,
      topCustomers: [], // TODO: Implement detailed stats
      topProducts: [], // TODO: Implement detailed stats
      monthlyRevenue: [] // TODO: Implement detailed stats
    };
  }

  // Utility Methods
  static generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `SO-${year}${month}-${timestamp}`;
  }

  static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  }
}