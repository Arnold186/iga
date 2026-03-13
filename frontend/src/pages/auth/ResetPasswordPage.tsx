import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { PasswordInput } from "../../components/PasswordInput";
import { toast } from "react-toastify";
import { api } from "../../services/api";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Button } from "../../components/ui/button";

const schema = z.object({
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });
  const location = useLocation();
  const navigate = useNavigate();

  const token = new URLSearchParams(location.search).get("token") || "";

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: data.password
      });
      toast.success("Password updated. You can login now.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reset failed");
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Reset password"
        subtitle="This reset link is invalid or expired."
        footer={
          <Link className="text-primary hover:underline" to="/login">
            Back to login
          </Link>
        }
      >
        <div className="text-sm text-muted-foreground">
          Please request a new password reset link and try again.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Create a new password for your account."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput label="New password" placeholder="At least 6 characters" {...register("password")} />
        {formState.errors.password && (
          <div className="text-xs text-red-600">{formState.errors.password.message}</div>
        )}
        <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
};

