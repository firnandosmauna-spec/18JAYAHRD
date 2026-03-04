import { supabase } from '@/lib/supabase';
import { SystemSetting, AttendanceSettings, DEFAULT_ATTENDANCE_SETTINGS, LeaveSettings, DEFAULT_LEAVE_SETTINGS, GeneralSettings, DEFAULT_GENERAL_SETTINGS, PayrollSettings, DEFAULT_PAYROLL_SETTINGS } from '@/types/settings';

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

    // Get General Settings
    async getGeneralSettings(): Promise<GeneralSettings> {
        const keys = ['company_name', 'company_email', 'company_address', 'company_whatsapp'];
        const settings = await this.getSettings(keys);

        const result = { ...DEFAULT_GENERAL_SETTINGS };

        settings?.forEach(setting => {
            if (setting.key === 'company_name') result.company_name = setting.value;
            else if (setting.key === 'company_email') result.company_email = setting.value;
            else if (setting.key === 'company_address') result.company_address = setting.value;
            else if (setting.key === 'company_whatsapp') result.company_whatsapp = setting.value;
        });

        return result;
    },

    // Get settings explicitly for Attendance, merging with defaults
    async getAttendanceSettings(): Promise<AttendanceSettings> {
        const keys = [
            'attendance_late_penalty',
            'attendance_sp1_threshold',
            'work_start_time_weekday',
            'work_end_time_weekday',
            'work_start_time_saturday',
            'work_end_time_saturday',
            'admin_attendance_required',
            'office_latitude',
            'office_longitude',
            'office_radius',
            'office_wifi_ssid',
            'is_auto_nik'
        ];
        const settings = await this.getSettings(keys);

        const result = { ...DEFAULT_ATTENDANCE_SETTINGS };

        settings?.forEach(setting => {
            if (setting.key === 'attendance_late_penalty') {
                result.attendance_late_penalty = Number(setting.value);
            } else if (setting.key === 'attendance_sp1_threshold') {
                result.attendance_sp1_threshold = Number(setting.value);
            } else if (setting.key === 'work_start_time_weekday') {
                result.work_start_time_weekday = setting.value;
            } else if (setting.key === 'work_end_time_weekday') {
                result.work_end_time_weekday = setting.value;
            } else if (setting.key === 'work_start_time_saturday') {
                result.work_start_time_saturday = setting.value;
            } else if (setting.key === 'work_end_time_saturday') {
                result.work_end_time_saturday = setting.value;
            } else if (setting.key === 'admin_attendance_required') {
                result.admin_attendance_required = setting.value === 'true' || setting.value === true;
            } else if (setting.key === 'office_latitude') {
                result.office_latitude = Number(setting.value);
            } else if (setting.key === 'office_longitude') {
                result.office_longitude = Number(setting.value);
            } else if (setting.key === 'office_radius') {
                result.office_radius = Number(setting.value);
            } else if (setting.key === 'office_wifi_ssid') {
                result.office_wifi_ssid = setting.value;
            } else if (setting.key === 'is_auto_nik') {
                result.is_auto_nik = setting.value === 'true' || setting.value === true;
            }
        });

        return result;
    },

    // Get Leave Settings
    async getLeaveSettings(): Promise<LeaveSettings> {
        const keys = ['leave_annual_quota', 'leave_reset_month'];
        const settings = await this.getSettings(keys);

        const result = { ...DEFAULT_LEAVE_SETTINGS };

        settings?.forEach(setting => {
            if (setting.key === 'leave_annual_quota') {
                result.leave_annual_quota = Number(setting.value);
            } else if (setting.key === 'leave_reset_month') {
                result.leave_reset_month = Number(setting.value);
            }
        });

        return result;
    },

    // Get Payroll Settings
    async getPayrollSettings(): Promise<PayrollSettings> {
        const keys = [
            'payroll_tax_rate',
            'payroll_bpjs_rate',
            'payroll_allowance_gasoline',
            'payroll_allowance_meal',
            'payroll_allowance_position',
            'payroll_allowance_thr',
            'payroll_deduction_absent',
            'attendance_late_penalty',
            'payroll_schedule_day',
            'is_automatic_payroll',
            'payroll_reward_perfect_attendance',
            'payroll_reward_target_achievement'
        ];
        const settings = await this.getSettings(keys);

        const result = { ...DEFAULT_PAYROLL_SETTINGS };

        settings?.forEach(setting => {
            if (setting.key === 'payroll_tax_rate') result.payroll_tax_rate = Number(setting.value);
            else if (setting.key === 'payroll_bpjs_rate') result.payroll_bpjs_rate = Number(setting.value);
            else if (setting.key === 'payroll_allowance_gasoline') result.payroll_allowance_gasoline = Number(setting.value);
            else if (setting.key === 'payroll_allowance_meal') result.payroll_allowance_meal = Number(setting.value);
            else if (setting.key === 'payroll_allowance_position') result.payroll_allowance_position = Number(setting.value);
            else if (setting.key === 'payroll_allowance_thr') result.payroll_allowance_thr = Number(setting.value);
            else if (setting.key === 'payroll_deduction_absent') result.payroll_deduction_absent = Number(setting.value);
            else if (setting.key === 'attendance_late_penalty') result.attendance_late_penalty = Number(setting.value);
            else if (setting.key === 'payroll_schedule_day') result.payroll_schedule_day = Number(setting.value);
            else if (setting.key === 'is_automatic_payroll') result.is_automatic_payroll = setting.value === 'true' || setting.value === true;
            else if (setting.key === 'payroll_reward_perfect_attendance') result.payroll_reward_perfect_attendance = Number(setting.value);
            else if (setting.key === 'payroll_reward_target_achievement') result.payroll_reward_target_achievement = Number(setting.value);
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
            }, { onConflict: 'key' })
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
            .upsert(updates, { onConflict: 'key' })
            .select();

        if (error) throw error;
        return data as SystemSetting[];
    }
};
