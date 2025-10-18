
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Dumbbell, Bot, AlertTriangle, Send, Activity } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { GenerateExercisePlanOutput, GenerateExercisePlanInput } from '@/app/api/generate-exercise-plan/route';
import type { GenerateMetabolicAgeOutput, GenerateMetabolicAgeInput } from '@/app/api/generate-metabolic-age/route';
import type { HealthAssistantChatOutput, HealthAssistantChatInput } from '@/app/api/health-assistant-chat/route';
import type { ModerateTextOutput } from '@/app/api/moderate-text/route';


interface WellnessHubProps {
  latestResult: AnalysisResult | null;
}

export function WellnessHub({ latestResult }: WellnessHubProps) {
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Dumbbell className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Wellness Hub</h1>
          <p className="text-muted-foreground">AI-powered tools for exercise and health knowledge.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
            <ExercisePlanGenerator latestResult={latestResult} fitnessLevel={fitnessLevel} setFitnessLevel={setFitnessLevel} />
            <MetabolicAgeCalculator latestResult={latestResult} fitnessLevel={fitnessLevel} />
        </div>
        <HealthAssistant />
      </div>
    </div>
  );
}

interface ExercisePlanGeneratorProps {
    latestResult: AnalysisResult | null;
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    setFitnessLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
}

function ExercisePlanGenerator({ latestResult, fitnessLevel, setFitnessLevel }: ExercisePlanGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [exercisePlan, setExercisePlan] = useState<GenerateExercisePlanOutput | null>(null);
  const { toast } = useToast();

  const handleGeneratePlan = async () => {
    if (!latestResult) {
      toast({
        variant: 'destructive',
        title: 'No Health Data',
        description: 'Please complete a risk assessment on the dashboard first.',
      });
      return;
    }
    setIsLoading(true);
    setExercisePlan(null);
    try {
      const planInput: GenerateExercisePlanInput = {
        age: latestResult.formData.age,
        bmi: latestResult.formData.bmi,
        fitnessLevel,
      };

      const response = await fetch('/api/generate-exercise-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planInput),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const plan: GenerateExercisePlanOutput = await response.json();
      setExercisePlan(plan);
    } catch (error: any) {
      console.error('Exercise plan error:', error);
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
               description: "The exercise planner is currently experiencing high demand. Please try again in a moment.",
           });
       } else {
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: 'Could not generate an exercise plan. Please try again.',
            });
       }
    } finally {
      setIsLoading(false);
    }
  };

  const DayCard = ({ day }: { day: GenerateExercisePlanOutput['dailyPlans'][0] }) => (
     <AccordionItem value={day.day}>
        <AccordionTrigger>
            <div className="flex items-center justify-between w-full pr-4">
                <span className="font-semibold text-base">{day.day}</span>
                <span className="text-sm text-primary font-medium">{day.focus}</span>
            </div>
        </AccordionTrigger>
        <AccordionContent>
            <p><span className='font-semibold'>Activity:</span> {day.activity}</p>
            <p><span className='font-semibold'>Duration:</span> {day.duration}</p>
        </AccordionContent>
     </AccordionItem>
  );

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell /> Personalized Exercise Plan
        </CardTitle>
        <CardDescription>
          Generate a 1-week sample exercise plan based on your latest health assessment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fitness-level">Select Your Fitness Level</Label>
           <Select onValueChange={(value: any) => setFitnessLevel(value)} defaultValue={fitnessLevel}>
              <SelectTrigger id="fitness-level">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
        </div>
        <Button onClick={handleGeneratePlan} disabled={isLoading || !latestResult} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate My Exercise Plan
        </Button>
        {!latestResult && (
          <p className="text-sm text-center text-destructive">
            Please complete a risk assessment on the dashboard to enable this feature.
          </p>
        )}
      </CardContent>

      {isLoading && <ExercisePlanSkeleton />}
      
      {exercisePlan && (
        <CardContent className="space-y-4">
          <Card className="bg-primary/5">
            <CardHeader>
                <CardTitle className="text-lg">Coach's Note</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-primary/90 font-medium">{exercisePlan.weeklySummary}</p>
            </CardContent>
          </Card>
           <Accordion type="single" collapsible className="w-full">
            {exercisePlan.dailyPlans.map((day) => (
                <DayCard key={day.day} day={day} />
            ))}
           </Accordion>
        </CardContent>
      )}
    </Card>
  );
}

