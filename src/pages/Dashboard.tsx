import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Trophy, Calendar, Target, Zap, TrendingUp, Settings2, Trash2, Droplet, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { useTranslation } from "../lib/i18n";
import { useFitness } from "../components/FitnessProvider";
import Markdown from 'react-markdown';

const defaultConsumptionData = [
  { name: "t2", value: 0 },
  { name: "t3", value: 0 },
  { name: "t4", value: 0 },
  { name: "t5", value: 0 },
  { name: "t6", value: 0 },
  { name: "t7", value: 0 },
  { name: "CN", value: 0 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [nextOperation, setNextOperation] = useState<string>("Rest");
  const [nextWeightHint, setNextWeightHint] = useState<string>("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [insightResult, setInsightResult] = useState<string | null>(null);

  const handleDeleteWeightRecord = async (dateStr: string, id?: string) => {
    if (user && id) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "weightRecords", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/weightRecords/${id}`);
      }
    } else {
      // LocalStorage mode
      const weightHistoryStr = localStorage.getItem("weight_history");
      if (weightHistoryStr) {
        let history = JSON.parse(weightHistoryStr);
        history = history.filter((h: any) => h.date !== dateStr);
        localStorage.setItem("weight_history", JSON.stringify(history));
      }
    }
    
    // Dispatch an event so it updates everywhere
    window.dispatchEvent(new Event('weight_history_updated'));
  };

   const { profile, macros, consumed, consumptionStreak: streak, consumptionChartData: consumptionData, weightHistory: rawWeightHistory, waterIntake } = useFitness();
   const tdee = macros.calories;
   const weight = profile.weight;
   const consumedKcal = consumed.calories;

   const weightHistoryData = rawWeightHistory.map(entry => {
      const d = new Date(entry.date);
      return {
         name: `${d.getMonth() + 1}/${d.getDate()}`,
         weight: entry.value
      }
   });

   const generateInsights = async () => {
      setIsGeneratingInsight(true);
      try {
        const weights = weightHistoryData.slice(-7).map(d => `${d.name}: ${d.weight}kg`).join(', ');
        const cals = consumptionData.slice(-7).map(d => `${d.name}: ${d.value}kcal`).join(', ');
        const prompt = `Analyze this 7-day history. Weights: [${weights}]. Calories: [${cals}]. Goal: ${profile.primaryGoal}. Provide 3 concise observations and 1 expert tip. Format as a short Markdown string.`;

        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              temperature: 0.7
            }
          })
        });

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          setInsightResult(data.candidates[0].content.parts[0].text);
        } else {
          setInsightResult("No insights generated. Try again.");
        }
      } catch (error) {
        console.error(error);
        setInsightResult("Error generating insights.");
      } finally {
        setIsGeneratingInsight(false);
      }
   };

   useEffect(() => {
     const updateDashboardData = () => {
       const workoutStr = localStorage.getItem("workout_plan");
       if (workoutStr) {
         try {
           const result = JSON.parse(workoutStr);
           const days = result.days || (Array.isArray(result) ? result : null);
           if (days && Array.isArray(days)) {
               const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; 
               const todayWorkout = days[todayIndex];
               if (todayWorkout && todayWorkout.focusName) {
                  setNextOperation(todayWorkout.focusName.length > 20 ? todayWorkout.focusName.substring(0, 20) + '...' : todayWorkout.focusName);
                  
                  // Extraction weight hint
                  if (todayWorkout.exercises && todayWorkout.exercises.length > 0) {
                    const firstExWithWeight = todayWorkout.exercises.find((ex: any) => ex.recommendedWeight);
                    if (firstExWithWeight) {
                      setNextWeightHint(firstExWithWeight.recommendedWeight);
                    } else {
                      setNextWeightHint("");
                    }
                  } else {
                    setNextWeightHint("");
                  }
               }
           }
         } catch (e) {}
       }
     };

     updateDashboardData();
     
     window.addEventListener('workout_plan_updated', updateDashboardData);
     
     return () => {
        window.removeEventListener('workout_plan_updated', updateDashboardData);
     };
   }, [user]);

   const currentHour = new Date().getHours();
   const actionItems = [];
   if (currentHour >= 16 && consumed.protein < macros.protein * 0.75) {
     actionItems.push({
       type: 'warning',
       icon: <AlertTriangle className="w-5 h-5" />,
       title: "Protein Deficit",
       message: `You're at ${Math.round(consumed.protein)}g out of ${Math.round(macros.protein)}g. Consider a high-protein snack.`
     });
   }
   if (currentHour >= 14 && waterIntake < 1.5) {
     actionItems.push({
       type: 'info',
       icon: <Droplet className="w-5 h-5" />,
       title: "Hydration Check",
       message: `You've had ${waterIntake.toFixed(2)}L of water today. Drink up!`
     });
   }
   const workoutCompleted = localStorage.getItem('workout_completed_today') === 'true';
   if (currentHour >= 17 && !workoutCompleted && nextOperation !== 'Rest') {
      actionItems.push({
         type: 'motivation',
         icon: <Zap className="w-5 h-5" />,
         title: "Time to Move",
         message: `Your ${nextOperation} workout awaits. Finish the day strong.`
      });
   }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Top Row: Command Center & Motivation */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        
        {/* Command Center Card */}
        <Card className="bg-gradient-to-br from-[#1a1c29] to-[#251e30] border-white/5 rounded-[2rem] overflow-hidden shadow-none p-6 lg:p-8 relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
           
           <div className="flex flex-col gap-6 relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-3xl font-black text-white tracking-tight uppercase">{t('command_center')}</h2>
                   <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase">{t('online_now')}</p>
                 </div>
              </div>

              <blockquote className="text-lg text-slate-300 font-medium italic mt-2 mb-4">
                "{t('discipline_freedom')}"
              </blockquote>

              {/* Action Items */}
              {actionItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {actionItems.map((item, idx) => (
                    <div key={idx} className={`rounded-2xl p-4 border flex items-start gap-4 backdrop-blur-md ${
                      item.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      item.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    }`}>
                      <div className="shrink-0 mt-1">{item.icon}</div>
                      <div>
                         <h4 className="font-bold uppercase tracking-wider text-xs mb-1 opacity-90">{item.title}</h4>
                         <p className="text-sm font-medium opacity-80 text-white">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-auto">
                 {/* KCAL INTAKE */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Flame className="w-3 h-3 text-orange-400" /> {t('calories')}
                    </div>
                    <div className="text-3xl font-black text-white leading-none mb-1">
                      {consumedKcal}
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono uppercase">
                      / {tdee} {t('total_kcal')}
                    </div>
                 </div>

                 {/* STREAK */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Trophy className="w-3 h-3 text-yellow-500" /> {t('streak')}
                    </div>
                    <div className="text-3xl font-black text-white leading-none mb-1">
                      {streak}
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono uppercase">
                      {t('days_consistent')}
                    </div>
                 </div>

                 {/* NEXT OPERATION */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5 overflow-hidden flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Calendar className="w-3 h-3 text-cyan-400 shrink-0" /> {t('training')}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white leading-tight mb-1 truncate">
                      {nextOperation}
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono uppercase">
                      {nextWeightHint ? `${t('suggested')}: ${nextWeightHint}` : t('ready_to_engage')}
                    </div>
                 </div>

                 {/* CURRENT WEIGHT */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Target className="w-3 h-3 text-indigo-400" /> {t('weight')}
                    </div>
                    <div className="text-xl flex items-baseline gap-1 font-bold text-white leading-tight mb-1">
                      {weight} <span className="text-sm text-slate-500">kg</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium font-mono uppercase">
                      {nextWeightHint ? `${t('suggested')}: ${nextWeightHint}` : t('update_stats')}
                    </div>
                 </div>
              </div>
           </div>
        </Card>

        {/* Motivation Card */}
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col items-start p-6 lg:p-8">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/20 text-orange-500 rounded-xl">
                 <Zap className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('todays_motivation')}</h3>
           </div>
           <p className="text-slate-400 italic font-medium leading-relaxed">
             {t('motivation_text')}
           </p>
        </Card>
      </div>

      {/* Bottom Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
         {/* Weight Progression Card */}
         <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col p-6 lg:p-8 min-h-[300px]">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="text-indigo-400">
                    <TrendingUp className="w-5 h-5" />
                 </div>
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('weight_progression')}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-8 rounded-full bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300 text-xs px-3 font-bold border" onClick={generateInsights}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Review Progress
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#111111] border-white/10 text-white rounded-[2rem] p-6 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-black uppercase tracking-wider items-center gap-2 text-indigo-400 flex border-b border-white/5 pb-4">
                        <Sparkles className="w-5 h-5" />
                        AI Insights
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 min-h-[200px] flex flex-col custom-scrollbar">
                      {isGeneratingInsight ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                          <p className="text-sm font-medium animate-pulse">Analyzing your 7-day progress...</p>
                        </div>
                      ) : (
                        <div className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none">
                          {insightResult ? (
                            <Markdown>{insightResult}</Markdown>
                          ) : (
                            <p>Click the button to generate insights based on your recent activity.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger render={
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full h-8 w-8">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  } />
                  <DialogContent className="bg-[#111111] border-white/10 text-white rounded-[2rem] p-6 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-black uppercase tracking-wider">{t('adjust_weight_history')}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {rawWeightHistory.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No entries found.</p>
                      ) : (
                        rawWeightHistory.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-2xl border border-white/5">
                            <div>
                              <div className="text-white font-bold">{item.value} kg</div>
                              <div className="text-xs text-slate-500 font-medium">{new Date(item.date).toLocaleDateString()}</div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteWeightRecord(item.date, item.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 rounded-full"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
           </div>
           
           {/* Empty State or Chart */}
           {weightHistoryData.length < 2 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <TrendingUp className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Log 2+ weight entries to see progression map.</p>
               </div>
           ) : (
               <div className="flex-1 w-full h-[200px] min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={weightHistoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#555" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        stroke="#555" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#818cf8" strokeWidth={2} fillOpacity={0.1} fill="#818cf8" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
           )}
        </Card>

        {/* Consumption Chart Card */}
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col p-6 lg:p-8 min-h-[300px]">
           <div className="flex items-center gap-3 mb-8">
              <div className="text-orange-400">
                 <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('calories')} ({t('last_7_days')})</h3>
           </div>
           
           <div className="flex-1 w-full h-[200px] min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={consumptionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fillOpacity={0.1} fill="var(--primary)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

      </div>
    </div>
  );
}
