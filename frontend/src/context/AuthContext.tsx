import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

type Role = "STUDENT" | "TEACHER" | "ADMIN";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (payload: { email: string; password: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("iga_token");
    const storedUser = localStorage.getItem("iga_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async ({ email, password }: { email: string; password: string }) => {
    const res = await api.post("/api/auth/login", { email, password });
    const { token: jwt, user } = res.data;
    setToken(jwt);
    setUser(user);
    localStorage.setItem("iga_token", jwt);
    localStorage.setItem("iga_user", JSON.stringify(user));
    return user as User;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("iga_token");
    localStorage.removeItem("iga_user");
  };

  const value: AuthContextValue = {
    user,
    token,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

