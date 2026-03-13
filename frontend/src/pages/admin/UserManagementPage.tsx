import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
};

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<UserRow[]>("/api/admin/users")
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.role}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [q, users]);

  const setActive = async (userId: string, isActive: boolean) => {
    setSavingId(userId);
    try {
      await api.patch(`/api/admin/users/${userId}/status`, { isActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search, activate, and deactivate accounts.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>User directory</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${filtered.length} users`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Name</th>
                  <th className="py-3 pr-3">Email</th>
                  <th className="py-3 pr-3">Role</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 pr-3">{u.email}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          u.isActive
                            ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                        }
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingId === u.id}
                        onClick={() => setActive(u.id, !u.isActive)}
                      >
                        {savingId === u.id ? "Saving…" : u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

