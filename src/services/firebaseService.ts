import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile
export async function syncProfile(profileData: any) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, path), {
      ...profileData,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Workout Plan
export async function saveWorkoutPlan(plan: any) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const path = `users/${userId}/plans/current`;
  try {
    await setDoc(doc(db, path), {
      ...plan,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Nutrition
export async function logFoodItem(food: any) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const path = `users/${userId}/nutrition`;
  try {
    await addDoc(collection(db, path), {
      ...food,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Weight Records
export async function logWeightRecord(weight: number) {
  const userId = auth.currentUser?.uid;
  if (!userId || !weight) return;
  const today = new Date().toISOString().split('T')[0];
  const path = `users/${userId}/weightRecords/${today}`;
  try {
    await setDoc(doc(db, path), {
      userId,
      date: today,
      value: weight,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchNutritionDiary() {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];
  const path = `users/${userId}/nutrition`;
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export { handleFirestoreError };
