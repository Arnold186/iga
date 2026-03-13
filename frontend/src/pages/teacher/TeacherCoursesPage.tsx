import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type Course = {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  image?: string | null;
};

export const TeacherCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "" });
  const [editing, setEditing] = useState<Course | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ image?: boolean; doc?: boolean }>({});

  const load = () => {
    setLoading(true);
    api
      .get<Course[]>("/api/courses")
      .then((r) => setCourses(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((c) => `${c.title} ${c.description} ${c.status}`.toLowerCase().includes(needle));
  }, [courses, q]);

  const createCourse = async () => {
    if (!newCourse.title.trim() || !newCourse.description.trim()) return;
    setCreating(true);
    try {
      await api.post("/api/courses", { title: newCourse.title.trim(), description: newCourse.description.trim() });
      setNewCourse({ title: "", description: "" });
      load();
    } finally {
      setCreating(false);
    }
  };

  const saveCourse = async () => {
    if (!editing) return;
    await api.put(`/api/courses/${editing.id}`, {
      title: editing.title.trim(),
      description: editing.description.trim()
    });
    setEditing(null);
    load();
  };

  const uploadImage = async (courseId: string, file: File) => {
    setUploading((p) => ({ ...p, image: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/api/courses/${courseId}/image`, fd);
      load();
    } finally {
      setUploading((p) => ({ ...p, image: false }));
    }
  };

  const uploadDocument = async (courseId: string, file: File) => {
    setUploading((p) => ({ ...p, doc: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/api/courses/${courseId}/documents`, fd);
    } finally {
      setUploading((p) => ({ ...p, doc: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create courses, upload cover images/documents, and edit details.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-[420px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…" />
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Create course</CardTitle>
          <CardDescription>New courses are created as PENDING until approved by an admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Course title" value={newCourse.title} onChange={(e) => setNewCourse((p) => ({ ...p, title: e.target.value }))} />
            <Input placeholder="Short description" value={newCourse.description} onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <Button onClick={createCourse} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id} className="bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate">{c.title}</span>
                <span
                  className={
                    c.status === "APPROVED"
                      ? "shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                      : c.status === "PENDING"
                      ? "shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
                      : "shrink-0 rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                  }
                >
                  {c.status}
                </span>
              </CardTitle>
              <CardDescription className="line-clamp-2">{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setEditing(c)}>
                  Edit details
                </Button>
                <Button variant="outline" onClick={() => setSelectedCourseId((prev) => (prev === c.id ? null : c.id))}>
                  Upload files
                </Button>
              </div>

              {selectedCourseId === c.id && (
                <div className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      disabled={!!uploading.image}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(c.id, f);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploading.image ? "Uploading…" : "Upload cover image"}
                  </label>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                    <input
                      className="hidden"
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      disabled={!!uploading.doc}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadDocument(c.id, f);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploading.doc ? "Uploading…" : "Upload document"}
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>Create your first course above.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <Card>
              <CardHeader>
                <CardTitle>Edit course</CardTitle>
                <CardDescription>Update title and description.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={editing.title} onChange={(e) => setEditing((p) => (p ? { ...p, title: e.target.value } : p))} />
                <Input value={editing.description} onChange={(e) => setEditing((p) => (p ? { ...p, description: e.target.value } : p))} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button onClick={saveCourse}>Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

