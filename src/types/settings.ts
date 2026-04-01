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
    admin_attendance_required: boolean;
    attendance_late_tolerance: number;
    office_latitude: number;
    office_longitude: number;
    office_radius: number;
    office_wifi_ssid: string;
    is_auto_nik: boolean;
    restrict_off_hours_access: boolean;
    worker_attendance_required: boolean;
    attendance_holidays: string[]; // Dates in YYYY-MM-DD format
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
    attendance_late_penalty: 1000,
    attendance_sp1_threshold: 30,
    work_start_time_weekday: '07:30',
    work_end_time_weekday: '17:00',
    work_start_time_saturday: '07:30',
    work_end_time_saturday: '13:00',
    admin_attendance_required: true,
    attendance_late_tolerance: 5,
    office_latitude: -0.0263, // Default Pontianak (adjust as needed)
    office_longitude: 109.3425,
    office_radius: 200,
    office_wifi_ssid: '',
    is_auto_nik: true,
    restrict_off_hours_access: false,
    worker_attendance_required: true,
    attendance_holidays: [],
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

export interface PayrollSettings {
    payroll_tax_rate: number;
    payroll_bpjs_rate: number;
    payroll_allowance_gasoline: number;
    payroll_allowance_meal: number;
    payroll_allowance_position: number;
    payroll_allowance_thr: number;
    payroll_deduction_absent: number;
    attendance_late_penalty: number;
    payroll_schedule_day: number;
    is_automatic_payroll: boolean;
    payroll_reward_perfect_attendance: number;
    payroll_reward_target_achievement: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
    payroll_tax_rate: 0,
    payroll_bpjs_rate: 0,
    payroll_allowance_gasoline: 0, // Per day or fixed
    payroll_allowance_meal: 0, // Per day
    payroll_allowance_position: 0,
    payroll_allowance_thr: 0,
    payroll_deduction_absent: 0, // Per day
    attendance_late_penalty: 1000, // Per minute
    payroll_schedule_day: 23,
    is_automatic_payroll: false,
    payroll_reward_perfect_attendance: 0,
    payroll_reward_target_achievement: 0,
};
