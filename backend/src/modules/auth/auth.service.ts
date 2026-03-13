import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import crypto from "crypto";
import { logActivity } from "../../utils/activityLog";
// import nodemailer from "nodemailer";
import { Role } from "@prisma/client";

const SALT_ROUNDS = 10;

// Nodemailer/SMTP is disabled for now so that
// you can test the rest of the app without email delivery.

export async function registerUser(params: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw { status: 400, message: "Email already in use" };
  }

  const hash = await bcrypt.hash(params.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      password: hash,
      role: params.role
    }
  });

  await logActivity(user.id, "User registered");

  // Skip OTP generation and email sending so that
  // registration can succeed immediately without SMTP.
  return { id: user.id, email: user.email };
}

export async function verifyOtp(email: string, otp: string) {
  // OTP verification is disabled; always succeed so the
  // frontend can move past the verification step.
  return true;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw { status: 400, message: "Invalid credentials" };
  }
  if (!user.isActive) {
    throw { status: 403, message: "Account is deactivated" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 400, message: "Invalid credentials" };
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // don't leak user existence
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  });

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "IGA Password Reset",
    text: `Click the following link to reset your password: ${resetLink}`
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    throw { status: 400, message: "Invalid or expired token" };
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hash }
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true }
  });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(params: { to: string; subject: string; text: string }) {
  // Email sending is disabled; just log the payload for debugging.
  console.log("Email sending skipped (disabled):", params);
}

