import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Role = "STUDENT" | "TEACHER" | "ADMIN";

interface MeResponse {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  role: Role;
  profileImage?: string | null;
}

export const ProfileCard: React.FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const initials = useMemo(() => {
    const fn = (me?.firstName || "").trim();
    const ln = (me?.lastName || "").trim();
    return `${fn.slice(0, 1)}${ln.slice(0, 1)}`.toUpperCase() || "U";
  }, [me?.firstName, me?.lastName]);

  const load = async () => {
    const res = await api.get<MeResponse>("/api/users/me");
    setMe(res.data);
    setFirstName(res.data.firstName || "");
    setLastName(res.data.lastName || "");
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.put<MeResponse>("/api/users/profile", {
        firstName,
        lastName
      });
      setMe(res.data);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadPicture = async (file: File) => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<{ profileImage: string; user: MeResponse }>(
        "/api/users/profile-picture",
        fd
      );
      setMe(res.data.user);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-white/70 backdrop-blur">
      <CardHeader>
        <CardTitle>My profile</CardTitle>
        <CardDescription>Quick edits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!me ? (
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-16 w-16 overflow-hidden rounded-full border bg-sky-50">
              {me.profileImage ? (
                <img src={me.profileImage} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm font-semibold text-sky-700">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <div className="truncate font-medium">
                  {me.name || `${me.firstName} ${me.lastName}`}
                </div>
                <div className="truncate text-sm text-muted-foreground">{me.email}</div>
                <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {me.role}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPicture(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={uploading}
                  />
                  {uploading ? "Uploading…" : "Change picture"}
                </label>
                <Button onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

