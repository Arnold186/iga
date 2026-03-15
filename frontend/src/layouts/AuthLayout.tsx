import React from "react";

export const AuthLayout: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-slate-200">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
            <img src="/IGA.png" alt="IGA" className="h-7 w-7 rounded-lg object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">IGA</div>
            <div className="text-xs text-slate-500">Learning Platform</div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="space-y-4">{children}</div>

        {footer ? (
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">{footer}</div>
        ) : null}
      </div>
    </div>
  );
};
