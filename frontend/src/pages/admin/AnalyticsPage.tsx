import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export const AnalyticsPage: React.FC = () => {
  // Mock data for the chart
  const data = [40, 60, 45, 80, 55, 90, 75, 100, 65, 85, 70, 95];
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform growth and engagement over the year.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">12,450</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Course Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">68%</div>
            <p className="text-xs text-muted-foreground">+4% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Time on Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">45m</div>
            <p className="text-xs text-muted-foreground">+2m from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>User Growth Overview</CardTitle>
          <CardDescription>New registrations per month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex h-64 items-end gap-2 sm:gap-4 md:gap-6">
            {data.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2 group">
                <div 
                  className="w-full rounded-t-md bg-blue-100 transition-all duration-300 group-hover:bg-blue-600"
                  style={{ height: `${value}%` }}
                ></div>
                <span className="text-xs font-medium text-slate-500">{labels[index]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

