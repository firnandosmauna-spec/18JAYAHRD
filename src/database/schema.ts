// Database Schema Definitions
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  avatar?: string;
  modules: string[];
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Employee {
  id: number;
  employee_id: string; // Unique employee identifier
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  status: 'active' | 'on-leave' | 'terminated';
  join_date: string;
  end_date?: string;
  salary: number;
  bank_account?: string;
  bank?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  sales_target?: number;
  sales_achieved?: number;
  attendance_score?: number;
  innovation_projects?: number;
  team_leadership?: boolean;
  customer_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  emergency_contact?: string;
  handover_to?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: number;
  employee_id: number;
  employee_name: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'late' | 'absent' | 'leave' | 'sick' | 'holiday';
  work_hours?: string;
  location?: string;
  notes?: string;
  overtime_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  employee_name: string;
  position: string;
  period: string; // YYYY-MM format
  base_salary: number;
  allowances: number;
  overtime_pay: number;
  bonus: number;
  deductions: number;
  tax: number;
  net_salary: number;
  status: 'pending' | 'paid' | 'cancelled';
  pay_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: number;
  employee_id: number;
  employee_name: string;
  reward_type: string;
  title: string;
  description: string;
  points: number;
  monetary_value?: number;
  date: string;
  status: 'active' | 'claimed' | 'expired';
  claimed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  module: string;
  user_id?: string;
  employee_id?: number;
  read: boolean;
  read_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  budget?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  title: string;
  department_id: number;
  description?: string;
  min_salary: number;
  max_salary: number;
  requirements?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recruitment {
  id: number;
  position_id: number;
  title: string;
  description: string;
  requirements: string;
  status: 'open' | 'closed' | 'on-hold';
  posted_date: string;
  closing_date?: string;
  salary_min?: number;
  salary_max?: number;
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Applicant {
  id: number;
  recruitment_id: number;
  name: string;
  email: string;
  phone: string;
  resume_url?: string;
  cover_letter?: string;
  status: 'applied' | 'screening' | 'interview' | 'hired' | 'rejected';
  interview_date?: string;
  interview_notes?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}