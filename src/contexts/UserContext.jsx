import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@musclemap/client';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [token, savedUser] = await Promise.all([
          auth.getToken(),
          auth.getUser(),
        ]);
        if (token && savedUser && savedUser.id) {
          setUser(savedUser);
        }
      } catch (e) {
        console.error('Failed to restore auth state:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (userData, token) => {
    setUser(userData);
    await auth.setAuth(token, userData);
  };

  const logout = async () => {
    setUser(null);
    await auth.clearAuth();
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  return context || { user: null, loading: false, isAuthenticated: false, login: () => {}, logout: () => {} };
}

export default UserContext;
