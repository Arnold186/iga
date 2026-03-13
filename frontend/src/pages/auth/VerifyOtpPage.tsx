import React from "react";
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

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromQuery }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post("/api/auth/verify-otp", data);
      toast.success("Email verified. You can login now.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "OTP verification failed");
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
      </form>
    </AuthLayout>
  );
};

