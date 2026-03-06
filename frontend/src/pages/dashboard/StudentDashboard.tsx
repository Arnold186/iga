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

interface Submission {
  id: string;
  score: number;
  quiz: {
    title: string;
    course: {
      title: string;
    };
  };
}

export const StudentDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    axios
      .get<Course[]>("/api/courses")
      .then((res) => setCourses(res.data))
      .catch(() => {});

    axios
      .get<Course[]>("/api/courses/enrolled")
      .then((res) => setEnrolledIds(new Set(res.data.map((c) => c.id))))
      .catch(() => {});

    axios
      .get<Submission[]>("/api/quizzes/my")
      .then((res) => setSubmissions(res.data))
      .catch(() => {});
  }, []);

  const enroll = async (courseId: string) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      setEnrolledIds((prev) => new Set(prev).add(courseId));
    } catch {}
  };

  const myCourses = courses.filter((c) => enrolledIds.has(c.id));
  const availableCourses = courses.filter((c) => !enrolledIds.has(c.id));

  return (
    <DashboardShell subtitle="Student Dashboard">
      <div className="page-grid">
        <div>
          <div className="card">
            <h2 className="card-title">My Courses</h2>
            <p className="card-subtitle">Courses you are enrolled in.</p>
            <div className="list">
              {myCourses.map((c) => (
                <div key={c.id} className="list-item">
                  <div>
                    <div>{c.title}</div>
                    <small>{c.description}</small>
                  </div>
                  <span className="badge success">Enrolled</span>
                </div>
              ))}
              {myCourses.length === 0 && <p>No enrolled courses yet.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Available Courses</h2>
            <p className="card-subtitle">Browse and enroll in approved courses.</p>
            <div className="list">
              {availableCourses.map((c) => (
                <div key={c.id} className="list-item">
                  <div>
                    <div>{c.title}</div>
                    <small>{c.description}</small>
                  </div>
                  <button className="btn outline" onClick={() => enroll(c.id)}>
                    Enroll
                  </button>
                </div>
              ))}
              {availableCourses.length === 0 && <p>No more courses available.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">My Grades</h2>
            <div className="list">
              {submissions.map((s) => (
                <div key={s.id} className="list-item">
                  <div>
                    <div>{s.quiz.title}</div>
                    <small>{s.quiz.course.title}</small>
                  </div>
                  <span className="badge info">Score: {s.score}</span>
                </div>
              ))}
              {submissions.length === 0 && <p>No quiz submissions yet.</p>}
            </div>
          </div>
        </div>
        <ChatPanel />
      </div>
    </DashboardShell>
  );
};

