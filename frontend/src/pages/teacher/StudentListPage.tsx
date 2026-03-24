import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

type TeacherCourseCard = {
  course: { id: string; title: string };
  students: Array<{
    student: { id: string; firstName: string; lastName: string; email: string };
    items: Array<
      | {
          type: "QUIZ";
          id: string;
          title: string;
          weightPercent: number;
          totalMarks: number;
          score: number | null;
          percentScore: number | null;
          isMissing: boolean;
        }
      | {
          type: "ASSIGNMENT";
          id: string;
          title: string;
          weightPercent: number;
          percentScore: number | null;
          isMissing: boolean;
        }
    >;
  }>;
};

export const StudentListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<TeacherCourseCard[]>([]);
  const [q, setQ] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TeacherCourseCard["students"][number] | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<TeacherCourseCard[]>("/api/courses/my/students-progress")
      .then((r) => setCards(r.data))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  const needle = q.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    if (!needle) return cards;
    return cards.map((c) => ({
      ...c,
      students: c.students.filter((s) =>
        `${s.student.firstName} ${s.student.lastName} ${s.student.email}`.toLowerCase().includes(needle)
      )
    }));
  }, [cards, needle]);

  const openStudent = (studentRow: TeacherCourseCard["students"][number]) => {
    setDetail(studentRow);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">Students per course, plus quiz/assignment results.</p>
        </div>

        <div className="flex w-full sm:w-[420px] gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" />
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              api
                .get<TeacherCourseCard[]>("/api/courses/my/students-progress")
                .then((r) => setCards(r.data))
                .catch(() => setCards([]))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Loading…</CardTitle>
            <CardDescription>Fetching your course roster.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((c) => (
            <Card key={c.course.id} className="bg-white/70 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.course.title}</CardTitle>
                <CardDescription>{c.students.length} student(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.students.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No enrolled students yet.</div>
                ) : (
                  c.students.map((s) => {
                    const missingCount = s.items.filter((it) => it.isMissing).length;
                    return (
                      <button
                        key={s.student.id}
                        className="w-full rounded-lg border bg-white px-3 py-2 text-left hover:bg-slate-50"
                        onClick={() => openStudent(s)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {s.student.firstName} {s.student.lastName}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{s.student.email}</div>
                          </div>
                          {missingCount > 0 ? (
                            <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                              {missingCount} missing
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                              OK
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
          {filteredCards.length === 0 && (
            <Card className="bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle>No courses found</CardTitle>
                <CardDescription>Ask your admin to approve at least one course.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={(open) => (open ? setDetailOpen(open) : setDetailOpen(false))}>
        <DialogContent className="max-w-3xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="truncate">
                  {detail.student.firstName} {detail.student.lastName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="text-sm text-muted-foreground">{detail.student.email}</div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Quizzes</div>
                  <div className="space-y-2">
                    {detail.items
                      .filter((it) => it.type === "QUIZ")
                      .map((it) => {
                        if (it.type !== "QUIZ") return null;
                        return (
                          <div key={it.id} className="rounded-lg border bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">{it.title}</div>
                                <div className="text-xs text-muted-foreground">Weight: {it.weightPercent}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Marks</div>
                                <div className="font-semibold">
                                  {it.percentScore != null ? `${it.percentScore}%` : "—"}
                                </div>
                                {it.score != null && it.totalMarks > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    {it.score}/{it.totalMarks}
                                  </div>
                                )}
                              </div>
                            </div>
                            {it.isMissing && (
                              <div className="mt-2">
                                <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                                  Missing
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {detail.items.filter((it) => it.type === "QUIZ").length === 0 && (
                      <div className="text-sm text-muted-foreground">No published quizzes in this course.</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">Assignments</div>
                  <div className="space-y-2">
                    {detail.items
                      .filter((it) => it.type === "ASSIGNMENT")
                      .map((it) => {
                        if (it.type !== "ASSIGNMENT") return null;
                        return (
                          <div key={it.id} className="rounded-lg border bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium">{it.title}</div>
                                <div className="text-xs text-muted-foreground">Weight: {it.weightPercent}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Marks</div>
                                <div className="font-semibold">
                                  {it.percentScore != null ? `${it.percentScore}/100` : "—"}
                                </div>
                              </div>
                            </div>
                            {it.isMissing && (
                              <div className="mt-2">
                                <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                                  Missing
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {detail.items.filter((it) => it.type === "ASSIGNMENT").length === 0 && (
                      <div className="text-sm text-muted-foreground">No approved assignments in this course.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

