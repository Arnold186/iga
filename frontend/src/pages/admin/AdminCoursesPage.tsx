import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type CourseRow = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  image?: string | null;
  teacher?: { id: string; firstName: string; lastName: string; email: string } | null;
};

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<CourseRow[]>("/api/courses")
      .then((r) => setCourses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((c) =>
      `${c.title} ${c.description} ${c.status} ${c.teacher?.firstName ?? ""} ${c.teacher?.lastName ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [q, courses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">View all courses across the platform.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>All courses</CardTitle>
          <CardDescription>{loading ? "Loading…" : `${filtered.length} courses`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Course</th>
                  <th className="py-3 pr-3">Teacher</th>
                  <th className="py-3 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{c.title}</div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
                    </td>
                    <td className="py-3 pr-3">
                      {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "—"}
                      {c.teacher?.email ? (
                        <div className="text-xs text-muted-foreground">{c.teacher.email}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={
                          c.status === "APPROVED"
                            ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                            : c.status === "PENDING"
                            ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                            : "rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                        }
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-muted-foreground" colSpan={3}>
                      No courses found.
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

