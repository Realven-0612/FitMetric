import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Sparkles, 
  Loader2, 
  Calendar, 
  ShoppingCart, 
  Flame, 
  CheckCircle2, 
  Heart, 
  ChefHat,
  Apple,
  Minus,
  Plus,
  UtensilsCrossed,
  Soup,
  Salad,
  Coffee,
  BookOpen
} from "lucide-react";
import { generateAIContent } from "../lib/ai";
import { useTranslation } from "../lib/i18n";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

/** Một bữa ăn kiểu Việt: cơm + nhiều món */
interface VietnameseMeal {
  /** Tên tóm tắt của bữa (VD: "Phở bò + Xôi") */
  summary: string;
  /** Danh sách các món trong bữa */
  dishes: {
    role: "staple" | "main" | "soup" | "vegetable" | "side" | "drink";
    name: string;
    portion: string;
  }[];
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  note?: string;
}

interface DayPlan {
  dayName: string;
  meals: {
    breakfast: VietnameseMeal;
    lunch: VietnameseMeal;
    dinner: VietnameseMeal;
    snack: VietnameseMeal;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, { vi: string; en: string; icon: string }> = {
  staple:    { vi: "Tinh bột",   en: "Staple",    icon: "🍚" },
  main:      { vi: "Món mặn",    en: "Main dish",  icon: "🍖" },
  soup:      { vi: "Canh / Súp", en: "Soup",       icon: "🥣" },
  vegetable: { vi: "Rau",        en: "Veggies",    icon: "🥬" },
  side:      { vi: "Tráng miệng",en: "Side / Dessert", icon: "🍊" },
  drink:     { vi: "Đồ uống",    en: "Drink",      icon: "🥤" },
};

function roleIcon(role: string) {
  return ROLE_LABEL[role]?.icon ?? "🍽️";
}
function roleLabel(role: string, lang: string) {
  return lang === "vi" ? ROLE_LABEL[role]?.vi ?? role : ROLE_LABEL[role]?.en ?? role;
}

const MEAL_META = {
  breakfast: { icon: "🌅", color: "amber",  vi: "Bữa sáng",       en: "Breakfast" },
  lunch:     { icon: "☀️", color: "cyan",   vi: "Bữa trưa",       en: "Lunch"     },
  dinner:    { icon: "🌙", color: "indigo", vi: "Bữa tối",         en: "Dinner"    },
  snack:     { icon: "🍎", color: "rose",   vi: "Bữa phụ",         en: "Snack"     },
};

const COLOR_MAP: Record<string, string> = {
  amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  cyan:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  rose:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function MealPrepPlanner() {
  const { language } = useTranslation();
  const vi = language === "vi";

  // Reset plan khi đổi ngôn ngữ để tránh hiển thị nội dung sai ngôn ngữ
  const prevLangRef = useRef(language);
  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language;
      setPlan(null);
      setCheckedItems({});
    }
  }, [language]);

  // Demographics
  const [adults,   setAdults]   = useState(1);
  const [teens,    setTeens]    = useState(0);
  const [children, setChildren] = useState(0);
  const [seniors,  setSeniors]  = useState(0);

  // Preferences
  const [dietType,     setDietType]     = useState("standard");
  const [databaseRef,  setDatabaseRef]  = useState("nin");

  const [plan,           setPlan]           = useState<MealPrepPlan | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [activeSubTab,   setActiveSubTab]   = useState<"menu" | "shopping" | "guide">("menu");
  const [checkedItems,   setCheckedItems]   = useState<Record<string, boolean>>({});

  const totalPeople = adults + teens + children + seniors;

