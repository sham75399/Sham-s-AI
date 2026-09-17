import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("shams_token");
    const savedUser = localStorage.getItem("shams_user");

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("shams_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("shams_token", token);
    localStorage.setItem("shams_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("shams_token");
    localStorage.removeItem("shams_user");
    setUser(null);
  };

  const updateUser = (updates) => {
    const next = { ...user, ...updates };
    localStorage.setItem("shams_user", JSON.stringify(next));
    setUser(next);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};