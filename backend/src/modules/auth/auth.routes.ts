import { Router } from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  registerHandler,
  resetPasswordHandler,
  verifyOtpHandler
} from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyOtpSchema
} from "./auth.schemas";
import { validateBody } from "../../middleware/validate";

const router = Router();

router.post("/register", validateBody(registerSchema), registerHandler);
router.post("/verify-otp", validateBody(verifyOtpSchema), verifyOtpHandler);
router.post("/login", validateBody(loginSchema), loginHandler);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordHandler);

export default router;

