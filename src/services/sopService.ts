import { supabase } from '@/lib/supabase';
import type { CompanySOP } from '@/lib/supabase';

export const sopService = {
    async getActiveSOP(): Promise<CompanySOP | null> {
        try {
            const { data, error } = await supabase
                .from('company_sops')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }
            return data as CompanySOP | null;
        } catch (error) {
            console.error('Error fetching active SOP:', error);
            return null;
        }
    },

    async saveSOP(title: string, content: string): Promise<CompanySOP | null> {
        try {
            // Deactivate all existing SOPs (optional: you could just keep 1 record and update it)
            await supabase.from('company_sops').update({ is_active: false }).eq('is_active', true);

            // Insert the new one
            const { data, error } = await supabase
                .from('company_sops')
                .insert([{ title, content, is_active: true }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving SOP:', error);
            throw error;
        }
    }
};
