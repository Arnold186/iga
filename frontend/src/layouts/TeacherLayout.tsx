import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, ClipboardList, HelpCircle, LayoutDashboard, LogOut, MessageSquare, PlusCircle, User, Users } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/courses", label: "My Courses", icon: BookOpen },
  { to: "/teacher/courses/new", label: "Create Course", icon: PlusCircle },
  { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/teacher/quizzes", label: "Quizzes", icon: HelpCircle },
  { to: "/teacher/students", label: "Students", icon: Users },
  { to: "/teacher/chat", label: "Chat", icon: MessageSquare },
  { to: "/teacher/profile", label: "Profile", icon: User }
];

export const TeacherLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      {/* Animated Background Blobs */}
      <div className="fixed -left-4 top-0 h-96 w-96 animate-blob rounded-full bg-blue-300 mix-blend-multiply opacity-30 filter blur-3xl"></div>
      <div className="fixed -right-4 top-20 h-96 w-96 animate-blob rounded-full bg-sky-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-2000"></div>
      <div className="fixed -bottom-8 left-20 h-96 w-96 animate-blob rounded-full bg-blue-200 mix-blend-multiply opacity-30 filter blur-3xl animation-delay-4000"></div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] gap-6 p-4 md:p-6">
        {/* Left Sidebar */}
        <aside className="hidden w-[280px] shrink-0 flex-col rounded-2xl border border-white/50 bg-white/60 p-4 shadow-sm backdrop-blur-xl md:flex">
          <div className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
            <img src="/IGA.png" alt="IGA" className="h-9 w-9 rounded-lg border object-cover" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">IGA Teacher</div>
              <div className="truncate text-xs text-muted-foreground">
                {user ? `${user.firstName} ${user.lastName}` : "—"}
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end as boolean | undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-slate-100/80 hover:text-slate-900",
                      isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600"
                    )
                  }
                >
                  <Icon className={cn("h-4 w-4", "text-current")} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/40 pt-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-600 hover:bg-red-50 hover:text-red-700"
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

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-md">
          <header className="sticky top-0 z-10 border-b border-white/30 bg-white/60 backdrop-blur-lg">
            <div className="flex items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="md:hidden">
                  <div className="flex items-center gap-2">
                    <img src="/IGA.png" alt="IGA" className="h-8 w-8 rounded-lg border object-cover" />
                    <span className="text-sm font-semibold text-slate-900">IGA Teacher</span>
                  </div>
                </div>
                <span className="hidden text-sm font-medium text-slate-500 md:inline">
                  Teacher Dashboard
                </span>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/teacher/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700" onClick={() => { logout(); navigate("/login"); }}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

