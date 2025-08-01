

"use client";

import { useState, useEffect, useCallback } from "react";
import type { HealthFormData, AnalysisResult, PredictionRecord, HealthLogRecord, HealthTip } from "@/lib/types";
import { savePrediction, getPredictionHistory, getHealthLogs, getQuizHistory } from "@/lib/firebase/firestore";
import { HealthInputForm } from "@/components/HealthInputForm";
import { RiskAnalysis } from "@/components/RiskAnalysis";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/Logo";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { History, LayoutDashboard, LogOut, UtensilsCrossed, Moon, Sun, Notebook, TrendingUp, Database, Menu, Salad, HeartPulse, FlaskConical, Home, GraduationCap, Hospital, LifeBuoy } from "lucide-react";
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

type View = "summary" | "dashboard" | "history" | "mealAnalyzer" | "healthLog" | "progress" | "datasetAnalyzer" | "nutritionHub" | "wellnessHub" | "researchHub" | "literacyHub" | "careFinder" | "contact";

const calculateRisk = (data: Partial<HealthFormData>): { riskScore: number; shapValues: { name: string; value: number }[] } => {
    const { age = 40, bmi = 25, glucose = 100, bloodPressure = 80, pregnancies = 0, skinThickness = 20, insulin = 80, diabetesPedigreeFunction = 0.4, sleepHours = 7 } = data;
    
    if (!data.age || !data.bmi || !data.glucose || !data.bloodPressure) {
        return { riskScore: 0, shapValues: [] };
    }

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

    const weights = {
        base: -5.5,
        glucose: 3.5,
        bmi: 3.2,
        age: 2.5,
        diabetesPedigreeFunction: 2.0,
        sleepQuality: 1.5,
        bloodPressure: 1.2,
        pregnancies: 0.7,
        insulin: 0.5,
        skinThickness: 0.3,
        glucose_bmi: 2.8,
        age_glucose: 1.8,
        bp_bmi: 1.0,
        age_squared: 0.8,
        glucose_squared: 1.0,
    };
    
    const norms = {
        glucose: { mean: 105, std: 30 },
        bmi: { mean: 28, std: 6 },
        age: { mean: 45, std: 18 },
        pedigree: { mean: 0.5, std: 0.4 },
        bloodPressure: { mean: 85, std: 20 },
        pregnancies: { mean: 3, std: 3 },
        skinThickness: { mean: 25, std: 12 },
        insulin: { mean: 100, std: 60 },
        sleepHours: { mean: 7, std: 1.5 },
    };

    const standardize = (val: number, mean: number, std: number) => (val - mean) / std;

    const stdGlucose = standardize(glucose, norms.glucose.mean, norms.glucose.std);
    const stdBmi = standardize(bmi, norms.bmi.mean, norms.bmi.std);
    const stdAge = standardize(age, norms.age.mean, norms.age.std);
    const stdPedigree = standardize(diabetesPedigreeFunction, norms.pedigree.mean, norms.pedigree.std);
    const stdBp = standardize(bloodPressure, norms.bloodPressure.mean, norms.bloodPressure.std);
    const stdPregnancies = standardize(pregnancies, norms.pregnancies.mean, norms.pregnancies.std);
    const stdSkinThickness = standardize(skinThickness, norms.skinThickness.mean, norms.skinThickness.std);
    const stdInsulin = standardize(insulin, norms.insulin.mean, norms.insulin.std);
    
    const sleepDeviation = Math.abs(sleepHours - norms.sleepHours.mean);
    const sleepImpact = (sleepDeviation / norms.sleepHours.std);

    const shapValues: { name: string; value: number }[] = [];
    shapValues.push({ name: 'Glucose', value: stdGlucose * weights.glucose + Math.pow(stdGlucose, 2) * weights.glucose_squared });
    shapValues.push({ name: 'BMI', value: stdBmi * weights.bmi });
    shapValues.push({ name: 'Age', value: stdAge * weights.age + Math.pow(stdAge, 2) * weights.age_squared });
    shapValues.push({ name: 'Sleep Quality', value: sleepImpact * weights.sleepQuality });
    shapValues.push({ name: 'Family History', value: stdPedigree * weights.diabetesPedigreeFunction });
    shapValues.push({ name: 'Blood Pressure', value: stdBp * weights.bloodPressure });
    shapValues.push({ name: 'Pregnancies', value: stdPregnancies * weights.pregnancies });
    shapValues.push({ name: 'Insulin', value: stdInsulin * weights.insulin});
    shapValues.push({ name: 'Skin Thickness', value: stdSkinThickness * weights.skinThickness });

    shapValues.push({ name: 'Glucose x BMI', value: stdGlucose * stdBmi * weights.glucose_bmi });
    shapValues.push({ name: 'Age x Glucose', value: stdAge * stdGlucose * weights.age_glucose });
    shapValues.push({ name: 'BP x BMI', value: stdBp * stdBmi * weights.bp_bmi });

    const logOdds = weights.base + shapValues.reduce((acc, curr) => acc + curr.value, 0);

    const score = sigmoid(logOdds) * 100;
    
    shapValues.unshift({ name: 'Baseline', value: weights.base });

    return { riskScore: Math.max(5, Math.min(95, Math.round(score))), shapValues };
};


