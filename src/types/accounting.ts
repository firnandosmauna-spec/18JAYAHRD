export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    description?: string;
    balance: number;
    is_active: boolean;
    parent_id?: string;
    created_at: string;
    updated_at: string;
}

export type JournalStatus = 'draft' | 'posted' | 'void';

export interface JournalEntry {
    id: string;
    date: string;
    description: string;
    reference?: string;
    status: JournalStatus;
    items: JournalItem[];
    created_by: string;
    created_at: string;
}

export interface JournalItem {
    id: string;
    journal_id: string;
    account_id: string;
    account_name: string;
    account_code: string;
    description?: string;
    debit: number;
    credit: number;
}

export interface LedgerEntry {
    account_id: string;
    account_name: string;
    account_code: string;
    initial_balance: number;
    items: LedgerItem[];
    final_balance: number;
}

export interface LedgerItem {
    date: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    running_balance: number;
}

export interface TrialBalanceItem {
    account_id: string;
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
}

export interface ProfitLossReport {
    period: string;
    revenue: AccountBalance[];
    total_revenue: number;
    expense: AccountBalance[];
    total_expense: number;
    net_profit: number;
}

export interface BalanceSheetReport {
    date: string;
    assets: AccountBalance[];
    total_assets: number;
    liabilities: AccountBalance[];
    total_liabilities: number;
    equity: AccountBalance[];
    total_equity: number;
}

export interface AccountBalance {
    account_id: string;
    account_code: string;
    account_name: string;
    balance: number;
}
