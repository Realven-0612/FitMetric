import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Trophy, Calendar, Target, Zap, TrendingUp, Settings2, Trash2, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../services/firebaseService";
import { useTranslation } from "../lib/i18n";
import { useStore } from "../lib/store";
import { useNutritionStats } from "../hooks/useNutritionStats";
import { getDailyQuote } from "../lib/quotes";
import { API_BASE } from "../lib/api";
import { SkeletonDashboard } from "../components/Skeleton";

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
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const { profile, workoutPlan, nutritionDiary, stravaCalories, setStravaCalories, sessionLogs, waterIntake } = useStore();
  const { targetKcal, consumedKcal, targetPro, consumedPro, waterTarget } = useNutritionStats();

  const [weight, setWeight] = useState<number | string>("--");
  const [nextOperation, setNextOperation] = useState<string>("Rest");
  const [nextWeightHint, setNextWeightHint] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);
  const [consumptionData, setConsumptionData] = useState(defaultConsumptionData);
  const [weightHistoryData, setWeightHistoryData] = useState<any[]>([]);
  const [rawWeightHistory, setRawWeightHistory] = useState<{date: string, value: number, id?: string}[]>([]);

  const handleDeleteWeightRecord = async (dateStr: string, id?: string) => {
    if (user && id) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "weightRecords", id));
        setRawWeightHistory(prev => prev.filter(h => h.id !== id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/weightRecords/${id}`);
      }
    }
  };

  // 1. Strava Activities sync
  useEffect(() => {
    const fetchStravaActivities = async () => {
      const stravaTokenStr = localStorage.getItem("strava_token");
      if (!stravaTokenStr) return;

      try {
        const tokenData = JSON.parse(stravaTokenStr);
        const response = await fetch(`${API_BASE}/api/strava/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            accessToken: tokenData.access_token, 
            refreshToken: tokenData.refresh_token,
            todayOnly: true 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.newTokenData) {
            localStorage.setItem("strava_token", JSON.stringify(data.newTokenData));
          }
          const totalCals = (data.activities || []).reduce((acc: number, curr: any) => acc + (curr.calories || 0), 0);
          setStravaCalories(totalCals);
        } else if (response.status === 401 || response.status === 500) {
          console.warn("Strava token expired or invalid");
        }
      } catch (err) {
        console.error("Failed to fetch Strava activities:", err);
      }
    };

    fetchStravaActivities();
  }, [setStravaCalories]);

  // 2. Sync local component states from Profile & WorkoutPlan & NutritionDiary changes
  useEffect(() => {
    if (profile) {
      setWeight(profile.weight || "--");
    }

    if (workoutPlan) {
      const days = workoutPlan.days || (Array.isArray(workoutPlan) ? workoutPlan : null);
      if (days && Array.isArray(days)) {
          const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; 
          const todayWorkout = days[todayIndex];
          if (todayWorkout && todayWorkout.focusName) {
             setNextOperation(todayWorkout.focusName.length > 20 ? todayWorkout.focusName.substring(0, 20) + '...' : todayWorkout.focusName);
             
             if (todayWorkout.exercises && todayWorkout.exercises.length > 0) {
               const firstExWithWeight = todayWorkout.exercises.find((ex: any) => ex.rec);
               if (firstExWithWeight) {
                 setNextWeightHint(`${firstExWithWeight.rec} kg`);
               } else {
                 setNextWeightHint("");
               }
             }
          }
      }
    }

    // Chart Data and Streak
    if (nutritionDiary) {
       // Compute streak (mock implementation based on diary presence for now, or improve later)
       setStreak(nutritionDiary.length > 0 ? 1 : 0);

       // last 7 days chart
       const chartData = [];
       for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          const mmdd = `${d.getMonth() + 1}/${d.getDate()}`;
          const dayTotal = nutritionDiary
            .filter(e => e.timestamp.startsWith(dStr))
            .reduce((acc, curr) => acc + (curr.kcal || 0), 0);
          chartData.push({ name: mmdd, value: dayTotal });
       }
       setConsumptionData(chartData);
    }
  }, [profile, workoutPlan, nutritionDiary]);

  // 3. Load weight history from Firestore
  useEffect(() => {
    const loadWeightHistory = async () => {
      if (!user) return;
      try {
        const recordsRef = collection(db, "users", user.uid, "weightRecords");
        const qs = await getDocs(recordsRef);
        const history: any[] = [];
        qs.forEach(doc => {
          history.push({ id: doc.id, ...doc.data() });
        });
        history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setRawWeightHistory(history);
        const chartData = history.map(entry => {
          const d = new Date(entry.date);
          return {
            name: `${d.getMonth() + 1}/${d.getDate()}`,
            weight: entry.value
          }
        });
        setWeightHistoryData(chartData);
      } catch (e) {
        console.error("Error loading weight history:", e);
      }
    };
    
    loadWeightHistory();
  }, [user]);

  const dailyQuote = getDailyQuote(language);
  const currentHour = new Date().getHours();
  const showProteinAlert = currentHour >= 16 && consumedPro < (targetPro * 0.8);
  const showWaterAlert = (currentHour >= 14 && waterIntake < (waterTarget * 0.5)) || (currentHour >= 18 && waterIntake < waterTarget);
  
  const isRestDayToday = 
    nextOperation.toLowerCase().includes("rest") || 
    nextOperation.toLowerCase().includes("nghỉ") ||
    nextOperation.toLowerCase().includes("recovery");

  const showWorkoutAlert = currentHour >= 17 && !isRestDayToday && Object.keys(sessionLogs || {}).length === 0;

  if (authLoading) return <SkeletonDashboard />;

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
                    <div className="text-xs text-slate-500 font-medium font-mono uppercase flex flex-col gap-1">
                      <span>/ {targetKcal} {t('total_kcal')}</span>
                      {stravaCalories > 0 && (
                        <div className="flex items-center gap-1.2 text-[#fc4c02] text-[9px] font-black animate-pulse">
                           <Activity className="w-2.5 h-2.5" />
                           <span>+{Math.round(stravaCalories)} {t('active_kcal')}</span>
                        </div>
                      )}
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
                       {nextWeightHint 
                         ? `${t('suggested')}: ${nextWeightHint}` 
                         : isRestDayToday 
                           ? t('rest_recovery') 
                           : t('ready_to_engage')}
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
             "{dailyQuote}"
           </p>
        </Card>
      </div>

      {/* Proactive Alerts */}
      {(showProteinAlert || showWaterAlert || showWorkoutAlert) && (
        <div className="flex flex-col sm:flex-row gap-4 w-full">
           {showProteinAlert && (
             <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex-1">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">
                   <Target className="w-3.5 h-3.5" /> {t('alert_protein_deficit')}
                </div>
                <p className="text-sm text-slate-300">
                   {t('alert_protein_desc')}
                </p>
             </div>
           )}
           {showWaterAlert && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex-1">
                 <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Target className="w-3.5 h-3.5" /> {t('alert_dehydration')}
                 </div>
                 <p className="text-sm text-slate-300">
                    {t('alert_dehydration_desc')}
                 </p>
              </div>
           )}
           {showWorkoutAlert && (
             <div className="bg-[#a855f7]/10 border border-[#a855f7]/20 rounded-xl p-3 flex-1">
                <div className="flex items-center gap-2 text-[#a855f7] text-xs font-bold uppercase tracking-wider mb-1">
                   <Zap className="w-3.5 h-3.5" /> {t('alert_training_pending')}
                </div>
                <p className="text-sm text-slate-300">
                   {t('alert_training_desc_1')} <span className="font-bold text-white">{nextOperation}</span> {t('alert_training_desc_2')}
                </p>
             </div>
           )}
        </div>
      )}

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
                      <p className="text-sm text-slate-500 text-center py-4">{t('no_entries_found')}</p>
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
                  <p className="text-sm font-medium">{t('weight_progression_empty')}</p>
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
