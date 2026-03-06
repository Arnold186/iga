import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { PasswordInput } from "../../components/PasswordInput";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      await axios.post("/api/auth/reset-password", {
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
      <div className="auth-layout">
        <div className="auth-card">
          <h1 className="title">IGA LMS</h1>
          <h2 className="subtitle">Reset Password</h2>
          <p>Invalid or missing reset token.</p>
          <div className="auth-links">
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1 className="title">IGA LMS</h1>
        <h2 className="subtitle">Reset Password</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="form">
          <PasswordInput label="New password" {...register("password")} />
          {formState.errors.password && (
            <span className="error">{formState.errors.password.message}</span>
          )}
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Updating..." : "Update password"}
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

