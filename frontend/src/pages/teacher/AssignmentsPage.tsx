import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { toast } from "react-toastify";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type Course = { id: string; title: string; description: string; status: string };

type Assignment = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  availableTo: string | null;
  weightPercent: number;
  courseId: string;
  course: { id: string; title: string };
};

type AssignmentSubmission = {
  id: string;
  fileUrl: string;
  grade: number | null;
  student: { id: string; firstName: string; lastName: string; email: string };
};

type Quiz = {
  id: string;
  title: string;
  published: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  durationSeconds: number | null;
  allowedAttempts: number;
  weightPercent?: number;
  totalMarks?: number;
  questions: {
    id: string;
    questionText: string;
    questionType: "SINGLE" | "MULTI";
    marks?: number;
    options: string[];
    correctAnswers: string[];
  }[];
};

type QuizSubmissionRow = {
  id: string;
  attemptNumber: number;
  status: "IN_PROGRESS" | "COMPLETED";
  score: number | null;
  percentScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number | null;
  student: { id: string; firstName: string; lastName: string; email: string };
};

export const AssignmentsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    availableTo: "",
    weightPercent: "1"
  });

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [gradeDraft, setGradeDraft] = useState<Record<string, number>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [questionForm, setQuestionForm] = useState<{
    questionText: string;
    options: string[];
    questionType: "SINGLE" | "MULTI";
    correctAnswers: string[];
    marks: string;
  }>({ questionText: "", options: ["", "", "", ""], questionType: "SINGLE", correctAnswers: [], marks: "1" });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [quizSettings, setQuizSettings] = useState<{
    availableFrom: string;
    availableTo: string;
    durationSeconds: string;
    allowedAttempts: string;
    weightPercent: string;
  }>({
    availableFrom: "",
    availableTo: "",
    durationSeconds: "",
    allowedAttempts: "1",
    weightPercent: "1"
  });

  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmissionRow[]>([]);
  const [loadingQuizSubmissions, setLoadingQuizSubmissions] = useState(false);

  const toDatetimeLocalValue = (isoOrNull: string | null) => {
    if (!isoOrNull) return "";
    const d = new Date(isoOrNull);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  };

  useEffect(() => {
    api.get<Course[]>("/api/courses").then((r) => setCourses(r.data)).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuizSubmissions([]);
      return;
    }

    setLoadingQuizSubmissions(true);
    api
      .get<QuizSubmissionRow[]>(`/api/quizzes/${selectedQuizId}/submissions`)
      .then((r) => setQuizSubmissions(r.data))
      .catch(() => setQuizSubmissions([]))
      .finally(() => setLoadingQuizSubmissions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuizId]);

  const loadAssignments = async () => {
    const res = await api.get<Assignment[]>("/api/assignments");
    setAssignments(res.data);
  };

  const loadQuizzes = async (courseId: string) => {
    const res = await api.get<Quiz[]>(`/api/quizzes/course/${courseId}`);
    setQuizzes(res.data);
  };

  useEffect(() => {
    loadAssignments().catch(() => setAssignments([]));
  }, []);

  const courseAssignments = useMemo(() => {
    const list = assignments;
    if (!selectedCourseId) return list;
    return list.filter((a) => a.courseId === selectedCourseId);
  }, [assignments, selectedCourseId]);

  const selectedQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedQuizId) ?? null;
  }, [quizzes, selectedQuizId]);

  const selectedQuizTotalMarks = useMemo(() => {
    if (!selectedQuiz) return 0;
    return selectedQuiz.questions.reduce((sum, q) => sum + (q.marks ?? 1), 0);
  }, [selectedQuiz]);

  const resetQuestionForm = () => {
    setQuestionForm({
      questionText: "",
      options: ["", "", "", ""],
      questionType: "SINGLE",
      correctAnswers: [],
      marks: "1"
    });
  };

  const createAssignment = async () => {
    if (!selectedCourseId || !assignmentForm.title.trim() || !assignmentForm.description.trim()) return;
    setCreatingAssignment(true);
    try {
      await api.post("/api/assignments", {
        courseId: selectedCourseId,
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        availableTo: assignmentForm.availableTo || null,
        weightPercent: assignmentForm.weightPercent === "" ? null : Number(assignmentForm.weightPercent)
      });
      setAssignmentForm({ title: "", description: "", availableTo: "", weightPercent: "1" });
      await loadAssignments();
    } finally {
      setCreatingAssignment(false);
    }
  };

  const loadSubmissions = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    const res = await api.get<AssignmentSubmission[]>(`/api/assignments/${assignmentId}/submissions`);
    setSubmissions(res.data);
    setGradeDraft(
      res.data.reduce((acc, s) => {
        if (s.grade != null) acc[s.id] = s.grade;
        return acc;
      }, {} as Record<string, number>)
    );
  };

  const gradeSubmission = async (submissionId: string) => {
    const grade = gradeDraft[submissionId];
    if (grade == null || Number.isNaN(grade) || grade < 0 || grade > 100) return;
    setGradingId(submissionId);
    try {
      await api.patch(`/api/submissions/${submissionId}/grade`, { grade });
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, grade } : s)));
    } finally {
      setGradingId(null);
    }
  };

  const createQuiz = async () => {
    if (!selectedCourseId || !quizTitle.trim()) return;
    setCreatingQuiz(true);
    try {
      const res = await api.post("/api/quizzes", { courseId: selectedCourseId, title: quizTitle.trim() });
      const createdQuiz = res.data as any;
      setQuizTitle("");
      setSelectedQuizId(createdQuiz?.id ?? "");
      setQuizSettings({
        availableFrom: toDatetimeLocalValue(createdQuiz?.availableFrom ?? null),
        availableTo: toDatetimeLocalValue(createdQuiz?.availableTo ?? null),
        durationSeconds: createdQuiz?.durationSeconds != null ? String(createdQuiz.durationSeconds) : "",
        allowedAttempts: String(createdQuiz?.allowedAttempts ?? 1),
        weightPercent: String(createdQuiz?.weightPercent ?? 1)
      });
      resetQuestionForm();
      setEditingQuestionId(null);
      await loadQuizzes(selectedCourseId);
      toast.success("Quiz created");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create quiz");
    } finally {
      setCreatingQuiz(false);
    }
  };

  const addQuestion = async () => {
    if (!selectedQuizId || !questionForm.questionText.trim()) return;
    const options = questionForm.options.map((s) => s.trim()).filter(Boolean);
    const correctAnswers = questionForm.correctAnswers.filter((s) => s.trim()).map((s) => s.trim());
    const marks = Number(questionForm.marks);

    if (options.length < 2) {
      toast.error("Add at least 2 options");
      return;
    }
    if (questionForm.questionType === "SINGLE" && correctAnswers.length !== 1) {
      toast.error("Single choice question needs exactly 1 correct answer");
      return;
    }
    if (questionForm.questionType === "MULTI" && correctAnswers.length < 1) {
      toast.error("Choose at least 1 correct answer");
      return;
    }
    if (!correctAnswers.every((a) => options.includes(a))) {
      toast.error("Correct answers must match the option text");
      return;
    }
    if (!Number.isFinite(marks) || marks <= 0) {
      toast.error("Marks must be greater than 0");
      return;
    }

    setSavingQuestion(true);
    try {
      if (editingQuestionId) {
        await api.patch(`/api/quizzes/${selectedQuizId}/questions/${editingQuestionId}`, {
          questionText: questionForm.questionText.trim(),
          options,
          questionType: questionForm.questionType,
          correctAnswers,
          marks
        });
      } else {
        await api.post(`/api/quizzes/${selectedQuizId}/questions`, {
          questionText: questionForm.questionText.trim(),
          options,
          questionType: questionForm.questionType,
          correctAnswers,
          marks
        });
      }

      resetQuestionForm();
      setEditingQuestionId(null);
      await loadQuizzes(selectedCourseId);
      toast.success(editingQuestionId ? "Question updated" : "Question added");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const publishQuiz = async (quizId: string, settingsOverride?: typeof quizSettings) => {
    setPublishingId(quizId);
    try {
      const settings = settingsOverride ?? quizSettings;
      await api.patch(`/api/quizzes/${quizId}`, {
        published: true,
        availableFrom: settings.availableFrom || null,
        availableTo: settings.availableTo || null,
        durationSeconds: settings.durationSeconds === "" ? null : Number(settings.durationSeconds),
        allowedAttempts: settings.allowedAttempts === "" ? null : Number(settings.allowedAttempts),
        weightPercent: settings.weightPercent === "" ? null : Number(settings.weightPercent)
      });
      await loadQuizzes(selectedCourseId);
      toast.success("Quiz published");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to publish quiz");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments & Quizzes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create coursework, review submissions, and publish quizzes for your enrolled students.
          </p>
        </div>

        <div className="w-full sm:w-[420px]">
          <Label>Course</Label>
          <select
            className="mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedCourseId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedCourseId(id);
              setSelectedAssignmentId("");
              setSubmissions([]);
              setSelectedQuizId("");
              if (id) loadQuizzes(id).catch(() => setQuizzes([]));
            }}
          >
            <option value="">All my courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-white/70 backdrop-blur lg:col-span-1">
              <CardHeader>
                <CardTitle>Create assignment</CardTitle>
                <CardDescription>Assignments start as PENDING until approved by admin.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={assignmentForm.title} onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    className="min-h-[120px]"
                    value={assignmentForm.description}
                    onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due date (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={assignmentForm.availableTo}
                    onChange={(e) => setAssignmentForm((p) => ({ ...p, availableTo: e.target.value }))}
                  />
                  <div className="text-[11px] text-muted-foreground">After this time, missing submissions count as 0.</div>
                </div>
                <div className="space-y-2">
                  <Label>Weight in final grade (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={assignmentForm.weightPercent}
                    onChange={(e) => setAssignmentForm((p) => ({ ...p, weightPercent: e.target.value }))}
                  />
                </div>
                <Button className="w-full" onClick={createAssignment} disabled={!selectedCourseId || creatingAssignment}>
                  {creatingAssignment ? "Creating…" : "Create"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle>Your assignments</CardTitle>
                <CardDescription>Click an assignment to view submissions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-3 pr-3">Assignment</th>
                        <th className="py-3 pr-3">Course</th>
                        <th className="py-3 pr-3">Status</th>
                        <th className="py-3 text-right">Submissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseAssignments.map((a) => (
                        <tr
                          key={a.id}
                          className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50"
                          onClick={() => loadSubmissions(a.id).catch(() => setSubmissions([]))}
                        >
                          <td className="py-3 pr-3">
                            <div className="font-medium">{a.title}</div>
                            <div className="line-clamp-1 text-xs text-muted-foreground">{a.description}</div>
                          </td>
                          <td className="py-3 pr-3">{a.course?.title}</td>
                          <td className="py-3 pr-3">
                            <span
                              className={
                                a.status === "APPROVED"
                                  ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                                  : a.status === "PENDING"
                                  ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                                  : "rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                              }
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-xs text-muted-foreground">
                            {selectedAssignmentId === a.id ? "Viewing…" : "View"}
                          </td>
                        </tr>
                      ))}
                      {courseAssignments.length === 0 && (
                        <tr>
                          <td className="py-6 text-sm text-muted-foreground" colSpan={4}>
                            No assignments yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedAssignmentId && (
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Submissions</div>
                        <div className="text-xs text-muted-foreground">Grade submissions (0–100).</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-3 pr-3">Student</th>
                            <th className="py-3 pr-3">File</th>
                            <th className="py-3 pr-3">Grade</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id} className="border-b last:border-b-0">
                              <td className="py-3 pr-3">
                                <div className="font-medium">
                                  {s.student.firstName} {s.student.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">{s.student.email}</div>
                              </td>
                              <td className="py-3 pr-3">
                                <a className="text-primary hover:underline" href={s.fileUrl} target="_blank" rel="noreferrer">
                                  View submission
                                </a>
                              </td>
                              <td className="py-3 pr-3">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="h-9 w-[110px]"
                                  value={gradeDraft[s.id] ?? s.grade ?? ""}
                                  onChange={(e) =>
                                    setGradeDraft((p) => ({ ...p, [s.id]: Number(e.target.value) }))
                                  }
                                />
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => gradeSubmission(s.id).catch(() => {})}
                                  disabled={gradingId === s.id}
                                >
                                  {gradingId === s.id ? "Saving…" : "Save"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {submissions.length === 0 && (
                            <tr>
                              <td className="py-6 text-sm text-muted-foreground" colSpan={4}>
                                No submissions yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-white/70 backdrop-blur lg:col-span-1">
              <CardHeader>
                <CardTitle>Create quiz</CardTitle>
                <CardDescription>Create a quiz for the selected course.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Quiz title" />
                </div>
                <Button className="w-full" onClick={createQuiz} disabled={!selectedCourseId || creatingQuiz}>
                  {creatingQuiz ? "Creating…" : "Create"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur lg:col-span-2">
              <CardHeader>
                <CardTitle>Quizzes</CardTitle>
                <CardDescription>Select a quiz to add questions. Publish when ready.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCourseId ? (
                  <div className="text-sm text-muted-foreground">Select a course to view quizzes.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-3 pr-3">Quiz</th>
                            <th className="py-3 pr-3">Questions</th>
                            <th className="py-3 pr-3">Status</th>
                            <th className="py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizzes.map((q) => (
                            <tr
                              key={q.id}
                              className="cursor-pointer border-b last:border-b-0 hover:bg-slate-50"
                              onClick={() => {
                                setSelectedQuizId(q.id);
                                setQuizSettings({
                                  availableFrom: toDatetimeLocalValue(q.availableFrom),
                                  availableTo: toDatetimeLocalValue(q.availableTo),
                                  durationSeconds: q.durationSeconds != null ? String(q.durationSeconds) : "",
                                  allowedAttempts: String(q.allowedAttempts ?? 1),
                                  weightPercent: String(q.weightPercent ?? 1)
                                });
                                resetQuestionForm();
                                setEditingQuestionId(null);
                              }}
                            >
                              <td className="py-3 pr-3 font-medium">{q.title}</td>
                              <td className="py-3 pr-3">{q.questions?.length ?? 0}</td>
                              <td className="py-3 pr-3">
                                <span
                                  className={
                                    q.published
                                      ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                                      : "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                                  }
                                >
                                  {q.published ? "Published" : "Draft"}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={publishingId === q.id || q.published}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedQuizId(q.id);
                                    setQuizSettings({
                                      availableFrom: toDatetimeLocalValue(q.availableFrom),
                                      availableTo: toDatetimeLocalValue(q.availableTo),
                                      durationSeconds: q.durationSeconds != null ? String(q.durationSeconds) : "",
                                      allowedAttempts: String(q.allowedAttempts ?? 1),
                                      weightPercent: String(q.weightPercent ?? 1)
                                    });
                                    setEditingQuestionId(null);
                                    resetQuestionForm();
                                  }}
                                >
                                  {q.published ? "Published" : publishingId === q.id ? "Working…" : "Configure"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {quizzes.length === 0 && (
                            <tr>
                              <td className="py-6 text-sm text-muted-foreground" colSpan={4}>
                                No quizzes yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {selectedQuizId && (
                      <div className="rounded-xl border bg-white p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Quiz settings & questions</div>
                            <div className="text-xs text-muted-foreground">
                              Configure start/close time, timer in minutes, attempts, and questions.
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedQuizId("")}>
                            Close
                          </Button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Available from</Label>
                            <Input
                              type="datetime-local"
                              value={quizSettings.availableFrom}
                              onChange={(e) => setQuizSettings((p) => ({ ...p, availableFrom: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Available to</Label>
                            <Input
                              type="datetime-local"
                              value={quizSettings.availableTo}
                              onChange={(e) => setQuizSettings((p) => ({ ...p, availableTo: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration minutes (optional)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={
                                quizSettings.durationSeconds
                                  ? String(Math.floor(Number(quizSettings.durationSeconds) / 60))
                                  : ""
                              }
                              onChange={(e) =>
                                setQuizSettings((p) => ({
                                  ...p,
                                  durationSeconds: e.target.value ? String(Number(e.target.value) * 60) : ""
                                }))
                              }
                            />
                            <div className="text-[11px] text-muted-foreground">Countdown starts when student begins quiz.</div>
                          </div>
                          <div className="space-y-2">
                            <Label>Allowed attempts</Label>
                            <Input
                              type="number"
                              min={1}
                              value={quizSettings.allowedAttempts}
                              onChange={(e) => setQuizSettings((p) => ({ ...p, allowedAttempts: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2 lg:col-span-2">
                            <Label>Weight in final grade (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={quizSettings.weightPercent}
                              onChange={(e) => setQuizSettings((p) => ({ ...p, weightPercent: e.target.value }))}
                            />
                            <div className="text-[11px] text-muted-foreground">
                              This controls how much this quiz contributes to the final course grade.
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => publishQuiz(selectedQuizId)}
                            disabled={publishingId === selectedQuizId || !!selectedQuiz?.published}
                          >
                            {publishingId === selectedQuizId
                              ? "Publishing…"
                              : selectedQuiz?.published
                                ? "Published"
                                : "Publish"}
                          </Button>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Questions</div>
                              <div className="text-xs text-muted-foreground">
                                Edit for grading scheme or delete questions.
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-blue-700">Total marks: {selectedQuizTotalMarks}</div>
                          </div>

                          {selectedQuiz?.questions?.length ? (
                            <div className="space-y-2">
                              {selectedQuiz.questions.map((q) => (
                                <div key={q.id} className="rounded-md border bg-white p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="font-medium">{q.questionText}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Type: {q.questionType} • Marks: {q.marks ?? 1}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Correct: {q.correctAnswers.join(", ")}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingQuestionId(q.id);
                                          setQuestionForm({
                                            questionText: q.questionText,
                                            options: q.options,
                                            questionType: q.questionType,
                                            correctAnswers: q.correctAnswers,
                                            marks: String(q.marks ?? 1)
                                          });
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-red-200 text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          if (!window.confirm("Delete this question?")) return;
                                          api
                                            .delete(`/api/quizzes/${selectedQuizId}/questions/${q.id}`)
                                            .then(() => {
                                              setEditingQuestionId((prev) => (prev === q.id ? null : prev));
                                              resetQuestionForm();
                                              loadQuizzes(selectedCourseId).catch(() => {});
                                            })
                                            .catch((err: any) => {
                                              toast.error(err?.response?.data?.message || "Failed to delete question");
                                            });
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No questions yet.</div>
                          )}
                        </div>

                        <div className="rounded-lg border bg-white p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{editingQuestionId ? "Edit question" : "Add question"}</div>
                              <div className="text-xs text-muted-foreground">
                                Add option text then tick correct answer(s) on the right.
                              </div>
                            </div>
                            {editingQuestionId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingQuestionId(null);
                                  resetQuestionForm();
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-3 lg:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Question</Label>
                              <Textarea
                                className="min-h-[110px]"
                                value={questionForm.questionText}
                                onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Question type</Label>
                              <select
                                className="mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={questionForm.questionType}
                                onChange={(e) => setQuestionForm((p) => ({ ...p, questionType: e.target.value as any }))}
                              >
                                <option value="SINGLE">Single choice</option>
                                <option value="MULTI">Multi choice (checkbox)</option>
                              </select>
                            </div>

                            <div className="space-y-2 lg:col-span-2">
                              <div className="flex items-center justify-between">
                                <Label>Options</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setQuestionForm((p) => ({ ...p, options: [...p.options, ""] }))
                                  }
                                >
                                  Add option
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {questionForm.options.map((option, idx) => {
                                  const isChecked = questionForm.correctAnswers.includes(option.trim());
                                  return (
                                    <div key={`option-${idx}`} className="flex items-center gap-2">
                                      <Input
                                        value={option}
                                        placeholder={`Option ${idx + 1}`}
                                        onChange={(e) =>
                                          setQuestionForm((p) => {
                                            const next = [...p.options];
                                            const prevText = next[idx]?.trim() ?? "";
                                            next[idx] = e.target.value;
                                            const newText = e.target.value.trim();
                                            let nextCorrect = p.correctAnswers;
                                            if (prevText && prevText !== newText && nextCorrect.includes(prevText)) {
                                              nextCorrect = nextCorrect.map((c) => (c === prevText ? newText : c)).filter(Boolean);
                                            }
                                            return { ...p, options: next, correctAnswers: nextCorrect };
                                          })
                                        }
                                      />
                                      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                                        <input
                                          type={questionForm.questionType === "SINGLE" ? "radio" : "checkbox"}
                                          name="correct-answer"
                                          checked={isChecked}
                                          onChange={() => {
                                            const trimmed = option.trim();
                                            if (!trimmed) return;
                                            setQuestionForm((p) => {
                                              if (p.questionType === "SINGLE") {
                                                return { ...p, correctAnswers: [trimmed] };
                                              }
                                              const exists = p.correctAnswers.includes(trimmed);
                                              return {
                                                ...p,
                                                correctAnswers: exists
                                                  ? p.correctAnswers.filter((c) => c !== trimmed)
                                                  : [...p.correctAnswers, trimmed]
                                              };
                                            });
                                          }}
                                        />
                                        Correct
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setQuestionForm((p) => {
                                            if (p.options.length <= 2) return p;
                                            const removed = p.options[idx]?.trim() ?? "";
                                            const nextOptions = p.options.filter((_, i) => i !== idx);
                                            return {
                                              ...p,
                                              options: nextOptions,
                                              correctAnswers: p.correctAnswers.filter((c) => c !== removed)
                                            };
                                          })
                                        }
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Marks for this question</Label>
                              <Input
                                type="number"
                                min={1}
                                value={questionForm.marks}
                                onChange={(e) => setQuestionForm((p) => ({ ...p, marks: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button onClick={() => addQuestion()} disabled={savingQuestion}>
                              {savingQuestion ? "Saving…" : editingQuestionId ? "Save changes" : "Add question"}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-slate-50 p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Quiz results</div>
                              <div className="text-xs text-muted-foreground">
                                Marks + attempts + timing (auto-graded).
                              </div>
                            </div>
                          </div>

                          {loadingQuizSubmissions ? (
                            <div className="text-sm text-muted-foreground">Loading results…</div>
                          ) : quizSubmissions.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No submissions yet.</div>
                          ) : (
                            <div className="space-y-2">
                              {quizSubmissions.map((s) => (
                                <div key={s.id} className="rounded-md border bg-white p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-medium">
                                        {s.student.firstName} {s.student.lastName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Attempt {s.attemptNumber} • {s.status}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {s.submittedAt ? `Submitted: ${new Date(s.submittedAt).toLocaleString()}` : "In progress"}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {s.timeSpentSeconds != null ? `Time: ${s.timeSpentSeconds}s` : "—"}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Score</div>
                                      <div className="text-lg font-semibold text-blue-700">
                                        {s.percentScore != null ? `${s.percentScore}%` : "—"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

