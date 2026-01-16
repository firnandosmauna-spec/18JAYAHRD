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
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role || 'staff',
            modules: data.modules || ['hrd']
          }
        }
      })

      if (authError) {
        throw authError
      }

      // Sign out immediately after signup to prevent auto-login
      if (authData.session) {
        await supabase.auth.signOut()
      }

      return { user: authData.user, session: null }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  // Sign in user
  async signIn(data: SignInData) {
    console.log('🔑 Sign-in attempt:', { email: data.email, url: import.meta.env.VITE_SUPABASE_URL });
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        console.error('❌ Sign-in auth error:', authError);
        throw authError
      }

      console.log('✅ Sign-in successful for:', data.email);
      return { user: authData.user, session: authData.session }
    } catch (error: any) {
      console.error('❌ Sign-in exception:', error);
      throw error
    }
  }

  // Sign out user
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      return user
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        throw error
      }
      return session
    } catch (error) {
      console.error('Get current session error:', error)
      return null
    }
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Get user profile error:', error);
      // Always return null instead of throwing to prevent app crash
      return null;
    }
  }

  // Create user profile
  async createUserProfile(userId: string, profileData: Partial<Profile>): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: profileData.email || '',
          name: profileData.name || 'User',
          role: profileData.role || 'staff',
          avatar: profileData.avatar,
          modules: profileData.modules || ['hrd'],
          employee_id: profileData.employee_id,
        })
        .select()
        .single()

      if (error) {
        // If profile already exists, try to update instead
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log('Profile already exists, updating instead');
          return await this.updateUserProfile(userId, profileData);
        }
        console.error('Create user profile error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create user profile error:', error);
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<Profile>) {
    try {
      // 1. Update Profile in Database
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          console.log('Profile does not exist, creating new profile');
          return await this.createUserProfile(userId, updates);
        }
        throw error
      }

      // 2. Sync with User Metadata (Crucial for Fallback)
      // We only update metadata fields that match the updates
      const metadataUpdates: any = {};
      if (updates.name) metadataUpdates.name = updates.name;
      if (updates.role) metadataUpdates.role = updates.role;
      if (updates.modules) metadataUpdates.modules = updates.modules;
      // Note: allow updating other metadata if needed, but keep it safe

      if (Object.keys(metadataUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: metadataUpdates
        });
        if (authError) {
          console.warn('Failed to sync user_metadata:', authError);
          // Don't throw, as the DB update succeeded
        } else {
          console.log('✅ Synced user_metadata with profile updates');
        }
      }

      return data
    } catch (error) {
      console.error('Update user profile error:', error)
      throw error
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  // Update password
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const authService = new AuthService()