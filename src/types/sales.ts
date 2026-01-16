export interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number; // days
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer?: Customer;
  order_date: string;
  delivery_date?: string;
  status: 'draft' | 'confirmed' | 'delivered' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  notes?: string;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  sales_order_id?: string;
  sales_order?: SalesOrder;
  customer_id: string;
  customer?: Customer;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: SalesInvoiceItem[];
}

export interface SalesInvoiceItem {
  id: string;
  sales_invoice_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  notes?: string;
}

export interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  topCustomers: Array<{
    customer: Customer;
    totalAmount: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    product: Product;
    totalQuantity: number;
    totalAmount: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}