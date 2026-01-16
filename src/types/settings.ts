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
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
    attendance_late_penalty: 1000,
    attendance_sp1_threshold: 30,
};
