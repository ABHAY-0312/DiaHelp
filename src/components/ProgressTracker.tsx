
"use client";

import type { PredictionRecord } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { TrendingUp, Weight } from "lucide-react";

interface ProgressTrackerProps {
  history: PredictionRecord[];
  isLoading: boolean;
}

export function ProgressTracker({ history, isLoading }: ProgressTrackerProps) {

  const chartData = history
    .map(p => ({
      date: format(p.createdAt.toDate(), "MMM dd"),
      "Risk Score": p.riskScore,
      "BMI": p.formData.bmi,
    }))
    .reverse();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (history.length < 2) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-20">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold">Not Enough Data</h3>
            <p className="text-sm mt-1">Complete at least two health assessments to see your progress over time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
        <Card className="shadow-lg border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <TrendingUp className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Risk Score Progress</CardTitle>
                        <CardDescription>Visualize how your diabetes risk score has changed over time.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis yAxisId="left" domain={[0, 100]} stroke="hsl(var(--primary))" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="Risk Score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
        <Card className="shadow-lg border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Weight className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">BMI Progress</CardTitle>
                        <CardDescription>Track changes in your Body Mass Index (BMI) over time.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--accent))" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="BMI" stroke="hsl(var(--accent))" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


const LoadingSkeleton = () => (
    <div className="space-y-8">
        <Card className="shadow-lg">
            <CardHeader>
                <Skeleton className="h-8 w-1/3 rounded-lg" />
                <Skeleton className="h-5 w-2/3 rounded-lg" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-96 w-full rounded-xl" />
            </CardContent>
        </Card>
    </div>
)
