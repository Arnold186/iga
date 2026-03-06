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

interface Quiz {
  id: string;
  title: string;
}

export const TeacherDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [quizTitle, setQuizTitle] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    axios
      .get<Course[]>("/api/courses")
      .then((res) => setCourses(res.data))
      .catch(() => {});
  }, []);

  const createCourse = async () => {
    if (!newCourse.title.trim()) return;
    const res = await axios.post<Course>("/api/courses", newCourse);
    setCourses((prev) => [...prev, res.data]);
    setNewCourse({ title: "", description: "" });
  };

  const loadQuizzes = async (courseId: string) => {
    const res = await axios.get<Quiz[]>(`/api/quizzes/course/${courseId}`);
    setQuizzes(res.data);
  };

  const createQuiz = async () => {
    if (!selectedCourseId || !quizTitle.trim()) return;
    const res = await axios.post<Quiz>("/api/quizzes", {
      title: quizTitle,
      courseId: selectedCourseId
    });
    setQuizzes((prev) => [...prev, res.data]);
    setQuizTitle("");
  };

  return (
    <DashboardShell subtitle="Teacher Dashboard">
      <div className="page-grid">
        <div>
          <div className="card">
            <h2 className="card-title">Create Course</h2>
            <p className="card-subtitle">New courses are pending until approved by admin.</p>
            <div className="form">
              <input
                className="input"
                placeholder="Course title"
                value={newCourse.title}
                onChange={(e) => setNewCourse((c) => ({ ...c, title: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Short description"
                value={newCourse.description}
                onChange={(e) =>
                  setNewCourse((c) => ({ ...c, description: e.target.value }))
                }
              />
              <button className="btn primary" onClick={createCourse}>
                Create course
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">My Courses</h2>
            <div className="list">
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="list-item"
                  onClick={() => {
                    setSelectedCourseId(c.id);
                    loadQuizzes(c.id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    <div>{c.title}</div>
                    <small>{c.description}</small>
                  </div>
                  <span
                    className={
                      c.status === "APPROVED"
                        ? "badge success"
                        : c.status === "PENDING"
                        ? "badge warning"
                        : "badge"
                    }
                  >
                    {c.status}
                  </span>
                </div>
              ))}
              {courses.length === 0 && <p>No courses yet.</p>}
            </div>
          </div>

          {selectedCourseId && (
            <div className="card" style={{ marginTop: "1.2rem" }}>
              <h2 className="card-title">Quizzes for selected course</h2>
              <div className="form">
                <input
                  className="input"
                  placeholder="Quiz title"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                />
                <button className="btn primary" onClick={createQuiz}>
                  Create quiz
                </button>
              </div>
              <div className="list">
                {quizzes.map((q) => (
                  <div key={q.id} className="list-item">
                    <div>{q.title}</div>
                  </div>
                ))}
                {quizzes.length === 0 && <p>No quizzes yet.</p>}
              </div>
            </div>
          )}
        </div>
        <ChatPanel />
      </div>
    </DashboardShell>
  );
};

