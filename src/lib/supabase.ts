import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check configuration status
// fallback to hardcoded values to unblock deployment
const hardcodedUrl = "https://omfzoasehiecuzaudblp.supabase.co";
const hardcodedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTczNjIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M";

const finalUrl = supabaseUrl || hardcodedUrl;
const finalKey = supabaseAnonKey || hardcodedKey;

export const isSupabaseConfigured = !!(finalUrl && finalKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase configuration missing. App will start in Setup Mode.');
}

// Create client with placeholders if missing to prevent crash, 
// but App.tsx will block usage if !isSupabaseConfigured
export const supabase = createClient(
  finalUrl,
  finalKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
)

// Non-persisting client for administrative tasks (prevent session hijacking and instance conflicts)
export const supabaseNoSession = createClient(
  finalUrl,
  finalKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
      }
    }
  }
)

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Department, 'id' | 'created_at'>>
      }
      leave_requests: {
        Row: LeaveRequest
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at'>>
      }
      attendance: {
        Row: AttendanceRecord
        Insert: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AttendanceRecord, 'id' | 'created_at'>>
      }
      payroll: {
        Row: PayrollRecord
        Insert: Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PayrollRecord, 'id' | 'created_at'>>
      }
      rewards: {
        Row: RewardRecord
        Insert: Omit<RewardRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RewardRecord, 'id' | 'created_at'>>
      }
      notifications: {
        Row: NotificationRecord
        Insert: Omit<NotificationRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<NotificationRecord, 'id' | 'created_at'>>
      }
      employee_loans: {
        Row: EmployeeLoan
        Insert: Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EmployeeLoan, 'id' | 'created_at'>>
      }
      employee_loan_payments: {
        Row: LoanPayment
        Insert: Omit<LoanPayment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<LoanPayment, 'id' | 'created_at'>>
      }
      employee_contracts: {
        Row: EmployeeContract
        Insert: Omit<EmployeeContract, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EmployeeContract, 'id' | 'created_at'>>
      }
      job_history: {
        Row: JobHistory
        Insert: Omit<JobHistory, 'id' | 'created_at'>
        Update: Partial<Omit<JobHistory, 'id' | 'created_at'>>
      }
      leave_quotas: {
        Row: LeaveQuota
        Insert: Omit<LeaveQuota, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<LeaveQuota, 'id' | 'created_at'>>
      }
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Account, 'id' | 'created_at'>>
      }
      transactions: {
        Row: Transaction
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>
      }
      journal_entries: {
        Row: JournalEntry
        Insert: Omit<JournalEntry, 'id' | 'created_at'>
        Update: Partial<Omit<JournalEntry, 'id' | 'created_at'>>
      }
      product_categories: {
        Row: ProductCategory
        Insert: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProductCategory, 'id' | 'created_at'>>
      }
      warehouses: {
        Row: Warehouse
        Insert: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Warehouse, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      stock_movements: {
        Row: StockMovement
        Insert: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StockMovement, 'id' | 'created_at'>>
      }
      product_price_history: {
        Row: ProductPriceHistory
        Insert: Omit<ProductPriceHistory, 'id' | 'created_at'>
        Update: Partial<Omit<ProductPriceHistory, 'id' | 'created_at'>>
      }
      positions: {
        Row: Position
        Insert: Omit<Position, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Position, 'id' | 'created_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      project_phases: {
        Row: ProjectPhase
        Insert: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProjectPhase, 'id' | 'created_at'>>
      }
      project_materials: {
        Row: ProjectMaterial
        Insert: Omit<ProjectMaterial, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProjectMaterial, 'id' | 'created_at'>>
      }
      project_workers: {
        Row: ProjectWorker
        Insert: Omit<ProjectWorker, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProjectWorker, 'id' | 'created_at'>>
      }
      reward_types: {
        Row: RewardTypeMaster
        Insert: Omit<RewardTypeMaster, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RewardTypeMaster, 'id' | 'created_at'>>
      }
      company_sops: {
        Row: CompanySOP
        Insert: Omit<CompanySOP, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CompanySOP, 'id' | 'created_at'>>
      }
      consumer_profiles: {
        Row: ConsumerProfile
        Insert: Omit<ConsumerProfile, 'id' | 'created_at'>
        Update: Partial<Omit<ConsumerProfile, 'id' | 'created_at'>>
      }
      supplier_invoices: {
        Row: SupplierInvoice
        Insert: Omit<SupplierInvoice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SupplierInvoice, 'id' | 'created_at'>>
      }
      supplier_payments: {
        Row: SupplierPayment
        Insert: Omit<SupplierPayment, 'id' | 'created_at'>
        Update: Partial<Omit<SupplierPayment, 'id' | 'created_at'>>
      }
      payment_methods: {
        Row: any
        Insert: any
        Update: any
      }
    }
  }
}

