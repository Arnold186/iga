import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type TeacherRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
  createdAt: string;
};

export const TeacherManagementPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });

  const load = () => {
    setLoading(true);
    api
      .get<TeacherRow[]>("/api/admin/teachers")
      .then((r) => setTeachers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return teachers;
    return teachers.filter((t) =>
      `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(needle)
    );
  }, [q, teachers]);

  const createTeacher = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || form.password.length < 6) {
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/admin/teachers", form);
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create teacher accounts and manage directory.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teachers…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Create teacher</CardTitle>
          <CardDescription>Passwords must be at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Temporary password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={createTeacher} disabled={saving}>
              {saving ? "Creating…" : "Create teacher"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Teacher directory</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${filtered.length} teachers`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Name</th>
                  <th className="py-3 pr-3">Email</th>
                  <th className="py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-medium">{t.firstName} {t.lastName}</td>
                    <td className="py-3 pr-3">{t.email}</td>
                    <td className="py-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={3}>
                      No teachers found.
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

