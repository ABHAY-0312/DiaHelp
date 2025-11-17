
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import type { GenerateOrganInsightInput, GenerateOrganInsightOutput } from '@/app/api/generate-organ-insight/route';

type Organ = 'pancreas' | 'liver' | 'heart' | 'kidneys' | 'adipose';

const riskFactorToOrganMap: { [key: string]: Organ[] } = {
  'HbA1c': ['pancreas', 'liver'],
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
            <PopoverTrigger asChild onMouseEnter={() => getInsightForOrgan(organ)}>
                {children}
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-64">
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

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4]">
      <svg viewBox="0 0 300 400" className="w-full h-full">
        {/* Base Body Shape */}
        <path d="M150 70 C 130 70, 120 90, 120 110 L 120 250 C 120 300, 100 320, 100 350 L 200 350 C 200 320, 180 300, 180 250 L 180 110 C 180 90, 170 70, 150 70 Z" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="2" />
        
        {/* Organs */}
        <OrganPopover organ="heart">
            <motion.path 
                d="M150 140 C 140 130, 125 135, 125 145 Q 125 160, 140 170 L 150 180 L 160 170 Q 175 160, 175 145 C 175 135, 160 130, 150 140 Z"
                className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('heart')})}
                whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
            />
        </OrganPopover>
         <OrganPopover organ="liver">
            <motion.path 
                d="M130 185 C 100 180, 100 220, 130 215 L 170 215 C 200 220, 200 180, 170 185 Z"
                className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('liver')})}
                 whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
            />
        </OrganPopover>
         <OrganPopover organ="pancreas">
            <ellipse cx="150" cy="205" rx="30" ry="8" 
                className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('pancreas')})}
            />
        </OrganPopover>
         <OrganPopover organ="kidneys">
             <>
                <motion.path d="M125 230 C 115 225, 110 255, 125 250 Z" className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('kidneys')})} whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }} />
                <motion.path d="M175 230 C 185 225, 190 255, 175 250 Z" className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('kidneys')})} whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }} />
             </>
        </OrganPopover>
         <OrganPopover organ="adipose">
            <motion.rect x="110" y="270" width="80" height="30" rx="15" 
                className={cn("cursor-pointer fill-muted-foreground/30", { 'fill-primary/70 animate-pulse': relevantOrgans.has('adipose')})}
                whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
            />
        </OrganPopover>
      </svg>
    </div>
  );
}
