import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Activity, Target, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export default function Profile() {
  const [profile, setProfile] = useState({
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
    const saved = localStorage.getItem("user_profile");
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  const handleChange = (e: any) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    localStorage.setItem("user_profile", JSON.stringify(profile));
    localStorage.removeItem("workout_plan");
    alert("Profile saved successfully!");
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1200px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
         <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">MY PROFILE</h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Biometrics & Fitness Identity</p>
         </div>
         <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest rounded-xl h-10 px-6">
            Save Profile
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Composition */}
          <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-none rounded-3xl overflow-hidden">
             <CardHeader className="border-b border-white/5 pb-4">
               <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Activity className="w-4 h-4 text-cyan-400" />
                 Current Composition
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</label>
                      <Input name="name" value={profile.name} onChange={handleChange} className="h-12 bg-black/40 border-white/5 rounded-xl text-white placeholder:text-slate-700" placeholder="Your Name" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Weight (kg)</label>
                      <Input type="number" name="weight" value={profile.weight} onChange={handleChange} className="h-12 bg-black/40 border-white/5 rounded-xl text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Height (cm)</label>
                      <Input type="number" name="height" value={profile.height} onChange={handleChange} className="h-12 bg-black/40 border-white/5 rounded-xl text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Body Fat (%)</label>
                      <Input type="number" name="bodyFat" value={profile.bodyFat} onChange={handleChange} className="h-12 bg-black/40 border-white/5 rounded-xl text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preferred Style</label>
                      <select name="preferredStyle" value={profile.preferredStyle} onChange={handleChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                        <option value="Calisthenics">Calisthenics</option>
                        <option value="Gym">Gym</option>
                        <option value="Home">Home Workout</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Age</label>
                      <Input type="number" name="age" value={profile.age} onChange={handleChange} className="h-12 bg-black/40 border-white/5 rounded-xl text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Level</label>
                      <select name="level" value={profile.level} onChange={handleChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                        <option value="Beginner (0-1 y)">Beginner (0-1 y)</option>
                        <option value="Intermediate (1-3 y)">Intermediate (1-3 y)</option>
                        <option value="Advanced (3+ y)">Advanced (3+ y)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Goal</label>
                      <select name="primaryGoal" value={profile.primaryGoal} onChange={handleChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                        <option value="Lose Fat">Lose Fat</option>
                        <option value="Build Muscle">Build Muscle</option>
                        <option value="Strength">Strength</option>
                        <option value="Endurance">Endurance</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gender</label>
                      <select name="gender" value={profile.gender} onChange={handleChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Activity Level</label>
                      <select name="activityLevel" value={profile.activityLevel} onChange={handleChange} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
                        <option value="Sedentary">Sedentary</option>
                        <option value="Lightly Active">Lightly Active</option>
                        <option value="Moderately Active">Moderately Active</option>
                        <option value="Very Active">Very Active</option>
                      </select>
                   </div>
                </div>
             </CardContent>
          </Card>

          {/* Biometric Trajectory */}
          <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-none rounded-3xl overflow-hidden min-h-[300px] flex flex-col">
             <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
               <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-emerald-400" />
                 Biometric Trajectory
               </CardTitle>
               <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Weight</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Body Fat</div>
               </div>
             </CardHeader>
             <CardContent className="p-0 flex-1 flex flex-col items-center justify-center py-12">
               <TrendingUp className="w-8 h-8 text-slate-700 mb-4" />
               <p className="text-sm font-medium text-slate-500">Log 2+ weight entries to see progression map.</p>
             </CardContent>
          </Card>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
           <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 shadow-none rounded-3xl overflow-hidden relative">
              <div className="absolute top-8 right-8 w-16 h-16 opacity-10">
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
                     <div className="text-6xl font-black text-white">{bmi || "-"}</div>
                     <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">{bmiCategory || "-"}</div>
                 </div>
                 
                 <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <span>Healthy Range</span>
                    <span className="text-white">18.5 - 25.0</span>
                 </div>
                 {/* Custom progress bar to show BMI range */}
                 <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex mb-8">
                    <div className="h-full bg-orange-500 w-[20%]"></div>
                    <div className="h-full bg-emerald-500 w-[40%] relative">
                       {/* Indicator pill */}
                       <div className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 w-1.5 h-3 bg-white rounded-full"></div>
                    </div>
                    <div className="h-full bg-yellow-500 w-[20%]"></div>
                    <div className="h-full bg-red-500 w-[20%]"></div>
                 </div>

                 <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-2xl p-4">
                    <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
