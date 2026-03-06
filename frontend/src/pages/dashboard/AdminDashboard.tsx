import React, { useEffect, useState } from "react";
import axios from "axios";
import { DashboardShell } from "./DashboardShell";
import { ChatPanel } from "../../components/ChatPanel";

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Analytics {
  studentsCount: number;
  coursesCount: number;
  averagePerformance: number;
}

export const AdminDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const load = async () => {
    const [coursesRes, usersRes, analyticsRes] = await Promise.all([
      axios.get<Course[]>("/api/courses"),
      axios.get<User[]>("/api/admin/users"),
      axios.get<Analytics>("/api/admin/analytics")
    ]);
    setCourses(coursesRes.data);
    setUsers(usersRes.data);
    setAnalytics(analyticsRes.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const updateCourseStatus = async (courseId: string, status: string) => {
    await axios.patch(`/api/courses/${courseId}/status`, { status });
    load().catch(() => {});
  };

  const pendingCourses = courses.filter((c) => c.status === "PENDING");

  return (
    <DashboardShell subtitle="Admin Dashboard">
      <div className="page-grid">
        <div>
          <div className="card">
            <h2 className="card-title">Pending Courses</h2>
            <div className="list">
              {pendingCourses.map((c) => (
                <div key={c.id} className="list-item">
                  <div>
                    <div>{c.title}</div>
                    <small>{c.description}</small>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn outline"
                      onClick={() => updateCourseStatus(c.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn outline"
                      onClick={() => updateCourseStatus(c.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingCourses.length === 0 && <p>No pending courses.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Users</h2>
            <div className="list">
              {users.map((u) => (
                <div key={u.id} className="list-item">
                  <div>
                    <div>
                      {u.firstName} {u.lastName}
                    </div>
                    <small>{u.email}</small>
                  </div>
                  <span className="badge info">{u.role}</span>
                </div>
              ))}
              {users.length === 0 && <p>No users yet.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Analytics</h2>
            {analytics && (
              <>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-label">Students</div>
                    <div className="stat-value">{analytics.studentsCount}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Courses</div>
                    <div className="stat-value">{analytics.coursesCount}</div>
                  </div>
                </div>
                <div className="stats-row">
                  <div className="stat-card" style={{ flex: 1 }}>
                    <div className="stat-label">Average performance (%)</div>
                    <div className="stat-value">{analytics.averagePerformance}</div>
                  </div>
                </div>
              </>
            )}
            {!analytics && <p>Loading analytics...</p>}
          </div>
        </div>
        <ChatPanel />
      </div>
    </DashboardShell>
  );
};

