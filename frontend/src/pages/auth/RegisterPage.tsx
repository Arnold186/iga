import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { PasswordInput } from "../../components/PasswordInput";
import { toast } from "react-toastify";

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
      await axios.post("/api/auth/register", data);
      toast.success("Registered. Check email for OTP.");
      navigate("/verify-otp?email=" + encodeURIComponent(data.email));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <img className="brand-logo" src="/IGA.png" alt="IGA" />
          <h1 className="brand-text">IGA</h1>
        </div>
        <h2 className="subtitle">Create Account</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div className="field">
            <label className="label">First name</label>
            <input className="input" {...register("firstName")} />
            {formState.errors.firstName && (
              <span className="error">{formState.errors.firstName.message}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Last name</label>
            <input className="input" {...register("lastName")} />
            {formState.errors.lastName && (
              <span className="error">{formState.errors.lastName.message}</span>
            )}
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input type="email" className="input" {...register("email")} />
            {formState.errors.email && (
              <span className="error">{formState.errors.email.message}</span>
            )}
          </div>
          <PasswordInput label="Password" {...register("password")} />
          {formState.errors.password && (
            <span className="error">{formState.errors.password.message}</span>
          )}
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
        <div className="auth-links">
          <span>Already have an account?</span>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

