import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { PasswordInput } from "../../components/PasswordInput";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TEACHER", "ADMIN"])
});

type FormValues = z.infer<typeof schema>;

export const RegisterPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "STUDENT" }
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
        <h1 className="title">IGA LMS</h1>
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
          <div className="field">
            <label className="label">Role</label>
            <select className="input" {...register("role")}>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button className="btn primary" type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
        <div className="auth-links">
          <span>Already have an account?</span>
          <Link to="/login">Login</Link>
        </div>
      </div>
      <ToastContainer position="top-right" />
    </div>
  );
};

