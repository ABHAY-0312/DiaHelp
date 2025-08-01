

"use client";

import type { AnalysisResult } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell, CartesianGrid } from "recharts";
import { Button } from "./ui/button";
import { Download, FileText, Bot, MessageSquare, Activity, ArrowDown, ArrowUp, CalendarClock, Loader2 } from "lucide-react";
import { Chatbot } from "./Chatbot";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { User } from "firebase/auth";
import type { GenerateTimelineOutput, GenerateTimelineInput } from "@/app/api/generate-timeline/route";


interface RiskAnalysisProps {
  user: User | null;
  result: AnalysisResult | null;
  isLoading: boolean;
}

const Watermark = ({ text }: { text: string }) => {
    return (
        <div className="absolute inset-0 grid-cols-3 grid-rows-4 gap-8 pointer-events-none z-10 overflow-hidden hidden print:grid">
            {[...Array(12)].map((_, i) => (
                 <div key={i} className="flex items-center justify-center -rotate-45 transform">
                    <p className="text-foreground/5 font-bold text-2xl whitespace-nowrap">{text}</p>
                 </div>
            ))}
        </div>
    )
}

const RiskScoreGauge = ({ score }: { score: number }) => {
  const scoreColor = score > 70 ? 'hsl(var(--destructive))' : score > 40 ? 'hsl(var(--accent))' : 'hsl(var(--chart-5))';
  const circumference = 2 * Math.PI * 55;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-56 h-56 mx-auto">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        <circle
          className="text-secondary"
          strokeWidth="12"
          stroke="currentColor"
          fill="transparent"
          r="54"
          cx="60"
          cy="60"
        />
        <circle
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={scoreColor}
          fill="transparent"
          r="54"
          cx="60"
          cy="60"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold" style={{ color: scoreColor }}>{score}</span>
        <span className="text-base font-medium text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
};


const HealthSuggestions = ({ suggestions }: { suggestions: string[] }) => {
    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                        <Checkbox id={`suggestion-${index}`} className="w-5 h-5"/>
                        <Label htmlFor={`suggestion-${index}`} className="text-sm font-medium leading-snug">
                            {suggestion}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    )
}

const ShapAnalysisChart = ({ shapValues }: { shapValues: { name: string; value: number }[] }) => {
  const positiveColor = "hsl(var(--destructive))";
  const negativeColor = "hsl(var(--chart-5))";

  // Add running total for waterfall chart
  let cumulative = 0;
  const data = shapValues.map(item => {
    const start = cumulative;
    cumulative += item.value;
    const end = cumulative;
    return { ...item, range: [start, end] };
  });

  return (
    <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                <Tooltip
                    cursor={{fill: 'hsl(var(--secondary))'}}
                    contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: any, name, props) => {
                        const shapValue = props.payload.value;
                        const sign = shapValue > 0 ? '+' : '';
                        return [`${sign}${shapValue.toFixed(2)}`, 'Contribution'];
                    }}
                />
                 <Legend
                    verticalAlign="top"
                    content={() => (
                        <div className="flex justify-center items-center gap-6 text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                               <ArrowUp className="w-4 h-4" style={{ color: positiveColor }}/> Increases Risk
                            </div>
                             <div className="flex items-center gap-2">
                                <ArrowDown className="w-4 h-4" style={{ color: negativeColor }}/> Decreases Risk
                            </div>
                        </div>
                    )}
                 />
                <Bar dataKey="range" barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? positiveColor : negativeColor} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

const HealthTimeline = ({ result }: { result: AnalysisResult }) => {
    const [timelineData, setTimelineData] = useState<GenerateTimelineOutput | null>(null);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerateTimeline = async () => {
        setIsTimelineLoading(true);
        setTimelineData(null);
        try {
            const timelineInput: GenerateTimelineInput = {
                riskScore: result.riskScore,
                keyFactors: result.keyFactors.map(f => f.name),
            };

            const response = await fetch('/api/generate-timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timelineInput),
            });
            
            if (!response.ok) {
              throw new Error(await response.text());
            }

            const responseData: GenerateTimelineOutput = await response.json();
            setTimelineData(responseData);
        } catch (error: any) {
            console.error("Error generating timeline:", error);
            const errorMessage = error.message || "";
            if (errorMessage.includes("429")) {
                toast({
                    variant: "destructive",
                    title: "AI Service Rate Limited",
                    description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
                });
            } else {
                toast({ variant: "destructive", title: "Timeline Error", description: "Could not generate the health timeline. Please try again." });
            }
        } finally {
            setIsTimelineLoading(false);
        }
    }

    if (!timelineData && !isTimelineLoading) {
        return (
             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h4 className="text-lg font-semibold">Predict Your Future Health</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-4">See a potential timeline of your health based on your current data if no lifestyle changes are made.</p>
                <Button onClick={handleGenerateTimeline}>
                    <Bot className="mr-2 h-4 w-4" /> Generate Timeline
                </Button>
            </div>
        )
    }

    if (isTimelineLoading) {
        return (
            <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
                <Loader2 className="w-8 h-8 mr-4 animate-spin text-primary" />
                <span className="text-lg font-medium">AI is generating your timeline...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {timelineData?.timeline.map((event, index) => (
                 <Alert key={index} className={cn(index === 0 && 'border-amber-400', index === 1 && 'border-orange-500', index === 2 && 'border-red-600')}>
                    <CalendarClock className="h-5 w-5" />
                    <AlertTitle className="font-bold text-lg">{event.timeframe}</AlertTitle>
                    <AlertDescription>
                       <p className="font-semibold mt-2">Prediction:</p>
                       <p>{event.prediction}</p>
                       <p className="font-semibold mt-3 text-primary">Suggestion:</p>
                       <p className="text-primary/90">{event.suggestion}</p>
                    </AlertDescription>
                </Alert>
            ))}
        </div>
    )
}


