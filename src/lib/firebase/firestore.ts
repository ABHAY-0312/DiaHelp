
"use client";
import { db } from "@/lib/firebase/config";
import type { AnalysisResult, HealthFormData, HealthLog, PredictionRecord, HealthLogRecord, QuizAttemptData, ContactQueryData, HealthTimelineData, HealthTimelineRecord } from "@/lib/types";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  limit,
} from "firebase/firestore";
import { errorEmitter } from "./error-emitter";
import { FirestorePermissionError } from "./errors";

export async function savePrediction(
  userId: string,
  formData: HealthFormData,
  analysisResult: AnalysisResult
): Promise<string> {
    const dataToSave = {
      userId,
      formData,
      ...analysisResult,
      createdAt: Timestamp.now(),
    };
    const collectionRef = collection(db, "predictions");
    
    return addDoc(collectionRef, dataToSave)
      .then(docRef => docRef.id)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        // We still throw to let the calling function know something went wrong.
        throw new Error("Could not save prediction.");
      });
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
    const dataToSave = {
      userId,
      ...logData,
      createdAt: Timestamp.now(),
    };
    const collectionRef = collection(db, "healthLogs");

    return addDoc(collectionRef, dataToSave)
      .then(docRef => docRef.id)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error("Could not save health log.");
      });
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
    const dataToSave = {
      userId,
      ...attemptData,
      createdAt: Timestamp.now(),
    };
    const collectionRef = collection(db, "quizAttempts");
    
    return addDoc(collectionRef, dataToSave)
      .then(docRef => docRef.id)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error("Could not save quiz attempt.");
      });
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
    const dataToSave = {
      userId,
      ...queryData,
      isRead: false,
      createdAt: Timestamp.now(),
    };
    const collectionRef = collection(db, "contactQueries");
    
    return addDoc(collectionRef, dataToSave)
      .then(docRef => docRef.id)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error("Could not save contact query.");
      });
}

export async function saveHealthTimeline(userId: string, predictionId: string, timelineData: HealthTimelineData): Promise<string> {
    const dataToSave = {
      userId,
      predictionId,
      ...timelineData,
      createdAt: Timestamp.now(),
    };
    const collectionRef = collection(db, "timelines");

    return addDoc(collectionRef, dataToSave)
      .then(docRef => docRef.id)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw new Error("Could not save health timeline.");
      });
}

export async function getHealthTimeline(userId: string, predictionId: string): Promise<HealthTimelineRecord | null> {
  const collectionRef = collection(db, "timelines");
  const q = query(
    collectionRef,
    where("userId", "==", userId),
    where("predictionId", "==", predictionId),
    limit(1)
  );

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as HealthTimelineRecord;
  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
      path: collectionRef.path,
      operation: 'list', // 'list' is appropriate for queries
    });
    errorEmitter.emit('permission-error', permissionError);
    throw new Error("Could not retrieve health timeline.");
  }
}