  const dbNameMap: Record<string, string> = {
    nin:  "Viện Dinh dưỡng Quốc gia Việt Nam (NIN)",
    usda: "USDA FoodData Central",
    who:  "WHO / FAO Guidelines",
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (totalPeople <= 0) {
      toast.error(vi ? "Cần ít nhất 1 người!" : "At least 1 person required!");
      return;
    }
    setLoading(true);
    setPlan(null);
    setCheckedItems({});

    const dietLabel: Record<string, string> = {
      standard:    vi ? "Cân bằng tiêu chuẩn" : "Standard Balanced",
      highprotein: vi ? "Nhiều đạm" : "High Protein",
      lowcarb:     vi ? "Ít tinh bột / Keto" : "Low Carb / Keto",
      vegetarian:  vi ? "Ăn chay" : "Vegetarian",
    };

    const prompt = `
Bạn là chuyên gia dinh dưỡng và đầu bếp Việt Nam chuyên nghiệp.
Hãy lập thực đơn Meal Prep 1 tuần (Thứ Hai → Chủ Nhật) theo đúng cấu trúc bữa cơm gia đình Việt Nam cho:
- Tổng ${totalPeople} người: ${adults} người lớn, ${teens} thanh thiếu niên, ${children} trẻ em, ${seniors} người cao tuổi
- Chế độ ăn: ${dietLabel[dietType]}
- Cơ sở dữ liệu đối chiếu: ${dbNameMap[databaseRef]}
- Ngôn ngữ đầu ra BẮT BUỘC: ${vi ? "TIẾNG VIỆT HOÀN TOÀN — tuyệt đối không dùng từ tiếng Anh trong name, summary, portion, note, category, items, prepInstructions" : "ENGLISH ONLY — do not use any Vietnamese words in name, summary, portion, note, category, items, prepInstructions"}

NGUYÊN TẮC CẤU TRÚC BỮA ĂN VIỆT:
• Bữa sáng (6–8h): Thường là 1 món ăn nhanh (phở, bún, bánh mì, xôi, cháo, cơm tấm…) + đồ uống
• Bữa trưa & tối (cơm gia đình): BẮT BUỘC gồm: cơm trắng (staple) + 1–2 món mặn (thịt/cá/tôm) + 1 món canh/súp + 1 món rau xào hoặc luộc. Có thể thêm tráng miệng nhẹ (trái cây).
• Bữa phụ: Trái cây, sữa, hạt, bánh nhẹ, sữa chua v.v.

Trả về DUY NHẤT 1 JSON hợp lệ (không markdown, không giải thích):
{
  "weeklyPlan": [
    {
      "dayName": "${vi ? "Thứ Hai" : "Monday"}",
      "meals": {
        "breakfast": {
          "summary": "Phở bò tái + Trà đá",
          "dishes": [
            { "role": "staple", "name": "Bánh phở", "portion": "200g/người (${totalPeople} người = Xkg tổng)" },
            { "role": "main",   "name": "Thịt bò tái", "portion": "80g/người" },
            { "role": "drink",  "name": "Trà đá chanh", "portion": "1 ly/người" }
          ],
          "macros": { "kcal": 1800, "protein": 100, "carbs": 200, "fat": 40 },
          "note": "Sơ chế nước dùng trước 1 ngày"
        },
        "lunch": {
          "summary": "Cơm + Gà kho gừng + Canh bí đỏ + Rau muống xào tỏi",
          "dishes": [
            { "role": "staple",    "name": "Cơm trắng",        "portion": "150g gạo/người" },
            { "role": "main",      "name": "Gà kho gừng",      "portion": "150g thịt gà/người" },
            { "role": "soup",      "name": "Canh bí đỏ nấu tôm", "portion": "200ml/người" },
            { "role": "vegetable", "name": "Rau muống xào tỏi", "portion": "100g/người" }
          ],
          "macros": { "kcal": 2400, "protein": 140, "carbs": 280, "fat": 55 },
          "note": "Có thể nấu canh & kho từ tối hôm trước"
        },
        "dinner": {
          "summary": "Cơm + Cá basa sốt cà + Canh chua + Đậu hũ chiên",
          "dishes": [
            { "role": "staple",    "name": "Cơm trắng",         "portion": "120g gạo/người" },
            { "role": "main",      "name": "Cá basa sốt cà chua", "portion": "150g/người" },
            { "role": "soup",      "name": "Canh chua cá",       "portion": "200ml/người" },
            { "role": "vegetable", "name": "Đậu hũ chiên sả",    "portion": "80g/người" }
          ],
          "macros": { "kcal": 2200, "protein": 130, "carbs": 240, "fat": 50 },
          "note": null
        },
        "snack": {
          "summary": "Sữa chua + Trái cây tươi",
          "dishes": [
            { "role": "side",  "name": "Sữa chua ít đường", "portion": "1 hộp 100g/người" },
            { "role": "side",  "name": "Xoài + chuối",       "portion": "150g/người" }
          ],
          "macros": { "kcal": 600, "protein": 25, "carbs": 90, "fat": 12 },
          "note": null
        }
      }
    }
    ... (đủ 7 ngày, đa dạng món, không lặp)
  ],
  "shoppingList": [
    { "category": "Thịt & Hải sản", "items": ["2kg ức gà phi lê", "1.5kg cá basa", "500g tôm sú"] },
    { "category": "Rau củ",         "items": ["1kg rau muống", "500g bí đỏ", "300g cà chua"] },
    { "category": "Tinh bột",       "items": ["5kg gạo tẻ ngon", "500g bánh phở khô"] },
    { "category": "Sữa & Trứng",    "items": ["12 hộp sữa chua không đường", "10 quả trứng gà"] },
    { "category": "Gia vị & Dầu",   "items": ["Nước mắm Phú Quốc 1 chai", "Dầu ăn 1 lít", "Tỏi hành"] },
    { "category": "Trái cây",       "items": ["3kg chuối", "2kg xoài chín"] }
  ],
  "prepInstructions": [
    "Thứ Bảy hoặc Chủ Nhật: vo gạo, phân chia từng túi gạo theo ngày để tủ lạnh",
    "Nước dùng phở/bún: nấu nồi lớn, chia hộp đông lạnh dùng cả tuần",
    "Thịt/cá: ướp gia vị trước 1 ngày, bảo quản ngăn mát (dùng trong 2 ngày) hoặc ngăn đông (dùng trong tuần)",
    "Rau: rửa sạch, để ráo, bọc khăn ẩm trong hộp kín – giữ tươi 3–4 ngày",
    "Cơm thừa: không để quá 1 ngày trong ngăn mát; hâm nóng đều trước khi ăn"
  ]
}`;

    try {
      const response = await generateAIContent(prompt);
      const text = response.text || response;
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const parsed: MealPrepPlan = JSON.parse(cleanJson);
      setPlan(parsed);
      setSelectedDayIdx(0);
      setActiveSubTab("menu");
      toast.success(vi ? "Đã lập thực đơn 1 tuần theo chuẩn bữa cơm Việt!" : "Weekly meal plan ready!");
    } catch (e) {
      console.error(e);
      toast.error(vi ? "Không thể tạo thực đơn. Vui lòng thử lại." : "Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Stepper ───────────────────────────────────────────────────────────────

  function Stepper({ value, onChange, max = 15 }: { value: number; onChange: (n: number) => void; max?: number }) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-8 w-8 rounded-xl bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shrink-0"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-black text-white w-6 text-center select-none">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-8 w-8 rounded-xl bg-black/60 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // ── Meal card ─────────────────────────────────────────────────────────────

  function MealCard({ mealType, meal }: { mealType: string; meal: VietnameseMeal }) {
    const meta = MEAL_META[mealType as keyof typeof MEAL_META];
    const colorCls = COLOR_MAP[meta?.color ?? "cyan"] ?? COLOR_MAP.cyan;
    const totalMacros = meal.macros.protein + meal.macros.carbs + meal.macros.fat;
    const proPct  = totalMacros > 0 ? (meal.macros.protein / totalMacros) * 100 : 0;
    const carbPct = totalMacros > 0 ? (meal.macros.carbs   / totalMacros) * 100 : 0;
    const fatPct  = totalMacros > 0 ? (meal.macros.fat     / totalMacros) * 100 : 0;

    // Role icons for dish list
    const dishIcon = (role: string) => {
      if (role === "staple")    return <UtensilsCrossed className="w-3 h-3 shrink-0 text-yellow-400" />;
      if (role === "main")      return <Flame className="w-3 h-3 shrink-0 text-orange-400" />;
      if (role === "soup")      return <Soup className="w-3 h-3 shrink-0 text-cyan-400" />;
      if (role === "vegetable") return <Salad className="w-3 h-3 shrink-0 text-emerald-400" />;
      if (role === "drink")     return <Coffee className="w-3 h-3 shrink-0 text-amber-400" />;
      return <Apple className="w-3 h-3 shrink-0 text-rose-400" />;
    };

    return (
      <div className="group relative bg-gradient-to-br from-[#1a1a2e]/60 to-[#0e0e1a]/80 backdrop-blur-md border border-white/5 rounded-3xl p-5 hover:border-purple-500/20 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)] transition-all duration-300 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border ${colorCls}`}>
            <span>{meta?.icon}</span>
            <span>{vi ? meta?.vi : meta?.en}</span>
          </span>
          <span className="text-[10px] font-black text-slate-500 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/5">
            {meal.macros.kcal.toLocaleString()} kcal
          </span>
        </div>

        {/* Summary */}
        <div>
          <h5 className="text-sm font-black text-white leading-snug group-hover:text-purple-200 transition-colors line-clamp-2">
            {meal.summary}
          </h5>
          {meal.note && (
            <p className="text-[10px] text-purple-400/70 italic mt-1 font-medium">
              💡 {meal.note}
            </p>
          )}
        </div>

        {/* Dish list */}
        <ul className="space-y-1.5">
          {(meal.dishes ?? []).map((dish, i) => (
            <li key={i} className="flex items-start gap-2">
              {dishIcon(dish.role)}
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-200 leading-snug">{dish.name}</span>
                <span className="text-[10px] text-slate-500 ml-1.5 font-medium">{dish.portion}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Macro bar */}
        {totalMacros > 0 && (
          <div className="space-y-2 pt-3 border-t border-white/[0.05]">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
              <div style={{ width: `${proPct}%`  }} className="h-full bg-cyan-400 rounded-full" />
              <div style={{ width: `${carbPct}%` }} className="h-full bg-yellow-400 rounded-full" />
              <div style={{ width: `${fatPct}%`  }} className="h-full bg-pink-400 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <span className="text-[11px] font-black text-cyan-400 block">{meal.macros.protein}g</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "Đạm" : "Protein"}</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-black text-yellow-400 block">{meal.macros.carbs}g</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "Tinh bột" : "Carbs"}</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-black text-pink-400 block">{meal.macros.fat}g</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "Béo" : "Fat"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Config card ─────────────────────────────────────────────────── */}
      <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {vi ? "Lập thực đơn 1 tuần" : "Weekly Meal Prep Planner"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {vi ? "Theo chuẩn bữa cơm gia đình Việt • Tính cho cả nhóm" : "Vietnamese family-style • Scaled for your group"}
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full lg:w-auto h-12 bg-purple-500 hover:bg-purple-400 text-black font-black uppercase text-xs tracking-widest px-8 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all shrink-0"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{vi ? "Đang lập thực đơn…" : "Planning…"}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{vi ? "Lập thực đơn" : "Generate Plan"}</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Demographics */}
          <div className="md:col-span-2 bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {vi ? "Thành viên gia đình / nhóm" : "Group Members"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                { label: vi ? "Người lớn" : "Adults",   value: adults,   set: setAdults },
                { label: vi ? "Thanh thiếu niên" : "Teens",    value: teens,    set: setTeens },
                { label: vi ? "Trẻ em" : "Children", value: children, set: setChildren },
                { label: vi ? "Cao tuổi" : "Seniors",  value: seniors,  set: setSeniors },
              ] as const).map(({ label, value, set }) => (
                <div key={label} className="bg-black/40 border border-white/5 p-3 rounded-2xl flex flex-col items-center">
                  <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center leading-tight">{label}</Label>
                  <Stepper value={value} onChange={set} />
                </div>
              ))}
            </div>
            {/* Total badge */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{vi ? "Tổng cộng:" : "Total:"}</span>
              <span className="text-xs font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 rounded-full">
                {totalPeople} {vi ? "người" : "people"}
              </span>
            </div>
          </div>

          {/* Diet & DB */}
          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              {vi ? "Chế độ ăn & Nguồn tham chiếu" : "Diet & Reference"}
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {vi ? "Chế độ ăn" : "Diet type"}
                </Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue>
                      {dietType === "standard"    && (vi ? "Cân bằng tiêu chuẩn" : "Standard Balanced")}
                      {dietType === "highprotein" && (vi ? "Nhiều đạm"            : "High Protein")}
                      {dietType === "lowcarb"     && (vi ? "Ít tinh bột / Keto"  : "Low Carb / Keto")}
                      {dietType === "vegetarian"  && (vi ? "Ăn chay"             : "Vegetarian")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="standard"   >{vi ? "Cân bằng tiêu chuẩn" : "Standard Balanced"}</SelectItem>
                    <SelectItem value="highprotein">{vi ? "Nhiều đạm"            : "High Protein"}</SelectItem>
                    <SelectItem value="lowcarb"    >{vi ? "Ít tinh bột / Keto"  : "Low Carb / Keto"}</SelectItem>
                    <SelectItem value="vegetarian" >{vi ? "Ăn chay"             : "Vegetarian"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {vi ? "Nguồn dữ liệu dinh dưỡng" : "Nutrition database"}
                </Label>
                <Select value={databaseRef} onValueChange={setDatabaseRef}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue>
                      {databaseRef === "nin"  && "Viện Dinh dưỡng Quốc gia (NIN) 🇻🇳"}
                      {databaseRef === "usda" && "USDA FoodData Central 🇺🇸"}
                      {databaseRef === "who"  && "WHO / FAO Guidelines 🌐"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="nin" >Viện Dinh dưỡng Quốc gia (NIN) 🇻🇳</SelectItem>
                    <SelectItem value="usda">USDA FoodData Central 🇺🇸</SelectItem>
                    <SelectItem value="who" >WHO / FAO Guidelines 🌐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="relative mb-6">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-ping" />
          </div>
          <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">
            {vi ? "Đang lập thực đơn bữa cơm Việt…" : "Building your Vietnamese meal plan…"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {vi
              ? `Tính toán cơm + món mặn + canh + rau cho ${totalPeople} người theo chuẩn dinh dưỡng ${dbNameMap[databaseRef]}…`
              : `Calculating full Vietnamese meals for ${totalPeople} people against ${dbNameMap[databaseRef]} standards…`}
          </p>
        </Card>
      )}

      {/* ── Plan ─────────────────────────────────────────────────────────── */}
      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 animate-in fade-in duration-500">

          {/* ── Left: tabs + content ─── */}
          <div className="space-y-5">

            {/* Sub-tabs */}
            <div className="flex gap-1.5 bg-[#161622]/80 border border-white/5 p-1.5 rounded-2xl shadow-inner">
              {([
                { id: "menu",     icon: <Calendar   className="w-3.5 h-3.5" />, vi: "Thực đơn hàng ngày",  en: "Daily Menu"   },
                { id: "shopping", icon: <ShoppingCart className="w-3.5 h-3.5" />, vi: "Danh sách đi chợ", en: "Shopping List" },
                { id: "guide",    icon: <BookOpen   className="w-3.5 h-3.5" />, vi: "Hướng dẫn sơ chế",   en: "Prep Guide"   },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                    activeSubTab === tab.id
                      ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{vi ? tab.vi : tab.en}</span>
                </button>
              ))}
            </div>

            {/* ─ MENU TAB ─ */}
            {activeSubTab === "menu" && (
              <div className="space-y-5">
                {/* Day selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {plan.weeklyPlan.map((d, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`relative px-5 h-11 rounded-xl font-black text-[11px] uppercase tracking-widest shrink-0 transition-all duration-300 ${
                        selectedDayIdx === idx
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(168,85,247,0.4)] border border-purple-400/30"
                          : "bg-white/[0.02] text-slate-400 border border-white/5 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {d.dayName}
                      {selectedDayIdx === idx && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Meal cards for selected day */}
                <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                    <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                      <Calendar className="w-3 h-3" />
                      {plan.weeklyPlan[selectedDayIdx].dayName}
                    </div>
                    <h4 className="text-base font-black text-white uppercase tracking-wide">
                      {vi ? "Thực đơn trong ngày" : "Day Menu"}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.entries(plan.weeklyPlan[selectedDayIdx].meals) as [string, VietnameseMeal][]).map(([mealType, meal]) => (
                      <MealCard key={mealType} mealType={mealType} meal={meal} />
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ─ SHOPPING TAB ─ */}
            {activeSubTab === "shopping" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">
                      {vi ? "Danh sách đi chợ cả tuần" : "Weekly Shopping List"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {vi
                        ? `Nguyên liệu cho ${totalPeople} người • 7 ngày`
                        : `Ingredients for ${totalPeople} people • 7 days`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {plan.shoppingList.map((cat, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-[#1a1a2e]/40 to-[#0e0e1a]/60 border border-white/5 rounded-2xl p-5 space-y-3">
                      <h5 className="text-xs font-black text-cyan-400 uppercase tracking-widest pb-2 border-b border-white/5">
                        {cat.category}
                      </h5>
                      <ul className="space-y-1.5">
                        {cat.items.map((item, i) => {
                          const key = `${idx}-${i}`;
                          const checked = !!checkedItems[key];
                          return (
                            <li
                              key={i}
                              onClick={() => setCheckedItems(p => ({ ...p, [key]: !p[key] }))}
                              className={`flex gap-3 items-center text-xs font-medium cursor-pointer py-1.5 px-2.5 rounded-xl hover:bg-white/[0.03] transition-all select-none ${
                                checked ? "text-slate-600 line-through" : "text-slate-300"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                checked ? "bg-purple-500 border-purple-500" : "border-white/20 bg-black/40"
                              }`}>
                                {checked && <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />}
                              </div>
                              <span>{item}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ─ GUIDE TAB ─ */}
            {activeSubTab === "guide" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">
                      {vi ? "Mẹo sơ chế & bảo quản" : "Prep & Storage Tips"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {vi ? "Tiết kiệm thời gian nấu nướng cả tuần" : "Save time cooking all week"}
                    </p>
                  </div>
                </div>
                <div className="relative pl-6 border-l-2 border-white/5 space-y-5 ml-3">
                  {plan.prepInstructions.map((tip, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-[#111] border-2 border-purple-500 flex items-center justify-center text-[10px] font-black text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all group-hover:border-purple-300">
                        {idx + 1}
                      </div>
                      <div className="bg-gradient-to-br from-[#1a1a2e]/40 to-[#0e0e1a]/60 border border-white/5 rounded-2xl p-4 hover:border-purple-500/20 transition-all">
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">{tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ── Right: summary sidebar ─── */}
          <div className="space-y-5">
            <Card className="bg-[#111]/90 border-white/5 rounded-[2rem] p-6 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                <ChefHat className="w-40 h-40 text-purple-400" />
              </div>

              <div className="relative z-10 flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Apple className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">
                    {vi ? "Tổng kế hoạch 1 tuần" : "Weekly Summary"}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {vi ? "Tổng cho cả nhóm" : "Whole group total"}
                  </p>
                </div>
              </div>

              {(() => {
                const sumMacro = (key: keyof VietnameseMeal["macros"]) =>
                  plan.weeklyPlan.reduce((acc, d) =>
                    acc + Object.values(d.meals).reduce((s, m) => s + (m.macros[key] ?? 0), 0), 0);

                const totalKcal  = sumMacro("kcal");
                const totalPro   = sumMacro("protein");
                const totalCarbs = sumMacro("carbs");
                const totalFat   = sumMacro("fat");

                return (
                  <div className="relative z-10 space-y-3">
                    {[
                      { label: vi ? "Tổng năng lượng" : "Total Calories",  value: `${totalKcal.toLocaleString()} kcal`, color: "text-white"      },
                      { label: vi ? "Chất đạm"         : "Protein",         value: `${totalPro.toLocaleString()}g`,       color: "text-cyan-400"   },
                      { label: vi ? "Tinh bột"          : "Carbohydrates",   value: `${totalCarbs.toLocaleString()}g`,     color: "text-yellow-400" },
                      { label: vi ? "Chất béo"          : "Fats",            value: `${totalFat.toLocaleString()}g`,       color: "text-pink-400"   },
                    ].map(row => (
                      <div key={row.label} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">{row.label}</span>
                        <span className={`text-base font-black ${row.color}`}>{row.value}</span>
                      </div>
                    ))}

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 mt-2">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {vi ? "Đã đối chiếu chuẩn dinh dưỡng" : "Nutrition-verified"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {vi
                          ? `Thực đơn được tính theo chuẩn "${dbNameMap[databaseRef]}", điều chỉnh theo nhân khẩu học ${totalPeople} người.`
                          : `Portions calculated against "${dbNameMap[databaseRef]}" guidelines, scaled for ${totalPeople} people.`}
                      </p>
                    </div>

                    {/* Vietnamese meal structure legend */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">
                        {vi ? "Cấu trúc mâm cơm Việt" : "Vietnamese meal structure"}
                      </p>
                      {Object.entries(ROLE_LABEL).map(([role, meta]) => (
                        <div key={role} className="flex items-center gap-2 text-[10px]">
                          <span>{meta.icon}</span>
                          <span className="text-slate-400 font-medium">{vi ? meta.vi : meta.en}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
