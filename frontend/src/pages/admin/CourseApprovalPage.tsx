import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";

type PendingCourse = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  image?: string | null;
  rejectionReason?: string | null;
  teacher?: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt?: string;
};

export const CourseApprovalPage: React.FC = () => {
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingCourse | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get<PendingCourse[]>("/api/admin/courses/pending")
      .then((r) => setCourses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((c) =>
      `${c.title} ${c.description} ${c.teacher?.firstName ?? ""} ${c.teacher?.lastName ?? ""}`.toLowerCase().includes(needle)
    );
  }, [q, courses]);

  const setStatus = async (
    courseId: string,
    status: "APPROVED" | "REJECTED",
    rejectionReason?: string
  ) => {
    setSavingId(courseId);
    try {
      await api.patch(`/api/courses/${courseId}/status`, {
        status,
        ...(status === "REJECTED" ? { rejectionReason } : {})
      });
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pending Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Approve or reject teacher-submitted courses.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pending courses…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id} className="bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate">{c.title}</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  PENDING
                </span>
              </CardTitle>
              <CardDescription className="line-clamp-2">{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Teacher:{" "}
                <span className="text-foreground">
                  {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejecting(c);
                    setRejectReason("");
                  }}
                  disabled={savingId === c.id}
                >
                  {savingId === c.id ? "Saving…" : "Reject"}
                </Button>
                <Button onClick={() => setStatus(c.id, "APPROVED")} disabled={savingId === c.id}>
                  {savingId === c.id ? "Saving…" : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>No pending courses</CardTitle>
            <CardDescription>You're all caught up.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Dialog open={!!rejecting} onOpenChange={(open) => (!open ? setRejecting(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject course</DialogTitle>
            <DialogDescription>
              Provide a short message explaining why you’re rejecting this course. This will be emailed to the teacher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Course:</span>{" "}
              <span className="font-medium">{rejecting?.title ?? ""}</span>
            </div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={savingId === rejecting?.id}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejecting) return;
                const reason = rejectReason.trim();
                if (!reason) return;
                await setStatus(rejecting.id, "REJECTED", reason);
                setRejecting(null);
              }}
              disabled={!rejectReason.trim() || savingId === rejecting?.id}
            >
              {savingId === rejecting?.id ? "Saving…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

