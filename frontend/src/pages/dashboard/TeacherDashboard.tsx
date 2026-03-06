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
  image?: string | null;
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
  const [assignment, setAssignment] = useState({ title: "", description: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  const uploadCourseImage = async (file: File) => {
    if (!selectedCourseId) return;
    try {
      setUploadingImage(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post<{ image: string; course: Course }>(
        `/api/courses/${selectedCourseId}/image`,
        fd
      );
      toast.success("Course image uploaded");
      setCourses((prev) => prev.map((c) => (c.id === selectedCourseId ? res.data.course : c)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadCourseDoc = async (file: File, title?: string) => {
    if (!selectedCourseId) return;
    try {
      setUploadingDoc(true);
      const fd = new FormData();
      fd.append("file", file);
      if (title?.trim()) fd.append("title", title.trim());
      await axios.post(`/api/courses/${selectedCourseId}/documents`, fd);
      toast.success("Document uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Document upload failed");
    } finally {
      setUploadingDoc(false);
    }
  };

  const createAssignment = async () => {
    if (!selectedCourseId || !assignment.title.trim() || !assignment.description.trim()) return;
    try {
      await axios.post("/api/assignments", {
        title: assignment.title,
        description: assignment.description,
        courseId: selectedCourseId
      });
      toast.success("Assignment created (PENDING)");
      setAssignment({ title: "", description: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create assignment");
    }
  };

  return (
    <DashboardShell subtitle="Teacher Dashboard">
      <div className="page-grid">
        <div>
          <ProfileCard />

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
              <h2 className="card-title">Selected course tools</h2>

              <div className="form">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label className="btn outline">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCourseImage(f);
                        e.target.value = "";
                      }}
                    />
                    {uploadingImage ? "Uploading image..." : "Upload course image"}
                  </label>

                  <label className="btn outline">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      style={{ display: "none" }}
                      disabled={uploadingDoc}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCourseDoc(f);
                        e.target.value = "";
                      }}
                    />
                    {uploadingDoc ? "Uploading doc..." : "Upload document"}
                  </label>
                </div>
              </div>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Create assignment</h3>
              <div className="form">
                <input
                  className="input"
                  placeholder="Assignment title"
                  value={assignment.title}
                  onChange={(e) => setAssignment((p) => ({ ...p, title: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Assignment description"
                  value={assignment.description}
                  onChange={(e) =>
                    setAssignment((p) => ({ ...p, description: e.target.value }))
                  }
                />
                <button className="btn primary" onClick={createAssignment}>
                  Create assignment
                </button>
              </div>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Quizzes</h3>
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

