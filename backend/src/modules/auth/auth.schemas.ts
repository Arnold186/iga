import { z } from "zod";
import { Role } from "@prisma/client";

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).optional().default(Role.STUDENT)
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

export const resendOtpSchema = z.object({
  email: z.string().email()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(6)
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1)
});

export const createTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  temporaryPassword: z.string().min(6).optional()
});

export const changePasswordSchema = z.object({
  password: z.string().min(6)
});

