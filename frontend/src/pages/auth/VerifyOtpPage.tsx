import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

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
      await axios.post("/api/auth/verify-otp", data);
      toast.success("Email verified. You can login now.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="brand">
          <img className="brand-logo" src="/IGA.png" alt="IGA" />
          <h1 className="brand-text">IGA</h1>
        </div>
        <h2 className="subtitle">Verify Email</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <div className="field">
            <label className="label">Email</label>
            <input type="email" className="input" {...register("email")} />
            {formState.errors.email && (
              <span className="error">{formState.errors.email.message}</span>
            )}
          </div>
          <div className="field">
            <label className="label">6-digit OTP</label>
            <input className="input" maxLength={6} {...register("otp")} />
            {formState.errors.otp && (
              <span className="error">{formState.errors.otp.message}</span>
            )}
          </div>
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Verifying..." : "Verify"}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

