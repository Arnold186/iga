import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma/client";
import { Role } from "@prisma/client";

interface SocketUser {
  id: string;
  role: Role;
  email: string;
}

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.frontendUrl,
    methods: ["GET", "POST"]
  }
});

io.use((socket, next) => {
  const token =
    (socket.handshake.auth as any)?.token ||
    (socket.handshake.query && (socket.handshake.query.token as string));

  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as SocketUser;
    (socket as any).user = decoded;
    socket.join(decoded.id);
    socket.join("group");
    next();
  } catch {
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  const user = (socket as any).user as SocketUser;
  console.log("Socket connected", user.email);

  socket.on("groupMessage", async (content: string) => {
    if (!content?.trim()) return;
    const msg = await prisma.message.create({
      data: {
        senderId: user.id,
        content,
        receiverId: null
      }
    });
    io.to("group").emit("groupMessage", msg);
  });

  socket.on("privateMessage", async (payload: { receiverId: string; content: string }) => {
    if (!payload.content?.trim()) return;
    const msg = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: payload.receiverId,
        content: payload.content
      }
    });
    io.to(user.id).to(payload.receiverId).emit("privateMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", user.email);
  });
});

const port = env.port;

server.listen(port, () => {
  console.log(`IGA backend listening on port ${port}`);
});