function MetabolicAgeCalculator({ latestResult, fitnessLevel }: { latestResult: AnalysisResult | null, fitnessLevel: 'beginner' | 'intermediate' | 'advanced' }) {
    const [isLoading, setIsLoading] = useState(false);
    const [metabolicAgeResult, setMetabolicAgeResult] = useState<GenerateMetabolicAgeOutput | null>(null);
    const { toast } = useToast();

    const handleCalculateAge = async () => {
        if (!latestResult) {
            toast({
                variant: 'destructive',
                title: 'No Health Data',
                description: 'Please complete a risk assessment on the dashboard first.',
            });
            return;
        }
        setIsLoading(true);
        setMetabolicAgeResult(null);
        try {
            const metabolicAgeInput: GenerateMetabolicAgeInput = {
                actualAge: latestResult.formData.age,
                bmi: latestResult.formData.bmi,
                glucose: latestResult.formData.glucose,
                sleepHours: latestResult.formData.sleepHours || 7,
                fitnessLevel: fitnessLevel,
            };

            const response = await fetch('/api/generate-metabolic-age', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metabolicAgeInput),
            });

            if (!response.ok) {
              throw new Error(await response.text());
            }

            const result: GenerateMetabolicAgeOutput = await response.json();
            setMetabolicAgeResult(result);
        } catch (error: any) {
             console.error('Metabolic age error:', error);
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
                    description: "The metabolic age calculator is currently experiencing high demand. Please try again in a moment.",
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Calculation Failed',
                    description: 'Could not calculate your metabolic age. Please try again.',
                });
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="shadow-lg border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity /> Metabolic Age Calculator
                </CardTitle>
                <CardDescription>
                    Estimate your body's age based on your health metrics.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                 <Button onClick={handleCalculateAge} disabled={isLoading || !latestResult} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Calculate My Metabolic Age
                </Button>
                
                {isLoading && (
                    <div className="pt-4">
                        <Skeleton className="h-24 w-full" />
                    </div>
                )}

                {metabolicAgeResult && latestResult && (
                    <div className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Actual Age</p>
                                <p className="text-5xl font-bold">{latestResult.formData.age}</p>
                            </div>
                             <div>
                                <p className="text-sm text-primary">Metabolic Age</p>
                                <p className="text-5xl font-bold text-primary">{metabolicAgeResult.metabolicAge}</p>
                            </div>
                        </div>
                        <Card className="bg-primary/5 text-primary/90 text-sm font-medium p-4">
                             {metabolicAgeResult.explanation}
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


interface Message {
    id: string;
    type: 'user' | 'bot';
    text: string;
}

function HealthAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`;
        }
        return names[0][0];
    };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

    setIsLoading(true);

    try {
      const moderationResponse = await fetch('/api/moderate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToCheck: question }),
      });
      const moderationResult: ModerateTextOutput = await moderationResponse.json();

      if (!moderationResult.isAppropriate) {
        toast({
          variant: "destructive",
          title: "Inappropriate Content Detected",
          description: "Please keep your language respectful and focused on health topics.",
        });
        setInputValue('');
        setIsLoading(false);
        return;
      }

      const userMessage: Message = { id: Date.now().toString(), type: 'user', text: question };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      
      const chatInput: HealthAssistantChatInput = { question };
      const response = await fetch('/api/health-assistant-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatInput),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const responseData: HealthAssistantChatOutput = await response.json();
      const botMessage: Message = { id: (Date.now() + 1).toString(), type: 'bot', text: responseData.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Health assistant error:', error);
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
                description: "The health assistant is currently experiencing high demand. Please try again in a moment.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Chatbot Error',
                description: 'Sorry, I had trouble getting a response. Please try again.',
            });
        }
      setMessages((prev) => prev.filter((m) => m.text !== question));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-accent/20 sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> Health Assistant Chat
        </CardTitle>
        <CardDescription>Ask general questions about health, nutrition, and diabetes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border bg-card p-4 shadow-sm h-[600px] flex flex-col">
            <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
                {messages.length === 0 ? (
                    <div className="flex items-start gap-4 p-2">
                        <Avatar className="w-9 h-9 border-2 border-accent">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                                <Bot className="w-5 h-5 text-accent" />
                            </div>
                        </Avatar>
                        <div className="flex-1 rounded-lg bg-secondary p-4 text-sm shadow-sm">
                        <p className="font-medium">Hello! I'm your AI Health Assistant.</p>
                        <p className="text-muted-foreground mt-1">You can ask me questions like "What are the symptoms of high blood sugar?" or "What's a good source of fiber?".</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className={cn('flex items-start gap-4', message.type === 'user' && 'justify-end')}>
                            {message.type === 'bot' && (
                            <Avatar className="w-9 h-9 border-2 border-accent">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                                    <Bot className="w-5 h-5 text-accent" />
                                </div>
                            </Avatar>
                            )}
                            <div className={cn(
                                'flex-1 max-w-[85%] rounded-xl p-4 text-sm shadow-md',
                                message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                            )}>
                                <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                            </div>
                            {message.type === 'user' && (
                                <Avatar className="w-9 h-9">
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))
                )}
                {isLoading && messages.length > 0 && messages[messages.length-1].type === 'user' && (
                    <div className="flex items-start gap-4 p-2">
                        <Avatar className="w-9 h-9 border-2 border-accent">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                            <Loader2 className="w-5 h-5 text-accent animate-spin" />
                            </div>
                        </Avatar>
                        <div className="flex-1 rounded-lg bg-secondary p-4 text-sm shadow-sm">
                        <p className="font-medium">Thinking...</p>
                        </div>
                    </div>
                )}
            </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="mt-auto flex-shrink-0 pt-4">
                <div className="relative">
                    <Input
                        placeholder="Ask a health question..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="pr-12 h-12 rounded-lg"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md" disabled={isLoading || !inputValue}>
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Send</span>
                    </Button>
                </div>
            </form>
        </div>
      </CardContent>
    </Card>
  );
}

const ExercisePlanSkeleton = () => (
    <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    </CardContent>
);
