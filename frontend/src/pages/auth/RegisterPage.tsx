import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { PasswordInput } from "../../components/PasswordInput";
import { toast } from "react-toastify";
import { api } from "../../services/api";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export const RegisterPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {}
  });
  const navigate = useNavigate();

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post("/api/auth/register", data);
      toast.success("Registered. Check email for OTP.");
      navigate("/verify-otp?email=" + encodeURIComponent(data.email));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a student. Teachers are created by admins."
      footer={
        <div className="flex items-center justify-between">
          <span>Already have an account?</span>
          <Link className="text-primary hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>First name</Label>
            <Input placeholder="John" {...register("firstName")} />
            {formState.errors.firstName && (
              <div className="text-xs text-red-600">{formState.errors.firstName.message}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input placeholder="Doe" {...register("lastName")} />
            {formState.errors.lastName && (
              <div className="text-xs text-red-600">{formState.errors.lastName.message}</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="you@example.com" {...register("email")} />
          {formState.errors.email && (
            <div className="text-xs text-red-600">{formState.errors.email.message}</div>
          )}
        </div>

        <PasswordInput label="Password" placeholder="Create a strong password" {...register("password")} />
        {formState.errors.password && (
          <div className="text-xs text-red-600">{formState.errors.password.message}</div>
        )}

        <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
};

