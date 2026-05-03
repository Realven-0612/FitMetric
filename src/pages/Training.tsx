import { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle2, TrendingUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Exercise {
  name: string;
  muscle: string;
  sets: string;
}

interface WorkoutDay {
  dayName: string;
  focusName: string;
  exercises: Exercise[];
}

export default function Training() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WorkoutDay[] | null>(null);

  const [goal, setGoal] = useState("hypertrophy");
  const [frequency, setFrequency] = useState("4");
  const [equipment, setEquipment] = useState("gym");
  const [focus, setFocus] = useState("");
  const [profile, setProfile] = useState<any>(null);
  
  const hasTriggeredAutoGenerate = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("user_profile");
    if (saved) {
      const p = JSON.parse(saved);
      setProfile(p);
      // Auto mapping from profile fields
      if (p.primaryGoal === "Lose Fat") setGoal("fatloss");
      else if (p.primaryGoal === "Build Muscle") setGoal("hypertrophy");
      else if (p.primaryGoal === "Strength") setGoal("strength");
      else if (p.primaryGoal === "Endurance") setGoal("endurance");

      if (p.preferredStyle === "Calisthenics") setEquipment("calisthenics");
      else if (p.preferredStyle === "Gym") setEquipment("gym");
      else if (p.preferredStyle === "Home Workout") setEquipment("home");
    }
    
    const savedPlan = localStorage.getItem("workout_plan");
    if (savedPlan) {
      setGeneratedPlan(JSON.parse(savedPlan));
    }
  }, [open]);

  useEffect(() => {
     if (profile && !generatedPlan && !isGenerating && !hasTriggeredAutoGenerate.current) {
         hasTriggeredAutoGenerate.current = true;
         handleGenerate(true); // true = isAuto
     }
  }, [profile, generatedPlan, isGenerating]);

  const defaultDays = [
    { label: "MON", active: true },
    { label: "TUE", active: false },
    { label: "WED", active: false },
    { label: "THU", active: false },
    { label: "FRI", active: false },
    { label: "SAT", active: false },
    { label: "SUN", active: false, badge: "TODAY'S OPERATION" },
  ];

  const defaultExercises = [
    { name: "Standard Push-ups", muscle: "CHEST", sets: "4 x 15" },
    { name: "Chest Dips", muscle: "LOWER CHEST", sets: "4 x 10" },
    { name: "Pike Push-ups", muscle: "SHOULDERS", sets: "4 x 12" },
  ];

  const handleGenerate = async (isAutoParam?: boolean | any) => {
    const isAuto = isAutoParam === true;
    setIsGenerating(true);
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let profileContext = "";
      if (profile) {
         profileContext = `
Thông tin Biometrics của người dùng (từ Profile):
- Cân nặng: ${profile.weight} kg
- Chiều cao: ${profile.height} cm
- Tỉ lệ mỡ (Body Fat): ${profile.bodyFat ? profile.bodyFat + '%' : 'Không rõ'}
- Tuổi: ${profile.age}
- Giới tính: ${profile.gender}
- Mức độ kinh nghiệm (Level): ${profile.level}
- Mức độ hoạt động (Activity): ${profile.activityLevel}
         `;
      }

      const prompt = `
Bạn là một Huấn luyện viên Thể hình (Fitness Coach) chuyên nghiệp. Nhiệm vụ của bạn là thiết kế một lịch tập cá nhân hóa.

Input từ người dùng:
1. Mục tiêu (Goal): ${goal}
2. Cường độ (Frequency): ${frequency} buổi/tuần
3. Kiểu tập luyện (Equipment): ${equipment}
4. Điểm yếu / Tập trung (Focus): ${focus || 'Không có'}
${profileContext}

Nguyên tắc lựa chọn bài tập:
- Nếu chọn Gym: Ưu tiên các bài Gym.
- Nếu chọn Calisthenics: Ưu tiên các bài Calisthenics & Bodyweight.
- Nếu chọn Home: Kết hợp các bài Resistance Band, Calisthenics, và Dumbbell.
- Tiến trình: Chọn bài phù hợp với trình độ, cường độ phù hợp thời gian ${frequency} buổi.
- Tối ưu hóa: Nếu có thông tin Biometrics, hãy điều chỉnh rep range, sets, và độ khó bài tập cho phù hợp với thể trạng, tuổi tác, và level kinh nghiệm của người dùng.

Cấu trúc Lịch tập yêu cầu:
1. Phân bổ buổi tập: Chia theo lịch (Vd: Full Body, Push/Pull/Legs, hoặc Upper/Lower) phù hợp với số buổi/tuần. (trả về dưới mảng 'days').
2. Có chính xác 7 ngày (từ thứ 2 đến chủ nhật, hãy đặt dayName tiếng anh viết hoa e.g. MON, TUE, WED), nếu ngày nào nghỉ tập thì mảng exercises = rỗng và focusName = "Rest Day".
3. Chi tiết mỗi bài tập:
   - Tên bài tập (name)
   - Nhóm cơ chính (muscle) - IN HOA, Vd: CHEST, SHOULDERS, vv...
   - Số Set x Số Reps (sets) (Phù hợp mục tiêu: Tăng cơ: 8-12 reps, Sức mạnh: 3-5 reps, Giảm mỡ/Bền: 15-20 reps).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayName: { type: Type.STRING, description: "e.g., MON, TUE, WED" },
                    focusName: { type: Type.STRING, description: "e.g., Push (Chest, Shoulders, Triceps)" },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          muscle: { type: Type.STRING },
                          sets: { type: Type.STRING, description: "e.g., 4 x 15" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      if (response.text) {
        const result = JSON.parse(response.text);
        if (result && result.days) {
          setGeneratedPlan(result.days);
          localStorage.setItem("workout_plan", JSON.stringify(result.days));
          if (!isAuto) {
             setOpen(false);
          }
          setSelectedDay(0);
        }
      }
    } catch (e) {
       console.error("Error generating plan:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const daysToRender = generatedPlan ? generatedPlan.map((d, i) => ({
    label: d.dayName.substring(0, 3).toUpperCase(),
    active: i === selectedDay,
    badge: i === 6 && !generatedPlan ? "TODAY'S OPERATION" : undefined,
  })) : defaultDays;

  const currentDayData = generatedPlan ? generatedPlan[selectedDay] : null;
  const exercisesToRender = currentDayData?.exercises || (generatedPlan ? [] : defaultExercises);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 max-w-5xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex-1 relative overflow-hidden flex flex-col justify-center min-h-[120px]">
           <div className="flex justify-between items-end mb-3">
              <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">PROGRESS</span>
              <span className="text-cyan-400 font-black text-xl">0/14 <span className="text-sm font-bold opacity-80">Sessions</span></span>
           </div>
           <Progress value={0} className="h-1 bg-white/10 mb-3 [&>div]:bg-cyan-400" />
           <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Complete 14 total sessions to auto-level up at this intensity.</p>
        </div>
      </div>

      <div className="flex justify-end pr-2">
         <Dialog open={open} onOpenChange={setOpen}>
           <DialogTrigger asChild>
             <Button variant="outline" className="rounded-full bg-transparent border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 gap-2 h-10 px-5 text-xs font-bold tracking-wider uppercase cursor-pointer">
                <Sparkles className="w-4 h-4" /> Generate Custom Plan
             </Button>
           </DialogTrigger>
           <DialogContent className="bg-[#111111]/95 backdrop-blur-xl border-white/10 sm:max-w-[425px] rounded-[2rem]">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2 text-lg font-black text-white uppercase tracking-wider">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  AI Protocol Generator
               </DialogTitle>
               <DialogDescription className="text-slate-400 text-xs">
                 Configure your parameters. The engine will synthesize a localized operation plan based on your metrics.
               </DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-2">
               <div className="grid gap-2">
                 <Label htmlFor="goal" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Objective</Label>
                 <select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                    <option value="hypertrophy">Hypertrophy (Muscle Gain)</option>
                    <option value="strength">Strength & Power</option>
                    <option value="endurance">Muscular Endurance</option>
                    <option value="fatloss">Fat Loss</option>
                 </select>
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="days" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frequency (Days/Week)</Label>
                 <Input id="days" type="number" value={frequency} onChange={(e) => setFrequency(e.target.value)} className="h-10 rounded-xl bg-black/50 border-white/10 text-white font-bold" />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="equip" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Environment / Equipment</Label>
                 <select id="equip" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                    <option value="gym">Full Gym</option>
                    <option value="home">Home (Dumbbells/Bands)</option>
                    <option value="calisthenics">Calisthenics (Bodyweight)</option>
                 </select>
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="focus" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Weakness / Focus</Label>
                 <Input id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. Upper Chest, Core Stability..." className="h-10 rounded-xl bg-black/50 border-white/10 text-white placeholder:text-slate-600" />
               </div>
             </div>
             <DialogFooter className="mt-2">
               <Button onClick={handleGenerate} disabled={isGenerating} type="button" className="w-full h-12 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs">
                 {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> GENERATING...</> : "Initialize Generator"}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
      </div>

      {/* Days Selector */}
      <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
         {daysToRender.map((day, idx) => (
           <div key={day.label + idx} className="flex flex-col items-center gap-2 snap-center shrink-0">
             {day.badge ? (
               <div className="text-[10px] font-black text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-3 py-0.5 rounded-full whitespace-nowrap">
                 {day.badge}
               </div>
             ) : (
                <div className="h-5"></div>
             )}
             <button
               onClick={() => setSelectedDay(idx)}
               className={`w-20 sm:w-24 h-16 sm:h-20 rounded-[1.5rem] flex flex-col items-center justify-center gap-1 font-black transition-all border ${
                 selectedDay === idx 
                   ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' 
                   : 'bg-[#111111]/80 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
               }`}
             >
               <span className="text-sm sm:text-base">{day.label}</span>
               <span className={`text-[10px] sm:text-xs ${selectedDay === idx ? 'text-black/60' : 'text-slate-600'} font-bold`}>---</span>
             </button>
           </div>
         ))}
      </div>

      {/* Main Protocol container */}
      <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col p-6 sm:p-8">
         <div className="flex justify-between items-start mb-4">
             <div className="bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs px-3 py-1 rounded-full">
                {daysToRender[selectedDay]?.label} PROTOCOL
             </div>
             <div className="text-right text-cyan-400">
                <div className="text-3xl font-black leading-none">{exercisesToRender.length > 0 ? `0/${exercisesToRender.length}` : '-'}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">COMPLETED</div>
             </div>
         </div>
         
         <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">{currentDayData ? currentDayData.focusName : "Push (Chest, Shoulders, Triceps)"}</h2>

         <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center opacity-60">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
               </div>
               <div>
                  <div className="flex items-center gap-2">
                     <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest">OVERLOAD PROTOCOL</span>
                     <span className="text-[10px] border border-white/10 text-slate-400 px-2 rounded-full uppercase tracking-wider bg-white/5">STANDARD</span>
                  </div>
                  <div className="text-sm text-slate-400 font-medium">Base Training</div>
               </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">STREAK 0D</span>
               <div className="flex gap-1">
                  <div className="w-4 h-1.5 rounded-full bg-white/10"></div>
                  <div className="w-4 h-1.5 rounded-full bg-white/10"></div>
                  <div className="w-4 h-1.5 rounded-full bg-white/10"></div>
               </div>
            </div>
         </div>

         <div className="space-y-4">
            {exercisesToRender.map((ex, idx) => (
               <div key={idx} className="bg-white/5 border border-white/10 hover:border-white/20 transition-colors rounded-[1.5rem] p-4 sm:p-5 flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                     <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all shrink-0">
                        <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                     </div>
                     <div>
                        <h3 className="text-white font-bold text-base sm:text-lg leading-tight mb-1">{ex.name}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">{ex.muscle}</p>
                     </div>
                  </div>
                  <div className="bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-xs sm:text-sm whitespace-nowrap shrink-0">
                     {ex.sets}
                  </div>
               </div>
            ))}
         </div>
      </Card>

    </div>
  );
}
