import { database } from '@/database/database';
import { User, Employee, LeaveRequest, Attendance, Payroll, Reward, Notification } from '@/database/schema';

// Authentication Service
export const authService = {
  async login(email: string, password: string): Promise<User | null> {
    const user = await database.getUserByEmail(email);
    if (user && user.password_hash === password && user.is_active) {
      // Update last login
      return user;
    }
    return null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return database.getUserByEmail(email);
  },

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    return database.createUser(userData);
  }
};

// Employee Service
export const employeeService = {
  async getAll(): Promise<Employee[]> {
    return database.getEmployees();
  },

  async getById(id: number): Promise<Employee | null> {
    return database.getEmployeeById(id);
  },

  async create(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const employee = await database.createEmployee(employeeData);
    
    // Create notification
    await notificationService.create({
      title: 'Karyawan Baru Ditambahkan',
      message: `${employee.name} telah ditambahkan sebagai ${employee.position}`,
      type: 'success',
      module: 'employee',
      employee_id: employee.id,
      read: false
    });

    return employee;
  },

  async update(id: number, updates: Partial<Employee>): Promise<Employee | null> {
    const employee = await database.updateEmployee(id, updates);
    
    if (employee) {
      await notificationService.create({
        title: 'Data Karyawan Diperbarui',
        message: `Data ${employee.name} telah diperbarui`,
        type: 'info',
        module: 'employee',
        employee_id: employee.id,
        read: false
      });
    }

    return employee;
  },

  async delete(id: number): Promise<boolean> {
    const employee = await database.getEmployeeById(id);
    const success = await database.deleteEmployee(id);
    
    if (success && employee) {
      await notificationService.create({
        title: 'Karyawan Dihapus',
        message: `${employee.name} telah dihapus dari sistem`,
        type: 'warning',
        module: 'employee',
        read: false
      });
    }

    return success;
  },

  async search(query: string): Promise<Employee[]> {
    const employees = await database.getEmployees();
    const lowerQuery = query.toLowerCase();
    
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(lowerQuery) ||
      emp.email.toLowerCase().includes(lowerQuery) ||
      emp.position.toLowerCase().includes(lowerQuery) ||
      emp.department.toLowerCase().includes(lowerQuery) ||
      emp.employee_id.toLowerCase().includes(lowerQuery)
    );
  },

  async getStats() {
    return database.getEmployeeStats();
  }
};

