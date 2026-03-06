import React, { useEffect, useState } from "react";
import axios from "axios";
import { DashboardShell } from "./DashboardShell";
import { ChatPanel } from "../../components/ChatPanel";
import { ProfileCard } from "../../components/ProfileCard";
import { toast } from "react-toastify";

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
  profileImage?: string | null;
}

interface Analytics {
  studentsCount: number;
  coursesCount: number;
  averagePerformance: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  course: { id: string; title: string };
  teacher: { id: string; firstName: string; lastName: string; email: string };
}

export const AdminDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  });

  const load = async () => {
    const [coursesRes, usersRes, analyticsRes, assignmentsRes] = await Promise.all([
      axios.get<Course[]>("/api/courses"),
      axios.get<User[]>("/api/admin/users"),
      axios.get<Analytics>("/api/admin/analytics"),
      axios.get<Assignment[]>("/api/admin/assignments")
    ]);
    setCourses(coursesRes.data);
    setUsers(usersRes.data);
    setAnalytics(analyticsRes.data);
    setAssignments(assignmentsRes.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const updateCourseStatus = async (courseId: string, status: string) => {
    await axios.patch(`/api/courses/${courseId}/status`, { status });
    load().catch(() => {});
  };

  const pendingCourses = courses.filter((c) => c.status === "PENDING");
  const pendingAssignments = assignments.filter((a) => a.status === "PENDING");

  const registerTeacher = async () => {
    try {
      await axios.post("/api/admin/teachers", teacherForm);
      toast.success("Teacher created");
      setTeacherForm({ firstName: "", lastName: "", email: "", password: "" });
      load().catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create teacher");
    }
  };

  const approveAssignment = async (id: string) => {
    await axios.patch(`/api/admin/assignments/${id}/approve`);
    load().catch(() => {});
  };

  const rejectAssignment = async (id: string) => {
    await axios.patch(`/api/admin/assignments/${id}/reject`);
    load().catch(() => {});
  };

  return (
    <DashboardShell subtitle="Admin Dashboard">
      <div className="page-grid">
        <div>
          <ProfileCard />

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
            <h2 className="card-title">Register Teacher</h2>
            <div className="form">
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  className="input"
                  placeholder="First name"
                  value={teacherForm.firstName}
                  onChange={(e) => setTeacherForm((p) => ({ ...p, firstName: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Last name"
                  value={teacherForm.lastName}
                  onChange={(e) => setTeacherForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
              <input
                className="input"
                placeholder="Email"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm((p) => ({ ...p, email: e.target.value }))}
              />
              <input
                className="input"
                type="password"
                placeholder="Temporary password"
                value={teacherForm.password}
                onChange={(e) => setTeacherForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button className="btn primary" onClick={registerTeacher}>
                Create teacher
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Pending Assignments</h2>
            <div className="list">
              {pendingAssignments.map((a) => (
                <div key={a.id} className="list-item">
                  <div>
                    <div>{a.title}</div>
                    <small>
                      {a.course.title} • {a.teacher.firstName} {a.teacher.lastName}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn outline" onClick={() => approveAssignment(a.id)}>
                      Approve
                    </button>
                    <button className="btn outline" onClick={() => rejectAssignment(a.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingAssignments.length === 0 && <p>No pending assignments.</p>}
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

