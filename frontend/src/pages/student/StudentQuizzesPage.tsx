import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const StudentQuizzesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quizzes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take available quizzes to test your knowledge.
        </p>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Available Quizzes</CardTitle>
          <CardDescription>No available quizzes at the moment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50 border-dashed">
            <div className="text-sm font-medium text-slate-900">No quizzes to show</div>
            <div className="text-xs text-slate-500 mt-1">Your teachers have not published any quizzes yet.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
