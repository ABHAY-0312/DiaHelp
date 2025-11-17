

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


interface HealthInputFormProps {
  onSubmit: (data: HealthFormData) => void;
  isLoading: boolean;
}

const formFields: { 
  name: keyof Omit<HealthFormData, 'patientName' | 'emergencyContactEmail' | 'gender' | 'familyHistory' | 'physicalActivity' | 'stressLevel'>; 
  label: string; 
  description: string;
  placeholder: string;
}[] = [
  { name: "age", label: "Age", description: "Your current age in years.", placeholder: "45" },
  { name: "bmi", label: "BMI", description: "Your Body Mass Index.", placeholder: "22.5" },
  { name: "waistCircumference", label: "Waist Circumference (cm)", description: "Measured at the narrowest point.", placeholder: "85" },
  { name: "fastingGlucose", label: "Fasting Glucose (mg/dL)", description: "Your blood sugar after an overnight fast.", placeholder: "95" },
  { name: "hba1c", label: "HbA1c (%)", description: "Your average blood sugar over 3 months.", placeholder: "5.4" },
  { name: "fastingInsulin", label: "Fasting Insulin (muU/mL)", description: "Your insulin level after a fast.", placeholder: "10" },
  { name: "triglycerides", label: "Triglycerides (mg/dL)", description: "A type of fat found in your blood.", placeholder: "140" },
  { name: "hdlCholesterol", label: "HDL Cholesterol (mg/dL)", description: "Your 'good' cholesterol level.", placeholder: "55" },
  { name: "bloodPressure", label: "Diastolic Blood Pressure", description: "The lower number of your BP reading.", placeholder: "75" },
  { name: "sleepHours", label: "Avg. Sleep Hours", description: "Average hours you sleep per night.", placeholder: "8" }
];

export function HealthInputForm({ onSubmit, isLoading }: HealthInputFormProps) {
  const { user } = useAuth();
  const form = useForm<HealthFormData>({
    resolver: zodResolver(healthFormSchema),
    defaultValues: {
      patientName: "",
      emergencyContactEmail: "",
      age: undefined,
      gender: 'female',
      bmi: undefined,
      waistCircumference: undefined,
      fastingGlucose: undefined,
      hba1c: undefined,
      fastingInsulin: undefined,
      triglycerides: undefined,
      hdlCholesterol: undefined,
      bloodPressure: undefined,
      familyHistory: 'no',
      sleepHours: 7,
      physicalActivity: 'moderate',
      stressLevel: 'medium',
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
               <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Assigned at birth, for risk calculation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {formFields.map(({ name, label, description, placeholder }) => (
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
                            placeholder={placeholder}
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

              <FormField
                  control={form.control}
                  name="familyHistory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family History of Diabetes</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="parent">Parent or Sibling</SelectItem>
                          <SelectItem value="grandparent">Grandparent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Has anyone in your immediate family had diabetes?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="physicalActivity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Physical Activity Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                          <SelectItem value="light">Light (Walks, 1-2 days/week)</SelectItem>
                          <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                          <SelectItem value="active">Active (Vigorous, 6-7 days/week)</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormDescription className="text-xs">Your typical weekly activity.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stressLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Stress Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Your typical daily stress.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
