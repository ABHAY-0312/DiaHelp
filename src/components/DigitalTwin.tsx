
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, BrainCircuit, AlertCircle, Bot } from 'lucide-react';
import type { AnalysisResult, HealthFormData } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import type { SimulateHealthChangeInput, SimulateHealthChangeOutput } from '@/app/api/simulate-health-change/route';

interface DigitalTwinProps {
  latestResult: AnalysisResult | null;
}

export function DigitalTwin({ latestResult }: DigitalTwinProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulateHealthChangeOutput | null>(null);

  const [activity, setActivity] = useState<HealthFormData['physicalActivity']>('moderate');
  const [diet, setDiet] = useState('');
  const [sleep, setSleep] = useState<number>(7);

  const handleSimulate = async () => {
    if (!latestResult) {
      toast({
        variant: 'destructive',
        title: 'No Health Data',
        description: 'Please complete a risk assessment on the dashboard first.',
      });
      return;
    }
    if (!diet.trim() && activity === latestResult.formData.physicalActivity && sleep === latestResult.formData.sleepHours) {
        toast({
            variant: "destructive",
            title: "No Changes Entered",
            description: "Please specify at least one lifestyle change to simulate."
        })
        return;
    }

    setIsLoading(true);
    setSimulationResult(null);

    try {
      const simulationInput: SimulateHealthChangeInput = {
        currentHealthData: latestResult.formData,
        changes: {
          physicalActivity: activity,
          dietaryChanges: diet,
          sleepHours: sleep,
        },
      };

      const response = await fetch('/api/simulate-health-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulationInput),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result: SimulateHealthChangeOutput = await response.json();
      setSimulationResult(result);
    } catch (error: any) {
       console.error('Digital Twin simulation error:', error);
       const errorMessage = error.message || "";
       if (errorMessage.includes("429")) {
            toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for this feature. Please try again tomorrow.",
            });
       } else {
            toast({
                variant: 'destructive',
                title: 'Simulation Failed',
                description: 'The AI could not complete the health simulation. Please try again.',
            });
       }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <BrainCircuit className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Digital Twin Simulator</h1>
          <p className="text-muted-foreground">Forecast the future of your health by simulating lifestyle changes.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle>What-If Scenario</CardTitle>
            <CardDescription>Describe a lifestyle change you want to make, and the AI will predict its impact over the next year.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Physical Activity</Label>
                <Select onValueChange={(val) => setActivity(val as any)} defaultValue={activity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                        <SelectItem value="light">Light (Walks, 1-2 days/week)</SelectItem>
                        <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                        <SelectItem value="active">Active (Vigorous, 6-7 days/week)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Dietary Changes</Label>
                <Textarea 
                    placeholder="e.g., 'Stop drinking soda and switch to water', 'Eat a salad for lunch 3 times a week', 'Cut out fast food completely'"
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                />
            </div>
             <div className="space-y-2">
                <Label>New Average Sleep</Label>
                <Input 
                    type="number" 
                    value={sleep} 
                    onChange={(e) => setSleep(e.target.valueAsNumber)}
                    min={0} max={24}
                />
            </div>
            <Button onClick={handleSimulate} disabled={isLoading || !latestResult} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Simulate Scenario
            </Button>
            {!latestResult && (
              <p className="text-sm text-center text-destructive">
                Please complete a risk assessment on the dashboard to enable this feature.
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="lg:sticky top-6 shadow-lg border-primary/20">
            <CardHeader>
                <CardTitle>Simulation Result</CardTitle>
                <CardDescription>AI-powered prediction based on your inputs.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        </div>
                        <p className="text-center text-muted-foreground">Your Digital Twin is simulating the future...</p>
                    </div>
                 )}
                 {simulationResult && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <Card className="p-4">
                                <CardDescription>Current Risk</CardDescription>
                                <p className="text-4xl font-bold">{latestResult?.riskScore}</p>
                            </Card>
                            <Card className="p-4 bg-primary/10 border-primary">
                                <CardDescription className="text-primary">Projected Risk</CardDescription>
                                <p className="text-4xl font-bold text-primary">{simulationResult.projectedRiskScore}</p>
                            </Card>
                        </div>
                        <Card className="p-4 bg-secondary">
                             <h4 className="font-semibold flex items-center gap-2 mb-2"><Bot className="w-5 h-5"/> AI Projection</h4>
                             <div className="prose prose-sm max-w-none text-foreground">{simulationResult.narrative}</div>
                        </Card>
                    </div>
                 )}
                 {!isLoading && !simulationResult && (
                    <div className="text-center text-muted-foreground py-20 border-2 border-dashed rounded-lg">
                        <Bot className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold">Awaiting Simulation</h3>
                        <p className="text-sm mt-1">Enter a lifestyle change and click "Simulate" to see your potential future.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    