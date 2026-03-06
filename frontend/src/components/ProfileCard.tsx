import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

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
    const res = await axios.get<MeResponse>("/api/users/me");
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
      const res = await axios.put<MeResponse>("/api/users/profile", {
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
      const res = await axios.post<{ profileImage: string; user: MeResponse }>(
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
    <div className="card">
      <h2 className="card-title">My Profile</h2>
      {!me && <p>Loading profile...</p>}
      {me && (
        <div className="profile-row">
          <div className="avatar">
            {me.profileImage ? (
              <img src={me.profileImage} alt="Profile" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="profile-meta">
              <div className="profile-name">{me.name || `${me.firstName} ${me.lastName}`}</div>
              <div className="profile-sub">{me.email}</div>
              <div className="profile-sub">{me.role}</div>
            </div>

            <div className="form" style={{ marginTop: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  className="input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button className="btn primary" onClick={save} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <label className="btn outline" style={{ display: "inline-flex", gap: "0.5rem" }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPicture(f);
                      e.target.value = "";
                    }}
                    disabled={uploading}
                  />
                  {uploading ? "Uploading..." : "Change picture"}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

