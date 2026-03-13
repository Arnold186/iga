import React from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

type Role = "STUDENT" | "TEACHER" | "ADMIN";

export const RequireRole: React.FC<{ roles: Role[]; redirectTo?: string }> = ({
  roles,
  redirectTo = "/login"
}) => {
  const { user } = useAuth();

  if (!user) return <Navigate to={redirectTo} replace />;
  if (!roles.includes(user.role)) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
};

