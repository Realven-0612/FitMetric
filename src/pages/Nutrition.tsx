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

  const [showScanner, setShowScanner] = useState(false);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border pb-4">
           <div>
              <h2 className="text-2xl font-black text-foreground px-2 font-heading">{t('nutrition_system')}</h2>
           </div>
           <TabsList className="bg-muted border border-border p-1 rounded-xl">
             <TabsTrigger value="dashboard" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('dashboard')}</TabsTrigger>
             <TabsTrigger value="calculator" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('calculator')}</TabsTrigger>
             <TabsTrigger value="mealprep" className="rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t('mealprep') || 'Meal Prep'}</TabsTrigger>
           </TabsList>
        </div>

        {/* --- DASHBOARD TAB --- */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
            
            {/* Column 1: Smart Nutrition & DB Search */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-500">
                      <Target className="w-5 h-5" />
                   </div>
                   <div>
                      <h2 className="text-xs font-black text-foreground uppercase tracking-widest font-heading">{t('smart_nutrition')}</h2>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{t('realtime_metabolism')}</p>
                   </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-end gap-2">
                      <span className="text-5xl font-black text-foreground leading-none tracking-tight font-heading">{consumedKcal}</span>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('kcal_consumed')}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-xl font-black text-muted-foreground">/ {targetKcal}</span>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">{t('daily_limit')}</p>
                   </div>
                </div>
                <Progress value={(consumedKcal / targetKcal) * 100 || 0} className="h-2 bg-muted mb-6 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-indigo-500 shadow-sm rounded-full" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border flex flex-col justify-center">
                    <div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{t('remaining')}</p>
                      <p className={`text-xl font-black ${remainingKcal < 0 ? 'text-red-500' : 'text-primary'}`}>{remainingKcal} KCAL</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border flex flex-col justify-center space-y-3">
                    {[
                      { n: t('protein'), v: consumedPro, t: targetPro, color: "bg-gradient-to-r from-cyan-400 to-cyan-500" }, 
                      { n: t('carbs'), v: consumedCarbs, t: targetCarbs, color: "bg-gradient-to-r from-yellow-400 to-yellow-500" }, 
                      { n: t('fats'), v: consumedFat, t: targetFat, color: "bg-gradient-to-r from-pink-400 to-pink-500" }
                    ].map(m => (
                      <div key={m.n}>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                          <span className="text-muted-foreground">{m.n}</span>
                          <span className="text-foreground font-bold">{m.v}g <span className="text-muted-foreground font-medium">/ {m.t}g</span></span>
                        </div>
                        <Progress value={(m.v / m.t) * 100 || 0} className={`h-1.5 bg-muted rounded-full overflow-hidden [&>div]:${m.color}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6 flex-1 flex flex-col shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-500">
                      <Utensils className="w-5 h-5" />
                   </div>
                   <h2 className="text-xs font-black text-foreground uppercase tracking-widest font-heading">{t('nutrition_db_search')}</h2>
                </div>

                <div className="flex gap-2.5 mb-4">
                  <div className="relative flex-1">
                    <Input 
                      placeholder={t('search_food_placeholder')} 
                      className="bg-muted border border-border h-11 rounded-xl text-xs pl-10 focus-visible:ring-primary focus-visible:border-primary text-foreground placeholder:text-muted-foreground/60" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-3.5 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <Button 
                    onClick={() => setShowScanner(true)}
                    className="bg-muted border border-border text-foreground hover:bg-muted/80 h-11 rounded-xl px-3.5 transition-all shrink-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="bg-primary/10 text-primary hover:bg-primary/20 h-11 rounded-xl px-6 text-xs font-black uppercase tracking-widest border border-primary/20 transition-all shrink-0">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : t('search_btn')}
                  </Button>
                </div>
                <p className="text-[8px] text-primary/80 font-black uppercase tracking-widest text-center mb-6">{t('ai_nutrition_note')}</p>

                <div className="flex-1 border border-border bg-muted/20 rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground p-8 min-h-[150px]">
                  {isSearching ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-black uppercase tracking-wider text-center text-primary/80">{t('analyzing_food')}</p>
                    </div>
                  ) : searchResult ? (
                    <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
                       <h3 className="text-sm font-black text-foreground capitalize text-center mb-4 font-heading">{searchResult.name}</h3>
                       
                       <div className="flex items-center gap-3 mb-4 bg-muted/40 p-2 rounded-xl border border-border">
                         <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap pl-2">{t('amount_g')}</Label>
                         <Input 
                           type="number" 
                           value={consumedGram} 
                           onChange={e => setConsumedGram(e.target.value === "" ? "" : Number(e.target.value))}
                           className="bg-muted border-border h-9 rounded-lg text-center focus-visible:ring-primary text-foreground font-black text-xs"
                         />
                       </div>

                       <div className="grid grid-cols-2 gap-3 flex-1">
                          <div className="bg-muted/40 rounded-xl border border-border p-3 text-center flex flex-col justify-center">
                            <span className="text-xl font-black text-primary font-heading">{Math.round(searchResult.kcal * (Number(consumedGram) || 0) / 100)}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Kcal</span>
                          </div>
                          <div className="bg-muted/40 rounded-xl border border-border p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-foreground font-heading">{Math.round(searchResult.protein * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest mt-1">{t('protein')}</span>
                          </div>
                          <div className="bg-muted/40 rounded-xl border border-border p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-foreground font-heading">{Math.round(searchResult.carbs * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-1">{t('carbs')}</span>
                          </div>
                          <div className="bg-muted/40 rounded-xl border border-border p-3 text-center flex flex-col justify-center">
                            <span className="text-lg font-black text-foreground font-heading">{Math.round(searchResult.fat * (Number(consumedGram) || 0) / 100)}g</span>
                            <span className="text-[8px] font-bold text-pink-500 uppercase tracking-widest mt-1">{t('fats')}</span>
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
                         }} className="mt-4 w-full h-10 bg-primary/15 text-primary hover:bg-primary/20 border border-primary/20 font-black uppercase tracking-widest text-xs rounded-xl shadow-sm transition-all">
                         {t('log_db_item')}
                       </Button>
                    </div>
                  ) : (
                    <>
                       <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground leading-relaxed max-w-xs">{t('enter_food_ai')}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Food Diary */}
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col max-h-[800px] overflow-hidden shadow-sm">
              <div className="flex flex-col items-center mb-6 pt-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mb-3">
                  <Apple className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex items-center w-full justify-center relative">
                  <h2 className="text-sm font-black text-foreground uppercase tracking-widest italic">{t('metabolic_ledger')}</h2>
                  {diary.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearNutritionDiary} className="absolute right-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 text-[9px] uppercase font-bold tracking-widest rounded-lg h-8 border border-red-500/10">
                      {t('clear')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 mb-4 custom-scrollbar">
                {diary.length === 0 ? (
                  <div className="text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-10">{t('no_entries_today')}</div>
                ) : (
                  (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(mType => {
                    const foods = groupedDiary[mType];
                    const label = t(mType) || mType;
                    const totalKcalForMeal = foods.reduce((s, f) => s + (f.kcal || 0), 0);
                    const icon = mType === 'breakfast' ? '🌅' : mType === 'lunch' ? '☀️' : mType === 'dinner' ? '🌙' : '🍎';
                    
                    return (
                      <div key={mType} className="space-y-2.5">
                        <div className="flex justify-between items-center bg-muted/40 border border-border rounded-2xl px-4 py-2.5">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <span>{icon}</span>
                            <span>{label}</span>
                            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{foods.length} món</span>
                          </span>
                          <span className="text-xs font-black text-cyan-500 uppercase tracking-widest">{totalKcalForMeal} Kcal</span>
                        </div>
                        
                        <div className="space-y-2 pl-2">
                          {foods.length === 0 ? (
                            <div 
                              onClick={() => {
                                setSelectedMealType(mType);
                                toast.info(`Đã chọn ${label}. Hãy nhập thủ công hoặc tìm kiếm ở các ô tương ứng!`);
                              }}
                              className="text-[9px] text-muted-foreground font-black uppercase tracking-widest py-2.5 px-4 border border-dashed border-border rounded-xl hover:border-cyan-500/25 hover:bg-cyan-500/5 cursor-pointer transition-all flex items-center justify-between"
                            >
                              <span>Chưa nạp {label}</span>
                              <span className="text-cyan-500/80 hover:text-cyan-500">+ Ghi nhanh</span>
                            </div>
                          ) : (
                            foods.map((food) => {
                              const diaryIdx = diary.findIndex(x => x.id === food.id);
                              return (
                                <div key={food.id} className="group relative bg-muted/20 border border-border rounded-2xl p-4 flex justify-between items-center transition-all duration-300 hover:bg-muted/40 hover:border-primary/30">
                                   <div>
                                      <div className="text-xs font-black text-foreground capitalize">{food.name}</div>
                                      <div className="flex gap-2 mt-1.5">
                                         <span className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">P: {food.protein}g</span>
                                         <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">C: {food.carbs}g</span>
                                         <span className="text-[8px] font-black text-pink-600 dark:text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded">F: {food.fat}g</span>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <div className="text-right">
                                         <div className="text-sm font-black text-cyan-600 dark:text-cyan-400">{food.kcal}</div>
                                         <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Kcal</div>
                                      </div>
                                      <button 
                                        onClick={() => removeFromDiary(diaryIdx)} 
                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                                      >
                                         <Trash2 className="w-4 h-4" />
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

              <div className="pt-4 border-t border-border">
                <div className="relative mb-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <span className="relative bg-card px-4 text-[9px] text-muted-foreground font-black uppercase tracking-widest">{t('manual_entry')}</span>
                </div>
                
                {/* Meal Type Selector for Manual Entry */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'breakfast', label: t('breakfast') || 'Sáng', emoji: '🌅' },
                    { id: 'lunch', label: t('lunch') || 'Trưa', emoji: '☀️' },
                    { id: 'dinner', label: t('dinner') || 'Tối', emoji: '🌙' },
                    { id: 'snack', label: t('snack') || 'Phụ', emoji: '🍎' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMealType(m.id as any)}
                      className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-300 flex flex-col items-center justify-center gap-0.5 ${
                        selectedMealType === m.id 
                        ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' 
                        : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
                      }`}
                    >
                      <span>{m.emoji} {m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Input value={manualName} onChange={e=>setManualName(e.target.value)} placeholder={t('food_item_placeholder')} className="bg-muted/40 border-border h-11 rounded-xl text-xs font-semibold text-center placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 text-foreground" />
                  <div className="grid grid-cols-4 gap-2">
                    <Input value={manualPro} onChange={e=>setManualPro(e.target.value)} placeholder={t('protein') + " (g)"} type="number" className="bg-muted/40 border-border h-11 rounded-xl text-[10px] font-semibold text-center placeholder:text-muted-foreground/60 px-1 focus-visible:ring-primary/30 text-foreground" />
                    <Input value={manualCarb} onChange={e=>setManualCarb(e.target.value)} placeholder={t('carbs') + " (g)"} type="number" className="bg-muted/40 border-border h-11 rounded-xl text-[10px] font-semibold text-center placeholder:text-muted-foreground/60 px-1 focus-visible:ring-primary/30 text-foreground" />
                    <Input value={manualFat} onChange={e=>setManualFat(e.target.value)} placeholder={t('fats') + " (g)"} type="number" className="bg-muted/40 border-border h-11 rounded-xl text-[10px] font-semibold text-center placeholder:text-muted-foreground/60 px-1 focus-visible:ring-primary/30 text-foreground" />
                    <Input value={manualKcal} onChange={e=>setManualKcal(e.target.value)} placeholder="Kcal" type="number" className="bg-muted/40 border-border h-11 rounded-xl text-[10px] font-semibold text-center placeholder:text-muted-foreground/60 px-1 focus-visible:ring-primary/30 text-foreground" />
                  </div>
                </div>

                <Button onClick={handleManualAdd} className="w-full h-11 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-xs uppercase tracking-widest rounded-xl mt-4 transition-all">
                  {t('log_entry')}
                </Button>
              </div>
            </div>

            {/* Column 3: Metrics, Hydration & Motivation */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                      <Flame className="w-4 h-4" />
                   </div>
                   <h2 className="text-xs font-black text-foreground uppercase tracking-widest">{t('todays_motivation')}</h2>
                </div>
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  "{dailyQuote}"
                </p>
              </div>

              <div className="bg-card rounded-3xl p-6 border border-border flex flex-col shadow-sm">
                <div className="flex items-center justify-between w-full relative mb-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-500">
                         <Droplet className="w-5 h-5" />
                      </div>
                      <h2 className="text-xs font-black text-foreground uppercase tracking-widest">{t('hydration_tracker')}</h2>
                   </div>
                   {waterLiter > 0 && (
                     <Button variant="ghost" size="sm" onClick={resetWater} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-[9px] uppercase font-black tracking-widest rounded-lg h-7 px-2.5 border border-red-500/10">
                       Reset
                     </Button>
                   )}
                </div>
                
                <div className="flex items-center justify-center mb-6">
                   <div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center relative overflow-hidden bg-muted/40 shadow-inner">
                     <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600/40 to-blue-500/20 transition-all duration-1000" style={{ height: `${waterTarget > 0 ? Math.min(100, (waterLiter / waterTarget) * 100) : 0}%` }}>
                       <div className="absolute top-0 w-full h-3 bg-blue-400/30 rounded-[100%] scale-150 animate-pulse"></div>
                     </div>
                     <div className="relative z-10 text-center">
                       <span className="text-3xl font-black text-foreground leading-none tracking-tight">{waterLiter.toFixed(2)}</span>
                       <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">/ {waterTarget.toFixed(2)}L</p>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <Button onClick={() => addWater(0.25)} className="h-14 bg-muted/40 text-muted-foreground border border-border hover:bg-muted hover:border-blue-500/30 rounded-2xl text-[10px] flex flex-col items-center justify-center gap-1 font-black transition-all">
                    <span className="text-sm">🥛</span>
                    <span>250ml</span>
                  </Button>
                  <Button onClick={() => addWater(0.50)} className="h-14 bg-muted/40 text-muted-foreground border border-border hover:bg-muted hover:border-blue-500/30 rounded-2xl text-[10px] flex flex-col items-center justify-center gap-1 font-black transition-all">
                    <span className="text-sm">🧴</span>
                    <span>500ml</span>
                  </Button>
                  <Button onClick={() => addWater(0.75)} className="h-14 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 rounded-2xl text-[10px] flex flex-col items-center justify-center gap-1 font-black transition-all">
                    <span className="text-sm">🥤</span>
                    <span>750ml</span>
                  </Button>
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Input 
                    type="number" 
                    placeholder={t('water_custom') || "Tùy chỉnh (ml)"} 
                    value={customWaterVal}
                    onChange={e => setCustomWaterVal(e.target.value)}
                    className="bg-muted/40 border-border h-10 rounded-xl text-xs text-center focus-visible:ring-blue-500/50 focus-visible:border-blue-500/30 text-foreground font-black"
                  />
                  <Button 
                    onClick={() => {
                      if (!customWaterVal) return;
                      const liters = Number(customWaterVal) / 1000;
                      addWater(liters);
                      setCustomWaterVal("");
                      toast.success(`💧 Đã ghi thêm ${customWaterVal}ml nước`);
                    }}
                    className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border border-blue-500/20 h-10 rounded-xl px-4 text-xs font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    + Nạp
                  </Button>
                </div>
              </div>
              
              <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                   </div>
                   <h2 className="text-xs font-black text-foreground uppercase tracking-widest">{t('todays_summary')}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center justify-center gap-1">{t('intake')}</p>
                    <p className="text-lg font-black text-foreground">{consumedKcal} <span className="text-xs font-bold text-muted-foreground">/{targetKcal}</span></p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 border border-border text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center justify-center gap-1">{t('protein')}</p>
                    <p className="text-lg font-black text-foreground">{consumedPro}g <span className="text-xs font-bold text-muted-foreground">/{targetPro}g</span></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </TabsContent>

        {/* --- CALCULATOR TAB --- */}
        <TabsContent value="calculator" className="space-y-6">
          <Card className="bg-card border-border rounded-[2rem] shadow-sm overflow-hidden xl:grid xl:grid-cols-[1.2fr_1fr]">
             <div className="p-6 lg:p-10 space-y-8 relative">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-xl">
                      <Calculator className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-foreground uppercase tracking-wider">{t('engine_config')}</h3>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('algorithms_desc')}</p>
                   </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('gender_label')}</Label>
                      <div className="grid grid-cols-2 gap-3 h-14">
                        <button onClick={() => setCalcGender('male')} className={`rounded-2xl text-xs font-black uppercase tracking-wider border transition-all duration-300 ${calcGender === 'male' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/50 shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80'}`}>{t('male')}</button>
                        <button onClick={() => setCalcGender('female')} className={`rounded-2xl text-xs font-black uppercase tracking-wider border transition-all duration-300 ${calcGender === 'female' ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/50 shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80'}`}>{t('female')}</button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('weight_kg')}</Label>
                      <Input type="number" value={calcWeight} onChange={(e) => setCalcWeight(e.target.value === "" ? "" : Number(e.target.value))} className="bg-muted/40 border-border h-14 rounded-2xl text-foreground font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('height_cm')}</Label>
                      <Input type="number" value={calcHeight} onChange={(e) => setCalcHeight(e.target.value === "" ? "" : Number(e.target.value))} className="bg-muted/40 border-border h-14 rounded-2xl text-foreground font-black text-lg px-6" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('age_label')}</Label>
                      <Input type="date" value={calcDob} onChange={(e) => setCalcDob(e.target.value)} className="bg-muted/40 border-border h-14 rounded-2xl text-foreground font-black text-sm px-4 dark:[color-scheme:dark]" />
                   </div>
                   <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest group relative flex items-center gap-1">
                         {t('body_fat_pct')} 
                         <span className="text-cyan-500">({t('optional')})</span>
                      </Label>
                      <Input type="number" placeholder="Leave empty for Mifflin" value={calcBodyFat} onChange={(e) => setCalcBodyFat(e.target.value)} className="bg-muted/40 border-border h-14 rounded-2xl text-foreground font-black text-lg px-6" />
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('activity_multiplier')}</Label>
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
                               ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/50 shadow-sm' 
                               : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80 hover:text-foreground hover:bg-muted/80'
                            }`}
                         >
                            <span>{level.l}</span>
                            <span className={`text-[10px] ${calcActivity === level.v ? 'text-cyan-600/70 dark:text-cyan-400/70' : 'text-muted-foreground/60'}`}>{level.d}</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                   <Label className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{t('protocol_goal')}</Label>
                   <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setCalcGoal("lose")} className={`h-14 rounded-[1.25rem] text-xs font-black uppercase tracking-wider border transition-all duration-300 ${calcGoal === "lose" ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50 shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80'}`}>{t('lose_fat')}</button>
                      <button onClick={() => setCalcGoal("maintain")} className={`h-14 rounded-[1.25rem] text-xs font-black uppercase tracking-wider border transition-all duration-300 ${calcGoal === "maintain" ? 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/50 shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80'}`}>{t('maintain')}</button>
                      <button onClick={() => setCalcGoal("gain")} className={`h-14 rounded-[1.25rem] text-xs font-black uppercase tracking-wider border transition-all duration-300 ${calcGoal === "gain" ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-sm' : 'bg-muted/40 text-muted-foreground border-border hover:border-border/80'}`}>{t('gain_muscle')}</button>
                   </div>
                </div>
             </div>

             <div className="bg-muted/20 border-t xl:border-t-0 xl:border-l border-border p-6 lg:p-10 flex flex-col justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 w-full max-w-sm mx-auto">
                   
                   <div className="text-center mb-10">
                      <div className="inline-flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                         <Target className="w-3.5 h-3.5" /> Output Blueprint
                      </div>
                      <div className="text-6xl font-black text-foreground tracking-tight drop-shadow-sm mb-2">
                         {calcResults.targetKcal}
                      </div>
                      <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                         Daily kcal limit
                      </div>
                      
                      <div className="flex justify-center gap-6 mt-6">
                         <div className="text-center">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">BMR</div>
                            <div className="text-base font-bold text-foreground">{calcResults.bmr} <span className="text-[10px] text-muted-foreground">({calcResults.isKatch ? 'Katch' : 'Mifflin'})</span></div>
                         </div>
                         <div className="text-center border-l border-border pl-6">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">TDEE</div>
                            <div className="text-base font-bold text-foreground">{calcResults.tdee}</div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <div className="bg-card border border-border rounded-2xl p-5 flex justify-between items-center group hover:bg-muted/40 transition-colors">
                         <span className="font-bold text-muted-foreground text-sm">{t('protein_label')} <span className="text-[10px] text-muted-foreground/60 ml-2">{t('protein_target')}</span></span>
                         <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">{calcResults.targetPro}g</span>
                      </div>
                      <div className="bg-card border border-border rounded-2xl p-5 flex justify-between items-center group hover:bg-muted/40 transition-colors">
                         <span className="font-bold text-muted-foreground text-sm">{t('fat_label')} <span className="text-[10px] text-muted-foreground/60 ml-2">1.0g/kg</span></span>
                         <span className="text-2xl font-black text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">{calcResults.targetFat}g</span>
                      </div>
                      <div className="bg-card border border-border rounded-2xl p-5 flex justify-between items-center group hover:bg-muted/40 transition-colors">
                         <span className="font-bold text-muted-foreground text-sm">{t('carbs_label')} <span className="text-[10px] text-muted-foreground/60 ml-2">{t('rest')}</span></span>
                         <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">{calcResults.targetCarbs}g</span>
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
                   }} className="w-full mt-8 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-background dark:text-black font-black uppercase tracking-widest text-xs shadow-sm">
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
    </div>
  );
}

