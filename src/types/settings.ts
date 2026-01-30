export interface SystemSetting {
    key: string;
    value: any;
    description: string;
    created_at?: string;
    updated_at?: string;
}

export interface AttendanceSettings {
    attendance_late_penalty: number;
    attendance_sp1_threshold: number;
    work_start_time_weekday: string;
    work_end_time_weekday: string;
    work_start_time_saturday: string;
    work_end_time_saturday: string;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
    attendance_late_penalty: 1000,
    attendance_sp1_threshold: 30,
    work_start_time_weekday: '08:00',
    work_end_time_weekday: '17:00',
    work_start_time_saturday: '08:00',
    work_end_time_saturday: '13:00',
};

export interface LeaveSettings {
    leave_annual_quota: number;
    leave_reset_month: number;
}

export const DEFAULT_LEAVE_SETTINGS: LeaveSettings = {
    leave_annual_quota: 12,
    leave_reset_month: 1, // January
};

export interface GeneralSettings {
    company_name: string;
    company_email: string;
    company_address: string;
    company_whatsapp: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
    company_name: 'HRD18 JAYATEMPO',
    company_email: 'hrd@jayatempo.com',
    company_address: '',
    company_whatsapp: '',
};
