import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Loader2,
  Zap,
  Play,
  PlayCircle,
  PlusCircle,
  Settings2,
  Trophy,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Wind,
  ExternalLink,
  ArrowRight,
  Activity,
  Unlink,
  RotateCcw,
  Video,
  Trash2,
  Youtube,
  Pause
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation, translateExercise } from "../lib/i18n";
import { heartRateService } from "../services/heartRateService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "../lib/store";
import { useAuth } from "../components/AuthProvider";
import { generateAIContent } from "../lib/ai";
import { AI_MODELS } from "../lib/aiModels";
import { saveSessionRecord, getSessionHistory, deleteSessionRecord, getCustomVideoLibrary, addCustomVideo } from "../services/firebaseService";

export interface LoggedSet {
  weight: number;
  reps: number;
  completed: boolean;
  timestamp: number;
  rpe?: number;
}

export interface TrainingLogs {
  [exerciseName: string]: LoggedSet[];
}

export interface Exercise {
  name: string;
  muscle: string;
  sets: string;
  load?: string;
  rest?: string;
  youtubeId?: string;
  youtubeQuery?: string;
  recommendedWeight?: string;
}

export interface WorkoutDay {
  dayName: string;
  focusName: string;
  description?: string;
  warmup?: string[];
  cooldown?: string[];
  exercises: Exercise[];
}

export interface WorkoutPlan {
  progressionGuide: string;
  days: WorkoutDay[];
  completedSessions?: number;
  currentCycle?: number;
}

const formatSets = (sets: string) => {
  if (typeof sets !== 'string') return sets;
  return sets
    .replace(/đến khi không thực hiện được nữa/gi, 'thất bại')
    .replace(/đến ngưỡng thất bại/gi, 'thất bại')
    .replace(/sets to failure/gi, 'to failure')
    .replace(/sets/gi, 'hiệp')
    .replace(/hiệp tập/gi, 'hiệp');
};

const getExerciseRest = (ex: Exercise, lang: string) => {
  if (ex.rest && ex.rest !== '—') return ex.rest;
  const name = ex.name.toLowerCase();
  const isHeavy = name.includes('squat') || name.includes('deadlift') || name.includes('bench') || name.includes('overhead press') || name.includes('military press');
  if (isHeavy) {
    return lang === 'vi' ? '3 phút' : '3 min';
  }
  return lang === 'vi' ? '90s' : '90s';
};

const parseRestToSeconds = (restStr?: string): number => {
  if (!restStr) return 90;
  const cleaned = restStr.toLowerCase().trim();
  
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  
  const minMatch = cleaned.match(/(\d+(\.\d+)?)\s*(min|m|phút|phut)/);
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1]) * 60);
  }
  
  const secMatch = cleaned.match(/(\d+)\s*(s|sec|giây|giay)/);
  if (secMatch) {
    return parseInt(secMatch[1], 10);
  }
  
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num < 10 ? num * 60 : num;
  }
  
  return 90;
};

// A fallback mapping to ensure the most common exercises have beautiful embedded videos
const VIDEO_LIBRARY: Record<string, string> = {
  // Gym Exercises
  "barbell bench press": "_FkbD0FhgVE",
  "bench press": "_FkbD0FhgVE",
  "incline db press": "8fXfwG4ftaQ",
  "incline dumbbell press": "8fXfwG4ftaQ",
  "dumbbell bench press": "1V3vpcaxRYQ",
  "dumbbell press": "1V3vpcaxRYQ",
  "barbell rows": "Nqh7q3zDCoQ",
  "barbell row": "Nqh7q3zDCoQ",
  "lat pulldown": "bNmvKpJSWKM",
  "lat pull down": "bNmvKpJSWKM",
  "seated cable row": "DHA7QGDa2qg",
  "cable row": "DHA7QGDa2qg",
  "back squat": "dW3zj79xfrc",
  "barbell squat": "dW3zj79xfrc",
  squat: "dW3zj79xfrc",
  "leg press": "EotSw18oR9w",
  deadlift: "xNwpvDuZJ3k",
  "barbell deadlift": "xNwpvDuZJ3k",
  "romanian deadlift": "5rIqP63yWFg",
  rdl: "5rIqP63yWFg",
  "overhead press": "zoN5EH50Dro",
  "military press": "zoN5EH50Dro",
  "shoulder press": "zoN5EH50Dro",
  "lateral raises": "Kl3LEzQ5Zqs",
  "lateral raise": "Kl3LEzQ5Zqs",
  "barbell curls": "in7PaeYlhrM",
  "barbell curl": "in7PaeYlhrM",
  "bicep curl": "in7PaeYlhrM",
  "dumbbell curl": "in7PaeYlhrM",
  "incline dumbbell curl": "aTYlqC_JacQ",
  "incline db curl": "aTYlqC_JacQ",
  "tricep pushdowns": "2-LAMcpzODU",
  "tricep pushdown": "2-LAMcpzODU",
  "cable triceps pushdown": "2-LAMcpzODU",
  "cable tricep pushdown": "2-LAMcpzODU",
  "tricep extension": "2-LAMcpzODU",
  "calf raises": "a-x_NR-ibos",
  "calf raise": "a-x_NR-ibos",
  "kettlebell swings": "n1df4ASFeZU",
  "kettlebell swing": "n1df4ASFeZU",
  "dumbbell thrusters": "qnOikHllwWc",
  thrusters: "qnOikHllwWc",
  "goblet squat": "dW3zj79xfrc",
  "face pulls": "rep-qVOkqgk",
  "face pull": "rep-qVOkqgk",
  "hammer curls": "zC3nLlEvin4",
  "hammer curl": "zC3nLlEvin4",
  "single arm db row": "pYcpY20QaE8",
  "dumbbell row": "pYcpY20QaE8",

  // Calisthenics & Bodyweight
  "standard push-ups": "UIcct-7b6oE",
  "push-ups": "UIcct-7b6oE",
  "push ups": "UIcct-7b6oE",
  pushup: "UIcct-7b6oE",
  "push up": "UIcct-7b6oE",
  "diamond push-ups": "PPTj-MW2tcs",
  "diamond push ups": "PPTj-MW2tcs",
  "chest dips": "NuhXmq6x9Sk",
  dips: "NuhXmq6x9Sk",
  "pull-ups": "aSMnckK_xuo",
  "pull ups": "aSMnckK_xuo",
  "pull up": "aSMnckK_xuo",
  pullup: "aSMnckK_xuo",
  "chin-ups": "Oi3bW9nQmGI",
  "chin ups": "Oi3bW9nQmGI",
  "chin up": "Oi3bW9nQmGI",
  "inverted rows": "EfE7JeD8o6Y",
  "inverted row": "EfE7JeD8o6Y",
  "pike push-ups": "89-8waE2XKI",
  "pike push ups": "89-8waE2XKI",
  "handstand push-ups": "gSjHRuRQ4hk",
  "handstand push ups": "gSjHRuRQ4hk",
  "bodyweight squats": "-5LhNSMBrEs",
  "bodyweight squat": "-5LhNSMBrEs",
  "bulgarian split squat": "uBSoEWZu07k",
  "pistol squats": "bH3mRwnAN88",
  "pistol squat": "bH3mRwnAN88",
  "walking lunges": "BYe4uyGF-h4",
  lunges: "BYe4uyGF-h4",
  lunge: "BYe4uyGF-h4",
  plank: "v25dawSzRTM",
  "l-sit": "XN7qnqooLC8",
  "l sit": "XN7qnqooLC8",
  "hanging leg raises": "2n4UqRIJyk4",
  "hanging leg raise": "2n4UqRIJyk4",
  "leg raises": "2n4UqRIJyk4",
  "dragon flags": "ZA7KEmeZq1E",
  "dragon flag": "ZA7KEmeZq1E",
  burpees: "McK6y7t5_XY",
  burpee: "McK6y7t5_XY",
  "mountain climbers": "7W4JEfEKuC4",
  "mountain climber": "7W4JEfEKuC4",
  "hollow body hold": "LlV68D2K9_I",
  "hollow hold": "LlV68D2K9_I",
  "frog stand": "ZfST669YpVs",
  "russian twists": "wkD8rjkS_Rs",
  "russian twist": "wkD8rjkS_Rs",

  // Resistance Band
  "band chest press": "T0UJ0W-_yIE",
  "band flyes": "PqoL7FOD_Aw",
  "band seated row": "oIIRajGaSfo",
  "band lat pulldown": "K59OGC4aeQ4",
  "band squat": "S5cTdwO1Trk",
  "banded glute bridges": "6oYSPzZlwL0",
  "band overhead press": "1-VfJqjYquQ",
  "band bicep curls": "20xtfGZ37nw",
  "band curl": "20xtfGZ37nw",
  "band tricep pushdown": "PtHlGbiCglY",
  "banded woodchoppers": "64RP6a4zK7Q",
  "band face pulls": "9_unS6_N2lY",
  "band hamstring curls": "uC96jN9L9oY",
  "band pull-apart": "ok7ZbeWpC30",
  "band pull apart": "ok7ZbeWpC30",
};

