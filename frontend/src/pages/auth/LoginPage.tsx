import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PasswordInput } from "../../components/PasswordInput";
import { toast } from "react-toastify";

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
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <img className="brand-logo" src="/IGA.png" alt="IGA" />
          <h1 className="brand-text">IGA</h1>
        </div>
        <h2 className="subtitle">Login</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div className="field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              {...register("email")}
            />
            {formState.errors.email && (
              <span className="error">{formState.errors.email.message}</span>
            )}
          </div>
          <PasswordInput
            label="Password"
            {...register("password")}
          />
          {formState.errors.password && (
            <span className="error">{formState.errors.password.message}</span>
          )}
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

