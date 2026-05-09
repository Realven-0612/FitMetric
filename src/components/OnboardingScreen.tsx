import { useState } from "react";
import { useStore } from "../lib/store";
import BMIBar from "./BMIBar";
import { ChevronRight, ChevronLeft, Dumbbell, Flame, Zap, Target, Activity, Ruler, User, Check, Scale, Percent } from "lucide-react";

const STEPS = ["welcome", "basics", "body", "goal"];

const GOALS = [
  { value: "Lose Fat",      label: "Lose Fat",      icon: Flame,    color: "orange" },
  { value: "Build Muscle",  label: "Build Muscle",  icon: Dumbbell, color: "purple" },
  { value: "Strength",      label: "Strength",      icon: Zap,      color: "yellow" },
  { value: "Endurance",     label: "Endurance",     icon: Activity, color: "cyan"   },
];

const STYLES = [
  { value: "Gym",           label: "Gym",           emoji: "🏋️" },
  { value: "Calisthenics",  label: "Calisthenics",  emoji: "🤸" },
  { value: "Home",          label: "Home Workout",  emoji: "🏠" },
];

const ACTIVITY_LEVELS = [
  { value: "Sedentary",         label: "Sedentary",         desc: "Office work" },
  { value: "Lightly Active",    label: "Lightly Active",    desc: "1-3 days/week" },
  { value: "Moderately Active", label: "Moderately Active", desc: "3-5 days/week" },
  { value: "Very Active",       label: "Very Active",       desc: "6-7 days/week" },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { setProfile } = useStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", age: "", gender: "male",
    weight: "", height: "", bodyFat: "",
    primaryGoal: "Lose Fat",
    preferredStyle: "Gym",
    activityLevel: "Moderately Active",
  });

  const update = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 1) return form.name.trim() !== "" && form.age.trim() !== "";
    if (step === 2) return form.weight.trim() !== "" && form.height.trim() !== "";
    return true;
  };

  const handleFinish = () => {
    setProfile({
      name: form.name,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - age isn't strictly number in type? wait, profile object types:
      age: form.age ? Number(form.age) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      height: form.height ? Number(form.height) : undefined,
      bodyFat: form.bodyFat ? Number(form.bodyFat) : undefined,
      gender: form.gender as "male" | "female" | "other",
      primaryGoal: form.primaryGoal,
      preferredStyle: form.preferredStyle,
      activityLevel: form.activityLevel,
    });
    localStorage.setItem("fitmetric_onboarding_done", "true");
    onComplete();
  };

  const nextStep = () => {
    if (step < STEPS.length - 1 && canNext()) {
      setStep(prev => prev + 1);
    } else if (step === STEPS.length - 1) {
      handleFinish();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] text-white flex flex-col pt-10 px-6 pb-6 overflow-y-auto w-full min-h-screen items-center">
      <div className="w-full max-w-md flex-1 flex flex-col relative pb-24">
        {/* Step Indicators */}
        {step > 0 && (
          <div className="flex gap-4 justify-center mb-10 w-full">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300
                ${i < step ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : i === step ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-110"
                : "bg-white/5 text-slate-600 border border-white/10"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6 flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-pulse">
                  <Activity className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-black tracking-tight mb-3">Fit<span className="text-cyan-500">Metric</span></h1>
                  <p className="text-slate-400 text-lg">Your fitness, quantified.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mb-8 items-center w-full max-w-[280px]">
                {[
                  { icon: Activity, label: "Track Every Workout" },
                  { icon: Ruler,    label: "Analyze Body Metrics" },
                  { icon: Target,   label: "Achieve Your Goals" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 w-full">
                    <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black">Let's get started</h2>
                <p className="text-slate-400 font-medium tracking-wide">Tell us a bit about yourself.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Your Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Age *</label>
                    <input 
                      type="number" 
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      placeholder="Years"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Gender</label>
                    <select 
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium appearance-none"
                    >
                      <option value="male" className="bg-[#161618]">Male</option>
                      <option value="female" className="bg-[#161618]">Female</option>
                      <option value="other" className="bg-[#161618]">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Body */}
          {step === 2 && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <h2 className="text-3xl font-black">Body Metrics</h2>
                <p className="text-slate-400 font-medium tracking-wide">Helps calculating BMI and calories.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Weight (kg) *</label>
                    <div className="relative">
                       <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                       <input 
                         type="number" 
                         value={form.weight}
                         onChange={(e) => update("weight", e.target.value)}
                         placeholder="e.g. 70"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                       />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Height (cm) *</label>
                    <div className="relative">
                       <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                       <input 
                         type="number" 
                         value={form.height}
                         onChange={(e) => update("height", e.target.value)}
                         placeholder="e.g. 175"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                       />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Body Fat % (Optional)</label>
                  <div className="relative">
                     <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                     <input 
                       type="number" 
                       value={form.bodyFat}
                       onChange={(e) => update("bodyFat", e.target.value)}
                       placeholder="e.g. 15"
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                     />
                  </div>
                </div>

                <div className="pt-2">
                    <BMIBar weight={Number(form.weight) || 0} height={Number(form.height) || 0} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goal */}
          {step === 3 && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <h2 className="text-3xl font-black">Your Goals</h2>
                <p className="text-slate-400 font-medium tracking-wide">We'll tailor your experience.</p>
              </div>

              <div className="space-y-8">
                {/* Goal */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Primary Goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map((g) => {
                       const Icon = g.icon;
                       const isActive = form.primaryGoal === g.value;
                       return (
                         <button
                           key={g.value}
                           onClick={() => update("primaryGoal", g.value)}
                           className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-3
                             ${isActive 
                               ? `bg-${g.color}-500/10 border-${g.color}-500/50` 
                               : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                         >
                           <Icon className={`w-6 h-6 ${isActive ? `text-${g.color}-400` : "text-slate-400"}`} />
                           <span className={`font-bold ${isActive ? "text-white" : "text-slate-300"}`}>{g.label}</span>
                         </button>
                       );
                    })}
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Preferred Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.map(s => {
                       const isActive = form.preferredStyle === s.value;
                       return (
                         <button
                           key={s.value}
                           onClick={() => update("preferredStyle", s.value)}
                           className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1
                             ${isActive 
                               ? "bg-cyan-500/10 border-cyan-500/50" 
                               : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                         >
                           <span className="text-xl mb-1">{s.emoji}</span>
                           <span className={`text-xs font-bold leading-tight ${isActive ? "text-cyan-400" : "text-slate-400"}`}>{s.label}</span>
                         </button>
                       )
                    })}
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Activity Level</label>
                  <div className="flex flex-col gap-2">
                    {ACTIVITY_LEVELS.map(al => {
                      const isActive = form.activityLevel === al.value;
                      return (
                        <button
                          key={al.value}
                          onClick={() => update("activityLevel", al.value)}
                          className={`p-4 rounded-2xl border flex items-center justify-between transition-all
                            ${isActive 
                              ? "bg-emerald-500/10 border-emerald-500/40" 
                              : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                        >
                          <div className="text-left">
                            <div className={`font-bold ${isActive ? "text-emerald-400" : "text-slate-200"}`}>{al.label}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{al.desc}</div>
                          </div>
                          {isActive && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 pt-6 mt-4">
          {step === 0 ? (
            <div className="space-y-4 text-center">
              <button 
                onClick={nextStep}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 group mb-16"
              >
                <span>Get Started</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex gap-4 pb-16">
              <button 
                onClick={prevStep}
                className="w-14 h-14 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-slate-400" />
              </button>
              
              <button 
                onClick={nextStep}
                disabled={!canNext()}
                className={`flex-1 font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all 
                  ${canNext() 
                    ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                    : "bg-white/5 text-slate-600 border border-white/10 cursor-not-allowed"}`}
              >
                <span>{step === STEPS.length - 1 ? "Finish" : "Next"}</span>
                {step !== STEPS.length - 1 && <ChevronRight className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
