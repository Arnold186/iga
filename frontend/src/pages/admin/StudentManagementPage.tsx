import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
};

export const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<StudentRow[]>("/api/admin/students")
      .then((r) => setStudents(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(needle)
    );
  }, [q, students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">View students registered on the platform.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Student directory</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${filtered.length} students`}</CardDescription>
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
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-medium">{s.firstName} {s.lastName}</td>
                    <td className="py-3 pr-3">{s.email}</td>
                    <td className="py-3">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={3}>
                      No students found.
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

