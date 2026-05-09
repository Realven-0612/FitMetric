import { useState } from "react";
import { useStore } from "../lib/store";
import { useTranslation } from "../lib/i18n";
import BMIBar from "./BMIBar";
import { ChevronRight, ChevronLeft, Dumbbell, Flame, Zap, Target, Activity, Ruler, User, Check, Scale, Percent } from "lucide-react";

const STEPS = ["welcome", "basics", "body", "goal"];

const GOALS = [
  { value: "Lose Fat",      label: "goal_lose_fat",      icon: Flame,    color: "orange" },
  { value: "Build Muscle",  label: "goal_build_muscle",  icon: Dumbbell, color: "purple" },
  { value: "Strength",      label: "goal_strength",      icon: Zap,      color: "yellow" },
  { value: "Endurance",     label: "goal_endurance",     icon: Activity, color: "cyan"   },
];

const STYLES = [
  { value: "Gym",           label: "style_gym",           emoji: "🏋️" },
  { value: "Calisthenics",  label: "style_calisthenics",  emoji: "🤸" },
  { value: "Home",          label: "style_home",          emoji: "🏠" },
];

const ACTIVITY_LEVELS = [
  { value: "Sedentary",         label: "activity_sedentary",         desc: "activity_sedentary_desc" },
  { value: "Lightly Active",    label: "activity_light",    desc: "activity_light_desc" },
  { value: "Moderately Active", label: "activity_moderate", desc: "activity_moderate_desc" },
  { value: "Very Active",       label: "activity_very",       desc: "activity_very_desc" },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { setProfile } = useStore();
  const { t } = useTranslation();
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
      gender: form.gender as "male" | "female",
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
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-6 flex flex-col items-center">
                <img 
                  src="/assets/app_icon.png" 
                  alt="FitMetric" 
                  className="w-24 h-24 object-cover rounded-3xl drop-shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse"
                />
                <div>
                  <h1 className="text-5xl font-black tracking-tight mb-3">Fit<span className="text-cyan-500">Metric</span></h1>
                  <p className="text-slate-400 text-lg">{t('fitness_quantified')}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mb-8 w-fit mx-auto">
                {[
                  { icon: Activity, label: t('track_workout') },
                  { icon: Ruler,    label: t('analyze_metrics') },
                  { icon: Target,   label: t('achieve_goals') },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-white/5 border border-white/10 w-full">
                    <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-200">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-3xl font-black">{t('lets_get_started')}</h2>
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
                           <span className={`font-bold ${isActive ? "text-white" : "text-slate-300"}`}>{t(g.label as any)}</span>
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
                           <span className={`text-xs font-bold leading-tight ${isActive ? "text-cyan-400" : "text-slate-400"}`}>{t(s.label as any)}</span>
                         </button>
                       )
                    })}
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-3 pb-24">
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
                            <div className={`font-bold ${isActive ? "text-emerald-400" : "text-slate-200"}`}>{t(al.label as any)}</div>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">{t(al.desc as any)}</div>
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
            <div className="flex justify-center mb-16">
              <button 
                onClick={nextStep}
                className="px-10 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-base rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 group hover:scale-105"
              >
                <span>{t('get_started')}</span>
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
                <span>{step === STEPS.length - 1 ? t('finish') : t('next')}</span>
                {step !== STEPS.length - 1 && <ChevronRight className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
