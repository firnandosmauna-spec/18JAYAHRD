import { supabase } from '@/lib/supabase';
import { SystemSetting, AttendanceSettings, DEFAULT_ATTENDANCE_SETTINGS } from '@/types/settings';

export const settingsService = {
    // Get all settings or specific keys
    async getSettings(keys?: string[]) {
        let query = supabase
            .from('system_settings')
            .select('*');

        if (keys && keys.length > 0) {
            query = query.in('key', keys);
        }

        const { data, error } = await query;

        if (error) {
            // If table doesn't exist, warn and return defaults (mocking behavior for now if DB isn't ready)
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                console.warn('System Settings table does not exist. Using defaults.');
                return [];
            }
            throw error;
        }
        return data as SystemSetting[];
    },

    // Get settings explicitly for Attendance, merging with defaults
    async getAttendanceSettings(): Promise<AttendanceSettings> {
        const keys = ['attendance_late_penalty', 'attendance_sp1_threshold'];
        const settings = await this.getSettings(keys);

        const result = { ...DEFAULT_ATTENDANCE_SETTINGS };

        settings?.forEach(setting => {
            if (setting.key === 'attendance_late_penalty') {
                result.attendance_late_penalty = Number(setting.value);
            } else if (setting.key === 'attendance_sp1_threshold') {
                result.attendance_sp1_threshold = Number(setting.value);
            }
        });

        return result;
    },

    // Update a specific setting
    async updateSetting(key: string, value: any, description?: string) {
        const { data, error } = await supabase
            .from('system_settings')
            .upsert({
                key,
                value,
                description,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data as SystemSetting;
    },

    // Bulk update settings
    async updateSettings(settings: { key: string; value: any; description?: string }[]) {
        const updates = settings.map(s => ({
            ...s,
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('system_settings')
            .upsert(updates)
            .select();

        if (error) throw error;
        return data as SystemSetting[];
    }
};
