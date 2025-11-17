
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { healthLogSchema, type HealthLog, type HealthLogRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { saveHealthLog, getHealthLogs } from "@/lib/firebase/firestore";
import { CalendarIcon, Loader2, PlusCircle, Trash, Notebook, Smile, Meh, Frown, Annoyed, HeartPulse, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { AnalyzeGIOutput } from "@/app/api/analyze-gi/route";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const MoodSelector = ({ field }: { field: any }) => {
    const moods = [
        { value: "great", label: "Great", icon: <Smile className="text-green-500"/> },
        { value: "good", label: "Good", icon: <Smile className="text-lime-500"/> },
        { value: "neutral", label: "Neutral", icon: <Meh className="text-yellow-500"/> },
        { value: "bad", label: "Bad", icon: <Frown className="text-orange-500"/> },
        { value: "awful", label: "Awful", icon: <Annoyed className="text-red-500"/> },
    ]
    return (
        <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="How are you feeling?" />
                </SelectTrigger>
            </FormControl>
            <SelectContent>
                {moods.map(mood => (
                    <SelectItem key={mood.value} value={mood.value}>
                       <div className="flex items-center gap-2">
                         {mood.icon}
                         <span>{mood.label}</span>
                       </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

interface HealthLogProps {
    logs: HealthLogRecord[];
    setLogs: React.Dispatch<React.SetStateAction<HealthLogRecord[]>>;
}

export function HealthLog({ logs, setLogs }: HealthLogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isAnalyzingGI, setIsAnalyzingGI] = useState(false);
  const [giAnalysis, setGiAnalysis] = useState<AnalyzeGIOutput | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<HealthLog>({
    resolver: zodResolver(healthLogSchema),
    defaultValues: {
      date: new Date(),
      mood: undefined,
      dietNotes: "",
      exerciseNotes: "",
      generalNotes: "",
      medications: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setIsHistoryLoading(true);
    try {
      const fetchedLogs = await getHealthLogs(user.uid);
      setLogs(fetchedLogs);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not fetch health logs." });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user, toast, setLogs]);

  useEffect(() => {
    if (logs.length === 0) {
      fetchLogs();
    } else {
        setIsHistoryLoading(false);
    }
  }, [fetchLogs, logs]);

  const onSubmit = async (data: HealthLog) => {
    if (!user) return;
    setIsLoading(true);

    const logDataToSave: Partial<HealthLog> = { ...data };

    if (logDataToSave.mood === undefined) {
      delete logDataToSave.mood;
    }

    try {
      await saveHealthLog(user.uid, logDataToSave as HealthLog);
      toast({ title: "Success", description: "Your health log has been saved." });
      form.reset({
        date: new Date(),
        mood: undefined,
        dietNotes: "",
        exerciseNotes: "",
        generalNotes: "",
        medications: [],
      });
      setGiAnalysis(null);
      fetchLogs();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not save your health log." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeGI = async () => {
    const mealDescription = form.getValues("dietNotes");
    if (!mealDescription || mealDescription.trim().length < 5) {
      toast({ variant: "destructive", title: "Not Enough Detail", description: "Please describe your meal in more detail." });
      return;
    }

    setIsAnalyzingGI(true);
    setGiAnalysis(null);
    try {
      const response = await fetch('/api/analyze-gi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealDescription }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const result: AnalyzeGIOutput = await response.json();
      setGiAnalysis(result);

    } catch (error: any) {
        console.error("GI analysis error:", error);
        const errorMessage = error.message || "";
        if (errorMessage.includes("429")) {
            toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow.",
            });
        } else if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
             toast({
                variant: "destructive",
                title: "AI Service Busy",
                description: "The GI analyzer is currently experiencing high demand. Please try again in a moment.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: 'Could not analyze the Glycemic Index for this meal.',
            });
        }
    } finally {
        setIsAnalyzingGI(false);
    }
  };

  const giAlertVariant = giAnalysis?.classification === 'High' ? 'destructive' : giAnalysis?.classification === 'Medium' ? 'default' : 'default';
  const giAlertClass = giAnalysis?.classification === 'Low' ? 'border-green-500 bg-green-500/5 text-green-800' : '';
  const giAlertIconColor = giAnalysis?.classification === 'Low' ? 'text-green-600' : giAnalysis?.classification === 'Medium' ? 'text-yellow-600' : 'text-destructive';


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <Card className="lg:col-span-1 shadow-lg border-primary/20">
        <CardHeader>
           <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <HeartPulse className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">New Health Log</CardTitle>
                <CardDescription>Track your daily habits and medications.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="mood" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <MoodSelector field={field} />
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="dietNotes" render={({ field }) => (
                <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel>Diet Notes</FormLabel>
                        <div className="flex items-center gap-1">
                            <Button type="button" size="sm" variant="ghost" onClick={handleAnalyzeGI} disabled={isAnalyzingGI}>
                                {isAnalyzingGI ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4 text-primary"/>}
                                <span className="ml-2">Analyze GI</span>
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" aria-label="What is GI?">
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="text-sm">
                                    <p>The <strong>Glycemic Index (GI)</strong> is a scale from 1-100 that ranks carbohydrate-containing foods by how much they raise blood sugar levels.</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>Low GI (1-55):</strong> Slowly digested, causing a gradual rise in blood sugar.</li>
                                        <li><strong>Medium GI (56-69):</strong> Moderate impact on blood sugar.</li>
                                        <li><strong>High GI (70+):</strong> Quickly digested, causing a rapid spike in blood sugar.</li>
                                    </ul>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                  <FormControl><Textarea placeholder="e.g., Had a salad for lunch, avoided sugar..." {...field} /></FormControl>
                  <FormMessage />
                  {giAnalysis && (
                    <Alert variant={giAlertVariant} className={cn("mt-2", giAlertClass)}>
                        <AlertCircle className={cn("h-4 w-4", giAlertIconColor)} />
                        <AlertTitle className="font-bold">Glycemic Index Analysis</AlertTitle>
                        <AlertDescription>
                            <p>Est. GI: <strong className="text-lg">{giAnalysis.estimatedGI}</strong> ({giAnalysis.classification})</p>
                            <p className="mt-1">{giAnalysis.explanation}</p>
                        </AlertDescription>
                    </Alert>
                  )}
                </FormItem>
              )}/>

              <FormField control={form.control} name="exerciseNotes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise Notes</FormLabel>
                  <FormControl><Textarea placeholder="e.g., Walked for 30 minutes in the morning." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <div>
                <FormLabel>Medication Log</FormLabel>
                <div className="space-y-4 mt-2">
                    {fields.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 border rounded-lg bg-secondary/50">
                             <FormField control={form.control} name={`medications.${index}.name`} render={({ field }) => <Input {...field} placeholder="Medication Name" />} />
                             <FormField control={form.control} name={`medications.${index}.dosage`} render={({ field }) => <Input {...field} placeholder="Dosage" />} />
                             <FormField control={form.control} name={`medications.${index}.frequency`} render={({ field }) => <Input {...field} placeholder="Frequency" />} />
                             <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash className="h-4 w-4 text-destructive" />
                             </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", dosage: "", frequency: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Medication
                    </Button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} size="lg" className="w-full font-bold">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Log"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2 shadow-lg border-primary/20">
         <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Notebook className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Log History</CardTitle>
                <CardDescription>A record of your past health entries.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {isHistoryLoading ? <p>Loading history...</p> : logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-20">
                    <Notebook className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold">No Logs Yet</h3>
                    <p className="text-sm mt-1">Use the form to start tracking your health.</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {logs.map(log => (
                        <div key={log.id} className="p-4 border rounded-lg bg-card hover:bg-secondary/50 transition-colors">
                            <h4 className="font-bold text-lg">{format(log.date.toDate(), "MMMM dd, yyyy")}</h4>
                            {log.mood && <p className="text-sm capitalize"><strong>Mood:</strong> {log.mood}</p>}
                            {log.dietNotes && <p className="text-sm mt-1"><strong>Diet:</strong> {log.dietNotes}</p>}
                            {log.exerciseNotes && <p className="text-sm mt-1"><strong>Exercise:</strong> {log.exerciseNotes}</p>}
                            {log.medications && log.medications.length > 0 && (
                                <div className="mt-2">
                                    <h5 className="font-semibold">Medications:</h5>
                                    <ul className="list-disc list-inside text-sm">
                                        {log.medications.map((med, i) => <li key={i}>{med.name} ({med.dosage}, {med.frequency})</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    

