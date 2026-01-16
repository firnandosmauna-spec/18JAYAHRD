import { useState, useEffect } from 'react';
import {
  accountService,
  transactionService,
  journalEntryService,
  handleAccountingError
} from '@/services/accountingService';
import type {
  Account,
  Transaction,
  JournalEntry,
  AccountBalance,
  TransactionFilter,
  AccountType,
  TransactionStatus
} from '@/types/accounting';

// Account Hooks
export function useAccounts(includeInactive = false) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountService.getAll(includeInactive);
      setAccounts(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newAccount = await accountService.create(account);
      setAccounts(prev => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
      return newAccount;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateAccount = async (id: string, updates: Partial<Omit<Account, 'id' | 'created_at'>>) => {
    try {
      const updatedAccount = await accountService.update(id, updates);
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc));
      return updatedAccount;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deactivateAccount = async (id: string) => {
    try {
      await accountService.deactivate(id);
      if (!includeInactive) {
        setAccounts(prev => prev.filter(acc => acc.id !== id));
      } else {
        setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, is_active: false } : acc));
      }
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [includeInactive]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount,
    deactivateAccount
  };
}

// Account Balances Hook
export function useAccountBalances() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountService.getBalances();
      setBalances(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances
  };
}

// Transactions Hook
export function useTransactions(filter?: TransactionFilter) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getAll(filter);
      setTransactions(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (
    transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
    entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]
  ) => {
    try {
      const newTransaction = await transactionService.create(transaction, entries);
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'created_at'>>,
    entries?: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]
  ) => {
    try {
      const updatedTransaction = await transactionService.update(id, updates, entries);
      setTransactions(prev => prev.map(txn => txn.id === id ? updatedTransaction : txn));
      return updatedTransaction;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const postTransaction = async (id: string) => {
    try {
      const postedTransaction = await transactionService.post(id);
      setTransactions(prev => prev.map(txn => txn.id === id ? postedTransaction : txn));
      return postedTransaction;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const reverseTransaction = async (id: string) => {
    try {
      const reversedTransaction = await transactionService.reverse(id);
      setTransactions(prev => prev.map(txn => txn.id === id ? reversedTransaction : txn));
      return reversedTransaction;
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await transactionService.delete(id);
      setTransactions(prev => prev.filter(txn => txn.id !== id));
    } catch (err) {
      const errorMsg = handleAccountingError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter?.startDate, filter?.endDate, filter?.status, filter?.accountId, filter?.searchQuery]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    addTransaction,
    updateTransaction,
    postTransaction,
    reverseTransaction,
    deleteTransaction
  };
}

// Single Transaction Hook
export function useTransaction(id: string) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getById(id);
      setTransaction(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  return {
    transaction,
    loading,
    error,
    refetch: fetchTransaction
  };
}

// Journal Entries Hook
export function useJournalEntries(transactionId?: string, accountId?: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: JournalEntry[] = [];
      
      if (transactionId) {
        data = await journalEntryService.getByTransaction(transactionId);
      } else if (accountId) {
        data = await journalEntryService.getByAccount(accountId);
      }
      
      setEntries(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactionId || accountId) {
      fetchEntries();
    }
  }, [transactionId, accountId]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries
  };
}

// Accounts by Type Hook
export function useAccountsByType(type: AccountType) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccountsByType = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountService.getByType(type);
      setAccounts(data);
    } catch (err) {
      setError(handleAccountingError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsByType();
  }, [type]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccountsByType
  };
}

// Transaction Validation Hook
export function useTransactionValidation() {
  const validateTransaction = (entries: Omit<JournalEntry, 'id' | 'transaction_id' | 'created_at'>[]) => {
    return transactionService.validateBalance(entries);
  };

  return {
    validateTransaction
  };
}