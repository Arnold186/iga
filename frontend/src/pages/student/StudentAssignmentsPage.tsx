import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const StudentAssignmentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and submit your course assignments.
        </p>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Upcoming Assignments</CardTitle>
          <CardDescription>No upcoming assignments at the moment.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50 border-dashed">
            <div className="text-sm font-medium text-slate-900">All caught up!</div>
            <div className="text-xs text-slate-500 mt-1">You have no pending assignments.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
