import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://omfzoasehiecuzaudblp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tZnpvYXNlaGllY3V6YXVkYmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTczNjIsImV4cCI6MjA4MzU5MzM2Mn0.LfyS2bKk_27mOI5aSowdf_jh-b6YLRP59D-yh897w0M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Export types to prevent build errors
export interface Profile { }
export interface Employee { }
export interface Department { }
export interface LeaveRequest { }
export interface AttendanceRecord {
    id: string;
    employee_id: string;
    date: string;
    check_in?: string;
    check_out?: string;
    status: 'present' | 'late' | 'absent' | 'leave' | 'holiday';
    work_hours?: string;
    location?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}
export interface PayrollRecord { }
export interface RewardRecord { }
export interface Pipeline {
    id: string;
    title: string;
    contact_name: string;
    company: string;
    value: number;
    stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
    survey_date?: string;
    booking_date?: string;
    booking_fee?: number;
    akad_date?: string;
    source?: string;
    notes?: string;
    created_by?: string;
    created_at: string;
    attachment_url?: string;
    survey_attachment_url?: string;
    booking_attachment_url?: string;
    akad_attachment_url?: string;
}
export interface NotificationRecord { }
export interface Account { }
export interface Transaction { }
export interface JournalEntry { }
export interface ProductCategory { }
export interface Warehouse { }
export interface Product { }
export interface StockMovement { }
