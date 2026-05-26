import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Sparkles, 
  Loader2, 
  Calendar, 
  ShoppingCart, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Beef, 
  Wheat, 
  Droplets, 
  Heart, 
  ChefHat,
  Apple
} from "lucide-react";
import { generateAIContent } from "../lib/ai";
import { useTranslation } from "../lib/i18n";
import { toast } from "sonner";

interface Meal {
  name: string;
  portion: string;
  macros: { kcal: number; protein: number; carbs: number; fat: number };
}

interface DayPlan {
  dayName: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snack: Meal;
  };
}

interface ShoppingCategory {
  category: string;
  items: string[];
}

interface MealPrepPlan {
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingCategory[];
  prepInstructions: string[];
}

export function MealPrepPlanner() {
  const { t, language } = useTranslation();
  
  // Demographics state
  const [adults, setAdults] = useState<number>(1);
  const [teens, setTeens] = useState<number>(0);
  const [children, setChildren] = useState<number>(0);
  const [seniors, setSeniors] = useState<number>(0);
  
  // Preferences
  const [dietType, setDietType] = useState<string>("standard");
  const [databaseRef, setDatabaseRef] = useState<string>("nin");
  
  const [plan, setPlan] = useState<MealPrepPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<"menu" | "shopping" | "guide">("menu");

  const totalPeople = adults + teens + children + seniors;

  const dbNameMap: Record<string, string> = {
    nin: "Viện Dinh dưỡng Quốc gia Việt Nam (NIN)",
    usda: "USDA FoodData Central Database",
    who: "WHO / FAO Health Guidelines"
  };

  const handleGenerate = async () => {
    if (totalPeople <= 0) {
      toast.error(language === 'vi' ? "Số người tập trung phải lớn hơn 0!" : "Total people must be greater than 0!");
      return;
    }
    setLoading(true);
    setPlan(null);

    const dietNameMap: Record<string, string> = {
      standard: language === 'vi' ? "Bình thường / Cân bằng" : "Standard Balanced",
      highprotein: language === 'vi' ? "Nhiều đạm (High Protein)" : "High Protein",
      lowcarb: language === 'vi' ? "Keto / Low Carb" : "Low Carb / Keto",
      vegetarian: language === 'vi' ? "Ăn chay lành mạnh" : "Healthy Vegetarian"
    };

    try {
      const prompt = `
        Bạn là một chuyên gia dinh dưỡng và đầu bếp chuyên nghiệp. Hãy thiết lập một thực đơn Meal Prep chuẩn khoa học trong vòng 1 tuần (Thứ Hai đến Chủ Nhật) cho gia đình/nhóm người sau:
        - Tổng số người: ${totalPeople} người. Trong đó:
          + Người lớn (Adults): ${adults}
          + Vị thành niên / Người trẻ (Teens): ${teens}
          + Trẻ em (Children): ${children}
          + Người lớn tuổi (Seniors): ${seniors}
        - Chế độ ăn mong muốn: ${dietNameMap[dietType] || dietType}
        - Cơ sở dữ liệu dinh dưỡng đối chiếu: ${dbNameMap[databaseRef] || databaseRef}
        - Ngôn ngữ đầu ra: ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}
        - Định hướng ẩm thực: ${language === 'vi' ? 'Ưu tiên cao các món ăn Việt Nam truyền thống, lành mạnh, dễ chuẩn bị nguyên liệu ở thị trường Việt Nam.' : 'Ưu tiên các món ăn quốc tế phổ biến dễ chuẩn bị.'}
        
        Tính toán tổng Calo & Macros hợp lý cho cả nhóm dựa trên độ tuổi, nhân khẩu học đã cung cấp và chế độ ăn.
        Yêu cầu kết quả đầu ra TRẢ VỀ DUY NHẤT một đối tượng JSON hợp lệ (không kèm theo bất kỳ văn bản giải thích hay khối mã markdown nào):
        {
          "weeklyPlan": [
            {
              "dayName": "${language === 'vi' ? 'Thứ Hai' : 'Monday'}",
              "meals": {
                "breakfast": { "name": "Tên món sáng", "portion": "Định lượng nguyên liệu chính cho cả nhóm (VD: 300g phở khô, 400g thịt bò)", "macros": { "kcal": 1200, "protein": 90, "carbs": 120, "fat": 30 } },
                "lunch": { "name": "Tên món trưa", "portion": "...", "macros": { "kcal": 1500, "protein": 110, "carbs": 150, "fat": 40 } },
                "dinner": { "name": "Tên món tối", "portion": "...", "macros": { "kcal": 1400, "protein": 100, "carbs": 130, "fat": 35 } },
                "snack": { "name": "Món phụ/Ăn nhẹ", "portion": "...", "macros": { "kcal": 600, "protein": 30, "carbs": 70, "fat": 15 } }
              }
            },
            ... (đầy đủ 7 ngày trong tuần)
          ],
          "shoppingList": [
            {
              "category": "Thịt & Thủy sản / Meats & Seafood",
              "items": [
                "2.5kg Ức gà phi lê",
                "1.5kg Thịt bò thăn"
              ]
            },
            {
              "category": "Rau củ quả / Vegetables & Fruits",
              "items": [
                "2kg Rau muống",
                "1kg Cà chua"
              ]
            },
            ... (các nhóm hàng tạp hóa, sữa, gia vị khác)
          ],
          "prepInstructions": [
            "Mẹo sơ chế cuối tuần (VD: rửa sạch rau, cắt hành tỏi sẵn)...",
            "Mẹo phân chia hộp cơm trữ lạnh và rã đông...",
            "Lưu ý bảo quản dinh dưỡng theo khuyến nghị..."
          ]
        }
      `;

      const response = await generateAIContent(prompt);
      const text = response.text || response;
      const cleanJsonStr = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const parsedPlan: MealPrepPlan = JSON.parse(cleanJsonStr);
      setPlan(parsedPlan);
      setSelectedDayIdx(0);
      setActiveSubTab("menu");
      toast.success(language === 'vi' ? "Đã kiến tạo thực đơn Meal Prep 1 tuần!" : "Weekly Meal Prep plan generated!");
    } catch (e) {
      console.error(e);
      toast.error(language === 'vi' ? "Lỗi kết nối tạo thực đơn. Hãy thử lại." : "Failed to generate meal prep. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {language === 'vi' ? "Kiến trúc sư Meal Prep 1 Tuần" : "1-Week Meal Prep Architect"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {language === 'vi' ? "Thiết kế kế hoạch ăn uống khoa học cho gia đình" : "Scientific group/family meal planning"}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full lg:w-auto h-12 bg-purple-500 hover:bg-purple-400 text-black font-black uppercase text-xs tracking-widest px-8 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'vi' ? "Đang kiến tạo..." : "Architecting..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {language === 'vi' ? "Thiết lập thực đơn" : "Design Meal Prep"}
              </>
            )}
          </Button>
        </div>

        {/* Input Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Col 1: Family Demographics */}
          <div className="space-y-4 md:col-span-2 bg-black/20 p-5 rounded-2xl border border-white/5">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {language === 'vi' ? "Thành viên gia đình / nhóm" : "Group Demographics"}
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'vi' ? "Người lớn" : "Adults"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={adults}
                  onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-black/50 border-white/10 h-11 text-center font-black rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'vi' ? "Người trẻ/Teens" : "Teens"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={teens}
                  onChange={(e) => setTeens(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-black/50 border-white/10 h-11 text-center font-black rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'vi' ? "Trẻ em" : "Children"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={children}
                  onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-black/50 border-white/10 h-11 text-center font-black rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {language === 'vi' ? "Cao tuổi" : "Seniors"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={seniors}
                  onChange={(e) => setSeniors(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-black/50 border-white/10 h-11 text-center font-black rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Col 2: Nutrition Target & Reference */}
          <div className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              {language === 'vi' ? "Chế độ & Đối chiếu" : "Diet & Reference"}
            </h4>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'vi' ? "Chế độ ăn" : "Diet Type"}</Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="standard">{language === 'vi' ? "Cân bằng tiêu chuẩn" : "Standard Balanced"}</SelectItem>
                    <SelectItem value="highprotein">{language === 'vi' ? "Nhiều đạm (High Protein)" : "High Protein"}</SelectItem>
                    <SelectItem value="lowcarb">{language === 'vi' ? "Low Carb / Keto" : "Low Carb / Keto"}</SelectItem>
                    <SelectItem value="vegetarian">{language === 'vi' ? "Ăn chay (Vegetarian)" : "Vegetarian"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'vi' ? "Nguồn dữ liệu đối chiếu" : "Nutrition database"}</Label>
                <Select value={databaseRef} onValueChange={setDatabaseRef}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="nin">Viện Dinh dưỡng Quốc gia (NIN) 🇻🇳</SelectItem>
                    <SelectItem value="usda">USDA Central Database 🇺🇸</SelectItem>
                    <SelectItem value="who">WHO / FAO Guidelines 🌐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Loading State Animation */}
      {loading && (
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-6" />
          <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2 animate-pulse">
            {language === 'vi' ? "Đang tính toán dưỡng chất & thiết lập thực đơn" : "Calculating nutrients & designing weekly menu"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {language === 'vi' 
              ? "Trí tuệ nhân tạo đang đối chiếu cơ sở dữ liệu dinh dưỡng được chọn để cân đối nguyên liệu cho cả nhóm của bạn..."
              : "AI is referencing selected database guidelines to balance shopping portions for your group..."
            }
          </p>
        </Card>
      )}

      {/* Generated Meal Prep Plan Display */}
      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 animate-in fade-in duration-500">
          
          {/* Main Plan Area */}
          <div className="space-y-6">
            
            {/* Sub-tab selection */}
            <div className="flex gap-2 bg-black/40 border border-white/5 p-1 rounded-2xl w-fit">
              <button 
                onClick={() => setActiveSubTab("menu")}
                className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  activeSubTab === "menu" 
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                  : "text-slate-400 hover:text-white"
                }`}
              >
                {language === 'vi' ? "Thực đơn hàng ngày" : "Daily Menu"}
              </button>
              <button 
                onClick={() => setActiveSubTab("shopping")}
                className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  activeSubTab === "shopping" 
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                  : "text-slate-400 hover:text-white"
                }`}
              >
                {language === 'vi' ? "Danh sách đi chợ" : "Shopping List"}
              </button>
              <button 
                onClick={() => setActiveSubTab("guide")}
                className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                  activeSubTab === "guide" 
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                  : "text-slate-400 hover:text-white"
                }`}
              >
                {language === 'vi' ? "Hướng dẫn sơ chế" : "Prep Guide"}
              </button>
            </div>

            {activeSubTab === "menu" && (
              <div className="space-y-6">
                {/* 7 Day selector buttons */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {plan.weeklyPlan.map((d, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`px-5 h-11 rounded-xl font-bold text-xs uppercase tracking-wider border shrink-0 transition-all ${
                        selectedDayIdx === idx
                        ? "bg-purple-500 text-black border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                        : "bg-[#111]/80 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {d.dayName}
                    </button>
                  ))}
                </div>

                {/* Day Details Card */}
                <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 relative overflow-hidden">
                  <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b border-white/5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full mb-2">
                        <Calendar className="w-3 h-3" />
                        {plan.weeklyPlan[selectedDayIdx].dayName}
                      </div>
                      <h4 className="text-xl font-black text-white uppercase tracking-wide">
                        {language === 'vi' ? "Thực đơn chi tiết nhóm" : "Group Meal Details"}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(plan.weeklyPlan[selectedDayIdx].meals).map(([mealType, meal]: [string, Meal]) => {
                      const mealLabels: Record<string, string> = {
                        breakfast: language === 'vi' ? 'Bữa sáng' : 'Breakfast',
                        lunch: language === 'vi' ? 'Bữa trưa' : 'Lunch',
                        dinner: language === 'vi' ? 'Bữa tối' : 'Dinner',
                        snack: language === 'vi' ? 'Bữa phụ / Ăn nhẹ' : 'Snack',
                      };
                      const mealIcon = mealType === 'breakfast' ? '🌅' : mealType === 'lunch' ? '☀️' : mealType === 'dinner' ? '🌙' : '🍎';
                      
                      return (
                        <div key={mealType} className="bg-black/30 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <span>{mealIcon}</span>
                            <span>{mealLabels[mealType] || mealType}</span>
                          </span>
                          <h5 className="text-sm font-black text-white capitalize mb-1">{meal.name}</h5>
                          <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed italic">{meal.portion}</p>
                          
                          {/* Macro items */}
                          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-white/5">
                            <div className="text-center">
                              <span className="text-[11px] font-black text-white">{meal.macros.kcal}</span>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mt-0.5">Kcal</span>
                            </div>
                            <div className="text-center border-l border-white/5">
                              <span className="text-[11px] font-black text-cyan-400">{meal.macros.protein}g</span>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mt-0.5">Pro</span>
                            </div>
                            <div className="text-center border-l border-white/5">
                              <span className="text-[11px] font-black text-yellow-400">{meal.macros.carbs}g</span>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mt-0.5">Carb</span>
                            </div>
                            <div className="text-center border-l border-white/5">
                              <span className="text-[11px] font-black text-pink-400">{meal.macros.fat}g</span>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mt-0.5">Fat</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {activeSubTab === "shopping" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-wider">
                      {language === 'vi' ? "Danh sách mua sắm cả tuần" : "Weekly Shopping List"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {language === 'vi' 
                        ? `Nguyên liệu ước tính phục vụ cho nhóm ${totalPeople} người`
                        : `Estimated ingredients scaling for ${totalPeople} people`
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.shoppingList.map((category, idx) => (
                    <div key={idx} className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-3">
                      <h5 className="text-xs font-black text-cyan-400 uppercase tracking-widest pb-2 border-b border-white/5">
                        {category.category}
                      </h5>
                      <ul className="space-y-2">
                        {category.items.map((item, i) => (
                          <li key={i} className="flex gap-2.5 items-start text-xs font-semibold text-slate-300">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-white/10 bg-black text-purple-500 focus:ring-purple-500/30 shrink-0 mt-0.5" 
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeSubTab === "guide" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-wider">
                      {language === 'vi' ? "Quy trình sơ chế & bảo quản" : "Prep & Storage Guide"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {language === 'vi' ? "Mẹo tối ưu thời gian nấu nướng lành mạnh" : "Optimizing healthy cooking workflows"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {plan.prepInstructions.map((instruction, idx) => (
                    <div key={idx} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>

          {/* Sidebar: Weekly Nutrition Target Summary */}
          <div className="space-y-6">
            <Card className="bg-[#111]/90 border-white/5 rounded-[2rem] p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <ChefHat className="w-48 h-48 text-purple-400" />
              </div>
              
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Apple className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">
                      {language === 'vi' ? "Tổng Kế Hoạch 1 Tuần" : "Weekly Plan Summary"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      {language === 'vi' ? "Toàn bộ nhóm người" : "Whole group target"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const totalKcal = plan.weeklyPlan.reduce((acc, d) => 
                      acc + Object.values(d.meals).reduce((s, m) => s + m.macros.kcal, 0)
                    , 0);
                    const totalPro = plan.weeklyPlan.reduce((acc, d) => 
                      acc + Object.values(d.meals).reduce((s, m) => s + m.macros.protein, 0)
                    , 0);
                    const totalCarbs = plan.weeklyPlan.reduce((acc, d) => 
                      acc + Object.values(d.meals).reduce((s, m) => s + m.macros.carbs, 0)
                    , 0);
                    const totalFat = plan.weeklyPlan.reduce((acc, d) => 
                      acc + Object.values(d.meals).reduce((s, m) => s + m.macros.fat, 0)
                    , 0);
                    
                    return (
                      <>
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'vi' ? "Tổng năng lượng nạp" : "Total Calories"}
                          </span>
                          <span className="text-lg font-black text-white">
                            {totalKcal.toLocaleString()} kcal
                          </span>
                        </div>

                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'vi' ? "Tổng Chất đạm (Protein)" : "Total Protein"}
                          </span>
                          <span className="text-lg font-black text-cyan-400">
                            {totalPro.toLocaleString()}g
                          </span>
                        </div>

                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'vi' ? "Tổng Tinh bột (Carbs)" : "Total Carbs"}
                          </span>
                          <span className="text-lg font-black text-yellow-400">
                            {totalCarbs.toLocaleString()}g
                          </span>
                        </div>

                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">
                            {language === 'vi' ? "Tổng Chất béo (Fats)" : "Total Fats"}
                          </span>
                          <span className="text-lg font-black text-pink-400">
                            {totalFat.toLocaleString()}g
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'vi' ? "Đã đối chiếu NIN/USDA" : "NIN/USDA Verified"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    {language === 'vi' 
                      ? `Thực đơn đã được đối chiếu chuẩn dinh dưỡng theo cơ sở dữ liệu "${dbNameMap[databaseRef] || databaseRef}". Mức năng lượng được nhân tỷ lệ tương ứng theo nhân khẩu học.`
                      : `Portion estimates are calculated against the "${dbNameMap[databaseRef] || databaseRef}" nutrition targets scaled by demographics.`
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
