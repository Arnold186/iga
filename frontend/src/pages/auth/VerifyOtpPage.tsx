import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../services/api";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

type FormValues = z.infer<typeof schema>;

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  const emailFromQuery = search.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { register, handleSubmit, formState, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromQuery }
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post("/api/auth/verify-otp", data);
      toast.success("Email verified. You can login now.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "OTP verification failed");
    }
  };

  const onResendOtp = async () => {
    const email = (getValues("email") || "").trim();
    if (!email) {
      toast.error("Please enter your email first.");
      return;
    }
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await api.post("/api/auth/resend-otp", { email });
      toast.info("If an account exists, a new OTP has been sent.");
      setResendCooldown(30);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code sent to your email."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...register("email")} />
          {formState.errors.email && (
            <div className="text-xs text-red-600">{formState.errors.email.message}</div>
          )}
        </div>
        <div className="space-y-2">
          <Label>6-digit OTP</Label>
          <Input
            inputMode="numeric"
            placeholder="123456"
            maxLength={6}
            {...register("otp")}
          />
          {formState.errors.otp && (
            <div className="text-xs text-red-600">{formState.errors.otp.message}</div>
          )}
        </div>
        <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Verifying…" : "Verify"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onResendOtp}
            disabled={isResending || resendCooldown > 0}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend OTP in ${resendCooldown}s`
              : isResending
                ? "Resending OTP…"
                : "Resend OTP"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

