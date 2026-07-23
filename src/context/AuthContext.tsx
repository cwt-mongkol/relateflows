import React, { createContext, useContext, useState, useCallback } from 'react';

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

function generateFacebookUser(): AuthUser {
  return {
    id: `fb-${Date.now()}`,
    name: 'Facebook User',
    email: 'facebook.user@example.com',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    provider: 'facebook',
  };
}

function generateLineUser(): AuthUser {
  return {
    id: `line-${Date.now()}`,
    name: 'Line User',
    email: 'line.user@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    provider: 'line',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const authUser = credential === 'demo' ? DEMO_USER : decodeGoogleCredential(credential);
    setUser(authUser);
    setIsLoading(false);
  }, []);

  const loginWithLine = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setUser(generateLineUser());
    setIsLoading(false);
  }, []);

  const loginWithFacebook = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setUser(generateFacebookUser());
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

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
