import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Profile } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { usePresence } from '@/hooks/usePresence';

export type UserRole = 'Administrator' | 'manager' | 'staff' | 'marketing';
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
  updatePassword: (newPassword: string) => Promise<boolean>;
  onlineUsers: any[];
  stashedSession: Session | null;
  restoreAdminSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDefaultModules = (role: UserRole): ModuleType[] => {
  switch (role) {
    case 'Administrator':
      return ['hrd', 'accounting', 'inventory', 'customer', 'project', 'sales', 'purchase', 'marketing'];
    case 'manager':
      return ['hrd', 'accounting', 'sales', 'purchase', 'marketing'];
    case 'marketing':
      return ['marketing', 'sales', 'hrd'];
    case 'staff':
      return ['hrd', 'accounting', 'marketing'];
    default:
      return ['hrd'];
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [stashedSession, setStashedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState<string>(Math.random().toString(36).substring(7));

  const fetchingFor = useRef<string | null>(null);
  const initializing = useRef<boolean>(false);
  const isMounted = useRef(true);

  const [onlineUsers] = useState<any[]>([]);

  const updateAuthState = (newSession: Session | null, newUser: User | null, newProfile: Profile | null) => {
    let finalizedUser = newUser;

    // SAFETY NET: If we have an existing user who is an Administrator, 
    // and the new identity temporarily shows 'staff' (e.g. during a refresh or profile sync delay),
    // preserve the higher role to prevent UI flickering or sudden access loss.
    if (user && newUser && user.id === newUser.id) {
      if (newUser.role === 'staff' && user.role !== 'staff') {
        console.log(`[Auth] Preserving higher role (${user.role}) over temporary 'staff' role for user ${user.id}`);
        finalizedUser = {
          ...newUser,
          role: user.role,
          modules: user.modules
        };
      }
    }

    if (!newUser || (user && user.id !== newUser.id)) {
      setSessionKey(Math.random().toString(36).substring(7));
    }

    setSession(newSession);
    setUser(finalizedUser);
    setProfile(newProfile);
  };

  const fetchProfile = async (userId: string, metadata: any, currentSession: Session | null) => {
    fetchingFor.current = userId;

    const profileTimeout = new Promise<null>((resolve) =>
      setTimeout(() => {
        resolve(null);
      }, 15000)
    );

    try {
      const data = await Promise.race([
        authService.getUserProfile(userId),
        profileTimeout
      ]);

      if (fetchingFor.current !== userId) {
        return;
      }

      if (data) {
        let userModules = (data.modules as ModuleType[]) || [];
        // Normalize role name
        let role = data.role as string;
        if (role && (role.trim().toLowerCase() === 'admin' || role.trim().toLowerCase() === 'administrator')) {
          role = 'Administrator';
        }
        const userRole = role as UserRole;
        console.log(`[Auth] Profile loaded: ${userId}, Role: ${userRole}`);

        if (['Administrator', 'manager', 'staff', 'marketing'].includes(userRole)) {
          if (!userModules.includes('marketing')) {
            userModules = [...userModules, 'marketing'];
          }
        }

        if (userModules.length === 0) {
          userModules = getDefaultModules(userRole);
        }

        const newUser: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: userRole,
          avatar: data.avatar,
          modules: (userRole === 'Administrator') ? getDefaultModules(userRole) : userModules,
          employee_id: data.employee_id,
        };

        updateAuthState(currentSession, newUser, data);
      } else {
        // Fallback to metadata if profile record doesn't exist yet
        let role = (metadata?.role as string) || 'staff';
        if (role && (role.trim().toLowerCase() === 'admin' || role.trim().toLowerCase() === 'administrator')) {
          role = 'Administrator';
        }
        const userRole = role as UserRole;
        console.log(`[Auth] Profile record missing for ${userId}, falling back to metadata role: ${userRole}`);

        const fallbackUser: User = {
          id: userId,
          email: metadata?.email || '',
          name: metadata?.name || 'User',
          role: userRole,
          modules: (metadata?.modules as ModuleType[]) || getDefaultModules(userRole),
        };
        updateAuthState(currentSession, fallbackUser, null);
      }
    } catch (error) {
      console.error('❌ [Auth] Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    isMounted.current = true;

    const initSession = async () => {
      if (initializing.current) return;
      initializing.current = true;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted.current) return;

        if (currentSession) {
          const metadata = currentSession.user.user_metadata;
          let roleRaw = (metadata?.role as string) || 'staff';
          if (roleRaw && (roleRaw.trim().toLowerCase() === 'admin' || roleRaw.trim().toLowerCase() === 'administrator')) {
            roleRaw = 'Administrator';
          }
          const role = roleRaw as UserRole;
          const defaultModules = getDefaultModules(role);

          updateAuthState(currentSession, {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: metadata?.name || 'User',
            role: role,
            modules: (metadata?.modules as ModuleType[]) || defaultModules,
          }, null);

          await fetchProfile(currentSession.user.id, metadata, currentSession);
        }
      } catch (error) {
        console.error('Session init error:', error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    const savedStashStr = sessionStorage.getItem('admin_session_stash');
    if (savedStashStr) {
      try {
        const savedStash = JSON.parse(savedStashStr);
        const stashTime = savedStash.stashedAt ? new Date(savedStash.stashedAt).getTime() : 0;
        const now = Date.now();
        if (now - stashTime < 2 * 60 * 60 * 1000) {
          setStashedSession(savedStash.session);
        } else {
          sessionStorage.removeItem('admin_session_stash');
        }
      } catch (e) {
        console.error('Failed to parse stashed session', e);
      }
    }

    const safetyTimer = setTimeout(() => {
      if (isMounted.current) {
        setIsLoading(prev => {
          if (prev) {
            console.warn('🚨 [Auth] GLOBAL SAFETY TIMEOUT: Forcing isLoading to false');
          }
          return false;
        });
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_OUT') {
        updateAuthState(null, null, null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession) {
          const userId = currentSession.user.id;
          if (fetchingFor.current && fetchingFor.current !== userId) {
            updateAuthState(null, null, null);
          }

          const metadata = currentSession.user.user_metadata;
          let roleRaw = (metadata?.role as string) || 'staff';
          if (roleRaw && (roleRaw.trim().toLowerCase() === 'admin' || roleRaw.trim().toLowerCase() === 'administrator')) {
            roleRaw = 'Administrator';
          }
          const role = roleRaw as UserRole;

          updateAuthState(currentSession, {
            id: userId,
            email: currentSession.user.email || '',
            name: metadata?.name || 'User',
            role: role,
            modules: (metadata?.modules as ModuleType[]) || getDefaultModules(role),
          }, null);

          fetchProfile(userId, metadata, currentSession);
        }
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      updateAuthState(null, null, null);
      sessionStorage.removeItem('lastVisitedPath');
      await authService.signIn({ email, password });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreAdminSession = async (): Promise<void> => {
    if (!stashedSession) return;
    try {
      setIsLoading(true);
      setUser(null);
      setProfile(null);
      const { error } = await supabase.auth.setSession(stashedSession);
      if (error) throw error;
      sessionStorage.removeItem('admin_session_stash');
      setStashedSession(null);
    } catch (error) {
      console.error('❌ [Auth) Error restoring admin session:', error);
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
    try {
      setIsLoading(true);
      setUser(null);
      setProfile(null);
      setSession(null);
      setStashedSession(null);
      sessionStorage.removeItem('lastVisitedPath');
      sessionStorage.removeItem('admin_session_stash');
      await authService.signOut();
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
        let roleRaw = data.role as string;
        if (roleRaw && (roleRaw.trim().toLowerCase() === 'admin' || roleRaw.trim().toLowerCase() === 'administrator')) {
          roleRaw = 'Administrator';
        }
        const userRole = roleRaw as UserRole;

        setProfile(data);
        setUser(prev => prev ? ({
          ...prev,
          name: data.name,
          role: userRole,
          modules: (userRole === 'Administrator') ? getDefaultModules(userRole) : ((data.modules as ModuleType[]) || prev.modules),
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

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      await authService.updatePassword(newPassword);
      return true;
    } catch (error) {
      console.error('Update password error:', error);
      return false;
    }
  };

  const hasModuleAccess = (module: ModuleType): boolean => {
    if (user?.role === 'Administrator') return true;
    return user?.modules.includes(module) ?? false;
  };

  const value = React.useMemo(() => ({
    user,
    profile,
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    register,
    logout,
    hasModuleAccess,
    updateProfile,
    updatePassword,
    onlineUsers,
    stashedSession,
    restoreAdminSession
  }), [user, profile, session, isLoading, onlineUsers, stashedSession]);

  return (
    <AuthContext.Provider value={value}>
      <div key={sessionKey} className="contents">
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
      updatePassword: async () => false,
      onlineUsers: [],
      stashedSession: null,
      restoreAdminSession: async () => { },
    };
  }
  return context;
}