export default function Training() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { 
    profile, 
    workoutPlan: rawPlan, 
    setWorkoutPlan: setPlan,
    exerciseWeights, 
    updateExerciseWeight,
    setExerciseWeights,
    sessionLogs,
    logSet: storeLogSet,
    removeLogSet,
    clearSessionLogs
  } = useStore();

  // Sanitize plan to handle legacy/malformed Firestore data
  const plan = rawPlan ? (() => {
    const DAY_KEYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    let days = rawPlan.days;
    if (!Array.isArray(days)) {
      // Try to extract from day-name keys
      const fromKeys = DAY_KEYS.map(k => rawPlan[k] || rawPlan[k[0].toUpperCase()+k.slice(1)]).filter(Boolean);
      days = fromKeys.length > 0 ? fromKeys : [];
    }
    // Ensure each day has exercises as an array
    days = days.map((d: any) => ({
      ...d,
      exercises: Array.isArray(d?.exercises) ? d.exercises : [],
      warmup: Array.isArray(d?.warmup) ? d.warmup : [],
      cooldown: Array.isArray(d?.cooldown) ? d.cooldown : [],
    }));
    // Ensure progressionGuide is a string
    let progressionGuide = rawPlan.progressionGuide;
    if (Array.isArray(progressionGuide)) {
      progressionGuide = progressionGuide.map((l: any) => typeof l === 'string' ? l : JSON.stringify(l)).join('\n');
    } else if (typeof progressionGuide !== 'string') {
      progressionGuide = String(progressionGuide ?? '');
    }
    return { ...rawPlan, days, progressionGuide };
  })() : null;

  // Defensive checks
  if (rawPlan && (!plan || !plan.days || !Array.isArray(plan.days))) {
    return <div>No workout plan available. Please generate a new one.</div>;
  }

  const [selectedDay, setSelectedDay] = useState(() =>
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  );
  
  const [customVideoLibrary, setCustomVideoLibrary] = useState<Record<string, string>>({});
  const [missingVideoId, setMissingVideoId] = useState('');
  const [addingVideoEx, setAddingVideoEx] = useState<string | null>(null);

  useEffect(() => {
    getCustomVideoLibrary().then(setCustomVideoLibrary);
  }, []);

  const handleAddCustomVideo = async (exerciseName: string) => {
    if (!missingVideoId) return;
    try {
      await addCustomVideo(exerciseName, missingVideoId);
      setCustomVideoLibrary(prev => ({ ...prev, [exerciseName]: missingVideoId }));
      setAddingVideoEx(null);
      setMissingVideoId('');
      toast.success(t('toast_video_added'));
    } catch {
      toast.error(t('toast_video_error'));
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  
  const [editingSessions, setEditingSessions] = useState(false);
  const [sessionsInput, setSessionsInput] = useState('');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sessionHistoryList, setSessionHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    const history = await getSessionHistory();
    setSessionHistoryList(history);
    setIsLoadingHistory(false);
  };

  const handleDeleteHistory = async (id: string) => {
    if (confirm('Delete this session?')) {
      await deleteSessionRecord(id);
      setSessionHistoryList(prev => prev.filter(s => s.id !== id));
      if (plan && plan.completedSessions > 0) {
        setPlan({ ...plan, completedSessions: plan.completedSessions - 1 });
      }
    }
  };

  const [showPBModal, setShowPBModal] = useState(false);
  const [editingWeights, setEditingWeights] = useState<Record<string, number>>({});

  // Customization state
  const [focus, setFocus] = useState("");
  const [frequency, setFrequency] = useState("4");
  const [equipment, setEquipment] = useState("gym");
  const [goal, setGoal] = useState("hypertrophy");
  
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [hrConnected, setHrConnected] = useState(false);
  const hasTriggeredAutoGenerate = useRef(false);
  const [latestSessionRpeFeedback, setLatestSessionRpeFeedback] = useState<any[]>([]);

  useEffect(() => {
    const loadLatestSessionRpe = async () => {
      if (!user) return;
      try {
        const history = await getSessionHistory();
        if (history && history.length > 0) {
          const latest = history[0];
          if (latest && latest.logs) {
            const feedback: any[] = [];
            Object.entries(latest.logs).forEach(([exName, sets]: [string, any]) => {
              if (Array.isArray(sets)) {
                const rpes = sets.map(s => s.rpe).filter(Boolean) as number[];
                if (rpes.length > 0) {
                  const avgRpe = rpes.reduce((a, b) => a + b, 0) / rpes.length;
                  feedback.push({ name: exName, avgRpe: avgRpe.toFixed(1) });
                }
              }
            });
            setLatestSessionRpeFeedback(feedback);
          }
        }
      } catch (e) {
        console.error("Error loading latest session RPE:", e);
      }
    };
    loadLatestSessionRpe();
  }, [user, plan?.completedSessions]);

  const toggleHeartRate = async () => {
    if (hrConnected) {
      heartRateService.disconnect();
      setHrConnected(false);
      setHeartRate(null);
      toast.info(t('hr_disconnected'));
    } else {
      try {
        await heartRateService.connect((update) => {
          setHeartRate(update.heartRate);
        });
        setHrConnected(true);
        toast.success(t('hr_connected'));
      } catch (err) {
        toast.error(t('hr_connect_failed'));
      }
    }
  };

  const applyAllRecommendedWeights = () => {
    if (!currentDayData?.exercises) return;
    let appliedCount = 0;
    currentDayData.exercises.forEach(ex => {
      if (!ex.recommendedWeight) return;
      
      if (/body\s*weight/i.test(ex.recommendedWeight)) {
        if (profile?.weight) {
          updateExerciseWeight(ex.name, profile.weight);
          appliedCount++;
        }
        return;
      }
      
      const match = ex.recommendedWeight.match(/(\d+(\.\d+)?)/);
      if (match) {
        const weight = parseFloat(match[1]);
        updateExerciseWeight(ex.name, weight);
        appliedCount++;
      }
    });
    if (appliedCount > 0) {
      toast.success(t('apply_all'));
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(200);
            }
            toast.info(t('next_set_ready'), {
              icon: <Zap className="w-4 h-4 text-cyan-400" />,
              duration: 5000
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    const handleRemoteRequest = () => {
      const intent = localStorage.getItem('workout_request_intent');
      if (intent) {
        setFocus(intent);
        localStorage.removeItem('workout_request_intent');
        handleGenerate(false, intent);
      } else {
        handleGenerate(false);
      }
    };

    window.addEventListener('request_workout_generation', handleRemoteRequest);
    return () => {
      window.removeEventListener('request_workout_generation', handleRemoteRequest);
    };
  }, [profile, goal, equipment, frequency]);

  useEffect(() => {
    if (profile?.primaryGoal) {
      if (profile.primaryGoal.includes("Fat")) setGoal("fatloss");
      else if (profile.primaryGoal.includes("Muscle")) setGoal("hypertrophy");
      else if (profile.primaryGoal.includes("Strength")) setGoal("strength");
    }
  }, [profile]);

  useEffect(() => {
    if (
      profile &&
      !plan &&
      !isGenerating &&
      !hasTriggeredAutoGenerate.current
    ) {
      hasTriggeredAutoGenerate.current = true;
      handleGenerate(false);
    }
  }, [profile, plan, isGenerating]);

  const handleSaveSessions = () => {
    const val = parseInt(sessionsInput);
    if (!isNaN(val) && val >= 0) {
      if (plan) {
        const updatedPlan = { ...plan, completedSessions: val };
        setPlan(updatedPlan);
      }
    }
    setEditingSessions(false);
  };

  const handleSavePBWeights = () => {
    // Thay toàn bộ object thay vì update từng cái → xóa được bài đã remove
    const cleaned = Object.fromEntries(
      Object.entries(editingWeights).filter(([_, w]) => w > 0)
    );
    setExerciseWeights(cleaned);
    setShowPBModal(false);
  };

  const handleWeightChange = (exName: string, delta: number) => {
    const current = exerciseWeights[exName] || 0;
    let newW = current + delta;
    newW = Math.max(0, Math.round(newW * 10) / 10);
    updateExerciseWeight(exName, newW);
  };

  const applyRecommendedWeight = (ex: any) => {
    if (!ex.recommendedWeight) return;
    if (/body\s*weight/i.test(ex.recommendedWeight)) {
      const bw = profile?.weight;
      if (bw) {
        updateExerciseWeight(ex.name, bw);
        toast.success(`${ex.name}: ${bw}kg (bodyweight)`, {
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />
        });
      } else {
        toast.info(t('toast_no_weight'));
      }
      return;
    }
    const match = ex.recommendedWeight.match(/(\d+(\.\d+)?)/);
    if (match) {
      const weight = parseFloat(match[1]);
      updateExerciseWeight(ex.name, weight);
      toast.success(`${t('suggested')} ${ex.name}: ${weight}kg`, {
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />
      });
    } else {
      toast.info(`"${ex.recommendedWeight}"`);
    }
  };

  const logSet = (exName: string, weight: number, reps: number, restSeconds: number = 60, rpe?: number) => {
    storeLogSet(exName, { weight, reps, completed: true, timestamp: Date.now(), rpe });

    setTimerSeconds(restSeconds);
    setTimerTotal(restSeconds);
    setTimerActive(true);
    
    if (weight > (exerciseWeights[exName] || 0)) {
      updateExerciseWeight(exName, weight);
    }
  };

  const calculateVolume = () => {
    let total = 0;
    Object.values(sessionLogs).forEach(sets => {
      sets.forEach(s => {
        total += s.weight * s.reps;
      });
    });
    return total;
  };

  const handleGenerate = async (isAutoRefresh = false, overrideFocus?: string) => {
    setIsGenerating(true);

    try {
      let promptContext = "";
      if (profile) {
        promptContext = `User Profile:
         - Age: ${profile.age}
         - Weight: ${profile.weight} kg
         - Goal: ${goal}
         - Training Style: ${profile.preferredStyle}
         - Activity Level: ${profile.activityLevel}`;
      }

      const customRules = isAutoRefresh
        ? `We are auto-leveling up the plan! Make it 5-10% harder than a standard plan.`
        : `Focus Request: ${overrideFocus || focus}`;

      const allowedExercises = Object.keys({ ...VIDEO_LIBRARY, ...customVideoLibrary }).join(', ');

      const currentPlanContext = plan 
        ? `- Current Weekly Workout Plan (use as reference to modify or shift rather than creating new): ${JSON.stringify({
            days: plan.days.map(d => ({
              dayName: d.dayName,
              focusName: d.focusName,
              exercises: d.exercises.map(ex => ({
                name: ex.name,
                muscle: ex.muscle,
                sets: ex.sets,
                rest: ex.rest,
                recommendedWeight: ex.recommendedWeight
              }))
            }))
          })}`
        : "- Current Weekly Workout Plan: None (generate from scratch)";

      const rpeContext = latestSessionRpeFeedback.length > 0
        ? `- Recent Workout RPE Feedback (average perceived effort from 1 to 10 for the last session, where RPE 10 is absolute max effort, 9 means 1 rep left in reserve, 8 means 2 reps left, and <7 is light): ${JSON.stringify(latestSessionRpeFeedback)}`
        : "";

      const prompt = `As an elite strength and conditioning coach, generate a highly optimized weekly workout plan.
      ${promptContext}
      - Equipment: ${equipment}
      - Frequency: ${frequency} days per week
      - Focus/Custom: ${customRules}
      ${currentPlanContext}
      - Current Personal Best Weights: ${JSON.stringify(exerciseWeights)}
      ${rpeContext}
      - Output Language: ${language === 'vi' ? 'Vietnamese' : 'English'}
      - Allowed Exercises List: ${allowedExercises}
      
      Rules:
      1. Use science-based splits (e.g., Full Body for 3 days, Upper/Lower for 4 days, PPL for 6 days).
      2. You MUST ONLY select exercises from the "Allowed Exercises List". Do not invent new exercises. Be exact with names.
      3. Output EXACTLY 7 days, Monday to Sunday. If a day is for rest, set focusName to ${language === 'vi' ? '"Ngày nghỉ"' : '"Rest Day"'} and leave exercises empty.
         CRITICAL FOR FLEXIBILITY, DAY SWITCHING & EXCLUSIONS:
         - If the user's Focus/Custom request asks to exclude/skip specific days (e.g., "chừa thứ 2 ra" / "không tập thứ 2" / "exclude Monday"), you MUST mark those specific days as Rest Day ("Ngày nghỉ" / "Rest Day") with zero exercises. Move any exercises originally scheduled for those days to other days to maintain total volume.
         - If the user's Focus/Custom request asks to shift, move, or swap days (e.g., "đổi thứ 2 qua ngày khác" / "move Monday to Tuesday"), you MUST shift Monday's exact exercises and focus name to the target day (e.g. Tuesday), swapping their schedules while leaving other days unchanged.
         - If there is a Current Weekly Workout Plan, do NOT generate a brand new workout routine or invent new exercises from scratch unless explicitly requested! Instead, perform incremental modifications to the Current Weekly Workout Plan (such as changing a single exercise, shifting days, or excluding a day) while keeping the remaining days and exercises exactly as they are.
      4. progressionGuide must be a single plain string (no arrays, no bullet markdown) with each week separated by a newline character. Must be written in ${language === 'vi' ? 'Vietnamese' : 'English'}. Include 'Week 1', 'Week 2' etc.
      CRITICAL: Your ENTIRE response must be ONLY a valid JSON object. Start your response with '{' and end with '}'. No extra text, no markdown, no code blocks.
      5. Provide an accurate youtubeQuery string (e.g. "Barbell Bench Press tutorial form") for each exercise. Always keep this string in English.
      6. Provide a list of dynamic warm-up exercises in the 'warmup' array and a list of static cool-down stretches in the 'cooldown' array based on the day's focus. Write them in ${language === 'vi' ? 'Vietnamese' : 'English'}.
      7. Provide a 'recommendedWeight' (e.g. "20kg", "Bodyweight", "15kg per dumbbell") for each exercise. Always provide a single specific number, not a range.
         IMPORTANT: If an exercise exists in "Current Personal Best Weights", recommend a weight that is 2.5% to 5% higher (Progressive Overload).
         If it's a new exercise, estimate based on the user's weight (e.g. Bench Press often starts around 40-50% bodyweight for beginners, Squat 60-70%).
         If the exercise uses resistance bands (e.g., has "Band" or "Dây kháng lực" in the name), recommend a band tension level (e.g., "Light Band", "Medium Band", "Heavy Band" / "Dây nhẹ", "Dây vừa", "Dây nặng") instead of "Bodyweight".
      8. If Output Language is Vietnamese, MUST translate "to failure" as "đến ngưỡng thất bại" (do NOT use "đến khi không thực hiện được nữa").
      9. Provide a 'rest' time (e.g. "90s", "2 phút" / "2 min") for each exercise in the 'rest' property based on its intensity. Recommend "3 phút" / "3 min" for heavy compounds, and "90s" or "60s" for isolation lifts.
      10. AUTOREGULATION based on Recent Workout RPE Feedback:
          - If an exercise had a recent average RPE of 9.5 or 10 (Maximal effort/Overtraining risk): you MUST KEEP the recommended weight the same or DECREASE it by 5-10% in the new plan to prevent overtraining and allow recovery. Do NOT apply progressive overload for this exercise.
          - If an exercise had a recent average RPE of 8 to 9 (Optimal effort): increase weight slightly (2.5% to 5%) for progressive overload.
          - If an exercise had a recent average RPE of 7 or lower (Too light): increase weight by 5% to 10% to ensure adequate training stimulus.`;

      const schema = {
        type: "object",
        properties: {
          progressionGuide: { type: "string" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                dayName: { type: "string" },
                focusName: { type: "string" },
                description: { type: "string" },
                warmup: {
                  type: "array",
                  items: { type: "string" },
                },
                cooldown: {
                  type: "array",
                  items: { type: "string" },
                },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      muscle: { type: "string" },
                      sets: { type: "string" },
                      load: { type: "string" },
                      rest: { type: "string" },
                      youtubeQuery: { type: "string" },
                      recommendedWeight: { type: "string" },
                    },
                    required: ["name", "muscle", "sets", "rest"],
                  },
                },
              },
              required: ["dayName", "focusName", "exercises"],
            },
          },
        },
        required: ["progressionGuide", "days"],
      };

      const result = await generateAIContent(prompt, schema);
      console.log(">>> [Training] Kết quả AI (raw result):", JSON.stringify(result, null, 2));

      if (result) {
        const validDays = [];
        const daysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        const daysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dayNames = language === 'vi' ? daysVi : daysEn;
        const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        
        // ─── Universal parser: find days array no matter the response shape ───
        const DAY_KEYS_LOWER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

        // Check if an object looks like a single workout day
        const isDayObject = (obj: any): boolean =>
          obj && typeof obj === 'object' && !Array.isArray(obj) &&
          ('exercises' in obj || 'focusName' in obj || 'focus' in obj);

        // Check if an array looks like a list of workout days
        const isDaysArray = (arr: any[]): boolean =>
          arr.length >= 3 && arr.some(item => isDayObject(item));

        // Extract days from { monday: {...}, tuesday: {...}, ... } style object
        const extractFromDayKeyed = (obj: any): any[] | null => {
          const found = DAY_KEYS_LOWER.map(k =>
            obj[k] || obj[k.charAt(0).toUpperCase() + k.slice(1)]
          ).filter(Boolean);
          return found.length >= 3 ? DAY_KEYS_LOWER.map(k =>
            obj[k] || obj[k.charAt(0).toUpperCase() + k.slice(1)] ||
            { focusName: language === 'vi' ? "Ngày nghỉ" : "Rest Day", exercises: [] }
          ) : null;
        };

        // Recursively search for the days array in any nested structure
        const findDays = (data: any, depth = 0): any[] | null => {
          if (depth > 5) return null; // prevent infinite loops
          if (Array.isArray(data) && isDaysArray(data)) return data;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            // Check if this object itself is day-keyed
            const fromKeys = extractFromDayKeyed(data);
            if (fromKeys) return fromKeys;
            // Otherwise check each value
            for (const val of Object.values(data)) {
              const found = findDays(val, depth + 1);
              if (found) return found;
            }
          }
          return null;
        };

        let daysArray: any[] = findDays(result) || [];
        console.log(">>> [Training] Parsed daysArray length:", daysArray.length, "first day:", daysArray[0]?.focusName || daysArray[0]?.focus);

        // If still empty, last resort: treat the result itself as day-keyed
        if (daysArray.length === 0) {
          daysArray = DAY_KEYS_LOWER.map(() => ({
            focusName: language === 'vi' ? "Ngày nghỉ" : "Rest Day",
            exercises: []
          }));
        }

        // Normalise each day: handle 'exerciseName' vs 'name', ensure arrays
        daysArray = daysArray.map((d: any) => ({
          ...d,
          focusName: d.focusName || d.focus || (language === 'vi' ? "Ngày nghỉ" : "Rest Day"),
          exercises: (Array.isArray(d?.exercises) ? d.exercises : []).map((ex: any) => ({
            ...ex,
            name: ex.name || ex.exerciseName || "Unknown",
          })),
          warmup: Array.isArray(d?.warmup) ? d.warmup : [],
          cooldown: Array.isArray(d?.cooldown) ? d.cooldown : [],
        }));

        for (let i = 0; i < 7; i++) {
          const d = daysArray[i] || { focusName: language === 'vi' ? "Ngày nghỉ" : "Rest Day", exercises: [] };
          validDays.push({ ...d, dayName: dayNames[i] });
        }

        // Find progressionGuide anywhere in the result
        const findGuide = (data: any, depth = 0): string | null => {
          if (depth > 5 || !data || typeof data !== 'object') return null;
          if (data.progressionGuide && typeof data.progressionGuide === 'string') return data.progressionGuide;
          for (const val of Object.values(data)) {
            const found = findGuide(val, depth + 1);
            if (found) return found;
          }
          return null;
        };
        const guideDefault = "Tăng dần mức tạ 2.5-5% mỗi tuần.";

        const newPlan: WorkoutPlan = {
          progressionGuide: findGuide(result) || guideDefault,
          days: validDays,
          completedSessions: plan ? plan.completedSessions : 0,
          currentCycle: plan
            ? isAutoRefresh
              ? (plan.currentCycle || 1) + 1
              : plan.currentCycle
            : 1,
        };

        setPlan(newPlan);
        window.dispatchEvent(new Event("workout_plan_updated"));

        if (!isAutoRefresh) {
          setOpen(false);
          toast.success(t('toast_plan_generated'));
        } else {
          toast.success(t('toast_plan_upgraded'));
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(t('toast_plan_error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const markSessionComplete = () => {
    if (!plan) return;
    const currentDay = plan.days[selectedDay];
    if (!currentDay || currentDay.exercises.length === 0) {
      toast.info(t('toast_rest_day'));
      return;
    }

    const totalVol = Object.values(sessionLogs).reduce((sum: number, sets: any[]) =>
      sum + sets.reduce((s: number, set: any) => s + set.weight * set.reps, 0), 0
    );
    saveSessionRecord(sessionLogs, totalVol);

    clearSessionLogs();

    const newPlan = {
      ...plan,
      completedSessions: (plan.completedSessions || 0) + 1,
    };
    setPlan(newPlan);
    toast.success(t('toast_session_done'));

    // Auto upgrade check (every 14 sessions)
    if (newPlan.completedSessions && newPlan.completedSessions % 14 === 0) {
      toast(t('toast_milestone'));
      handleGenerate(true);
    }
  };

  const getEmbeddedVideo = (exerciseName: string) => {
    const lowerName = exerciseName.toLowerCase().trim();
    const mergedLibrary = { ...VIDEO_LIBRARY, ...customVideoLibrary };
    let matchedId = mergedLibrary[lowerName] || null;

    if (!matchedId) {
      const sortedKeys = Object.keys(mergedLibrary).sort(
        (a, b) => b.length - a.length,
      );
      for (const key of sortedKeys) {
        if (lowerName.includes(key)) {
          matchedId = mergedLibrary[key];
          break;
        }
      }
    }

    if (matchedId) {
      return (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${matchedId}`}
          title={translateExercise(exerciseName, language)}
          frameBorder="0"
          className="rounded-xl absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    // Fallback: missing video UI
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#0a0d14]/90 backdrop-blur-md border border-white/5 rounded-2xl shadow-inner">
        <div className="w-12 h-12 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-3">
          <Video className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-slate-300 text-xs mb-4 font-semibold leading-relaxed max-w-xs">
          Video chưa có sẵn cho bài tập <span className="font-black text-cyan-400">{translateExercise(exerciseName, language)}</span>.
        </p>
        
        {addingVideoEx === lowerName ? (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Input 
              placeholder="Nhập ID Youtube (VD: _FkbD0FhgVE)" 
              className="bg-black/40 border-white/10 h-10 rounded-xl text-xs placeholder:text-slate-600 text-white focus:border-cyan-500/40"
              value={missingVideoId}
              onChange={e => setMissingVideoId(e.target.value)}
            />
            <div className="flex gap-2 w-full">
              <Button size="sm" onClick={() => handleAddCustomVideo(lowerName)} className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black h-9 rounded-lg font-black uppercase text-[10px] tracking-wider transition-all">
                Lưu
              </Button>
              <Button size="sm" variant="ghost" className="flex-1 h-9 hover:bg-white/10 rounded-lg text-slate-400 font-bold uppercase text-[10px] tracking-wider transition-all" onClick={() => {
                setAddingVideoEx(null);
                setMissingVideoId('');
              }}>
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest text-[9px] h-10 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)]"
            onClick={() => setAddingVideoEx(lowerName)}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Bổ sung vào Database
          </Button>
        )}
      </div>
    );
  };

  const getGoogleCalendarUrl = (day: WorkoutDay, index: number) => {
    const now = new Date();
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + (index - todayIndex));
    
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const date = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${date}`;
    
    const title = encodeURIComponent(`${day.focusName} Workout - FitMetric`);
    let desc = day.description || "";
    day.exercises.forEach((ex) => {
      desc += `\n- ${ex.name} (${ex.sets}) | Load: ${ex.load || "Bodyweight"} | Rest: ${ex.rest || "N/A"}`;
    });
    const details = encodeURIComponent(desc);
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
  };

  const exportToCalendar = () => {
    if (!plan) return;

    const now = new Date();
    const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;

    let icsString =
      "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Studio//Workout Plan//EN\n";

    for (let i = 0; i < 7; i++) {
      const day = plan.days[i];
      if (day.focusName === "Rest Day") continue;

      const targetDate = new Date();
      targetDate.setDate(now.getDate() + (i - todayIndex));

      const dateString = targetDate
        .toISOString()
        .replace(/[-:]/g, "")
        .split("T")[0];

      let desc = day.description || "";
      day.exercises.forEach((ex) => {
        desc += `\\n- ${ex.name} (${ex.sets}) | Load: ${ex.load || "Bodyweight"} | Rest: ${ex.rest || "N/A"}`;
      });

      icsString += "BEGIN:VEVENT\n";
      icsString += `DTSTART;VALUE=DATE:${dateString}\n`;
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateString = endDate
        .toISOString()
        .replace(/[-:]/g, "")
        .split("T")[0];
      icsString += `DTEND;VALUE=DATE:${endDateString}\n`;
      icsString += `SUMMARY:${day.focusName} Workout\n`;
      icsString += `DESCRIPTION:${desc}\n`;
      icsString += `RRULE:FREQ=WEEKLY;COUNT=12\n`;
      icsString += "END:VEVENT\n";
    }

    icsString += "END:VCALENDAR";

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "workout_plan.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('toast_calendar_exported'));
  };

  const currentDayData = plan ? plan.days[selectedDay] : null;
  const isRestDay =
    !currentDayData ||
    !currentDayData.exercises ||
    currentDayData.exercises.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto px-4 md:px-8 space-y-8">
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="bg-[#0c0d12]/95 backdrop-blur-xl border-white/5 text-white max-w-2xl w-[95vw] shadow-2xl overflow-y-auto max-h-[85vh] rounded-[2rem]">
          <DialogHeader className="border-b border-white/5 pb-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pr-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Lịch sử tập luyện
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Các buổi tập đã hoàn thành trong quá khứ.</p>
              </div>
              <div className="flex flex-col items-start md:items-end bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/10 shadow-inner">
                <p className="text-[9px] text-cyan-400/80 uppercase font-bold tracking-widest mb-1">Chỉnh sửa số buổi hiện tại ({plan?.completedSessions || 0})</p>
                <div className="flex items-center gap-2">
                  <Input 
                     type="number" 
                     min="0"
                     className="w-16 h-8 text-center bg-black/40 border-cyan-500/30 text-white font-black focus:border-cyan-400 rounded-lg" 
                     value={plan?.completedSessions || 0}
                     onChange={(e) => {
                       const val = parseInt(e.target.value);
                       if (!isNaN(val) && val >= 0 && plan) setPlan({ ...plan, completedSessions: val });
                     }}
                   />
                   <span className="text-xs text-slate-500 font-bold">/ 14</span>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 pt-4 custom-scrollbar">
            {isLoadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
            ) : sessionHistoryList.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Chưa có lịch sử tập luyện.</p>
            ) : (
              sessionHistoryList.map(session => (
                <div key={session.id} className="relative p-4 rounded-2xl border border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-cyan-500/20 transition-all duration-300">
                  <div className="w-full md:flex-1">
                    <p className="font-black text-white text-sm mb-1">{session.date}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      Tổng khối lượng: <span className="font-bold text-cyan-400">{session.totalVolume || 0}</span> kg
                    </p>
                    {/* Show a mini summary of exercises */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.keys(session.logs || {}).map(ex => (
                        <span key={ex} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate max-w-[120px]">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteHistory(session.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl shrink-0 self-end md:self-auto transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#111218]/80 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent">{t('training_protocol')}</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            {t('intelligent_plan')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="bg-black/40 border border-white/5 backdrop-blur-md rounded-2xl px-5 py-3 flex flex-col justify-center shadow-inner hover:border-cyan-500/20 transition-all duration-300">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{t('volume_load')}</span>
            <span className="text-xl font-black text-cyan-400 flex items-baseline gap-1">
              {calculateVolume().toLocaleString()} 
              <span className="text-[10px] text-slate-500 font-bold uppercase">kg</span>
            </span>
          </div>

          {plan && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="border-white/5 bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-xs h-12 px-6 rounded-xl gap-2 flex-1 min-w-[140px] transition-all"
                    >
                      <Calendar className="w-4 h-4 text-cyan-400" /> {t('export_calendar')}
                    </Button>
                  }
                />
                <DialogContent className="bg-[#0c0d12]/95 backdrop-blur-xl border-white/5 text-white rounded-[2rem] max-w-md shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                      <Calendar className="w-5 h-5" /> {t('sync_plan')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium text-xs">
                      {t('sync_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button 
                      onClick={exportToCalendar}
                      className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between px-6 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-xs text-white uppercase tracking-wider">{t('download_ics')}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{t('fastest_ics')}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </Button>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('google_calendar_manual')}</p>
                      <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {plan.days.map((day, idx) => (
                          <a
                            key={idx}
                            href={getGoogleCalendarUrl(day, idx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 bg-[#1a1f2c]/50 hover:bg-[#1a1f2c] border border-white/5 rounded-xl flex items-center justify-between px-4 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-cyan-400 w-10 uppercase">{day.dayName}</span>
                              <span className="text-xs font-bold text-slate-300">{day.focusName}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">
                      {t('tip_ics')}
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="border-white/5 bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-xs h-12 px-6 rounded-xl gap-2 transition-all flex-1 min-w-[160px]"
                    >
                      <Settings2 className="w-4 h-4 text-cyan-400" /> {t('customize_plan')}
                    </Button>
                  }
                />
                <DialogContent className="bg-[#0c0d12]/95 backdrop-blur-xl border-white/5 sm:max-w-[425px] rounded-[2rem] shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-black text-white uppercase tracking-widest text-cyan-400">
                      <Settings2 className="w-5 h-5" /> {t('plan_architect')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs">
                      {t('plan_architect_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {t('primary_objective')}
                      </Label>
                      <Select value={goal} onValueChange={setGoal}>
                        <SelectTrigger className="w-full h-12 rounded-xl border-white/5 bg-black/40 text-white font-semibold focus:ring-1 focus:ring-cyan-500/50">
                          <span>
                            {goal === "hypertrophy" && t('muscle_gain')}
                            {goal === "strength" && t('strength_power')}
                            {goal === "endurance" && t('endurance')}
                            {goal === "fatloss" && t('fat_loss')}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c0d12] border-white/10 text-white rounded-xl">
                          <SelectItem value="hypertrophy" className="focus:bg-white/10 focus:text-white font-bold">{t('muscle_gain')}</SelectItem>
                          <SelectItem value="strength" className="focus:bg-white/10 focus:text-white font-bold">{t('strength_power')}</SelectItem>
                          <SelectItem value="endurance" className="focus:bg-white/10 focus:text-white font-bold">{t('endurance')}</SelectItem>
                          <SelectItem value="fatloss" className="focus:bg-white/10 focus:text-white font-bold">{t('fat_loss')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {t('frequency_days')}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="h-12 rounded-xl bg-black/40 border-white/5 text-white font-bold placeholder:text-slate-600 focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {t('environment')}
                      </Label>
                      <Select value={equipment} onValueChange={setEquipment}>
                        <SelectTrigger className="w-full h-12 rounded-xl border-white/5 bg-black/40 text-white font-semibold focus:ring-1 focus:ring-cyan-500/50">
                          <span>
                            {equipment === "gym" && t('gym_access')}
                            {equipment === "home" && t('home_access')}
                            {equipment === "calisthenics" && t('calisthenics')}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c0d12] border-white/10 text-white rounded-xl">
                          <SelectItem value="gym" className="focus:bg-white/10 focus:text-white font-bold">{t('gym_access')}</SelectItem>
                          <SelectItem value="home" className="focus:bg-white/10 focus:text-white font-bold">{t('home_access')}</SelectItem>
                          <SelectItem value="calisthenics" className="focus:bg-white/10 focus:text-white font-bold">{t('calisthenics')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {t('specific_focus')}
                      </Label>
                      <Input
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder={t('focus_placeholder')}
                        className="h-12 rounded-xl bg-black/40 border-white/5 text-white placeholder:text-slate-600 font-semibold focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-2">
                    <Button
                      onClick={() => handleGenerate(false)}
                      disabled={isGenerating}
                      type="button"
                      className="w-full h-12 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('synthesizing')}
                        </>
                      ) : (
                        t('generate_new_routine')
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!plan && (
            <Button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('synthesizing')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> {t('generate_workout')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!plan && !isGenerating && (
        <div className="flex flex-col justify-center items-center h-[50vh] text-center border border-white/5 border-dashed rounded-[2rem] bg-black/20 p-8">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <Zap className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-3">
            {t('no_protocol')}
          </h2>
          <p className="text-slate-400 max-w-sm mx-auto text-xs font-semibold uppercase tracking-wider leading-relaxed">
            {t('start_journey_desc')}
          </p>
        </div>
      )}

      {isGenerating && !plan && (
        <div className="flex flex-col justify-center items-center h-[50vh]">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
          <p className="text-cyan-400 font-black uppercase tracking-widest text-xs animate-pulse">
            {t('calculating_volume')}
          </p>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="relative flex flex-col items-center overflow-hidden rounded-3xl border-white/5 bg-[#111218]/90 p-6 text-center shadow-xl backdrop-blur-xl cursor-pointer group hover:border-cyan-500/30 transition-all duration-300"
            onClick={() => handleOpenHistory()}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center w-full">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t('workouts_completed')}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-4xl font-black text-white group-hover:text-cyan-400 transition-colors">{plan.completedSessions || 0}</p>
                <span className="text-[10px] font-bold text-slate-400">/ 14 {t('in_cycle')}</span>
              </div>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-2 group-hover:text-cyan-400/80 transition-colors">
                Nhấn để xem / chỉnh sửa
              </span>
            </div>
            <div className="relative z-10 mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)] group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
            </div>
          </Card>

          <Card className="relative flex flex-col items-center overflow-hidden rounded-3xl border-white/5 bg-[#111218]/90 p-6 text-center shadow-xl backdrop-blur-xl group hover:border-purple-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t('total_volume_lifted')}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-4xl font-black text-white group-hover:text-purple-400 transition-colors">
                  {(Object.values(exerciseWeights) as number[])
                    .reduce((a: number, b: number) => a + b * 30, 0)
                    .toLocaleString()}
                </p>
                <span className="text-[10px] font-bold text-slate-400">
                  kg est.
                </span>
              </div>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                Dựa trên kỷ lục cá nhân
              </span>
            </div>
            <div className="relative z-10 mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 shadow-[0_0_20px_rgba(112,0,255,0.15)] group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
          </Card>

          <Card
            className="relative flex flex-col items-center overflow-hidden rounded-3xl border-white/5 bg-[#111218]/90 p-6 text-center shadow-xl backdrop-blur-xl cursor-pointer group hover:border-blue-500/30 transition-all duration-300"
            onClick={() => { setEditingWeights({ ...exerciseWeights }); setShowPBModal(true); }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {t('personal_bests')}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-4xl font-black text-white group-hover:text-blue-400 transition-colors">{Object.keys(exerciseWeights).length}</p>
                <span className="text-[10px] font-bold text-slate-400">{t('exercises_tracked')}</span>
              </div>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-2 group-hover:text-blue-400/80 transition-colors">Nhấn để xem & chỉnh</span>
            </div>
            <div className="relative z-10 mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5 text-blue-400" />
            </div>
          </Card>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left main area */}
          <div className="flex flex-col gap-6">
            {/* Day selector */}
            {/* Desktop: scroll ngang */}
            <div className="hidden sm:flex justify-between items-center gap-2.5 bg-[#111218]/80 backdrop-blur-md p-3.5 border border-white/5 rounded-[2rem] shadow-xl w-full">
              {plan.days.map((day, idx) => {
                const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                const isActive = selectedDay === idx;
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                const isRest = !day.exercises || day.exercises.length === 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={`flex-1 min-w-[70px] h-[80px] rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative border ${
                      isActive
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-[1.03]"
                        : "bg-black/30 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {isToday && (
                      <span className={`absolute -top-1.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest leading-none ${
                        isActive ? 'bg-white text-black shadow-md' : 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                      }`}>
                        {t('todays_operation')}
                      </span>
                    )}
                    <span className="text-lg font-black leading-none">{t(dayKeys[idx])}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 truncate max-w-full px-1 ${isActive ? 'text-black/70' : 'text-slate-500'}`}>
                      {isRest ? 'Rest' : (day.focusName.slice(0, 10) + (day.focusName.length > 10 ? '..' : ''))}
                    </span>
                    {!isRest && (
                      <div className={`w-1 h-1 rounded-full mt-1 ${isActive ? 'bg-black shadow-md' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Mobile day selector */}
            <div className="sm:hidden bg-[#111218]/80 backdrop-blur-md p-3 border border-white/5 rounded-[2rem] shadow-xl space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {plan.days.slice(0, 4).map((day, idx) => {
                  const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                  const isActive = selectedDay === idx;
                  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                  const isRest = !day.exercises || day.exercises.length === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(idx)}
                      className={`h-[70px] rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative border ${
                        isActive
                          ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-[1.02]"
                          : "bg-black/30 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {isToday && (
                        <span className="absolute -top-1 bg-cyan-500 text-black text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                          {t('todays_operation')}
                        </span>
                      )}
                      <span className="text-base font-black leading-none">{t(dayKeys[idx])}</span>
                      <span className={`text-[7px] font-bold uppercase tracking-wider mt-1 truncate max-w-full px-1 ${isActive ? 'text-black/75' : 'text-slate-500'}`}>
                        {isRest ? 'Rest' : 'Train'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {plan.days.slice(4).map((day, i) => {
                  const idx = i + 4;
                  const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                  const isActive = selectedDay === idx;
                  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                  const isRest = !day.exercises || day.exercises.length === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(idx)}
                      className={`h-[70px] rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative border ${
                        isActive
                          ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-[1.02]"
                          : "bg-black/30 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {isToday && (
                        <span className="absolute -top-1 bg-cyan-500 text-black text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                          {t('todays_operation')}
                        </span>
                      )}
                      <span className="text-base font-black leading-none">{t(dayKeys[idx])}</span>
                      <span className={`text-[7px] font-bold uppercase tracking-wider mt-1 truncate max-w-full px-1 ${isActive ? 'text-black/75' : 'text-slate-500'}`}>
                        {isRest ? 'Rest' : 'Train'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Protocol View */}
            <Card className="bg-[#111218]/90 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative min-h-[500px]">
              <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none">
                <Trophy className="w-64 h-64 blur-3xl fill-current text-white" />
              </div>

              <div className="p-6 md:p-10 relative z-10 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8 w-full border-b border-white/5 pb-6">
                  <div className="w-full lg:flex-1 min-w-0 pr-0 lg:pr-8">
                    <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black uppercase tracking-wider text-[9px] px-3 py-1.5 rounded-full mb-4">
                      <Calendar className="w-3 h-3 text-cyan-400" /> {t(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][selectedDay] as any)}{" "}
                      {t('operation')}
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight md:leading-tight">
                      {currentDayData?.focusName}
                    </h2>
                    {currentDayData?.description && (
                      <p className="text-slate-400 font-semibold text-xs md:text-sm mt-3 max-w-full leading-relaxed">
                        {currentDayData.description}
                      </p>
                    )}
                  </div>

                  {!isRestDay && (
                    <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[280px] shrink-0">
                      {hrConnected ? (
                        <div className="flex w-full items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 px-4 rounded-xl h-12 shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all">
                          <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-none">{t('heart_rate')}</span>
                              <span className="text-base font-black text-white leading-none mt-1">{heartRate || '--'} <small className="text-[8px] opacity-60">BPM</small></span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleHeartRate}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/20 text-red-400/70 hover:text-red-400 shrink-0"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={toggleHeartRate}
                          variant="outline"
                          className="w-full border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                          <Activity className="w-4 h-4 mr-2.5 shrink-0" />
                          <span>{t('connect_hr')}</span>
                        </Button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          onClick={applyAllRecommendedWeights}
                          variant="outline"
                          className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest text-[9px] h-12 px-3 rounded-xl transition-all"
                        >
                          <Trophy className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span>{t('apply_all')}</span>
                        </Button>
                        <Button
                          onClick={markSessionComplete}
                          className="bg-cyan-500 text-black hover:bg-cyan-400 font-black uppercase tracking-widest text-[9px] h-12 px-3 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)] group"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0 group-hover:scale-110 transition-transform" />
                          <span>{t('complete_session')}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {isRestDay ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-black/30 border border-white/5 mx-auto max-w-md mt-6 shadow-inner">
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-5 bg-white/5 shadow-inner text-slate-500">
                      <Zap className="w-6 h-6 opacity-40 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-black tracking-widest uppercase text-base mb-2">
                      {t('active_recovery')}
                    </h3>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto font-medium px-4 leading-relaxed">
                      {t('active_recovery_desc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {currentDayData?.warmup &&
                      currentDayData.warmup.length > 0 && (
                        <div className="bg-gradient-to-br from-orange-500/5 via-black/20 to-transparent border border-orange-500/10 rounded-[1.5rem] overflow-hidden flex flex-col group shadow-md mb-2 transition-all duration-300 hover:border-orange-500/30">
                          <div className="p-5 md:p-6 bg-orange-500/[0.02]">
                            <h3 className="text-orange-400 font-black tracking-widest uppercase text-xs mb-4 flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                <Flame className="w-4 h-4 fill-current text-orange-500" />
                              </span>
                              {t('dynamic_warmup')}
                            </h3>
                            <ul className="space-y-3">
                              {currentDayData.warmup.map((wu, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 items-center text-xs text-slate-300 font-semibold"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                                  <span className="leading-relaxed">{wu}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                    {currentDayData?.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-b from-[#16171f] to-[#111218] border border-white/5 hover:border-cyan-500/20 hover:shadow-[0_0_20px_rgba(34,211,238,0.05)] transition-all duration-300 rounded-[1.5rem] overflow-hidden flex flex-col group relative"
                      >
                        <button
                          onClick={() => setActiveVideoIndex(activeVideoIndex === idx ? null : idx)}
                          className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all border z-10 ${
                            activeVideoIndex === idx 
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]" 
                              : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {activeVideoIndex === idx ? <ChevronUp className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        </button>
                        <div className="p-5 md:p-6 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500/0 group-hover:bg-cyan-500 transition-all duration-300 rounded-l-[1.5rem]"></div>
                          {/* Header: số thứ tự + tên + tags */}
                          <div className="flex items-start gap-3.5 mb-4 pr-10">
                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shadow-inner shrink-0 group-hover:border-cyan-500/20 transition-all duration-300">
                              <span className="text-slate-500 font-black text-sm group-hover:text-cyan-400 transition-colors">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-black text-base leading-tight mb-1.5 group-hover:text-cyan-400/90 transition-colors">{translateExercise(ex.name, language)}</h3>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">{ex.muscle}</span>
                                {ex.load && (
                                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 bg-black/30 border border-white/5 px-2 py-0.5 rounded-md">
                                    <TrendingUp className="w-2.5 h-2.5 text-cyan-400" />{ex.load}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Info grid — luôn 3 cột đều nhau */}
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {/* Khối lượng / Số hiệp */}
                            <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('volume_label')}</span>
                              <span className="text-white font-black text-xs leading-none mt-1 break-words">{formatSets(ex.sets)}</span>
                            </div>
                            {/* Nghỉ */}
                            <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t('rest_label')}</span>
                              <span className="text-slate-300 font-black text-xs leading-none mt-1 break-words">{getExerciseRest(ex, language)}</span>
                            </div>
                            {/* Gợi ý — bấm để apply */}
                            <button
                              onClick={() => applyRecommendedWeight(ex)}
                              disabled={!ex.recommendedWeight}
                              className="bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 disabled:opacity-35 disabled:cursor-default rounded-xl px-3 py-2 flex flex-col gap-0.5 text-left transition-all min-w-0 overflow-hidden"
                            >
                              <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{t('suggested')}</span>
                              <span className="text-cyan-400 font-black text-xs leading-none mt-1 break-words break-all">{ex.recommendedWeight || '—'}</span>
                            </button>
                          </div>
                          
                          <SetLogger 
                            exercise={ex} 
                            currentWeight={exerciseWeights[ex.name] || 0}
                            logs={sessionLogs[ex.name] || []}
                            onLog={(w, r, rpeValue) => {
                              const restStr = getExerciseRest(ex, language);
                              const seconds = parseRestToSeconds(restStr);
                              logSet(ex.name, w, r, seconds, rpeValue);
                            }}
                            onDelete={(idx) => removeLogSet(ex.name, idx)}
                          />
                        </div>

                        {/* Video Embed Section */}
                        {activeVideoIndex === idx && (
                          <div className="border-t border-white/5 bg-black/90 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="flex items-center justify-between px-4 md:px-5 py-3">
                              <div className="flex items-center gap-2">
                                <PlayCircle className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                  {t('demonstration')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {/* Mở trên YouTube → mobile có thể full screen dễ dàng */}
                                {(() => {
                                  const lowerName = ex.name.toLowerCase().trim();
                                  const mergedLibrary = { ...VIDEO_LIBRARY, ...customVideoLibrary };
                                  let vid = mergedLibrary[lowerName] || null;
                                  if (!vid) {
                                    const sortedKeys = Object.keys(mergedLibrary).sort((a,b) => b.length - a.length);
                                    for (const key of sortedKeys) { if (lowerName.includes(key)) { vid = mergedLibrary[key]; break; } }
                                  }
                                  return vid ? (
                                    <a
                                      href={`https://www.youtube.com/watch?v=${vid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                                    >
                                      <Youtube className="w-3.5 h-3.5" />
                                      YouTube
                                    </a>
                                  ) : null;
                                })()}
                                <button
                                  onClick={() => setActiveVideoIndex(null)}
                                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                                >
                                  <span className="text-slate-400 text-xs font-black">✕</span>
                                </button>
                              </div>
                            </div>
                            {/* Video: full-width, no side padding on mobile */}
                            <div className="w-full aspect-video bg-black relative">
                              {getEmbeddedVideo(ex.name)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {currentDayData?.cooldown &&
                      currentDayData.cooldown.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-500/5 via-black/20 to-transparent border border-blue-500/10 rounded-[1.5rem] overflow-hidden flex flex-col group shadow-md mt-2 transition-all duration-300 hover:border-blue-500/30">
                          <div className="p-5 md:p-6 bg-blue-500/[0.02]">
                            <h3 className="text-blue-400 font-black tracking-widest uppercase text-xs mb-4 flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                <Wind className="w-4 h-4 text-blue-400" />
                              </span>
                              {t('static_cooldown')}
                            </h3>
                            <ul className="space-y-3">
                              {currentDayData.cooldown.map((cd, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 items-center text-xs text-slate-300 font-semibold"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                                  <span className="leading-relaxed">{cd}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Stats & Progression */}
          <div className="flex flex-col gap-6">
            <Card className="bg-[#111111]/90 backdrop-blur-md rounded-[2rem] p-8 border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-5">
                <Trophy className="w-32 h-32 text-cyan-400" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-black tracking-widest uppercase text-xs">
                      {t('ai_cycle_progression')}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {t('level')} {plan.currentCycle || 1}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">
                      {t('completed')}
                    </span>
                    <span className="text-cyan-400 font-black text-xl leading-none">
                      {(plan.completedSessions || 0) % 14}
                      <span className="text-sm font-bold opacity-70">/14</span>
                    </span>
                  </div>
                  <div className="h-2 bg-black rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-1000"
                      style={{
                        width: `${(((plan.completedSessions || 0) % 14) / 14) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                  <h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> {t('overload_protocol')}
                  </h4>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed space-y-2">
                    {(Array.isArray(plan.progressionGuide)
                      ? plan.progressionGuide
                      : (typeof plan.progressionGuide === 'string' && plan.progressionGuide.includes("\n")
                        ? plan.progressionGuide.split("\n")
                        : typeof plan.progressionGuide === 'string'
                          ? plan.progressionGuide.split(/(?<=\.)\s+/)
                          : [String(plan.progressionGuide)])
                    ).map((line, i) => {
                      const lineStr = line == null 
                        ? '' 
                        : typeof line === 'string' 
                          ? line 
                          : (JSON.stringify(line) || '');

                      const cleaned = lineStr
                        .replace(/^\s*-\s*/, "")     // Xóa dấu - đầu dòng
                        .replace(/^\s*\*\s*/, "")    // Xóa dấu * đầu dòng
                        .trim();

                      if (!cleaned) return null;

                      return (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                          <p>{cleaned}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-blue-500/5 border-blue-500/20 rounded-[2rem] p-6 shadow-xl text-center flex flex-col justify-center items-center relative overflow-hidden group">
              <div className="w-12 h-12 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/10 mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-black tracking-widest uppercase text-sm mb-2">
                {t('consistency_key')}
              </h3>
              <p className="text-xs text-slate-400 font-medium mb-0 max-w-[200px]">
                {t('consistency_desc')}
              </p>
            </Card>
          </div>
        </div>
      )}
      {plan && (
        <RestTimerUI 
          active={timerActive}
          setActive={setTimerActive}
          seconds={timerSeconds}
          setSeconds={setTimerSeconds}
          total={timerTotal}
          setTotal={setTimerTotal}
        />
      )}
      
      {/* Personal Bests Edit Modal */}
      {showPBModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Personal Bests</h3>
                <p className="text-slate-500 text-[10px] mt-0.5">Chỉnh sửa kg tốt nhất từng bài</p>
              </div>
              <button onClick={() => setShowPBModal(false)} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">✕</button>
            </div>
            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {Object.keys(editingWeights).length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">Chưa có bài tập nào được ghi lại.</p>
              ) : (
                Object.entries(editingWeights).map(([name, weight]) => (
                  <div key={name} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-3">
                    <span className="flex-1 text-white text-sm font-medium truncate">{name}</span>
                    <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                      <input
                        type="number"
                        value={weight}
                        onChange={e => setEditingWeights(prev => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))}
                        className="w-16 text-center text-sm font-black text-white bg-transparent outline-none py-1.5"
                      />
                      <span className="text-[9px] text-slate-600 pr-2 font-black">KG</span>
                    </div>
                    <button
                      onClick={() => setEditingWeights(prev => { const n = { ...prev }; delete n[name]; return n; })}
                      className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center text-xs transition-all"
                    >✕</button>
                  </div>
                ))
              )}
            </div>
            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex gap-3">
              <button onClick={() => setShowPBModal(false)} className="flex-1 h-11 rounded-xl border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Huỷ</button>
              <button onClick={handleSavePBWeights} className="flex-1 h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SetLogger({ exercise, currentWeight, logs, onLog, onDelete }: { 
  exercise: Exercise; 
  currentWeight: number; 
  logs: LoggedSet[]; 
  onLog: (weight: number, reps: number, rpe?: number) => void;
  onDelete?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(currentWeight || 0);
  const [reps, setReps] = useState(10);
  const [rpe, setRpe] = useState(8);

  useEffect(() => {
    if (currentWeight > 0) setWeight(currentWeight);
  }, [currentWeight]);

  return (
    <div className="space-y-2">
      {/* Hàng 1: KG + Reps + RPE */}
      <div className="flex flex-wrap items-center gap-2">
        {/* KG input */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl h-10 w-[85px] shrink-0 overflow-hidden">
          <span className="text-[8px] font-black text-slate-600 uppercase pl-2 shrink-0">KG</span>
          <Input 
            type="number" 
            value={weight} 
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="flex-1 h-full bg-transparent border-none text-center text-sm font-black text-white focus-visible:ring-0 p-0 min-w-0"
          />
        </div>
        
        {/* Reps stepper */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl h-10 shrink-0">
          <button 
            onClick={() => setReps(Math.max(1, reps - 1))}
            className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white font-bold text-base active:scale-90 transition-transform"
          >−</button>
          <span className="w-6 text-center text-sm font-black text-white">{reps}</span>
          <button 
            onClick={() => setReps(reps + 1)}
            className="w-8 h-full flex items-center justify-center text-slate-400 hover:text-white font-bold text-base active:scale-90 transition-transform"
          >+</button>
        </div>

        {/* RPE select */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl h-10 w-[85px] shrink-0 overflow-hidden relative">
          <span className="text-[8px] font-black text-cyan-500 uppercase pl-2 shrink-0">RPE</span>
          <select 
            value={rpe} 
            onChange={(e) => setRpe(parseInt(e.target.value))}
            className="flex-1 h-full bg-transparent border-none text-center text-sm font-black text-white focus:outline-none p-0 pr-2 cursor-pointer appearance-none relative z-10"
          >
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(v => (
              <option key={v} value={v} className="bg-[#111111] text-white font-bold">{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
      </div>
      
      {/* Hàng 2: Nút GHI HIỆP full width */}
      <Button 
        onClick={() => onLog(weight, reps, rpe)}
        className="w-full h-10 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all"
      >
        {t('log_set')}
      </Button>

      {/* Set dots -> pills */}
      {logs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {logs.map((set, i) => (
            <div key={i} className="flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2 py-1 text-[10px] font-black animate-in zoom-in-50 duration-300">
              <span className="text-cyan-500/50">#{i + 1}</span>
              <span className="text-white">{set.weight}<span className="text-slate-500 text-[8px]">kg</span></span>
              <span className="text-slate-500">×</span>
              <span className="text-cyan-400">{set.reps}</span>
              {set.rpe && (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="text-purple-400">@RPE {set.rpe}</span>
                </>
              )}
              {onDelete && (
                <button 
                  onClick={() => onDelete(i)} 
                  className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: Math.max(0, parseInt(exercise.sets) - logs.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="w-7 h-7 border border-dashed border-white/10 rounded-lg flex items-center justify-center">
              <span className="text-[8px] text-slate-700">{logs.length + i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RestTimerUI({
  active,
  setActive,
  seconds,
  setSeconds,
  total,
  setTotal
}: {
  active: boolean;
  setActive: (a: boolean) => void;
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  total: number;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { t } = useTranslation();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAdd30s = () => {
    setSeconds(prev => prev + 30);
    setTotal(prev => prev + 30);
  };

  const handleReset = () => {
    setActive(false);
    setSeconds(0);
    setTotal(0);
  };

  const startQuickTimer = () => {
    setTotal(90);
    setSeconds(90);
    setActive(true);
  };

  if (!active && seconds === 0) {
    return (
      <Button 
        onClick={startQuickTimer}
        className="fixed bottom-24 right-6 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full w-14 h-14 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] z-50 transition-all border border-cyan-300/30 hover:scale-110 active:scale-95"
        title={t('rest_timer') || "Start Rest"}
      >
        <Zap className="w-6 h-6 fill-current" />
      </Button>
    );
  }

  const progress = total > 0 ? (seconds / total) * 100 : 0;
  const isUrgent = seconds <= 10;

  return (
    <div className={`fixed bottom-24 right-6 bg-black/85 backdrop-blur-xl border ${isUrgent ? 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse' : 'border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]'} rounded-3xl p-4 z-50 flex items-center gap-4 animate-in slide-in-from-right-4 transition-all duration-300`}>
      <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-white/5 bg-black/60 overflow-hidden">
        <div 
          className={`absolute inset-0 transition-all duration-1000 opacity-20 ${isUrgent ? 'bg-red-500' : 'bg-cyan-500'}`}
          style={{ clipPath: `inset(${100 - progress}% 0px 0px 0px)` }}
        />
        <div className={`relative z-10 text-xl font-black font-mono tracking-wider ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`}>
          {formatTime(seconds)}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => setActive(!active)} 
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-white active:scale-95 transition-transform"
          >
            {active ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-cyan-400" />}
          </Button>

          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleAdd30s} 
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 font-black text-xs"
            title="+30 seconds"
          >
            +30s
          </Button>

          <Button 
            size="icon" 
            variant="ghost"
            onClick={handleReset} 
            className="w-8 h-8 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 active:scale-95 transition-transform"
            title="Cancel"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <span className={`text-[8px] font-black uppercase tracking-widest text-center ${isUrgent ? 'text-red-400' : 'text-slate-500'}`}>
          {isUrgent ? (t('next_set_ready') || 'Hurry Up') : (t('rest_timer') || 'RESTING')}
        </span>
      </div>
    </div>
  );
}
