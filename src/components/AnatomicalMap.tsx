
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import type { GenerateOrganInsightInput, GenerateOrganInsightOutput } from '@/app/api/generate-organ-insight/route';

type Organ = 'pancreas' | 'liver' | 'heart' | 'kidneys' | 'adipose';

const riskFactorToOrganMap: { [key: string]: Organ[] } = {
  'HbA1c': ['pancreas', 'liver', 'kidneys'],
  'Fasting Glucose': ['pancreas', 'liver'],
  'Fasting Insulin': ['pancreas', 'liver'],
  'BMI': ['adipose', 'heart', 'liver'],
  'Waist Circumference': ['adipose', 'heart', 'liver'],
  'Triglycerides': ['liver', 'heart'],
  'HDL Cholesterol': ['heart'],
  'Blood Pressure': ['heart', 'kidneys'],
};

interface OrganInsight {
  insight: string;
  error?: string;
}

export function AnatomicalMap({ keyFactors }: { keyFactors: string[] }) {
  const [activeOrgan, setActiveOrgan] = useState<Organ | null>(null);
  const [insights, setInsights] = useState<Record<string, OrganInsight>>({});
  const [loadingOrgan, setLoadingOrgan] = useState<Organ | null>(null);

  const relevantOrgans = new Set<Organ>();
  keyFactors.forEach(factor => {
    riskFactorToOrganMap[factor]?.forEach(organ => relevantOrgans.add(organ));
  });

  const getInsightForOrgan = async (organ: Organ) => {
    if (insights[organ] || loadingOrgan === organ) return;

    setLoadingOrgan(organ);
    setActiveOrgan(organ);

    const relevantFactor = keyFactors.find(factor => riskFactorToOrganMap[factor]?.includes(organ)) || 'general';

    try {
        const input: GenerateOrganInsightInput = { organ, riskFactor: relevantFactor };
        const response = await fetch('/api/generate-organ-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!response.ok) throw new Error('Failed to fetch insight.');

        const data: GenerateOrganInsightOutput = await response.json();
        setInsights(prev => ({ ...prev, [organ]: { insight: data.insight } }));

    } catch (err) {
        setInsights(prev => ({ ...prev, [organ]: { insight: 'Could not load insight.', error: 'AI failed to respond.' } }));
    } finally {
        setLoadingOrgan(null);
    }
  };
  
  const OrganPopover = ({ organ, children }: { organ: Organ, children: React.ReactNode }) => {
    const isRelevant = relevantOrgans.has(organ);
    if (!isRelevant) return <>{children}</>;

    return (
        <Popover open={activeOrgan === organ} onOpenChange={(isOpen) => setActiveOrgan(isOpen ? organ : null)}>
            <PopoverTrigger asChild onMouseEnter={() => getInsightForOrgan(organ)} onMouseLeave={() => setActiveOrgan(null)}>
                {children}
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-64 z-10">
                <div className="font-bold capitalize text-primary">{organ}</div>
                {loadingOrgan === organ ? (
                     <div className="flex items-center justify-center p-4"><Loader2 className="w-6 h-6 animate-spin"/></div>
                ) : (
                    <p className="text-sm text-muted-foreground">{insights[organ]?.insight}</p>
                )}
                 {insights[organ]?.error && <p className="text-xs text-destructive flex items-center gap-1 mt-2"><AlertCircle className="w-4 h-4" /> {insights[organ]?.error}</p>}
            </PopoverContent>
        </Popover>
    )
  }

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    }
  };

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4]">
      <svg viewBox="0 0 300 400" className="w-full h-full">
        {/* Base Body Shape */}
        <path d="M150 50 C 125 50, 110 70, 110 100 L 110 280 C 110 320, 90 340, 90 380 L 210 380 C 210 340, 190 320, 190 280 L 190 100 C 190 70, 175 50, 150 50 Z" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="2" />
        
        {/* Adipose Tissue (Stomach Area) */}
        <OrganPopover organ="adipose">
            <motion.path 
                d="M115 260 C 105 260, 105 310, 115 310 L 185 310 C 195 310, 195 260, 185 260 Z"
                className={cn("cursor-pointer fill-muted-foreground/20 stroke-muted-foreground/30", { 'fill-primary/60 stroke-primary/80': relevantOrgans.has('adipose')})}
                animate={relevantOrgans.has('adipose') ? pulseAnimation : {}}
            />
        </OrganPopover>

        {/* Liver */}
        <OrganPopover organ="liver">
            <motion.path 
                d="M120 180 C 90 175, 95 230, 130 225 L 170 225 C 205 230, 210 175, 180 180 Z"
                className={cn("cursor-pointer fill-muted-foreground/40 stroke-muted-foreground/50", { 'fill-primary/80 stroke-primary': relevantOrgans.has('liver')})}
                animate={relevantOrgans.has('liver') ? pulseAnimation : {}}
            />
        </OrganPopover>
        
        {/* Pancreas (behind stomach) */}
        <OrganPopover organ="pancreas">
            <motion.path 
                d="M135 210 C 140 200, 160 200, 165 210 L 160 220 L 140 220 Z"
                className={cn("cursor-pointer fill-muted-foreground/30 stroke-muted-foreground/40", { 'fill-primary/70 stroke-primary/90': relevantOrgans.has('pancreas')})}
                animate={relevantOrgans.has('pancreas') ? pulseAnimation : {}}
            />
        </OrganPopover>

        {/* Kidneys */}
        <OrganPopover organ="kidneys">
             <g>
                <motion.path d="M120 230 C 110 225, 105 265, 120 260 Z" className={cn("cursor-pointer fill-muted-foreground/40 stroke-muted-foreground/50", { 'fill-primary/80 stroke-primary': relevantOrgans.has('kidneys')})} animate={relevantOrgans.has('kidneys') ? pulseAnimation : {}} />
                <motion.path d="M180 230 C 190 225, 195 265, 180 260 Z" className={cn("cursor-pointer fill-muted-foreground/40 stroke-muted-foreground/50", { 'fill-primary/80 stroke-primary': relevantOrgans.has('kidneys')})} animate={relevantOrgans.has('kidneys') ? pulseAnimation : {}} />
             </g>
        </OrganPopover>
        
        {/* Heart */}
        <OrganPopover organ="heart">
            <motion.path 
                d="M150 135 C 140 125, 125 130, 125 140 Q 125 155, 140 165 L 150 175 L 160 165 Q 175 155, 175 140 C 175 130, 160 125, 150 135 Z"
                className={cn("cursor-pointer fill-muted-foreground/40 stroke-muted-foreground/50", { 'fill-primary/80 stroke-primary': relevantOrgans.has('heart')})}
                animate={relevantOrgans.has('heart') ? pulseAnimation : {}}
            />
        </OrganPopover>
      </svg>
    </div>
  );
}
