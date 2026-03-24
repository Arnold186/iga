import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Download, Loader2, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

type Doc = { id: string; title: string; url: string; fileType: string };

type CourseDetail = {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  teacher?: { id: string; firstName: string; lastName: string; email: string };
  documents?: Doc[];
  modules?: { id: string; title: string; order: number }[];
};

function isPdf(fileType: string): boolean {
  return fileType?.toLowerCase() === "pdf";
}

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Doc | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerLoadError, setViewerLoadError] = useState(false);
  const [officeViewerUrl, setOfficeViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<CourseDetail>(`/api/courses/${id}`)
      .then((r) => setCourse(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  // Load PDF through backend (with auth) so the iframe can display it. Non-PDF is not previewed in iframe.
  useEffect(() => {
    if (!viewingDoc || !id) {
      if (viewerBlobUrl) {
        URL.revokeObjectURL(viewerBlobUrl);
      }
      setViewerBlobUrl(null);
      setViewerLoadError(false);
      setViewerLoading(false);
      return;
    }
    if (!isPdf(viewingDoc.fileType)) {
      if (viewerBlobUrl) {
        URL.revokeObjectURL(viewerBlobUrl);
        setViewerBlobUrl(null);
      }
      setViewerLoadError(false);
      setViewerLoading(false);
      return;
    }
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
    setViewerLoadError(false);
    setViewerLoading(true);
    const baseURL = api.defaults.baseURL || "";
    const token = localStorage.getItem("iga_token");
    const url = `${baseURL}/api/courses/${id}/documents/${viewingDoc.id}/download`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.blob();
      })
      .then((blob) => {
        setViewerBlobUrl(URL.createObjectURL(blob));
        setViewerLoadError(false);
      })
      .catch(() => setViewerLoadError(true))
      .finally(() => setViewerLoading(false));
  }, [viewingDoc?.id, id, viewingDoc?.fileType]);

  // For Office files (pptx, docx, etc.): get a short-lived view token and show in Microsoft Office Online Viewer
  useEffect(() => {
    if (!viewingDoc || !id || isPdf(viewingDoc.fileType)) {
      setOfficeViewerUrl(null);
      return;
    }
    setOfficeViewerUrl(null);
    setViewerLoadError(false);
    setViewerLoading(true);
    api
      .get<{ token: string }>(`/api/courses/${id}/documents/${viewingDoc.id}/view-token`)
      .then((res) => {
        const token = res.data.token;
        const base = api.defaults.baseURL || "";
        const origin = base.startsWith("http") ? base.replace(/\/$/, "") : window.location.origin;
        const serveUrl = `${origin}/api/courses/documents/serve?token=${encodeURIComponent(token)}`;
        const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(serveUrl)}`;
        setOfficeViewerUrl(viewerUrl);
        setViewerLoadError(false);
      })
      .catch(() => {
        setOfficeViewerUrl(null);
        setViewerLoadError(true);
      })
      .finally(() => setViewerLoading(false));
  }, [viewingDoc?.id, id, viewingDoc?.fileType]);

  const sortedModules = useMemo(() => {
    return [...(course?.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [course?.modules]);

  const enroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await api.post(`/api/courses/${id}/enroll`);
      toast.success("Enrolled");
      // Quizzes page pulls from `/api/courses/enrolled`, so the student may need to refresh/navigate back.
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const handleView = (doc: Doc) => {
    if (doc.url?.startsWith("http")) {
      setViewingDoc(doc);
    }
  };

  const handleDownload = async (doc: Doc) => {
    if (!id) return;
    setDownloadingId(doc.id);
    try {
      const baseURL = api.defaults.baseURL || "";
      const token = localStorage.getItem("iga_token");
      const url = `${baseURL}/api/courses/${id}/documents/${doc.id}/download`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const ext = doc.fileType || "pdf";
      const name = (doc.title || "document").replace(/[^a-zA-Z0-9._\s-]/g, "_");
      const filename = name.includes(".") ? name : `${name}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open document URL in new tab (user can save from there)
      if (doc.url?.startsWith("http")) {
        window.open(doc.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
          <CardDescription>Fetching course details.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!course) {
    return (
      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Course not found</CardTitle>
          <CardDescription>This course may have been removed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-white/70 backdrop-blur">
        <div className="aspect-[21/9] w-full bg-slate-100">
          {course.image ? (
            <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
              No cover image
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{course.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-3 text-sm text-muted-foreground">
                Teacher:{" "}
                <span className="text-foreground">
                  {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : "—"}
                </span>
              </div>
            </div>
            <Button onClick={enroll} disabled={enrolling}>
              {enrolling ? "Enrolling…" : "Enroll"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white/70 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Course structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedModules.map((m) => (
              <div key={m.id} className="rounded-lg border bg-white px-3 py-2">
                <div className="font-medium">{m.title}</div>
              </div>
            ))}
            {sortedModules.length === 0 && (
              <div className="text-sm text-muted-foreground">No modules yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Course resources — view in page or download in original format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(course.documents ?? []).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.fileType.toUpperCase()}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {d.url?.startsWith("http") ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleView(d)}
                      >
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={downloadingId === d.id}
                        onClick={() => handleDownload(d)}
                      >
                        <Download className="h-4 w-4" />
                        {downloadingId === d.id ? "…" : "Download"}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                </div>
              </div>
            ))}
            {(course.documents ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">No documents yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 px-6 pt-6 pb-2 shrink-0 pr-12">
            <DialogTitle className="truncate flex-1 min-w-0">
              {viewingDoc ? viewingDoc.title : ""}
            </DialogTitle>
            {viewingDoc && (
              (isPdf(viewingDoc.fileType) && viewerBlobUrl) || (!isPdf(viewingDoc.fileType) && officeViewerUrl) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => {
                    if (viewingDoc && isPdf(viewingDoc.fileType) && viewerBlobUrl) {
                      window.open(viewerBlobUrl, "_blank", "noopener,noreferrer");
                    } else if (viewingDoc && !isPdf(viewingDoc.fileType) && officeViewerUrl) {
                      window.open(officeViewerUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </Button>
              ) : null
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6 flex flex-col">
            {viewingDoc && isPdf(viewingDoc.fileType) && (
              <>
                {viewerLoading && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-muted/30">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm">Loading preview…</span>
                    </div>
                  </div>
                )}
                {!viewerLoading && viewerLoadError && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/30 p-8 text-center">
                    <p className="text-sm font-medium text-foreground">Couldn&apos;t load preview</p>
                    <p className="text-sm text-muted-foreground">
                      Download the file to view it on your device.
                    </p>
                    <Button
                      onClick={() => viewingDoc && handleDownload(viewingDoc)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                )}
                {!viewerLoading && !viewerLoadError && viewerBlobUrl && (
                  <iframe
                    title={viewingDoc.title}
                    src={viewerBlobUrl}
                    className="h-full w-full flex-1 rounded-lg border border-border bg-white min-h-0"
                  />
                )}
              </>
            )}
            {viewingDoc && !isPdf(viewingDoc.fileType) && (
              <>
                {viewerLoading && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-muted/30">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm">Loading preview…</span>
                    </div>
                  </div>
                )}
                {!viewerLoading && viewerLoadError && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/30 p-8 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Couldn&apos;t load preview
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Download the file to open it in PowerPoint, Word, or another app. If your backend is not reachable from the internet, preview will not work.
                    </p>
                    <Button
                      onClick={() => viewingDoc && handleDownload(viewingDoc)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                )}
                {!viewerLoading && !viewerLoadError && officeViewerUrl && (
                  <iframe
                    title={viewingDoc.title}
                    src={officeViewerUrl}
                    className="h-full w-full flex-1 rounded-lg border border-border bg-white min-h-0"
                  />
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
