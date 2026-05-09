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
  serverTimestamp,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';

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
  const entryId = food.id; // use provided ID
  try {
    if (entryId) {
      const path = `users/${userId}/nutrition/${entryId}`;
      await setDoc(doc(db, 'users', userId, 'nutrition', entryId), {
        ...food,
        timestamp: food.timestamp || new Date().toISOString()
      });
    } else {
      const path = `users/${userId}/nutrition`;
      await addDoc(collection(db, path), {
        ...food,
        timestamp: food.timestamp || new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/nutrition`);
  }
}

export async function deleteFoodItem(entryId: string) {
  const userId = auth.currentUser?.uid;
  if (!userId || !entryId) return;
  const path = `users/${userId}/nutrition/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'nutrition', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchNutritionDiary(userId: string) {
  if (!userId) return [];
  const path = `users/${userId}/nutrition`;
  
  const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
  const todayEnd = new Date().toISOString().split('T')[0] + 'T23:59:59.999Z';

  try {
    const q = query(
      collection(db, path),
      where('timestamp', '>=', todayStart),
      where('timestamp', '<=', todayEnd)
    );
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

    const weightsSnap = await getDoc(doc(db, `users/${userId}/stats/exerciseWeights`))
      .catch(() => null);
    const exerciseWeights = weightsSnap?.exists()
      ? (() => { const d = weightsSnap.data(); delete d.updatedAt; return d; })()
      : {};

    return {
      profile,
      workoutPlan,
      nutritionDiary: todaysNutrition,
      exerciseWeights,
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

// Sync exerciseWeights (personal bests)
export async function saveExerciseWeights(weights: Record<string, number>) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const path = `users/${userId}/stats/exerciseWeights`;
  try {
    await setDoc(doc(db, path), {
      ...weights,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Load exerciseWeights từ Firestore
export async function fetchExerciseWeights(userId: string): Promise<Record<string, number>> {
  if (!userId) return {};
  const path = `users/${userId}/stats/exerciseWeights`;
  try {
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) {
      const data = snap.data();
      delete data.updatedAt; // bỏ field timestamp
      return data as Record<string, number>;
    }
    return {};
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return {};
  }
}

// Lưu session hoàn thành vào lịch sử
export async function saveSessionRecord(sessionLogs: any, totalVolume: number) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const path = `users/${userId}/sessionHistory`;
  const today = new Date().toISOString().split('T')[0];
  try {
    await setDoc(doc(db, path, today), {
      date: today,
      logs: sessionLogs,
      totalVolume,
      completedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Upload ảnh pose và trả về URL
export async function uploadPosePhoto(base64Data: string): Promise<string | null> {
  const userId = auth.currentUser?.uid;
  if (!userId) return null;
  const date = new Date().toISOString().split('T')[0];
  const fileName = `pose_${Date.now()}.jpg`;
  const storageRef = ref(storage, `users/${userId}/poses/${date}/${fileName}`);
  try {
    // Chuyển base64 → Blob
    const res = await fetch(base64Data);
    const blob = await res.blob();
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    // Lưu URL vào Firestore
    const path = `users/${userId}/poseHistory`;
    await addDoc(collection(db, path), {
      date,
      photoUrl: url,
      uploadedAt: serverTimestamp()
    });
    return url;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `storage/users/${userId}/poses`);
    return null;
  }
}

export { handleFirestoreError };
