import { Request, Response } from "express";
import {
  login,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyOtp
} from "./auth.service";
import { Role } from "@prisma/client";

export async function registerHandler(req: Request, res: Response) {
  const { firstName, lastName, email, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };

  const result = await registerUser({
    firstName,
    lastName,
    email,
    password,
    role: Role.STUDENT
  });
  res.status(201).json({
    message: "Registered successfully. Please verify OTP sent to your email.",
    user: result
  });
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { email, otp } = req.body as { email: string; otp: string };
  await verifyOtp(email, otp);
  res.json({ message: "Email verified successfully. You can now login." });
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const result = await login(email, password);
  res.json(result);
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  await requestPasswordReset(email);
  res.json({
    message:
      "If an account exists for this email, a password reset link has been sent."
  });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { token, password } = req.body as { token: string; password: string };
  await resetPassword(token, password);
  res.json({ message: "Password reset successfully." });
}

