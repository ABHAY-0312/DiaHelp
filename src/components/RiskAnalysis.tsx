
"use client";

import type { PredictionRecord } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell, CartesianGrid } from "recharts";
import { Button } from "./ui/button";
import { Download, FileText, Bot, MessageSquare, Activity, ArrowDown, ArrowUp, CalendarClock, Loader2 } from "lucide-react";
import { Chatbot } from "./Chatbot";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { User } from "firebase/auth";
import type { GenerateTimelineOutput, GenerateTimelineInput } from "@/app/api/generate-timeline/route";
import { saveHealthTimeline, getHealthTimeline } from "@/lib/firebase/firestore";
import type { HealthTimelineRecord } from "@/lib/types";


interface RiskAnalysisProps {
  user: User | null;
  result: PredictionRecord | null;
  isLoading: boolean;
  onCalculateRisk: (data: any) => { riskScore: number; shapValues: { name: string; value: number }[] };
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

const HealthTimeline = ({ user, result, isPdfMode, timelineData, setTimelineData, isLoading, setIsLoading }: { user: User, result: PredictionRecord, isPdfMode?: boolean, timelineData: GenerateTimelineOutput | HealthTimelineRecord | null, setTimelineData: (data: GenerateTimelineOutput | HealthTimelineRecord | null) => void, isLoading: boolean, setIsLoading: (loading: boolean) => void }) => {
    const { toast } = useToast();
    const hasFetched = useRef(false);

    const fetchExistingTimeline = useCallback(async () => {
        if (!user || !result.id) return;
        setIsLoading(true);
        try {
            const existingTimeline = await getHealthTimeline(user.uid, result.id);
            if (existingTimeline) {
                setTimelineData(existingTimeline);
            }
        } catch (error) {
            console.error("Error fetching existing timeline", error);
        } finally {
            setIsLoading(false);
            hasFetched.current = true;
        }
    }, [user, result.id, setIsLoading, setTimelineData]);

    useEffect(() => {
        if (!timelineData && !hasFetched.current) {
            fetchExistingTimeline();
        }
    }, [fetchExistingTimeline, timelineData]);

    const handleGenerateTimeline = useCallback(async () => {
        setIsLoading(true);
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
            await saveHealthTimeline(user.uid, result.id, responseData);

        } catch (error: any) {
            console.error("Error generating timeline:", error);
            const errorMessage = error.message || "";
            if (errorMessage.includes("429")) {
                toast({
                    variant: "destructive",
                    title: "AI Service Rate Limited",
                    description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
                });
            } else if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
                toast({
                    variant: "destructive",
                    title: "AI Service Busy",
                    description: "The timeline generator is currently experiencing high demand. Please try again in a moment.",
                });
            } else {
                toast({ variant: "destructive", title: "Timeline Error", description: "Could not generate the health timeline. Please try again." });
            }
        } finally {
            setIsLoading(false);
        }
    }, [result, user, toast, setIsLoading, setTimelineData]);

    if (isLoading && !isPdfMode) {
        return (
             <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
                <Loader2 className="w-8 h-8 mr-4 animate-spin text-primary" />
                <span className="text-lg font-medium">Loading timeline data...</span>
            </div>
        )
    }
    
    if (!timelineData) {
         return (
             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h4 className="text-lg font-semibold">Predict Your Future Health</h4>
                <p className="text-sm text-muted-foreground mt-1 mb-4">See a potential timeline of your health based on your current data if no lifestyle changes are made.</p>
                <Button onClick={handleGenerateTimeline} disabled={isLoading}>
                    <Bot className="mr-2 h-4 w-4" /> Generate Timeline
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {timelineData.timeline.map((event, index) => (
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

const getRiskCategory = (score: number) => {
    if (score > 70) return "High Risk";
    if (score > 40) return "Medium Risk";
    return "Low Risk";
}

const clinicalInputsConfig = [
    { key: 'age', label: 'Age', unit: 'years', norm: 'N/A' },
    { key: 'gender', label: 'Gender', unit: '', norm: 'N/A' },
    { key: 'bmi', label: 'BMI', unit: '', norm: '18.5 - 24.9' },
    { key: 'waistCircumference', label: 'Waist Circumference', unit: 'cm', norm: '&lt; 94 (Male), &lt; 80 (Female)' },
    { key: 'fastingGlucose', label: 'Fasting Glucose', unit: 'mg/dL', norm: '70 - 100' },
    { key: 'hba1c', label: 'HbA1c', unit: '%', norm: '&lt; 5.7' },
    { key: 'fastingInsulin', label: 'Fasting Insulin', unit: 'muU/mL', norm: '2.6 - 24.9' },
    { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', norm: '&lt; 150' },
    { key: 'hdlCholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', norm: '&gt; 40 (Male), &gt; 50 (Female)' },
    { key: 'bloodPressure', label: 'Diastolic BP', unit: 'mmHg', norm: '&lt; 80' },
    { key: 'familyHistory', label: 'Family History', unit: '', norm: 'No' },
    { key: 'sleepHours', label: 'Sleep Hours', unit: 'hrs/night', norm: '7 - 9' },
    { key: 'physicalActivity', label: 'Physical Activity', unit: '', norm: 'Moderate to Active' },
    { key: 'stressLevel', label: 'Stress Level', unit: '', norm: 'Low' },
] as const;


export function RiskAnalysis({ user, result, isLoading }: RiskAnalysisProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfRenderMode, setIsPdfRenderMode] = useState(false);
  const [timelineData, setTimelineData] = useState<GenerateTimelineOutput | HealthTimelineRecord | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Clear timeline data when the main result changes
    setTimelineData(null);
  }, [result]);

  const generatePdf = async () => {
    if (!printRef.current) {
        toast({ variant: "destructive", title: "Download Error", description: "Could not prepare the report for download." });
        setIsDownloading(false);
        setIsPdfRenderMode(false);
        return;
    }

    try {
        const reportElement = printRef.current;
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        if (!imgData || imgData === 'data:,') {
            throw new Error("Canvas returned empty image data.");
        }
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`DiaHelper-Report-${result!.patientName.replace(' ', '_')}.pdf`);

    } catch (error: any) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: `There was an error creating the PDF file: ${error.message}`,
        });
    } finally {
        setIsDownloading(false);
        setIsPdfRenderMode(false); // Unmount the hidden component
    }
  };
  
  useEffect(() => {
      if (isPdfRenderMode) {
          const timer = setTimeout(generatePdf, 1000); // Wait 1 sec for render
          return () => clearTimeout(timer);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdfRenderMode]);


  const handleDownloadPdf = async () => {
    if (!user || !result) {
        toast({
            variant: "destructive",
            title: "Download Error",
            description: "Report content is not available.",
        });
        return;
    }

    setIsDownloading(true);
    
    // Ensure timeline data is loaded before rendering for PDF
    if (!timelineData && result.id) {
        try {
            const existingTimeline = await getHealthTimeline(user.uid, result.id);
            if (existingTimeline) {
                setTimelineData(existingTimeline);
            } else {
                 toast({ title: "Timeline Info", description: "Fetching timeline for PDF. This may take a moment."});
            }
        } catch (e) {
             toast({ variant: "destructive", title: "Timeline Error", description: "Could not fetch timeline for PDF." });
             setIsDownloading(false);
             return;
        }
    }

    setIsPdfRenderMode(true);
  };


  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!result || !user) {
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

  const getResultDate = (result: PredictionRecord): Date => {
    if (result.createdAt && typeof (result.createdAt as any).toDate === 'function') {
        return (result.createdAt as any).toDate();
    }
    if (result.createdAt instanceof Date) {
        return result.createdAt;
    }
    return new Date();
  }

  const resultDate = getResultDate(result);

  return (
    <>
    <Card className="w-full h-full overflow-hidden shadow-lg border-primary/20">
        <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Risk Assessment for {result.patientName}</CardTitle>
            <CardDescription>Generated on {resultDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
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
            
            <Tabs defaultValue="report" className="w-full">
                <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="report"><Bot className="mr-2 h-4 w-4"/> AI Report</TabsTrigger>
                    <TabsTrigger value="suggestions"><Activity className="mr-2 h-4 w-4"/> Suggestions</TabsTrigger>
                    <TabsTrigger value="timeline"><CalendarClock className="mr-2 h-4 w-4"/> Timeline</TabsTrigger>
                    <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4"/> Chat</TabsTrigger>
                </TabsList>
                <TabsContent value="report" className="mt-4">
                     <div className="p-5 border rounded-xl bg-secondary/50 prose prose-base max-w-none text-foreground prose-p:text-foreground prose-strong:text-foreground"
                         dangerouslySetInnerHTML={{ __html: result.report.replace(/\n\n/g, '<br/><br/>') }}
                    />
                </TabsContent>
                <TabsContent value="suggestions" className="mt-4">
                     <HealthSuggestions suggestions={result.healthSuggestions} />
                </TabsContent>
                <TabsContent value="timeline" className="mt-4">
                     <HealthTimeline user={user} result={result} timelineData={timelineData} setTimelineData={setTimelineData} isLoading={isTimelineLoading} setIsLoading={setIsTimelineLoading} />
                </TabsContent>
                <TabsContent value="chat" className="mt-4">
                    <Chatbot reportContext={result.report} formData={result.formData} />
                </TabsContent>
            </Tabs>
        </CardContent>
        <CardFooter className="px-6 pb-6 mt-4">
            <Button onClick={handleDownloadPdf} size="lg" className="w-full font-bold text-base" disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                {isDownloading ? 'Generating PDF...' : 'Download Report'}</Button>
        </CardFooter>
    </Card>

    {/* Hidden div for PDF generation */}
    {isPdfRenderMode && (
      <div className="fixed -left-[9999px] -top-[9999px]">
          <div id="pdf-report" ref={printRef} className="w-[800px] bg-background text-foreground p-8">
            {/* 1. Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary">Diabetes Risk Assessment Report</h1>
                <p className="text-lg">For: {result.patientName}</p>
                <p className="text-sm text-muted-foreground">Generated on: {resultDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* 2. Summary Overview */}
            <div className="mb-8 p-4 border rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Summary Overview</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Overall Risk Score</p>
                        <p className="text-4xl font-bold text-primary">{result.riskScore}/100</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="text-2xl font-bold">{getRiskCategory(result.riskScore)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Key Risk Drivers</p>
                        <ul className="text-sm font-semibold">{result.keyFactors.map(f => <li key={f.name}>{f.name}</li>)}</ul>
                    </div>
                </div>
            </div>
            
            {/* 3. Clinical Inputs */}
            <div className="mb-8 page-break-before">
                <h2 className="text-2xl font-semibold mb-4">Clinical Inputs Used</h2>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="p-2 text-left font-semibold">Parameter</th>
                                <th className="p-2 text-left font-semibold">Your Value</th>
                                <th className="p-2 text-left font-semibold">Normal Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clinicalInputsConfig.map(config => (
                                <tr key={config.key} className="border-b last:border-none">
                                    <td className="p-2">{config.label}</td>
                                    <td className="p-2 font-mono capitalize">{String(result.formData[config.key as keyof typeof result.formData])} {config.unit}</td>
                                    <td className="p-2 font-mono" dangerouslySetInnerHTML={{ __html: config.norm }}></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. AI Analysis */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">AI Analysis Section</h2>
                <div className="p-4 border rounded-lg mb-6 bg-secondary/30">
                    <h3 className="text-xl font-semibold mb-2">Risk Interpretation</h3>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: result.report.replace(/\n\n/g, '<br/><br/>') }} />
                </div>
                <div className="p-4 border rounded-lg bg-secondary/30">
                    <h3 className="text-xl font-semibold mb-2">Feature Contribution Chart</h3>
                    <p className="text-xs text-muted-foreground mb-2">This chart shows how much each factor pushed your score up (red) or down (green).</p>
                    <ShapAnalysisChart shapValues={result.shapValues} />
                </div>
            </div>

            {/* 5. Health Timeline */}
            <div className="mb-8 page-break-before">
                <h2 className="text-2xl font-semibold mb-4">Health Timeline Projection</h2>
                <HealthTimeline user={user} result={result} isPdfMode={true} timelineData={timelineData} setTimelineData={setTimelineData} isLoading={isTimelineLoading} setIsLoading={setIsTimelineLoading} />
            </div>

            {/* 6. Recommendations */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Personalized Recommendations</h2>
                <div className="p-4 border rounded-lg bg-secondary/30">
                    <p className="text-sm">Based on your profile, here are some actionable steps you can take to improve your health metrics and lower your risk. Check them off as you incorporate them into your routine.</p>
                    <div className="mt-4">
                        <HealthSuggestions suggestions={result.healthSuggestions} />
                    </div>
                </div>
            </div>

            {/* 7. Technical Appendix */}
            <div className="mb-8 page-break-before">
                <h2 className="text-2xl font-semibold mb-4">Technical Appendix</h2>
                <div className="p-4 border rounded-lg text-xs space-y-4 bg-secondary/30">
                    <div>
                        <h4 className="font-bold">Algorithm</h4>
                        <p>The risk score is calculated using a logistic regression model, which simulates the predictive power of ensemble methods like XGBoost. It weighs various health markers based on their known impact on diabetes risk.</p>
                    </div>
                    <div>
                        <h4 className="font-bold">Model Details</h4>
                        <p>The model uses standardized inputs (Z-scores) derived from clinical norms to ensure all factors are compared on a similar scale. The final output is a probability score (0-100) representing the estimated risk.</p>
                    </div>
                    <div>
                        <h4 className="font-bold">Preprocessing</h4>
                        <p>Categorical inputs like 'Family History' or 'Physical Activity' are converted into numerical values before being fed into the model. All inputs are validated to be within reasonable clinical ranges.</p>
                    </div>
                </div>
            </div>

            {/* 8. Disclaimer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                <p><strong>Disclaimer:</strong> This is a simulated prediction for educational and motivational purposes only and is not a real medical diagnosis. The risk score is an estimate based on a statistical model and does not replace a professional medical evaluation. Please consult with a qualified healthcare provider to discuss your results and for any medical advice.</p>
            </div>
          </div>
      </div>
    )}
    </>
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

