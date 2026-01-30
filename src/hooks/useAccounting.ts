import { useState, useEffect, useCallback } from 'react';
import { Account, JournalEntry, ProfitLossReport, BalanceSheetReport } from '../types/accounting';
import { accountingService } from '../services/accountingService';
import { toast } from '../components/ui/use-toast';

export function useAccounts() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await accountingService.getAccounts();
            setAccounts(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: 'Error loading accounts',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const createAccount = async (account: any) => {
        try {
            await accountingService.createAccount(account);
            await fetchAccounts();
            toast({
                title: 'Success',
                description: 'Account created successfully',
            });
            return true;
        } catch (err: any) {
            toast({
                title: 'Error creating account',
                description: err.message,
                variant: 'destructive',
            });
            return false;
        }
    };

    return { accounts, loading, error, refresh: fetchAccounts, createAccount };
}

export function useJournalEntries() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        try {
            setLoading(true);
            const data = await accountingService.getJournalEntries();
            setEntries(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            toast({
                title: 'Error loading journal entries',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    return { entries, loading, error, refresh: fetchEntries };
}

export function useAccountingReports(startDate: string, endDate: string) {
    const [reportData, setReportData] = useState<{
        pl: ProfitLossReport | null;
        bs: BalanceSheetReport | null;
    }>({ pl: null, bs: null });
    const [loading, setLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const [pl, bs] = await Promise.all([
                accountingService.getProfitLoss(startDate, endDate),
                accountingService.getBalanceSheet(endDate),
            ]);
            setReportData({ pl, bs });
        } catch (err: any) {
            toast({
                title: 'Error loading reports',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return { ...reportData, loading, refresh: fetchReports };
}

export function useLedger(accountId: string, startDate: string, endDate: string) {
    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLedger = useCallback(async () => {
        if (!accountId) return;
        try {
            setLoading(true);
            const data = await accountingService.getLedger(accountId, startDate, endDate);
            setLedgerItems(data);
        } catch (err: any) {
            toast({
                title: 'Error loading ledger',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [accountId, startDate, endDate]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);

    return { ledgerItems, loading, refresh: fetchLedger };
}
