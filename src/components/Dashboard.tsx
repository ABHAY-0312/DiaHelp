
"use client";

import { useState, useEffect, useCallback } from "react";
import type { HealthFormData, AnalysisResult, PredictionRecord, HealthLogRecord, HealthTip } from "@/lib/types";
import { savePrediction, getPredictionHistory, getHealthLogs, getQuizHistory } from "@/lib/firebase/firestore";
import { HealthInputForm } from "@/components/HealthInputForm";
import { RiskAnalysis } from "@/components/RiskAnalysis";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { History, LayoutDashboard, LogOut, UtensilsCrossed, Moon, Sun, Notebook, TrendingUp, Database, Menu, Salad, HeartPulse, FlaskConical, Home, GraduationCap, Hospital, LifeBuoy, BrainCircuit } from "lucide-react";
import { PredictionHistory } from "./PredictionHistory";
import { MealAnalyzer } from "./MealAnalyzer";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { HealthLog } from "./HealthLog";
import { ProgressTracker } from "./ProgressTracker";
import { DatasetAnalyzer } from "./DatasetAnalyzer";
import { NutritionHub } from "./NutritionHub";
import { WellnessHub } from "./WellnessHub";
import { EmergencyAlertDialog } from "./EmergencyAlertDialog";
import { ResearchHub } from "./ResearchHub";
import { DashboardSummary } from "./DashboardSummary";
import { HealthLiteracyHub } from "./HealthLiteracyHub";
import { CareFinder } from "./CareFinder";
import ContactUsPage from "./ContactUsPage";
import { Footer } from "./Footer";
import type { GenerateReportInput, GenerateReportOutput } from "@/app/api/generate-report/route";
import { DigitalTwin } from "./DigitalTwin";

const calculateRisk = (data: Partial<HealthFormData>): { riskScore: number; shapValues: { name: string; value: number }[] } => {
    const { age = 40, gender = 'female', bmi = 25, waistCircumference = 90, fastingGlucose = 100, hba1c = 5.5, fastingInsulin = 10, triglycerides = 150, hdlCholesterol = 50, bloodPressure = 80, familyHistory = 'no', sleepHours = 7, physicalActivity = 'moderate', stressLevel = 'medium' } = data;

    if (!data.age || !data.bmi || !data.fastingGlucose || !data.hba1c) {
        return { riskScore: 0, shapValues: [] };
    }
    
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    const weights = {
        base: -8.5, hba1c: 4.8, fastingGlucose: 3.2, age: 2.9, bmi: 2.6, waistCircumference: 2.3, triglycerides: 2.0,
        hdlCholesterol: -1.8, bloodPressure: 1.4, familyHistory: 1.7, fastingInsulin: 1.2, physicalActivity: -1.4,
        stressLevel: 0.9, sleepHours: -0.7, gender: 0.5
    };

    const norms = {
        hba1c: { mean: 5.7, std: 1.0 }, glucose: { mean: 100, std: 25 }, age: { mean: 50, std: 15 }, bmi: { mean: 27.5, std: 5 },
        waist: { mean: 98, std: 12 }, trig: { mean: 150, std: 40 }, hdl: { mean: 50, std: 10 }, bp: { mean: 80, std: 15 },
        insulin: { mean: 12, std: 8 }, sleep: { mean: 7.5, std: 1 }
    };
    
    const standardize = (val: number, { mean, std }: { mean: number, std: number }) => (val - mean) / std;

    const familyHistoryImpact = familyHistory === 'parent' ? 1.0 : familyHistory === 'grandparent' ? 0.5 : 0;
    const activityImpact = physicalActivity === 'sedentary' ? 1.0 : physicalActivity === 'light' ? 0.4 : physicalActivity === 'moderate' ? -0.6 : -1.2;
    const stressImpact = stressLevel === 'high' ? 1.0 : stressLevel === 'medium' ? 0.3 : -0.7;
    const genderImpact = gender === 'male' ? 1.0 : 0;
    const sleepImpact = standardize(sleepHours, norms.sleep);

    const shapValues: { name: string; value: number }[] = [];
    shapValues.push({ name: 'HbA1c', value: standardize(hba1c, norms.hba1c) * weights.hba1c });
    shapValues.push({ name: 'Fasting Glucose', value: standardize(fastingGlucose, norms.glucose) * weights.fastingGlucose });
    shapValues.push({ name: 'Age', value: standardize(age, norms.age) * weights.age });
    shapValues.push({ name: 'BMI', value: standardize(bmi, norms.bmi) * weights.bmi });
    shapValues.push({ name: 'Waist Circumference', value: standardize(waistCircumference, norms.waist) * weights.waistCircumference });
    shapValues.push({ name: 'Triglycerides', value: standardize(triglycerides, norms.trig) * weights.triglycerides });
    shapValues.push({ name: 'HDL Cholesterol', value: standardize(hdlCholesterol, norms.hdl) * weights.hdlCholesterol });
    shapValues.push({ name: 'Blood Pressure', value: standardize(bloodPressure, norms.bp) * weights.bloodPressure });
    shapValues.push({ name: 'Fasting Insulin', value: standardize(fastingInsulin, norms.insulin) * weights.fastingInsulin });
    shapValues.push({ name: 'Family History', value: familyHistoryImpact * weights.familyHistory });
    shapValues.push({ name: 'Physical Activity', value: activityImpact * weights.physicalActivity });
    shapValues.push({ name: 'Stress Level', value: stressImpact * weights.stressLevel });
    shapValues.push({ name: 'Sleep Hours', value: sleepImpact * weights.sleepHours });
    shapValues.push({ name: 'Gender', value: genderImpact * weights.gender });

    const logOdds = weights.base + shapValues.reduce((acc, curr) => acc + curr.value, 0);
    const score = sigmoid(logOdds) * 100;
    
    shapValues.unshift({ name: 'Baseline', value: weights.base });

    return { riskScore: Math.max(5, Math.min(95, Math.round(score))), shapValues };
};


