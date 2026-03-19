import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { logActivity } from "../../utils/activityLog";
import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { sendEmail } from "../../utils/email";
import { OAuth2Client } from "google-auth-library";

const SALT_ROUNDS = 10;

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

  // Registration-based signups must receive an OTP email.
  await resendRegistrationOtp(params.email);

  return { id: user.id, email: user.email };
}

export async function verifyOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw { status: 400, message: "Invalid email or OTP" };
  }

  const record = await prisma.oTPVerification.findFirst({
    where: {
      userId: user.id,
      otp,
      purpose: "REGISTRATION",
      verified: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) {
    throw { status: 400, message: "Invalid or expired OTP" };
  }

  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true }
  });

  await logActivity(user.id, "Email verified via OTP");
}

export async function resendRegistrationOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // don't leak user existence
    return;
  }

  const alreadyVerified = await prisma.oTPVerification.findFirst({
    where: { userId: user.id, purpose: "REGISTRATION", verified: true }
  });
  if (alreadyVerified) return;

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTPVerification.create({
    data: {
      userId: user.id,
      otp,
      purpose: "REGISTRATION",
      expiresAt
    }
  });

  await sendEmail({
    to: user.email,
    subject: "IGA Registration OTP",
    text: `Your IGA verification code is ${otp}. It will expire in 10 minutes.`
  });
}

export async function createTeacherByAdmin(params: {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw { status: 400, message: "Email already in use" };
  }

  const tempPassword = params.temporaryPassword?.trim() ? params.temporaryPassword.trim() : generateTemporaryPassword();
  const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  const teacher = await prisma.user.create({
    data: {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      password: hash,
      role: Role.TEACHER,
      mustChangePassword: true
    },
    select: { id: true, email: true }
  });

  await logActivity(teacher.id, "Teacher created by admin");
  return { id: teacher.id, email: teacher.email, temporaryPassword: tempPassword };
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: "User not found" };
  if (!user.mustChangePassword) {
    return { message: "Password change not required." };
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, mustChangePassword: false }
  });
  await logActivity(userId, "Temporary password changed");
  return { message: "Password updated. You can continue." };
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

  // Enforce OTP verification only for accounts that still have an
  // unverified REGISTRATION OTP record.
  const pendingRegistrationOtp = await prisma.oTPVerification.findFirst({
    where: {
      userId: user.id,
      purpose: "REGISTRATION",
      verified: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (pendingRegistrationOtp) {
    throw { status: 403, message: "Please verify your email with OTP first." };
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    }
  };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // don't leak user existence
    return;
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTPVerification.create({
    data: {
      userId: user.id,
      otp,
      purpose: "PASSWORD_RESET",
      expiresAt
    }
  });

  await sendEmail({
    to: user.email,
    subject: "IGA Password Reset OTP",
    text: `Your IGA password reset code is ${otp}. It will expire in 10 minutes.`
  });
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw { status: 400, message: "Invalid email or OTP" };
  }

  const record = await prisma.oTPVerification.findFirst({
    where: {
      userId: user.id,
      otp,
      purpose: "PASSWORD_RESET",
      verified: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!record) {
    throw { status: 400, message: "Invalid or expired OTP" };
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash }
  });

  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true }
  });

  // If the user can reset their password via email OTP, they have proven
  // control of the inbox. Mark registration verification as satisfied too
  // so login isn't blocked afterwards.
  const regVerified = await prisma.oTPVerification.findFirst({
    where: { userId: user.id, purpose: "REGISTRATION", verified: true }
  });
  if (!regVerified) {
    const updated = await prisma.oTPVerification.updateMany({
      where: { userId: user.id, purpose: "REGISTRATION", verified: false },
      data: { verified: true }
    });

    if (updated.count === 0) {
      await prisma.oTPVerification.create({
        data: {
          userId: user.id,
          otp: "PASSWORD_RESET_VERIFIED",
          purpose: "REGISTRATION",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          verified: true
        }
      });
    }
  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTemporaryPassword() {
  // Simple temporary password generator. In production, consider more robust generation.
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += all[Math.floor(Math.random() * all.length)];
  }
  return out;
}

const googleClient = new OAuth2Client(env.googleClientId);

export async function loginWithGoogle(idToken: string) {
  if (!env.googleClientId) {
    throw { status: 500, message: "Google sign-in is not configured." };
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw { status: 400, message: "Unable to get email from Google account." };
  }

  const email = payload.email;
  const firstName = payload.given_name || "Google";
  const lastName = payload.family_name || "User";

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const hash = await bcrypt.hash(jwt.sign({ sub: payload.sub }, env.jwtSecret), SALT_ROUNDS);

    user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hash,
        role: Role.STUDENT,
        isActive: true
      }
    });

    await logActivity(user.id, "User registered via Google");
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
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

