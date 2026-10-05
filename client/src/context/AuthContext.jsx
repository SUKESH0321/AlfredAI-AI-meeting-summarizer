import React, { createContext, useContext, useState, useEffect } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initial fetch to see if we have valid HTTP-only cookies
    api.getMe()
      .then((res) => {
        if (res.success) {
          setIsAuthenticated(true);
          setUser(res.user);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success) {
      setIsAuthenticated(true);
      setUser(res.user);
      return true;
    }
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    if (res.success) {
      // Auto login after registration
      await login(email, password);
      return true;
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setUser(null);
    try {
      await api.logout();
    } catch(e) {}
  };

  // Prevent routing check from flickering if currently loading
  if (isInitializing) {
    return <div style={{width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Checking workspace...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, authenticated: isAuthenticated, user, setUser, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
