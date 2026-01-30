import { Account, JournalEntry, JournalItem, AccountType, ProfitLossReport, BalanceSheetReport, AccountBalance } from '../types/accounting';
import { supabase } from '../lib/supabase';

class AccountingService {
    // Chart of Accounts (CoA)
    async getAccounts(): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounting_accounts')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async createAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'balance'>): Promise<Account> {
        const { data, error } = await supabase
            .from('accounting_accounts')
            .insert([{ ...account, balance: 0 }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Journal Entries
    async getJournalEntries(): Promise<JournalEntry[]> {
        const { data, error } = await supabase
            .from('accounting_journals')
            .select('*, items:accounting_journal_items(*)')
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'created_at' | 'status'> & { status?: string }): Promise<JournalEntry> {
        const { items, ...entryData } = entry;

        // Validate balance
        const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = items.reduce((sum, item) => sum + item.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error('Journal entry is not balanced. Total Debit must equal Total Credit.');
        }

        // Start transaction (using rpc if multiple inserts are needed, or handle manually)
        // For now, simple insert with items handled separately or via relational insert if supported

        const { data: journal, error: journalError } = await supabase
            .from('accounting_journals')
            .insert([{ ...entryData, status: entry.status || 'posted' }])
            .select()
            .single();

        if (journalError) throw journalError;

        const journalItems = items.map(item => ({
            ...item,
            journal_id: journal.id
        }));

        const { error: itemsError } = await supabase
            .from('accounting_journal_items')
            .insert(journalItems);

        if (itemsError) throw itemsError;

        // Update account balances (This should ideally be done by a trigger in DB or via a procedure)
        for (const item of items) {
            await this.updateAccountBalance(item.account_id, item.debit, item.credit);
        }

        return { ...journal, items };
    }

    private async updateAccountBalance(accountId: string, debit: number, credit: number) {
        // Determine if debit increases or decreases balance based on account type
        const { data: account, error: fetchError } = await supabase
            .from('accounting_accounts')
            .select('type, balance')
            .eq('id', accountId)
            .single();

        if (fetchError) throw fetchError;

        let adjustment = 0;
        const type = account.type as AccountType;

        // Assets, Expenses: Debit increases balance, Credit decreases
        // Liabilities, Equity, Revenue: Debit decreases balance, Credit increases
        if (type === 'asset' || type === 'expense') {
            adjustment = debit - credit;
        } else {
            adjustment = credit - debit;
        }

        const { error: updateError } = await supabase
            .from('accounting_accounts')
            .update({ balance: account.balance + adjustment })
            .eq('id', accountId);

        if (updateError) throw updateError;
    }

    // Reports
    async getProfitLoss(startDate: string, endDate: string): Promise<ProfitLossReport> {
        // Fetch journal items for revenue and expense accounts within period
        // Correct way for Postgrest:
        const { data: journalItems, error: itemsError } = await supabase
            .from('accounting_journal_items')
            .select(`
                debit,
                credit,
                account_id,
                account:accounting_accounts!inner(id, code, name, type),
                journal:accounting_journals!inner(date)
            `)
            .gte('journal.date', startDate)
            .lte('journal.date', endDate)
            .in('account.type', ['revenue', 'expense']);

        if (itemsError) throw itemsError;

        const revenueMap = new Map<string, AccountBalance>();
        const expenseMap = new Map<string, AccountBalance>();

        journalItems.forEach(item => {
            const acc = item.account as any;
            const targetMap = acc.type === 'revenue' ? revenueMap : expenseMap;
            const existing = targetMap.get(acc.id) || {
                account_id: acc.id,
                account_code: acc.code,
                account_name: acc.name,
                balance: 0
            };

            // Revenue: Credit - Debit
            // Expense: Debit - Credit
            if (acc.type === 'revenue') {
                existing.balance += (item.credit - item.debit);
            } else {
                existing.balance += (item.debit - item.credit);
            }
            targetMap.set(acc.id, existing);
        });

        const revenue = Array.from(revenueMap.values());
        const expense = Array.from(expenseMap.values());
        const total_revenue = revenue.reduce((sum, r) => sum + r.balance, 0);
        const total_expense = expense.reduce((sum, e) => sum + e.balance, 0);

        return {
            period: `${startDate} to ${endDate}`,
            revenue,
            total_revenue,
            expense,
            total_expense,
            net_profit: total_revenue - total_expense
        };
    }

    async getBalanceSheet(date: string): Promise<BalanceSheetReport> {
        // Fetch all transactions up to target date for all types to calculate Retained Earnings
        const { data: journalItems, error: itemsError } = await supabase
            .from('accounting_journal_items')
            .select(`
                debit,
                credit,
                account:accounting_accounts!inner(id, code, name, type),
                journal:accounting_journals!inner(date)
            `)
            .lte('journal.date', date);

        if (itemsError) throw itemsError;

        const maps = {
            asset: new Map<string, AccountBalance>(),
            liability: new Map<string, AccountBalance>(),
            equity: new Map<string, AccountBalance>()
        };

        let netProfit = 0;

        journalItems.forEach(item => {
            const acc = item.account as any;

            // Assets, Liabilities, Equity maps
            if (['asset', 'liability', 'equity'].includes(acc.type)) {
                const targetMap = maps[acc.type as keyof typeof maps];
                const existing = targetMap.get(acc.id) || {
                    account_id: acc.id,
                    account_code: acc.code,
                    account_name: acc.name,
                    balance: 0
                };

                if (acc.type === 'asset') {
                    existing.balance += (item.debit - item.credit);
                } else {
                    existing.balance += (item.credit - item.debit);
                }
                targetMap.set(acc.id, existing);
            }

            // Calculate Net Profit for Retained Earnings (Revenue - Expense)
            if (acc.type === 'revenue') {
                netProfit += (item.credit - item.debit);
            } else if (acc.type === 'expense') {
                netProfit -= (item.debit - item.credit);
            }
        });

        const assets = Array.from(maps.asset.values());
        const liabilities = Array.from(maps.liability.values());
        const equity = Array.from(maps.equity.values());

        // Add Net Profit as a row in Equity if not zero
        if (netProfit !== 0) {
            equity.push({
                account_id: 'retained-earnings',
                account_code: '3999',
                account_name: 'Laba (Rugi) Tahun Berjalan',
                balance: netProfit
            });
        }

        const total_assets = assets.reduce((sum, a) => sum + a.balance, 0);
        const total_liabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        const total_equity = equity.reduce((sum, e) => sum + e.balance, 0);

        return {
            date,
            assets,
            total_assets,
            liabilities,
            total_liabilities,
            equity,
            total_equity
        };
    }

    async getOpeningBalance(accountId: string, startDate: string): Promise<number> {
        const { data: items, error } = await supabase
            .from('accounting_journal_items')
            .select(`
                debit,
                credit,
                account:accounting_accounts!inner(type),
                journal:accounting_journals!inner(date)
            `)
            .lt('journal.date', startDate)
            .eq('account_id', accountId);

        if (error) throw error;
        if (!items || items.length === 0) return 0;

        const type = (items[0].account as any).type;
        return items.reduce((sum, item) => {
            if (type === 'asset' || type === 'expense') {
                return sum + (item.debit - item.credit);
            } else {
                return sum + (item.credit - item.debit);
            }
        }, 0);
    }

    async getLedger(accountId: string, startDate: string, endDate: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('accounting_journal_items')
            .select(`
                *,
                journal:accounting_journals!inner(date, description, reference)
            `)
            .eq('account_id', accountId)
            .gte('journal.date', startDate)
            .lte('journal.date', endDate)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

export const accountingService = new AccountingService();
