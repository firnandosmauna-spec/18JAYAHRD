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
      return ['hrd', 'accounting', 'inventory', 'customer', 'project', 'sales', 'purchase', 'marketing'];
    case 'manager':
      return ['hrd', 'accounting', 'sales', 'purchase'];
    case 'marketing':
      return ['marketing', 'sales', 'hrd'];
    case 'staff':
      return ['hrd', 'accounting', 'marketing'];
    default:
      return ['hrd'];
  }
};

// Moved import to top

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Stable empty array for onlineUsers
  const [onlineUsers] = useState<any[]>([]);

  const fetchProfile = async (userId: string, metadata: any) => {
    console.log(`📥 [Auth] Fetching profile for ${userId}...`);

    // Safety timeout for profile fetch specifically
    const profileTimeout = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('⚠️ [Auth] Profile fetch timed out, using fallback');
        resolve(null);
      }, 3000)
    );

    try {
      const data = await Promise.race([
        authService.getUserProfile(userId),
        profileTimeout
      ]);

      if (data) {
        console.log('✅ [Auth] Profile loaded successfully');
        setProfile(data);
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          avatar: data.avatar,
          modules: (data.modules as ModuleType[]) || getDefaultModules(data.role as UserRole),
          employee_id: data.employee_id,
        });
      } else {
        console.log('⚠️ [Auth] Profile not found or timed out, using metadata fallback');
        const role = (metadata?.role as UserRole) || 'staff';
        setUser({
          id: userId,
          email: metadata?.email || '',
          name: metadata?.name || 'User',
          role: role,
          modules: (metadata?.modules as ModuleType[]) || getDefaultModules(role),
        });
      }
    } catch (error) {
      console.error('❌ [Auth] Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initialize session
    const initSession = async () => {
      console.log('🔄 [Auth] Initializing session...');
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (currentSession) {
          console.log('👤 [Auth] Session found');
          setSession(currentSession);

          // Set immediate user state from metadata so isAuthenticated is true right away
          const metadata = currentSession.user.user_metadata;
          const role = (metadata?.role as UserRole) || 'staff';
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: metadata?.name || 'User',
            role: role,
            modules: (metadata?.modules as ModuleType[]) || getDefaultModules(role),
          });

          // Then fetch full profile in background
          fetchProfile(currentSession.user.id, metadata);
        } else {
          console.log('📋 [Auth] No session found');
        }
      } catch (error) {
        console.error('❌ [Auth] Session init error:', error);
      } finally {
        if (mounted) {
          console.log('🏁 [Auth] Setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Safety timeout: force loading to false after 5 seconds NO MATTER WHAT
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(prev => {
          if (prev) console.warn('🚨 [Auth] GLOBAL SAFETY TIMEOUT: Forcing isLoading to false');
          return false;
        });
      }
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      console.log(`🔔 [Auth] Auth event: ${event}`);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (currentSession) {
        setSession(currentSession);

        // Ensure user is set immediately from metadata if not already set
        if (!user || user.id !== currentSession.user.id) {
          const metadata = currentSession.user.user_metadata;
          const role = (metadata?.role as UserRole) || 'staff';
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: metadata?.name || 'User',
            role: role,
            modules: (metadata?.modules as ModuleType[]) || getDefaultModules(role),
          });

          fetchProfile(currentSession.user.id, metadata);
        }
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await authService.signIn({ email, password });
      return true;
    } catch (error) {
      console.error('Login error:', error);
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
    try {
      setIsLoading(true);
      await authService.signUp({ email, password, name, role, modules });
      return true;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 [Auth] Initiating logout...');
    try {
      setIsLoading(true);
      // Clear state IMMEDIATELY to trigger UI changes even before network request completes
      setUser(null);
      setProfile(null);
      setSession(null);

      await authService.signOut();
      console.log('✅ [Auth] Logout successful');
    } catch (error) {
      console.error('❌ [Auth] Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) return false;
    try {
      const data = await authService.updateUserProfile(user.id, updates);
      if (data) {
        setProfile(data);
        setUser(prev => prev ? ({
          ...prev,
          name: data.name,
          role: data.role as UserRole,
          modules: (data.modules as ModuleType[]) || prev.modules,
          employee_id: data.employee_id
        }) : null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update profile error:', error);
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
    isAuthenticated: !!session, // Base authentication on session existence for speed
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
