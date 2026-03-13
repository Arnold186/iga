import React, { useEffect, useState } from "react";
import { api } from "../services/api";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationPanel: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await api.get<Notification[]>("/api/notifications");
    setNotifications(res.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn outline"
        onClick={() => setOpen((o) => !o)}
        style={{ padding: "0.5rem 0.75rem", position: "relative" }}
      >
        Notifications
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "white",
              borderRadius: "999px",
              fontSize: "0.7rem",
              padding: "0.1rem 0.4rem",
              minWidth: "18px"
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10
            }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card"
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: "0.5rem",
              minWidth: "320px",
              maxHeight: "400px",
              overflowY: "auto",
              zIndex: 20
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem" }}>Notifications</h3>
            {notifications.length === 0 && (
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                No notifications
              </p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "0.6rem 0",
                  borderBottom: "1px solid #e2e8f0",
                  opacity: n.isRead ? 0.8 : 1
                }}
              >
                <div style={{ fontSize: "0.9rem" }}>{n.message}</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: "0.25rem"
                  }}
                >
                  {new Date(n.createdAt).toLocaleString()}
                </div>
                {!n.isRead && (
                  <button
                    className="btn outline"
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8rem"
                    }}
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
