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
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n";
import { heartRateService } from "../services/heartRateService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "../lib/store";
import { generateAIContent } from "../lib/ai";
import { saveSessionRecord, getSessionHistory, deleteSessionRecord, getCustomVideoLibrary, addCustomVideo } from "../services/firebaseService";

export interface LoggedSet {
  weight: number;
  reps: number;
  completed: boolean;
  timestamp: number;
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
  const { t, language } = useTranslation();
  const { 
    profile, 
    workoutPlan: plan, 
    setWorkoutPlan: setPlan,
    exerciseWeights, 
    updateExerciseWeight,
    setExerciseWeights,
    sessionLogs,
    logSet: storeLogSet,
    removeLogSet,
    clearSessionLogs
  } = useStore();

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
      toast.success("Đã thêm video vào cơ sở dữ liệu!");
    } catch {
      toast.error("Lỗi khi thêm video.");
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
        toast.info("Chưa có cân nặng trong Profile!");
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

  const logSet = (exName: string, weight: number, reps: number, restSeconds: number = 60) => {
    storeLogSet(exName, { weight, reps, completed: true, timestamp: Date.now() });

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

      const prompt = `As an elite strength and conditioning coach, generate a highly optimized weekly workout plan.
      ${promptContext}
      - Equipment: ${equipment}
      - Frequency: ${frequency} days per week
      - Focus/Custom: ${customRules}
      - Current Personal Best Weights: ${JSON.stringify(exerciseWeights)}
      - Output Language: ${language === 'vi' ? 'Vietnamese' : 'English'}
      - Allowed Exercises List: ${allowedExercises}
      
      Rules:
      1. Use science-based splits (e.g., Full Body for 3 days, Upper/Lower for 4 days, PPL for 6 days).
      2. You MUST ONLY select exercises from the "Allowed Exercises List". Do not invent new exercises. Be exact with names.
      3. Output EXACTLY 7 days, Monday to Sunday. If a day is for rest, set focusName to ${language === 'vi' ? '"Ngày nghỉ"' : '"Rest Day"'} and leave exercises empty.
      4. progressionGuide must provide a detailed progressive overload strategy for the entire cycle. Format as strictly bullet points with newlines (\n). Must be written in ${language === 'vi' ? 'Vietnamese' : 'English'}. Include 'Week 1', 'Week 2' etc. translated accordingly.
      5. Provide an accurate youtubeQuery string (e.g. "Barbell Bench Press tutorial form") for each exercise. Always keep this string in English.
      6. Provide a list of dynamic warm-up exercises in the 'warmup' array and a list of static cool-down stretches in the 'cooldown' array based on the day's focus. Write them in ${language === 'vi' ? 'Vietnamese' : 'English'}.
      7. Provide a 'recommendedWeight' (e.g. "20kg", "Bodyweight", "15kg per dumbbell") for each exercise. Always provide a single specific number, not a range.
         IMPORTANT: If an exercise exists in "Current Personal Best Weights", recommend a weight that is 2.5% to 5% higher (Progressive Overload). 
         If it's a new exercise, estimate based on the user's weight (e.g. Bench Press often starts around 40-50% bodyweight for beginners, Squat 60-70%).
      8. If Output Language is Vietnamese, MUST translate "to failure" as "đến ngưỡng thất bại" (do NOT use "đến khi không thực hiện được nữa").`;

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
                    required: ["name", "muscle", "sets"],
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

      if (result) {
        const validDays = [];
        const daysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        const daysEn = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dayNames = language === 'vi' ? daysVi : daysEn;
        for (let i = 0; i < 7; i++) {
          const d = result.days[i] || { focusName: language === 'vi' ? "Ngày nghỉ" : "Rest Day", exercises: [] };
          validDays.push({ ...d, dayName: dayNames[i] });
        }

        const newPlan: WorkoutPlan = {
          progressionGuide: result.progressionGuide,
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
          toast.success("Lịch tập tối ưu đã được tái lập thành công.");
        } else {
          toast.success("Cấp độ mới đã sẵn sàng! Cường độ lịch tập đã được nâng cấp.");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Không thể tạo lịch tập. Vui lòng kiểm tra kết nối.");
    } finally {
      setIsGenerating(false);
    }
  };

  const markSessionComplete = () => {
    if (!plan) return;
    const currentDay = plan.days[selectedDay];
    if (!currentDay || currentDay.exercises.length === 0) {
      toast.info("Không thể hoàn thành ngày nghỉ.");
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
    toast.success("Đã hoàn thành buổi tập! Tiếp tục cố gắng nhé!");

    // Auto upgrade check (every 14 sessions)
    if (newPlan.completedSessions && newPlan.completedSessions % 14 === 0) {
      toast("Đã đạt cột mốc mới! Đang tạo lịch tập ở cấp độ tiếp theo...");
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
          title={exerciseName}
          frameBorder="0"
          className="rounded-xl absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    // Fallback: missing video UI
    return (
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-black/60 rounded-xl">
        <Video className="w-10 h-10 text-slate-500 mb-3" />
        <p className="text-slate-300 text-sm mb-4">
          Video chưa có sẵn cho bài tập <span className="font-bold text-cyan-400">{exerciseName}</span>.
        </p>
        
        {addingVideoEx === lowerName ? (
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
            <Input 
              placeholder="Nhập ID Youtube (VD: _FkbD0FhgVE)" 
              className="bg-black/50 border-white/10 h-9"
              value={missingVideoId}
              onChange={e => setMissingVideoId(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleAddCustomVideo(lowerName)} className="bg-cyan-500 hover:bg-cyan-400 text-black h-9">
                Lưu
              </Button>
              <Button size="sm" variant="ghost" className="h-9 hover:bg-white/10" onClick={() => {
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
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            onClick={() => setAddingVideoEx(lowerName)}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Bổ sung vào Database
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
    toast.success("Đã xuất file lịch tập!");
  };

  const defaultDays = Array.from({ length: 7 }).map(
    (_, i) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  );
  const currentDayData = plan ? plan.days[selectedDay] : null;
  const isRestDay =
    !currentDayData ||
    !currentDayData.exercises ||
    currentDayData.exercises.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto px-4 md:px-8 space-y-8">
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="bg-[#0a0c10] border-white/5 text-white max-w-2xl w-[95vw] shadow-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pr-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest text-cyan-400">Lịch sử tập luyện</h2>
                <p className="text-xs text-slate-400">Các buổi tập đã hoàn thành trong quá khứ.</p>
              </div>
              <div className="flex flex-col items-start md:items-end bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/10">
                <p className="text-[9px] text-cyan-400/80 uppercase font-bold tracking-widest mb-1">Chỉnh sửa số buổi hiện tại ({plan?.completedSessions || 0})</p>
                <div className="flex items-center gap-2">
                  <Input 
                     type="number" 
                     min="0"
                     className="w-16 h-8 text-center bg-transparent border-cyan-500/30 text-white focus:border-cyan-400" 
                     value={plan?.completedSessions || 0}
                     onChange={(e) => {
                       const val = parseInt(e.target.value);
                       if (!isNaN(val) && val >= 0 && plan) setPlan({ ...plan, completedSessions: val });
                     }}
                   />
                   <span className="text-xs text-slate-500">/ 14</span>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /></div>
            ) : sessionHistoryList.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Chưa có lịch sử tập luyện.</p>
            ) : (
              sessionHistoryList.map(session => (
                <div key={session.id} className="relative p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-white/10 transition-colors">
                  <div className="w-full md:flex-1">
                    <p className="font-bold text-white mb-1">{session.date}</p>
                    <p className="text-xs text-slate-400">
                      Tổng khối lượng: <span className="font-bold text-cyan-400">{session.totalVolume || 0}</span> kg
                    </p>
                    {/* Show a mini summary of exercises */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.keys(session.logs || {}).map(ex => (
                        <span key={ex} className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate max-w-[120px]">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteHistory(session.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 self-end md:self-auto"
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight uppercase">
            {t('training_protocol')}
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-2">
            {t('intelligent_plan')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('volume_load')}</span>
            <span className="text-xl font-black text-cyan-400">{calculateVolume().toLocaleString()} <span className="text-xs text-slate-500 italic uppercase">kg</span></span>
          </div>

          {plan && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white font-bold h-12 px-6 rounded-[1rem] gap-2 flex-1 min-w-[140px]"
                    >
                      <Calendar className="w-4 h-4" /> {t('export_calendar')}
                    </Button>
                  }
                />
                <DialogContent className="bg-[#111111] border-white/10 text-white rounded-[2rem] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">{t('sync_plan')}</DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium">
                      {t('sync_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-6">
                    <Button 
                      onClick={exportToCalendar}
                      className="w-full h-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between px-6 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{t('download_ics')}</p>
                          <p className="text-xs text-slate-500">{t('fastest_ics')}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </Button>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">{t('google_calendar_manual')}</p>
                      <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {plan.days.map((day, idx) => (
                          <a
                            key={idx}
                            href={getGoogleCalendarUrl(day, idx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex items-center justify-between px-4 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-emerald-500 w-10">{day.dayName}</span>
                              <span className="text-xs font-bold text-slate-300">{day.focusName}</span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-emerald-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
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
                      className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white font-bold h-12 px-6 rounded-[1rem] gap-2 transition-all flex-1 min-w-[160px]"
                    >
                      <Settings2 className="w-4 h-4" /> {t('customize_plan')}
                    </Button>
                  }
                />
                <DialogContent className="bg-[#0a0c10]/95 backdrop-blur-xl border-white/10 sm:max-w-[425px] rounded-[2rem] shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-white uppercase tracking-wider">
                      <Settings2 className="w-5 h-5 text-cyan-400" /> {t('plan_architect')}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs">
                      {t('plan_architect_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('primary_objective')}
                      </Label>
                      <Select value={goal} onValueChange={setGoal}>
                        <SelectTrigger className="w-full h-12 rounded-xl border-white/10 bg-black/50 text-white font-medium focus:ring-1 focus:ring-cyan-500/50">
                          <span>
                            {goal === "hypertrophy" &&
                              t('muscle_gain')}
                            {goal === "strength" && t('strength_power')}
                            {goal === "endurance" && t('endurance')}
                            {goal === "fatloss" && t('fat_loss')}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                          <SelectItem value="hypertrophy">
                            {t('muscle_gain')}
                          </SelectItem>
                          <SelectItem value="strength">
                            {t('strength_power')}
                          </SelectItem>
                          <SelectItem value="endurance">
                            {t('endurance')}
                          </SelectItem>
                          <SelectItem value="fatloss">
                            {t('fat_loss')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('frequency_days')}
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="h-12 rounded-xl bg-black/50 border-white/10 text-white font-bold placeholder:text-slate-600"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('environment')}
                      </Label>
                      <Select value={equipment} onValueChange={setEquipment}>
                        <SelectTrigger className="w-full h-12 rounded-xl border-white/10 bg-black/50 text-white font-medium focus:ring-1 focus:ring-cyan-500/50">
                          <span>
                            {equipment === "gym" && t('gym_access')}
                            {equipment === "home" && t('home_access')}
                            {equipment === "calisthenics" &&
                              t('calisthenics')}
                          </span>
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
                          <SelectItem value="gym">{t('gym_access')}</SelectItem>
                          <SelectItem value="home">
                            {t('home_access')}
                          </SelectItem>
                          <SelectItem value="calisthenics">
                            {t('calisthenics')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t('specific_focus')}
                      </Label>
                      <Input
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder={t('focus_placeholder')}
                        className="h-12 rounded-xl bg-black/50 border-white/10 text-white placeholder:text-slate-600 font-medium"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => handleGenerate(false)}
                      disabled={isGenerating}
                      type="button"
                      className="w-full h-14 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                          {t('synthesizing')}
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
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-sm h-12 px-8 rounded-[1rem] shadow-[0_0_20px_rgba(34,211,238,0.3)] gap-2"
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
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-3">
            {t('no_protocol')}
          </h2>
          <p className="text-slate-400 max-w-md mx-auto font-medium">
            {t('start_journey_desc')}
          </p>
        </div>
      )}

      {isGenerating && !plan && (
        <div className="flex flex-col justify-center items-center h-[50vh]">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
          <p className="text-cyan-400 font-bold uppercase tracking-widest animate-pulse">
            {t('calculating_volume')}
          </p>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="relative flex flex-col items-center overflow-hidden rounded-2xl border-white/5 bg-[#0a0c10]/90 p-6 text-center shadow-lg backdrop-blur-xl cursor-pointer group hover:border-cyan-500/20 transition-all"
            onClick={() => handleOpenHistory()}
          >
            <div className="relative z-10 flex flex-col items-center w-full">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('workouts_completed')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">{plan.completedSessions || 0}</p>
                <span className="text-xs font-medium text-slate-400">/ 14 {t('in_cycle')}</span>
              </div>
              <span className="text-[9px] text-slate-700 group-hover:text-slate-500 mt-1 transition-colors uppercase tracking-widest">
                Nhấn để xem / chỉnh sửa
              </span>
            </div>
            <div className="relative z-10 mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <CheckCircle2 className="h-6 w-6 text-cyan-400" />
            </div>
          </Card>

          <Card className="relative flex flex-col items-center overflow-hidden rounded-2xl border-white/5 bg-[#0a0c10]/90 p-6 text-center shadow-lg backdrop-blur-xl">
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('total_volume_lifted')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">
                  {(Object.values(exerciseWeights) as number[])
                    .reduce((a: number, b: number) => a + b * 30, 0)
                    .toLocaleString()}
                </p>
                <span className="text-xs font-medium text-slate-400">
                  kg est.
                </span>
              </div>
            </div>
            <div className="relative z-10 mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 shadow-[0_0_20px_rgba(112,0,255,0.1)]">
              <TrendingUp className="h-6 w-6 text-purple-400" />
            </div>
          </Card>

          <Card
            className="relative flex flex-col items-center overflow-hidden rounded-2xl border-white/5 bg-[#0a0c10]/90 p-6 text-center shadow-lg backdrop-blur-xl cursor-pointer group hover:border-blue-500/20 transition-all"
            onClick={() => { setEditingWeights({ ...exerciseWeights }); setShowPBModal(true); }}
          >
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('personal_bests')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">{Object.keys(exerciseWeights).length}</p>
                <span className="text-xs font-medium text-slate-400">{t('exercises_tracked')}</span>
              </div>
              <span className="text-[9px] text-slate-700 group-hover:text-slate-500 mt-1 transition-colors uppercase tracking-widest">Nhấn để chỉnh</span>
            </div>
            <div className="relative z-10 mt-4 flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
              <Trophy className="h-6 w-6 text-blue-400" />
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
            <div className="hidden sm:flex justify-center gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x items-end">
              {plan.days.map((day, idx) => {
                const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                const isActive = selectedDay === idx;
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                return (
                  <div key={idx} className="snap-start shrink-0 flex flex-col items-center relative pt-6">
                    {isToday && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] leading-tight text-center whitespace-nowrap">
                        {t('todays_operation')}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedDay(idx)}
                      className={`w-[80px] h-[80px] rounded-3xl flex items-center justify-center font-black transition-all border ${
                        isActive
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                          : "bg-[#111111] text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-xl">{t(dayKeys[idx])}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Mobile: 4 trên + 3 dưới căn giữa */}
            <div className="sm:hidden pt-2 pb-4 space-y-3">
              <div className="grid grid-cols-4 gap-2 items-end">
                {plan.days.slice(0, 4).map((day, idx) => {
                  const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                  const isActive = selectedDay === idx;
                  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      {isToday ? (
                        <div className="bg-cyan-500 text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] leading-tight text-center">
                          <span className="whitespace-pre-line">
                        {t('todays_operation')}</span>
                        </div>
                      ) : (
                        <div className="h-[16px]"></div>
                      )}
                      <button
                        onClick={() => setSelectedDay(idx)}
                        className={`w-full aspect-square rounded-2xl flex items-center justify-center font-black transition-all border ${
                          isActive
                            ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                            : "bg-[#111111]/80 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-lg">{t(dayKeys[idx])}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* 3 nút cuối căn giữa đều */}
              <div className="flex justify-center gap-2 items-end">
                {plan.days.slice(4).map((day, i) => {
                  const idx = i + 4;
                  const isToday = idx === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                  const isActive = selectedDay === idx;
                  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 w-[calc(25%-6px)]">
                      {isToday ? (
                       <div className="bg-cyan-500 text-black text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] leading-tight text-center">
                        <span className="whitespace-pre-line">
                       {t('todays_operation')}</span>
                       </div>
                      ) : (
                        <div className="h-[16px]"></div>
                      )}
                      <button
                        onClick={() => setSelectedDay(idx)}
                        className={`w-full aspect-square rounded-2xl flex items-center justify-center font-black transition-all border ${
                          isActive
                            ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
                            : "bg-[#111111]/80 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-lg">{t(dayKeys[idx])}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Protocol View */}
            <Card className="bg-[#0a0c10]/90 backdrop-blur-xl border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative min-h-[500px]">
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                <Trophy className="w-64 h-64 blur-3xl fill-current text-white" />
              </div>

              <div className="p-6 md:p-10 relative z-10 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8 w-full">
                  <div className="w-full lg:flex-1 min-w-0 pr-0 lg:pr-8">
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px] px-3 py-1.5 rounded-full mb-4">
                      <Calendar className="w-3 h-3" /> {t(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][selectedDay] as any)}{" "}
                      {t('operation')}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight md:leading-tight">
                      {currentDayData?.focusName}
                    </h2>
                    {currentDayData?.description && (
                      <p className="text-slate-400 font-medium text-sm md:text-base mt-4 max-w-full leading-relaxed">
                        {currentDayData.description}
                      </p>
                    )}
                  </div>

                  {!isRestDay && (
                    <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[320px] shrink-0">
                      {hrConnected ? (
                        <div className="flex w-full items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 px-6 rounded-2xl h-14 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all">
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none truncate">{t('heart_rate')}</span>
                              <span className="text-xl font-black text-white leading-none mt-1 truncate">{heartRate || '--'} <small className="text-[8px] opacity-50">BPM</small></span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleHeartRate}
                            className="w-10 h-10 rounded-xl hover:bg-red-500/20 text-red-400/70 hover:text-red-400 shrink-0"
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={toggleHeartRate}
                          variant="outline"
                          className="w-full border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-xs h-14 px-8 rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        >
                          <Activity className="w-5 h-5 mr-3 shrink-0" />
                          <span>{t('connect_hr')}</span>
                        </Button>
                      )}
                      
                      <Button
                        onClick={applyAllRecommendedWeights}
                        variant="outline"
                        className="w-full border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest text-xs h-14 px-8 rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                      >
                        <Trophy className="w-5 h-5 mr-3 shrink-0" />
                        <span>{t('apply_all')}</span>
                      </Button>
                      <Button
                        onClick={markSessionComplete}
                        className="w-full bg-cyan-500 text-black hover:bg-cyan-400 font-black uppercase tracking-widest text-xs h-14 px-8 rounded-2xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] group"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                        <span>{t('complete_session')}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {isRestDay ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-black/40 border border-white/5 mx-auto max-w-lg mt-10">
                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center mb-6 bg-[#111] shadow-inner text-slate-500">
                      <Zap className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-white font-black tracking-widest uppercase text-xl mb-3">
                      {t('active_recovery')}
                    </h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium">
                      {t('active_recovery_desc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {currentDayData?.warmup &&
                      currentDayData.warmup.length > 0 && (
                        <div className="bg-[#111111]/80 border border-orange-500/20 rounded-[1.5rem] overflow-hidden flex flex-col group shadow-sm mb-2">
                          <div className="p-5 md:p-6 bg-orange-500/5">
                            <h3 className="text-orange-400 font-black tracking-widest uppercase text-sm mb-4 flex items-center gap-2">
                              <Flame className="w-4 h-4" /> {t('dynamic_warmup')}
                            </h3>
                            <ul className="space-y-2">
                              {currentDayData.warmup.map((wu, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 items-start text-sm text-slate-300 font-medium"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
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
                        className="bg-[#111111] border border-white/5 hover:border-white/10 transition-all rounded-[1.5rem] overflow-hidden flex flex-col group shadow-sm relative"
                      >
                        <button
                          onClick={() => setActiveVideoIndex(activeVideoIndex === idx ? null : idx)}
                          className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all border z-10 ${
                            activeVideoIndex === idx 
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" 
                              : "bg-white/5 text-slate-500 border-white/10 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {activeVideoIndex === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                        </button>
                        <div className="p-4 md:p-5 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500/0 group-hover:bg-cyan-500 transition-colors rounded-l-[1.5rem]"></div>
                          {/* Header: số thứ tự + tên + tags */}
                          <div className="flex items-start gap-3 mb-3 pr-10">
                            <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-inner shrink-0">
                              <span className="text-slate-500 font-black text-sm group-hover:text-cyan-400 transition-colors">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-black text-base leading-tight mb-1.5">{ex.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">{ex.muscle}</span>
                                {ex.load && (
                                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                                    <TrendingUp className="w-2.5 h-2.5" />{ex.load}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Info grid — luôn 3 cột đều nhau */}
                          <div className="grid grid-cols-3 gap-1.5 mb-3">
                            {/* Khối lượng */}
                            <div className="bg-black/60 border border-white/5 rounded-lg px-2 py-1.5 flex flex-col gap-0.5 min-w-0">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('volume_label')}</span>
                              <span className="text-white font-black text-[10px] leading-tight break-words">{ex.sets?.replace(/đến khi không thực hiện được nữa/gi, 'đến ngưỡng thất bại')}</span>
                            </div>
                            {/* Nghỉ */}
                            <div className="bg-black/60 border border-white/5 rounded-lg px-2 py-1.5 flex flex-col gap-0.5 min-w-0">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{t('rest_label')}</span>
                              <span className="text-slate-300 font-black text-[10px] leading-tight">{ex.rest || '—'}</span>
                            </div>
                            {/* Gợi ý — bấm để apply */}
                            <button
                              onClick={() => applyRecommendedWeight(ex)}
                              disabled={!ex.recommendedWeight}
                              className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-default rounded-lg px-2 py-1.5 flex flex-col gap-0.5 text-left transition-all min-w-0"
                            >
                              <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{t('suggested')}</span>
                              <span className="text-cyan-300 font-black text-[10px] leading-tight">{ex.recommendedWeight || '—'}</span>
                            </button>
                          </div>
                          
                          <SetLogger 
                            exercise={ex} 
                            currentWeight={exerciseWeights[ex.name] || 0}
                            logs={sessionLogs[ex.name] || []}
                            onLog={(w, r) => {
                              const isHeavy = ex.name.toLowerCase().includes('squat') || ex.name.toLowerCase().includes('deadlift') || ex.name.toLowerCase().includes('bench');
                              logSet(ex.name, w, r, isHeavy ? 180 : 90);
                            }}
                            onDelete={(idx) => removeLogSet(ex.name, idx)}
                          />
                        </div>

                        {/* Video Embed Section */}
                        {activeVideoIndex === idx && (
                          <div className="border-t border-white/5 bg-black/80 px-5 md:px-6 py-4 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="flex items-center gap-2 mb-3">
                              <PlayCircle className="w-4 h-4 text-cyan-400" />
                              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                {t('demonstration')}
                              </span>
                            </div>
                            <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden bg-black aspect-video border border-white/10 shadow-lg">
                              {getEmbeddedVideo(ex.name)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {currentDayData?.cooldown &&
                      currentDayData.cooldown.length > 0 && (
                        <div className="bg-[#111111]/80 border border-blue-500/20 rounded-[1.5rem] overflow-hidden flex flex-col group shadow-sm mt-2">
                          <div className="p-5 md:p-6 bg-blue-500/5">
                            <h3 className="text-blue-400 font-black tracking-widest uppercase text-sm mb-4 flex items-center gap-2">
                              <Wind className="w-4 h-4" /> {t('static_cooldown')}
                            </h3>
                            <ul className="space-y-2">
                              {currentDayData.cooldown.map((cd, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 items-start text-sm text-slate-300 font-medium"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
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
                    {(plan.progressionGuide.includes("\n")
                      ? plan.progressionGuide.split("\n")
                      : plan.progressionGuide.split(/(?<=\.)\s+/)
                    ).map((line, i) => {
                      const t = line
                        .replace(/^- /, "")
                        .replace(/^\* /, "")
                        .trim();
                      if (!t) return null;
                      return (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                          <p>{t}</p>
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
      {plan && <RestTimerUI />}
      
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
  onLog: (weight: number, reps: number) => void;
  onDelete?: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(currentWeight || 0);
  const [reps, setReps] = useState(10);

  useEffect(() => {
    if (currentWeight > 0) setWeight(currentWeight);
  }, [currentWeight]);

  return (
    <div className="space-y-2">
      {/* Hàng 1: KG + Reps */}
      <div className="flex items-center gap-2">
        {/* KG input */}
        <div className="flex items-center bg-black/60 border border-white/10 rounded-xl h-10 w-[90px] shrink-0 overflow-hidden">
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
            className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-white font-bold text-base active:scale-90 transition-transform"
          >−</button>
          <span className="w-7 text-center text-sm font-black text-white">{reps}</span>
          <button 
            onClick={() => setReps(reps + 1)}
            className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-white font-bold text-base active:scale-90 transition-transform"
          >+</button>
        </div>
        <div className="flex-1" />
      </div>
      
      {/* Hàng 2: Nút GHI HIỆP full width */}
      <Button 
        onClick={() => onLog(weight, reps)}
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

function RestTimerUI() {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (active) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [active]);

  if (!active && seconds === 0) return (
    <Button 
      onClick={() => setActive(true)}
      className="fixed bottom-24 right-6 bg-cyan-600 text-white rounded-full p-4 shadow-xl z-50 overflow-hidden group hover:scale-110 transition-all border border-cyan-400/50"
    >
      <Zap className="w-6 h-6" />
    </Button>
  );

  return (
    <div className="fixed bottom-24 right-6 bg-[#0a0a0c] border border-cyan-500/30 rounded-3xl p-4 shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-right-4">
      <div className="text-2xl font-black text-cyan-400 font-mono w-16 text-center">
        {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
      </div>
      <div className="flex gap-2">
        <Button size="icon" onClick={() => setActive(!active)} variant="ghost" className="text-white hover:bg-white/10">
          <Play className="w-4 h-4" />
        </Button>
        <Button size="icon" onClick={() => { setActive(false); setSeconds(0); }} variant="ghost" className="text-red-400 hover:bg-red-500/10">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
