import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { calculateBMR, calculateMacros, calculateTDEE, ActivityLevel, Goal } from '../lib/fitness-logic';
import { useAuth } from './AuthProvider';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export interface UserProfile {
  name?: string;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  bodyFat?: number;
  activityLevel: string; // 'Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'
  primaryGoal: string; // 'Lose Fat', 'Maintain', 'Build Muscle', 'Strength', 'Endurance'
  preferredStyle?: string;
  level?: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FitnessContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  diary: FoodEntry[];
  addFoodEntry: (entry: Omit<FoodEntry, 'id'>) => void;
  removeFoodEntry: (id: string) => void;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  consumed: { calories: number; protein: number; carbs: number; fat: number };
}

const defaultProfile: UserProfile = {
  weight: 72,
  height: 168,
  age: 24,
  gender: 'male',
  activityLevel: 'Lightly Active',
  primaryGoal: 'Lose Fat'
};

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [diary, setDiary] = useState<FoodEntry[]>([]);

  // Load from local storage or Firestore on mount/auth change
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             const data = docSnap.data();
             setProfile((prev) => ({
                 ...prev,
                 ...data,
                 weight: data.weight ? Number(data.weight) : prev.weight,
                 height: data.height ? Number(data.height) : prev.height,
                 age: data.age ? Number(data.age) : prev.age,
             }));
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
        }
      };
      loadProfile();
    } else {
      const profileStr = localStorage.getItem('user_profile');
      if (profileStr) {
        try {
          const p = JSON.parse(profileStr);
          setProfile((prev) => ({
            ...prev,
            name: p.name || prev.name,
            weight: p.weight ? Number(p.weight) : prev.weight,
            height: p.height ? Number(p.height) : prev.height,
            age: p.age ? Number(p.age) : prev.age,
            gender: p.gender === 'female' ? 'female' : (p.gender === 'other' ? 'other'  : 'male'),
            bodyFat: p.bodyFat ? Number(p.bodyFat) : prev.bodyFat,
            activityLevel: p.activityLevel || prev.activityLevel,
            primaryGoal: p.primaryGoal || prev.primaryGoal,
            preferredStyle: p.preferredStyle || prev.preferredStyle,
            level: p.level || prev.level
          }));
        } catch (e) {
          console.error('Failed to parse user profile', e);
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('food_diary_date');
    const savedDiary = localStorage.getItem('food_diary');
    if (savedDate === today && savedDiary) {
      try {
        setDiary(JSON.parse(savedDiary));
      } catch (e) {
        console.error('Failed to parse food diary', e);
      }
    }
  }, []);

  // Save changes to local storage when they occur
  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
    // Publish event for legacy parts of the app
    window.dispatchEvent(new Event('tdee_updated'));
  }, [profile]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('food_diary', JSON.stringify(diary));
    localStorage.setItem('food_diary_date', today);
    // Publish event for legacy parts of the app
    window.dispatchEvent(new Event('food_diary_updated'));

    // Also update consumption history
    const consHistoryStr = localStorage.getItem("consumption_history");
    let history: any[] = [];
    if (consHistoryStr) {
      try { history = JSON.parse(consHistoryStr); } catch (e) {}
    }
    const totalKcal = diary.reduce((acc, curr) => acc + curr.kcal, 0);
    const existingIdx = history.findIndex(h => h.name === today);
    if (existingIdx >= 0) {
      history[existingIdx].value = totalKcal;
    } else {
      history.push({ name: today, value: totalKcal });
    }
    localStorage.setItem("consumption_history", JSON.stringify(history));

  }, [diary]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const addFoodEntry = (entry: Omit<FoodEntry, 'id'>) => {
    setDiary((prev) => [...prev, { ...entry, id: Date.now().toString() + Math.random().toString() }]);
  };

  const removeFoodEntry = (id: string) => {
    setDiary((prev) => prev.filter((d) => d.id !== id));
  };

  const macros = useMemo(() => {
    let actKey: ActivityLevel = 'light';
    switch (profile.activityLevel) {
      case 'Sedentary': actKey = 'sedentary'; break;
      case 'Lightly Active': actKey = 'light'; break;
      case 'Moderately Active': actKey = 'moderate'; break;
      case 'Very Active': actKey = 'very_active'; break;
    }

    let bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
    if (profile.bodyFat && profile.bodyFat > 0) {
      bmr = 370 + (21.6 * (profile.weight * (100 - profile.bodyFat) / 100));
    }

    const tdee = calculateTDEE(bmr, actKey);

    let goalKey: Goal = 'maintain';
    if (profile.primaryGoal === 'Lose Fat') goalKey = 'lose';
    if (profile.primaryGoal === 'Build Muscle') goalKey = 'gain';

    return calculateMacros(tdee, goalKey);
  }, [profile]);

  const consumed = useMemo(() => {
    return diary.reduce(
      (acc, entry) => {
        acc.calories += entry.kcal;
        acc.protein += entry.protein;
        acc.carbs += entry.carbs;
        acc.fat += entry.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [diary]);

  return (
    <FitnessContext.Provider
      value={{
        profile,
        updateProfile,
        diary,
        addFoodEntry,
        removeFoodEntry,
        macros,
        consumed,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitness must be used within a FitnessProvider');
  }
  return context;
}
