import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../config/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Configure api defaults
  useEffect(() => {
    if (token) {
      // Set the token for our configured api instance
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check for existing session on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (token) {
        try {
          const response = await api.get("/api/users/profile");
          setUser(response.data.user);
        } catch (error) {
          console.error("Auth check failed:", error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    loading,
    token,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
