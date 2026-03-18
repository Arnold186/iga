import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logActivity } from "../../utils/activityLog";
import { Role } from "@prisma/client";
import { env } from "../../config/env";
import { sendEmail } from "../../utils/email";

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

  // Only enforce OTP verification for accounts that actually have a
  // REGISTRATION OTP record (i.e., went through OTP-based signup).
  const hasRegistrationOtp = await prisma.oTPVerification.findFirst({
    where: { userId: user.id, purpose: "REGISTRATION" }
  });
  if (hasRegistrationOtp) {
    const hasVerifiedOtp = await prisma.oTPVerification.findFirst({
      where: { userId: user.id, verified: true, purpose: "REGISTRATION" }
    });
    if (!hasVerifiedOtp) {
      throw {
        status: 403,
        message: "Please verify your email with the OTP sent to you before logging in."
      };
    }
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