// Type Definitions
export interface Profile {
  id: string
  email: string
  name: string
  role: 'Administrator' | 'manager' | 'staff' | 'marketing'
  avatar?: string
  modules: string[]
  employee_id?: string
  created_at: string
  updated_at: string
}

export interface CompanySOP {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string
  name: string
  nik?: string
  position: string
  department: string
  department_id?: string
  status: 'active' | 'inactive' | 'on-leave' | 'terminated'
  join_date: string
  salary: number
  bank_account?: string
  bank?: string
  phone?: string
  email?: string
  address?: string
  emergency_contact?: string
  sales_target?: number
  sales_achieved?: number
  attendance_score: number
  innovation_projects?: number;
  team_leadership?: boolean;
  customer_rating?: number;
  worker_type_id?: string | null;
  worker_types?: {
      id: string;
      name: string;
  };
  departments?: {
    id: string;
    name: string;
  };
  allowances?: { title: string; amount: number }[];
  deductions?: { title: string; amount: number }[];
  contract_file_url?: string | null;
  profiles?: { avatar: string | null } | { avatar: string | null }[];
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description?: string
  manager_id?: string
  budget?: number
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'maternity' | 'paternity' | 'marriage' | 'bereavement' | 'unpaid' | 'permission' | 'situational'
  start_date: string
  end_date: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  emergency_contact?: string
  handover_to?: string
  is_late_submission?: boolean
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in?: string
  check_out?: string
  status: 'present' | 'late' | 'absent' | 'leave' | 'holiday'
  work_hours?: string
  location?: string
  notes?: string
  is_manual?: boolean
  manual_status?: 'pending' | 'approved' | 'rejected'
  manual_reason?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface PayrollRecord {
  id: string
  employee_id: string
  period_month: number
  period_year: number
  base_salary: number
  allowances: number
  deductions: number
  net_salary: number
  status: 'pending' | 'paid' | 'cancelled'
  pay_date?: string
  // New Fields
  gasoline_allowance?: number
  meal_allowance?: number
  position_allowance?: number
  discretionary_allowance?: number
  thr_allowance?: number
  reward_allowance?: number
  reward_details?: { title: string, amount: number }[]
  bpjs_deduction?: number
  absent_deduction?: number
  late_deduction?: number
  overtime_hours?: number
  overtime_rate?: number
  manual_allowance_details?: { title: string, amount: number }[]
  manual_deduction_details?: { title: string, amount: number }[]
  bank_account_details?: string
  is_perfect_attendance?: boolean
  loan_amount?: number
  start_date?: string
  end_date?: string
  updated_at: string
}

export interface RewardTypeMaster {
  id: string
  name: string
  code: string
  default_points: number
  monetary_percentage?: number
  description?: string
  icon_name: string
  created_at: string
  updated_at: string
}

export interface RewardRecord {
  id: string
  employee_id: string
  type: string
  title: string
  description: string
  points: number
  status: 'active' | 'claimed' | 'expired'
  awarded_date: string
  claimed_date?: string
  created_at: string
  updated_at: string
}

export interface NotificationRecord {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'announcement' | 'mandatory_announcement'
  module: string
  user_id?: string
  read: boolean
  is_mandatory?: boolean
  is_popup?: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeLoan {
  id: string
  employee_id: string
  amount: number
  requested_amount: number
  remaining_amount: number
  installment_amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'paid_off'
  admin_notes?: string
  approved_by?: string
  approved_at?: string
  start_date: string
  created_at: string
  updated_at: string
}

export interface LoanPayment {
  id: string
  loan_id: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'payroll' | 'transfer'
  notes?: string
  created_at: string
  updated_at: string
}

export interface EmployeeContract {
  id: string
  employee_id: string
  contract_number: string
  type: 'permanent' | 'probation' | 'contract' | 'freelance'
  start_date: string
  end_date: string | null
  status: 'active' | 'expired' | 'terminated'
  document_url: string | null
  created_at: string
  updated_at: string
}

export interface JobHistory {
  id: string
  employee_id: string
  old_position: string | null
  new_position: string
  old_department_id: string | null
  new_department_id: string | null
  change_date: string
  reason: string | null
  created_at: string
}

export interface LeaveQuota {
  id: string
  employee_id: string
  year: number
  total_days: number
  used_days: number
  remaining_days: number
  created_at: string
  updated_at: string
}

// Accounting Types
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type TransactionStatus = 'draft' | 'posted' | 'reversed'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parent_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  reference?: string
  status: TransactionStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  transaction_id: string
  account_id: string
  debit_amount: number
  credit_amount: number
  description?: string
  created_at: string
}

// Inventory Types
export interface ProductCategory {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: string
  name: string
  location?: string
  description?: string
  capacity?: number
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  sku: string
  category_id?: string
  description?: string
  stock: number
  min_stock: number
  max_stock?: number
  unit: string
  price: number
  initial_price?: number
  cost?: number
  initial_cost?: number
  warehouse_id?: string
  status: 'active' | 'inactive' | 'discontinued'
  image_url?: string
  barcode?: string
  volume?: string
  project_location?: string
  date?: string
  supplier_id?: string
  suppliers?: {
    id: string
    name: string
  }
  product_categories?: {
    id: string
    name: string
  }
  warehouses?: {
    id: string
    name: string
  }
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  warehouse_id?: string
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment'
  quantity: number
  reference?: string
  reference_type?: string
  notes?: string
  unit_price: number
  payment_method_id?: string
  project_location?: string
  movement_category?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  old_cost?: number;
  new_cost?: number;
  old_price?: number;
  new_price?: number;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  target_field: 'cost' | 'price' | 'both';
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface Position {
  id: string
  title: string
  department: string
  level?: string
  gaji_pokok?: number
  job_desc?: string
  created_at: string
  updated_at: string
}

// Project Types
export interface Project {
  id: string
  name: string
  client_name: string
  client_phone?: string
  location?: string
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled'
  type?: string
  area_sqm?: number
  start_date?: string
  end_date?: string
  budget: number
  spent: number
  progress: number
  description?: string
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed'
  start_date?: string
  end_date?: string
  weightage: number
  created_at: string
  updated_at: string
}

export interface ProjectMaterial {
  id: string
  project_id: string
  product_id: string
  quantity_planned: number
  quantity_used: number
  unit: string
  cost_per_unit: number
  total_cost: number
  created_at: string
  updated_at: string
  // Joins
  products?: {
    name: string
    sku: string
  }
}

export interface ProjectWorker {
  id: string
  project_id: string
  employee_id: string
  role: string
  daily_rate: number
  status: 'active' | 'inactive'
  joined_at: string
  created_at: string
  updated_at: string
  // Joins
  employees?: {
    name: string
    position: string
  }
}

export interface ConsumerProfile {
  id: string
  code: string
  name: string
  id_card_number?: string
  address?: string
  phone?: string
  email?: string
  sales_person?: string
  sales_person_id?: string
  housing_project?: string
  booking_fee_status?: 'paid' | 'unpaid'
  npwp?: string
  company_id_number?: string
  booking_remarks?: string
  salary?: number
  occupation?: string
  employer_name?: string
  employer_address?: string
  employer_phone?: string
  employer_remarks?: string
  marital_status?: string
  spouse_name?: string
  spouse_phone?: string
  spouse_occupation?: string
  spouse_office_address?: string
  spouse_remarks?: string
  family_name?: string
  family_relationship?: string
  family_phone?: string
  family_address?: string
  source?: string
  bank_process?: string
  created_at: string
}

export interface SupplierInvoice {
  id: string
  supplier_id: string
  invoice_number: string
  amount: number
  remaining_amount: number
  due_date?: string
  invoice_date: string
  status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue'
  notes?: string
  created_at: string
  updated_at: string
  suppliers?: {
    name: string
  }
}

export interface SupplierPayment {
  id: string
  supplier_id: string
  invoice_id?: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  notes?: string
  created_at: string
  suppliers?: {
    name: string
  }
  supplier_invoices?: {
    invoice_number: string
  }
}
