import { useState, useEffect, useCallback } from 'react';
import { loanService, handleSupabaseError } from '@/services/supabaseService';
import type { EmployeeLoan, LoanPayment } from '@/lib/supabase';

export function useLoans() {
    const [loans, setLoans] = useState<EmployeeLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);

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

    const fetchPendingPayments = useCallback(async () => {
        try {
            setPendingLoading(true);
            const data = await loanService.getPendingPaymentRequests();
            setPendingPayments(data || []);
        } catch (err: any) {
            console.warn('Could not load pending payments:', err);
            setPendingPayments([]);
        } finally {
            setPendingLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLoans();
        fetchPendingPayments();

        // Subscribe to real-time changes
        const unsubscribe = loanService.subscribeToChanges(() => {
            fetchLoans();
            fetchPendingPayments();
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchLoans, fetchPendingPayments]);

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

    // Admin: directly pay installment
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

    // Employee: submit payment request for admin approval
    const submitPaymentRequest = async (payment: {
        loan_id: string;
        amount: number;
        payment_date: string;
        payment_method: string;
        notes?: string;
        requested_by?: string;
    }) => {
        try {
            const result = await loanService.submitPaymentRequest(payment);
            await fetchPendingPayments();
            return result;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    // Admin: approve a pending payment request
    const approvePaymentRequest = async (paymentId: string, approvedBy?: string) => {
        try {
            const result = await loanService.approvePaymentRequest(paymentId, approvedBy);
            await fetchLoans();
            await fetchPendingPayments();
            return result;
        } catch (err: any) {
            const errorMsg = handleSupabaseError(err);
            setError(errorMsg);
            throw err;
        }
    };

    // Admin: reject a pending payment request
    const rejectPaymentRequest = async (paymentId: string, approvedBy?: string, reason?: string) => {
        try {
            const result = await loanService.rejectPaymentRequest(paymentId, approvedBy, reason);
            await fetchPendingPayments();
            return result;
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
        pendingPayments,
        pendingLoading,
        addLoan,
        updateLoan,
        deleteLoan,
        payInstallment,
        submitPaymentRequest,
        approvePaymentRequest,
        rejectPaymentRequest,
        fetchPayments,
        refetch: fetchLoans,
        refetchPending: fetchPendingPayments,
    };
}
