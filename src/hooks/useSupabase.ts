import { useState, useEffect } from 'react'
import {
  employeeService,
  departmentService,
  leaveService,
  attendanceService,
  payrollService,
  rewardService,
  notificationService,
  positionService,
  handleSupabaseError
} from '@/services/supabaseService'
import type { Employee, Department, LeaveRequest, AttendanceRecord, PayrollRecord, RewardRecord, NotificationRecord, Position } from '@/lib/supabase'


// Employee Hooks
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await employeeService.getAll()
      setEmployees(data || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
      setError(handleSupabaseError(err))
      setEmployees([]) // Set empty array on error to prevent infinite loading
    } finally {
      setLoading(false)
    }
  }

  const addEmployee = async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEmployee = await employeeService.create(employee)
      setEmployees(prev => [newEmployee, ...prev])
      return newEmployee
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const updateEmployee = async (id: string, updates: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
    try {
      const updatedEmployee = await employeeService.update(id, updates)
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmployee : emp))
      return updatedEmployee
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      await employeeService.delete(id)
      setEmployees(prev => prev.filter(emp => emp.id !== id))
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const searchEmployees = async (query: string) => {
    try {
      setLoading(true)
      const data = await employeeService.search(query)
      setEmployees(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees
  }
}

// Department Hooks
export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDepartments = async () => {
    try {
      console.log('🔄 Fetching departments...');
      setLoading(true)
      setError(null)
      const data = await departmentService.getAll()
      console.log('✅ Departments fetched:', data);
      setDepartments(data || [])
    } catch (err) {
      console.error('❌ Error fetching departments:', err)
      setError(handleSupabaseError(err))
      setDepartments([]) // Set empty array on error to prevent infinite loading
    } finally {
      setLoading(false)
    }
  }

  const addDepartment = async (department: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newDepartment = await departmentService.create(department)
      setDepartments(prev => [...prev, newDepartment])
      return newDepartment
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
    addDepartment
  }
}

// Leave Request Hooks
export function useLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await leaveService.getAll()
      setLeaveRequests(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addLeaveRequest = async (leaveRequest: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRequest = await leaveService.create(leaveRequest)
      setLeaveRequests(prev => [newRequest, ...prev])
      return newRequest
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const approveLeaveRequest = async (id: string, approvedBy: string) => {
    try {
      const updatedRequest = await leaveService.approve(id, approvedBy)
      setLeaveRequests(prev => prev.map(req => req.id === id ? updatedRequest : req))
      return updatedRequest
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const rejectLeaveRequest = async (id: string) => {
    try {
      const updatedRequest = await leaveService.reject(id)
      setLeaveRequests(prev => prev.map(req => req.id === id ? updatedRequest : req))
      return updatedRequest
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  return {
    leaveRequests,
    loading,
    error,
    refetch: fetchLeaveRequests,
    addLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest
  }
}

// Attendance Hooks
export function useAttendance(startDate?: string, endDate?: string) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      setError(null)

      const fetchPromise = startDate && endDate
        ? attendanceService.getByDateRange(startDate, endDate)
        : attendanceService.getByDateRange(
          new Date().toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]) as AttendanceRecord[];
      setAttendance(data || [])
    } catch (err: any) {
      if (err.message === 'Request timed out') {
        console.warn('Attendance fetch timed out');
      } else {
        setError(handleSupabaseError(err))
      }
      // On timeout or error, set empty array to stop loading
      if (attendance.length === 0) setAttendance([]);
    } finally {
      setLoading(false)
    }
  }

  const addAttendance = async (attendanceRecord: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRecord = await attendanceService.create(attendanceRecord)
      setAttendance(prev => [newRecord, ...prev])
      return newRecord
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchAttendance()

    // Real-time subscription
    const unsubscribe = attendanceService.subscribeToChanges(fetchAttendance)

    return () => {
      unsubscribe()
    }
  }, [startDate, endDate])

  return {
    attendance,
    loading,
    error,
    refetch: fetchAttendance,
    addAttendance,
    updateAttendance: async (id: string, updates: Partial<AttendanceRecord>) => {
      try {
        const updatedRecord = await attendanceService.update(id, updates)
        setAttendance(prev => prev.map(record => record.id === id ? updatedRecord : record))
        return updatedRecord
      } catch (err) {
        const errorMsg = handleSupabaseError(err)
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    }
  }
}

// Payroll Hooks
export function usePayroll(month: number, year: number) {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayroll = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await payrollService.getByPeriod(month, year)
      setPayroll(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addPayroll = async (payrollRecord: Omit<PayrollRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newRecord = await payrollService.create(payrollRecord)
      setPayroll(prev => [newRecord, ...prev])
      return newRecord
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const markAsPaid = async (id: string, payDate: string) => {
    try {
      const updatedRecord = await payrollService.markAsPaid(id, payDate)
      setPayroll(prev => prev.map(record => record.id === id ? updatedRecord : record))
      return updatedRecord
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [month, year])

  return {
    payroll,
    loading,
    error,
    refetch: fetchPayroll,
    addPayroll,
    markAsPaid,
    deletePayroll: async (id: string) => {
      try {
        await payrollService.delete(id)
        setPayroll(prev => prev.filter(p => p.id !== id))
      } catch (err) {
        const errorMsg = handleSupabaseError(err)
        setError(errorMsg)
        throw new Error(errorMsg)
      }
    }
  }
}

// Rewards Hooks
export function useRewards() {
  const [rewards, setRewards] = useState<RewardRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRewards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await rewardService.getAll()
      setRewards(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addReward = async (reward: Omit<RewardRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newReward = await rewardService.create(reward)
      setRewards(prev => [newReward, ...prev])
      return newReward
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  const claimReward = async (id: string) => {
    try {
      const updatedReward = await rewardService.claim(id)
      setRewards(prev => prev.map(reward => reward.id === id ? updatedReward : reward))
      return updatedReward
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      setError(errorMsg)
      throw new Error(errorMsg)
    }
  }

  useEffect(() => {
    fetchRewards()
  }, [])

  return {
    rewards,
    loading,
    error,
    refetch: fetchRewards,
    addReward,
    claimReward
  }
}

// Notifications Hooks
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await notificationService.getAll(userId)
      setNotifications(data)
    } catch (err) {
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  const addNotification = async (notification: Omit<NotificationRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newNotification = await notificationService.create(notification)
      setNotifications(prev => [newNotification, ...prev])
      return newNotification
    } catch (err) {
      const errorMsg = handleSupabaseError(err)
      console.warn('⚠️ Failed to add notification (non-critical):', errorMsg)
      // Don't throw error - notification failure shouldn't break the app
      return null
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id)
      setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: true } : notif))
    } catch (err) {
      setError(handleSupabaseError(err))
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId)
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    } catch (err) {
      setError(handleSupabaseError(err))
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.delete(id)
      setNotifications(prev => prev.filter(notif => notif.id !== id))
    } catch (err) {
      setError(handleSupabaseError(err))
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }
}

// Position Hooks
export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await positionService.getAll()
      // @ts-ignore
      setPositions(data)
    } catch (err) {
      console.error('Error fetching positions:', err)
      setError(handleSupabaseError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPositions()
  }, [])

  return {
    positions,
    loading,
    error,
    refetch: fetchPositions
  }
}

export * from './useLoans'