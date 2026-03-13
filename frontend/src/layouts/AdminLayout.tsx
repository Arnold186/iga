import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, CheckSquare, GraduationCap, LayoutDashboard, LogOut, MessageSquare, Shield, User, Users } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/teachers", label: "Teachers", icon: Shield },
  { to: "/admin/students", label: "Students", icon: GraduationCap },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/pending-approvals", label: "Pending Approvals", icon: CheckSquare },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/chat", label: "Chat", icon: MessageSquare },
  { to: "/admin/profile", label: "Profile", icon: User }
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      {/* Animated Background Blobs */}
      <div className="fixed -left-4 top-0 h-96 w-96 animate-blob rounded-full bg-blue-300 mix-blend-multiply opacity-30 filter blur-3xl"></div>
      <div className="fixed -right-4 top-20 h-96 w-96 animate-blob rounded-full bg-sky-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-2000"></div>
      <div className="fixed -bottom-8 left-20 h-96 w-96 animate-blob rounded-full bg-blue-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-4000"></div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] p-4 md:p-6 gap-6">
        <aside className="hidden w-[280px] shrink-0 rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-xl md:flex flex-col">
          <div className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2">
            <img src="/IGA.png" alt="IGA" className="h-9 w-9 rounded-lg border object-cover" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">IGA Admin</div>
              <div className="truncate text-xs text-muted-foreground">
                {user ? `${user.firstName} ${user.lastName}` : "—"}
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end as boolean | undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
                      isActive && "bg-slate-100 text-slate-900"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/30 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-white/60 hover:bg-white/90"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md overflow-hidden">
          <header className="sticky top-0 z-10 border-b border-white/30 bg-white/60 backdrop-blur-lg">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <div className="flex items-center gap-2">
                    <img src="/IGA.png" alt="IGA" className="h-8 w-8 rounded-lg border object-cover" />
                    <span className="text-sm font-semibold">IGA</span>
                  </div>
                </div>
                <span className="hidden text-sm text-muted-foreground md:inline">
                  Platform administration
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/admin/profile")}>
                  <User className="h-4 w-4" />
                  Profile
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 md:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

