import { supabase } from '../lib/supabase';
import type {
    Account,
    Transaction,
    JournalEntry,
    AccountBalance,
    TransactionFilter,
    TransactionValidation,
    AccountType,
    TransactionStatus
} from '../types/accounting';

// Account Services
export const accountService = {
    // Get all accounts with optional filtering
    async getAll(includeInactive = false): Promise<Account[]> {
        let query = supabase
            .from('accounts')
            .select('*')
            .order('code');

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get account by ID
    async getById(id: string): Promise<Account | null> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Get accounts by type
    async getByType(type: AccountType): Promise<Account[]> {
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('type', type)
            .eq('is_active', true)
            .order('code');

        if (error) throw error;
        return data || [];
    },

    // Create new account
    async create(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .insert(account)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update account
    async update(id: string, updates: Partial<Omit<Account, 'id' | 'created_at'>>): Promise<Account> {
        const { data, error } = await supabase
            .from('accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Deactivate account (soft delete)
    async deactivate(id: string): Promise<void> {
        const { error } = await supabase
            .from('accounts')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
    },

    // Get account balances
    async getBalances(): Promise<AccountBalance[]> {
        const { data, error } = await supabase
            .from('account_balances')
            .select('*')
            .order('code');

        if (error) throw error;
        return data || [];
    },

    // Get account balance by ID
    async getBalance(accountId: string): Promise<number> {
        const { data, error } = await supabase
            .from('account_balances')
            .select('balance')
            .eq('id', accountId)
            .single();

        if (error) throw error;
        return data?.balance || 0;
    }
};

// Transaction Services
export const transactionService = {
    // Get all transactions with filtering
    async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
        let query = supabase
            .from('transactions')
            .select(`
        *,
        journal_entries (
          id,
          account_id,
          debit_amount,
          credit_amount,
          description,
          accounts (
            id,
            code,
            name,
            type
          )
        )
      `)
            .order('date', { ascending: false });

        if (filter) {
            if (filter.startDate) {
                query = query.gte('date', filter.startDate);
            }
            if (filter.endDate) {
                query = query.lte('date', filter.endDate);
            }
            if (filter.status) {
                query = query.eq('status', filter.status);
            }
            if (filter.searchQuery) {
                query = query.or(`description.ilike.%${filter.searchQuery}%,reference.ilike.%${filter.searchQuery}%`);
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    // Get transaction by ID
    async getById(id: string): Promise<Transaction | null> {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
        *,
        journal_entries (
          id,
          account_id,
          debit_amount,
          credit_amount,
          description,
          accounts (
            id,
            code,
            name,
            type
          )
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Create new transaction with journal entries
    async create(
        transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
        entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]
    ): Promise<Transaction> {
        // Validate transaction balance
        const validation = this.validateBalance(entries);
        if (!validation.isBalanced) {
            throw new Error(`Transaction is not balanced: ${validation.errors.join(', ')}`);
        }

        // Start transaction
        const { data: transactionData, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                ...transaction,
                created_by: transaction.created_by || 'system'
            })
            .select()
            .single();

        if (transactionError) throw transactionError;

        // Insert journal entries
        const entriesWithTransactionId = entries.map(entry => ({
            ...entry,
            transaction_id: transactionData.id
        }));

        const { error: entriesError } = await supabase
            .from('journal_entries')
            .insert(entriesWithTransactionId);

        if (entriesError) {
            // Rollback transaction if entries fail
            await supabase.from('transactions').delete().eq('id', transactionData.id);
            throw entriesError;
        }

        return transactionData;
    },

    // Update transaction
    async update(
        id: string,
        updates: Partial<Omit<Transaction, 'id' | 'created_at'>>,
        entries?: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]
    ): Promise<Transaction> {
        // Check if transaction is posted (cannot modify posted transactions)
        const existing = await this.getById(id);
        if (existing?.status === 'posted') {
            throw new Error('Cannot modify posted transactions');
        }

        if (entries) {
            // Validate new entries balance
            const validation = this.validateBalance(entries);
            if (!validation.isBalanced) {
                throw new Error(`Transaction is not balanced: ${validation.errors.join(', ')}`);
            }

            // Delete existing entries
            await supabase.from('journal_entries').delete().eq('transaction_id', id);

            // Insert new entries
            const entriesWithTransactionId = entries.map(entry => ({
                ...entry,
                transaction_id: id
            }));

            const { error: entriesError } = await supabase
                .from('journal_entries')
                .insert(entriesWithTransactionId);

            if (entriesError) throw entriesError;
        }

        // Update transaction
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Post transaction (make it immutable)
    async post(id: string): Promise<Transaction> {
        const { data, error } = await supabase
            .from('transactions')
            .update({ status: 'posted' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Reverse transaction
    async reverse(id: string): Promise<Transaction> {
        const { data, error } = await supabase
            .from('transactions')
            .update({ status: 'reversed' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete transaction (only drafts)
    async delete(id: string): Promise<void> {
        const existing = await this.getById(id);
        if (existing?.status !== 'draft') {
            throw new Error('Can only delete draft transactions');
        }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Validate transaction balance
    validateBalance(entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]): TransactionValidation {
        const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
        const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
        const difference = Math.abs(totalDebits - totalCredits);
        const isBalanced = difference < 0.01; // Allow for small rounding differences

        const errors: string[] = [];
        if (!isBalanced) {
            errors.push(`Debits (${totalDebits}) do not equal credits (${totalCredits})`);
        }
        if (entries.length === 0) {
            errors.push('Transaction must have at least one journal entry');
        }
        if (entries.some(entry => entry.debit_amount < 0 || entry.credit_amount < 0)) {
            errors.push('Debit and credit amounts cannot be negative');
        }
        if (entries.some(entry => entry.debit_amount > 0 && entry.credit_amount > 0)) {
            errors.push('Journal entry cannot have both debit and credit amounts');
        }

        return {
            isBalanced,
            totalDebits,
            totalCredits,
            difference,
            errors
        };
    }
};

// Journal Entry Services
export const journalEntryService = {
    // Get entries by transaction
    async getByTransaction(transactionId: string): Promise<JournalEntry[]> {
        const { data, error } = await supabase
            .from('journal_entries')
            .select(`
        *,
        accounts (
          id,
          code,
          name,
          type
        )
      `)
            .eq('transaction_id', transactionId)
            .order('created_at');

        if (error) throw error;
        return data || [];
    },

    // Get entries by account
    async getByAccount(accountId: string, startDate?: string, endDate?: string): Promise<JournalEntry[]> {
        let query = supabase
            .from('journal_entries')
            .select(`
        *,
        transactions (
          id,
          date,
          description,
          reference,
          status
        )
      `)
            .eq('account_id', accountId)
            .order('created_at', { ascending: false });

        if (startDate || endDate) {
            query = query
                .gte('transactions.date', startDate)
                .lte('transactions.date', endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
};

// Utility function to handle accounting errors
export const handleAccountingError = (error: any): string => {
    console.error('Accounting error:', error);

    if (error.message?.includes('not balanced')) {
        return 'Transaksi tidak seimbang - total debit harus sama dengan total kredit';
    }

    if (error.message?.includes('Cannot modify posted')) {
        return 'Tidak dapat mengubah transaksi yang sudah diposting';
    }

    if (error.code === '23505') {
        return 'Kode akun sudah digunakan';
    }

    if (error.code === '23503') {
        return 'Data terkait dengan transaksi lain, tidak dapat dihapus';
    }

    if (error.code === 'PGRST116') {
        return 'Data tidak ditemukan';
    }

    return error.message || 'Terjadi kesalahan pada sistem akuntansi';
};
