import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Permission {
    id: string;
    role: string;
    resource: string;
    access_level: 'full' | 'view' | 'own' | 'none';
}

export function usePermissions() {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*');

            if (error) throw error;
            setPermissions(data || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    // Check if the current user has access to a resource
    // Returns the access level: 'full' | 'view' | 'own' | 'none'
    const checkAccess = useCallback((resource: string): string => {
        if (!user?.role) return 'none';
        if (user.role === 'admin') return 'full'; // Super admin always has full access (fallback)

        const perm = permissions.find(
            p => p.role === user.role && p.resource === resource
        );

        return perm?.access_level || 'none';
    }, [permissions, user]);

    return {
        permissions,
        loading,
        refreshPermissions: fetchPermissions,
        checkAccess
    };
}
