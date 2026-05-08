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
  const { t } = useTranslation();
  const { 
    profile, 
    workoutPlan: plan, 
    setWorkoutPlan: setPlan,
    exerciseWeights, 
    updateExerciseWeight,
    sessionLogs,
    logSet: storeLogSet,
    clearSessionLogs
  } = useStore();

  const [selectedDay, setSelectedDay] = useState(() =>
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);

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
    currentDayData.exercises.forEach(ex => {
      if (ex.rec) {
        updateExerciseWeight(ex.id, ex.rec);
      }
    });
    toast.success(t('apply_all'));
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

  const handleWeightChange = (exName: string, delta: number) => {
    const current = exerciseWeights[exName] || 0;
    let newW = current + delta;
    newW = Math.max(0, Math.round(newW * 10) / 10);
    updateExerciseWeight(exName, newW);
  };

  const applyRecommendedWeight = (ex: any) => {
    if (!ex.recommendedWeight) return;
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

      const prompt = `As an elite strength and conditioning coach, generate a highly optimized weekly workout plan.
      ${promptContext}
      - Equipment: ${equipment}
      - Frequency: ${frequency} days per week
      - Focus/Custom: ${customRules}
      - Current Personal Best Weights: ${JSON.stringify(exerciseWeights)}
      
      Rules:
      1. Use science-based splits (e.g., Full Body for 3 days, Upper/Lower for 4 days, PPL for 6 days).
      2. Select exercises from a reputable library. Be specific about the names (e.g., "Barbell Bench Press").
      3. Output EXACTLY 7 days, Monday to Sunday. If a day is for rest, set focusName to "Rest Day" and leave exercises empty.
      4. progressionGuide must provide a detailed progressive overload strategy for the entire cycle. Format as strictly bullet points with newlines (\n). Example: "- Week 1: Base assessment\n- Week 2: Increase intensity\n- Week 3: Peak volume\n- Week 4: Strategic deload"
      5. Provide an accurate youtubeQuery string (e.g. "Barbell Bench Press tutorial form") for each exercise.
      6. Provide a list of dynamic warm-up exercises in the 'warmup' array and a list of static cool-down stretches in the 'cooldown' array based on the day's focus.
      7. Provide a 'recommendedWeight' (e.g. "20kg", "Bodyweight", "15kg per dumbbell") for each exercise. 
         IMPORTANT: If an exercise exists in "Current Personal Best Weights", recommend a weight that is 2.5% to 5% higher (Progressive Overload). 
         If it's a new exercise, estimate based on the user's weight (e.g. Bench Press often starts around 40-50% bodyweight for beginners, Squat 60-70%).`;

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

      const result = await generateAIContent(prompt, schema, "gemini-2.0-flash");

      if (result) {
        const validDays = [];
        for (let i = 0; i < 7; i++) {
          const d = result.days[i] || { focusName: "Ngày nghỉ", exercises: [] };
          validDays.push({ ...d, dayName: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i] });
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

  const getEmbeddedVideo = (exerciseName: string, query?: string) => {
    const lowerName = exerciseName.toLowerCase().trim();
    let matchedId = VIDEO_LIBRARY[lowerName] || null;

    if (!matchedId) {
      const sortedKeys = Object.keys(VIDEO_LIBRARY).sort(
        (a, b) => b.length - a.length,
      );
      for (const key of sortedKeys) {
        if (lowerName.includes(key)) {
          matchedId = VIDEO_LIBRARY[key];
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

    // Fallback: search embed
    const searchTerm = encodeURIComponent(
      query || `${exerciseName} exercise form tutorial`,
    );
    return (
      <iframe
        width="100%"
        height="100%"
        className="rounded-xl absolute inset-0 w-full h-full"
        src={`https://www.youtube.com/embed?listType=search&list=${searchTerm}`}
        title={exerciseName}
        frameBorder="0"
        allowFullScreen
      ></iframe>
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
    (_, i) => ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i],
  );
  const currentDayData = plan ? plan.days[selectedDay] : null;
  const isRestDay =
    !currentDayData ||
    !currentDayData.exercises ||
    currentDayData.exercises.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-7xl mx-auto px-4 md:px-8 space-y-8">
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
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white font-bold h-12 px-6 rounded-[1rem] gap-2"
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
                      className="border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white font-bold h-12 px-6 rounded-[1rem] gap-2 transition-all"
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
          <Card className="relative flex flex-col items-center overflow-hidden rounded-2xl border-white/5 bg-[#0a0c10]/90 p-6 text-center shadow-lg backdrop-blur-xl">
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('workouts_completed')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">
                  {plan.completedSessions || 0}
                </p>
                <span className="text-xs font-medium text-slate-400">
                  / 14 {t('in_cycle')}
                </span>
              </div>
            </div>
            <div className="relative z-10 mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
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

          <Card className="relative flex flex-col items-center overflow-hidden rounded-2xl border-white/5 bg-[#0a0c10]/90 p-6 text-center shadow-lg backdrop-blur-xl">
            <div className="relative z-10 flex flex-col items-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {t('personal_bests')}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-white">
                  {Object.keys(exerciseWeights).length}
                </p>
                <span className="text-xs font-medium text-slate-400">
                  {t('exercises_tracked')}
                </span>
              </div>
            </div>
            <div className="relative z-10 mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
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
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide snap-x items-end">
              {plan.days.map((day, idx) => {
                const isToday =
                  idx ===
                  (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                const isActive = selectedDay === idx;
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
                return (
                  <div
                    key={idx}
                    className="snap-start shrink-0 flex flex-col items-center gap-2"
                  >
                    {isToday ? (
                      <div className="bg-cyan-500 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full z-10 whitespace-nowrap shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                        {t('todays_operation')}
                      </div>
                    ) : (
                      <div className="h-[18px]"></div>
                    )}
                    <button
                      onClick={() => setSelectedDay(idx)}
                      className={`w-[80px] h-[80px] rounded-2xl flex flex-col items-center justify-center gap-1 font-black transition-all border ${
                        isActive
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
                          : "bg-[#111111]/80 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="text-xl">{t(dayKeys[idx])}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Protocol View */}
            <Card className="bg-[#0a0c10]/90 backdrop-blur-xl border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative min-h-[500px]">
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                <Trophy className="w-64 h-64 blur-3xl fill-current text-white" />
              </div>

              <div className="p-6 md:p-10 relative z-10 w-full">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8 w-full">
                  <div className="flex-1 min-w-0 pr-0 lg:pr-8">
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
                    <div className="flex flex-wrap gap-3">
                      {hrConnected ? (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 rounded-xl h-12">
                          <Activity className="w-5 h-5 text-red-500 animate-pulse" />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">{t('heart_rate')}</span>
                            <span className="text-xl font-black text-white leading-none mt-1">{heartRate || '--'} <small className="text-[8px] opacity-50">BPM</small></span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleHeartRate}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400"
                          >
                            <Unlink className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={toggleHeartRate}
                          variant="outline"
                          className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[10px] h-12 px-5 rounded-xl transition-all"
                        >
                          <Activity className="w-4 h-4 mr-2" /> {t('connect_hr')}
                        </Button>
                      )}
                      
                      <Button
                        onClick={applyAllRecommendedWeights}
                        variant="outline"
                        className="border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest text-[10px] h-12 px-5 rounded-xl transition-all"
                      >
                        <Trophy className="w-4 h-4 mr-2" /> {t('apply_all')}
                      </Button>
                      <Button
                        onClick={markSessionComplete}
                        className="bg-cyan-500 text-black hover:bg-cyan-400 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] group"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />{" "}
                        {t('complete_session')}
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
                        className="bg-[#111111] border border-white/5 hover:border-white/10 transition-all rounded-[1.5rem] overflow-hidden flex flex-col group shadow-sm"
                      >
                        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500/0 group-hover:bg-cyan-500 transition-colors"></div>

                          <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                            <span className="text-slate-500 font-black text-xl group-hover:text-cyan-400 transition-colors">
                              {idx + 1}
                            </span>
                          </div>

                          <div className="flex-1">
                            <h3 className="text-white font-black text-xl leading-tight mb-2">
                              {ex.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                                {ex.muscle}
                              </span>
                              {ex.load && (
                                <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                                  <TrendingUp className="w-3 h-3 text-slate-500" />{" "}
                                  {ex.load}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-6 bg-black/40 md:bg-transparent rounded-xl p-4 md:p-0 border md:border-none border-white/5 mt-2 md:mt-0">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                {t('volume_label')}
                              </span>
                              <span className="text-white font-black text-sm">
                                {ex.sets}
                              </span>
                            </div>
                            {ex.rest && (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                  {t('rest_label')}
                                </span>
                                <span className="text-slate-300 font-black text-sm">
                                  {ex.rest}
                                </span>
                              </div>
                            )}
                            {ex.recommendedWeight && (
                              <button 
                                onClick={() => applyRecommendedWeight(ex)}
                                className="flex flex-col text-left group/suggest hover:bg-cyan-500/5 p-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  {t('suggested')} <CheckCircle2 className="w-2.5 h-2.5 opacity-0 group-hover/suggest:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-cyan-300 font-black text-sm flex items-center gap-1 underline decoration-cyan-500/30 underline-offset-4">
                                  {ex.recommendedWeight}
                                </span>
                              </button>
                            )}
                            <div className="flex flex-col col-span-2 md:col-span-1 mt-2 md:mt-0">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex items-center justify-between gap-2">
                                {t('weight_kg_alt')}
                                {ex.recommendedWeight && (
                                  <button 
                                    onClick={() => applyRecommendedWeight(ex)}
                                    className="text-[9px] text-cyan-500/80 font-black animate-pulse hover:text-cyan-400 hover:scale-105 transition-all cursor-pointer"
                                    title={t('use_recommended')}
                                  >
                                    REC: {ex.recommendedWeight}
                                  </button>
                                )}
                              </span>
                              
                              <SetLogger 
                                exercise={ex} 
                                currentWeight={exerciseWeights[ex.name] || 0}
                                logs={sessionLogs[ex.name] || []}
                                onLog={(w, r) => {
                                  const isHeavy = ex.name.toLowerCase().includes('squat') || ex.name.toLowerCase().includes('deadlift') || ex.name.toLowerCase().includes('bench');
                                  logSet(ex.name, w, r, isHeavy ? 180 : 90);
                                }}
                              />
                            </div>
                            <Button
                              onClick={() =>
                                setActiveVideoIndex(
                                  activeVideoIndex === idx ? null : idx,
                                )
                              }
                              variant="ghost"
                              size="icon"
                              className={`mt-2 md:mt-0 w-8 h-8 rounded-full transition-colors flex-shrink-0 border ${activeVideoIndex === idx ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30 hover:text-cyan-300" : "text-slate-400 border-white/5 hover:text-white hover:bg-white/10"}`}
                            >
                              {activeVideoIndex === idx ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
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
                              {getEmbeddedVideo(ex.name, ex.youtubeQuery)}
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
    </div>
  );
}

function SetLogger({ exercise, currentWeight, logs, onLog }: { 
  exercise: Exercise; 
  currentWeight: number; 
  logs: LoggedSet[]; 
  onLog: (weight: number, reps: number) => void 
}) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState(currentWeight || 0);
  const [reps, setReps] = useState(10);

  useEffect(() => {
    if (currentWeight > 0) setWeight(currentWeight);
  }, [currentWeight]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-lg p-0.5 shadow-inner">
          <Input 
            type="number" 
            value={weight} 
            onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            className="w-16 h-8 bg-transparent border-none text-center text-sm font-black focus-visible:ring-0 text-white p-0"
          />
          <span className="text-[8px] font-black text-slate-600 uppercase pr-1 italic">kg</span>
        </div>
        <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-lg p-0.5 shadow-inner">
          <button 
            onClick={() => setReps(Math.max(1, reps - 1))}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white"
          >-</button>
          <span className="w-8 text-center text-sm font-black text-white">{reps}</span>
          <button 
            onClick={() => setReps(reps + 1)}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white"
          >+</button>
        </div>
        <Button 
          onClick={() => onLog(weight, reps)}
          size="sm"
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] h-8 px-3 rounded-lg"
        >
          {t('log_set')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {logs.map((set, i) => (
          <div key={i} className="flex items-center gap-1 bg-white/5 border border-white/5 rounded px-2 py-1 group animate-in zoom-in-50 duration-300">
            <span className="text-[9px] font-black text-slate-500">{i + 1}</span>
            <span className="text-[10px] font-black text-white">{set.weight}<span className="text-slate-600 italic">kg</span></span>
            <span className="text-[10px] font-black text-cyan-400">×{set.reps}</span>
          </div>
        ))}
        {Array.from({ length: Math.max(0, parseInt(exercise.sets) - logs.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="w-6 h-6 border border-white/5 border-dashed rounded flex items-center justify-center">
            <span className="text-[8px] font-black text-slate-700">{logs.length + i + 1}</span>
          </div>
        ))}
      </div>
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
