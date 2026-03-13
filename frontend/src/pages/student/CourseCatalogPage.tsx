import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type Course = {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  teacher?: { id: string; firstName: string; lastName: string };
};

export const CourseCatalogPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c1, c2] = await Promise.all([
        api.get<Course[]>("/api/courses"),
        api.get<Course[]>("/api/courses/enrolled").catch(() => ({ data: [] as Course[] }))
      ]);
      setCourses(c1.data);
      setEnrolledIds(new Set(c2.data.map((c) => c.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((c) => {
      const teacher = c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "";
      return `${c.title} ${c.description} ${teacher}`.toLowerCase().includes(needle);
    });
  }, [courses, q]);

  const enroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await api.post(`/api/courses/${courseId}/enroll`);
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse and enroll in available courses.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" />
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const enrolled = enrolledIds.has(c.id);
          return (
            <Card key={c.id} className="overflow-hidden bg-white/70 backdrop-blur">
              <div className="aspect-[16/9] w-full bg-slate-100">
                {c.image ? (
                  <img src={c.image} alt={c.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
                    No cover image
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{c.title}</CardTitle>
                <CardDescription className="line-clamp-2">{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Teacher:{" "}
                  <span className="text-foreground">
                    {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to={`/student/courses/${c.id}`}>View</Link>
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={enrolled || enrollingId === c.id}
                    onClick={() => enroll(c.id)}
                  >
                    {enrolled ? "Enrolled" : enrollingId === c.id ? "Enrolling…" : "Enroll"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>No courses found</CardTitle>
            <CardDescription>Try a different search term.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

