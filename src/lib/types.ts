
import { z } from 'zod';
import type { Timestamp } from 'firebase/firestore';

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type LoginFormData = z.infer<typeof loginSchema>;


export const signupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type SignupFormData = z.infer<typeof signupSchema>;


export const healthFormSchema = z.object({
  patientName: z.string().optional(),
  emergencyContactEmail: z.string().email({ message: "Invalid email address."}).optional().or(z.literal('')),
  age: z.coerce.number().min(1, { message: "Age must be a positive number." }).max(120),
  pregnancies: z.coerce.number().min(0).max(20).default(0),
  glucose: z.coerce.number().min(0, { message: "Glucose must be a positive number." }),
  bloodPressure: z.coerce.number().min(0, { message: "Blood pressure must be a positive number." }),
  skinThickness: z.coerce.number().min(0).max(99).default(20),
  insulin: z.coerce.number().min(0).max(900).default(80),
  bmi: z.coerce.number().min(10, "BMI seems too low.").max(70, "BMI seems too high."),
  diabetesPedigreeFunction: z.coerce.number().min(0).max(3).default(0.5),
  sleepHours: z.coerce.number().min(0, "Sleep must be positive.").max(24, "Cannot be more than 24 hours.").default(7),
});

export type HealthFormData = z.infer<typeof healthFormSchema>;

export interface AnalysisResult {
  patientName: string;
  riskScore: number;
  confidenceScore: number;
  keyFactors: { name: string; value: number }[];
  shapValues: { name:string; value: number }[];
  report: string;
  healthSuggestions: string[];
  formData: HealthFormData;
}

export interface PredictionRecord extends AnalysisResult {
  id: string;
  userId: string;
  formData: HealthFormData;
  createdAt: Timestamp;
}

export const medicationSchema = z.object({
  name: z.string().min(1, "Medication name is required."),
  dosage: z.string().min(1, "Dosage is required."),
  frequency: z.string().min(1, "Frequency is required."),
});

export type Medication = z.infer<typeof medicationSchema>;

export const healthLogSchema = z.object({
  date: z.coerce.date(),
  mood: z.enum(["great", "good", "neutral", "bad", "awful"]).optional(),
  dietNotes: z.string().optional(),
  exerciseNotes: z.string().optional(),
  generalNotes: z.string().optional(),
  medications: z.array(medicationSchema).optional(),
});

export type HealthLog = z.infer<typeof healthLogSchema>;

export interface HealthLogRecord extends HealthLog {
  id: string;
  userId: string;
  createdAt: Timestamp;
}

export type BatchPredictionResult = {
  riskScore: number;
  glucose: number;
  bmi: number;
  age: number;
  shapValues: { name: string; value: number }[];
};

export type HealthTip = {
  tip: string;
};

export type MetabolicAge = {
    metabolicAge: number;
    explanation: string;
}

export const quizAttemptSchema = z.object({
    topic: z.string(),
    score: z.number(),
    totalQuestions: z.number(),
});

export type QuizAttemptData = z.infer<typeof quizAttemptSchema>;

export interface QuizAttempt extends QuizAttemptData {
    id: string;
    userId: string;
    createdAt: Timestamp;
}

export const contactQuerySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
});

export type ContactQueryData = z.infer<typeof contactQuerySchema>;

export interface ContactQueryRecord extends ContactQueryData {
    id: string;
    userId: string;
    isRead: boolean;
    createdAt: Timestamp;
}
