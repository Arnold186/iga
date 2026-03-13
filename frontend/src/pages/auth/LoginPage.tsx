import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";
import { toast } from "react-toastify";
import { AuthLayout } from "../../layouts/AuthLayout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: FormValues) => {
    try {
      const user = await login(data);
      toast.success("Logged in successfully");
      if (user?.role === "STUDENT") navigate("/student");
      else if (user?.role === "TEACHER") navigate("/teacher");
      else if (user?.role === "ADMIN") navigate("/admin");
      else navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your IGA account."
      footer={
        <div className="flex items-center justify-between">
          <Link className="text-primary hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
          <Link className="text-primary hover:underline" to="/register">
            Create an account
          </Link>
        </div>
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

        <PasswordInput label="Password" placeholder="Your password" {...register("password")} />
        {formState.errors.password && (
          <div className="text-xs text-red-600">{formState.errors.password.message}</div>
        )}

        <Button className="w-full" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>

        <div className="relative py-2">
          <Separator />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 text-xs text-muted-foreground">
            Secure access
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          By signing in, you agree to your institution’s acceptable use policy.
        </div>
      </form>
    </AuthLayout>
  );
};