// Leave Request Service
export const leaveService = {
  async getAll(): Promise<LeaveRequest[]> {
    return database.getLeaveRequests();
  },

  async create(requestData: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>): Promise<LeaveRequest> {
    const request = await database.createLeaveRequest(requestData);
    
    // Create notification
    await notificationService.create({
      title: 'Pengajuan Cuti Baru',
      message: `${request.employee_name} mengajukan ${request.leave_type} selama ${request.days} hari`,
      type: 'info',
      module: 'leave',
      employee_id: request.employee_id,
      read: false
    });

    return request;
  },

  async updateStatus(id: number, status: 'approved' | 'rejected', approvedBy: string, rejectionReason?: string): Promise<LeaveRequest | null> {
    const updates: Partial<LeaveRequest> = {
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    };

    if (status === 'rejected' && rejectionReason) {
      updates.rejection_reason = rejectionReason;
    }

    const request = await database.updateLeaveRequest(id, updates);
    
    if (request) {
      await notificationService.create({
        title: `Cuti ${status === 'approved' ? 'Disetujui' : 'Ditolak'}`,
        message: `Pengajuan ${request.leave_type} ${request.employee_name} telah ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
        type: status === 'approved' ? 'success' : 'warning',
        module: 'leave',
        employee_id: request.employee_id,
        read: false
      });
    }

    return request;
  },

  async getByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<LeaveRequest[]> {
    const requests = await database.getLeaveRequests();
    return requests.filter(req => req.status === status);
  }
};

// Attendance Service
export const attendanceService = {
  async getAll(): Promise<Attendance[]> {
    return database.getAttendance();
  },

  async getByDate(date: string): Promise<Attendance[]> {
    return database.getAttendanceByDate(date);
  },

  async create(attendanceData: Omit<Attendance, 'id' | 'created_at' | 'updated_at'>): Promise<Attendance> {
    return database.createAttendance(attendanceData);
  },

  async checkIn(employeeId: number, employeeName: string, location?: string): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    
    // Check if already checked in today
    const existing = await database.getAttendanceByDate(today);
    const existingRecord = existing.find(att => att.employee_id === employeeId);
    
    if (existingRecord) {
      throw new Error('Already checked in today');
    }

    const status = now.getHours() > 8 ? 'late' : 'present';
    
    return database.createAttendance({
      employee_id: employeeId,
      employee_name: employeeName,
      date: today,
      check_in: timeString,
      status,
      location: location || 'Office'
    });
  },

  async checkOut(employeeId: number): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    
    const attendance = await database.getAttendance();
    const todayRecord = attendance.find(att => 
      att.employee_id === employeeId && att.date === today
    );
    
    if (!todayRecord || todayRecord.check_out) {
      return null;
    }

    // Calculate work hours
    const checkIn = new Date(`${today}T${todayRecord.check_in}:00`);
    const checkOut = new Date(`${today}T${timeString}:00`);
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const workHours = `${hours}h ${minutes}m`;

    // Update attendance record (in real implementation, this would be an update operation)
    const updatedRecord = {
      ...todayRecord,
      check_out: timeString,
      work_hours: workHours,
      updated_at: new Date().toISOString()
    };

    return updatedRecord;
  },

  async getStats(date?: string) {
    return database.getAttendanceStats(date);
  }
};

// Payroll Service
export const payrollService = {
  async getAll(): Promise<Payroll[]> {
    return database.getPayroll();
  },

  async create(payrollData: Omit<Payroll, 'id' | 'created_at' | 'updated_at'>): Promise<Payroll> {
    return database.createPayroll(payrollData);
  },

  async updateStatus(id: number, status: 'paid' | 'cancelled', payDate?: string): Promise<Payroll | null> {
    const updates: Partial<Payroll> = { status };
    if (payDate) updates.pay_date = payDate;
    
    const payroll = await database.updatePayroll(id, updates);
    
    if (payroll && status === 'paid') {
      await notificationService.create({
        title: 'Gaji Dibayarkan',
        message: `Gaji ${payroll.employee_name} periode ${payroll.period} telah dibayarkan`,
        type: 'success',
        module: 'payroll',
        employee_id: payroll.employee_id,
        read: false
      });
    }

    return payroll;
  },

  async generatePayroll(employeeId: number, period: string): Promise<Payroll> {
    const employee = await database.getEmployeeById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Calculate payroll components
    const baseSalary = employee.salary;
    const allowances = Math.floor(baseSalary * 0.15); // 15% allowances
    const overtimePay = 0; // Would be calculated based on overtime hours
    const bonus = 0; // Would be calculated based on performance
    const deductions = Math.floor(baseSalary * 0.05); // 5% deductions (BPJS, etc.)
    const tax = Math.floor(baseSalary * 0.05); // 5% tax
    const netSalary = baseSalary + allowances + overtimePay + bonus - deductions - tax;

    return database.createPayroll({
      employee_id: employeeId,
      employee_name: employee.name,
      position: employee.position,
      period,
      base_salary: baseSalary,
      allowances,
      overtime_pay: overtimePay,
      bonus,
      deductions,
      tax,
      net_salary: netSalary,
      status: 'pending'
    });
  },

  async getStats(period?: string) {
    return database.getPayrollStats(period);
  }
};

// Reward Service
export const rewardService = {
  async getAll(): Promise<Reward[]> {
    return database.getRewards();
  },

  async create(rewardData: Omit<Reward, 'id' | 'created_at' | 'updated_at'>): Promise<Reward> {
    const reward = await database.createReward(rewardData);
    
    // Create notification
    await notificationService.create({
      title: 'Reward Baru',
      message: `${reward.employee_name} mendapat reward: ${reward.title}`,
      type: 'success',
      module: 'reward',
      employee_id: reward.employee_id,
      read: false
    });

    return reward;
  },

  async claimReward(id: number): Promise<Reward | null> {
    const rewards = await database.getRewards();
    const reward = rewards.find(r => r.id === id);
    
    if (!reward || reward.status !== 'active') {
      return null;
    }

    // In a real implementation, this would update the reward status
    const updatedReward = {
      ...reward,
      status: 'claimed' as const,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return updatedReward;
  }
};

// Notification Service
export const notificationService = {
  async getAll(): Promise<Notification[]> {
    return database.getNotifications();
  },

  async create(notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    return database.createNotification(notificationData);
  },

  async markAsRead(id: number): Promise<boolean> {
    return database.markNotificationAsRead(id);
  },

  async markAllAsRead(): Promise<void> {
    const notifications = await database.getNotifications();
    for (const notification of notifications) {
      if (!notification.read) {
        await database.markNotificationAsRead(notification.id);
      }
    }
  },

  async delete(id: number): Promise<boolean> {
    return database.deleteNotification(id);
  },

  async getUnreadCount(): Promise<number> {
    const notifications = await database.getNotifications();
    return notifications.filter(n => !n.read).length;
  }
};

// Dashboard Service
export const dashboardService = {
  async getStats() {
    const [employeeStats, attendanceStats, payrollStats] = await Promise.all([
      employeeService.getStats(),
      attendanceService.getStats(),
      payrollService.getStats()
    ]);

    const leaveRequests = await leaveService.getAll();
    const pendingLeaves = leaveRequests.filter(req => req.status === 'pending').length;

    return {
      employees: {
        total: employeeStats.total,
        active: employeeStats.active,
        onLeave: employeeStats.onLeave,
        newThisMonth: 2 // Would be calculated based on join_date
      },
      attendance: {
        present: attendanceStats.present,
        late: attendanceStats.late,
        absent: attendanceStats.absent,
        rate: employeeStats.total > 0 ? Math.round((attendanceStats.present / employeeStats.total) * 100) : 0
      },
      leaves: {
        pending: pendingLeaves,
        approved: leaveRequests.filter(req => req.status === 'approved').length,
        rejected: leaveRequests.filter(req => req.status === 'rejected').length
      },
      payroll: {
        totalEmployees: payrollStats.totalEmployees,
        totalAmount: payrollStats.totalNet,
        paid: payrollStats.paid,
        pending: payrollStats.pending
      }
    };
  }
};