
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

const calculateRisk = (data: Partial<HealthFormData>): { riskScore: number; shapValues: { name: string; value: number }[] } => {
    const { 
        age = 40, 
        gender = 'female', 
        bmi = 25, 
        waistCircumference = 90, 
        fastingGlucose = 100, 
        hba1c = 5.5, 
        fastingInsulin = 10, 
        triglycerides = 150, 
        hdlCholesterol = 50, 
        bloodPressure = 80, 
        familyHistory = 'no', 
        sleepHours = 7, 
        physicalActivity = 'moderate', 
        stressLevel = 'medium' 
    } = data;

    // Return 0 for incomplete data instead of calculating with defaults
    if (!data.age || !data.bmi || !data.fastingGlucose || !data.hba1c) {
        console.log('⚠️ Incomplete data for risk calculation - returning 0:', { 
            hasAge: !!data.age, 
            hasBMI: !!data.bmi, 
            hasGlucose: !!data.fastingGlucose, 
            hasHbA1c: !!data.hba1c 
        });
        return { riskScore: 0, shapValues: [] };
    }

    console.log('🧮 Calculating risk with complete values:', { age, bmi, fastingGlucose, hba1c, familyHistory, physicalActivity });

    let riskScore = 15; // Base risk score
    const shapValues: { name: string; value: number }[] = [];

    // 🩸 HbA1c Analysis (Most Critical Factor - up to 40 points)
    let hba1cRisk = 0;
    let hba1cImpact = 0;
    if (hba1c < 5.7) {
        hba1cRisk = Math.max(0, (hba1c - 4.5) * 4); // 0-4.8 points for normal range
        hba1cImpact = hba1c - 5.0;
    } else if (hba1c < 6.5) {
        hba1cRisk = 5 + (hba1c - 5.7) * 25; // 5-25 points for prediabetic
        hba1cImpact = 5 + (hba1c - 5.7) * 15;
    } else {
        hba1cRisk = 30 + Math.min(40, (hba1c - 6.5) * 15); // 30-70 points for diabetic
        hba1cImpact = 20 + Math.min(25, (hba1c - 6.5) * 8);
    }
    riskScore += hba1cRisk;
    shapValues.push({ name: 'HbA1c', value: hba1cImpact });

    // 🍬 Fasting Glucose (up to 25 points)
    let glucoseRisk = 0;
    let glucoseImpact = 0;
    if (fastingGlucose < 100) {
        glucoseRisk = Math.max(0, (fastingGlucose - 85) * 0.2); // 0-3 points for normal
        glucoseImpact = (fastingGlucose - 90) * 0.1;
    } else if (fastingGlucose < 126) {
        glucoseRisk = 3 + (fastingGlucose - 100) * 0.6; // 3-18.6 points for prediabetic
        glucoseImpact = 2 + (fastingGlucose - 100) * 0.3;
    } else {
        glucoseRisk = 19 + Math.min(25, (fastingGlucose - 126) * 0.2); // 19-44 points for diabetic
        glucoseImpact = 10 + Math.min(15, (fastingGlucose - 126) * 0.1);
    }
    riskScore += glucoseRisk;
    shapValues.push({ name: 'Fasting Glucose', value: glucoseImpact });

    // 👥 Age Factor (up to 20 points)
    let ageRisk = 0;
    let ageImpact = 0;
    if (age < 35) {
        ageRisk = 0;
        ageImpact = -(45 - age) * 0.1;
    } else if (age < 45) {
        ageRisk = (age - 35) * 0.5; // 0-5 points
        ageImpact = (age - 40) * 0.2;
    } else if (age < 65) {
        ageRisk = 5 + (age - 45) * 0.4; // 5-13 points
        ageImpact = 1 + (age - 45) * 0.25;
    } else {
        ageRisk = 13 + Math.min(20, (age - 65) * 0.5); // 13-33 points
        ageImpact = 6 + Math.min(10, (age - 65) * 0.3);
    }
    riskScore += ageRisk;
    shapValues.push({ name: 'Age', value: ageImpact });

    // 🏋️ BMI Analysis (up to 15 points)
    let bmiRisk = 0;
    let bmiImpact = 0;
    if (bmi < 18.5) {
        bmiRisk = 3; // Underweight carries some risk
        bmiImpact = 1;
    } else if (bmi < 25) {
        bmiRisk = 0; // Optimal BMI
        bmiImpact = (bmi - 22.5) * 0.2;
    } else if (bmi < 30) {
        bmiRisk = (bmi - 25) * 1.5; // 0-7.5 points for overweight
        bmiImpact = 1 + (bmi - 25) * 0.8;
    } else if (bmi < 35) {
        bmiRisk = 7.5 + (bmi - 30) * 1.0; // 7.5-12.5 points for obese class I
        bmiImpact = 5 + (bmi - 30) * 1.2;
    } else {
        bmiRisk = 12.5 + Math.min(15, (bmi - 35) * 0.8); // 12.5-27.5 points for severe obesity
        bmiImpact = 11 + Math.min(8, (bmi - 35) * 0.6);
    }
    riskScore += bmiRisk;
    shapValues.push({ name: 'BMI', value: bmiImpact });

    // 👨‍👩‍👧‍👦 Family History (up to 12 points)
    let familyRisk = 0;
    let familyImpact = 0;
    if (familyHistory === 'parent') {
        familyRisk = 12; // Direct parent significantly increases risk
        familyImpact = 8;
    } else if (familyHistory === 'grandparent') {
        familyRisk = 6; // Grandparent moderately increases risk
        familyImpact = 3;
    } else {
        familyRisk = 0; // No family history
        familyImpact = -1;
    }
    riskScore += familyRisk;
    shapValues.push({ name: 'Family History', value: familyImpact });

    // 🏃 Physical Activity (can reduce risk by up to 8 points)
    let activityRisk = 0;
    let activityImpact = 0;
    if (physicalActivity === 'sedentary') {
        activityRisk = 8; // Significantly increases risk
        activityImpact = 5;
    } else if (physicalActivity === 'light') {
        activityRisk = 3; // Slightly increases risk
        activityImpact = 1;
    } else if (physicalActivity === 'moderate') {
        activityRisk = 0; // Neutral
        activityImpact = -1;
    } else { // active
        activityRisk = -3; // Reduces risk
        activityImpact = -4;
    }
    riskScore += activityRisk;
    shapValues.push({ name: 'Physical Activity', value: activityImpact });

    // ⚖️ Waist Circumference (up to 8 points)
    let waistRisk = 0;
    let waistImpact = 0;
    const waistThreshold = gender === 'male' ? 102 : 88; // WHO guidelines
    if (waistCircumference > waistThreshold) {
        const excess = waistCircumference - waistThreshold;
        waistRisk = Math.min(8, excess * 0.3); // Up to 8 points for excessive waist
        waistImpact = Math.min(5, excess * 0.2);
    } else {
        waistRisk = 0;
        waistImpact = -0.5;
    }
    riskScore += waistRisk;
    shapValues.push({ name: 'Waist Circumference', value: waistImpact });

    // Additional smaller factors
    // Triglycerides (up to 4 points)
    let trigRisk = triglycerides > 150 ? Math.min(4, (triglycerides - 150) * 0.02) : 0;
    riskScore += trigRisk;
    shapValues.push({ name: 'Triglycerides', value: triglycerides > 150 ? 2 + (triglycerides - 150) * 0.01 : -0.5 });

    // HDL Cholesterol (protective factor, can reduce by up to 3 points)
    const hdlThreshold = gender === 'male' ? 40 : 50;
    let hdlRisk = hdlCholesterol < hdlThreshold ? 3 : Math.max(-2, (hdlThreshold - hdlCholesterol) * 0.1);
    riskScore += hdlRisk;
    shapValues.push({ name: 'HDL Cholesterol', value: hdlCholesterol < hdlThreshold ? 2 : -1 });

    // Blood Pressure (up to 5 points)
    let bpRisk = bloodPressure > 90 ? Math.min(5, (bloodPressure - 90) * 0.2) : 0;
    riskScore += bpRisk;
    shapValues.push({ name: 'Blood Pressure', value: bloodPressure > 90 ? 1 + (bloodPressure - 90) * 0.05 : -0.5 });

    // Fasting Insulin (up to 4 points)
    let insulinRisk = fastingInsulin > 15 ? Math.min(4, (fastingInsulin - 15) * 0.15) : 0;
    riskScore += insulinRisk;
    shapValues.push({ name: 'Fasting Insulin', value: fastingInsulin > 15 ? 1 + (fastingInsulin - 15) * 0.08 : 0 });

    // Gender (males typically 2-3 points higher risk)
    let genderRisk = gender === 'male' ? 3 : 0;
    riskScore += genderRisk;
    shapValues.push({ name: 'Gender', value: gender === 'male' ? 2 : 0 });

    // Sleep (poor sleep adds 2-3 points)
    let sleepRisk = Math.abs(sleepHours - 7.5) > 2 ? 2.5 : 0;
    riskScore += sleepRisk;
    shapValues.push({ name: 'Sleep Hours', value: Math.abs(sleepHours - 7.5) > 2 ? 1.5 : -0.3 });
    
    // Stress Level (up to 4 points)
    let stressRisk = 0;
    let stressImpact = 0;
    if (stressLevel === 'high') {
        stressRisk = 4;
        stressImpact = 3;
    } else if (stressLevel === 'medium') {
        stressRisk = 1;
        stressImpact = 0.5;
    } else {
        stressRisk = 0;
        stressImpact = -0.5;
    }
    riskScore += stressRisk;
    shapValues.push({ name: 'Stress Level', value: stressImpact });

    // Ensure realistic bounds (5% to 95%)
    const finalScore = Math.max(5, Math.min(95, Math.round(riskScore)));
    
    console.log('🎯 Risk calculation breakdown:', {
        baseRisk: 15,
        hba1cRisk: hba1cRisk.toFixed(1),
        glucoseRisk: glucoseRisk.toFixed(1),
        ageRisk: ageRisk.toFixed(1),
        bmiRisk: bmiRisk.toFixed(1),
        familyRisk: familyRisk.toFixed(1),
        activityRisk: activityRisk.toFixed(1),
        waistRisk: waistRisk.toFixed(1),
        totalBeforeBounds: riskScore.toFixed(1),
        finalScore
    });

    return { 
        riskScore: finalScore, 
        shapValues: [{ name: 'Baseline', value: 10 }, ...shapValues] 
    };
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
            // Only set analysisResult if we don't already have one
            if (history.length > 0 && !analysisResult) {
                console.log('📊 Setting initial analysis result from history:', history[0].riskScore);
                setAnalysisResult(history[0]);
            } else if (analysisResult) {
                console.log('📊 Preserving existing analysis result:', analysisResult.riskScore);
            }
        } else if (viewToFetch === 'history' || viewToFetch === 'progress') {
             const history = await getPredictionHistory(user.uid);
             setPredictionHistory(history);
        } else if (viewToFetch === 'healthLog') {
             const logs = await getHealthLogs(user.uid);
             setHealthLogs(logs);
        }
        // Important: Don't clear analysisResult when switching views
        console.log('🔄 View switched to:', viewToFetch, 'Current analysis result:', analysisResult?.riskScore || 'None');
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
            // Pass a safe risk calculation function that warns about usage
            const safeCalculateRisk = (data: Partial<HealthFormData>) => {
                console.log('⚠️ DatasetAnalyzer is calling calculateRisk with data:', Object.keys(data));
                return calculateRisk(data);
            };
            return <DatasetAnalyzer onCalculateRisk={safeCalculateRisk} />
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

    
