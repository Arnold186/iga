import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, ClipboardList, LayoutDashboard, LogOut, MessageSquare, User } from "lucide-react";

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
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/courses", label: "Courses", icon: BookOpen },
  { to: "/student/my-courses", label: "My Courses", icon: BookOpen },
  { to: "/student/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/student/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/student/chat", label: "Chat", icon: MessageSquare },
  { to: "/student/profile", label: "Profile", icon: User }
];

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      {/* Animated Background Blobs */}
      <div className="fixed -left-4 top-0 h-96 w-96 animate-blob rounded-full bg-blue-300 mix-blend-multiply opacity-30 filter blur-3xl"></div>
      <div className="fixed -right-4 top-20 h-96 w-96 animate-blob rounded-full bg-sky-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-2000"></div>
      <div className="fixed -bottom-8 left-20 h-96 w-96 animate-blob rounded-full bg-blue-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-4000"></div>

      <div className="relative z-10">
        <header className="sticky top-0 z-20 mt-4 mx-4 md:mx-6 rounded-2xl border border-white/50 bg-white/70 shadow-sm backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/IGA.png" alt="IGA" className="h-9 w-9 rounded-lg border object-cover" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">IGA</div>
              <div className="text-xs text-muted-foreground">Student</div>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end as boolean | undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100",
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

          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : "—"}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/student/profile")}>
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

