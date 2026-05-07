import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncProfile, saveWorkoutPlan, logFoodItem, logWeightRecord } from '../services/firebaseService';

interface UserProfile {
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
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

interface AppState {
  // Profile
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;

  // Training
  workoutPlan: any | null;
  exerciseWeights: Record<string, number>;
  sessionLogs: TrainingLogs;
  setWorkoutPlan: (plan: any) => void;
  updateExerciseWeight: (name: string, weight: number) => void;
  logSet: (exName: string, set: any) => void;
  clearSessionLogs: () => void;

  // Nutrition
  nutritionDiary: NutritionEntry[];
  addNutritionEntry: (entry: NutritionEntry) => void;
  removeNutritionEntry: (index: number) => void;
  waterIntake: number;
  addWater: (amount: number) => void;

  // Global UI
  language: 'en' | 'vi';
  setLanguage: (lang: 'en' | 'vi') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => {
        set({ profile });
        syncProfile(profile);
        if (profile.weight) {
          logWeightRecord(profile.weight);
        }
      },

      workoutPlan: null,
      exerciseWeights: {},
      sessionLogs: {},
      setWorkoutPlan: (workoutPlan) => {
        set({ workoutPlan });
        saveWorkoutPlan(workoutPlan);
      },
      updateExerciseWeight: (name, weight) => set((state) => ({
        exerciseWeights: { ...state.exerciseWeights, [name]: weight }
      })),
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
        set((state) => ({
          nutritionDiary: [entry, ...state.nutritionDiary]
        }));
        logFoodItem(entry);
      },
      removeNutritionEntry: (index) => set((state) => ({
        nutritionDiary: state.nutritionDiary.filter((_, i) => i !== index)
      })),
      waterIntake: 0,
      addWater: (amount) => set((state) => ({ waterIntake: state.waterIntake + amount })),

      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'fitmetric-storage',
    }
  )
);
