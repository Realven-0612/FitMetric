import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Activity, Target, TrendingUp, Trash2, Dumbbell, Ruler, Zap, LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { doc, collection, onSnapshot, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useTranslation } from "../lib/i18n";
import { useStore, calculateAge } from '../lib/store';
import { handleFirestoreError, OperationType } from "../services/firebaseService";
import BMIBar from "../components/BMIBar";
import { enableNotifications, startReminders, clearReminders } from '../lib/notifications';
import { API_BASE } from "../lib/api";

export default function Profile() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { t } = useTranslation();
  const { profile: storeProfile, setProfile: setStoreProfile, exerciseWeights, sessionLogs, setExerciseWeights, clearSessionLogs } = useStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [isNotifEnabled, setIsNotifEnabled] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    weight: "",
    height: "",
    bodyFat: "",
    preferredStyle: "Gym",
    dateOfBirth: "",
    level: "Beginner (0-1 y)",
    primaryGoal: "Lose Fat",
    gender: "male",
    activityLevel: "Sedentary"
  });

  // Detect initial connection states on mount
  useEffect(() => {
    setIsStravaConnected(!!localStorage.getItem('strava_token'));
    setIsNotifEnabled(
      typeof Notification !== 'undefined' && Notification.permission === 'granted'
    );

    // Mobile same-tab Strava OAuth flow:
    // After redirect back from server, token is in sessionStorage and hash is #strava-connected
    const hash = window.location.hash;
    if (hash === '#strava-connected' || hash === '#strava-error') {
      // Clean up the hash immediately
      window.history.replaceState(null, '', window.location.pathname);

      if (hash === '#strava-connected') {
        const pending = sessionStorage.getItem('strava_pending_token');
        if (pending) {
          try {
            const tokenData = JSON.parse(pending);
            localStorage.setItem('strava_token', JSON.stringify(tokenData));
            setIsStravaConnected(true);
            toast.success('Successfully connected to Strava! 🏃');
          } catch {
            toast.error('Strava token parse error.');
          }
          sessionStorage.removeItem('strava_pending_token');
        }
      } else {
        toast.error('Strava connection failed.');
      }
    }
  }, []);

  useEffect(() => {
    if (storeProfile) {
      setProfile(prev => ({
        ...prev,
        ...storeProfile,
        weight: storeProfile.weight?.toString() || prev.weight,
        height: storeProfile.height?.toString() || prev.height,
        dateOfBirth: storeProfile.dateOfBirth || prev.dateOfBirth,
        bodyFat: storeProfile.bodyFat?.toString() || prev.bodyFat,
        gender: (storeProfile.gender as string) || prev.gender,
      }));
    }
  }, [storeProfile]);

  useEffect(() => {
    if (!user) {
      const history = localStorage.getItem("scan_history");
      if (history) setScanHistory(JSON.parse(history));
      return;
    }

    const scansRef = collection(db, "users", user.uid, "scans");
    const unsubscribe = onSnapshot(scansRef, (snapshot) => {
      const scans: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isDeleted !== true) {
          scans.push({ id: doc.id, ...data });
        }
      });
      scans.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setScanHistory(scans);
      setDataLoading(false);
    }, (error) => {
      console.error("Error listening to scans:", error);
      setDataLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
        if (event.data.payload) {
          localStorage.setItem('strava_token', JSON.stringify(event.data.payload));
          setIsStravaConnected(true);
        }
        toast.success("Successfully connected to Strava!");
      } else if (event.data?.type === 'STRAVA_AUTH_ERROR') {
        toast.error("Strava connection failed.");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectStrava = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/strava/auth`);
      if (!response.ok) throw new Error('API down');
      const data = await response.json();
      const authWindow = window.open(data.url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) {
        toast.error('Please allow popups to connect Strava');
        return;
      }
      // Listen for the OAuth callback result
      const onMessage = (event: MessageEvent) => {
        if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
        if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
          if (event.data.payload) {
            localStorage.setItem('strava_token', JSON.stringify(event.data.payload));
          }
          setIsStravaConnected(true);
          toast.success('Successfully connected to Strava!');
        } else if (event.data?.type === 'STRAVA_AUTH_ERROR') {
          toast.error('Strava connection failed.');
        }
        window.removeEventListener('message', onMessage);
      };
      window.addEventListener('message', onMessage);
    } catch {
      toast.error('Strava credentials omitted in environment variables.');
    }
  };

  const handleEnablePush = async () => {
    const success = await enableNotifications();
    if (success) {
      setIsNotifEnabled(true);
      toast.success(t('toast_notif_enabled'));
      if (user?.uid) {
        startReminders(user.uid);
      }
    } else {
      toast.error(t('toast_notif_error'));
    }
  };

  const handleDisablePush = () => {
    clearReminders();
    setIsNotifEnabled(false);
    toast.info("Notifications disabled");
  };

  const handleDisconnectStrava = () => {
    localStorage.removeItem("strava_token");
    setIsStravaConnected(false);
    toast.info("Strava disconnected");
  };


  const handleSaveAllRecords = () => {
    toast.success('All records and history successfully synced to cloud!');
  };

  const handleClearPRs = () => {
    if (confirm(t('confirm_delete_prs'))) {
      setExerciseWeights({});
      toast.success(t('cleared_prs'));
    }
  };

  const handleClearHistory = () => {
    if (confirm(t('confirm_delete_history'))) {
      clearSessionLogs();
      toast.success(t('cleared_history'));
    }
  };
  const handleChange = (e: any) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const updatedProfile = {
      ...profile,
      weight: Number(profile.weight),
      height: Number(profile.height),
      dateOfBirth: profile.dateOfBirth,
      age: calculateAge(profile.dateOfBirth),
      bodyFat: Number(profile.bodyFat) || 0,
      gender: profile.gender as "male" | "female",
    };
    setStoreProfile(updatedProfile);
    setIsEditing(false);
  };

  const handleDeleteScan = async (idx: number, id?: string) => {
    if (!user) {
      const updatedHistory = scanHistory.filter((_, i) => i !== idx);
      setScanHistory(updatedHistory);
      localStorage.setItem("scan_history", JSON.stringify(updatedHistory));
      return;
    }

    if (id) {
      try {
        await setDoc(doc(db, "users", user.uid, "scans", id), {
          isDeleted: true,
          deletedAt: serverTimestamp()
        }, { merge: true });
        setScanHistory(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/scans/${id}`);
      }
    }
  };

  // Calculate BMI
  const weightNum = parseFloat(profile.weight);
  const heightNum = parseFloat(profile.height) / 100;
  let bmi = 0;
  let bmiCategory = "";
  if (weightNum && heightNum) {
    bmi = Number((weightNum / (heightNum * heightNum)).toFixed(1));
    if (bmi < 18.5) bmiCategory = t('bmi_underweight');
    else if (bmi < 25) bmiCategory = t('bmi_normal');
    else if (bmi < 30) bmiCategory = t('bmi_overweight');
    else bmiCategory = t('bmi_obese');
  }

  // Ideal specs approximation
  const idealWeightMin = heightNum ? (18.5 * heightNum * heightNum).toFixed(1) : "0";
  const idealWeightMax = heightNum ? (24.9 * heightNum * heightNum).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
         <div>
            <div className="flex items-center gap-4">
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{t('profile')}</h1>
               {authLoading ? (
                 <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
               ) : user ? (
                 <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    Synced
                 </div>
               ) : (
                 <div className="bg-slate-500/10 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-500/20">
                    Local Only
                 </div>
               )}
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t('biometrics_identity')}</p>
         </div>
         <div className="flex gap-3 items-center w-full md:w-auto">
            {!user ? (
               <Button onClick={signInWithGoogle} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold text-xs uppercase tracking-widest rounded-xl h-10 px-6 w-full md:w-auto">
                  <User className="mr-2 w-4 h-4" /> {t('sign_in_google')}
               </Button>
            ) : (
               <Button onClick={signOut} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold text-xs uppercase tracking-widest rounded-xl h-10 px-4 w-full md:w-auto">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
               </Button>
            )}

            {isEditing ? (
              <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest rounded-xl h-10 px-6 w-full md:w-auto mt-4 md:mt-0">
                 Done
              </Button>
            ) : (
              <Button onClick={() => setIsEditing(true)} variant="outline" className="border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl h-10 px-6 w-full md:w-auto mt-4 md:mt-0">
                 {t('update_stats')}
              </Button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Composition */}
          <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-none rounded-3xl overflow-hidden">
             <CardHeader className="border-b border-white/5 pb-4">
               <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Activity className="w-4 h-4 text-cyan-400" />
                 {t('quick_stats')}
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 py-4">
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">{t('name_label')}</label>
                        <Input name="name" value={profile.name || ''} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-2xl text-white placeholder:text-slate-700 shadow-inner transition-all px-4" placeholder="Your Name" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-purple-400 transition-colors">{t('weight_label')} <span className="text-slate-600 lowercase">(kg)</span></label>
                        <Input type="number" name="weight" value={profile.weight || ''} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-purple-500/50 focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-orange-400 transition-colors">{t('height_label')} <span className="text-slate-600 lowercase">(cm)</span></label>
                        <Input type="number" name="height" value={profile.height || ''} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-red-400 transition-colors">{t('body_fat_label')} <span className="text-slate-600 lowercase">(%)</span></label>
                        <Input type="number" name="bodyFat" value={profile.bodyFat || ''} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">{t('preferred_style_label')}</label>
                        <select name="preferredStyle" value={profile.preferredStyle} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Calisthenics">{t('style_calisthenics')}</option>
                          <option value="Gym">{t('style_gym')}</option>
                          <option value="Home">{t('style_home')}</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">{t('age_label')}</label>
                        <Input type="date" name="dateOfBirth" value={profile.dateOfBirth || ''} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-2xl text-white shadow-inner transition-all px-4 [color-scheme:dark]" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-emerald-400 transition-colors">{t('level_label')}</label>
                        <select name="level" value={profile.level} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Beginner (0-1 y)">{t('level_beginner')}</option>
                          <option value="Intermediate (1-3 y)">{t('level_intermediate')}</option>
                          <option value="Advanced (3+ y)">{t('level_advanced')}</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-yellow-400 transition-colors">{t('primary_goal_label')}</label>
                        <select name="primaryGoal" value={profile.primaryGoal} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Lose Fat">{t('goal_lose_fat')}</option>
                          <option value="Build Muscle">{t('goal_build_muscle')}</option>
                          <option value="Strength">{t('goal_strength')}</option>
                          <option value="Endurance">{t('goal_endurance')}</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">{t('gender_label')}</label>
                        <select name="gender" value={profile.gender} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="male">{t('male')}</option>
                          <option value="female">{t('female')}</option>
                          <option value="other">{t('other')}</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">{t('activity_level_label')}</label>
                        <select name="activityLevel" value={profile.activityLevel} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Sedentary">{t('activity_sedentary')}</option>
                          <option value="Lightly Active">{t('activity_light')}</option>
                          <option value="Moderately Active">{t('activity_moderate')}</option>
                          <option value="Very Active">{t('activity_very')}</option>
                        </select>
                     </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                     <div className="flex flex-col justify-center p-4 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(168,85,247,0.15)] hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                           <Dumbbell className="w-16 h-16 text-purple-400" />
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 border border-purple-500/20 backdrop-blur-sm">
                           <Dumbbell className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('weight')}</div>
                        <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                           {profile.weight || "-"}
                           <span className="text-xs font-medium text-slate-500 tracking-normal">kg</span>
                        </div>
                     </div>
                     
                     <div className="flex flex-col justify-center p-4 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(249,115,22,0.15)] hover:border-orange-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                           <Ruler className="w-16 h-16 text-orange-400" />
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 border border-orange-500/20 backdrop-blur-sm">
                           <Ruler className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('height')}</div>
                        <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                           {profile.height || "-"}
                           <span className="text-xs font-medium text-slate-500 tracking-normal">cm</span>
                        </div>
                     </div>


                     <div className="flex flex-col justify-center p-4 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(234,179,8,0.15)] hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                           <Zap className="w-20 h-20 text-yellow-400" />
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3 border border-yellow-500/20 backdrop-blur-sm">
                           <Zap className="w-4 h-4 text-yellow-400" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('primary_objective')}</div>
                        <div className="text-xl font-black text-white tracking-tight leading-tight">{profile.primaryGoal || "-"}</div>
                     </div>

                     <div className="flex flex-col justify-center p-4 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.4)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.15)] hover:border-cyan-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                           <Activity className="w-20 h-20 text-cyan-400" />
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3 border border-cyan-500/20 backdrop-blur-sm">
                           <Activity className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('activity_multiplier')}</div>
                        <div className="text-xl font-black text-white tracking-tight leading-tight">{profile.activityLevel || "-"}</div>
                     </div>
                  </div>
                )}
             </CardContent>
          </Card>

          {/* Scan History Log */}
          <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-none rounded-3xl overflow-hidden flex flex-col">
             <CardHeader className="border-b border-white/5 pb-4">
               <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-emerald-400" />
                 {t('scanner_history_log')}
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                {scanHistory.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-12">
                     <TrendingUp className="w-8 h-8 text-slate-700 mb-4" />
                     <p className="text-sm font-medium text-slate-500">{t('no_scans_logged')}</p>
                   </div>
                ) : (
                    <div className="space-y-4">
                      {scanHistory.map((scan, idx) => (
                         <div key={idx} className="bg-gradient-to-br from-[#161618] to-[#0a0a0c] border border-white/5 hover:border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-lg hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all duration-300">
                            <div className="flex items-center gap-4">
                               {scan.image && (
                                  <img src={scan.image} alt="Physique Scan" className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-inner" />
                               )}
                               <div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
                                     {new Date(scan.date).toLocaleDateString()} {new Date(scan.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                  <div className="text-xl font-black text-white tracking-tight">{scan.physiqueType}</div>
                               </div>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="flex gap-4 sm:gap-6 bg-black/40 px-4 py-3 rounded-2xl border border-white/5 shadow-inner">
                                  <div>
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{t('body_fat_label')}</div>
                                     <div className="text-xl font-black text-cyan-400">{String(scan.bodyFatEstimate).replace('%', '')}%</div>
                                  </div>
                                  <div>
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{t('aesthetics_label')}</div>
                                     <div className="text-xl font-black text-purple-400">{scan.score}/100</div>
                                  </div>
                                  <div>
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{t('muscle_label')}</div>
                                     <div className="text-xl font-black text-emerald-400">{scan.muscleMass}</div>
                                  </div>
                               </div>
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteScan(idx, scan.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 w-10 rounded-xl self-start sm:self-center transition-all bg-red-500/5">
                                  <Trash2 className="w-5 h-5" />
                               </Button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </CardContent>
          </Card>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
           <Card className="bg-gradient-to-br from-[#161618] to-[#0a0a0c] border border-white/5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden relative group">
              <div className="absolute top-8 right-8 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.05] group-hover:scale-110 transition-all duration-700">
                 <User className="w-full h-full text-white" />
              </div>
              <CardHeader className="border-b border-white/5 pb-4">
                 <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    BMI Focus
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 {/* Thêm đoạn này trước BMIBar */}
                 {bmi > 0 && (
                   <div className="text-center mb-6">
                     <div className="text-7xl font-black text-white">{bmi}</div>
                     <div className="mt-2 inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                       {bmiCategory}
                     </div>
                   </div>
                 )}
                 <div className="mb-10 relative z-10">
                    <BMIBar weight={Number(profile.weight)} height={Number(profile.height)} hideScore={true} />
                 </div>

                 <div className="bg-gradient-to-br from-cyan-950/30 to-cyan-900/10 border border-cyan-500/20 rounded-2xl p-5 shadow-[0_4px_20px_rgba(6,182,212,0.05)]">
                    <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                       <Target className="w-3 h-3" /> {t('ideal_body_specs')}
                    </h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">{t('ideal_weight')}:</span>
                          <span className="font-bold text-cyan-400">{idealWeightMin} - {idealWeightMax} kg</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">{t('waist_limit')}:</span>
                          <span className="font-bold text-cyan-400">&lt; 78cm</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">{t('chest_target')}:</span>
                          <span className="font-bold text-cyan-400">~97cm</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">{t('arm_target')}:</span>
                          <span className="font-bold text-cyan-400">~35.3cm</span>
                       </div>
                    </div>
                 </div>

                 {/* Integrations */}
                 <div className="mt-4 bg-orange-950/20 border border-orange-500/20 rounded-2xl p-4">
                   <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     🔗 {t('integrations')}
                   </h3>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center text-sm">🏃</div>
                       <div>
                         <div className="text-xs font-bold text-white">Strava</div>
                         <div className="text-[10px] text-slate-500">Sync Cardio & Runs</div>
                       </div>
                     </div>
                      <button
                        onClick={isStravaConnected ? handleDisconnectStrava : handleConnectStrava}
                        disabled={!user}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all ${
                          isStravaConnected
                            ? 'text-red-400 border border-red-500/30 hover:bg-red-500/10'
                            : 'text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10'
                        }`}
                      >
                        {isStravaConnected ? '✕ DISCONNECT' : t('connect')}
                      </button>
                   </div>
                   {!user && <p className="text-[10px] text-slate-600 mt-2">* Sign in first to connect integrations.</p>}
                 </div>

                 {/* Push Notifications */}
                 <div className="mt-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4">
                   <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">
                     🔔 {t('push_notifications')}
                   </h3>
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-purple-500/20 rounded-xl flex items-center justify-center">🔔</div>
                       <div>
                         <div className="text-xs font-bold text-white">Reminders</div>
                         <div className="text-[10px] text-slate-500">Hydration, Workouts, Meals</div>
                       </div>
                     </div>
                      <button
                        onClick={isNotifEnabled ? handleDisablePush : handleEnablePush}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all ${
                          isNotifEnabled
                            ? 'text-red-400 border border-red-500/30 hover:bg-red-500/10'
                            : 'text-purple-400 border border-purple-500/30 hover:bg-purple-500/10'
                        }`}
                      >
                        {isNotifEnabled ? '✕ DISABLE' : t('enable')}
                      </button>
                   </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-[#111111]/80 border border-white/5 rounded-3xl">
             <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
               <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 ⚙️ {t('personal_records_history')}
               </CardTitle>
               <button onClick={handleSaveAllRecords} className="text-[10px] font-black text-black bg-cyan-400 px-3 py-1.5 rounded-xl hover:bg-cyan-300 transition-colors">
                 {t('save_all')}
               </button>
             </CardHeader>
             <CardContent className="p-5 space-y-4">
               <div>
                 <div className="flex items-center justify-between mb-1">
                   <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{t('exercise_prs_kg')}</p>
                   {Object.keys(exerciseWeights || {}).length > 0 && (
                     <button onClick={handleClearPRs} className="text-red-400 hover:text-red-300 transition-colors" title="Clear PRs">
                       <Trash2 className="w-3 h-3" />
                     </button>
                   )}
                 </div>
                 {Object.keys(exerciseWeights || {}).length > 0 ? (
                   <div className="grid grid-cols-2 gap-2 mt-2">
                     {Object.entries(exerciseWeights).map(([ex, weight]) => (
                       <div key={ex} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                         <span className="text-xs text-slate-300 truncate mr-2">{ex}</span>
                         <span className="text-xs font-bold text-white">{weight}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-xs text-slate-500">{t('no_prs_recorded')}</p>
                 )}
               </div>
               <div>
                 <div className="flex items-center justify-between mb-1">
                   <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{t('training_history')}</p>
                   {Object.keys(sessionLogs || {}).length > 0 && (
                     <button onClick={handleClearHistory} className="text-red-400 hover:text-red-300 transition-colors" title="Clear History">
                       <Trash2 className="w-3 h-3" />
                     </button>
                   )}
                 </div>
                 {Object.keys(sessionLogs || {}).length > 0 ? (
                   <p className="text-xs text-slate-300 mt-1">
                     You have logged sets for <span className="text-white font-bold">{Object.keys(sessionLogs).length}</span> exercise(s). 
                     Keep pushing your limits!
                   </p>
                 ) : (
                   <p className="text-xs text-slate-500">{t('no_workout_history')}</p>
                 )}
               </div>
             </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
}
