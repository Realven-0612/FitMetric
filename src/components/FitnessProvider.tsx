import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { calculateBMR, calculateMacros, calculateTDEE, ActivityLevel, Goal } from '../lib/fitness-logic';
import { useAuth } from './AuthProvider';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
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
  waterIntake: number;
  logWater: (amount: number) => void;
  weightHistory: any[];
  consumptionStreak: number;
  consumptionChartData: any[];
  activeCalories: number;
  setActiveCalories: (c: number) => void;
}

const defaultProfile: UserProfile = {
  weight: 0,
  height: 0,
  age: 0,
  gender: 'male',
  activityLevel: 'Lightly Active',
  primaryGoal: 'Lose Fat'
};

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [diary, setDiary] = useState<FoodEntry[]>([]);
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [consumptionStreak, setConsumptionStreak] = useState<number>(0);
  const [consumptionChartData, setConsumptionChartData] = useState<any[]>([]);
  const [activeCalories, setActiveCalories] = useState<number>(0);

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

    // Load weight history
    const loadWeightHistory = async () => {
      let history: any[] = [];
      if (user) {
        try {
          const recordsRef = collection(db, "users", user.uid, "weightRecords");
          const qs = await getDocs(recordsRef);
          qs.forEach(doc => {
            history.push({ id: doc.id, ...doc.data() });
          });
          history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}/weightRecords`);
        }
      } else {
        const weightHistoryStr = localStorage.getItem("weight_history");
        if (weightHistoryStr) {
          try {
            history = JSON.parse(weightHistoryStr);
          } catch (e) {}
        }
      }

      if (Array.isArray(history)) {
        setWeightHistory(history);
      }
    };
    loadWeightHistory();

    window.addEventListener('weight_history_updated', loadWeightHistory);

    const today = new Date().toISOString().split('T')[0];
    const loadDailyData = async () => {
      if (user) {
        try {
          const diaryRef = doc(db, 'users', user.uid, 'foodDiary', today);
          const diarySnap = await getDoc(diaryRef);
          if (diarySnap.exists()) {
            setDiary(diarySnap.data().items || []);
          } else {
            setDiary([]);
          }
          
          const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
          const statsSnap = await getDoc(statsRef);
          if (statsSnap.exists()) {
            setWaterIntake(statsSnap.data().waterIntake || 0);
          } else {
            setWaterIntake(0);
          }

          const chartDataStore = [];
          let currentStreak = 0;
          let checkDate = new Date();

          for (let i = 6; i >= 0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             const dStr = d.toISOString().split('T')[0];
             const sRef = doc(db, 'users', user.uid, 'dailyStats', dStr);
             const sSnap = await getDoc(sRef);
             const value = sSnap.exists() ? sSnap.data().consumedCalories || 0 : 0;
             chartDataStore.push({ name: dStr, value });
          }

          while (true) {
             const dStr = checkDate.toISOString().split('T')[0];
             const found = chartDataStore.find((e) => e.name === dStr && e.value > 0);
             if (found) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
             } else {
                if (currentStreak === 0 && dStr === today) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const yDayStr = checkDate.toISOString().split('T')[0];
                    const yDayFound = chartDataStore.find((e) => e.name === yDayStr && e.value > 0);
                    if (!yDayFound) break;
                } else {
                    break;
                }
             }
          }
          setConsumptionStreak(currentStreak);
          setConsumptionChartData(chartDataStore.map(h => {
              const parts = h.name.split('-');
              return { name: `${parseInt(parts[1])}/${parseInt(parts[2])}`, value: h.value };
          }));

        } catch(e) {
          console.error(e);
        }
      } else {
        const savedDate = localStorage.getItem('food_diary_date');
        const savedDiary = localStorage.getItem('food_diary');
        if (savedDate === today && savedDiary) {
          try {
            setDiary(JSON.parse(savedDiary));
          } catch (e) {
            console.error('Failed to parse food diary', e);
          }
        }

        const savedWaterDate = localStorage.getItem('water_date');
        const savedWater = localStorage.getItem('water_intake');
        if (savedWaterDate === today && savedWater) {
          setWaterIntake(Number(savedWater));
        } else {
          setWaterIntake(0);
        }
      }
    };
    loadDailyData();

    return () => {
      window.removeEventListener('weight_history_updated', loadWeightHistory);
    };
  }, [user]);

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

    if (Array.isArray(history) && history.length > 0) {
       let currentStreak = 0;
       let checkDate = new Date();
       while (true) {
          const dStr = checkDate.toISOString().split('T')[0];
          const found = history.find((entry: any) => entry.name === dStr && entry.value > 0);
          if (found) {
             currentStreak++;
             checkDate.setDate(checkDate.getDate() - 1);
          } else {
             if (currentStreak === 0 && dStr === today) {
                 checkDate.setDate(checkDate.getDate() - 1);
                 const yDayFound = history.find((entry: any) => entry.name === checkDate.toISOString().split('T')[0] && entry.value > 0);
                 if (!yDayFound) break;
             } else {
                 break;
             }
          }
       }
       setConsumptionStreak(currentStreak);

       const chartData = [];
       for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const mmdd = `${d.getMonth() + 1}/${d.getDate()}`;
          const entry = history.find((e: any) => e.name === dStr);
          chartData.push({ name: mmdd, value: entry ? entry.value || 0 : 0 });
       }
       setConsumptionChartData(chartData);
    }
  }, [diary]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const addFoodEntry = async (entry: Omit<FoodEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() + Math.random().toString() };
    setDiary((prev) => {
       const updated = [...prev, newEntry];
       syncFirestoreDiary(updated);
       return updated;
    });
  };

  const removeFoodEntry = async (id: string) => {
    setDiary((prev) => {
       const updated = prev.filter((d) => d.id !== id);
       syncFirestoreDiary(updated);
       return updated;
    });
  };

  const syncFirestoreDiary = async (newDiary: FoodEntry[]) => {
    if (user) {
       try {
          const today = new Date().toISOString().split('T')[0];
          const docRef = doc(db, 'users', user.uid, 'foodDiary', today);
          await setDoc(docRef, { userId: user.uid, date: today, items: newDiary, updatedAt: serverTimestamp() }, { merge: true });

          const totalKcal = newDiary.reduce((acc, curr) => acc + curr.kcal, 0);
          const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
          await setDoc(statsRef, { userId: user.uid, date: today, consumedCalories: totalKcal, updatedAt: serverTimestamp() }, { merge: true });
       } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/foodDiary`);
       }
    }
  };

  const macros = useMemo(() => {
    let actKey: ActivityLevel = 'light';
    switch (profile.activityLevel) {
      case 'Sedentary': actKey = 'sedentary'; break;
      case 'Lightly Active': actKey = 'light'; break;
      case 'Moderately Active': actKey = 'moderate'; break;
      case 'Very Active': actKey = 'very_active'; break;
    }

    let bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat);

    const tdee = calculateTDEE(bmr, actKey, activeCalories);

    let goalKey: Goal = 'maintain';
    if (profile.primaryGoal === 'Lose Fat') goalKey = 'lose';
    if (profile.primaryGoal === 'Build Muscle') goalKey = 'gain';

    return calculateMacros(tdee, goalKey);
  }, [profile, activeCalories]);

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

  const logWater = async (amount: number) => {
    setWaterIntake(prev => {
       const newAmount = prev + amount;
       if (user) {
          const today = new Date().toISOString().split('T')[0];
          const statsRef = doc(db, 'users', user.uid, 'dailyStats', today);
          setDoc(statsRef, { userId: user.uid, date: today, waterIntake: newAmount, updatedAt: serverTimestamp() }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/dailyStats`));
       }
       return newAmount;
    });
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('water_intake', waterIntake.toString());
    localStorage.setItem('water_date', today);
  }, [waterIntake]);

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
        waterIntake,
        logWater,
        weightHistory,
        consumptionStreak,
        consumptionChartData,
        activeCalories,
        setActiveCalories,
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
