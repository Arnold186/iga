import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

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
      await axios.post("/api/auth/forgot-password", data);
      toast.info("If an account exists, a reset link was sent.");
    } catch {
      toast.error("Unable to send reset link");
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <img className="brand-logo" src="/IGA.png" alt="IGA" />
          <h1 className="brand-text">IGA</h1>
        </div>
        <h2 className="subtitle">Forgot Password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div className="field">
            <label className="label">Email</label>
            <input type="email" className="input" {...register("email")} />
            {formState.errors.email && (
              <span className="error">{formState.errors.email.message}</span>
            )}
          </div>
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

