import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

type Course = {
  id: string;
  title: string;
  description: string;
  status: string;
};

type QuizQuestionType = "SINGLE" | "MULTI";

type QuizQuestion = {
  id: string;
  questionText: string;
  questionType: QuizQuestionType;
  options: string[];
};

type QuizListItem = {
  id: string;
  title: string;
  published: boolean;
  durationSeconds: number | null;
  availableFrom: string | null;
  availableTo: string | null;
  allowedAttempts: number;
  questionCount: number;
  attemptsLeft: number;
  availabilityStatus: "AVAILABLE" | "NOT_YET" | "EXPIRED";
  timeUntilEndSeconds: number | null;
  questions: QuizQuestion[];
};

type QuizPreviewQuiz = {
  id: string;
  title: string;
  allowedAttempts: number;
  questions: QuizQuestion[];
  durationSeconds: number | null;
  availableFrom: string | null;
  availableTo: string | null;
};

type QuizAttempt = {
  id: string;
  quizId: string;
  attemptNumber: number;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  expiresAt: string | null;
};

type QuizSubmission = {
  id: string;
  quizId: string;
  attemptNumber: number;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string | null;
  timeSpentSeconds: number | null;
  score: number | null;
  percentScore: number | null;
  totalQuestions: number;
  totalMarks?: number;
  quiz: {
    id: string;
    title: string;
    course: { id: string; title: string };
  };
};

