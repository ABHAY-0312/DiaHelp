
"use client";

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Camera, Sparkles, ImageOff, Salad, ShieldCheck, Footprints, GlassWater, CookingPot } from 'lucide-react';
import Image from 'next/image';
import type { AnalyzeMealOutput } from '@/app/api/analyze-meal/route';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function MealAnalyzer() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeMealOutput | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
          toast({
              variant: "destructive",
              title: "Image Too Large",
              description: "Please select an image smaller than 4MB.",
          });
          return;
      }
      setAnalysis(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!imagePreview) {
      toast({
        variant: "destructive",
        title: "No Image Selected",
        description: "Please select an image to analyze.",
      });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoDataUri: imagePreview }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result: AnalyzeMealOutput = await response.json();
      if (!result.isFood) {
        toast({
          title: "Not Food",
          description: "The AI could not detect any food in the image. Please try another one.",
        });
        setAnalysis(null);
        setIsLoading(false);
        return;
      }
      setAnalysis(result);
    } catch (error: any) {
      console.error("Meal analysis error:", error);
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
                description: "There was an error analyzing your meal. Please try again.",
            });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Upload a Meal Photo</CardTitle>
                <CardDescription>Let AI analyze your meal's nutritional content.</CardDescription>
            </div>
        </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meal-photo">Choose an image</Label>
            <Input id="meal-photo" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
          </div>
          <div className="w-full aspect-video rounded-lg border-2 border-dashed bg-secondary/50 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <Image src={imagePreview} alt="Meal preview" width={500} height={281} className="object-cover w-full h-full" />
            ) : (
                <div className="text-center text-muted-foreground p-4">
                    <ImageOff className="w-16 h-16 mx-auto mb-2 opacity-50"/>
                    <p>Image preview will appear here</p>
                </div>
            )}
          </div>
          <Button onClick={handleAnalyzeClick} disabled={isLoading || !imagePreview} size="lg" className="w-full font-bold text-base">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Analyze Meal
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-primary/20 lg:sticky lg:top-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Salad className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Nutritional Analysis</CardTitle>
                <CardDescription>AI-powered estimation of your meal's content.</CardDescription>
            </div>
        </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <p className="text-center text-muted-foreground">Analyzing image, this may take a moment...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium text-foreground leading-relaxed">{analysis.feedback}</p>
              </div>

             {analysis.recoveryPlan && (
                <Alert variant="default" className="border-green-500 bg-green-500/5">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <AlertTitle className="font-bold text-lg text-green-700 dark:text-green-500">Cheat Meal Recovery Mode Activated</AlertTitle>
                    <AlertDescription className="space-y-3 mt-2 text-green-800 dark:text-green-300">
                        <div className="flex items-start gap-3">
                            <Footprints className="w-5 h-5 mt-1 text-green-600"/>
                            <p>{analysis.recoveryPlan.walkReminder}</p>
                        </div>
                         <div className="flex items-start gap-3">
                            <GlassWater className="w-5 h-5 mt-1 text-green-600"/>
                            <p>{analysis.recoveryPlan.waterPrompt}</p>
                        </div>
                         <div className="flex items-start gap-3">
                            <CookingPot className="w-5 h-5 mt-1 text-green-600"/>
                            <p>{analysis.recoveryPlan.dinnerSuggestion}</p>
                        </div>
                    </AlertDescription>
                </Alert>
             )}


              <div className="border rounded-lg overflow-hidden">
                 <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary">
                      <TableHead>Food Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Calories (kcal)</TableHead>
                      <TableHead className="text-right">Carbs (g)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-primary/5">
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.calories * item.quantity}</TableCell>
                        <TableCell className="text-right">{item.carbohydrates * item.quantity}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-secondary/80">
                         <TableCell>Total</TableCell>
                         <TableCell></TableCell>
                         <TableCell className="text-right">{analysis.totalCalories}</TableCell>
                         <TableCell className="text-right">{analysis.totalCarbohydrates}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
             <div className="text-center text-muted-foreground py-20">
                <Salad className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold">Analysis will appear here</h3>
                <p className="text-sm mt-1">Upload a photo and click "Analyze Meal" to get started.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
