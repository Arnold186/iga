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

interface QuizSubmission {
  id: string;
  score: number;
  quiz: { id: string; title: string; course: { title: string }; questions: unknown[] };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  course: { id: string; title: string };
}

interface AssignmentGrade {
  id: string;
  grade: number | null;
  assignmentId: string;
  assignment: { id: string; title: string; course: { title: string } };
}

interface Question {
  id: string;
  questionText: string;
  options: string;
  correctAnswer: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export const StudentDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentGrades, setAssignmentGrades] = useState<AssignmentGrade[]>([]);
  const [submittingAssignment, setSubmittingAssignment] = useState<string | null>(null);
  const [quizModal, setQuizModal] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [ratingInputs, setRatingInputs] = useState<Record<string, { rating: number; review: string }>>({});

  const load = async () => {
    const [coursesRes, enrolledRes, subsRes, assignRes, gradesRes] = await Promise.all([
      axios.get<Course[]>("/api/courses"),
      axios.get<Course[]>("/api/courses/enrolled"),
      axios.get<QuizSubmission[]>("/api/quizzes/my"),
      axios.get<Assignment[]>("/api/assignments"),
      axios.get<AssignmentGrade[]>("/api/students/grades").catch(() => ({ data: [] }))
    ]);
    setCourses(coursesRes.data);
    setEnrolledIds(new Set(enrolledRes.data.map((c) => c.id)));
    setSubmissions(subsRes.data);
    setAssignments(assignRes.data);
    setAssignmentGrades(gradesRes.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const enroll = async (courseId: string) => {
    try {
      await axios.post(`/api/courses/${courseId}/enroll`);
      setEnrolledIds((prev) => new Set(prev).add(courseId));
      toast.success("Enrolled");
    } catch {
      toast.error("Enrollment failed");
    }
  };

  const submitAssignment = async (assignmentId: string, file: File) => {
    try {
      setSubmittingAssignment(assignmentId);
      const fd = new FormData();
      fd.append("file", file);
      await axios.post(`/api/assignments/${assignmentId}/submit`, fd);
      toast.success("Assignment submitted");
      load().catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmittingAssignment(null);
    }
  };

  const loadQuiz = async (quizId: string) => {
    const res = await axios.get<Quiz>(`/api/quizzes/${quizId}`);
    setQuizModal(res.data);
    setQuizAnswers({});
  };

  const submitQuiz = async () => {
    if (!quizModal) return;
    const answers = Object.entries(quizAnswers)
      .filter(([, v]) => v)
      .map(([questionId, answer]) => ({ questionId, answer }));
    if (answers.length === 0) {
      toast.error("Answer at least one question");
      return;
    }
    try {
      setSubmittingQuiz(true);
      await axios.post(`/api/quizzes/${quizModal.id}/submit`, { answers });
      toast.success("Quiz submitted");
      setQuizModal(null);
      load().catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const rateCourse = async (courseId: string) => {
    const inp = ratingInputs[courseId];
    if (!inp || inp.rating < 1 || inp.rating > 5) return;
    try {
      await axios.post(`/api/courses/${courseId}/rate`, {
        rating: inp.rating,
        review: inp.review || undefined
      });
      toast.success("Rating saved");
      setRatingInputs((p) => ({ ...p, [courseId]: { rating: 0, review: "" } }));
    } catch {
      toast.error("Rating failed");
    }
  };

  const myCourses = courses.filter((c) => enrolledIds.has(c.id));
  const availableCourses = courses.filter((c) => !enrolledIds.has(c.id));
  const approvedAssignments = assignments.filter((a) => a.status === "APPROVED");

  return (
    <DashboardShell subtitle="Student Dashboard">
      <div className="page-grid">
        <div>
          <ProfileCard />

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
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="badge success">Enrolled</span>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          className="btn outline"
                          style={{
                            padding: "0.2rem 0.4rem",
                            fontSize: "0.8rem"
                          }}
                          onClick={() => {
                            const prev = ratingInputs[c.id] || { rating: 0, review: "" };
                            setRatingInputs((p) => ({
                              ...p,
                              [c.id]: { ...prev, rating: r }
                            }));
                          }}
                        >
                          {r}★
                        </button>
                      ))}
                    </div>
                    {(ratingInputs[c.id]?.rating || 0) > 0 && (
                      <>
                        <input
                          className="input"
                          placeholder="Review (optional)"
                          style={{ width: "120px", padding: "0.3rem 0.5rem" }}
                          value={ratingInputs[c.id]?.review || ""}
                          onChange={(e) =>
                            setRatingInputs((p) => ({
                              ...p,
                              [c.id]: {
                                ...(p[c.id] || { rating: 0, review: "" }),
                                review: e.target.value
                              }
                            }))
                          }
                        />
                        <button
                          className="btn primary"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                          onClick={() => rateCourse(c.id)}
                        >
                          Rate
                        </button>
                      </>
                    )}
                  </div>
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
            <h2 className="card-title">Assignments</h2>
            <p className="card-subtitle">Submit approved assignments.</p>
            <div className="list">
              {approvedAssignments.map((a) => {
                const grade = assignmentGrades.find(
                  (g) => g.assignmentId === a.id || g.assignment?.id === a.id
                );
                return (
                  <div key={a.id} className="list-item">
                    <div>
                      <div>{a.title}</div>
                      <small>
                        {a.course.title} • {a.description}
                      </small>
                      {grade?.grade != null && (
                        <small style={{ display: "block", marginTop: "0.25rem" }}>
                          Grade: {grade.grade}%
                        </small>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <label className="btn outline" style={{ margin: 0 }}>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) submitAssignment(a.id, f);
                            e.target.value = "";
                          }}
                          disabled={!!submittingAssignment}
                        />
                        {submittingAssignment === a.id ? "Uploading..." : "Submit"}
                      </label>
                    </div>
                  </div>
                );
              })}
              {approvedAssignments.length === 0 && <p>No assignments yet.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Assignment Grades</h2>
            <div className="list">
              {assignmentGrades.map((g) => (
                <div key={g.id} className="list-item">
                  <div>
                    <div>{g.assignment?.title}</div>
                    <small>{g.assignment?.course?.title}</small>
                  </div>
                  {g.grade != null ? (
                    <span className="badge info">{g.grade}%</span>
                  ) : (
                    <span className="badge warning">Pending</span>
                  )}
                </div>
              ))}
              {assignmentGrades.length === 0 && <p>No assignment grades yet.</p>}
            </div>
          </div>

          <div className="card" style={{ marginTop: "1.2rem" }}>
            <h2 className="card-title">Quiz Results</h2>
            <div className="list">
              {submissions.map((s) => (
                <div key={s.id} className="list-item">
                  <div>
                    <div>{s.quiz?.title}</div>
                    <small>{s.quiz?.course?.title}</small>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="badge info">Score: {s.score}</span>
                    <button
                      className="btn outline"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                      onClick={() => loadQuiz(s.quiz?.id || "")}
                    >
                      Retake
                    </button>
                  </div>
                </div>
              ))}
              {submissions.length === 0 && <p>No quiz submissions yet.</p>}
            </div>
          </div>
        </div>
        <ChatPanel />
      </div>

      {quizModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 99
            }}
            onClick={() => setQuizModal(null)}
          />
          <div
            className="card"
          style={{
            position: "fixed",
            inset: "2rem",
            zIndex: 100,
            overflow: "auto",
            maxWidth: "600px",
            margin: "auto"
          }}
        >
          <h2>Quiz: {quizModal.title}</h2>
          {quizModal.questions?.map((q) => {
            const opts = (() => {
              try {
                return JSON.parse(q.options) as string[];
              } catch {
                return [];
              }
            })();
            return (
              <div key={q.id} style={{ marginBottom: "1rem" }}>
                <div className="label">{q.questionText}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {opts.map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={quizAnswers[q.id] === opt}
                        onChange={() =>
                          setQuizAnswers((p) => ({ ...p, [q.id]: opt }))
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn primary" onClick={submitQuiz} disabled={submittingQuiz}>
              {submittingQuiz ? "Submitting..." : "Submit"}
            </button>
            <button className="btn outline" onClick={() => setQuizModal(null)}>
              Cancel
            </button>
          </div>
        </div>
        </>
      )}
    </DashboardShell>
  );
};
