
"use client";
import { db } from "@/lib/firebase/config";
import type { AnalysisResult, HealthFormData, HealthLog, PredictionRecord, HealthLogRecord, QuizAttemptData, ContactQueryData } from "@/lib/types";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

export async function savePrediction(
  userId: string,
  formData: HealthFormData,
  analysisResult: AnalysisResult
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "predictions"), {
      userId,
      formData,
      ...analysisResult,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw new Error("Could not save prediction.");
  }
}

export async function getPredictionHistory(userId: string): Promise<PredictionRecord[]> {
  try {
    const q = query(
      collection(db, "predictions"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const history: PredictionRecord[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() } as PredictionRecord);
    });

    history.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    
    return history;
  } catch (e) {
    console.error("Error getting documents: ", e);
    throw new Error("Could not retrieve prediction history.");
  }
}


export async function saveHealthLog(
  userId: string,
  logData: HealthLog
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "healthLogs"), {
      userId,
      ...logData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding health log: ", e);
    throw new Error("Could not save health log.");
  }
}

export async function getHealthLogs(userId: string): Promise<HealthLogRecord[]> {
  try {
    const q = query(
      collection(db, "healthLogs"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const logs: HealthLogRecord[] = [];
    querySnapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as HealthLogRecord);
    });
    
    logs.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
    
    return logs;
  } catch (e) {
    console.error("Error getting health logs: ", e);
    throw new Error("Could not retrieve health logs.");
  }
}

export async function saveQuizAttempt(userId: string, attemptData: QuizAttemptData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "quizAttempts"), {
      userId,
      ...attemptData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error saving quiz attempt: ", e);
    throw new Error("Could not save quiz attempt.");
  }
}

export async function getQuizHistory(userId: string): Promise<any[]> {
  try {
    const q = query(collection(db, "quizAttempts"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const history: any[] = [];
    querySnapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });
    history.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    return history;
  } catch (e) {
    console.error("Error getting quiz history: ", e);
    throw new Error("Could not retrieve quiz history.");
  }
}

export async function saveContactQuery(userId: string, queryData: ContactQueryData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "contactQueries"), {
      userId,
      ...queryData,
      isRead: false,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error saving contact query: ", e);
    throw new Error("Could not save contact query.");
  }
}
