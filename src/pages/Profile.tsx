import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Activity, Target, TrendingUp, Trash2, Dumbbell, Ruler, Zap, LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { useTranslation } from "../lib/i18n";
import { useFitness } from "../components/FitnessProvider";

export default function Profile() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const { profile: sysProfile, updateProfile: updateSysProfile } = useFitness();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({
    name: "",
    weight: "68",
    height: "168",
    bodyFat: "",
    preferredStyle: "Calisthenics",
    age: "24",
    level: "Beginner (0-1 y)",
    primaryGoal: "Lose Fat",
    gender: "Male",
    activityLevel: "Sedentary"
  });

  useEffect(() => {
    // Sync initial state from FitnessProvider when not editing
    if (!isEditing) {
      setProfile({
        name: sysProfile.name || "",
        weight: sysProfile.weight?.toString() || "68",
        height: sysProfile.height?.toString() || "168",
        bodyFat: sysProfile.bodyFat?.toString() || "",
        preferredStyle: sysProfile.preferredStyle || "Calisthenics",
        age: sysProfile.age?.toString() || "24",
        level: sysProfile.level || "Beginner (0-1 y)",
        primaryGoal: sysProfile.primaryGoal || "Lose Fat",
        gender: sysProfile.gender === 'female' ? 'Female' : (sysProfile.gender === 'other' ? 'Other' : 'Male'),
        activityLevel: sysProfile.activityLevel || "Sedentary"
      });
    }
  }, [sysProfile, isEditing]);

  useEffect(() => {
    const loadUserData = async () => {
      setDataLoading(true);
      if (!user) {
        const history = localStorage.getItem("scan_history");
        if (history) setScanHistory(JSON.parse(history));
        setDataLoading(false);
        return;
      }

      try {
        // Load scans
        const scansRef = collection(db, "users", user.uid, "scans");
        const querySnapshot = await getDocs(scansRef);
        const scans: any[] = [];
        querySnapshot.forEach((doc) => {
          scans.push({ id: doc.id, ...doc.data() });
        });
        // Sort newest first
        scans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setScanHistory(scans);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "users/" + user.uid);
      } finally {
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleChange = (e: any) => {
    setProfile((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    // Update global fitness context
    const updates = {
      name: profile.name,
      weight: parseFloat(profile.weight) || undefined,
      height: parseFloat(profile.height) || undefined,
      age: parseFloat(profile.age) || undefined,
      bodyFat: profile.bodyFat ? parseFloat(profile.bodyFat) : undefined,
      preferredStyle: profile.preferredStyle,
      level: profile.level,
      primaryGoal: profile.primaryGoal,
      gender: profile.gender.toLowerCase() as 'male' | 'female' | 'other',
      activityLevel: profile.activityLevel,
    };
    updateSysProfile(updates as any);

    if (!user) {
      // Guest mode additions (weights history)
      const historyStr = localStorage.getItem("weight_history");
      const weightHistory = historyStr ? JSON.parse(historyStr) : [];
      const today = new Date().toISOString().split('T')[0];
      if (profile.weight) {
        if (weightHistory.length === 0 || weightHistory[weightHistory.length - 1].date !== today) {
          weightHistory.push({ date: today, value: parseFloat(profile.weight) });
        } else {
          weightHistory[weightHistory.length - 1].value = parseFloat(profile.weight);
        }
        localStorage.setItem("weight_history", JSON.stringify(weightHistory));
        window.dispatchEvent(new Event('weight_history_updated'));
      }
      setIsEditing(false);
      return;
    }

    // Save to Firestore
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        ...profile,
        updatedAt: serverTimestamp(),
      });

      // Save Weight Record if needed
      if (profile.weight) {
        const today = new Date().toISOString().split('T')[0];
        const recordId = today; // using date as ID for simplicity
        const recordRef = doc(db, "users", user.uid, "weightRecords", recordId);
        await setDoc(recordRef, {
          userId: user.uid,
          date: today,
          value: parseFloat(profile.weight)
        });
        window.dispatchEvent(new Event('weight_history_updated'));
      }
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users/" + user.uid);
    }
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
        await deleteDoc(doc(db, "users", user.uid, "scans", id));
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
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
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
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Biometrics & Fitness Identity</p>
         </div>
         <div className="flex gap-3 items-center w-full md:w-auto">
            {!user ? (
               <Button onClick={signInWithGoogle} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-bold text-xs uppercase tracking-widest rounded-xl h-10 px-6 w-full md:w-auto">
                  <User className="mr-2 w-4 h-4" /> Sign In with Google
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
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">Name</label>
                        <Input name="name" value={profile.name} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-2xl text-white placeholder:text-slate-700 shadow-inner transition-all px-4" placeholder="Your Name" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-purple-400 transition-colors">Weight <span className="text-slate-600 lowercase">(kg)</span></label>
                        <Input type="number" name="weight" value={profile.weight} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-purple-500/50 focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-orange-400 transition-colors">Height <span className="text-slate-600 lowercase">(cm)</span></label>
                        <Input type="number" name="height" value={profile.height} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-red-400 transition-colors">Body Fat <span className="text-slate-600 lowercase">(%)</span></label>
                        <Input type="number" name="bodyFat" value={profile.bodyFat} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">Preferred Style</label>
                        <select name="preferredStyle" value={profile.preferredStyle} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Calisthenics">Calisthenics</option>
                          <option value="Gym">Gym</option>
                          <option value="Home">Home Workout</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">Age</label>
                        <Input type="number" name="age" value={profile.age} onChange={handleChange} className="h-14 bg-[#0a0a0c] border-white/10 hover:border-white/20 focus-visible:border-cyan-500/50 focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded-2xl text-white shadow-inner transition-all px-4" />
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-emerald-400 transition-colors">Level</label>
                        <select name="level" value={profile.level} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Beginner (0-1 y)">Beginner (0-1 y)</option>
                          <option value="Intermediate (1-3 y)">Intermediate (1-3 y)</option>
                          <option value="Advanced (3+ y)">Advanced (3+ y)</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-yellow-400 transition-colors">Primary Goal</label>
                        <select name="primaryGoal" value={profile.primaryGoal} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Lose Fat">Lose Fat</option>
                          <option value="Build Muscle">Build Muscle</option>
                          <option value="Strength">Strength</option>
                          <option value="Endurance">Endurance</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">Gender</label>
                        <select name="gender" value={profile.gender} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                     </div>
                     <div className="space-y-2 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-cyan-400 transition-colors">Activity Level</label>
                        <select name="activityLevel" value={profile.activityLevel} onChange={handleChange} className="flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 hover:border-white/20 bg-[#0a0a0c] px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 shadow-inner transition-all appearance-none cursor-pointer">
                          <option value="Sedentary">Sedentary</option>
                          <option value="Lightly Active">Lightly Active</option>
                          <option value="Moderately Active">Moderately Active</option>
                          <option value="Very Active">Very Active</option>
                        </select>
                     </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 sm:gap-6">
                     <div className="col-span-2 flex flex-col justify-center p-6 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                           <Dumbbell className="w-24 h-24 text-purple-400" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/20 backdrop-blur-sm">
                           <Dumbbell className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('weight')}</div>
                        <div className="text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                           {profile.weight || "-"}
                           <span className="text-sm font-medium text-slate-500 tracking-normal">kg</span>
                        </div>
                     </div>
                     
                     <div className="col-span-2 flex flex-col justify-center p-6 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] hover:border-orange-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                           <Ruler className="w-24 h-24 text-orange-400" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 border border-orange-500/20 backdrop-blur-sm">
                           <Ruler className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('height')}</div>
                        <div className="text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                           {profile.height || "-"}
                           <span className="text-sm font-medium text-slate-500 tracking-normal">cm</span>
                        </div>
                     </div>
                     
                     <div className="col-span-2 flex flex-col justify-center p-6 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                           <TrendingUp className="w-24 h-24 text-emerald-400" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 backdrop-blur-sm">
                           <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">BMI Score</div>
                        <div className="text-4xl font-black text-white tracking-tight">{bmi || "-"}</div>
                        <div className="mt-3">
                           <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 inline-flex px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              {bmiCategory || "-"}
                           </div>
                        </div>
                     </div>

                     <div className="col-span-2 md:col-span-3 flex flex-col justify-center p-6 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.15)] hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                           <Zap className="w-32 h-32 text-yellow-400" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4 border border-yellow-500/20 backdrop-blur-sm">
                           <Zap className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Primary Goal</div>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{profile.primaryGoal || "-"}</div>
                     </div>

                     <div className="col-span-2 md:col-span-3 flex flex-col justify-center p-6 bg-gradient-to-br from-[#161618] to-[#0a0a0c] rounded-3xl border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30 transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                           <Activity className="w-32 h-32 text-cyan-400" />
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20 backdrop-blur-sm">
                           <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Activity Level</div>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">{profile.activityLevel || "-"}</div>
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
                 Scanner History Log
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                {scanHistory.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-12">
                     <TrendingUp className="w-8 h-8 text-slate-700 mb-4" />
                     <p className="text-sm font-medium text-slate-500">No scans logged yet. Use the Scanner to analyze your physique.</p>
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
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Body Fat</div>
                                     <div className="text-xl font-black text-cyan-400">{scan.bodyFatEstimate}%</div>
                                  </div>
                                  <div>
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Aesthetics</div>
                                     <div className="text-xl font-black text-purple-400">{scan.score}/100</div>
                                  </div>
                                  <div>
                                     <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Muscle</div>
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
                 <div className="flex flex-col items-center justify-center mb-8 py-4">
                     <div className="text-7xl font-black text-white tracking-tight">{bmi || "-"}</div>
                     <div className="mt-4">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 inline-flex px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                           {bmiCategory || "-"}
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    <span>Healthy Range</span>
                    <span className="text-white bg-white/10 px-2 py-1 rounded-md">18.5 - 25.0</span>
                 </div>
                 {/* Custom progress bar to show BMI range */}
                 <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden flex mb-10 shadow-inner">
                    <div className="h-full bg-orange-500 w-[20%]"></div>
                    <div className="h-full bg-emerald-500 w-[40%] relative">
                       {/* Indicator pill */}
                       <div className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 w-2 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                    </div>
                    <div className="h-full bg-yellow-500 w-[20%]"></div>
                    <div className="h-full bg-red-500 w-[20%]"></div>
                 </div>

                 <div className="bg-gradient-to-br from-cyan-950/30 to-cyan-900/10 border border-cyan-500/20 rounded-2xl p-5 shadow-[0_4px_20px_rgba(6,182,212,0.05)]">
                    <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                       <Target className="w-3 h-3" /> Ideal Body Specs
                    </h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">ideal weight:</span>
                          <span className="font-bold text-cyan-400">{idealWeightMin} - {idealWeightMax} kg</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">waist limit:</span>
                          <span className="font-bold text-cyan-400">&lt; 78cm</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">chest target:</span>
                          <span className="font-bold text-cyan-400">~97cm</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium tracking-wide">arm target:</span>
                          <span className="font-bold text-cyan-400">~35.3cm</span>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>

        </div>
      </div>
    </div>
  );
}
