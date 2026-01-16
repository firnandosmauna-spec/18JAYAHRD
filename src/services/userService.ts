import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/supabase';
import { ModuleType, UserRole } from '@/contexts/AuthContext';

export interface AppUser extends Profile {
    employees?: {
        name: string;
        position: string;
    } | null;
}

export const userService = {
    // Get all users
    async getAllUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, employees(name, position)')
            .order('created_at', { ascending: false });

        console.log("DEBUG: Raw Users Data:", data);

        if (error) throw error;
        return data as AppUser[];
    },

    // Update User Role and Modules
    async updateUserAccess(userId: string, role: UserRole, modules: ModuleType[]) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                role,
                modules,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as AppUser;
    },

    // Link employee_id to user
    async linkEmployee(userId: string, employeeId: string | null) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                employee_id: employeeId,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as AppUser;
    }
};
