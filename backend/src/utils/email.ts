import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

export async function sendEmail(params: { to: string; subject: string; text: string }) {
  const from = env.smtpFrom || env.smtpUser;

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text
    });
  } catch (error) {
    console.error("Failed to send email", error);
  }
}

