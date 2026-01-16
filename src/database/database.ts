import { 
  User, Employee, LeaveRequest, Attendance, Payroll, 
  Reward, Notification, Department, Position, Recruitment, Applicant 
} from './schema';

// In-memory database simulation (for demo purposes)
// In production, this would connect to a real database
class HRDDatabase {
  private users: User[] = [];
  private employees: Employee[] = [];
  private leaveRequests: LeaveRequest[] = [];
  private attendance: Attendance[] = [];
  private payroll: Payroll[] = [];
  private rewards: Reward[] = [];
  private notifications: Notification[] = [];
  private departments: Department[] = [];
  private positions: Position[] = [];
  private recruitments: Recruitment[] = [];
  private applicants: Applicant[] = [];

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize with sample data
    this.users = [
      {
        id: '1',
        email: 'admin@company.com',
        password_hash: 'admin123', // In production, this would be properly hashed
        name: 'Administrator',
        role: 'admin',
        modules: ['hrd', 'accounting', 'inventory', 'customer', 'project'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: '2',
        email: 'manager@company.com',
        password_hash: 'manager123',
        name: 'Manager User',
        role: 'manager',
        modules: ['hrd', 'accounting', 'inventory', 'project'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      },
      {
        id: '3',
        email: 'staff@company.com',
        password_hash: 'staff123',
        name: 'Staff User',
        role: 'staff',
        modules: ['hrd', 'customer'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }
    ];

    this.departments = [
      {
        id: 1,
        name: 'IT',
        description: 'Information Technology Department',
        budget: 500000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'HRD',
        description: 'Human Resources Department',
        budget: 300000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Sales',
        description: 'Sales Department',
        budget: 400000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 4,
        name: 'Finance',
        description: 'Finance Department',
        budget: 200000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 5,
        name: 'Marketing',
        description: 'Marketing Department',
        budget: 350000000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.employees = [
      {
        id: 1,
        employee_id: 'EMP001',
        name: 'Budi Santoso',
        email: 'budi.santoso@company.com',
        phone: '081234567890',
        position: 'Software Engineer',
        department: 'IT',
        status: 'active',
        join_date: '2022-03-15',
        salary: 15000000,
        bank_account: '1234567890',
        bank: 'BCA',
        address: 'Jakarta Selatan',
        emergency_contact: 'Siti Santoso',
        emergency_phone: '081234567891',
        sales_target: 0,
        sales_achieved: 0,
        attendance_score: 100,
        innovation_projects: 3,
        team_leadership: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        employee_id: 'EMP002',
        name: 'Siti Rahayu',
        email: 'siti.rahayu@company.com',
        phone: '081234567892',
        position: 'HR Manager',
        department: 'HRD',
        status: 'active',
        join_date: '2021-01-10',
        salary: 18000000,
        bank_account: '0987654321',
        bank: 'Mandiri',
        address: 'Jakarta Pusat',
        emergency_contact: 'Ahmad Rahayu',
        emergency_phone: '081234567893',
        sales_target: 0,
        sales_achieved: 0,
        attendance_score: 98,
        innovation_projects: 0,
        team_leadership: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        employee_id: 'EMP003',
        name: 'Ahmad Wijaya',
        email: 'ahmad.wijaya@company.com',
        phone: '081234567894',
        position: 'Sales Executive',
        department: 'Sales',
        status: 'active',
        join_date: '2023-06-01',
        salary: 12000000,
        bank_account: '1122334455',
        bank: 'BNI',
        address: 'Jakarta Barat',
        emergency_contact: 'Dewi Wijaya',
        emergency_phone: '081234567895',
        sales_target: 500000000,
        sales_achieved: 750000000,
        attendance_score: 95,
        innovation_projects: 0,
        team_leadership: false,
        customer_rating: 4.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.leaveRequests = [
      {
        id: 1,
        employee_id: 1,
        employee_name: 'Budi Santoso',
        leave_type: 'Cuti Tahunan',
        start_date: '2024-02-01',
        end_date: '2024-02-05',
        days: 5,
        status: 'pending',
        reason: 'Liburan keluarga',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        employee_id: 2,
        employee_name: 'Siti Rahayu',
        leave_type: 'Izin Sakit',
        start_date: '2024-01-28',
        end_date: '2024-01-29',
        days: 2,
        status: 'approved',
        reason: 'Demam',
        approved_by: 'Administrator',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.attendance = [
      {
        id: 1,
        employee_id: 1,
        employee_name: 'Budi Santoso',
        date: '2024-01-28',
        check_in: '08:05',
        check_out: '17:30',
        status: 'present',
        work_hours: '9h 25m',
        location: 'Kantor Pusat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        employee_id: 2,
        employee_name: 'Siti Rahayu',
        date: '2024-01-28',
        check_in: '07:55',
        check_out: '17:15',
        status: 'present',
        work_hours: '9h 20m',
        location: 'Kantor Pusat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.payroll = [
      {
        id: 1,
        employee_id: 1,
        employee_name: 'Budi Santoso',
        position: 'Software Engineer',
        period: '2024-01',
        base_salary: 15000000,
        allowances: 2500000,
        overtime_pay: 0,
        bonus: 0,
        deductions: 1500000,
        tax: 1000000,
        net_salary: 15000000,
        status: 'paid',
        pay_date: '2024-01-25',
        payment_method: 'Bank Transfer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.rewards = [
      {
        id: 1,
        employee_id: 3,
        employee_name: 'Ahmad Wijaya',
        reward_type: 'Achievement',
        title: 'Top Sales Performance',
        description: 'Pencapaian target penjualan 150%',
        points: 600,
        monetary_value: 5000000,
        date: '2024-01-28',
        status: 'active',
        created_by: 'Administrator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.notifications = [
      {
        id: 1,
        title: 'Pengajuan Cuti Baru',
        message: 'Budi Santoso mengajukan cuti 5 hari',
        type: 'info',
        module: 'leave',
        employee_id: 1,
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: (this.users.length + 1).toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Employee operations
  async getEmployees(): Promise<Employee[]> {
    return [...this.employees];
  }

  async getEmployeeById(id: number): Promise<Employee | null> {
    return this.employees.find(emp => emp.id === id) || null;
  }

  async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const newEmployee: Employee = {
      ...employeeData,
      id: Math.max(...this.employees.map(e => e.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.employees.push(newEmployee);
    return newEmployee;
  }

  async updateEmployee(id: number, updates: Partial<Employee>): Promise<Employee | null> {
    const index = this.employees.findIndex(emp => emp.id === id);
    if (index === -1) return null;
    
    this.employees[index] = {
      ...this.employees[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.employees[index];
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const index = this.employees.findIndex(emp => emp.id === id);
    if (index === -1) return false;
    
    this.employees.splice(index, 1);
    return true;
  }

  // Leave Request operations
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return [...this.leaveRequests];
  }

  async createLeaveRequest(requestData: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
    const newRequest: LeaveRequest = {
      ...requestData,
      id: Math.max(...this.leaveRequests.map(r => r.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.leaveRequests.push(newRequest);
    return newRequest;
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const index = this.leaveRequests.findIndex(req => req.id === id);
    if (index === -1) return null;
    
    this.leaveRequests[index] = {
      ...this.leaveRequests[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.leaveRequests[index];
  }

  // Attendance operations
  async getAttendance(): Promise<Attendance[]> {
    return [...this.attendance];
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return this.attendance.filter(att => att.date === date);
  }

  async createAttendance(attendanceData: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>): Promise<Attendance> {
    const newAttendance: Attendance = {
      ...attendanceData,
      id: Math.max(...this.attendance.map(a => a.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.attendance.push(newAttendance);
    return newAttendance;
  }

  // Payroll operations
  async getPayroll(): Promise<Payroll[]> {
    return [...this.payroll];
  }

  async createPayroll(payrollData: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>): Promise<Payroll> {
    const newPayroll: Payroll = {
      ...payrollData,
      id: Math.max(...this.payroll.map(p => p.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.payroll.push(newPayroll);
    return newPayroll;
  }

  async updatePayroll(id: number, updates: Partial<Payroll>): Promise<Payroll | null> {
    const index = this.payroll.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.payroll[index] = {
      ...this.payroll[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.payroll[index];
  }

  // Reward operations
  async getRewards(): Promise<Reward[]> {
    return [...this.rewards];
  }

  async createReward(rewardData: Omit<Reward, 'id' | 'created_at' | 'updated_at'>): Promise<Reward> {
    const newReward: Reward = {
      ...rewardData,
      id: Math.max(...this.rewards.map(r => r.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.rewards.push(newReward);
    return newReward;
  }

  // Notification operations
  async getNotifications(): Promise<Notification[]> {
    return [...this.notifications];
  }

  async createNotification(notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    const newNotification: Notification = {
      ...notificationData,
      id: Math.max(...this.notifications.map(n => n.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.notifications[index] = {
      ...this.notifications[index],
      read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.notifications.splice(index, 1);
    return true;
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return [...this.departments];
  }

  async createDepartment(departmentData: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<Department> {
    const newDepartment: Department = {
      ...departmentData,
      id: Math.max(...this.departments.map(d => d.id), 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.departments.push(newDepartment);
    return newDepartment;
  }

  // Statistics and Analytics
  async getEmployeeStats() {
    const total = this.employees.length;
    const active = this.employees.filter(e => e.status === 'active').length;
    const onLeave = this.employees.filter(e => e.status === 'on-leave').length;
    const terminated = this.employees.filter(e => e.status === 'terminated').length;
    
    return {
      total,
      active,
      onLeave,
      terminated,
      departments: this.departments.map(dept => ({
        name: dept.name,
        count: this.employees.filter(e => e.department === dept.name).length
      }))
    };
  }

  async getAttendanceStats(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayAttendance = this.attendance.filter(a => a.date === targetDate);
    
    return {
      present: dayAttendance.filter(a => a.status === 'present').length,
      late: dayAttendance.filter(a => a.status === 'late').length,
      absent: dayAttendance.filter(a => a.status === 'absent').length,
      leave: dayAttendance.filter(a => a.status === 'leave').length,
      sick: dayAttendance.filter(a => a.status === 'sick').length
    };
  }

  async getPayrollStats(period?: string) {
    const targetPeriod = period || new Date().toISOString().slice(0, 7);
    const periodPayroll = this.payroll.filter(p => p.period === targetPeriod);
    
    const totalGross = periodPayroll.reduce((sum, p) => sum + p.base_salary + p.allowances + p.overtime_pay + p.bonus, 0);
    const totalNet = periodPayroll.reduce((sum, p) => sum + p.net_salary, 0);
    const totalDeductions = periodPayroll.reduce((sum, p) => sum + p.deductions + p.tax, 0);
    
    return {
      totalEmployees: periodPayroll.length,
      totalGross,
      totalNet,
      totalDeductions,
      paid: periodPayroll.filter(p => p.status === 'paid').length,
      pending: periodPayroll.filter(p => p.status === 'pending').length
    };
  }
}

// Singleton instance
export const database = new HRDDatabase();