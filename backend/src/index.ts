import http from "http";
import { Server } from "socket.io";
import * as jwt from "jsonwebtoken";
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

  socket.on("send_message", async (content: string) => {
    if (!content?.trim()) return;
    const msg = await prisma.message.create({
      data: {
        senderId: user.id,
        content,
        receiverId: null
      },
      include: {
        sender: true
      }
    });
    const payload = {
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      senderName: `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
      senderRole: msg.sender.role
    };
    io.to("group").emit("receive_message", payload);
  });

  socket.on("direct_message", async (payload: { receiverId: string; content: string }) => {
    if (!payload.content?.trim()) return;

    if (!payload.receiverId || payload.receiverId === user.id) {
      return;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: {
        id: true,
        role: true,
        isActive: true
      }
    });

    if (!receiver || !receiver.isActive) {
      return;
    }

    // Enforce role-based DM rules:
    // - Private chats are only meaningful between TEACHER-STUDENT and TEACHER-ADMIN,
    //   but students may also chat with classmates.
    // - ADMIN can message STUDENT or TEACHER.
    // - STUDENT must not be able to INITIATE a new DM to ADMIN,
    //   but can reply if the admin has already messaged them.

    const senderRole = user.role;
    const receiverRole = receiver.role;

    if (senderRole === Role.STUDENT && receiverRole === Role.ADMIN) {
      // Allow only if there is already at least one message from this admin to this student
      const existingFromAdmin = await prisma.message.findFirst({
        where: {
          senderId: receiver.id,
          receiverId: user.id
        }
      });

      if (!existingFromAdmin) {
        return;
      }
    }

    const msg = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: payload.receiverId,
        content: payload.content
      },
      include: {
        sender: true
      }
    });
    const enriched = {
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      senderName: `${msg.sender.firstName} ${msg.sender.lastName}`.trim(),
      senderRole: msg.sender.role
    };
    io.to(user.id).emit("receive_direct_message", enriched);
    io.to(payload.receiverId).emit("receive_direct_message", enriched);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", user.email);
  });
});

const port = env.port;

server.listen(port, () => {
  console.log(`IGA backend listening on port ${port}`);
});

