import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'

export interface SignUpData {
  email: string
  password: string
  name: string
  role?: 'admin' | 'manager' | 'staff' | 'marketing'
  modules?: string[]
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  // Sign up new user
  async signUp(data: SignUpData) {
    console.log("DEBUG: Signing up user:", data.email);

    // 1. Lookup employee by email to auto-link
    let linkedEmployeeId = null;
    let autoRole = data.role || 'staff';
    let autoModules = data.modules || ['hrd'];

    try {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', data.email)
        .single();

      if (employee) {
        console.log("DEBUG: Found linked employee:", employee.name);
        linkedEmployeeId = employee.id;

        // Auto-assign role based on position
        const positionLower = (employee.position || '').toLowerCase();
        if (positionLower.includes('manager') || positionLower.includes('kepala') || positionLower.includes('lead')) {
          autoRole = 'manager';
        } else if (positionLower.includes('admin')) {
          autoRole = 'admin'; // Caution: usually we don't auto-grant admin, but maybe manager
        }

        // Auto-assign modules (basic for now)
        // If needed, we can expand logic here
      }
    } catch (err) {
      console.warn("DEBUG: Employee lookup failed (might be new user not in employee DB):", err);
    }

    // 2. Register in Auth
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          role: autoRole,
          modules: autoModules,
          employee_id: linkedEmployeeId // Pass in metadata just in case
        }
      }
    });

    if (error) throw error;

    // 3. Explicitly link profile if employee found (Reliability layer)
    // The trigger might do this, but this ensures it happens even if trigger is missing
    if (authData.user && linkedEmployeeId) {
      console.log("DEBUG: Explicitly linking profile to employee:", linkedEmployeeId);
      // Small delay to ensure profile trigger finished creation (race condition handling)
      setTimeout(async () => {
        try {
          await supabase.from('profiles').update({
            employee_id: linkedEmployeeId,
            role: autoRole, // Enforce role from logic
            updated_at: new Date().toISOString()
          }).eq('id', authData.user!.id);
        } catch (linkErr) {
          console.error("DEBUG: Failed to explicit link profile:", linkErr);
        }
      }, 1000);
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
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

    // Optional: Sync metadata if name/role changes
    const metadata: any = {};
    if (updates.name) metadata.name = updates.name;
    if (updates.role) metadata.role = updates.role;

    if (Object.keys(metadata).length > 0) {
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