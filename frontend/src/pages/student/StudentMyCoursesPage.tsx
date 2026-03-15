import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const StudentMyCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/courses/enrolled");
      setCourses(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Courses you are currently enrolled in.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
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
              <Button asChild className="w-full">
                <Link to={`/student/courses/${c.id}`}>Continue Learning</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && courses.length === 0 && (
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>You haven't enrolled yet</CardTitle>
            <CardDescription>Go to the Course Catalog to find your first course.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