export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PredictionRecord | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionRecord[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRecord[]>([]);
  const [healthTip, setHealthTip] = useState<HealthTip | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [view, setView] = useState<string>("summary");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();

  const fetchData = useCallback(async (viewToFetch: string) => {
    if (!user) return;
    setIsDataLoading(true);
    try {
        if (viewToFetch === 'summary') {
            const [history, logs] = await Promise.all([
                getPredictionHistory(user.uid),
                getHealthLogs(user.uid),
            ]);
            setPredictionHistory(history);
            setHealthLogs(logs);
            if (history.length > 0 && !analysisResult) {
                setAnalysisResult(history[0]);
            }
        } else if (viewToFetch === 'history' || viewToFetch === 'progress') {
             const history = await getPredictionHistory(user.uid);
             setPredictionHistory(history);
        } else if (viewToFetch === 'healthLog') {
             const logs = await getHealthLogs(user.uid);
             setHealthLogs(logs);
        }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
       const errorMessage = error.message || "";
        if (errorMessage.includes("429")) {
             toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch your data. Please try again later.",
            });
        }
    } finally {
      setIsDataLoading(false);
    }
  }, [user, toast, analysisResult]);

  useEffect(() => {
    async function fetchHealthTip() {
      try {
        const response = await fetch('/api/generate-health-tip');
        const tipData = await response.json();
        setHealthTip(tipData);
      } catch (error) {
        console.error("Could not fetch health tip", error);
        setHealthTip({ tip: "Staying hydrated is key! Try to drink at least 8 glasses of water a day."});
      }
    }
    fetchHealthTip();
  }, [])

  useEffect(() => {
    if (user) {
      fetchData(view);
    }
  }, [user, view, fetchData]);


  const handleSignOut = async () => {
    router.push('/logout');
  };

  const handleAnalysis = async (data: HealthFormData) => {
    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to assess risk." });
        return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setView('dashboard');

    const { riskScore, shapValues } = calculateRisk(data);
    const confidenceScore = Math.round(85 + (Math.abs(riskScore - 50) / 50) * 15);
    const keyFactors = getKeyFactors(shapValues);
    const healthSuggestions = getHealthSuggestions(keyFactors, data);

    try {
      const reportInput: GenerateReportInput = {
        patientName: user?.displayName || 'Patient',
        riskScore: Math.round(riskScore),
        confidenceScore: confidenceScore,
        keyFactors: keyFactors.map(f => f.name),
        healthSuggestions: healthSuggestions,
      };

      const aiResponse = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportInput),
      });

      if (!aiResponse.ok) {
        throw new Error(await aiResponse.text());
      }
      
      const aiResult: GenerateReportOutput = await aiResponse.json();

      const result: PredictionRecord = {
        id: `temp-${Date.now()}`,
        userId: user.uid,
        patientName: user?.displayName || 'Patient',
        riskScore: Math.round(riskScore),
        confidenceScore: confidenceScore,
        keyFactors: keyFactors,
        shapValues: shapValues,
        report: aiResult.report,
        healthSuggestions: healthSuggestions,
        formData: data,
        createdAt: new Date() as any, // Temporary client-side date
      };

      setAnalysisResult(result);
      await savePrediction(user.uid, data, result);
      await fetchData('history'); 

    } catch (error: any) {
        console.error("Error during analysis:", error);
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
                description: "The analysis service is currently experiencing high demand. Please try again in a moment.",
            });
        } else {
             toast({
                  variant: "destructive",
                  title: "Analysis Failed",
                  description: "There was an error generating your report. Please try again.",
              });
        }
    } finally {
      setIsLoading(false);
    }
  };

  
  const getKeyFactors = (shapValues: { name: string; value: number }[]): { name: string; value: number }[] => {
    return shapValues
        .filter(f => f.name !== 'Baseline')
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 3)
        .map(f => ({ name: f.name, value: f.value }));
  };

  const getHealthSuggestions = (keyFactors: { name: string; value: number }[], data: HealthFormData): string[] => {
    const suggestions: string[] = ["Engage in at least 30 minutes of moderate exercise most days of the week."];
    const factorNames = keyFactors.map(f => f.name);
    
    if (factorNames.includes("HbA1c") || factorNames.includes("Fasting Glucose")) {
        suggestions.push("Monitor carbohydrate intake and choose whole grains over refined carbs.");
    }
    if (factorNames.includes("BMI") || factorNames.includes("Waist Circumference")) {
        suggestions.push("Focus on a balanced diet with plenty of fruits, vegetables, and lean protein to manage weight.");
    }
    if (factorNames.includes("Blood Pressure")) {
        suggestions.push("Reduce sodium intake and manage stress through techniques like meditation or yoga.");
    }
    if (factorNames.includes("Sleep Hours")) {
        suggestions.push("Aim for 7-8 hours of consistent, quality sleep per night and establish a relaxing bedtime routine.");
    }
    if (factorNames.includes("Triglycerides") || factorNames.includes("HDL Cholesterol")) {
        suggestions.push("Incorporate healthy fats like avocados, nuts, and olive oil into your diet.");
    }

    return suggestions.slice(0, 3);
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "P";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0][0];
  }

  const handleSetView = (newView: string) => {
    setView(newView);
    setIsSheetOpen(false); 
  };
  
  const renderContent = () => {
    switch (view) {
        case 'summary':
            return <DashboardSummary history={predictionHistory} logs={healthLogs} tip={healthTip} isLoading={isDataLoading} setView={setView} />
        case 'dashboard':
            return (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    <div>
                        <HealthInputForm 
                            onSubmit={handleAnalysis} 
                            isLoading={isLoading}
                         />
                    </div>
                    <div>
                        <RiskAnalysis 
                            user={user} 
                            result={analysisResult} 
                            isLoading={isLoading} 
                            onCalculateRisk={calculateRisk}
                        />
                    </div>
                </div>
            )
        case 'history':
            return (
                <PredictionHistory 
                    history={predictionHistory} 
                    isLoading={isDataLoading} 
                    onSelectPrediction={(pred) => {
                        setAnalysisResult(pred);
                        setView('dashboard');
                    }} 
                />
            )
        case 'mealAnalyzer':
            return <MealAnalyzer />
        case 'healthLog':
            return <HealthLog logs={healthLogs} setLogs={setHealthLogs} />
        case 'progress':
            return <ProgressTracker history={predictionHistory} isLoading={isDataLoading} />
        case 'datasetAnalyzer':
            return <DatasetAnalyzer onCalculateRisk={calculateRisk} />
        case 'nutritionHub':
            return <NutritionHub latestResult={analysisResult} />
        case 'wellnessHub':
            return <WellnessHub latestResult={analysisResult} />
        case 'researchHub':
            return <ResearchHub />
        case 'literacyHub':
            return <HealthLiteracyHub />
        case 'careFinder':
            return <CareFinder />
        case 'contact':
            return <ContactUsPage />
        case 'digitalTwin':
            return <DigitalTwin latestResult={analysisResult} />
        default:
            return null;
    }
  }

  const NavButton = ({ currentView, view: buttonView, setView: setViewFunc, children, className }: {currentView: string, view: string, setView: (view: string) => void, children: React.ReactNode, className?: string}) => (
    <Button variant={currentView === buttonView ? 'secondary' : 'ghost'} onClick={() => setViewFunc(buttonView)} className={cn('w-full justify-start gap-3 pl-4 text-base', currentView === buttonView && 'font-bold text-primary', className)}>
        {children}
    </Button>
  );

  const NavGroup = ({ title }: { title: string }) => (
      <h4 className="px-4 mt-4 mb-1 text-sm font-semibold text-muted-foreground tracking-wider uppercase">{title}</h4>
  );
  
  const NavMenu = () => {
    return (
         <nav className="grid items-start text-sm font-medium gap-1 py-4">
            <NavGroup title="Main" />
            <NavButton currentView={view} view="summary" setView={handleSetView}>
                <Home className="h-5 w-5" />
                Summary
            </NavButton>
            <NavButton currentView={view} view="dashboard" setView={handleSetView}>
                <LayoutDashboard className="h-5 w-5" />
                New Assessment
            </NavButton>
            <NavButton currentView={view} view="history" setView={handleSetView}>
                <History className="h-5 w-5" />
                History
            </NavButton>
             <NavButton currentView={view} view="healthLog" setView={handleSetView}>
                <Notebook className="h-5 w-5" />
                Health Log
            </NavButton>
            
            <NavGroup title="AI Hubs" />
            <NavButton currentView={view} view="nutritionHub" setView={handleSetView}>
                <Salad className="h-5 w-5" />
                Nutrition Hub
            </NavButton>
            <NavButton currentView={view} view="wellnessHub" setView={handleSetView}>
                <HeartPulse className="h-5 w-5" />
                Wellness Hub
            </NavButton>
             <NavButton currentView={view} view="literacyHub" setView={handleSetView}>
                <GraduationCap className="h-5 w-5" />
                Health Literacy
            </NavButton>
             <NavButton currentView={view} view="digitalTwin" setView={handleSetView}>
                <BrainCircuit className="h-5 w-5" />
                Digital Twin
            </NavButton>

            <NavGroup title="Tools" />
            <NavButton currentView={view} view="mealAnalyzer" setView={handleSetView}>
                <UtensilsCrossed className="h-5 w-5" />
                Meal Analyzer
            </NavButton>
             <NavButton currentView={view} view="progress" setView={handleSetView}>
                <TrendingUp className="h-5 w-5" />
                Progress Tracker
            </NavButton>
             <NavButton currentView={view} view="careFinder" setView={handleSetView}>
                <Hospital className="h-5 w-5" />
                Care Finder
            </NavButton>

            <NavGroup title="Advanced" />
            <NavButton currentView={view} view="datasetAnalyzer" setView={handleSetView}>
                <Database className="h-5 w-5" />
                Dataset Analyzer
            </NavButton>
            <NavButton currentView={view} view="researchHub" setView={handleSetView}>
                <FlaskConical className="h-5 w-5" />
                Research Hub
            </NavButton>
            
            <div className="my-4 border-t border-border/50"></div>

             <NavButton currentView={view} view="contact" setView={handleSetView}>
                <LifeBuoy className="h-5 w-5" />
                Contact Us
            </NavButton>
        </nav>
    )
  }


  return (
    <>
    <EmergencyAlertDialog 
        isOpen={false}
        onClose={() => {}}
        alertData={null}
    />
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <Logo className="h-6 w-6 text-primary" />
              <span className="">DiaHelper</span>
            </a>
          </div>
          <div className="flex-1 overflow-y-auto">
             <NavMenu />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <a
                        href="#"
                        className="flex items-center gap-2 font-semibold"
                    >
                        <Logo className="h-6 w-6 text-primary" />
                        <SheetTitle>DiaHelper</SheetTitle>
                    </a>
                </div>
                <div className="overflow-y-auto">
                    <NavMenu />
                </div>
            </SheetContent>
          </Sheet>

           <div className="w-full flex-1">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
           </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback>{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8 bg-secondary/40 overflow-y-auto">
            {renderContent()}
        </main>
      </div>
    </div>
    </>
  );
}

    