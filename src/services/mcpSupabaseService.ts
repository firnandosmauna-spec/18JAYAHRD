// MCP Supabase Service Integration
// This service provides integration with Supabase through MCP (Model Context Protocol)

export interface MCPSupabaseConfig {
  projectRef: string;
  mcpUrl: string;
}

export class MCPSupabaseService {
  private config: MCPSupabaseConfig;

  constructor(config: MCPSupabaseConfig) {
    this.config = config;
  }

  // Get project information
  getProjectInfo() {
    return {
      projectRef: this.config.projectRef,
      mcpUrl: this.config.mcpUrl,
      dashboardUrl: `https://supabase.com/dashboard/project/${this.config.projectRef}`,
      apiUrl: `https://${this.config.projectRef}.supabase.co`,
    };
  }

  // Generate useful MCP commands for this project
  getMCPCommands() {
    return {
      // Table operations
      listTables: 'list_tables',
      describeEmployees: 'describe_table employees',
      describeDepartments: 'describe_table departments',

      // Data queries
      getAllEmployees: 'select_data "SELECT * FROM employees ORDER BY created_at DESC"',
      getAllDepartments: 'select_data "SELECT * FROM departments ORDER BY name"',
      getActiveEmployees: 'select_data "SELECT * FROM employees WHERE status = \'active\'"',

      // Analytics queries
      getEmployeeStats: 'select_data "SELECT department_id, COUNT(*) as count FROM employees GROUP BY department_id"',
      getSalaryStats: 'select_data "SELECT AVG(salary) as avg_salary, MIN(salary) as min_salary, MAX(salary) as max_salary FROM employees"',

      // Recent data
      getRecentEmployees: 'select_data "SELECT * FROM employees WHERE created_at >= NOW() - INTERVAL \'7 days\'"',
      getRecentNotifications: 'select_data "SELECT * FROM notifications WHERE created_at >= NOW() - INTERVAL \'1 day\' ORDER BY created_at DESC"',
    };
  }

  // Generate schema documentation
  getSchemaDocumentation() {
    return {
      tables: {
        employees: {
          description: 'Employee master data',
          primaryKey: 'id (UUID)',
          foreignKeys: ['department_id -> departments.id'],
          indexes: ['department_id', 'status', 'email'],
          importantFields: ['name', 'position', 'department_id', 'status', 'salary', 'join_date']
        },
        departments: {
          description: 'Department master data',
          primaryKey: 'id (UUID)',
          foreignKeys: ['manager_id -> employees.id'],
          importantFields: ['name', 'description', 'manager_id']
        },
        leave_requests: {
          description: 'Employee leave/absence requests',
          primaryKey: 'id (UUID)',
          foreignKeys: [
            'employee_id -> employees.id',
            'approved_by -> employees.id',
            'handover_to -> employees.id'
          ],
          importantFields: ['employee_id', 'leave_type', 'start_date', 'end_date', 'status']
        },
        attendance: {
          description: 'Daily attendance records',
          primaryKey: 'id (UUID)',
          foreignKeys: ['employee_id -> employees.id'],
          uniqueConstraints: ['employee_id + date'],
          importantFields: ['employee_id', 'date', 'check_in', 'check_out', 'status']
        },
        payroll: {
          description: 'Monthly payroll records',
          primaryKey: 'id (UUID)',
          foreignKeys: ['employee_id -> employees.id'],
          uniqueConstraints: ['employee_id + period_month + period_year'],
          importantFields: ['employee_id', 'period_month', 'period_year', 'base_salary', 'net_salary', 'status']
        },
        rewards: {
          description: 'Employee rewards and achievements',
          primaryKey: 'id (UUID)',
          foreignKeys: ['employee_id -> employees.id'],
          importantFields: ['employee_id', 'type', 'title', 'points', 'status', 'awarded_date']
        },
        notifications: {
          description: 'System notifications',
          primaryKey: 'id (UUID)',
          importantFields: ['title', 'message', 'type', 'module', 'user_id', 'read']
        }
      },
      relationships: {
        'employees -> departments': 'Many employees belong to one department',
        'employees -> leave_requests': 'One employee can have many leave requests',
        'employees -> attendance': 'One employee has many attendance records',
        'employees -> payroll': 'One employee has many payroll records',
        'employees -> rewards': 'One employee can have many rewards'
      }
    };
  }

  // Generate useful SQL queries for analysis
  getAnalyticsQueries() {
    return {
      employeeDistribution: `
        SELECT 
          d.name as department,
          COUNT(e.id) as employee_count,
          AVG(e.salary) as avg_salary
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
      `,

      salaryAnalysis: `
        SELECT 
          d.name as department,
          MIN(e.salary) as min_salary,
          AVG(e.salary) as avg_salary,
          MAX(e.salary) as max_salary,
          COUNT(e.id) as employee_count
        FROM departments d
        JOIN employees e ON d.id = e.department_id
        WHERE e.status = 'active'
        GROUP BY d.id, d.name
        ORDER BY avg_salary DESC
      `,

      attendanceStats: `
        SELECT 
          e.name,
          e.position,
          d.name as department,
          COUNT(a.id) as total_records,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
          COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
          ROUND(
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 
            2
          ) as attendance_percentage
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN attendance a ON e.id = a.employee_id
        WHERE e.status = 'active'
        GROUP BY e.id, e.name, e.position, d.name
        ORDER BY attendance_percentage DESC
      `,

      leaveRequestsSummary: `
        SELECT 
          e.name,
          d.name as department,
          lr.leave_type,
          lr.start_date,
          lr.end_date,
          lr.days,
          lr.status,
          lr.created_at
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        WHERE lr.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY lr.created_at DESC
      `,

      rewardsSummary: `
        SELECT 
          e.name,
          d.name as department,
          r.type,
          r.title,
          r.points,
          r.status,
          r.awarded_date
        FROM rewards r
        JOIN employees e ON r.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        WHERE r.awarded_date >= NOW() - INTERVAL '90 days'
        ORDER BY r.awarded_date DESC
      `
    };
  }
}

// Initialize MCP Supabase service
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';

export const mcpSupabaseService = new MCPSupabaseService({
  projectRef: projectRef,
  mcpUrl: `https://mcp.supabase.com/mcp?project_ref=${projectRef}`
});

// Export useful constants
export const MCP_COMMANDS = mcpSupabaseService.getMCPCommands();
export const SCHEMA_DOCS = mcpSupabaseService.getSchemaDocumentation();
export const ANALYTICS_QUERIES = mcpSupabaseService.getAnalyticsQueries();