import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyOtpPage } from "./pages/auth/VerifyOtpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { RequireRole } from "./components/RequireRole";
import { AdminLayout } from "./layouts/AdminLayout";
import { TeacherLayout } from "./layouts/TeacherLayout";
import { StudentLayout } from "./layouts/StudentLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { UserManagementPage } from "./pages/admin/UserManagementPage";
import { TeacherManagementPage } from "./pages/admin/TeacherManagementPage";
import { StudentManagementPage } from "./pages/admin/StudentManagementPage";
import { CourseApprovalPage } from "./pages/admin/CourseApprovalPage";
import { AdminCoursesPage } from "./pages/admin/AdminCoursesPage";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ChatPage } from "./pages/chat/ChatPage";
import { TeacherDashboardPage } from "./pages/teacher/TeacherDashboardPage";
import { TeacherCoursesPage } from "./pages/teacher/TeacherCoursesPage";
import { AssignmentsPage } from "./pages/teacher/AssignmentsPage";
import { StudentListPage } from "./pages/teacher/StudentListPage";
import { CourseCatalogPage } from "./pages/student/CourseCatalogPage";
import { CourseDetailPage } from "./pages/student/CourseDetailPage";

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireRole roles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="teachers" element={<TeacherManagementPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="pending-approvals" element={<CourseApprovalPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["TEACHER"]} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboardPage />} />
          <Route path="courses" element={<TeacherCoursesPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="students" element={<StudentListPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["STUDENT"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<CourseCatalogPage />} />
          <Route path="courses" element={<CourseCatalogPage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

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

