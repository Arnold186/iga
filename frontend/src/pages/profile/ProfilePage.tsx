import React, { useEffect, useMemo, useState } from "react";

import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

type Me = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  profileImage?: string | null;
};

export const ProfilePage: React.FC = () => {
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    api.get<Me>("/api/users/me").then((r) => {
      setMe(r.data);
      setFirstName(r.data.firstName);
      setLastName(r.data.lastName);
    });
  }, []);

  const initials = useMemo(() => {
    if (!me) return "—";
    const a = me.firstName?.[0] ?? "";
    const b = me.lastName?.[0] ?? "";
    return (a + b).toUpperCase() || me.email[0]?.toUpperCase() || "U";
  }, [me]);

  const save = async () => {
    if (!firstName.trim() && !lastName.trim()) return;
    setSaving(true);
    try {
      const res = await api.put<Me>("/api/users/profile", {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined
      });
      setMe(res.data);
    } finally {
      setSaving(false);
    }
  };

  const uploadPicture = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await api.post<{ profileImage: string; user: Me }>("/api/users/profile-picture", fd);
      setMe(res.data.user);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your name and profile picture.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-white/70 backdrop-blur lg:col-span-1">
          <CardHeader>
            <CardTitle>Your info</CardTitle>
            <CardDescription>Account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-sky-50">
                {me?.profileImage ? (
                  <img src={me.profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sm font-semibold text-sky-700">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{me ? `${me.firstName} ${me.lastName}` : "—"}</div>
                <div className="truncate text-sm text-muted-foreground">{me?.email}</div>
                <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {me?.role ?? "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Profile picture</div>
              <div className="mt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPicture(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  {uploading ? "Uploading…" : "Upload image"}
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>Name updates are reflected across the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">First name</div>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Last name</div>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

