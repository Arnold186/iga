import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

type Course = { id: string; title: string; description: string };

type Enrollment = {
  student: { id: string; firstName: string; lastName: string; email: string };
};

export const StudentListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get<Course[]>("/api/courses").then((r) => setCourses(r.data)).catch(() => setCourses([]));
  }, []);

  const load = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<Enrollment[]>(`/api/courses/${id}/students`);
      setEnrollments(res.data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return enrollments;
    return enrollments.filter((e) =>
      `${e.student.firstName} ${e.student.lastName} ${e.student.email}`.toLowerCase().includes(needle)
    );
  }, [enrollments, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You can only see students enrolled in your courses.
          </p>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Course roster</CardTitle>
          <CardDescription>Select a course to view enrolled students.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <Label>Course</Label>
              <select
                className="mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCourseId(id);
                  setEnrollments([]);
                  if (id) load(id).catch(() => setEnrollments([]));
                }}
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:pt-7">
              <Button variant="outline" onClick={() => load(courseId).catch(() => {})} disabled={!courseId || loading}>
                {loading ? "Loading…" : "Refresh"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Name</th>
                  <th className="py-3 pr-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.student.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-medium">
                      {e.student.firstName} {e.student.lastName}
                    </td>
                    <td className="py-3 pr-3">{e.student.email}</td>
                  </tr>
                ))}
                {!loading && courseId && filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={2}>
                      No enrolled students yet.
                    </td>
                  </tr>
                )}
                {!courseId && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={2}>
                      Select a course to view its roster.
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

