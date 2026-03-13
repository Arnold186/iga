import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Hourglass, Layers, Users } from "lucide-react";

import { api } from "../../services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

type Analytics = {
  studentsCount: number;
  teachersCount: number;
  coursesCount: number;
  pendingCoursesCount: number;
  enrollmentsCount: number;
  averagePerformance: number;
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
}> = ({ title, value, description, icon }) => {
  return (
    <Card className="bg-white/70 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Analytics>("/api/admin/analytics")
      .then((r) => setAnalytics(r.data))
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => {
    const a = analytics;
    return [
      {
        title: "Total Users",
        value: a ? a.studentsCount + a.teachersCount : "—",
        description: "Students + teachers",
        icon: <Users className="h-4 w-4" />
      },
      {
        title: "Total Teachers",
        value: a?.teachersCount ?? "—",
        icon: <Layers className="h-4 w-4" />
      },
      {
        title: "Total Students",
        value: a?.studentsCount ?? "—",
        icon: <GraduationCap className="h-4 w-4" />
      },
      {
        title: "Total Courses",
        value: a?.coursesCount ?? "—",
        icon: <BookOpen className="h-4 w-4" />
      },
      {
        title: "Active Enrollments",
        value: a?.enrollmentsCount ?? "—",
        icon: <Users className="h-4 w-4" />
      },
      {
        title: "Pending Course Approvals",
        value: a?.pendingCoursesCount ?? "—",
        icon: <Hourglass className="h-4 w-4" />
      }
    ];
  }, [analytics]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview and key metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.title} title={c.title} value={c.value} description={c.description} icon={c.icon} />
        ))}
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Average quiz performance across all submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{loading ? "Loading…" : `${analytics?.averagePerformance ?? 0}%`}</div>
        </CardContent>
      </Card>
    </div>
  );
};

