import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('musclemap_token');
    const savedUser = localStorage.getItem('musclemap_user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('musclemap_user', JSON.stringify(userData));
    if (token) localStorage.setItem('musclemap_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('musclemap_user');
    localStorage.removeItem('musclemap_token');
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
