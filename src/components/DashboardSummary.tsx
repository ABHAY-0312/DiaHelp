
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthLogRecord, HealthTip, PredictionRecord } from "@/lib/types";
import { ArrowRight, Lightbulb, TrendingUp, Notebook, LayoutDashboard, PlusCircle, AlertCircle, Salad, HeartPulse, FlaskConical, GraduationCap, Hospital } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from "date-fns";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import { Footer } from "./Footer";

interface DashboardSummaryProps {
  history: PredictionRecord[];
  logs: HealthLogRecord[];
  tip: HealthTip | null;
  isLoading: boolean;
  setView: (view: any) => void;
}

const getRiskBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score > 70) return "destructive";
    if (score > 40) return "secondary";
    return "default";
};
  
const getRiskBadgeLabel = (score: number): string => {
    if (score > 70) return "High Risk";
    if (score > 40) return "Medium Risk";
    return "Low Risk";
}

export function DashboardSummary({ history, logs, tip, isLoading, setView }: DashboardSummaryProps) {
  
  const latestPrediction = history.length > 0 ? history[0] : null;
  const latestLog = logs.length > 0 ? logs[0] : null;

  const chartData = history
    .slice(0, 7) // get last 7 entries
    .map(p => ({
      date: format(p.createdAt.toDate(), "MMM d"),
      "Risk Score": p.riskScore,
      "BMI": p.formData.bmi,
    }))
    .reverse();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
        <div className="flex-grow space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Health Summary</h1>
                    <p className="text-muted-foreground">A quick overview of your health journey.</p>
                </div>
                <Button onClick={() => setView('dashboard')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Assessment
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Lightbulb className="text-primary"/> AI Tip of the Day
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center font-medium text-lg leading-relaxed text-primary/90">"{tip?.tip || 'Stay hydrated!'}"</p>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp /> Recent Trends</CardTitle>
                        <CardDescription>Your risk score and BMI from the last 7 assessments.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-48">
                        {history.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="hsl(var(--primary))" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "var(--radius)",
                                        }}
                                    />
                                    <Line yAxisId="left" type="monotone" dataKey="Risk Score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="BMI" stroke="hsl(var(--accent))" strokeWidth={2} dot={false}/>
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <TrendingUp className="w-10 h-10 mb-2"/>
                                <p className="font-semibold">Not enough data for trends</p>
                                <p className="text-xs">Complete at least two assessments to see your progress.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Latest Assessment</CardTitle>
                        <CardDescription>
                            {latestPrediction ? `From ${format(latestPrediction.createdAt.toDate(), "MMMM dd, yyyy")}` : "No assessments yet."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {latestPrediction ? (
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="text-6xl font-bold text-primary">{latestPrediction.riskScore}</div>
                                <p className="text-muted-foreground">Risk Score</p>
                                <Badge variant={getRiskBadgeVariant(latestPrediction.riskScore)} className="mt-2 text-sm">{getRiskBadgeLabel(latestPrediction.riskScore)}</Badge>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <LayoutDashboard className="w-10 h-10 mb-2"/>
                                <p className="font-semibold">No assessments found</p>
                                <p className="text-xs">Click "New Assessment" to get your first report.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => setView('history')} disabled={!latestPrediction}>
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Most Recent Log</CardTitle>
                        <CardDescription>
                            {latestLog ? `From ${format(latestLog.date.toDate(), "MMMM dd, yyyy")}` : "No logs yet."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2 text-sm">
                        {latestLog ? (
                            <>
                            {latestLog.mood && <p><strong>Mood:</strong> <span className="capitalize">{latestLog.mood}</span></p>}
                            {latestLog.dietNotes && <p><strong>Diet:</strong> <span className="text-muted-foreground line-clamp-2">{latestLog.dietNotes}</span></p>}
                            {latestLog.exerciseNotes && <p><strong>Exercise:</strong> <span className="text-muted-foreground line-clamp-2">{latestLog.exerciseNotes}</span></p>}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <Notebook className="w-10 h-10 mb-2"/>
                                <p className="font-semibold">No logs found</p>
                                <p className="text-xs">Start a health log to track your progress.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => setView('healthLog')}>
                            View All Logs <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                <Card className="flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle className="text-lg">Need Assistance?</CardTitle>
                        <CardDescription>Explore our AI-powered hubs for personalized guidance and tools.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setView('nutritionHub')}><Salad className="mr-4 h-5 w-5"/> Nutrition Hub</Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setView('wellnessHub')}><HeartPulse className="mr-4 h-5 w-5"/> Wellness Hub</Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setView('literacyHub')}><GraduationCap className="mr-4 h-5 w-5"/> Health Literacy Hub</Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setView('careFinder')}><Hospital className="mr-4 h-5 w-5"/> Care Finder</Button>
                        <Button className="w-full justify-start" variant="secondary" onClick={() => setView('researchHub')}><FlaskConical className="mr-4 h-5 w-5"/> Research Hub</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="pt-6 flex justify-center">
            <Footer />
        </div>
    </div>
  );
}

const LoadingSkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                 <Skeleton className="h-9 w-64" />
                 <Skeleton className="h-5 w-80 mt-2" />
            </div>
             <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Skeleton className="h-40 lg:col-span-1" />
             <Skeleton className="h-40 lg:col-span-2" />
        </div>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Skeleton className="h-64" />
             <Skeleton className="h-64" />
             <Skeleton className="h-64" />
         </div>
    </div>
)

