import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Users } from "lucide-react";

import { api } from "../../services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

type Course = { id: string; title: string; description: string; status: string };
type Assignment = { id: string; title: string; courseId: string };

export const TeacherDashboardPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Course[]>("/api/courses").then((r) => setCourses(r.data)).catch(() => setCourses([])),
      api.get<Assignment[]>("/api/assignments").then((r) => setAssignments(r.data)).catch(() => setAssignments([]))
    ]).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const approved = courses.filter((c) => c.status === "APPROVED").length;
    const pending = courses.filter((c) => c.status === "PENDING").length;
    return [
      { title: "My Courses", value: courses.length, description: `${approved} approved • ${pending} pending`, icon: <BookOpen className="h-4 w-4" /> },
      { title: "Assignments", value: assignments.length, description: "Created by you", icon: <ClipboardList className="h-4 w-4" /> },
      { title: "Students", value: "—", description: "Per course", icon: <Users className="h-4 w-4" /> }
    ];
  }, [assignments.length, courses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your courses, assignments, and students.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.title} className="bg-white/70 backdrop-blur">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </div>
              <div className="text-muted-foreground">{s.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

