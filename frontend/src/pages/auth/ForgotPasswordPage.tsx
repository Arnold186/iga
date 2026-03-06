import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
        <h1 className="title">IGA LMS</h1>
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
      <ToastContainer position="top-right" />
    </div>
  );
};

