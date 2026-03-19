import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

import { api } from "../../services/api";
import { toast } from "react-toastify";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";

const schema = z.object({
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export const ChangeTeacherPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" }
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      await api.post("/api/auth/change-password", { password: data.password });
      toast.success("Password updated.");
      navigate("/teacher");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Password update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teachers created by admin must change their temporary password after first login.
        </p>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>New password</CardTitle>
          <CardDescription>Choose a new password (min 6 characters).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" {...register("password")} />
              {formState.errors.password && (
                <div className="text-xs text-red-600">{formState.errors.password.message}</div>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

