import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type Course = { id: string; title: string; description: string; status: string };

type Assignment = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
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
  questions: { id: string; questionText: string; options: string; correctAnswer: string }[];
};

export const AssignmentsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "" });

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [gradeDraft, setGradeDraft] = useState<Record<string, number>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [questionForm, setQuestionForm] = useState({ questionText: "", options: "", correctAnswer: "" });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Course[]>("/api/courses").then((r) => setCourses(r.data)).catch(() => setCourses([]));
  }, []);

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

  const createAssignment = async () => {
    if (!selectedCourseId || !assignmentForm.title.trim() || !assignmentForm.description.trim()) return;
    setCreatingAssignment(true);
    try {
      await api.post("/api/assignments", {
        courseId: selectedCourseId,
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim()
      });
      setAssignmentForm({ title: "", description: "" });
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
      await api.post("/api/quizzes", { courseId: selectedCourseId, title: quizTitle.trim() });
      setQuizTitle("");
      await loadQuizzes(selectedCourseId);
    } finally {
      setCreatingQuiz(false);
    }
  };

  const addQuestion = async () => {
    if (!selectedQuizId || !questionForm.questionText.trim()) return;
    const options = questionForm.options
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const correct = questionForm.correctAnswer.trim();
    if (options.length < 2 || !options.includes(correct)) return;
    setSavingQuestion(true);
    try {
      await api.post(`/api/quizzes/${selectedQuizId}/questions`, {
        questionText: questionForm.questionText.trim(),
        options,
        correctAnswer: correct
      });
      setQuestionForm({ questionText: "", options: "", correctAnswer: "" });
      await loadQuizzes(selectedCourseId);
    } finally {
      setSavingQuestion(false);
    }
  };

  const publishQuiz = async (quizId: string) => {
    setPublishingId(quizId);
    try {
      await api.patch(`/api/quizzes/${quizId}/publish`);
      await loadQuizzes(selectedCourseId);
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
                  <Input value={assignmentForm.description} onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))} />
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
                              onClick={() => setSelectedQuizId(q.id)}
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
                                  disabled={q.published || publishingId === q.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    publishQuiz(q.id).catch(() => {});
                                  }}
                                >
                                  {publishingId === q.id ? "Publishing…" : q.published ? "Published" : "Publish"}
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
                      <div className="rounded-xl border bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Add question</div>
                            <div className="text-xs text-muted-foreground">
                              Options: one per line. Correct answer must match exactly.
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedQuizId("")}>
                            Close
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label>Question</Label>
                            <Input value={questionForm.questionText} onChange={(e) => setQuestionForm((p) => ({ ...p, questionText: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Options (one per line)</Label>
                            <textarea
                              className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={questionForm.options}
                              onChange={(e) => setQuestionForm((p) => ({ ...p, options: e.target.value }))}
                              placeholder={"Option A\nOption B\nOption C"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Correct answer</Label>
                            <Input value={questionForm.correctAnswer} onChange={(e) => setQuestionForm((p) => ({ ...p, correctAnswer: e.target.value }))} />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={() => addQuestion().catch(() => {})} disabled={savingQuestion}>
                              {savingQuestion ? "Saving…" : "Add question"}
                            </Button>
                          </div>
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

