
"use client";

import { useMemo } from 'react';
import type { AnalysisResult, HealthFormData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { TrendingDown, TrendingUp, ArrowRight, Bed, Weight, Footprints, Droplet, Heart } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface DigitalTwinProps {
  currentResult: AnalysisResult;
  onCalculateRisk: (data: Partial<HealthFormData>) => { riskScore: number };
}

interface Scenario {
  key: keyof HealthFormData | 'lipids';
  title: string;
  description: string;
  icon: React.ReactNode;
  improvement: (currentData: HealthFormData) => Partial<HealthFormData>;
}

const scenarios: Scenario[] = [
  {
    key: 'sleepHours',
    title: 'Improve Sleep',
    description: 'Aim for 8 hours of quality sleep per night.',
    icon: <Bed className="w-6 h-6 text-blue-500" />,
    improvement: (data) => ({ ...data, sleepHours: 8 }),
  },
  {
    key: 'bmi',
    title: 'Reduce BMI',
    description: 'Lower your BMI by 10% through diet and exercise.',
    icon: <Weight className="w-6 h-6 text-green-500" />,
    improvement: (data) => ({ ...data, bmi: data.bmi * 0.9 }),
  },
  {
    key: 'physicalActivity',
    title: 'Increase Activity',
    description: 'Move from your current level to "Active".',
    icon: <Footprints className="w-6 h-6 text-orange-500" />,
    improvement: (data) => ({ ...data, physicalActivity: 'active' }),
  },
  {
    key: 'fastingGlucose',
    title: 'Lower Glucose',
    description: 'Reduce fasting glucose by 15% towards the healthy range.',
    icon: <Droplet className="w-6 h-6 text-red-500" />,
    improvement: (data) => ({ ...data, fastingGlucose: Math.max(90, data.fastingGlucose * 0.85) }),
  },
  {
    key: 'lipids',
    title: 'Improve Lipids',
    description: 'Lower Triglycerides by 20% and increase HDL by 10%.',
    icon: <Heart className="w-6 h-6 text-purple-500" />,
    improvement: (data) => ({ 
      ...data, 
      triglycerides: data.triglycerides * 0.8,
      hdlCholesterol: data.hdlCholesterol * 1.1 
    }),
  },
];

export function DigitalTwin({ currentResult, onCalculateRisk }: DigitalTwinProps) {
  
  const simulations = useMemo(() => {
    return scenarios.map(scenario => {
      const currentDataWithDefaults = { ...currentResult.formData };
      const improvedData = scenario.improvement(currentDataWithDefaults);
      const combinedData = { ...currentDataWithDefaults, ...improvedData };
      const { riskScore: newRiskScore } = onCalculateRisk(combinedData);
      
      return {
        ...scenario,
        newRiskScore: Math.round(newRiskScore),
        change: Math.round(newRiskScore) - currentResult.riskScore,
      };
    });
  }, [currentResult, onCalculateRisk]);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Lifestyle Digital Twin</CardTitle>
        <CardDescription>
          See how small, positive changes to your lifestyle could impact your diabetes risk score. These are simulations for motivation and are not medical predictions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {simulations.map((sim, index) => (
          <Card key={index} className="p-4 bg-secondary/40 hover:bg-secondary/80 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-background rounded-lg">{sim.icon}</div>
                <div>
                  <h4 className="font-semibold">{sim.title}</h4>
                  <p className="text-sm text-muted-foreground">{sim.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 shrink-0">
                <div className="text-2xl font-bold">{currentResult.riskScore}</div>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                <div className="text-3xl font-bold text-primary">{sim.newRiskScore}</div>
                <div className={`flex items-center font-bold text-lg ${sim.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sim.change < 0 ? <TrendingDown className="w-5 h-5 mr-1" /> : <TrendingUp className="w-5 h-5 mr-1" />}
                  {sim.change > 0 ? `+${sim.change}`: sim.change}
                </div>
              </div>
            </div>
          </Card>
        ))}
         <Alert>
            <AlertTitle>This is a Simulation</AlertTitle>
            <AlertDescription>
                These scenarios are designed to motivate and illustrate the potential impact of lifestyle changes. The results are not guaranteed. Always consult a healthcare professional before making significant changes to your health regimen.
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

    