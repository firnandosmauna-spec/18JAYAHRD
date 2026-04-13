import { useState, useEffect, useCallback } from 'react';
import { loanService, handleSupabaseError } from '@/services/supabaseService';
import type { EmployeeLoan, LoanPayment } from '@/lib/supabase';

export function useLoans() {
    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLoans = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await loanService.getAll();
            setLoans(data || []);
        } catch (err: any) {
            setError(handleSupabaseError(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoans();

        // Subscribe to real-time changes
        const unsubscribe = loanService.subscribeToChanges(fetchLoans);

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchLoans]);

    const addLoan = async (loan: Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newLoan = await loanService.create(loan);
            setLoans(prev => [newLoan, ...prev]);
            return newLoan;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    const updateLoan = async (id: string, updates: Partial<EmployeeLoan>) => {
        try {
            const updatedLoan = await loanService.update(id, updates);
            setLoans(prev => prev.map(l => l.id === id ? updatedLoan : l));
            return updatedLoan;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    const deleteLoan = async (id: string) => {
        try {
            await loanService.delete(id);
            setLoans(prev => prev.filter(l => l.id !== id));
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    const payInstallment = async (payment: Omit<LoanPayment, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newPayment = await loanService.payInstallment(payment);
            await fetchLoans(); // Refresh balances
            return newPayment;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    const fetchPayments = async (loanId: string) => {
        try {
            return await loanService.getPayments(loanId);
        } catch (err: any) {
            console.error('Error fetching loan payments:', err);
            return [];
        }
    };

    return {
        loans,
        loading,
        error,
        addLoan,
        updateLoan,
        deleteLoan,
        payInstallment,
        fetchPayments,
        refetch: fetchLoans
    };
}
