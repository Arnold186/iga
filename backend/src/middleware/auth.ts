import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  const run = async () => {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AuthUser;
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { isActive: true } });
      if (!user || !user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };
  run();
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

