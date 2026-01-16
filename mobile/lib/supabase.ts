// Mock Supabase client for Local Mode compatibility
export const supabase = {
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: async () => ({ error: { message: 'Use local login instead' } }),
        signUp: async () => ({ error: { message: 'Use local login instead' } }),
        signOut: async () => { },
        getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
        select: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
            eq: () => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => ({
            select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
            }),
        }),
    }),
};

// Export types to prevent build errors
export interface Profile { }
export interface Employee { }
export interface Department { }
export interface LeaveRequest { }
export interface AttendanceRecord { }
export interface PayrollRecord { }
export interface RewardRecord { }
export interface NotificationRecord { }
export interface Account { }
export interface Transaction { }
export interface JournalEntry { }
export interface ProductCategory { }
export interface Warehouse { }
export interface Product { }
export interface StockMovement { }
