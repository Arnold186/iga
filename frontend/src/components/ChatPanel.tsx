import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Search, Hash, MessageSquare, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

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
  
  const [activeTab, setActiveTab] = useState<"group" | "dm">("group");
  const [dmUserId, setDmUserId] = useState("");
  
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  
  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setTimeout(() => scrollToBottom(), 100);
    });

    socket.on("receive_direct_message", (msg: Message) => {
      setDmMessages((prev) => [...prev, msg]);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadDm = async (id: string) => {
    if (!id.trim()) return;
    const res = await api.get<Message[]>(`/api/chat/private/${id.trim()}`);
    setDmMessages(res.data);
    setTimeout(() => scrollToBottom(), 100);
  };

  const sendMessage = () => {
    if (!inputVal.trim() || !socket) return;
    
    if (activeTab === "group") {
      socket.emit("send_message", inputVal.trim());
    } else {
      if (!dmUserId.trim()) return;
      socket.emit("direct_message", { receiverId: dmUserId.trim(), content: inputVal.trim() });
    }
    setInputVal("");
  };

  if (!user) return null;

  const currentMessages = activeTab === "group" ? groupMessages : dmMessages;

  return (
    <div className="flex h-[600px] w-full overflow-hidden rounded-xl border bg-white/50 shadow-sm backdrop-blur">
      {/* Left Sidebar */}
      <div className="flex w-64 flex-col border-r bg-slate-50/50">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 bg-white" placeholder="Search chats..." />
          </div>
        </div>
        <Separator />
        
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            <div>
              <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Channels
              </h4>
              <button 
                onClick={() => { setActiveTab("group"); setTimeout(() => scrollToBottom(), 100); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${activeTab === "group" ? "bg-blue-100/50 text-blue-700" : "hover:bg-slate-100 text-slate-700"}`}
              >
                <Hash className="h-4 w-4" />
                Global Chat
              </button>
            </div>
            
            <div>
              <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Direct Messages
              </h4>
              <div className="px-2 pb-2">
                <Input 
                  size={1}
                  className="h-8 text-xs bg-white" 
                  placeholder="Paste User ID..." 
                  value={dmUserId}
                  onChange={(e) => setDmUserId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setActiveTab("dm");
                      loadDm(dmUserId);
                    }
                  }}
                />
              </div>
              {dmUserId && (
                <button 
                  onClick={() => { setActiveTab("dm"); loadDm(dmUserId); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${activeTab === "dm" ? "bg-blue-100/50 text-blue-700" : "hover:bg-slate-100 text-slate-700"}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="truncate">{dmUserId}</span>
                </button>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right Chat Area */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex h-14 items-center border-b px-6">
          <h3 className="font-semibold text-slate-800">
            {activeTab === "group" ? "Global Chat" : `Direct Message: ${dmUserId || "New"}`}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          <div className="space-y-4">
            {currentMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No messages yet. Send a message to start the conversation!
              </div>
            ) : (
              currentMessages.map((m) => {
                const isMe = m.senderId === user.id;
                return (
                  <div key={m.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[75%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-baseline gap-2 px-1">
                        <span className="text-xs font-semibold text-slate-700">
                          {isMe ? "You" : m.senderName || m.senderId}
                        </span>
                        {!isMe && m.senderRole && (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 rounded-full">
                            {m.senderRole}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div 
                        className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isMe 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-slate-100 text-slate-800 rounded-tl-none border"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Input
              className="flex-1 bg-white"
              placeholder={activeTab === "group" ? "Message Global Chat..." : "Send a direct message..."}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              disabled={activeTab === "dm" && !dmUserId}
            />
            <Button size="icon" onClick={sendMessage} disabled={activeTab === "dm" && !dmUserId} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

