import { supabase } from '@/lib/supabase';

export interface PaymentMethod {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const paymentMethodService = {
    async getAll() {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as PaymentMethod[];
    },

    async getActive() {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data as PaymentMethod[];
    },

    async create(method: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at' | 'is_active'>) {
        const { data, error } = await supabase
            .from('payment_methods')
            .insert([method])
            .select()
            .single();

        if (error) throw error;
        return data as PaymentMethod;
    },

    async update(id: string, updates: Partial<Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>>) {
        const { data, error } = await supabase
            .from('payment_methods')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as PaymentMethod;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('payment_methods')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
