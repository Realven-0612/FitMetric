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
  console.error('Firestore Error Payload:', JSON.stringify(errInfo));
  return errInfo;
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

export async function fetchNutritionDiary(userId: string) {
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

export async function fetchUserData(userId: string) {
  if (!userId) return null;
  const userPath = `users/${userId}`;
  const planPath = `users/${userId}/plans/current`;
  
  try {
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, userPath));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, userPath);
    }
    let planDoc;
    try {
      planDoc = await getDoc(doc(db, planPath));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.GET, planPath);
    }

    let profile = null;
    let workoutPlan = null;

    if (userDoc && userDoc.exists()) {
      const data = userDoc.data();
      // Only extract known profile fields to avoid passing down extra noise
      profile = {
        name: data.name,
        age: data.age ? Number(data.age) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
        gender: data.gender,
        bodyFat: data.bodyFat ? Number(data.bodyFat) : undefined,
        primaryGoal: data.primaryGoal,
        preferredStyle: data.preferredStyle,
        activityLevel: data.activityLevel,
      };
    }

    if (planDoc && planDoc.exists()) {
      workoutPlan = planDoc.data();
    }

    const allNutrition = await fetchNutritionDiary(userId);
    
    // Filter to today's nutrition only
    const today = new Date().toISOString().split('T')[0];
    const todaysNutrition = allNutrition.filter((entry: any) => {
      // Handle timestamp if it exists, otherwise assume it's old and filter out
      if (!entry.timestamp) return false;
      return entry.timestamp.startsWith(today);
    });

    return {
      profile,
      workoutPlan,
      nutritionDiary: todaysNutrition,
    };
  } catch (error: any) {
    if (error.message && error.message.includes('{"error"')) {
      throw error; // Already a wrapped JSON error
    } else {
      handleFirestoreError(error, OperationType.GET, userPath);
    }
    return null;
  }
}

export { handleFirestoreError };
