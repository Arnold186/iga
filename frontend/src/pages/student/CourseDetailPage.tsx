import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

type CourseDetail = {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  teacher?: { id: string; firstName: string; lastName: string; email: string };
  documents?: { id: string; title: string; url: string; fileType: string }[];
  modules?: { id: string; title: string; order: number }[];
};

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<CourseDetail>(`/api/courses/${id}`)
      .then((r) => setCourse(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  const sortedModules = useMemo(() => {
    return [...(course?.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [course?.modules]);

  const enroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await api.post(`/api/courses/${id}/enroll`);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
          <CardDescription>Fetching course details.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!course) {
    return (
      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Course not found</CardTitle>
          <CardDescription>This course may have been removed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-white/70 backdrop-blur">
        <div className="aspect-[21/9] w-full bg-slate-100">
          {course.image ? (
            <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
              No cover image
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{course.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-3 text-sm text-muted-foreground">
                Teacher:{" "}
                <span className="text-foreground">
                  {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : "—"}
                </span>
              </div>
            </div>
            <Button onClick={enroll} disabled={enrolling}>
              {enrolling ? "Enrolling…" : "Enroll"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white/70 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Course structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedModules.map((m) => (
              <div key={m.id} className="rounded-lg border bg-white px-3 py-2">
                <div className="font-medium">{m.title}</div>
              </div>
            ))}
            {sortedModules.length === 0 && (
              <div className="text-sm text-muted-foreground">No modules yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Course resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(course.documents ?? []).map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.fileType.toUpperCase()}</div>
              </a>
            ))}
            {(course.documents ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">No documents yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

