import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'line' | 'facebook';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithLine: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const INACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // check every 60s

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'touchmove', 'scroll', 'wheel'];

const DEMO_USER: AuthUser = {
  id: 'demo-001',
  name: 'Sarah Connor',
  email: 'sarah.connor@relateflows.com',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  provider: 'google',
};

function decodeGoogleCredential(credential: string): AuthUser {
  try {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    return {
      id: payload.sub,
      name: payload.name || 'Google User',
      email: payload.email || '',
      avatar: payload.picture || '',
      provider: 'google',
    };
  } catch {
    return DEMO_USER;
  }
}

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
        // Inactivity timeout — logout
        const rt = api.getRefreshToken();
        if (rt) {
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          }).catch(() => {/* logout API failure is non-critical */});
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
      // Try to verify with backend
      try {
        const data = await api.get<AuthUser>('/api/auth/me');
        setUser(data);
        localStorage.setItem('rf-user', JSON.stringify(data));
      } catch (err) {
        console.warn('Token verification failed, clearing session:', err);
        clearSession();
        setUser(null);
      }
      setInitialized(true);
    }
    verify();
  }, []);

  // --- Login handlers ---

  const handleLoginResult = useCallback((result: { accessToken: string; refreshToken: string; user: AuthUser }) => {
    storeSession(result.accessToken, result.refreshToken, result.user);
    setUser(result.user);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/google', { credential });
      handleLoginResult(res);
    } catch {
      // Demo fallback
      await new Promise(r => setTimeout(r, 600));
      const authUser = credential === 'demo' ? DEMO_USER : decodeGoogleCredential(credential);
      const fakePayload = btoa(JSON.stringify({ sub: authUser.id, name: authUser.name, email: authUser.email, picture: authUser.avatar, provider: authUser.provider }));
      const fakeAccess = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.fake`;
      const fakeRefresh = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.refresh-fake`;
      storeSession(fakeAccess, fakeRefresh, authUser);
      setUser(authUser);
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const loginWithLine = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/line', {});
      handleLoginResult(res);
    } catch {
      await new Promise(r => setTimeout(r, 600));
      const authUser: AuthUser = {
        id: `line-${Date.now()}`,
        name: 'Line User',
        email: 'line.user@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        provider: 'line',
      };
      const fakePayload = btoa(JSON.stringify({ sub: authUser.id, name: authUser.name, email: authUser.email, picture: authUser.avatar, provider: authUser.provider }));
      const fakeAccess = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.fake`;
      const fakeRefresh = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.refresh-fake`;
      storeSession(fakeAccess, fakeRefresh, authUser);
      setUser(authUser);
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const loginWithFacebook = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>('/api/auth/facebook', {});
      handleLoginResult(res);
    } catch {
      await new Promise(r => setTimeout(r, 600));
      const authUser: AuthUser = {
        id: `fb-${Date.now()}`,
        name: 'Facebook User',
        email: 'facebook.user@example.com',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        provider: 'facebook',
      };
      const fakePayload = btoa(JSON.stringify({ sub: authUser.id, name: authUser.name, email: authUser.email, picture: authUser.avatar, provider: authUser.provider }));
      const fakeAccess = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.fake`;
      const fakeRefresh = `eyJhbGciOiJIUzI1NiJ9.${fakePayload}.refresh-fake`;
      storeSession(fakeAccess, fakeRefresh, authUser);
      setUser(authUser);
    }
    setIsLoading(false);
  }, [handleLoginResult]);

  const logout = useCallback(() => {
    const rt = api.getRefreshToken();
    if (rt) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    clearSession();
    setUser(null);
  }, []);

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
        loginWithGoogle,
        loginWithLine,
        loginWithFacebook,
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
