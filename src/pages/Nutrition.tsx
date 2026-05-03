import { useState } from "react";
import { GoogleGenAI, Type } from "@google/genai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flame, Utensils, FileText, Info, Calculator, Target, Droplet, Apple, Loader2 } from "lucide-react";

export default function Nutrition() {
  const macros = [
    { name: "Protein", current: 95, target: 144, color: "bg-cyan-400", percent: 65, info: "2.0g / 1kg" },
    { name: "Carbs", current: 85, target: 138, color: "bg-indigo-400", percent: 61, info: "Energy" },
    { name: "Fats", current: 30, target: 72, color: "bg-emerald-400", percent: 41, info: "1.0g / 1kg" },
  ];

  const [weight, setWeight] = useState(72);
  const [height, setHeight] = useState(168);
  const [age, setAge] = useState(24);
  const [bodyFat, setBodyFat] = useState("");
  const [activity, setActivity] = useState(1.375);
  const [goal, setGoal] = useState("lose"); // maintain, lose, gain

  // AI Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, kcal: number, protein: number, carbs: number, fat: number} | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
Bạn là một chuyên gia dinh dưỡng. Người dùng muốn tìm thông tin dinh dưỡng cho món ăn/thực phẩm: "${searchQuery}".
Dựa vào dữ liệu từ Viện Dinh Dưỡng Quốc Gia Việt Nam (viendinhduong.vn) hoặc các nguồn uy tín, hãy cho biết giá trị dinh dưỡng trên 100g.
Trả về dữ liệu dưới dạng JSON với các trường:
- name: Tên món ăn (định dạng đẹp, chuẩn).
- kcal: Năng lượng (kcal) (kiểu number).
- protein: Lượng chất đạm (g) (kiểu number).
- carbs: Lượng carbohydrate (g) (kiểu number).
- fat: Lượng chất béo (g) (kiểu number).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              kcal: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            }
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        setSearchResult(result);
      }
    } catch (e) {
      console.error("Error searching food API", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Calculation Logic
  const calculateResult = () => {
    let lbm = 0;
    let bmr = 0;
    let isKatch = false;
    
    if (bodyFat && parseFloat(bodyFat) > 0) {
      lbm = weight * (100 - parseFloat(bodyFat)) / 100;
      bmr = 370 + (21.6 * lbm);
      isKatch = true;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5; // Mifflin for Men
    }

    const tdee = bmr * activity;
    let targetCals = tdee;
    if (goal === "lose") targetCals = tdee - 500;
    if (goal === "gain") targetCals = tdee + 300;

    const targetPro = weight * 2.0;
    const targetFat = weight * 1.0;
    const targetCarbs = (targetCals - (targetPro * 4) - (targetFat * 9)) / 4;

    return {
      isKatch,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCals: Math.round(targetCals),
      pro: Math.round(targetPro),
      fat: Math.round(targetFat),
      carb: Math.round(targetCarbs)
    };
  };

  const results = calculateResult();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-10">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
           <div>
              <h2 className="text-2xl font-black text-white px-2">NUTRITION SYSTEM</h2>
           </div>
           <TabsList className="bg-[#111111]/80 border border-white/5 p-1 rounded-xl">
             <TabsTrigger value="dashboard" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Dashboard</TabsTrigger>
             <TabsTrigger value="calculator" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Calculator</TabsTrigger>
           </TabsList>
        </div>

        {/* --- DASHBOARD TAB --- */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid xl:grid-col-3 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
            
            {/* Column 1: Smart Nutrition & DB Search */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-cyan-400" />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">SMART NUTRITION</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Real-time metabolism monitor</p>
                   </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-end gap-2">
                     <span className="text-5xl font-black text-white leading-none">0</span>
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Kcal Consumed</span>
                   </div>
                   <div className="text-right">
                     <span className="text-xl font-bold text-slate-300">/ 1438</span>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Daily Limit</p>
                   </div>
                </div>
                <Progress value={0} className="h-1.5 bg-white/5 mb-6 [&>div]:bg-white" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remaining</p>
                    <p className="text-xl font-black text-cyan-400 mb-3">1438 KCAL</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Optimal</p>
                  </div>
                  
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center space-y-3">
                    {[{n: "Protein", v: "0", t: "136g"}, {n: "Carbs", v: "0", t: "71g"}, {n: "Fats", v: "0", t: "68g"}].map(m => (
                      <div key={m.n}>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                          <span className="text-slate-400">{m.n}</span>
                          <span className="text-slate-500">{m.v} / {m.t}</span>
                        </div>
                        <Progress value={0} className="h-1 bg-white/5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-orange-400" />
                   </div>
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">Nutrition DB Search</h2>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Search any food for cal..." 
                      className="bg-black/40 border-white/10 h-10 rounded-xl text-xs pl-10 focus-visible:ring-cyan-500/50 text-white placeholder:text-slate-500" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-slate-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest border border-cyan-500/30">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                <p className="text-[8px] text-cyan-400/70 font-bold uppercase tracking-widest text-center mb-6">Search using AI for accurate nutrition ✨</p>

                <div className="flex-1 border border-white/5 bg-black/20 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-500 p-8 min-h-[150px]">
                  {isSearching ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                      <p className="text-xs font-medium text-center text-cyan-400/80">Analyzing food variants...</p>
                    </div>
                  ) : searchResult ? (
                    <div className="w-full h-full flex flex-col">
                       <h3 className="text-sm font-black text-white capitalize text-center mb-4">{searchResult.name} <span className="text-[10px] text-slate-500 uppercase ml-1">/ 100g</span></h3>
                       <div className="grid grid-cols-2 gap-4 flex-1">
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-xl font-black text-cyan-400">{searchResult.kcal}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Kcal</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{searchResult.protein}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Protein</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{searchResult.carbs}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Carbs</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{searchResult.fat}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fat</span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <p className="text-xs font-medium text-center">Enter a food name to let AI analyze it.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Intake Capture */}
            <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col">
              <div className="flex flex-col items-center mb-8 pt-4">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <Apple className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider italic">INTAKE CAPTURE</h2>
              </div>

              <Button className="w-full h-12 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs uppercase tracking-widest rounded-xl mb-8 flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Target className="w-4 h-4" /> AI Food Vision Scanner
              </Button>

              <div className="relative mb-8 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <span className="relative bg-[#111111] px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Or Manual</span>
              </div>

              <div className="space-y-4 flex-1">
                <Input placeholder="Item Name..." className="bg-black/30 border-white/5 h-12 rounded-xl text-sm font-medium text-center placeholder:text-slate-600" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Protein" className="bg-black/30 border-white/5 h-12 rounded-xl text-sm font-medium text-center placeholder:text-slate-600" />
                  <Input placeholder="Carbs (g)" className="bg-black/30 border-white/5 h-12 rounded-xl text-sm font-medium text-center placeholder:text-slate-600" />
                  <Input placeholder="Fat (g)" className="bg-black/30 border-white/5 h-12 rounded-xl text-sm font-medium text-center placeholder:text-slate-600" />
                  <Input placeholder="Kcal" className="bg-black/30 border-white/5 h-12 rounded-xl text-sm font-medium text-center placeholder:text-slate-600" />
                </div>
              </div>

              <Button className="w-full h-12 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold text-xs uppercase tracking-widest rounded-xl mt-8">
                Add Meal
              </Button>
            </div>

            {/* Column 3: Metrics, Hydration & Motivation */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-orange-400" />
                   </div>
                   <h2 className="text-xs font-black text-white uppercase tracking-wider">Today's Motivation</h2>
                </div>
                <p className="text-sm text-slate-400 italic">
                  "The only bad workout is the one that didn't happen. Your phone and laptop are synced, no excuses left."
                </p>
              </div>

              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-blue-400" />
                   </div>
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">Hydration Tracker</h2>
                </div>
                <div className="flex items-center justify-center mb-6">
                   <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center relative overflow-hidden bg-black/30">
                     <div className="absolute bottom-0 w-full bg-blue-500/30 transition-all duration-1000 h-[60%]">
                       <div className="absolute top-0 w-full h-4 bg-blue-400/40 rounded-[100%] scale-150"></div>
                     </div>
                     <div className="relative z-10 text-center">
                       <span className="text-3xl font-black text-white leading-none">1.8</span>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Liters</p>
                     </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button className="h-10 bg-black/40 text-slate-300 border border-white/5 hover:bg-white/10 rounded-xl text-xs">- 250ml</Button>
                  <Button className="h-10 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl text-xs">+ 250ml</Button>
                </div>
              </div>
              
              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                   </div>
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">Weekly Metrics</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">Avg 7D Intake</p>
                    <p className="text-lg font-black text-white">0 <span className="text-xs font-bold text-slate-400">/1438</span></p>
                  </div>
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">Avg 7D Protein</p>
                    <p className="text-lg font-black text-white">0g <span className="text-xs font-bold text-slate-400">/136g</span></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        {/* --- CALCULATOR TAB --- */}
        <TabsContent value="calculator" className="space-y-6">
          <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none overflow-hidden xl:grid xl:grid-cols-[1.2fr_1fr]">
             <div className="p-6 lg:p-10 space-y-8 relative">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                      <Calculator className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">Engine Configuration</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Algorithms: Katch-McArdle & Mifflin-St Jeor</p>
                   </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Weight (kg)</Label>
                      <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Height (cm)</Label>
                      <Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Age</Label>
                      <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest group relative flex items-center gap-1">
                         Body Fat % 
                         <span className="text-cyan-400">(Optional)</span>
                      </Label>
                      <Input type="number" placeholder="Leave empty for Mifflin" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Activity Multiplier</Label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                         { v: 1.2, l: "Sedentary", d: "x1.2" }, 
                         { v: 1.375, l: "Light", d: "x1.375" }, 
                         { v: 1.55, l: "Moderate", d: "x1.55" },
                         { v: 1.725, l: "Active", d: "x1.725" },
                      ].map((level) => (
                         <button
                            key={level.v}
                            onClick={() => setActivity(level.v)}
                            className={`h-16 rounded-[1.25rem] text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
                               activity === level.v 
                               ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                               : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-black/50'
                            }`}
                         >
                            <span>{level.l}</span>
                            <span className={`text-[10px] ${activity === level.v ? 'text-cyan-400/70' : 'text-slate-600'}`}>{level.d}</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Protocol Goal</Label>
                   <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setGoal("lose")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${goal === "lose" ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>LOSE FAT</button>
                      <button onClick={() => setGoal("maintain")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${goal === "maintain" ? 'bg-slate-500/20 text-slate-400 border-slate-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>MAINTAIN</button>
                      <button onClick={() => setGoal("gain")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${goal === "gain" ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>GAIN MUSCLE</button>
                   </div>
                </div>
             </div>

             <div className="bg-[#0a0c10] border-t xl:border-t-0 xl:border-l border-white/5 p-6 lg:p-10 flex flex-col justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full max-w-sm mx-auto">
                   
                   <div className="text-center mb-10">
                      <div className="inline-flex items-center justify-center gap-2 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                         <Target className="w-3.5 h-3.5" /> Output Blueprint
                      </div>
                      <div className="text-6xl font-black text-white tracking-tight drop-shadow-md mb-2">
                         {results.targetCals}
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                         Daily kcal limit
                      </div>
                      
                      <div className="flex justify-center gap-6 mt-6">
                         <div className="text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">BMR</div>
                            <div className="text-base font-bold text-slate-300">{results.bmr} <span className="text-[10px] text-slate-600">({results.isKatch ? 'Katch' : 'Mifflin'})</span></div>
                         </div>
                         <div className="text-center border-l border-white/10 pl-6">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">TDEE</div>
                            <div className="text-base font-bold text-slate-300">{results.tdee}</div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Protein <span className="text-[10px] text-slate-600 ml-2">2.0g/kg</span></span>
                         <span className="text-2xl font-black text-cyan-400 group-hover:scale-105 transition-transform">{results.pro}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Fat <span className="text-[10px] text-slate-600 ml-2">1.0g/kg</span></span>
                         <span className="text-2xl font-black text-orange-400 group-hover:scale-105 transition-transform">{results.fat}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Carbs <span className="text-[10px] text-slate-600 ml-2">Rest</span></span>
                         <span className="text-2xl font-black text-indigo-400 group-hover:scale-105 transition-transform">{results.carb}g</span>
                      </div>
                   </div>
                   
                   <Button className="w-full mt-8 h-14 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      Sync to App
                   </Button>
                </div>
             </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

