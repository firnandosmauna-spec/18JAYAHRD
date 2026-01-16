import { supabase } from '@/lib/supabase'
import { employeeService, departmentService } from '@/services/supabaseService'

// Migration utility to convert localStorage data to Supabase
export class DataMigration {
  
  // Migrate employees from localStorage to Supabase
  static async migrateEmployeesFromLocalStorage() {
    try {
      // Get data from localStorage
      const localStorageData = localStorage.getItem('hrd-employees')
      if (!localStorageData) {
        console.log('No employee data found in localStorage')
        return { success: true, message: 'No data to migrate' }
      }

      const employees = JSON.parse(localStorageData)
      console.log(`Found ${employees.length} employees in localStorage`)

      // Get departments mapping
      const departments = await departmentService.getAll()
      const departmentMap = new Map(departments.map(d => [d.name, d.id]))

      let migratedCount = 0
      let errors: string[] = []

      for (const emp of employees) {
        try {
          // Map department name to department_id
          const departmentId = departmentMap.get(emp.department)
          if (!departmentId) {
            errors.push(`Department '${emp.department}' not found for employee ${emp.name}`)
            continue
          }

          // Convert localStorage format to Supabase format
          const supabaseEmployee = {
            name: emp.name,
            position: emp.position,
            department_id: departmentId,
            status: emp.status || 'active',
            join_date: emp.joinDate,
            salary: emp.salary,
            bank_account: emp.bankAccount || null,
            bank: emp.bank || null,
            sales_target: emp.salesTarget || 0,
            sales_achieved: emp.salesAchieved || 0,
            attendance_score: emp.attendanceScore || 100,
            innovation_projects: emp.innovationProjects || 0,
            team_leadership: emp.teamLeadership || false,
            customer_rating: emp.customerRating || null
          }

          await employeeService.create(supabaseEmployee)
          migratedCount++
          console.log(`Migrated employee: ${emp.name}`)

        } catch (error) {
          console.error(`Error migrating employee ${emp.name}:`, error)
          errors.push(`Failed to migrate ${emp.name}: ${error}`)
        }
      }

      // Backup localStorage data before clearing
      localStorage.setItem('hrd-employees-backup', localStorageData)
      
      // Clear localStorage after successful migration
      if (migratedCount > 0) {
        localStorage.removeItem('hrd-employees')
        console.log('Cleared localStorage after successful migration')
      }

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} employees`,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      console.error('Migration failed:', error)
      return {
        success: false,
        message: `Migration failed: ${error}`,
        errors: [String(error)]
      }
    }
  }

  // Check if migration is needed
  static async checkMigrationNeeded() {
    const localStorageData = localStorage.getItem('hrd-employees')
    if (!localStorageData) return false

    // Check if we already have employees in Supabase
    try {
      const employees = await employeeService.getAll()
      return employees.length === 0 && JSON.parse(localStorageData).length > 0
    } catch {
      return false
    }
  }

  // Restore from backup if needed
  static restoreFromBackup() {
    const backup = localStorage.getItem('hrd-employees-backup')
    if (backup) {
      localStorage.setItem('hrd-employees', backup)
      localStorage.removeItem('hrd-employees-backup')
      return true
    }
    return false
  }

  // Clear all localStorage data (use with caution)
  static clearLocalStorageData() {
    const keys = [
      'hrd-employees',
      'hrd-employees-backup',
      'hrd-notifications',
      'hrd-leave-requests',
      'hrd-attendance',
      'hrd-payroll',
      'hrd-rewards'
    ]
    
    keys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key)
        console.log(`Cleared localStorage key: ${key}`)
      }
    })
  }

  // Test Supabase connection
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('count')
        .limit(1)

      if (error) throw error

      return {
        success: true,
        message: 'Supabase connection successful'
      }
    } catch (error) {
      return {
        success: false,
        message: `Supabase connection failed: ${error}`
      }
    }
  }

  // Seed initial data if database is empty
  static async seedInitialData() {
    try {
      // Check if departments exist
      const departments = await departmentService.getAll()
      if (departments.length === 0) {
        console.log('No departments found, seeding initial departments...')
        
        const initialDepartments = [
          { name: 'IT', description: 'Information Technology Department' },
          { name: 'HRD', description: 'Human Resources Department' },
          { name: 'Sales', description: 'Sales Department' },
          { name: 'Finance', description: 'Finance Department' },
          { name: 'Marketing', description: 'Marketing Department' },
          { name: 'CS', description: 'Customer Service Department' }
        ]

        for (const dept of initialDepartments) {
          await departmentService.create(dept)
        }
        
        console.log('Initial departments seeded successfully')
      }

      return {
        success: true,
        message: 'Initial data seeded successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to seed initial data: ${error}`
      }
    }
  }
}

// Helper function to run migration with UI feedback
export async function runMigrationWithFeedback(
  onProgress?: (message: string) => void,
  onError?: (error: string) => void,
  onSuccess?: (message: string) => void
) {
  try {
    onProgress?.('Testing Supabase connection...')
    const connectionTest = await DataMigration.testConnection()
    
    if (!connectionTest.success) {
      onError?.(connectionTest.message)
      return false
    }

    onProgress?.('Seeding initial data...')
    await DataMigration.seedInitialData()

    onProgress?.('Checking if migration is needed...')
    const migrationNeeded = await DataMigration.checkMigrationNeeded()
    
    if (!migrationNeeded) {
      onSuccess?.('No migration needed - database is already set up')
      return true
    }

    onProgress?.('Migrating employee data...')
    const result = await DataMigration.migrateEmployeesFromLocalStorage()
    
    if (result.success) {
      onSuccess?.(result.message)
      if (result.errors && result.errors.length > 0) {
        onError?.(`Migration completed with warnings: ${result.errors.join(', ')}`)
      }
      return true
    } else {
      onError?.(result.message)
      return false
    }

  } catch (error) {
    onError?.(`Migration failed: ${error}`)
    return false
  }
}