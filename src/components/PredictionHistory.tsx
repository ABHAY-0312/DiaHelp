"use client";

import type { PredictionRecord } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Skeleton } from "./ui/skeleton";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from "./ui/button";
import { TrendingUp, FileClock } from "lucide-react";

interface PredictionHistoryProps {
  history: PredictionRecord[];
  isLoading: boolean;
  onSelectPrediction: (prediction: PredictionRecord) => void;
}

export function PredictionHistory({ history, isLoading, onSelectPrediction }: PredictionHistoryProps) {

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

  const chartData = history
    .map(p => ({
      date: format(p.createdAt.toDate(), "MMM dd, yyyy"),
      "Risk Score": p.riskScore,
    }))
    .reverse();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (history.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Prediction History</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-20">
            <FileClock className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold">No History Found</h3>
          <p className="text-sm mt-1">Submit a health assessment to start tracking your results.</p>
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
                    <CardTitle className="text-2xl">Risk Score Over Time</CardTitle>
                    <CardDescription>Visualize how your diabetes risk score has changed with each assessment.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
              <div className="h-96 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "0.875rem"}} />
                            <Line type="monotone" dataKey="Risk Score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
              </div>
          </CardContent>
      </Card>
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
             <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <FileClock className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <CardTitle className="text-2xl">Assessment History</CardTitle>
                    <CardDescription>Review your past diabetes risk assessments.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                <TableRow className="bg-secondary">
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Top Risk Factors</TableHead>
                    <TableHead className="text-right"></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {history.map((record) => (
                    <TableRow key={record.id} className="hover:bg-primary/5">
                    <TableCell className="font-medium">{format(record.createdAt.toDate(), "PPP")}</TableCell>
                    <TableCell className="font-semibold text-lg text-primary">{record.riskScore}</TableCell>
                    <TableCell>
                        <Badge variant={getRiskBadgeVariant(record.riskScore)} className="text-sm">
                        {getRiskBadgeLabel(record.riskScore)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.keyFactors.map(f => f.name).join(', ')}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => onSelectPrediction(record)}>
                            View Report
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
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
        <Card className="shadow-lg">
            <CardHeader>
                <Skeleton className="h-8 w-1/4 rounded-lg" />
                <Skeleton className="h-5 w-1/2 rounded-lg" />
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-14 w-full rounded-lg" />
                </div>
            </CardContent>
        </Card>
    </div>
)
