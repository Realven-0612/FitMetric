import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flame, Utensils, FileText, Info, Calculator, Target, Droplet, Apple, Loader2, Trash2, Camera, Sparkles } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { getQuoteOfTheDay } from "../lib/quotes";
import { MealScanner } from "../components/MealScanner";
import { RecipeGenerator } from "../components/RecipeGenerator";
import { useFitness } from "../components/FitnessProvider";

export default function Nutrition() {
  const { t, language } = useTranslation();
  const quote = getQuoteOfTheDay();
  const { profile, updateProfile, diary, addFoodEntry, removeFoodEntry, macros, consumed, waterIntake, logWater: logWaterContext } = useFitness();
  const { weight, height, age, bodyFat, activityLevel, primaryGoal } = profile;

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showRecipeGen, setShowRecipeGen] = useState(false);

  const clearDiary = () => {
    diary.forEach((f) => {
      if (f.id) removeFoodEntry(f.id);
    });
  };

  // Manual Entry State
  const [manualName, setManualName] = useState("");
  const [manualPro, setManualPro] = useState("");
  const [manualCarb, setManualCarb] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  const handleManualAdd = () => {
    if (!manualName || (!manualKcal && !manualPro && !manualCarb && !manualFat)) return;
    addFoodEntry({
      name: manualName,
      kcal: Number(manualKcal) || 0,
      protein: Number(manualPro) || 0,
      carbs: Number(manualCarb) || 0,
      fat: Number(manualFat) || 0,
    });
    setManualName("");
    setManualPro("");
    setManualCarb("");
    setManualFat("");
    setManualKcal("");
  };

  // AI Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{name: string, kcal: number, protein: number, carbs: number, fat: number} | null>(null);
  const [consumedGram, setConsumedGram] = useState<number | "">(100);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    setConsumedGram(100);
    try {
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

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                kcal: { type: "NUMBER" },
                protein: { type: "NUMBER" },
                carbs: { type: "NUMBER" },
                fat: { type: "NUMBER" }
              }
            }
          }
        })
      });

      if (!response.ok) throw new Error('Failed to generate content');
      const data = await response.json();

      if (data.text) {
        const result = JSON.parse(data.text);
        setSearchResult(result);
      }
    } catch (e) {
      console.error("Error searching food API", e);
    } finally {
      setIsSearching(false);
    }
  };

  const consumedKcal = consumed.calories;
  const consumedPro = consumed.protein;
  const consumedCarb = consumed.carbs;
  const consumedFat = consumed.fat;

  // Calculate water target based on weight (ml/kg rule of thumb ~35ml per kg)
  const waterTarget = Number((weight * 0.035).toFixed(2));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto pb-10">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
           <div>
              <h2 className="text-2xl font-black text-white px-2">{t('nutrition_system')}</h2>
           </div>
           <TabsList className="bg-[#111111]/80 border border-white/5 p-1 rounded-xl">
             <TabsTrigger value="dashboard" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">{t('dashboard')}</TabsTrigger>
             <TabsTrigger value="calculator" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">{t('calculator')}</TabsTrigger>
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
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">{t('smart_nutrition')}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('realtime_metabolism')}</p>
                   </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-end gap-2">
                     <span className="text-5xl font-black text-white leading-none">{consumedKcal}</span>
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('kcal_consumed')}</span>
                   </div>
                   <div className="text-right">
                     <span className="text-xl font-bold text-slate-300">/ {macros.calories}</span>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t('daily_limit')}</p>
                   </div>
                </div>
                <Progress value={(consumedKcal / macros.calories) * 100 || 0} className="h-1.5 bg-white/5 mb-6 [&>div]:bg-white" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('remaining')}</p>
                    <p className="text-xl font-black text-cyan-400 mb-3">{Math.max(0, macros.calories - consumedKcal)} KCAL</p>
                    <Button 
                      onClick={() => setShowRecipeGen(true)}
                      className="w-full h-8 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-[9px] font-black uppercase tracking-widest rounded-lg border border-purple-500/20"
                    >
                      <Sparkles className="w-3 h-3 mr-2" /> Find Recipe
                    </Button>
                  </div>
                  
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center space-y-3">
                    {[{n: t('protein'), v: consumedPro, t: macros.protein, color: "bg-cyan-400"}, {n: t('carbs'), v: consumedCarb, t: macros.carbs, color: "bg-indigo-400"}, {n: t('fats'), v: consumedFat, t: macros.fat, color: "bg-emerald-400"}].map(m => (
                      <div key={m.n}>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                          <span className="text-slate-400">{m.n}</span>
                          <span className="text-slate-500">{m.v} / {m.t}</span>
                        </div>
                        <Progress value={(m.v / m.t) * 100 || 0} className={`h-1 bg-white/5 [&>div]:${m.color}`} />
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
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">{t('nutrition_db_search')}</h2>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Input 
                      placeholder={t('search_food_placeholder')} 
                      className="bg-black/40 border-white/10 h-10 rounded-xl text-xs pl-10 focus-visible:ring-cyan-500/50 text-white placeholder:text-slate-500" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-slate-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <Button 
                    onClick={() => setShowScanner(true)}
                    className="bg-white/5 text-white hover:bg-white/10 h-10 rounded-xl px-3 border border-white/10 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="bg-cyan-900/50 text-cyan-400 hover:bg-cyan-800/50 h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest border border-cyan-500/30">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : t('search_btn')}
                  </Button>
                </div>
                <p className="text-[8px] text-cyan-400/70 font-bold uppercase tracking-widest text-center mb-6">{t('ai_nutrition_note')}</p>

                <div className="flex-1 border border-white/5 bg-black/20 rounded-2xl flex flex-col items-center justify-center gap-4 text-slate-500 p-8 min-h-[150px]">
                  {isSearching ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                      <p className="text-xs font-medium text-center text-cyan-400/80">{t('analyzing_food')}</p>
                    </div>
                  ) : searchResult ? (
                    <div className="w-full h-full flex flex-col">
                       <h3 className="text-sm font-black text-white capitalize text-center mb-4">{searchResult.name}</h3>
                       
                       <div className="flex items-center gap-3 mb-4">
                         <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{t('amount_g')}</Label>
                         <Input 
                           type="number" 
                           value={consumedGram} 
                           onChange={e => setConsumedGram(e.target.value === "" ? "" : Number(e.target.value))}
                           className="bg-black/40 border-white/10 h-10 rounded-xl text-center focus-visible:ring-cyan-500/50 text-white font-bold"
                         />
                       </div>

                       <div className="grid grid-cols-2 gap-4 flex-1">
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-xl font-black text-cyan-400">{Math.round(searchResult.kcal * (Number(consumedGram) || 0) / 100)}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Kcal</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{Math.round(searchResult.protein * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('protein')}</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{Math.round(searchResult.carbs * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('carbs')}</span>
                          </div>
                          <div className="bg-black/40 rounded-xl border border-white/5 p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-white">{Math.round(searchResult.fat * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('fats')}</span>
                          </div>
                       </div>
                       <Button onClick={() => { 
                           const multiplier = (Number(consumedGram) || 0) / 100;
                           addFoodEntry({
                             name: searchResult.name,
                             kcal: Math.round(searchResult.kcal * multiplier),
                             protein: Math.round(searchResult.protein * multiplier),
                             carbs: Math.round(searchResult.carbs * multiplier),
                             fat: Math.round(searchResult.fat * multiplier)
                           }); 
                           setSearchResult(null); 
                           setSearchQuery(""); 
                         }} className="mt-4 w-full h-10 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 font-bold uppercase tracking-widest text-xs rounded-xl">
                         {t('log_db_item')}
                       </Button>
                    </div>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      <p className="text-xs font-medium text-center">{t('enter_food_ai')}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Food Diary */}
            <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col max-h-[800px] overflow-hidden">
              <div className="flex flex-col items-center mb-6 pt-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                  <Apple className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex items-center w-full justify-center relative">
                  <h2 className="text-lg font-black text-white uppercase tracking-wider italic">{t('metabolic_ledger')}</h2>
                  {diary.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearDiary} className="absolute right-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[10px] uppercase font-bold tracking-widest rounded-lg h-8">
                      {t('clear')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
                {diary.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mt-10">{t('no_entries_today')}</div>
                ) : (
                  diary.map((food, idx) => (
                    <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center group">
                       <div>
                          <div className="text-sm font-black text-white capitalize">{food.name}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                             P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="text-right">
                             <div className="text-lg font-black text-cyan-400">{food.kcal}</div>
                             <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Kcal</div>
                          </div>
                          <button onClick={() => { if (food.id) removeFoodEntry(food.id); }} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="relative mb-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <span className="relative bg-[#111111] px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('manual_entry')}</span>
                </div>
                <div className="space-y-3">
                  <Input value={manualName} onChange={e=>setManualName(e.target.value)} placeholder={t('food_item_placeholder')} className="bg-black/30 border-white/5 h-10 rounded-xl text-xs font-medium text-center placeholder:text-slate-600" />
                  <div className="grid grid-cols-4 gap-2">
                    <Input value={manualPro} onChange={e=>setManualPro(e.target.value)} placeholder={t('protein') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1" />
                    <Input value={manualCarb} onChange={e=>setManualCarb(e.target.value)} placeholder={t('carbs') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1" />
                    <Input value={manualFat} onChange={e=>setManualFat(e.target.value)} placeholder={t('fats') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1" />
                    <Input value={manualKcal} onChange={e=>setManualKcal(e.target.value)} placeholder="Kcal" type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1" />
                  </div>
                </div>

                <Button onClick={handleManualAdd} className="w-full h-10 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold text-xs uppercase tracking-widest rounded-xl mt-4">
                  {t('log_entry')}
                </Button>
              </div>
            </div>

            {/* Column 3: Metrics, Hydration & Motivation */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-orange-400" />
                   </div>
                   <h2 className="text-xs font-black text-white uppercase tracking-wider">{t('todays_motivation')}</h2>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-400 italic">
                    "{quote[language]}"
                  </p>
                  <p className="text-slate-500 font-bold text-xs">
                    — {quote.author}
                  </p>
                </div>
              </div>

              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Droplet className="w-5 h-5 text-blue-400" />
                   </div>
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">{t('hydration_tracker')}</h2>
                </div>
                <div className="flex items-center justify-center mb-6">
                   <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center relative overflow-hidden bg-black/30">
                     <div className="absolute bottom-0 w-full bg-blue-500/30 transition-all duration-1000" style={{ height: `${waterTarget > 0 ? Math.min(100, (waterIntake / waterTarget) * 100) : 0}%` }}>
                       <div className="absolute top-0 w-full h-4 bg-blue-400/40 rounded-[100%] scale-150"></div>
                     </div>
                     <div className="relative z-10 text-center">
                       <span className="text-3xl font-black text-white leading-none">{waterIntake.toFixed(2)}</span>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">/ {waterTarget.toFixed(2)}L</p>
                     </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => logWaterContext(waterIntake - 0.25 < 0 ? -waterIntake : -0.25)} className="h-10 bg-black/40 text-slate-300 border border-white/5 hover:bg-white/10 rounded-xl text-xs">- 250ml</Button>
                  <Button onClick={() => logWaterContext(0.25)} className="h-10 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl text-xs">+ 250ml</Button>
                </div>
              </div>
              
              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                   </div>
                   <h2 className="text-sm font-black text-white uppercase tracking-wider">{t('todays_summary')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">{t('intake')}</p>
                    <p className="text-lg font-black text-white">{consumedKcal} <span className="text-xs font-bold text-slate-400">/{macros.calories}</span></p>
                  </div>
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">{t('protein')}</p>
                    <p className="text-lg font-black text-white">{consumedPro}g <span className="text-xs font-bold text-slate-400">/{macros.protein}g</span></p>
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
                      <h3 className="text-lg font-black text-white uppercase tracking-wider">{t('engine_config')}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('algorithms_desc')}</p>
                   </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('weight_kg')}</Label>
                      <Input type="number" value={weight} onChange={(e) => updateProfile({ weight: Number(e.target.value) })} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('height_cm')}</Label>
                      <Input type="number" value={height} onChange={(e) => updateProfile({ height: Number(e.target.value) })} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('age_label')}</Label>
                      <Input type="number" value={age} onChange={(e) => updateProfile({ age: Number(e.target.value) })} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest group relative flex items-center gap-1">
                         {t('body_fat_pct')} 
                         <span className="text-cyan-400">({t('optional')})</span>
                      </Label>
                      <Input type="number" placeholder="Leave empty for Mifflin" value={bodyFat || ""} onChange={(e) => updateProfile({ bodyFat: Number(e.target.value) })} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('activity_multiplier')}</Label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                         { v: 'Sedentary', l: t('sedentary'), d: "x1.2" }, 
                         { v: 'Lightly Active', l: t('light'), d: "x1.375" }, 
                         { v: 'Moderately Active', l: t('moderate'), d: "x1.55" },
                         { v: 'Very Active', l: t('active_level'), d: "x1.725" },
                      ].map((level) => (
                         <button
                            key={level.v}
                            onClick={() => updateProfile({ activityLevel: level.v })}
                            className={`h-16 rounded-[1.25rem] text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
                               activityLevel === level.v 
                               ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                               : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-black/50'
                            }`}
                         >
                            <span>{level.l}</span>
                            <span className={`text-[10px] ${activityLevel === level.v ? 'text-cyan-400/70' : 'text-slate-600'}`}>{level.d}</span>
                         </button>
                      ))}
                   </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/5">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('protocol_goal')}</Label>
                   <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => updateProfile({ primaryGoal: "Lose Fat" })} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${primaryGoal === "Lose Fat" ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('lose_fat')}</button>
                      <button onClick={() => updateProfile({ primaryGoal: "Maintain" })} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${primaryGoal === "Maintain" ? 'bg-slate-500/20 text-slate-400 border-slate-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('maintain')}</button>
                      <button onClick={() => updateProfile({ primaryGoal: "Build Muscle" })} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${primaryGoal === "Build Muscle" ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('gain_muscle')}</button>
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
                         {macros.calories}
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                         Daily kcal limit
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Protein</span>
                         <span className="text-2xl font-black text-cyan-400 group-hover:scale-105 transition-transform">{macros.protein}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Fat</span>
                         <span className="text-2xl font-black text-orange-400 group-hover:scale-105 transition-transform">{macros.fat}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">Carbs</span>
                         <span className="text-2xl font-black text-indigo-400 group-hover:scale-105 transition-transform">{macros.carbs}g</span>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </TabsContent>
      </Tabs>

      {showScanner && (
        <MealScanner 
          onFoodDetected={(food) => addFoodEntry(food)} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {showRecipeGen && (
        <RecipeGenerator 
          remainingMacros={{
            kcal: Math.max(0, macros.calories - consumedKcal),
            protein: Math.max(0, macros.protein - consumedPro),
            carbs: Math.max(0, macros.carbs - consumedCarb),
            fat: Math.max(0, macros.fat - consumedFat)
          }}
          onClose={() => setShowRecipeGen(false)}
        />
      )}
    </div>
  );
}