export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionRecord[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLogRecord[]>([]);
  const [healthTip, setHealthTip] = useState<HealthTip | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [view, setView] = useState<View>("summary");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();

  const fetchData = useCallback(async (viewToFetch: View) => {
    if (!user) return;
    setIsDataLoading(true);
    try {
        if (viewToFetch === 'summary') {
            const [history, logs] = await Promise.all([
                getPredictionHistory(user.uid),
                getHealthLogs(user.uid),
            ]);
            // Health tip generation moved to a separate client-side fetch to avoid serverless timeouts
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

  // Separate effect for the health tip
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, view]);


  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
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
    const healthSuggestions = getHealthSuggestions(keyFactors);

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

      const result: AnalysisResult = {
        patientName: user?.displayName || 'Patient',
        riskScore: Math.round(riskScore),
        confidenceScore: confidenceScore,
        keyFactors: keyFactors,
        shapValues: shapValues,
        report: aiResult.report,
        healthSuggestions: healthSuggestions,
        formData: data,
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
        .filter(f => f.name !== 'Baseline' && !f.name.includes('x')) 
        .filter(f => f.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(f => ({ name: f.name, value: f.value }));
  };

  const getHealthSuggestions = (keyFactors: { name: string; value: number }[]): string[] => {
    const suggestions: string[] = ["Engage in at least 30 minutes of moderate exercise most days of the week."];
    const factorNames = keyFactors.map(f => f.name);
    
    if (factorNames.includes("Glucose")) {
        suggestions.push("Monitor carbohydrate intake and choose whole grains over refined carbs.");
    }
    if (factorNames.includes("BMI")) {
        suggestions.push("Focus on a balanced diet with plenty of fruits, vegetables, and lean protein to manage weight.");
    }
    if (factorNames.includes("Blood Pressure")) {
        suggestions.push("Reduce sodium intake and manage stress through techniques like meditation or yoga.");
    }
    if (factorNames.includes("Sleep Quality")) {
        suggestions.push("Aim for 7-8 hours of consistent, quality sleep per night and establish a relaxing bedtime routine.");
    }
    if (suggestions.length === 1) { 
        suggestions.push("Maintain a balanced diet and regular check-ups with your doctor.");
    }
    return suggestions;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "P";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0][0];
  }

  const handleSetView = (newView: View) => {
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
                        <RiskAnalysis user={user} result={analysisResult} isLoading={isLoading} />
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
        default:
            return null;
    }
  }

  const NavButton = ({ currentView, view, setView, children, className }: {currentView: View, view: View, setView: (view: View) => void, children: React.ReactNode, className?: string}) => (
    <Button variant={currentView === view ? 'secondary' : 'ghost'} onClick={() => setView(view)} className={cn('w-full justify-start gap-3 pl-4 text-base', currentView === view && 'font-bold text-primary', className)}>
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
