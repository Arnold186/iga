import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyOtpPage } from "./pages/auth/VerifyOtpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { StudentDashboard } from "./pages/dashboard/StudentDashboard";
import { TeacherDashboard } from "./pages/dashboard/TeacherDashboard";
import { AdminDashboard } from "./pages/dashboard/AdminDashboard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/student"
        element={
          user?.role === "STUDENT" ? <StudentDashboard /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/teacher"
        element={
          user?.role === "TEACHER" ? <TeacherDashboard /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/admin"
        element={
          user?.role === "ADMIN" ? <AdminDashboard /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/"
        element={
          user?.role === "STUDENT" ? (
            <Navigate to="/student" replace />
          ) : user?.role === "TEACHER" ? (
            <Navigate to="/teacher" replace />
          ) : user?.role === "ADMIN" ? (
            <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-right" />
    </AuthProvider>
  );
};

export default App;

