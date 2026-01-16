import { useEffect, useState, useRef } from 'react';
import type { UserRole } from '@/contexts/AuthContext';
import { presenceService } from '@/services/supabaseService';

export interface OnlineUser {
    user_id: string;
    employee_id?: string;
    role: UserRole;
    online_at: string;
}

export function usePresence(
    currentUser?: {
        id: string;
        role: UserRole;
        employee_id?: string
    }
) {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [status, setStatus] = useState<string>('INIT');
    const [channel, setChannel] = useState<any>(null);
    const mountedRef = useRef(true);

    // 1. Initialize Connection (Run Once on Mount)
    useEffect(() => {
        mountedRef.current = true;
        console.log('[Presence] Initializing connection...');

        const ch = presenceService.subscribe(
            (users) => {
                if (!mountedRef.current) return;
                const uniqueUsers = Array.from(new Map(users.map(u => [u.user_id, u])).values());
                setOnlineUsers(uniqueUsers);
            },
            undefined, // No initial tracking
            (newStatus) => {
                if (mountedRef.current) {
                    console.log(`[Presence] Status: ${newStatus}`);
                    setStatus(newStatus);
                }
            }
        );

        if (mountedRef.current) {
            setChannel(ch);
        }

        return () => {
            mountedRef.current = false;
            if (ch) ch.unsubscribe();
        };
    }, []);

    // 2. Update Tracking when User Info OR Status Changes
    useEffect(() => {
        // Only track if we have a channel, a user, AND we are fully SUBSCRIBED
        if (channel && currentUser && status === 'SUBSCRIBED' && mountedRef.current) {
            console.log('[Presence] Tracking user:', currentUser.employee_id);
            presenceService.track(channel, {
                user_id: currentUser.id,
                role: currentUser.role,
                employee_id: currentUser.employee_id,
                online_at: new Date().toISOString(),
            }).catch(error => {
                console.error('[Presence] Tracking failed:', error);
            });
        }
    }, [channel, status, currentUser?.id, currentUser?.employee_id]);

    return { onlineUsers, status };
}
