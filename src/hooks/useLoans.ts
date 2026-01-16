import { useState, useEffect, useCallback } from 'react';
import { loanService, handleSupabaseError } from '@/services/supabaseService';
import type { EmployeeLoan } from '@/lib/supabase';

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
    }, [fetchLoans]);

    const addLoan = async (loan: Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            const newLoan = await loanService.create(loan);
            setLoans(prev => [newLoan, ...prev]);
            return newLoan;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw error;
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
            throw error;
        }
    };

    const deleteLoan = async (id: string) => {
        try {
            await loanService.delete(id);
            setLoans(prev => prev.filter(l => l.id !== id));
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw error;
        }
    };

    return {
        loans,
        loading,
        error,
        addLoan,
        updateLoan,
        deleteLoan,
        refetch: fetchLoans
    };
}
