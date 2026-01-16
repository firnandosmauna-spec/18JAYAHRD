import { supabase } from '../lib/supabase'
import type {
    Employee,
    Department,
    LeaveRequest,
    AttendanceRecord,
    PayrollRecord,
    RewardRecord,
    NotificationRecord
} from '../lib/supabase'

// Employee Services
export const employeeService = {
    // Get all employees with department info
    async getAll() {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        departments!employees_department_id_fkey (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                console.warn('Employees table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    // Get employee by ID
    async getById(id: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        departments!employees_department_id_fkey (
          id,
          name
        )
      `)
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    // Create new employee
    async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('employees')
            .insert(employee)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Update employee
    async update(id: string, updates: Partial<Omit<Employee, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Delete employee
    async delete(id: string) {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    // Search employees
    async search(query: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        departments!employees_department_id_fkey (
          id,
          name
        )
      `)
            .or(`name.ilike.%${query}%,position.ilike.%${query}%,email.ilike.%${query}%`)

        if (error) throw error
        return data
    },

    // Get employees by department
    async getByDepartment(departmentId: string) {
        const { data, error } = await supabase
            .from('employees')
            .select(`
        *,
        departments!employees_department_id_fkey (
          id,
          name
        )
      `)
            .eq('department_id', departmentId)

        if (error) throw error
        return data || []
    }
}

// Department Services
export const departmentService = {
    async getAll() {
        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .order('name')

        if (error) {
            // If table doesn't exist, return empty array instead of throwing
            if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
                console.warn('Departments table does not exist yet. Please run the schema.sql in Supabase.');
                return [];
            }
            throw error;
        }
        return data || []
    },

    async create(department: Omit<Department, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('departments')
            .insert(department)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<Department, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('departments')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

// Leave Request Services
export const leaveService = {
    async getAll() {
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
        *,
        employees!leave_requests_employee_id_fkey (
          id,
          name,
          position
        ),
        approved_by_employee:employees!leave_requests_approved_by_fkey (
          id,
          name
        ),
        handover_employee:employees!leave_requests_handover_to_fkey (
          id,
          name
        )
      `)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async create(leaveRequest: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('leave_requests')
            .insert(leaveRequest)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<LeaveRequest, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('leave_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async approve(id: string, approvedBy: string) {
        const { data, error } = await supabase
            .from('leave_requests')
            .update({
                status: 'approved',
                approved_by: approvedBy,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async reject(id: string) {
        const { data, error } = await supabase
            .from('leave_requests')
            .update({ status: 'rejected' })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

// Attendance Services
export const attendanceService = {
    async getByDateRange(startDate: string, endDate: string) {
        const { data, error } = await supabase
            .from('attendance')
            .select(`
        *,
        employees (
          id,
          name,
          position
        )
      `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false })

        if (error) throw error
        return data
    },

    async getByEmployee(employeeId: string, month?: number, year?: number) {
        let query = supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)

        if (month && year) {
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
            const endDate = `${year}-${month.toString().padStart(2, '0')}-31`
            query = query.gte('date', startDate).lte('date', endDate)
        }

        const { data, error } = await query.order('date', { ascending: false })

        if (error) throw error
        return data
    },

    async create(attendance: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('attendance')
            .insert(attendance)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<AttendanceRecord, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('attendance')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async checkIn(employeeId: string, location?: string, notes?: string) {
        const now = new Date()
        const date = now.toISOString().split('T')[0]
        const time = now.toTimeString().split(' ')[0]

        // Check if already checked in today
        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', date)
            .single()

        if (existing) {
            throw new Error('Already checked in for today')
        }

        // Determine status based on time (e.g. late if after 9:00)
        // This is a simple logic, can be enhanced
        const isLate = time > '09:00:00'
        const status = isLate ? 'late' : 'present'

        return await this.create({
            employee_id: employeeId,
            date,
            check_in: time,
            status,
            location,
            notes
        })
    },

    async checkOut(employeeId: string, location?: string, notes?: string) {
        const now = new Date()
        const date = now.toISOString().split('T')[0]
        const time = now.toTimeString().split(' ')[0]

        const { data: existing } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('date', date)
            .single()

        if (!existing) {
            throw new Error('No check-in record found for today')
        }

        if (existing.check_out) {
            throw new Error('Already checked out for today')
        }

        // Calculate work hours
        // This requires parsing time strings, leaving simple for now

        const updateData: Partial<AttendanceRecord> = {
            check_out: time
        }

        if (notes) {
            updateData.notes = existing.notes ? `${existing.notes}. Checkout note: ${notes}` : notes
        }

        return await this.update(existing.id, updateData)
    }
}

// Payroll Services
export const payrollService = {
    async getByPeriod(month: number, year: number) {
        const { data, error } = await supabase
            .from('payroll')
            .select(`
        *,
        employees (
          id,
          name,
          position
        )
      `)
            .eq('period_month', month)
            .eq('period_year', year)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async create(payroll: Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('payroll')
            .insert(payroll)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Omit<PayrollRecord, 'id' | 'created_at'>>) {
        const { data, error } = await supabase
            .from('payroll')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async markAsPaid(id: string, payDate: string) {
        const { data, error } = await supabase
            .from('payroll')
            .update({
                status: 'paid',
                pay_date: payDate
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

// Reward Services
export const rewardService = {
    async getAll() {
        const { data, error } = await supabase
            .from('rewards')
            .select(`
        *,
        employees (
          id,
          name,
          position
        )
      `)
            .order('awarded_date', { ascending: false })

        if (error) throw error
        return data
    },

    async getByEmployee(employeeId: string) {
        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .eq('employee_id', employeeId)
            .order('awarded_date', { ascending: false })

        if (error) throw error
        return data
    },

    async create(reward: Omit<RewardRecord, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('rewards')
            .insert(reward)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async claim(id: string) {
        const { data, error } = await supabase
            .from('rewards')
            .update({
                status: 'claimed',
                claimed_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }
}

// Notification Services
export const notificationService = {
    async getAll(userId?: string) {
        let query = supabase
            .from('notifications')
            .select('*')

        if (userId) {
            query = query.or(`user_id.eq.${userId},user_id.is.null`)
        } else {
            query = query.is('user_id', null)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async create(notification: Omit<NotificationRecord, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async markAsRead(id: string) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async markAllAsRead(userId?: string) {
        let query = supabase
            .from('notifications')
            .update({ read: true })

        if (userId) {
            query = query.or(`user_id.eq.${userId},user_id.is.null`)
        } else {
            query = query.is('user_id', null)
        }

        const { error } = await query

        if (error) throw error
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

// Utility function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
    console.error('Supabase error:', error)

    if (error.code === 'PGRST116') {
        return 'Data tidak ditemukan'
    }

    if (error.code === '23505') {
        return 'Data sudah ada (duplikat)'
    }

    if (error.code === '23503') {
        return 'Data terkait dengan data lain, tidak dapat dihapus'
    }

    return error.message || 'Terjadi kesalahan pada database'
}
