import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface Message {
  id: string;
  senderId: string;
  receiverId?: string | null;
  content: string;
  createdAt: string;
  senderName?: string;
  senderRole?: string;
}

let socket: Socket | null = null;

export const ChatPanel: React.FC = () => {
  const { token, user } = useAuth();
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [dmUserId, setDmUserId] = useState("");
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmInput, setDmInput] = useState("");

  useEffect(() => {
    if (!token) return;

    api
      .get<Message[]>("/api/chat/group")
      .then((res) => setGroupMessages(res.data))
      .catch(() => {});

    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4010", {
      auth: { token }
    });

    socket.on("receive_message", (msg: Message) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    socket.on("receive_direct_message", (msg: Message) => {
      setDmMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token]);

  const sendGroupMessage = () => {
    if (!groupInput.trim() || !socket) return;
    socket.emit("send_message", groupInput.trim());
    setGroupInput("");
  };

  const loadDm = async () => {
    if (!dmUserId.trim()) return;
    const res = await api.get<Message[]>(`/api/chat/private/${dmUserId.trim()}`);
    setDmMessages(res.data);
  };

  const sendDm = () => {
    if (!dmUserId.trim() || !dmInput.trim() || !socket) return;
    socket.emit("direct_message", { receiverId: dmUserId.trim(), content: dmInput.trim() });
    setDmInput("");
  };

  if (!user) return null;

  return (
    <div className="card">
      <h2 className="card-title">Chat</h2>
      <p className="card-subtitle">Group chat + direct messages</p>

      <div className="field" style={{ marginBottom: "0.75rem" }}>
        <label className="label">Direct message userId</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            className="input"
            placeholder="Paste receiver userId..."
            value={dmUserId}
            onChange={(e) => setDmUserId(e.target.value)}
          />
          <button className="btn outline" onClick={() => loadDm().catch(() => {})}>
            Load
          </button>
        </div>
      </div>

      {!!dmUserId.trim() && (
        <>
          <div className="chat-box" style={{ marginBottom: "0.75rem" }}>
            {dmMessages.map((m) => (
              <div
                key={m.id}
                className={m.senderId === user.id ? "chat-message me" : "chat-message other"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <small>
                    {m.senderName || m.senderId} {m.senderRole ? `(${m.senderRole})` : ""}
                  </small>
                  <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
                </div>
                <span>{m.content}</span>
              </div>
            ))}
            {dmMessages.length === 0 && <p style={{ margin: 0 }}>No direct messages yet.</p>}
          </div>
          <div className="chat-input-row" style={{ marginBottom: "1rem" }}>
            <input
              className="input"
              placeholder="Type a direct message..."
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendDm();
              }}
            />
            <button className="btn primary" onClick={sendDm}>
              Send
            </button>
          </div>
        </>
      )}

      <h3 style={{ margin: "0 0 0.5rem" }}>Group Chat</h3>
      <div className="chat-box">
        {groupMessages.map((m) => (
          <div
            key={m.id}
            className={
              m.senderId === user.id ? "chat-message me" : "chat-message other"
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <small>
                {m.senderName || m.senderId} {m.senderRole ? `(${m.senderRole})` : ""}
              </small>
              <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
            </div>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="input"
          placeholder="Type a message..."
          value={groupInput}
          onChange={(e) => setGroupInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendGroupMessage();
          }}
        />
        <button className="btn primary" onClick={sendGroupMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

