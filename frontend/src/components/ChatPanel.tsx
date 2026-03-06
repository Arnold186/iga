import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

interface Message {
  id: string;
  senderId: string;
  receiverId?: string | null;
  content: string;
  timestamp: string;
}

let socket: Socket | null = null;

export const ChatPanel: React.FC = () => {
  const { token, user } = useAuth();
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [groupInput, setGroupInput] = useState("");

  useEffect(() => {
    if (!token) return;

    axios
      .get<Message[]>("/api/chat/group")
      .then((res) => setGroupMessages(res.data))
      .catch(() => {});

    socket = io("http://localhost:4000", {
      auth: { token }
    });

    socket.on("groupMessage", (msg: Message) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token]);

  const sendGroupMessage = () => {
    if (!groupInput.trim() || !socket) return;
    socket.emit("groupMessage", groupInput.trim());
    setGroupInput("");
  };

  if (!user) return null;

  return (
    <div className="card">
      <h2 className="card-title">Group Chat</h2>
      <div className="chat-box">
        {groupMessages.map((m) => (
          <div
            key={m.id}
            className={
              m.senderId === user.id ? "chat-message me" : "chat-message other"
            }
          >
            <span>{m.content}</span>
            <small>{new Date(m.timestamp).toLocaleTimeString()}</small>
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

