import { Router } from "express";
import {
  forgotPasswordHandler,
  createTeacherHandler,
  loginHandler,
  registerHandler,
  resendOtpHandler,
  changePasswordHandler,
  resetPasswordHandler,
  verifyOtpHandler,
  googleAuthHandler
} from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  createTeacherSchema,
  registerSchema,
  resendOtpSchema,
  changePasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  googleAuthSchema
} from "./auth.schemas";
import { validateBody } from "../../middleware/validate";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Student self-registration
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Registered successfully
 *       400:
 *         description: Validation error or email already in use
 */
router.post("/register", validateBody(registerSchema), registerHandler);
/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP after registration
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtpHandler);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP for email verification
 *     security: []
 */
router.post("/resend-otp", validateBody(resendOtpSchema), resendOtpHandler);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns token and user
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", validateBody(loginSchema), loginHandler);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 */
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPasswordHandler);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordHandler);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login or register using Google ID token
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns token and user
 */
router.post("/google", validateBody(googleAuthSchema), googleAuthHandler);

router.post(
  "/admin/create-teacher",
  authenticate,
  requireRole([Role.ADMIN]),
  validateBody(createTeacherSchema),
  createTeacherHandler
);

router.post(
  "/change-password",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(changePasswordSchema),
  changePasswordHandler
);

export default router;

