export interface Supplier {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  payment_terms?: number; // days
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier?: Supplier;
  order_date: string;
  expected_delivery_date?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product?: import('./sales').Product;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  notes?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  purchase_order_id?: string;
  purchase_order?: PurchaseOrder;
  supplier_id: string;
  supplier?: Supplier;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'received' | 'paid' | 'overdue' | 'cancelled';
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
  items?: PurchaseInvoiceItem[];
}

export interface PurchaseInvoiceItem {
  id: string;
  purchase_invoice_id: string;
  product_id: string;
  product?: import('./sales').Product;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
  notes?: string;
}

export interface PurchaseStats {
  totalExpenses: number;
  totalOrders: number;
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  topSuppliers: Array<{
    supplier: Supplier;
    totalAmount: number;
    orderCount: number;
  }>;
  topProducts: Array<{
    product: import('./sales').Product;
    totalQuantity: number;
    totalAmount: number;
  }>;
  monthlyExpenses: Array<{
    month: string;
    expenses: number;
  }>;
}