function formatSeconds(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export const StudentQuizzesPage: React.FC = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [quizzesByCourse, setQuizzesByCourse] = useState<
    Array<{ course: Course; quizzes: QuizListItem[] }>
  >([]);

  const [mySubmissions, setMySubmissions] = useState<QuizSubmission[]>([]);

  const [progressByCourse, setProgressByCourse] = useState<Record<string, number>>({});

  const [activeQuiz, setActiveQuiz] = useState<QuizPreviewQuiz | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const load = async () => {
    try {
      const [coursesRes, submissionsRes, assignmentGradesRes] = await Promise.all([
        api.get<Course[]>("/api/courses/enrolled"),
        api.get<QuizSubmission[]>("/api/quizzes/my"),
        api.get<any[]>("/api/students/grades").catch(() => ({ data: [] }))
      ]);

      setEnrolledCourses(coursesRes.data);
      setMySubmissions(submissionsRes.data);

      // Load quizzes for each enrolled course.
      const quizzes = await Promise.all(
        coursesRes.data.map(async (c) => {
          try {
            const r = await api.get<QuizListItem[]>(`/api/quizzes/course/${c.id}`);
            return { course: c, quizzes: r.data };
          } catch {
            return { course: c, quizzes: [] as QuizListItem[] };
          }
        })
      );
      setQuizzesByCourse(quizzes);

      // Compute a simple 0-100 course progress percent based on best quiz percent
      // and assignment grade percent (averaged).
      const quizBestPercentByQuizId: Record<string, number> = {};
      for (const s of submissionsRes.data) {
        if (s.percentScore == null) continue;
        quizBestPercentByQuizId[s.quizId] = Math.max(quizBestPercentByQuizId[s.quizId] ?? 0, s.percentScore);
      }
      const quizPercentsByCourse: Record<string, { sum: number; count: number }> = {};
      for (const s of submissionsRes.data) {
        const courseId = s.quiz.course.id;
        const best = quizBestPercentByQuizId[s.quizId];
        if (best == null) continue;
        if (!quizPercentsByCourse[courseId]) quizPercentsByCourse[courseId] = { sum: 0, count: 0 };
        // Count each quiz once (based on quizId).
        if (s.percentScore != null && best === s.percentScore) {
          quizPercentsByCourse[courseId].sum += best;
          quizPercentsByCourse[courseId].count += 1;
        }
      }

      const assignmentPercentsByCourse: Record<string, { sum: number; count: number }> = {};
      for (const g of assignmentGradesRes.data) {
        const courseId = g.assignment?.course?.id;
        const grade = g.grade;
        if (!courseId || grade == null) continue;
        if (!assignmentPercentsByCourse[courseId]) assignmentPercentsByCourse[courseId] = { sum: 0, count: 0 };
        assignmentPercentsByCourse[courseId].sum += grade;
        assignmentPercentsByCourse[courseId].count += 1;
      }

      const computed: Record<string, number> = {};
      for (const c of coursesRes.data) {
        const quizBucket = quizPercentsByCourse[c.id];
        const assignmentBucket = assignmentPercentsByCourse[c.id];
        const quizAvg = quizBucket?.count ? quizBucket.sum / quizBucket.count : null;
        const assignmentAvg = assignmentBucket?.count ? assignmentBucket.sum / assignmentBucket.count : null;

        if (quizAvg == null && assignmentAvg == null) computed[c.id] = 0;
        else if (quizAvg != null && assignmentAvg != null) computed[c.id] = Math.round((quizAvg + assignmentAvg) / 2);
        else computed[c.id] = Math.round((quizAvg ?? assignmentAvg) as number);
      }

      setProgressByCourse(computed);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load quizzes");
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer while taking a quiz.
  useEffect(() => {
    if (!activeAttempt?.expiresAt) {
      setTimeRemainingSeconds(null);
      return;
    }

    const update = () => {
      const expiresAt = new Date(activeAttempt.expiresAt!);
      const secs = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeRemainingSeconds(secs);
    };

    update();
    const t = window.setInterval(update, 500);
    return () => window.clearInterval(t);
  }, [activeAttempt?.expiresAt]);

  const closeAttempt = () => {
    setActiveQuiz(null);
    setActiveAttempt(null);
    setQuestions([]);
    setAnswers({});
    setTimeRemainingSeconds(null);
    setSubmittingQuiz(false);
  };

  const startQuiz = async (quiz: QuizListItem) => {
    try {
      const res = await api.post<{
        attempt: QuizAttempt;
        quiz: QuizPreviewQuiz & { questions: QuizQuestion[] };
        timeRemainingSeconds: number | null;
      }>(`/api/quizzes/${quiz.id}/start`);

      setActiveQuiz({
        id: res.data.quiz.id,
        title: res.data.quiz.title,
        allowedAttempts: res.data.quiz.allowedAttempts,
        questions: res.data.quiz.questions
          ? res.data.quiz.questions
          : [],
        durationSeconds: res.data.quiz.durationSeconds ?? null,
        availableFrom: res.data.quiz.availableFrom ?? null,
        availableTo: res.data.quiz.availableTo ?? null
      });

      setActiveAttempt(res.data.attempt);
      setQuestions(res.data.quiz.questions || []);
      setAnswers({});
      setTimeRemainingSeconds(res.data.timeRemainingSeconds ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to start quiz");
    }
  };

  const submitQuiz = async () => {
    if (!activeAttempt) return;
    if (!questions.length) return;

    const payloadAnswers = questions.map((q) => ({
      questionId: q.id,
      selected: answers[q.id] ?? []
    }));

    const anySelected = payloadAnswers.some((a) => a.selected.length > 0);
    if (!anySelected) {
      toast.error("Select at least one answer");
      return;
    }

    try {
      setSubmittingQuiz(true);
      const r = await api.post(`/api/quizzes/attempts/${activeAttempt.id}/submit`, { answers: payloadAnswers });
      const denominator = r.data.totalMarks ?? r.data.totalQuestions;
      toast.success(`Submitted! Score: ${r.data.score}/${denominator}`);
      closeAttempt();
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Submit failed");
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const availableQuizzesCount = useMemo(() => {
    return quizzesByCourse.reduce((acc, c) => acc + c.quizzes.length, 0);
  }, [quizzesByCourse]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quizzes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a quiz during its availability window (and within your allowed attempts).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses.map((c) => (
          <Card key={c.id} className="bg-white/70 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <CardDescription>Course progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{progressByCourse[c.id] ?? 0}%</div>
            </CardContent>
          </Card>
        ))}
        {enrolledCourses.length === 0 && (
          <div className="text-sm text-muted-foreground">You are not enrolled in any courses.</div>
        )}
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Available Quizzes</CardTitle>
          <CardDescription>
            {availableQuizzesCount ? "Choose a quiz to start." : "Your teachers haven't published quizzes yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quizzesByCourse.map(({ course, quizzes }) => (
            <div key={course.id} className="space-y-3">
              <div className="text-sm font-semibold">{course.title}</div>
              {quizzes.length === 0 ? (
                <div className="text-xs text-muted-foreground">No published quizzes for now.</div>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((q) => {
                    const timerLabel =
                      q.durationSeconds && q.durationSeconds > 0
                        ? `Timer: ${formatSeconds(q.durationSeconds)}`
                        : q.availableTo && q.timeUntilEndSeconds != null
                          ? `Ends in: ${formatSeconds(q.timeUntilEndSeconds)}`
                          : q.availableTo
                            ? "Availability window"
                            : "Open quiz";

                    return (
                      <div
                        key={q.id}
                        className="flex flex-col gap-2 rounded-lg border bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{q.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {q.questionCount} questions • {timerLabel}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Attempts left: {q.attemptsLeft}/{q.allowedAttempts} • Status: {q.availabilityStatus}
                            </div>
                          </div>
                          <Button
                            className="shrink-0"
                            disabled={
                              q.availabilityStatus !== "AVAILABLE" || q.attemptsLeft <= 0
                            }
                            onClick={() => startQuiz(q).catch(() => {})}
                          >
                            Start
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>My Quiz Results</CardTitle>
          <CardDescription>View your attempts and scores.</CardDescription>
        </CardHeader>
        <CardContent>
          {mySubmissions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quiz attempts yet.</div>
          ) : (
            <div className="space-y-2">
              {mySubmissions
                .slice()
                .sort((a, b) => {
                  // latest first
                  const da = new Date(a.startedAt).getTime();
                  const db = new Date(b.startedAt).getTime();
                  return db - da;
                })
                .map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3">
                    <div>
                      <div className="font-medium">{s.quiz.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Attempt {s.attemptNumber} • {s.timeSpentSeconds != null ? `Time: ${formatSeconds(s.timeSpentSeconds)}` : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.submittedAt ? `Submitted: ${new Date(s.submittedAt).toLocaleString()}` : "In progress"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Score</div>
                      <div className="text-lg font-semibold text-blue-700">
                        {s.percentScore != null ? `${s.percentScore}%` : "—"}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeAttempt && activeQuiz && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 99
            }}
            onClick={() => closeAttempt()}
          />
          <div
            className="card"
            style={{
              position: "fixed",
              inset: "2rem",
              zIndex: 100,
              overflow: "auto",
              maxWidth: "720px",
              margin: "auto",
              background: "white"
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{activeQuiz.title}</h2>
                  <div className="text-xs text-muted-foreground">
                    Attempt {activeAttempt.attemptNumber} • {activeAttempt.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Time left</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {timeRemainingSeconds != null ? formatSeconds(timeRemainingSeconds) : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border p-3 bg-slate-50">
                    <div className="text-sm font-semibold mb-2">
                      {idx + 1}. {q.questionText}
                    </div>
                    {q.questionType === "SINGLE" ? (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={(answers[q.id] ?? [])[0] === opt}
                              onChange={() => setAnswers((p) => ({ ...p, [q.id]: [opt] }))}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const current = answers[q.id] ?? [];
                          const checked = current.includes(opt);
                          return (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setAnswers((p) => {
                                    const prev = p[q.id] ?? [];
                                    const next = checked ? prev.filter((x) => x !== opt) : [...prev, opt];
                                    return { ...p, [q.id]: next };
                                  });
                                }}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Button variant="outline" onClick={() => closeAttempt()} disabled={submittingQuiz}>
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    className="primary"
                    onClick={() => submitQuiz().catch(() => {})}
                    disabled={submittingQuiz || (timeRemainingSeconds != null && timeRemainingSeconds <= 0)}
                  >
                    {submittingQuiz ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
