import React from "react";
import { useAuth } from "../../context/AuthContext";

interface Props {
  children: React.ReactNode;
  subtitle: string;
}

export const DashboardShell: React.FC<Props> = ({ children, subtitle }) => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-layout">
      <header className="topbar">
        <div className="topbar-title">
          <span>IGA LMS</span>
          <span>{subtitle}</span>
        </div>
        <div className="topbar-actions">
          {user && (
            <>
              <span className="topbar-user">
                {user.firstName} {user.lastName}
              </span>
              <span className="topbar-role">{user.role}</span>
            </>
          )}
          <button className="btn outline" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
};

