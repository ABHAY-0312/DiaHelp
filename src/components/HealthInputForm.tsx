

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { healthFormSchema, type HealthFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Stethoscope, Lock } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

interface HealthInputFormProps {
  onSubmit: (data: HealthFormData) => void;
  isLoading: boolean;
}

const formFields: { name: keyof Omit<HealthFormData, 'patientName' | 'emergencyContactEmail'>; label: string; description: string }[] = [
  { name: "age", label: "Age", description: "Your age in years." },
  { name: "pregnancies", label: "Pregnancies", description: "Number of times pregnant." },
  { name: "glucose", label: "Glucose", description: "Plasma glucose concentration (mg/dL)." },
  { name: "bloodPressure", label: "Blood Pressure", description: "Diastolic blood pressure (mm Hg)." },
  { name: "skinThickness", label: "Skin Thickness", description: "Triceps skin fold thickness (mm)." },
  { name: "insulin", label: "Insulin", description: "2-Hour serum insulin (mu U/ml)." },
  { name: "bmi", label: "BMI", description: "Body mass index (kg/m²)." },
  { name: "diabetesPedigreeFunction", label: "Diabetes Pedigree", description: "Likelihood score from family history." },
  { name: "sleepHours", label: "Avg. Sleep Hours", description: "Average hours of sleep per night."}
];

export function HealthInputForm({ onSubmit, isLoading }: HealthInputFormProps) {
  const { user } = useAuth();
  const form = useForm<HealthFormData>({
    resolver: zodResolver(healthFormSchema),
    defaultValues: {
      patientName: "",
      emergencyContactEmail: "",
      age: undefined,
      pregnancies: 0,
      glucose: undefined,
      bloodPressure: undefined,
      skinThickness: 20,
      insulin: 80,
      bmi: undefined,
      diabetesPedigreeFunction: 0.5,
      sleepHours: 7,
    },
  });

  useEffect(() => {
    if (user?.displayName) {
        form.setValue("patientName", user.displayName);
    }
  }, [user, form]);

  const handleFormSubmit = (data: HealthFormData) => {
      const dataToSubmit = {
          ...data,
          patientName: user?.displayName || data.patientName,
      };
      onSubmit(dataToSubmit);
  }

  return (
    <Card className="w-full h-full overflow-auto shadow-lg border-primary/20 bg-card">
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
                <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <div>
                <CardTitle className="text-2xl">Health Profile</CardTitle>
                <CardDescription>Enter your metrics to assess your diabetes risk.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                            <Input placeholder="e.g. Jane Doe" {...field} value={field.value ?? ''} disabled />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@example.com" {...field} value={field.value ?? ''} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formFields.map(({ name, label, description }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            step="any" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value === '' ? '' : e.target.valueAsNumber)} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">{description}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button type="submit" disabled={isLoading} size="lg" className="w-full font-bold text-base">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Stethoscope className="mr-2 h-5 w-5" />
                  Assess My Risk
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
