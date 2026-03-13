import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../services/api";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const schema = z.object({
  email: z.string().email()
});

type FormValues = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post("/api/auth/forgot-password", data);
      toast.info("If an account exists, a reset link was sent.");
    } catch {
      toast.error("Unable to send reset link");
    }
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="We’ll email you a password reset link."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" {...register("email")} />
          {formState.errors.email && (
            <div className="text-xs text-red-600">{formState.errors.email.message}</div>
          )}
        </div>
        <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
};

