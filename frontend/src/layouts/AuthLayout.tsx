import React from "react";
import { Link } from "react-router-dom";

export const AuthLayout: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      {/* Animated Background Blobs */}
      <div className="absolute left-10 top-20 h-72 w-72 animate-blob rounded-full bg-blue-300 mix-blend-multiply opacity-40 filter blur-2xl"></div>
      <div className="absolute right-20 top-10 h-72 w-72 animate-blob border-none rounded-full bg-blue-400 mix-blend-multiply opacity-40 filter blur-2xl animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 h-72 w-72 animate-blob rounded-full bg-sky-300 mix-blend-multiply opacity-40 filter blur-2xl animation-delay-4000"></div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1200px] items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-white/60 bg-white/60 shadow-xl backdrop-blur-xl md:grid-cols-2">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-50/50 to-white/50 p-8 md:flex backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <img src="/IGA.png" alt="IGA" className="h-10 w-10 rounded-xl border object-cover" />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">IGA</div>
                <div className="text-xs text-muted-foreground">Learning Management System</div>
              </div>
            </div>

            <div className="mt-10">
              <div className="text-xl font-semibold tracking-tight text-slate-900">
                Learn. Teach. Manage.
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                A clean, modern dashboard experience for admins, teachers, and students.
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Need help?{" "}
              <Link className="text-primary hover:underline" to="/login">
                Contact your admin
              </Link>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 md:hidden">
                <img src="/IGA.png" alt="IGA" className="h-9 w-9 rounded-xl border object-cover" />
                <div className="text-sm font-semibold">IGA</div>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>

            {children}

            {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

