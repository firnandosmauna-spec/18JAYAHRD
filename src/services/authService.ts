import { supabase, supabaseNoSession } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'

export interface SignUpData {
  email: string
  password: string
  name: string
  role?: 'Administrator' | 'manager' | 'staff' | 'marketing'
  modules?: string[]
  employeeId?: string | null
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  // Sign up new user
  async signUp(data: SignUpData) {
    console.log("DEBUG: Signing up user:", data.email);

    // 1. Lookup employee by email to auto-link (fallback if not provided)
    let linkedEmployeeId = data.employeeId || null;
    let autoRole = data.role || 'staff';
    let autoModules = data.modules || ['hrd'];

    if (!linkedEmployeeId) {
      try {
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', data.email)
          .single();

        if (employee) {
          console.log("DEBUG: Found linked employee by email:", employee.name);
          linkedEmployeeId = employee.id;

          // Auto-assign role based on position if not explicitly provided
          if (!data.role) {
            const positionLower = (employee.position || '').toLowerCase();
            if (positionLower.includes('manager') || positionLower.includes('kepala') || positionLower.includes('lead')) {
              autoRole = 'manager';
            } else if (positionLower.includes('admin')) {
              autoRole = 'Administrator';
            }
          }
        }
      } catch (err) {
        console.warn("DEBUG: Employee lookup failed:", err);
      }
    }

    // 2. Register via Backend RPC
    const { data: authData, error } = await supabase.rpc('admin_create_user', {
      email: data.email,
      password: data.password,
      user_name: data.name,
      user_role: autoRole,
      target_employee_id: linkedEmployeeId
    });

    // If there's a Supabase client-level error (e.g., network, RPC function not found), throw it.
    if (error) {
      console.error("DEBUG: admin_create_user RPC error:", error);
      throw error;
    }

    // If the RPC call itself was successful but the function returned a 'success: false' payload
    if (authData && !authData.success) {
      console.error("DEBUG: admin_create_user returned failure:", authData.error, authData.detail);
      throw new Error(authData.error || "Gagal membuat akun di database.");
    }

    return authData;
  }

  // Sign in user
  async signIn(data: SignInData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (error) throw error;
    return authData;
  }

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Get current user profile
  async getUserProfile(userId: string): Promise<Profile | null> {
    const startTime = performance.now();
    try {
      console.log(`📡 [AuthService] DB fetch started for ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const duration = (performance.now() - startTime).toFixed(2);

      if (error) {
        console.error(`❌ [AuthService] DB fetch error for ${userId} after ${duration}ms:`, error);
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      console.log(`✅ [AuthService] DB fetch completed for ${userId} in ${duration}ms`);
      return data;
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error(`❌ [AuthService] Exception fetching profile for ${userId} after ${duration}ms:`, error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Metadata sync should only happen if the user is updating THEIR OWN profile
    const { data: { session } } = await supabase.auth.getSession();
    const metadata: any = {};
    if (updates.name) metadata.name = updates.name;
    if (updates.role) metadata.role = updates.role;

    if (session?.user?.id === userId && Object.keys(metadata).length > 0) {
      await supabase.auth.updateUser({ data: metadata });
    }

    return data;
  }

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  }

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  }
}

export const authService = new AuthService();