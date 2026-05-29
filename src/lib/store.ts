import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncProfile, saveWorkoutPlan, logFoodItem, logWeightRecord, deleteFoodItem, saveExerciseWeights } from '../services/firebaseService';
import { toast } from 'sonner';

interface UserProfile {
  name?: string;
  dateOfBirth?: string;
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
    rpe?: number;
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
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
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
  customExercises: [] as any[],
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
  removeLogSet: (exName: string, index: number) => void;
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

  // Custom Exercises Library
  customExercises: any[];
  addCustomExercise: (exercise: any) => void;
  addExerciseToLibraryIfMissing: (ex: any) => void;

  // Global UI
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
        
        // Auto add exercises to library if missing
        if (workoutPlan?.days) {
          workoutPlan.days.forEach((day: any) => {
            if (day.exercises) {
              day.exercises.forEach((ex: any) => {
                get().addExerciseToLibraryIfMissing(ex);
              });
            }
          });
        }
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
      removeLogSet: (exName, index) => set((state) => {
        const currentLogs = state.sessionLogs[exName] || [];
        const newLogs = [...currentLogs];
        newLogs.splice(index, 1);
        return {
          sessionLogs: {
            ...state.sessionLogs,
            [exName]: newLogs
          }
        };
      }),
      clearSessionLogs: () => set({ sessionLogs: {} }),

      nutritionDiary: [],
      addNutritionEntry: (entry) => {
        if (entry.kcal > 5000 || entry.protein > 300 || entry.carbs > 600 || entry.fat > 300) {
          toast.warning("Lượng dinh dưỡng của món này có vẻ cao bất thường. Hãy kiểm tra lại số liệu!");
        }
        
        let inferredMealType = entry.mealType;
        if (!inferredMealType && entry.name !== 'WaterLoggedByApp') {
          const hour = new Date().getHours();
          if (hour >= 5 && hour < 11) inferredMealType = 'breakfast';
          else if (hour >= 11 && hour < 16) inferredMealType = 'lunch';
          else if (hour >= 16 && hour < 22) inferredMealType = 'dinner';
          else inferredMealType = 'snack';
        }

        const enhancedEntry = {
          ...entry,
          id: entry.id || crypto.randomUUID(),
          timestamp: entry.timestamp || new Date().toISOString(),
          mealType: inferredMealType
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
        set((state) => {
          const newIntake = state.waterIntake + amount;
          if (newIntake > 8000) {
            toast.warning("Bạn đã uống hơn 8 lít nước hôm nay. Cẩn thận nguy cơ ngộ độc nước (Water Intoxication)!");
          }
          return { waterIntake: newIntake };
        });
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
      
      customExercises: [],
      addCustomExercise: (exercise) => set((state) => {
        const exists = state.customExercises.some(
          (e: any) => e.n.toLowerCase() === exercise.n.toLowerCase()
        );
        if (exists) return {};
        return { customExercises: [...state.customExercises, exercise] };
      }),
      addExerciseToLibraryIfMissing: (ex) => {
        if (!ex || !ex.name) return;
        const name = ex.name.trim();
        const defaultNames = [
          "bench press", "incline dumbbell press", "dumbbell bench press", "barbell row",
          "lat pulldown", "seated cable row", "back squat", "leg press", "deadlift",
          "romanian deadlift", "overhead press", "lateral raise", "barbell curl",
          "tricep pushdown", "calf raise", "kettlebell swings", "dumbbell thrusters",
          "pushups", "diamond pushups", "chest dips", "pullups", "chinups",
          "inverted row", "pike pushups", "handstand pushups", "bodyweight squat",
          "bulgarian split squat", "pistol squat", "walking lunges", "plank",
          "l-sit", "hanging leg raise", "dragon flag", "burpees", "mountain climber",
          "band chest press", "band fly", "band seated row", "band lat pulldown",
          "band squat", "band glute bridge", "band overhead press", "band bicep curl",
          "band tricep pushdown", "band woodchopper"
        ];
        const cleanName = name.toLowerCase();
        const isDefault = defaultNames.some(n => 
          n === cleanName || 
          cleanName.includes(n) || 
          n.includes(cleanName)
        );
        if (isDefault) return;
        const isCustom = get().customExercises.some((e: any) => e.n.toLowerCase() === cleanName);
        if (isCustom) return;
        
        get().addCustomExercise({
          n: name,
          m: ex.muscle || "General",
          d: 3,
          e: 4,
          a: "-",
          l: ex.style || "Gym",
          v: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`
        });
      },
    }),
    {
      name: 'fitmetric-storage',
    }
  )
);

export const calculateAge = (dob: string | undefined): number | undefined => {
  if (!dob) return undefined;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age;
};
