// Core accounting types and interfaces

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type TransactionStatus = 'draft' | 'posted' | 'reversed';
export type ReportType = 'income_statement' | 'balance_sheet' | 'cash_flow';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string;
  is_active: boolean;
  balance?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  reference?: string;
  status: TransactionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  entries?: JournalEntry[];
}

export interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at: string;
  account?: Account;
}

export interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface FinancialReport {
  type: ReportType;
  period_start: string;
  period_end: string;
  data: ReportSection[];
  totals: ReportTotals;
  generated_at: string;
}

export interface ReportSection {
  title: string;
  accounts: ReportAccount[];
  subtotal: number;
}

export interface ReportAccount {
  code: string;
  name: string;
  amount: number;
  percentage?: number;
}

export interface ReportTotals {
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  total_revenue?: number;
  total_expenses?: number;
  net_income?: number;
}

export interface TransactionAudit {
  id: string;
  transaction_id: string;
  action: string;
  old_data?: any;
  new_data?: any;
  changed_by: string;
  changed_at: string;
}

export interface DashboardKPI {
  cash_position: number;
  monthly_revenue: number;
  monthly_expenses: number;
  net_income: number;
  profit_margin: number;
  expense_ratio: number;
  revenue_growth: number;
  expense_growth: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

// Validation schemas
export interface TransactionValidation {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  errors: string[];
}

export interface AccountHierarchy extends Account {
  children?: AccountHierarchy[];
  level: number;
}

// Filter and search interfaces
export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  status?: TransactionStatus;
  searchQuery?: string;
}

export interface ReportFilter {
  startDate: string;
  endDate: string;
  accountTypes?: AccountType[];
  includeInactive?: boolean;
}

// Export formats
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeDetails: boolean;
  filename?: string;
}