import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/supabase';
import { ModuleType, UserRole } from '@/contexts/AuthContext';

export interface AppUser extends Profile {
    employees?: {
        name: string;
        position: string;
    } | null;
}

export const userService = {
    // Get all users
    async getAllUsers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, employees(name, position)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("DEBUG: Supabase error in getAllUsers:", error);

                // Fallback attempt without join if join fails
                if (error.message?.includes('relationship') || error.message?.includes('column')) {
                    console.log("DEBUG: Retrying without join...");
                    const { data: simpleData, error: simpleError } = await supabase
                        .from('profiles')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (simpleError) throw simpleError;
                    return (simpleData || []) as AppUser[];
                }

                throw error;
            }

            console.log("DEBUG: Raw Users Data fetched:", data?.length || 0);
            return (data || []) as AppUser[];
        } catch (err) {
            console.error("DEBUG: Catch in getAllUsers:", err);
            throw err;
        }
    },

    // Update User Role and Modules
    async updateUserAccess(userId: string, role: UserRole, modules: ModuleType[]) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                role,
                modules,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as AppUser;
    },

    // Link employee_id to user
    async linkEmployee(userId: string, employeeId: string | null) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                employee_id: employeeId,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data as AppUser;
    },

    // Sync all active employees into profiles
    async syncAllEmployees() {
        console.log("DEBUG: Starting Sync All Employees...");
        try {
            // 1. Get all employees
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('id, name, email, position')
                .eq('status', 'active');

            if (empError) throw empError;
            console.log(`DEBUG: Found ${employees?.length || 0} active employees`);

            // 2. Get existing profiles
            const { data: existingProfiles, error: profError } = await supabase
                .from('profiles')
                .select('email, employee_id');

            if (profError) throw profError;

            const existingEmails = new Set(existingProfiles?.map(p => p.email?.toLowerCase()));
            const existingEmpIds = new Set(existingProfiles?.map(p => p.employee_id));

            // 3. Filter new
            const newProfiles = employees?.filter(emp =>
                !existingEmpIds.has(emp.id) &&
                !existingEmails.has(emp.email?.toLowerCase() || `${emp.name.toLowerCase().replace(/ /g, '.')}@jayatempo.com`)
            ).map(emp => ({
                id: emp.id, // Using employee UUID as profile UUID for consistency if no auth yet
                email: emp.email || `${emp.name.toLowerCase().replace(/ /g, '.')}@jayatempo.com`,
                name: emp.name,
                role: (emp.position?.toLowerCase().includes('admin') || emp.position?.toLowerCase().includes('manager')) ? 'manager' : 'staff',
                employee_id: emp.id,
                modules: ['hrd']
            }));

            console.log(`DEBUG: Prepared ${newProfiles?.length || 0} new profiles for sync`);

            if (!newProfiles || newProfiles.length === 0) return { success: true, count: 0 };

            // 4. Batch Upsert
            const { error: insertError } = await supabase
                .from('profiles')
                .upsert(newProfiles, { onConflict: 'id' });

            if (insertError) {
                console.error("DEBUG: Sync Insert Error:", insertError);
                throw insertError;
            }

            return { success: true, count: newProfiles.length };
        } catch (err) {
            console.error("DEBUG: Sync All Error:", err);
            throw err;
        }
    },

    // Register single employee as user
    async registerUser(employeeId: string) {
        try {
            // 1. Get employee data
            const { data: employee, error: empError } = await supabase
                .from('employees')
                .select('id, name, email, position')
                .eq('id', employeeId)
                .single();

            if (empError) throw empError;
            if (!employee) throw new Error("Employee not found");

            // 2. Check overlap by ID or Email
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .or(`employee_id.eq.${employeeId},email.eq.${employee.email || 'nomatch'}`)
                .maybeSingle();

            if (existingProfile) {
                // Update instead of fail? No, usually implies already registered.
                // But wait, if they are in "Unregistered" list, they shouldn't have a profile linked to this employee_id.
                // Maybe they have a profile with same email but null employee_id?
                // We should Link them instead.
                console.log("DEBUG: linking existing profile found via email/empId");
                await supabase.from('profiles').update({ employee_id: employeeId }).eq('id', existingProfile.id);
                return { success: true, email: employee.email, message: "Linked to existing profile" };
            }

            // 3. Create Profile (Note: This creates a profile record. If FK to auth.users exists, this will fail without Auth User.
            // If it succeeds, it allows the user to appear in the list, but they can't login until an Auth User with this ID is created.)
            const email = employee.email || `${employee.name.toLowerCase().replace(/ /g, '.')}@jayatempo.com`;
            const newProfile = {
                id: employee.id, // Using employee ID as Profile ID (Requires NO Foreign Key to auth.users OR matching Auth ID)
                email: email,
                name: employee.name,
                role: (employee.position?.toLowerCase().includes('admin') || employee.position?.toLowerCase().includes('manager')) ? 'manager' : 'staff',
                employee_id: employee.id,
                modules: ['hrd']
            };

            const { error: insertError } = await supabase
                .from('profiles')
                .upsert(newProfile);

            if (insertError) {
                console.error("DEBUG: Insert Profile Error:", insertError);
                throw new Error(insertError.message || "Failed to create profile");
            }

            return { success: true, email: email };
        } catch (err) {
            console.error("Register User Error:", err);
            throw err;
        }
    },

    // Sync Job Positions: Sales -> Marketing
    async syncSalesToMarketing() {
        console.log("DEBUG: syncing Sales -> Marketing...");
        const results = { departments: 0, positions: 0, employees_dept: 0, employees_pos: 0 };
        try {
            // 1. Departments
            const { error: depError, count: depCount } = await supabase
                .from('departments')
                .update({ name: 'Marketing' })
                .eq('name', 'Sales')
                .select('*');
            if (!depError) results.departments = depCount || 0;

            // 2. Positions (Department Column)
            const { error: posError, count: posCount } = await supabase
                .from('positions')
                .update({ department: 'Marketing' })
                .eq('department', 'Sales')
                .select('*');
            if (!posError) results.positions = posCount || 0;

            // 3. Employees (Department Column)
            const { error: empDepError, count: empDepCount } = await supabase
                .from('employees')
                .update({ department: 'Marketing' })
                .eq('department', 'Sales')
                .select('*');
            if (!empDepError) results.employees_dept = empDepCount || 0;

            // 4. Employees (Position Column - Exact Match & Partial Match)
            // First, exact match (legacy)
            const { error: empPosError, count: empPosCount } = await supabase
                .from('employees')
                .update({ position: 'Marketing' })
                .eq('position', 'Sales')
                .select('*');
            if (!empPosError) results.employees_pos += (empPosCount || 0);

            // Second, Partial Match (e.g. "Staf - Sales" -> "Staf - Marketing")
            const { data: salesEmps, error: searchError } = await supabase
                .from('employees')
                .select('id, position')
                .ilike('position', '%Sales%'); // Find any position containing Sales

            if (!searchError && salesEmps && salesEmps.length > 0) {
                let partialCount = 0;
                for (const emp of salesEmps) {
                    // Replace 'Sales' with 'Marketing' (Case sensitive usually better to preserve casing, but here we assume Title Case)
                    // We'll use a regex to be safe with word boundaries or just simple string replacement
                    const newPosition = emp.position.replace(/Sales/gi, 'Marketing');
                    if (newPosition !== emp.position) {
                        const { error: updateError } = await supabase
                            .from('employees')
                            .update({ position: newPosition })
                            .eq('id', emp.id);

                        if (!updateError) partialCount++;
                    }
                }
                results.employees_pos += partialCount;
                console.log(`DEBUG: Updated ${partialCount} partial matches.`);
            }

            return { success: true, details: results };
        } catch (err: any) {
            console.error("Sync Sales->Marketing Error:", err);
            return { success: false, error: err.message };
        }
    }
};
