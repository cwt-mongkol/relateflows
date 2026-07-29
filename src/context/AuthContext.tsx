import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { decodeJwtPayload } from '../lib/jwt';
import { useToast } from './ToastContext';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'line' | 'facebook';
  roleId?: number;
  permissions?: string[];
  isAdmin?: boolean;
  tenantId?: string;
}

interface TenantInfo {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  isDefault: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userTenants: TenantInfo[];
  currentTenantName: string;
  switchTenant: (tenantId: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithLine: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithDemo: (role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const INACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // check every 60s

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'touchmove', 'scroll', 'wheel'];


function storeSession(accessToken: string, refreshToken: string, userData: AuthUser) {
  localStorage.setItem('rf-access-token', accessToken);
  localStorage.setItem('rf-refresh-token', refreshToken);
  localStorage.setItem('rf-user', JSON.stringify(userData));
}

function clearSession() {
  localStorage.removeItem('rf-access-token');
  localStorage.removeItem('rf-refresh-token');
  localStorage.removeItem('rf-user');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const lastActivity = useRef<number>(0);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem('rf-user');
    if (cached) {
      try { return JSON.parse(cached); } catch {/* invalid cached user */ }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userTenants, setUserTenants] = useState<TenantInfo[]>([]);

  // --- Activity tracking ---
  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    lastActivity.current = Date.now();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, updateActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, [updateActivity]);

  // Periodic inactivity check
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        const rt = api.getRefreshToken();
        if (rt) {
          api.post('/api/auth/logout', { refreshToken: rt }).catch(() => {});
        }
        clearSession();
        setUser(null);
        window.location.reload();
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // --- Token verification on mount ---
  useEffect(() => {
    async function verify() {
      const token = api.getAccessToken();
      if (!token) {
        clearSession();
        setInitialized(true);
        return;
      }
      try {
        const data = await api.get<AuthUser & { tenantId?: string }>('/api/auth/me');
        const enriched = { ...data, tenantId: data.tenantId };
        setUser(enriched);
        localStorage.setItem('rf-user', JSON.stringify(enriched));
        // Load accessible tenants
        loadUserTenants();
      } catch (err) {
        console.warn('Token verification failed, clearing session:', err);
        clearSession();
        setUser(null);
      }
      setInitialized(true);
    }
    verify();
  }, []);

  const handleLoginResult = useCallback((result: { accessToken: string; refreshToken: string; user: AuthUser }) => {
    const payload = decodeJwtPayload(result.accessToken);
    const enrichedUser: AuthUser = {
      ...result.user,
      roleId: (payload?.role_id as number) ?? undefined,
      isAdmin: (payload?.role_id as number) === 1,
    };
    storeSession(result.accessToken, result.refreshToken, enrichedUser);
    setUser(enrichedUser);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/google', { access_token: credential });
      handleLoginResult(res);
    } catch (err) {
      console.error('Google login failed:', err);
      addToast('Backend is not available. Please try again later.', 'error');
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const loginWithLine = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/line', {});
      handleLoginResult(res);
    } catch (err) {
      console.error('LINE login failed:', err);
      addToast('LINE login is not available. Please try again later.', 'error');
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const loginWithDemo = useCallback(async (role: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/demo', { role });
      handleLoginResult(res);
    } catch (err) {
      console.warn('Demo login fallback (backend unavailable):', err);
      await new Promise(r => setTimeout(r, 400));
      const roleMap: Record<string, AuthUser> = {
        super:   { id: 'demo-super-001',   name: 'Daisuke Yamamoto (Super Admin)', email: 'daisuke@relateflows.com',       avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', provider: 'google', roleId: 1, isAdmin: true },
        admin:   { id: 'demo-admin-001',    name: 'Sarah Connor (Administrator)',  email: 'sarah.connor@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', provider: 'google', roleId: 2, isAdmin: false },
        manager: { id: 'demo-mgr-001',     name: 'Alex Rivera (Manager)',         email: 'alex.rivera@relateflows.com',   avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', provider: 'google', roleId: 3, isAdmin: false },
        cs_admin:{ id: 'demo-csadmin-001', name: 'Kenji Tanaka (CS Admin)',       email: 'kenji.tanaka@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', provider: 'google', roleId: 4, isAdmin: false },
        sales:   { id: 'demo-sales-001',   name: 'Marcus Brody (Sales Rep)',      email: 'marcus.brody@relateflows.com',  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', provider: 'google', roleId: 5, isAdmin: false },
      };
      const authUser = roleMap[role] || roleMap.admin;
      const fakePayloadEnriched = btoa(JSON.stringify({ sub: authUser.id, name: authUser.name, email: authUser.email, picture: authUser.avatar, provider: authUser.provider, role_id: authUser.roleId }));
      const enrichedUser: AuthUser = {
        ...authUser,
        roleId: authUser.roleId,
        isAdmin: authUser.roleId === 1,
      };
      const fakeAccess = `eyJhbGciOiJIUzI1NiJ9.${fakePayloadEnriched}.fake`;
      const fakeRefresh = `eyJhbGciOiJIUzI1NiJ9.${fakePayloadEnriched}.refresh-fake`;
      storeSession(fakeAccess, fakeRefresh, enrichedUser);
      setUser(enrichedUser);
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const loginWithFacebook = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/facebook', {});
      handleLoginResult(res);
    } catch (err) {
      console.error('Facebook login failed:', err);
      addToast('Facebook login is not available. Please try again later.', 'error');
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const logout = useCallback(() => {
    const rt = api.getRefreshToken();
    if (rt) {
      api.post('/api/auth/logout', { refreshToken: rt }).catch(() => {});
    }
    clearSession();
    setUser(null);
  }, []);

  const loadUserTenants = useCallback(async () => {
    try {
      const tenants = await api.get<TenantInfo[]>('/api/auth/user-tenants');
      setUserTenants(tenants);
    } catch {
      // Non-critical
    }
  }, []);

  const switchTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; tenantId: string; tenantName: string }>('/api/auth/switch-tenant', { tenantId });
      localStorage.setItem('rf-access-token', res.accessToken);
      localStorage.setItem('rf-refresh-token', res.refreshToken);
      // Reload user info with new tenant context
      const userData = await api.get<AuthUser>('/api/auth/me');
      const enriched = { ...userData, tenantId: res.tenantId };
      setUser(enriched);
      localStorage.setItem('rf-user', JSON.stringify(enriched));
      setUserTenants(prev => prev.map(t => ({ ...t, isDefault: t.tenantId === res.tenantId })));
      // Reload the page to refresh all data with new tenant context
      window.location.reload();
    } catch (err) {
      console.error('Tenant switch failed:', err);
      addToast('Failed to switch company', 'error');
    }
    setIsLoading(false);
  }, []);

  const currentTenantName = userTenants.find(t => t.tenantId === user?.tenantId)?.name || '';

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-blue-600" />
          <p className="text-sm text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        userTenants,
        currentTenantName,
        switchTenant,
        loginWithGoogle,
        loginWithLine,
        loginWithFacebook,
        loginWithDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