export function RiskAnalysis({ user, result, isLoading }: RiskAnalysisProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

   useEffect(() => {
    if (user) {
      const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
      setWatermarkText(`${user.displayName || user.email} - ${date}`);
    }
  }, [user]);

  const handleDownloadPdf = async () => {
    const reportElement = printRef.current;
    if (!reportElement) {
        toast({
            variant: "destructive",
            title: "Download Error",
            description: "Could not find the report content to download.",
        });
        return;
    }

    setIsDownloading(true);

    try {
        const canvas = await html2canvas(reportElement, {
            scale: 2, // Increase scale for better resolution
            useCORS: true,
            backgroundColor: null, // Use element's background
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('DiaHelper-Report.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "There was an error creating the PDF file.",
        });
    } finally {
        setIsDownloading(false);
    }
  };


  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!result) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-card/50 border-dashed shadow-none">
        <FileText className="w-20 h-20 text-muted-foreground/30 mb-6" />
        <h3 className="text-2xl font-semibold text-muted-foreground">Your Report Awaits</h3>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          Fill out the health profile form to generate your personalized risk assessment and get actionable insights.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full overflow-hidden shadow-lg border-primary/20">
        <div ref={printRef} className="relative printable-area">
            <Watermark text={watermarkText} />
            <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Risk Assessment for {result.patientName}</CardTitle>
                <CardDescription>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
                    <div className="lg:col-span-2">
                        <RiskScoreGauge score={result.riskScore} />
                    </div>
                    <div className="lg:col-span-3 w-full space-y-2">
                        <h4 className="text-xl font-semibold">Risk Factor Analysis</h4>
                        <p className="text-sm text-muted-foreground">How each factor contributes to your score.</p>
                       <ShapAnalysisChart shapValues={result.shapValues} />
                    </div>
                </div>
                
                <Tabs defaultValue="report" className="w-full no-print">
                    <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4">
                        <TabsTrigger value="report"><Bot className="mr-2 h-4 w-4"/> AI Report</TabsTrigger>
                        <TabsTrigger value="suggestions"><Activity className="mr-2 h-4 w-4"/> Suggestions</TabsTrigger>
                         <TabsTrigger value="timeline"><CalendarClock className="mr-2 h-4 w-4"/> Timeline</TabsTrigger>
                        <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4"/> Chat</TabsTrigger>
                    </TabsList>
                    <TabsContent value="report" className="mt-4">
                        <div className="p-5 border rounded-xl bg-secondary/50 prose prose-base max-w-none text-foreground prose-p:text-foreground prose-strong:text-foreground">
                            {result.report.split('\n\n').map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="suggestions" className="mt-4">
                         <HealthSuggestions suggestions={result.healthSuggestions} />
                    </TabsContent>
                    <TabsContent value="timeline" className="mt-4">
                         <HealthTimeline result={result} />
                    </TabsContent>
                    <TabsContent value="chat" className="mt-4">
                        <Chatbot reportContext={result.report} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </div>
        <CardFooter className="px-6 pb-6 mt-4 no-print">
            <Button onClick={handleDownloadPdf} size="lg" className="w-full font-bold text-base" disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                {isDownloading ? 'Generating PDF...' : 'Download Report'}
            </Button>
        </CardFooter>
    </Card>
  );
}

const LoadingSkeleton = () => (
    <Card className="w-full h-full">
      <CardHeader>
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-2">
                <Skeleton className="w-56 h-56 rounded-full mx-auto" />
            </div>
            <div className="lg:col-span-3 w-full space-y-4">
                <Skeleton className="h-7 w-1/3 rounded-lg" />
                <Skeleton className="h-5 w-full rounded-lg" />
                <div className="h-56 w-full space-y-4 pt-2">
                    <div className="flex items-center gap-4"><Skeleton className="h-7 w-1/4 rounded-lg" /><Skeleton className="h-7 flex-1 rounded-lg" /></div>
                    <div className="flex items-center gap-4"><Skeleton className="h-7 w-1/4 rounded-lg" /><Skeleton className="h-7 flex-1 rounded-lg" /></div>
                    <div className="flex items-center gap-4"><Skeleton className="h-7 w-1/4 rounded-lg" /><Skeleton className="h-7 flex-1 rounded-lg" /></div>
                </div>
            </div>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-7 w-1/3 rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-5 w-full rounded-lg" />
                <Skeleton className="h-5 w-full rounded-lg" />
                <Skeleton className="h-5 w-5/6 rounded-lg" />
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-12 w-full rounded-lg" />
      </CardFooter>
    </Card>
)
