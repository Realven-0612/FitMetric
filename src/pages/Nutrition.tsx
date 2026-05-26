import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flame, Utensils, FileText, Info, Calculator, Target, Droplet, Apple, Loader2, Trash2, Camera, Sparkles } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { MealScanner } from "../components/MealScanner";
import { RecipeGenerator } from "../components/RecipeGenerator";
import { MealPrepPlanner } from "../components/MealPrepPlanner";
import { toast } from "sonner";
import { useStore, calculateAge } from "../lib/store";
import { generateAIContent } from "../lib/ai";
import { useNutritionStats } from "../hooks/useNutritionStats";
import { calcNutritionStats } from "../lib/nutritionUtils";
import { getDailyQuote } from "../lib/quotes";

export default function Nutrition() {
  const { t, language } = useTranslation();
  const { 
    profile, 
    nutritionDiary: diary, 
    addNutritionEntry: storeAddEntry, 
    removeNutritionEntry: removeFromDiary,
    clearNutritionDiary,
    waterIntake: waterLiter,
    addWater,
    resetWater,
    setProfile
  } = useStore();

  const dailyQuote = getDailyQuote(language);

  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  });
  const [customWaterVal, setCustomWaterVal] = useState("");

  const getMealCategory = (food: any) => {
    if (food.mealType) return food.mealType;
    if (!food.timestamp) return 'snack';
    const hour = new Date(food.timestamp).getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  };

  const groupedDiary = {
    breakfast: diary.filter(f => getMealCategory(f) === 'breakfast'),
    lunch: diary.filter(f => getMealCategory(f) === 'lunch'),
    dinner: diary.filter(f => getMealCategory(f) === 'dinner'),
    snack: diary.filter(f => getMealCategory(f) === 'snack'),
  };

  const { targetKcal, targetPro, targetCarbs, targetFat, waterTarget, consumedKcal, consumedPro, consumedCarbs, consumedFat, remainingKcal, remainingPro, remainingCarbs, remainingFat } = useNutritionStats();

  const [calcWeight, setCalcWeight] = useState<number | "">(profile?.weight || "");
  const [calcHeight, setCalcHeight] = useState<number | "">(profile?.height || "");
  const [calcDob, setCalcDob] = useState<string>(profile?.dateOfBirth || "");
  const [calcBodyFat, setCalcBodyFat] = useState<string>(profile?.bodyFat?.toString() || "");
  const [calcGender, setCalcGender] = useState<'male' | 'female'>(profile?.gender || "male");
  
  const getCalcActivity = () => {
    if (!profile) return 1.375;
    if (profile.activityLevel === "Sedentary") return 1.2;
    if (profile.activityLevel === "Lightly Active") return 1.375;
    if (profile.activityLevel === "Moderately Active") return 1.55;
    if (profile.activityLevel === "Very Active") return 1.725;
    return 1.375;
  };
  const [calcActivity, setCalcActivity] = useState(getCalcActivity());

  const getCalcGoal = () => {
    if (!profile) return "lose";
    if (profile.primaryGoal?.includes("Fat")) return "lose";
    if (profile.primaryGoal?.includes("Muscle")) return "gain";
    return "maintain";
  };
  const [calcGoal, setCalcGoal] = useState(getCalcGoal());

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [showRecipeGen, setShowRecipeGen] = useState(false);

  // Manual Entry State
  const [manualName, setManualName] = useState("");
  const [manualPro, setManualPro] = useState("");
  const [manualCarb, setManualCarb] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualKcal, setManualKcal] = useState("");

  const addToDiary = (food: {name: string, kcal: number, protein: number, carbs: number, fat: number, mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'}) => {
    storeAddEntry({
      ...food,
      mealType: food.mealType || selectedMealType,
      timestamp: new Date().toISOString()
    });
  };

  const handleManualAdd = () => {
    if (!manualName || (!manualKcal && !manualPro && !manualCarb && !manualFat)) return;
    const food = {
      name: manualName,
      kcal: Number(manualKcal) || 0,
      protein: Number(manualPro) || 0,
      carbs: Number(manualCarb) || 0,
      fat: Number(manualFat) || 0,
      mealType: selectedMealType
    };
    addToDiary(food);
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
      const prompt = `Bạn là một chuyên gia dinh dưỡng. Người dùng muốn tìm thông tin dinh dưỡng cho món ăn/thực phẩm: "${searchQuery}".
      Dựa vào dữ liệu từ Viện Dinh Dưỡng Quốc Gia Việt Nam (viendinhduong.vn) hoặc các nguồn uy tín, hãy cho biết giá trị dinh dưỡng trên 100g.`;

      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          kcal: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" }
        },
        required: ["name", "kcal", "protein", "carbs", "fat"]
      };

      const result = await generateAIContent(prompt, schema);
      setSearchResult(result);
    } catch (e) {
      console.error("Error searching food API", e);
      toast.error("Could not find nutrition info.");
    } finally {
      setIsSearching(false);
    }
  };

  const calcResults = calcNutritionStats(
    Number(calcWeight) || 0,
    Number(calcHeight) || 0,
    calcDob ? calculateAge(calcDob) : (Number(profile?.age) || 0),
    calcGender,
    calcActivity === 1.2 ? "Sedentary" : 
    calcActivity === 1.375 ? "Lightly Active" : 
    calcActivity === 1.55 ? "Moderately Active" : "Very Active",
    calcGoal === "lose" ? "Lose Fat" : 
    calcGoal === "gain" ? "Build Muscle" : "Maintain Weight",
    calcBodyFat ? parseFloat(calcBodyFat) : undefined
  );

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
             <TabsTrigger value="mealprep" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">{t('mealprep') || 'Meal Prep'}</TabsTrigger>
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
                     <span className="text-xl font-bold text-slate-300">/ {targetKcal}</span>
                     <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t('daily_limit')}</p>
                   </div>
                </div>
                <Progress value={(consumedKcal / targetKcal) * 100 || 0} className="h-1.5 bg-white/5 mb-6 [&>div]:bg-white" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('remaining')}</p>
                    <p className="text-xl font-black text-cyan-400 mb-3">{remainingKcal} KCAL</p>
                    <Button 
                      onClick={() => setShowRecipeGen(true)}
                      className="w-full h-8 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-[9px] font-black uppercase tracking-widest rounded-lg border border-purple-500/20"
                    >
                      <Sparkles className="w-3 h-3 mr-2" /> Find Recipe
                    </Button>
                  </div>
                  
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col justify-center space-y-3">
                    {[{n: t('protein'), v: consumedPro, t: targetPro, color: "bg-cyan-400"}, {n: t('carbs'), v: consumedCarbs, t: targetCarbs, color: "bg-indigo-400"}, {n: t('fats'), v: consumedFat, t: targetFat, color: "bg-emerald-400"}].map(m => (
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
                           addToDiary({
                              name: searchResult.name,
                              kcal: Math.round(searchResult.kcal * multiplier),
                              protein: Math.round(searchResult.protein * multiplier),
                              carbs: Math.round(searchResult.carbs * multiplier),
                              fat: Math.round(searchResult.fat * multiplier),
                              mealType: selectedMealType
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
                    <Button variant="ghost" size="sm" onClick={clearNutritionDiary} className="absolute right-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[10px] uppercase font-bold tracking-widest rounded-lg h-8">
                      {t('clear')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 mb-4 custom-scrollbar">
                {diary.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mt-10">{t('no_entries_today')}</div>
                ) : (
                  (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(mType => {
                    const foods = groupedDiary[mType];
                    const label = t(mType) || mType;
                    const totalKcalForMeal = foods.reduce((s, f) => s + (f.kcal || 0), 0);
                    const icon = mType === 'breakfast' ? '🌅' : mType === 'lunch' ? '☀️' : mType === 'dinner' ? '🌙' : '🍎';
                    
                    return (
                      <div key={mType} className="space-y-2">
                        <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl px-4 py-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span>{icon}</span>
                            <span>{label}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{foods.length} món</span>
                          </span>
                          <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{totalKcalForMeal} Kcal</span>
                        </div>
                        
                        <div className="space-y-2 pl-2">
                          {foods.length === 0 ? (
                            <div 
                              onClick={() => {
                                setSelectedMealType(mType);
                                toast.info(`Đã chọn ${label}. Hãy nhập thủ công hoặc tìm kiếm ở các ô tương ứng!`);
                              }}
                              className="text-[10px] text-slate-500/80 font-bold uppercase tracking-widest py-2 px-4 border border-dashed border-white/5 rounded-xl hover:border-cyan-500/20 hover:bg-cyan-500/5 cursor-pointer transition-all flex items-center justify-between"
                            >
                              <span>Chưa nạp {label}</span>
                              <span className="text-cyan-400/80 hover:text-cyan-400">+ Ghi nhanh</span>
                            </div>
                          ) : (
                            foods.map((food) => {
                              const diaryIdx = diary.findIndex(x => x.id === food.id);
                              return (
                                <div key={food.id} className="bg-black/30 border border-white/5 rounded-2xl p-3 flex justify-between items-center group transition-colors hover:bg-black/50">
                                   <div>
                                      <div className="text-xs font-black text-white capitalize">{food.name}</div>
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                         P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <div className="text-right">
                                         <div className="text-sm font-black text-cyan-400">{food.kcal}</div>
                                         <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Kcal</div>
                                      </div>
                                      <button 
                                        onClick={() => removeFromDiary(diaryIdx)} 
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
                                      >
                                         <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                   </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="relative mb-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <span className="relative bg-[#111111] px-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('manual_entry')}</span>
                </div>
                
                {/* Meal Type Selector for Manual Entry */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'breakfast', label: t('breakfast') || 'Sáng' },
                    { id: 'lunch', label: t('lunch') || 'Trưa' },
                    { id: 'dinner', label: t('dinner') || 'Tối' },
                    { id: 'snack', label: t('snack') || 'Phụ' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMealType(m.id as any)}
                      className={`h-9 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        selectedMealType === m.id 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                        : 'bg-black/20 text-slate-500 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Input value={manualName} onChange={e=>setManualName(e.target.value)} placeholder={t('food_item_placeholder')} className="bg-black/30 border-white/5 h-10 rounded-xl text-xs font-medium text-center placeholder:text-slate-600 focus-visible:ring-purple-500/30" />
                  <div className="grid grid-cols-4 gap-2">
                    <Input value={manualPro} onChange={e=>setManualPro(e.target.value)} placeholder={t('protein') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1 focus-visible:ring-purple-500/30" />
                    <Input value={manualCarb} onChange={e=>setManualCarb(e.target.value)} placeholder={t('carbs') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1 focus-visible:ring-purple-500/30" />
                    <Input value={manualFat} onChange={e=>setManualFat(e.target.value)} placeholder={t('fats') + " (g)"} type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1 focus-visible:ring-purple-500/30" />
                    <Input value={manualKcal} onChange={e=>setManualKcal(e.target.value)} placeholder="Kcal" type="number" className="bg-black/30 border-white/5 h-10 rounded-xl text-[10px] font-medium text-center placeholder:text-slate-600 px-1 focus-visible:ring-purple-500/30" />
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
                <p className="text-sm text-slate-400 italic">
                  "{dailyQuote}"
                </p>
              </div>

              <div className="bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col">
                <div className="flex items-center justify-between w-full relative mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                         <Droplet className="w-5 h-5 text-blue-400" />
                      </div>
                      <h2 className="text-sm font-black text-white uppercase tracking-wider">{t('hydration_tracker')}</h2>
                   </div>
                   {waterLiter > 0 && (
                     <Button variant="ghost" size="sm" onClick={resetWater} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[9px] uppercase font-bold tracking-widest rounded-lg h-7 px-2 border border-red-500/10">
                       Reset
                     </Button>
                   )}
                </div>
                
                <div className="flex items-center justify-center mb-6">
                   <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center relative overflow-hidden bg-black/30">
                     <div className="absolute bottom-0 w-full bg-blue-500/30 transition-all duration-1000" style={{ height: `${waterTarget > 0 ? Math.min(100, (waterLiter / waterTarget) * 100) : 0}%` }}>
                       <div className="absolute top-0 w-full h-4 bg-blue-400/40 rounded-[100%] scale-150"></div>
                     </div>
                     <div className="relative z-10 text-center">
                       <span className="text-3xl font-black text-white leading-none">{waterLiter.toFixed(2)}</span>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">/ {waterTarget.toFixed(2)}L</p>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Button onClick={() => addWater(0.25)} className="h-12 bg-black/40 text-slate-300 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] flex flex-col items-center justify-center gap-0.5 font-bold transition-all hover:border-blue-500/30 hover:bg-blue-500/5">
                    <span>🥛 250ml</span>
                  </Button>
                  <Button onClick={() => addWater(0.50)} className="h-12 bg-black/40 text-slate-300 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] flex flex-col items-center justify-center gap-0.5 font-bold transition-all hover:border-blue-500/30 hover:bg-blue-500/5">
                    <span>🧴 500ml</span>
                  </Button>
                  <Button onClick={() => addWater(0.75)} className="h-12 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl text-[10px] flex flex-col items-center justify-center gap-0.5 font-bold transition-all">
                    <span>🥤 750ml</span>
                  </Button>
                </div>

                <div className="flex gap-2 pt-3 border-t border-white/5">
                  <Input 
                    type="number" 
                    placeholder={t('water_custom') || "Tùy chỉnh (ml)"} 
                    value={customWaterVal}
                    onChange={e => setCustomWaterVal(e.target.value)}
                    className="bg-black/30 border-white/10 h-10 rounded-xl text-xs text-center focus-visible:ring-blue-500/50 focus-visible:border-blue-500/30 text-white font-bold"
                  />
                  <Button 
                    onClick={() => {
                      if (!customWaterVal) return;
                      const liters = Number(customWaterVal) / 1000;
                      addWater(liters);
                      setCustomWaterVal("");
                      toast.success(`💧 Đã ghi thêm ${customWaterVal}ml nước`);
                    }}
                    className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    + Nạp
                  </Button>
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
                    <p className="text-lg font-black text-white">{consumedKcal} <span className="text-xs font-bold text-slate-400">/{targetKcal}</span></p>
                  </div>
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5 text-center">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">{t('protein')}</p>
                    <p className="text-lg font-black text-white">{consumedPro}g <span className="text-xs font-bold text-slate-400">/{targetPro}g</span></p>
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
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('gender_label')}</Label>
                      <div className="grid grid-cols-2 gap-2 h-14">
                        <button onClick={() => setCalcGender('male')} className={`rounded-2xl text-xs font-bold border transition-all ${calcGender === 'male' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-slate-400 border-white/5'}`}>{t('male')}</button>
                        <button onClick={() => setCalcGender('female')} className={`rounded-2xl text-xs font-bold border transition-all ${calcGender === 'female' ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'bg-black/30 text-slate-400 border-white/5'}`}>{t('female')}</button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('weight_kg')}</Label>
                      <Input type="number" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value === "" ? "" : Number(e.target.value))} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('height_cm')}</Label>
                      <Input type="number" value={calcHeight} onChange={(e) => setCalcHeight(e.target.value === "" ? "" : Number(e.target.value))} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('age_label')}</Label>
                      <Input type="date" value={calcDob} onChange={(e) => setCalcDob(e.target.value)} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-sm px-4 [color-scheme:dark]" />
                   </div>
                   <div className="space-y-2 sm:col-span-2">
                      <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest group relative flex items-center gap-1">
                         {t('body_fat_pct')} 
                         <span className="text-cyan-400">({t('optional')})</span>
                      </Label>
                      <Input type="number" placeholder="Leave empty for Mifflin" value={calcBodyFat} onChange={(e) => setCalcBodyFat(e.target.value)} className="bg-black/50 border-white/10 h-14 rounded-2xl text-white font-black text-lg px-6" />
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('activity_multiplier')}</Label>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                         { v: 1.2, l: t('sedentary'), d: "x1.2" }, 
                         { v: 1.375, l: t('light'), d: "x1.375" }, 
                         { v: 1.55, l: t('moderate'), d: "x1.55" },
                         { v: 1.725, l: t('active_level'), d: "x1.725" },
                      ].map((level) => (
                         <button
                            key={level.v}
                            onClick={() => setCalcActivity(level.v)}
                            className={`h-16 rounded-[1.25rem] text-xs font-bold border flex flex-col items-center justify-center gap-0.5 transition-all outline-none ${
                               calcActivity === level.v 
                               ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                               : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-black/50'
                            }`}
                         >
                            <span>{level.l}</span>
                            <span className={`text-[10px] ${calcActivity === level.v ? 'text-cyan-400/70' : 'text-slate-600'}`}>{level.d}</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                   <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('protocol_goal')}</Label>
                   <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setCalcGoal("lose")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${calcGoal === "lose" ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('lose_fat')}</button>
                      <button onClick={() => setCalcGoal("maintain")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${calcGoal === "maintain" ? 'bg-slate-500/20 text-slate-400 border-slate-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('maintain')}</button>
                      <button onClick={() => setCalcGoal("gain")} className={`h-14 rounded-[1.25rem] text-xs font-bold border transition-all ${calcGoal === "gain" ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-black/30 text-slate-400 border-white/5 hover:border-white/20'}`}>{t('gain_muscle')}</button>
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
                         {calcResults.targetKcal}
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                         Daily kcal limit
                      </div>
                      
                      <div className="flex justify-center gap-6 mt-6">
                         <div className="text-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">BMR</div>
                            <div className="text-base font-bold text-slate-300">{calcResults.bmr} <span className="text-[10px] text-slate-600">({calcResults.isKatch ? 'Katch' : 'Mifflin'})</span></div>
                         </div>
                         <div className="text-center border-l border-white/10 pl-6">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">TDEE</div>
                            <div className="text-base font-bold text-slate-300">{calcResults.tdee}</div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">{t('protein_label')} <span className="text-[10px] text-slate-600 ml-2">{t('protein_target')}</span></span>
                         <span className="text-2xl font-black text-cyan-400 group-hover:scale-105 transition-transform">{calcResults.targetPro}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">{t('fat_label')} <span className="text-[10px] text-slate-600 ml-2">1.0g/kg</span></span>
                         <span className="text-2xl font-black text-orange-400 group-hover:scale-105 transition-transform">{calcResults.targetFat}g</span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center group hover:bg-black/60 transition-colors">
                         <span className="font-bold text-slate-400 text-sm">{t('carbs_label')} <span className="text-[10px] text-slate-600 ml-2">{t('rest')}</span></span>
                         <span className="text-2xl font-black text-indigo-400 group-hover:scale-105 transition-transform">{calcResults.targetCarbs}g</span>
                      </div>
                   </div>
                   
                   <Button onClick={() => {
                      setProfile({
                        ...profile,
                        weight: Number(calcWeight) || undefined,
                        height: Number(calcHeight) || undefined,
                        dateOfBirth: calcDob || undefined,
                        age: calcDob ? calculateAge(calcDob) : undefined,
                        gender: calcGender,
                        bodyFat: calcBodyFat ? parseFloat(calcBodyFat) : undefined,
                        activityLevel: calcActivity === 1.2 ? "Sedentary" : 
                                       calcActivity === 1.375 ? "Lightly Active" : 
                                       calcActivity === 1.55 ? "Moderately Active" : "Very Active",
                        primaryGoal: calcGoal === "lose" ? "Lose Fat" : 
                                     calcGoal === "gain" ? "Build Muscle" : "Maintain Weight"
                      });
                      toast.success(t('profile_updated_success'));
                   }} className="w-full mt-8 h-14 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      {t('sync_to_app')}
                   </Button>
                </div>
             </div>
          </Card>
        </TabsContent>

        <TabsContent value="mealprep" className="space-y-6">
          <MealPrepPlanner />
        </TabsContent>
      </Tabs>

      {showScanner && (
        <MealScanner 
          onFoodDetected={(food) => addToDiary(food)} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {showRecipeGen && (
        <RecipeGenerator 
          remainingMacros={{
            kcal: remainingKcal,
            protein: remainingPro,
            carbs: remainingCarbs,
            fat: remainingFat
          }}
          onClose={() => setShowRecipeGen(false)}
        />
      )}
    </div>
  );
}

