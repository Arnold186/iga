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
  questions: { id: string; questionText: string; options: string; correctAnswer: string }[];
}

interface Enrollment {
  student: { id: string; firstName: string; lastName: string; email: string };
}

interface AssignmentSubmission {
  id: string;
  fileUrl: string;
  grade: number | null;
  student: { id: string; firstName: string; lastName: string; email: string };
}

export const TeacherDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: "",
    options: "",
    correctAnswer: ""
  });
  const [assignment, setAssignment] = useState({ title: "", description: "" });
  const [moduleForm, setModuleForm] = useState({ title: "", order: 0 });
  const [lessonForm, setLessonForm] = useState({ title: "", moduleId: "", order: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingLesson, setUploadingLesson] = useState(false);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [gradeInput, setGradeInput] = useState<Record<string, number>>({});
  const [modules, setModules] = useState<{ id: string; title: string; order: number }[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<{ id: string; title: string }[]>([]);

  const loadCourses = () => {
    axios.get<Course[]>("/api/courses").then((res) => setCourses(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const loadQuizzes = async (courseId: string) => {
    const res = await axios.get<Quiz[]>(`/api/quizzes/course/${courseId}`);
    setQuizzes(res.data);
  };

  const loadStudents = async (courseId: string) => {
    const res = await axios.get<Enrollment[]>(`/api/courses/${courseId}/students`);
    setStudents(res.data);
  };

  const loadModules = async (courseId: string) => {
    try {
      const res = await axios.get<{ modules: { id: string; title: string; order: number }[] }>(
        `/api/courses/${courseId}`
      );
      setModules(res.data.modules || []);
    } catch {
      setModules([]);
    }
  };

  const selectCourse = (id: string) => {
    setSelectedCourseId(id);
    loadQuizzes(id);
    loadStudents(id);
    loadModules(id);
    setSelectedQuiz(null);
    setSelectedAssignmentId("");
    axios.get<{ id: string; title: string; courseId: string }[]>("/api/assignments").then((res) => {
      setCourseAssignments(res.data.filter((a: any) => a.courseId === id).map((a) => ({ id: a.id, title: a.title })));
    }).catch(() => setCourseAssignments([]));
  };

  const createCourse = async () => {
    if (!newCourse.title.trim()) return;
    await axios.post<Course>("/api/courses", newCourse);
    setNewCourse({ title: "", description: "" });
    loadCourses();
    toast.success("Course created (PENDING)");
  };

  const updateCourse = async () => {
    if (!editingCourse) return;
    await axios.put(`/api/courses/${editingCourse.id}`, {
      title: editingCourse.title,
      description: editingCourse.description
    });
    setEditingCourse(null);
    loadCourses();
    if (selectedCourseId === editingCourse.id) selectCourse(editingCourse.id);
    toast.success("Course updated");
  };

  const createQuiz = async () => {
    if (!selectedCourseId || !quizTitle.trim()) return;
    const res = await axios.post<Quiz>("/api/quizzes", {
      title: quizTitle,
      courseId: selectedCourseId
    });
    setQuizzes((prev) => [...prev, res.data]);
    setQuizTitle("");
    toast.success("Quiz created");
  };

  const addQuestion = async () => {
    if (!selectedQuiz || !questionForm.questionText.trim()) return;
    const opts = questionForm.options.split("\n").filter((s) => s.trim());
    if (opts.length < 2 || !opts.includes(questionForm.correctAnswer.trim())) {
      toast.error("Add at least 2 options and set correct answer");
      return;
    }
    await axios.post(`/api/quizzes/${selectedQuiz.id}/questions`, {
      questionText: questionForm.questionText,
      options: opts,
      correctAnswer: questionForm.correctAnswer.trim()
    });
    setQuestionForm({ questionText: "", options: "", correctAnswer: "" });
    loadQuizzes(selectedCourseId);
    setSelectedQuiz(null);
    toast.success("Question added");
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

  const createModule = async () => {
    if (!selectedCourseId || !moduleForm.title.trim()) return;
    await axios.post("/api/modules", {
      courseId: selectedCourseId,
      title: moduleForm.title.trim(),
      order: moduleForm.order
    });
    setModuleForm({ title: "", order: 0 });
    loadModules(selectedCourseId);
    toast.success("Module created");
  };

  const createLesson = async (file: File) => {
    if (!lessonForm.moduleId || !lessonForm.title.trim()) return;
    try {
      setUploadingLesson(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("moduleId", lessonForm.moduleId);
      fd.append("title", lessonForm.title.trim());
      fd.append("order", String(lessonForm.order));
      await axios.post("/api/lessons", fd);
      toast.success("Lesson uploaded");
      setLessonForm({ title: "", moduleId: "", order: 0 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploadingLesson(false);
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

  const loadSubmissions = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    const res = await axios.get<AssignmentSubmission[]>(
      `/api/assignments/${assignmentId}/submissions`
    );
    setSubmissions(res.data);
    setGradeInput(
      res.data.reduce((acc, s) => {
        if (s.grade != null) acc[s.id] = s.grade;
        return acc;
      }, {} as Record<string, number>)
    );
  };

  const gradeSubmission = async (submissionId: string) => {
    const g = gradeInput[submissionId];
    if (g == null || g < 0 || g > 100) return;
    try {
      await axios.patch(`/api/submissions/${submissionId}/grade`, { grade: g });
      toast.success("Grade saved");
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, grade: g } : s))
      );
    } catch {
      toast.error("Failed to save grade");
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
                onChange={(e) => setNewCourse((c) => ({ ...c, description: e.target.value }))}
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
                  onClick={() => selectCourse(c.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div>
                    <div>{c.title}</div>
                    <small>{c.description}</small>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
                    <button
                      className="btn outline"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCourse(c);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {courses.length === 0 && <p>No courses yet.</p>}
            </div>
          </div>

          {editingCourse && (
            <div className="card" style={{ marginTop: "1.2rem" }}>
              <h3>Edit Course</h3>
              <div className="form">
                <input
                  className="input"
                  value={editingCourse.title}
                  onChange={(e) =>
                    setEditingCourse((c) => (c ? { ...c, title: e.target.value } : null))
                  }
                />
                <input
                  className="input"
                  value={editingCourse.description}
                  onChange={(e) =>
                    setEditingCourse((c) => (c ? { ...c, description: e.target.value } : null))
                  }
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn primary" onClick={updateCourse}>
                    Save
                  </button>
                  <button className="btn outline" onClick={() => setEditingCourse(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCourseId && (
            <div className="card" style={{ marginTop: "1.2rem" }}>
              <h2 className="card-title">Selected course tools</h2>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Enrolled Students</h3>
              <div className="list">
                {students.map((e) => (
                  <div key={e.student.id} className="list-item">
                    <div>
                      <div>
                        {e.student.firstName} {e.student.lastName}
                      </div>
                      <small>{e.student.email}</small>
                    </div>
                  </div>
                ))}
                {students.length === 0 && <p>No students enrolled yet.</p>}
              </div>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Upload</h3>
              <div className="form">
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
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
                    {uploadingImage ? "Uploading..." : "Course image"}
                  </label>
                  <label className="btn outline">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      style={{ display: "none" }}
                      disabled={uploadingDoc}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadCourseDoc(f);
                        e.target.value = "";
                      }}
                    />
                    {uploadingDoc ? "Uploading..." : "Document"}
                  </label>
                </div>
              </div>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Modules</h3>
              <div className="form">
                <input
                  className="input"
                  placeholder="Module title"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm((p) => ({ ...p, title: e.target.value }))}
                />
                <button className="btn primary" onClick={createModule}>
                  Create module
                </button>
              </div>

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Lessons</h3>
              <div className="form">
                <select
                  className="input"
                  value={lessonForm.moduleId}
                  onChange={(e) => setLessonForm((p) => ({ ...p, moduleId: e.target.value }))}
                >
                  <option value="">Select module</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Lesson title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                />
                <label className="btn outline">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    style={{ display: "none" }}
                    disabled={uploadingLesson}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) createLesson(f);
                      e.target.value = "";
                    }}
                  />
                  {uploadingLesson ? "Uploading..." : "Upload lesson file"}
                </label>
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
                    <button
                      className="btn outline"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                      onClick={() => setSelectedQuiz(q)}
                    >
                      Add question
                    </button>
                  </div>
                ))}
                {quizzes.length === 0 && <p>No quizzes yet.</p>}
              </div>

              {selectedQuiz && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "0.5rem" }}>
                  <h4>Add question to: {selectedQuiz.title}</h4>
                  <div className="form">
                    <input
                      className="input"
                      placeholder="Question text"
                      value={questionForm.questionText}
                      onChange={(e) =>
                        setQuestionForm((p) => ({ ...p, questionText: e.target.value }))
                      }
                    />
                    <textarea
                      className="input"
                      placeholder="Options (one per line)"
                      rows={3}
                      value={questionForm.options}
                      onChange={(e) =>
                        setQuestionForm((p) => ({ ...p, options: e.target.value }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Correct answer (must match an option)"
                      value={questionForm.correctAnswer}
                      onChange={(e) =>
                        setQuestionForm((p) => ({ ...p, correctAnswer: e.target.value }))
                      }
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn primary" onClick={addQuestion}>
                        Add question
                      </button>
                      <button className="btn outline" onClick={() => setSelectedQuiz(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <h3 style={{ margin: "1rem 0 0.5rem" }}>Grade submissions</h3>
              <p className="card-subtitle">
                Select an assignment to view and grade submissions.
              </p>
              {selectedAssignmentId && (
                <div className="list" style={{ marginTop: "0.5rem" }}>
                  {submissions.map((s) => (
                    <div key={s.id} className="list-item">
                      <div>
                        <div>
                          {s.student.firstName} {s.student.lastName}
                        </div>
                        <small>
                          <a href={s.fileUrl} target="_blank" rel="noreferrer">
                            View submission
                          </a>
                        </small>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input"
                          style={{ width: "70px", padding: "0.3rem" }}
                          placeholder="Grade"
                          value={gradeInput[s.id] ?? ""}
                          onChange={(e) =>
                            setGradeInput((p) => ({
                              ...p,
                              [s.id]: parseInt(e.target.value, 10) || 0
                            }))
                          }
                        />
                        <button
                          className="btn primary"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                          onClick={() => gradeSubmission(s.id)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                  {submissions.length === 0 && <p>No submissions yet.</p>}
                </div>
              )}
              <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {courseAssignments.map((a) => (
                  <button
                    key={a.id}
                    className={selectedAssignmentId === a.id ? "btn primary" : "btn outline"}
                    style={{ margin: 0 }}
                    onClick={() => loadSubmissions(a.id)}
                  >
                    {a.title}
                  </button>
                ))}
                {courseAssignments.length === 0 && <p>No assignments in this course.</p>}
              </div>
            </div>
          )}
        </div>
        <ChatPanel />
      </div>
    </DashboardShell>
  );
};
