import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Trophy, Calendar, Target, Zap, TrendingUp, Settings2, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { useTranslation } from "../lib/i18n";

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
  const [tdee, setTdee] = useState<number | string>("2000");
  const [weight, setWeight] = useState<number | string>("--");
  const [nextOperation, setNextOperation] = useState<string>("Rest");
  const [nextWeightHint, setNextWeightHint] = useState<string>("");
  const [consumedKcal, setConsumedKcal] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [consumptionData, setConsumptionData] = useState(defaultConsumptionData);
  const [weightHistoryData, setWeightHistoryData] = useState<any[]>([]);
  const [rawWeightHistory, setRawWeightHistory] = useState<{date: string, value: number, id?: string}[]>([]);

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
    
    // Dispatch an event so it updates everywhere in dashboard
    window.dispatchEvent(new Event('weight_history_updated'));
  };

  useEffect(() => {
    const updateDashboardData = () => {
      let fallbackTarget = 2000;
      const profileStr = localStorage.getItem("user_profile");
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          if (profile.weight) setWeight(profile.weight);

          const w = parseFloat(profile.weight) || 72;
          const h = parseFloat(profile.height) || 168;
          const a = parseFloat(profile.age) || 24;
          const bf = profile.bodyFat ? parseFloat(profile.bodyFat) : NaN;
          
          let bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
          if (!isNaN(bf) && bf > 0) {
            bmr = 370 + (21.6 * (w * (100 - bf) / 100));
          }
          
          let act = 1.375;
          if (profile.activityLevel === "Sedentary") act = 1.2;
          else if (profile.activityLevel === "Moderately Active") act = 1.55;
          else if (profile.activityLevel === "Very Active") act = 1.725;
          
          let target = bmr * act;
          if (profile.primaryGoal === "Lose Fat") target -= 500;
          if (profile.primaryGoal === "Build Muscle") target += 300;
          fallbackTarget = Math.round(target);
        } catch (e) {}
      }

      const tdeeStr = localStorage.getItem("tdee_result");
      if (tdeeStr) {
        try {
          const result = JSON.parse(tdeeStr);
          if (result.targetCals) setTdee(result.targetCals);
          else if (result.tdee) setTdee(result.tdee);
          else setTdee(fallbackTarget);
        } catch (e) {
          setTdee(fallbackTarget);
        }
      } else {
        setTdee(fallbackTarget);
      }

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

      const todayStr = new Date().toISOString().split('T')[0];
      const savedDiary = localStorage.getItem("food_diary");
      const savedDate = localStorage.getItem("food_diary_date");
      if (savedDate === todayStr && savedDiary) {
         try {
            const diary = JSON.parse(savedDiary);
            if (Array.isArray(diary)) {
                const totalKcal = diary.reduce((acc, curr) => acc + (curr.kcal || 0), 0);
                setConsumedKcal(totalKcal);
            }
         } catch (e) {}
      }
      
      const consHistoryStr = localStorage.getItem("consumption_history");
      if (consHistoryStr) {
         try {
            const history = JSON.parse(consHistoryStr);
            if (Array.isArray(history) && history.length > 0) {
               // Compute streak
               let currentStreak = 0;
               let checkDate = new Date();
               // check backwards
               while (true) {
                  const dStr = checkDate.toISOString().split('T')[0];
                  const found = history.find(entry => entry.name === dStr && entry.value > 0);
                  if (found) {
                     currentStreak++;
                     checkDate.setDate(checkDate.getDate() - 1);
                  } else {
                     if (currentStreak === 0 && dStr === todayStr) {
                         // if today is empty, check yesterday before breaking streak
                         checkDate.setDate(checkDate.getDate() - 1);
                         const yDayFound = history.find(entry => entry.name === checkDate.toISOString().split('T')[0] && entry.value > 0);
                         if (!yDayFound) break;
                     } else {
                         break;
                     }
                  }
               }
               setStreak(currentStreak);

               // last 7 days chart
               const chartData = [];
               for (let i = 6; i >= 0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const dStr = d.toISOString().split('T')[0];
                  const mmdd = `${d.getMonth() + 1}/${d.getDate()}`;
                  const entry = history.find(e => e.name === dStr);
                  chartData.push({ name: mmdd, value: entry ? entry.value || 0 : 0 });
               }
               setConsumptionData(chartData);
            }
         } catch (e) {}
      }
      
      const loadWeightHistory = async () => {
        let history: any[] = [];
        if (user) {
           try {
              const recordsRef = collection(db, "users", user.uid, "weightRecords");
              const qs = await getDocs(recordsRef);
              qs.forEach(doc => {
                 history.push({ id: doc.id, ...doc.data() });
              });
              history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
           } catch (e) {
              handleFirestoreError(e, OperationType.GET, `users/${user.uid}/weightRecords`);
           }
        } else {
           const weightHistoryStr = localStorage.getItem("weight_history");
           if (weightHistoryStr) {
              try {
                 history = JSON.parse(weightHistoryStr);
              } catch (e) {}
           }
        }

        if (Array.isArray(history)) {
           setRawWeightHistory(history);
           const chartData = history.map(entry => {
              const d = new Date(entry.date);
              return {
                 name: `${d.getMonth() + 1}/${d.getDate()}`,
                 weight: entry.value
              }
           });
           setWeightHistoryData(chartData);
        }
      };
      
      loadWeightHistory();
    };

    updateDashboardData();
    
    window.addEventListener('tdee_updated', updateDashboardData);
    window.addEventListener('workout_plan_updated', updateDashboardData);
    window.addEventListener('weight_history_updated', updateDashboardData);
    
    return () => {
       window.removeEventListener('tdee_updated', updateDashboardData);
       window.removeEventListener('workout_plan_updated', updateDashboardData);
       window.removeEventListener('weight_history_updated', updateDashboardData);
    };
  }, [user]);

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
