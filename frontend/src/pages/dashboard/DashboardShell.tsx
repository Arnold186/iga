import React from "react";
import { useAuth } from "../../context/AuthContext";
import { NotificationPanel } from "../../components/NotificationPanel";

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
          <div className="topbar-brand">
            <img src="/IGA.png" alt="IGA" />
            <span className="topbar-brand-text">IGA</span>
          </div>
          <span>{subtitle}</span>
        </div>
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user && (
            <>
              <NotificationPanel />
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

