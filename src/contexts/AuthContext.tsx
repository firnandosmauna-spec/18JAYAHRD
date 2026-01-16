import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Profile } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { usePresence } from '@/hooks/usePresence';

export type UserRole = 'admin' | 'manager' | 'staff' | 'marketing';
export type ModuleType = 'hrd' | 'accounting' | 'inventory' | 'customer' | 'project' | 'sales' | 'purchase' | 'marketing';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  modules: ModuleType[];
  employee_id?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, role?: UserRole, modules?: ModuleType[], position?: string, department?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasModuleAccess: (module: ModuleType) => boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  onlineUsers: any[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get default modules based on role
const getDefaultModules = (role: UserRole): ModuleType[] => {
  switch (role) {
    case 'admin':
      return ['hrd', 'accounting', 'inventory', 'customer', 'project', 'sales', 'purchase'];
    case 'manager':
      return ['hrd', 'accounting', 'sales', 'purchase'];
    case 'marketing':
      return ['marketing', 'hrd'];
    case 'staff':
      return ['hrd', 'accounting'];
    default:
      return ['hrd', 'accounting'];
  }
};

// Moved import to top

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Broadcast presence via hook, and capture onlineUsers state
  const { onlineUsers } = usePresence(user ? {
    id: user.id,
    role: user.role,
    employee_id: user.employee_id
  } : undefined);

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref to track if we are in the middle of a registration flow
  const isRegisteringRef = React.useRef(false);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    logger.addLog(`📥 Loading profile for user: ${supabaseUser.id}`, 'info');

    // Create fallback user immediately
    const userRole = (supabaseUser.user_metadata?.role as UserRole) || 'admin';
    let fallbackUser: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      role: userRole,
      modules: (supabaseUser.user_metadata?.modules as ModuleType[]) || getDefaultModules(userRole),
    };

    try {
      // Try to get profile with timeout
      const profilePromise = authService.getUserProfile(supabaseUser.id);
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          logger.addLog('⏱️ Profile fetch timeout, using fallback', 'warning');
          resolve(null);
        }, 5000) // 5s profile timeout (Reduced from 15s for speed)
      );

      const userProfile = await Promise.race([profilePromise, timeoutPromise]);
      logger.addLog(`📦 Profile result: ${userProfile ? 'Found' : 'Timeout/Not found'}`, 'info');

      if (userProfile) {
        setProfile(userProfile);

        // SELF-HEALING: Check if user_metadata is out of sync with profile
        // This fixes the "flashing" issue where fallback user (from metadata) has different permissions than DB profile
        const metadataModules = supabaseUser.user_metadata?.modules as ModuleType[] | undefined;
        const profileModules = userProfile.modules as ModuleType[];

        const metadataRole = supabaseUser.user_metadata?.role;
        const profileRole = userProfile.role;

        const modulesChanged = JSON.stringify(metadataModules) !== JSON.stringify(profileModules);
        const roleChanged = metadataRole !== profileRole;

        if (modulesChanged || roleChanged) {
          logger.addLog('🔄 Syncing stale user_metadata with profile...', 'info');
          supabase.auth.updateUser({
            data: {
              role: profileRole,
              modules: profileModules,
              name: userProfile.name // might as well sync name too
            }
          }).then(({ error }) => {
            if (error) console.error('Failed to self-heal metadata:', error);
            else logger.addLog('✅ User metadata self-healed', 'success');
          });
        }

        // If profile exists but has no employee_id, try to find it via direct lookup with timeout
        let empId = userProfile.employee_id;

        // Removed !isProfileAdmin check to ensure Admins get looked up too
        if (!empId && supabaseUser.email) {
          try {
            // Wrap Supabase call in a short timeout race to prevent hanging
            const lookupPromise = supabase
              .from('employees')
              .select('id')
              .eq('email', supabaseUser.email)
              .maybeSingle();

            const lookupTimeoutPromise = new Promise<{ data: { id: string } | null, error: any }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: 'timeout' }), 4000) // Reduced to 4s
            );

            const result = await Promise.race([lookupPromise, lookupTimeoutPromise]);

            if (result.data) {
              empId = result.data.id;
              logger.addLog('✅ Found employee_id via extra lookup', 'success');
            }
          } catch (err) {
            console.error('Extra employee lookup failed', err);
          }
        }

        setUser({
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role as UserRole,
          avatar: userProfile.avatar,
          modules: userProfile.modules as ModuleType[],
          employee_id: empId,
        });
        logger.addLog('✅ User state updated from profile', 'success');
      } else {
        // Use fallback immediately, but try to find employee_id first
        if (supabaseUser.email) {
          try {
            // Wrap Supabase call in a short timeout race
            const lookupPromise = supabase
              .from('employees')
              .select('id')
              .eq('email', supabaseUser.email)
              .maybeSingle();

            const lookupTimeoutPromise = new Promise<{ data: { id: string } | null, error: any }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: 'timeout' }), 4000) // Reduced to 4s
            );

            const result = await Promise.race([lookupPromise, lookupTimeoutPromise]);

            if (result.data) {
              fallbackUser = { ...fallbackUser, employee_id: result.data.id };
              logger.addLog('✅ Found employee_id via fallback lookup', 'success');
            }
          } catch (err) {
            console.error('Fallback employee lookup failed', err);
          }
        }

        logger.addLog('⚡ Using fallback user', 'warning');
        setUser(fallbackUser);
        setProfile(null);
      }
    } catch (error) {
      logger.addLog('❌ Error loading profile, using fallback', 'error', error);
      setUser(fallbackUser);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      logger.addLog('🔄 Initializing auth...', 'info');

      try {
        const session = await authService.getCurrentSession();

        if (!mounted) {
          logger.addLog('⚠️ Component unmounted, skipping auth init', 'warning');
          return;
        }

        logger.addLog(`📋 Session status: ${session ? 'Found' : 'None'}`, 'info', { email: session?.user?.email });
        setSession(session);

        if (session?.user) {
          logger.addLog('👤 User found in session, loading profile...', 'info');
          try {
            await loadUserProfile(session.user);
          } catch (error) {
            logger.addLog('❌ Profile load failed', 'error', error);
          }
        }
      } catch (error) {
        logger.addLog('❌ Auth init error', 'error', error);
      } finally {
        if (mounted) {
          logger.addLog('✅ Auth init complete, stopping loading', 'info');
          setIsLoading(false);
        }
      }
    };

    // Start initialization
    initAuth();

    // Safety timeout - absolutely force loading to false after 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        logger.addLog('⏰ SAFETY TIMEOUT - forcing isLoading to false', 'warning');
        setIsLoading(false);
      }
    }, 8000); // Reduced to 8s from 15s

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Skip updating state if we are in the middle of registration
      if (isRegisteringRef.current) {
        logger.addLog(`🔔 Auth state changed: ${event} (Ignored during registration)`, 'info');
        return;
      }

      logger.addLog(`🔔 Auth state changed: ${event}`, 'info', { email: session?.user?.email });
      setSession(session);

      if (session?.user) {
        try {
          await loadUserProfile(session.user);
        } catch (error) {
          logger.addLog('❌ Profile load failed on auth change', 'error', error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      logger.addLog('🧹 Cleaning up auth context', 'info');
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    logger.addLog(`🔑 Attempting login for: ${email}`, 'info');
    try {
      const { user: supabaseUser, session } = await authService.signIn({ email, password });
      if (supabaseUser && session) {
        setSession(session);
        await loadUserProfile(supabaseUser);
        logger.addLog('✅ Login successful', 'success', { userId: supabaseUser.id });
        return true;
      }
      logger.addLog('❌ Login failed: no user or session returned', 'error');
      return false;
    } catch (error: any) {
      logger.addLog('❌ Login error', 'error', { message: error.message, error });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserRole = 'staff',
    modules?: ModuleType[],
    position?: string,
    department?: string
  ): Promise<boolean> => {
    isRegisteringRef.current = true; // Block auth state updates
    logger.addLog(`📝 Registering new user: ${email}`, 'info', { name, role, modules });

    try {
      // 1. Whitelist Check: Verify if email exists in employees table
      if (role !== 'admin') {
        const { data: employeeData, error: empError } = await supabase
          .from('employees')
          .select('id, name, position, department')
          .eq('email', email)
          .single();

        if (empError || !employeeData) {
          logger.addLog('❌ Registration blocked: Email not found in Employee whitelist', 'warning');
          const errorMsg = 'MAAF DATA ANDA BELUM MASUK, SILAHKAN HUBUNGI ADMIN';
          throw new Error(errorMsg);
        }

        // Validate Name, Position, and Department
        const nameMatch = employeeData.name.trim().toLowerCase() === name.trim().toLowerCase();
        let positionMatch = true;
        let departmentMatch = true;

        if (role === 'staff') {
          if (!position || !department) {
            const errorMsg = 'MAAF DATA ANDA BELUM MASUK, SILAHKAN HUBUNGI ADMIN (Mohon lengkapi Posisi dan Departemen)';
            throw new Error(errorMsg);
          }
          positionMatch = (employeeData.position || '').trim().toLowerCase() === position.trim().toLowerCase();
          departmentMatch = (employeeData.department || '').trim().toLowerCase() === department.trim().toLowerCase();
        }

        if (!nameMatch || !positionMatch || !departmentMatch) {
          logger.addLog('❌ Registration blocked: Data mismatch', 'warning', {
            expected: { name: employeeData.name, pos: employeeData.position, dept: employeeData.department },
            received: { name, pos: position, dept: department }
          });
          const errorMsg = 'MAAF DATA ANDA BELUM MASUK, SILAHKAN HUBUNGI ADMIN';
          throw new Error(errorMsg);
        }

        logger.addLog('✅ Whitelist check passed', 'success', { employeeId: employeeData.id });
      }

      const finalModules = modules || getDefaultModules(role);
      const { user: supabaseUser } = await authService.signUp({
        email,
        password,
        name,
        role,
        modules: finalModules
      });

      if (supabaseUser) {
        logger.addLog('✅ Registration successful', 'success', { userId: supabaseUser.id });

        // 2. Link Employee ID to Profile if found
        if (role !== 'admin') {
          try {
            // Retrieve again to be safe
            const { data: employeeData } = await supabase
              .from('employees')
              .select('id')
              .eq('email', email)
              .single();

            if (employeeData) {
              // Update profile
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ employee_id: employeeData.id })
                .eq('id', supabaseUser.id);

              if (updateError) console.error('Failed to link employee_id to profile:', updateError);
              else logger.addLog('✅ Linked Profile to Employee ID', 'success');
            }
          } catch (linkErr) {
            console.error('Error linking employee:', linkErr);
          }
        }

        // Wait a moment to ensure any pending auth events are ignored
        await new Promise(resolve => setTimeout(resolve, 500));

        isRegisteringRef.current = false; // Unblock updates
        return true;
      }

      logger.addLog('❌ Registration failed: no user returned', 'error');
      isRegisteringRef.current = false;
      return false;
    } catch (error: any) {
      logger.addLog('❌ Register error', 'error', { message: error.message, error });
      isRegisteringRef.current = false;
      throw error; // Rethrow so the UI can show the specific "whitelist" message
    }
  };

  const logout = async (): Promise<void> => {
    try {
      logger.addLog('🚪 Logging out...', 'info');
      await authService.signOut();
      // Clear all auth state
      setUser(null);
      setProfile(null);
      setSession(null);
      setIsLoading(false);
      logger.addLog('✅ Logout successful', 'success');
    } catch (error) {
      setSession(null);
      setIsLoading(false);
      logger.addLog('Logout failed (state cleared anyway)', 'error', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) return false;

    try {
      logger.addLog('Updating profile...', 'info', updates);
      const updatedProfile = await authService.updateUserProfile(user.id, updates);

      if (updatedProfile) {
        setProfile(updatedProfile);
        setUser({
          ...user,
          name: updatedProfile.name,
          role: updatedProfile.role as UserRole,
          avatar: updatedProfile.avatar,
          modules: updatedProfile.modules as ModuleType[],
          employee_id: updatedProfile.employee_id,
        });
        logger.addLog('Profile updated successfully', 'success');
        return true;
      }

      logger.addLog('Profile update returned null', 'warning');
      return false;
    } catch (error) {
      logger.addLog('Update profile error', 'error', error);
      return false;
    }
  };

  const hasModuleAccess = (module: ModuleType): boolean => {
    if (user?.role === 'admin') return true;
    return user?.modules.includes(module) ?? false;
  };

  const value = React.useMemo(() => ({
    user,
    profile,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    login,
    register,
    logout,
    hasModuleAccess,
    updateProfile,
    onlineUsers
  }), [user, profile, session, isLoading, onlineUsers]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values instead of throwing to prevent app crash
    console.warn('useAuth called outside AuthProvider, returning default values');
    return {
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => false,
      register: async () => false,
      logout: async () => { },
      hasModuleAccess: () => false,
      updateProfile: async () => false,
      onlineUsers: [],
    };
  }
  return context;
}
