import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncProfile, saveWorkoutPlan, logFoodItem, logWeightRecord, deleteFoodItem, saveExerciseWeights } from '../services/firebaseService';

interface UserProfile {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: 'male' | 'female';
  bodyFat?: number;
  primaryGoal?: string;
  preferredStyle?: string;
  activityLevel?: string;
}

interface TrainingLogs {
  [exerciseName: string]: {
    weight: number;
    reps: number;
    completed: boolean;
    timestamp: number;
  }[];
}

interface NutritionEntry {
  id?: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

// Giá trị mặc định - dùng để reset khi đăng xuất / user mới đăng nhập
export const defaultState = {
  profile: null as UserProfile | null,
  workoutPlan: null as any,
  exerciseWeights: {} as Record<string, number>,
  sessionLogs: {} as TrainingLogs,
  nutritionDiary: [] as NutritionEntry[],
  waterIntake: 0,
  stravaCalories: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  lastActiveDate: new Date().toISOString().split('T')[0],
};

interface AppState {
  // Persistence helpers
  lastActiveDate: string;
  lastResetDate: string;
  checkDailyReset: () => void;
  checkAndResetDaily: () => void;
  hydrateStore: (data: any) => void;
  resetStore: () => void;

  // Profile
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;

  // Training
  workoutPlan: any | null;
  exerciseWeights: Record<string, number>;
  sessionLogs: TrainingLogs;
  setWorkoutPlan: (plan: any) => void;
  updateExerciseWeight: (name: string, weight: number) => void;
  setExerciseWeights: (weights: Record<string, number>) => void;
  logSet: (exName: string, set: any) => void;
  clearSessionLogs: () => void;

  // Nutrition
  nutritionDiary: NutritionEntry[];
  addNutritionEntry: (entry: NutritionEntry) => void;
  removeNutritionEntry: (index: number) => void;
  clearNutritionDiary: () => void;
  waterIntake: number;
  addWater: (amount: number) => void;
  resetWater: () => void;

  // Strava
  stravaCalories: number;
  setStravaCalories: (calories: number) => void;

  // Global UI
  language: 'en' | 'vi';
  setLanguage: (lang: 'en' | 'vi') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      lastActiveDate: new Date().toISOString().split('T')[0],
      lastResetDate: new Date().toISOString().split('T')[0],
      checkDailyReset: () => { // Keep for backwards compat
        get().checkAndResetDaily();
      },
      checkAndResetDaily: () => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        if (state.lastResetDate !== today) {
          set({
            lastResetDate: today,
            lastActiveDate: today,
            nutritionDiary: [],
            waterIntake: 0,
            sessionLogs: {},
            stravaCalories: 0
          });
        }
      },
      hydrateStore: (data: any) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => {
          let totalWater = 0;
          const diary: NutritionEntry[] = [];
          
          if (data.nutritionDiary) {
            data.nutritionDiary.forEach((entry: any) => {
              if (entry.name === 'WaterLoggedByApp') {
                totalWater += (entry.kcal || 0); // Using kcal field to store water amount as an integer hack to bypass firestore rule limitations
              } else {
                diary.push(entry);
              }
            });
          }

          return {
            ...state,
            profile: data.profile || state.profile,
            workoutPlan: data.workoutPlan || state.workoutPlan,
            nutritionDiary: diary,
            waterIntake: totalWater,
            exerciseWeights: data.exerciseWeights || state.exerciseWeights,
            lastActiveDate: today,
          };
        });
      },

      resetStore: () => {
        set({
          ...defaultState,
          lastResetDate: new Date().toISOString().split('T')[0],
          lastActiveDate: new Date().toISOString().split('T')[0],
        });
      },

      profile: null,
      setProfile: (profile) => {
        set({ profile });
        if (profile) {
          syncProfile(profile);
          if (profile.weight) {
            logWeightRecord(profile.weight);
          }
        }
      },

      workoutPlan: null,
      exerciseWeights: {},
      sessionLogs: {},
      setWorkoutPlan: (workoutPlan) => {
        set({ workoutPlan });
        saveWorkoutPlan(workoutPlan);
      },
      updateExerciseWeight: (name, weight) => {
        set((state) => {
          const updated = { ...state.exerciseWeights, [name]: weight };
          saveExerciseWeights(updated);
          return { exerciseWeights: updated };
        });
      },
      setExerciseWeights: (weights) => {
        set({ exerciseWeights: weights });
        saveExerciseWeights(weights);
      },
      logSet: (exName, setEntry) => set((state) => {
        const currentLogs = state.sessionLogs[exName] || [];
        return {
          sessionLogs: {
            ...state.sessionLogs,
            [exName]: [...currentLogs, setEntry]
          }
        };
      }),
      clearSessionLogs: () => set({ sessionLogs: {} }),

      nutritionDiary: [],
      addNutritionEntry: (entry) => {
        const enhancedEntry = {
          ...entry,
          id: entry.id || crypto.randomUUID(),
          timestamp: entry.timestamp || new Date().toISOString()
        };
        set((state) => ({
          nutritionDiary: [enhancedEntry, ...state.nutritionDiary]
        }));
        logFoodItem(enhancedEntry);
      },
      removeNutritionEntry: (index) => {
        const item = get().nutritionDiary[index];
        if (item && item.id) {
          deleteFoodItem(item.id);
        }
        set((state) => ({
          nutritionDiary: state.nutritionDiary.filter((_, i) => i !== index)
        }));
      },
      clearNutritionDiary: () => set({ nutritionDiary: [] }),
      waterIntake: 0,
      addWater: (amount) => {
        set((state) => ({ waterIntake: state.waterIntake + amount }));
        // Log water to firestore via nutrition entry hack
        logFoodItem({
          name: 'WaterLoggedByApp',
          kcal: amount, // Safe hack: store water amount in kcal field since firestore only allows number
          protein: 0,
          carbs: 0,
          fat: 0,
          timestamp: new Date().toISOString()
        });
      },
      resetWater: () => set({ waterIntake: 0 }),
      
      stravaCalories: 0,
      setStravaCalories: (calories) => set({ stravaCalories: calories }),

      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'fitmetric-storage',
    }
  )
);
