import { useState, useRef, useEffect } from "react";
import { AI_MODELS } from "../lib/aiModels";
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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Má»™t bá»¯a Äƒn kiá»ƒu Viá»‡t: cÆ¡m + nhiá»u mÃ³n */
interface VietnameseMeal {
  /** TÃªn tÃ³m táº¯t cá»§a bá»¯a (VD: "Phá»Ÿ bÃ² + XÃ´i") */
  summary: string;
  /** Danh sÃ¡ch cÃ¡c mÃ³n trong bá»¯a */
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROLE_LABEL: Record<string, { vi: string; en: string; icon: string }> = {
  staple:    { vi: "Tinh bá»™t",   en: "Staple",    icon: "ðŸš" },
  main:      { vi: "MÃ³n máº·n",    en: "Main dish",  icon: "ðŸ–" },
  soup:      { vi: "Canh / SÃºp", en: "Soup",       icon: "ðŸ¥£" },
  vegetable: { vi: "Rau",        en: "Veggies",    icon: "ðŸ¥¬" },
  side:      { vi: "TrÃ¡ng miá»‡ng",en: "Side / Dessert", icon: "ðŸŠ" },
  drink:     { vi: "Äá»“ uá»‘ng",    en: "Drink",      icon: "ðŸ¥¤" },
};

function roleIcon(role: string) {
  return ROLE_LABEL[role]?.icon ?? "ðŸ½ï¸";
}
function roleLabel(role: string, lang: string) {
  return lang === "vi" ? ROLE_LABEL[role]?.vi ?? role : ROLE_LABEL[role]?.en ?? role;
}

const MEAL_META = {
  breakfast: { icon: "ðŸŒ…", color: "amber",  vi: "Bá»¯a sÃ¡ng",       en: "Breakfast" },
  lunch:     { icon: "â˜€ï¸", color: "cyan",   vi: "Bá»¯a trÆ°a",       en: "Lunch"     },
  dinner:    { icon: "ðŸŒ™", color: "indigo", vi: "Bá»¯a tá»‘i",         en: "Dinner"    },
  snack:     { icon: "ðŸŽ", color: "rose",   vi: "Bá»¯a phá»¥",         en: "Snack"     },
};

const COLOR_MAP: Record<string, string> = {
  amber:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  cyan:   "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  rose:   "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function MealPrepPlanner() {
  const { language } = useTranslation();
  const vi = language === "vi";

  // Reset plan khi Ä‘á»•i ngÃ´n ngá»¯ Ä‘á»ƒ trÃ¡nh hiá»ƒn thá»‹ ná»™i dung sai ngÃ´n ngá»¯
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
    nin:  "Viá»‡n Dinh dÆ°á»¡ng Quá»‘c gia Viá»‡t Nam (NIN)",
    usda: "USDA FoodData Central",
    who:  "WHO / FAO Guidelines",
  };

  // â”€â”€ Generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleGenerate = async () => {
    if (totalPeople <= 0) {
      toast.error(vi ? "Can it nhat 1 nguoi!" : "At least 1 person required!");
      return;
    }
    setLoading(true);
    setPlan(null);
    setCheckedItems({});

    const dietLabel: Record<string, string> = {
      standard:    vi ? "Can bang tieu chuan" : "Standard Balanced",
      highprotein: vi ? "Nhieu dam" : "High Protein",
      lowcarb:     vi ? "It tinh bot / Keto" : "Low Carb / Keto",
      vegetarian:  vi ? "An chay" : "Vegetarian",
    };

    const dayNames = vi
      ? ["Thu Hai", "Thu Ba", "Thu Tu", "Thu Nam", "Thu Sau", "Thu Bay", "Chu Nhat"]
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const langVI = vi;
    const eatSchema = (a: string, b: string) =>
      `{"summary":"${a}","dishes":[{"role":"staple","name":"${a}","portion":"${b}"}],"macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"note":""}`;

    // Build a compact prompt for ONE meal-pair (morning+snack OR lunch+dinner)
    const makeMealPrompt = (
      dayName: string,
      pair: "morning" | "maindishes",
      dayIndex: number
    ) => {
      const ctx = `People:${totalPeople}(${adults}A,${teens}T,${children}C,${seniors}S) Diet:${dietLabel[dietType]} Lang:${langVI ? "VI" : "EN"} Day${dayIndex + 1}`;
      if (pair === "morning") {
        return (
          `Vietnamese nutritionist. ${ctx}.` +
          ` Output ONLY compact JSON, no markdown, no trailing commas.` +
          ` Generate breakfast+snack for "${dayName}".` +
          ` breakfast: 1 quick dish(pho/banh mi/xoi/chao/com tam) + drink. snack: fruit/yogurt/nuts.` +
          ` Portions=total for all ${totalPeople} people. Keep names short.` +
          ` Return: {"breakfast":{"summary":"X","dishes":[{"role":"staple","name":"X","portion":"X"},{"role":"main","name":"X","portion":"X"},{"role":"drink","name":"X","portion":"X"}],"macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"note":""},"snack":{"summary":"X","dishes":[{"role":"side","name":"X","portion":"X"}],"macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"note":""}}`
        );
      } else {
        return (
          `Vietnamese nutritionist. ${ctx}.` +
          ` Output ONLY compact JSON, no markdown, no trailing commas.` +
          ` Generate lunch+dinner for "${dayName}".` +
          ` Both meals: com trang(staple)+meat/fish(main)+soup+vegetable. Portions=total for ${totalPeople} people. Keep names short.` +
          ` Return: {"lunch":{"summary":"X","dishes":[{"role":"staple","name":"X","portion":"X"},{"role":"main","name":"X","portion":"X"},{"role":"soup","name":"X","portion":"X"},{"role":"vegetable","name":"X","portion":"X"}],"macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"note":""},"dinner":{"summary":"X","dishes":[{"role":"staple","name":"X","portion":"X"},{"role":"main","name":"X","portion":"X"},{"role":"soup","name":"X","portion":"X"},{"role":"vegetable","name":"X","portion":"X"}],"macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"note":""}}`
        );
      }
    };

    const shoppingPrompt =
      `Vietnamese shopping list for ${totalPeople} people, ${dietLabel[dietType]} diet, ${langVI ? "Vietnamese" : "English"} language. ` +
      `Return ONLY JSON no markdown: {"shoppingList":[{"category":"X","items":["X","X"]},{"category":"X","items":["X","X"]},{"category":"X","items":["X","X"]},{"category":"X","items":["X","X"]},{"category":"X","items":["X","X"]}],"prepInstructions":["X","X","X","X"]}`;

    const parseClean = (res: unknown): unknown => {
      const text = ((res as {text?: string}).text || res) as string;
      let clean = text.replace(/```json|```/g, "").trim();
      clean = clean.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(clean);
    };

    try {
      // Use Gemini Flash for Meal Prep — it has a larger output window than Cerebras/llama
      const MEAL_MODEL = AI_MODELS.GEMINI_FLASH_LITE;
      const calls = [
        generateAIContent(shoppingPrompt, undefined, MEAL_MODEL),
        ...dayNames.map((d, i) => generateAIContent(makeMealPrompt(d, "morning", i), undefined, MEAL_MODEL)),
        ...dayNames.map((d, i) => generateAIContent(makeMealPrompt(d, "maindishes", i), undefined, MEAL_MODEL)),
      ];

      const results = await Promise.all(calls);
      const [shoppingResult, ...rest] = results;
      const morningResults = rest.slice(0, 7);
      const mainResults   = rest.slice(7, 14);

      const weeklyPlan: DayPlan[] = dayNames.map((dayName, i) => {
        const morning = parseClean(morningResults[i]) as {breakfast: VietnameseMeal; snack: VietnameseMeal};
        const main    = parseClean(mainResults[i])    as {lunch: VietnameseMeal; dinner: VietnameseMeal};
        return {
          dayName,
          meals: {
            breakfast: morning.breakfast,
            lunch:     main.lunch,
            dinner:    main.dinner,
            snack:     morning.snack,
          },
        };
      });

      const shoppingData = parseClean(shoppingResult) as {shoppingList: ShoppingCategory[]; prepInstructions: string[]};

      setPlan({
        weeklyPlan,
        shoppingList:     shoppingData.shoppingList    ?? [],
        prepInstructions: shoppingData.prepInstructions ?? [],
      });
      setSelectedDayIdx(0);
      setActiveSubTab("menu");
      toast.success(vi ? "Da lap thuc don 1 tuan theo chuan bua com Viet!" : "Weekly meal plan ready!");
    } catch (e) {
      console.error(e);
      toast.error(vi ? "Khong the tao thuc don. Vui long thu lai." : "Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  // â”€â”€ Stepper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Meal card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
              ðŸ’¡ {meal.note}
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
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "Äáº¡m" : "Protein"}</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-black text-yellow-400 block">{meal.macros.carbs}g</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "Tinh bá»™t" : "Carbs"}</span>
              </div>
              <div className="text-center">
                <span className="text-[11px] font-black text-pink-400 block">{meal.macros.fat}g</span>
                <span className="text-[8px] text-slate-600 uppercase font-bold">{vi ? "BÃ©o" : "Fat"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-6">

      {/* â”€â”€ Config card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/20">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                {vi ? "Láº­p thá»±c Ä‘Æ¡n 1 tuáº§n" : "Weekly Meal Prep Planner"}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                {vi ? "Theo chuáº©n bá»¯a cÆ¡m gia Ä‘Ã¬nh Viá»‡t â€¢ TÃ­nh cho cáº£ nhÃ³m" : "Vietnamese family-style â€¢ Scaled for your group"}
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full lg:w-auto h-12 bg-purple-500 hover:bg-purple-400 text-black font-black uppercase text-xs tracking-widest px-8 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all shrink-0"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{vi ? "Äang láº­p thá»±c Ä‘Æ¡nâ€¦" : "Planningâ€¦"}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{vi ? "Láº­p thá»±c Ä‘Æ¡n" : "Generate Plan"}</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Demographics */}
          <div className="md:col-span-2 bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {vi ? "ThÃ nh viÃªn gia Ä‘Ã¬nh / nhÃ³m" : "Group Members"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                { label: vi ? "NgÆ°á»i lá»›n" : "Adults",   value: adults,   set: setAdults },
                { label: vi ? "Thanh thiáº¿u niÃªn" : "Teens",    value: teens,    set: setTeens },
                { label: vi ? "Tráº» em" : "Children", value: children, set: setChildren },
                { label: vi ? "Cao tuá»•i" : "Seniors",  value: seniors,  set: setSeniors },
              ] as const).map(({ label, value, set }) => (
                <div key={label} className="bg-black/40 border border-white/5 p-3 rounded-2xl flex flex-col items-center">
                  <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center leading-tight">{label}</Label>
                  <Stepper value={value} onChange={set} />
                </div>
              ))}
            </div>
            {/* Total badge */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{vi ? "Tá»•ng cá»™ng:" : "Total:"}</span>
              <span className="text-xs font-black text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-0.5 rounded-full">
                {totalPeople} {vi ? "ngÆ°á»i" : "people"}
              </span>
            </div>
          </div>

          {/* Diet & DB */}
          <div className="bg-black/20 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              {vi ? "Cháº¿ Ä‘á»™ Äƒn & Nguá»“n tham chiáº¿u" : "Diet & Reference"}
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {vi ? "Cháº¿ Ä‘á»™ Äƒn" : "Diet type"}
                </Label>
                <Select value={dietType} onValueChange={setDietType}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue>
                      {dietType === "standard"    && (vi ? "CÃ¢n báº±ng tiÃªu chuáº©n" : "Standard Balanced")}
                      {dietType === "highprotein" && (vi ? "Nhiá»u Ä‘áº¡m"            : "High Protein")}
                      {dietType === "lowcarb"     && (vi ? "Ãt tinh bá»™t / Keto"  : "Low Carb / Keto")}
                      {dietType === "vegetarian"  && (vi ? "Ä‚n chay"             : "Vegetarian")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="standard"   >{vi ? "CÃ¢n báº±ng tiÃªu chuáº©n" : "Standard Balanced"}</SelectItem>
                    <SelectItem value="highprotein">{vi ? "Nhiá»u Ä‘áº¡m"            : "High Protein"}</SelectItem>
                    <SelectItem value="lowcarb"    >{vi ? "Ãt tinh bá»™t / Keto"  : "Low Carb / Keto"}</SelectItem>
                    <SelectItem value="vegetarian" >{vi ? "Ä‚n chay"             : "Vegetarian"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {vi ? "Nguá»“n dá»¯ liá»‡u dinh dÆ°á»¡ng" : "Nutrition database"}
                </Label>
                <Select value={databaseRef} onValueChange={setDatabaseRef}>
                  <SelectTrigger className="bg-black/50 border-white/10 h-10 rounded-xl text-xs font-semibold text-white">
                    <SelectValue>
                      {databaseRef === "nin"  && "Viá»‡n Dinh dÆ°á»¡ng Quá»‘c gia (NIN) ðŸ‡»ðŸ‡³"}
                      {databaseRef === "usda" && "USDA FoodData Central ðŸ‡ºðŸ‡¸"}
                      {databaseRef === "who"  && "WHO / FAO Guidelines ðŸŒ"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                    <SelectItem value="nin" >Viá»‡n Dinh dÆ°á»¡ng Quá»‘c gia (NIN) ðŸ‡»ðŸ‡³</SelectItem>
                    <SelectItem value="usda">USDA FoodData Central ðŸ‡ºðŸ‡¸</SelectItem>
                    <SelectItem value="who" >WHO / FAO Guidelines ðŸŒ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading && (
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="relative mb-6">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-ping" />
          </div>
          <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">
            {vi ? "Äang láº­p thá»±c Ä‘Æ¡n bá»¯a cÆ¡m Viá»‡tâ€¦" : "Building your Vietnamese meal planâ€¦"}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            {vi
              ? `TÃ­nh toÃ¡n cÆ¡m + mÃ³n máº·n + canh + rau cho ${totalPeople} ngÆ°á»i theo chuáº©n dinh dÆ°á»¡ng ${dbNameMap[databaseRef]}â€¦`
              : `Calculating full Vietnamese meals for ${totalPeople} people against ${dbNameMap[databaseRef]} standardsâ€¦`}
          </p>
        </Card>
      )}

      {/* â”€â”€ Plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 animate-in fade-in duration-500">

          {/* â”€â”€ Left: tabs + content â”€â”€â”€ */}
          <div className="space-y-5">

            {/* Sub-tabs */}
            <div className="flex gap-1.5 bg-[#161622]/80 border border-white/5 p-1.5 rounded-2xl shadow-inner">
              {([
                { id: "menu",     icon: <Calendar   className="w-3.5 h-3.5" />, vi: "Thá»±c Ä‘Æ¡n hÃ ng ngÃ y",  en: "Daily Menu"   },
                { id: "shopping", icon: <ShoppingCart className="w-3.5 h-3.5" />, vi: "Danh sÃ¡ch Ä‘i chá»£", en: "Shopping List" },
                { id: "guide",    icon: <BookOpen   className="w-3.5 h-3.5" />, vi: "HÆ°á»›ng dáº«n sÆ¡ cháº¿",   en: "Prep Guide"   },
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

            {/* â”€ MENU TAB â”€ */}
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
                      {vi ? "Thá»±c Ä‘Æ¡n trong ngÃ y" : "Day Menu"}
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

            {/* â”€ SHOPPING TAB â”€ */}
            {activeSubTab === "shopping" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">
                      {vi ? "Danh sÃ¡ch Ä‘i chá»£ cáº£ tuáº§n" : "Weekly Shopping List"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {vi
                        ? `NguyÃªn liá»‡u cho ${totalPeople} ngÆ°á»i â€¢ 7 ngÃ y`
                        : `Ingredients for ${totalPeople} people â€¢ 7 days`}
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

            {/* â”€ GUIDE TAB â”€ */}
            {activeSubTab === "guide" && (
              <Card className="bg-[#111]/80 border-white/5 rounded-[2rem] p-6 lg:p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">
                      {vi ? "Máº¹o sÆ¡ cháº¿ & báº£o quáº£n" : "Prep & Storage Tips"}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      {vi ? "Tiáº¿t kiá»‡m thá»i gian náº¥u nÆ°á»›ng cáº£ tuáº§n" : "Save time cooking all week"}
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

          {/* â”€â”€ Right: summary sidebar â”€â”€â”€ */}
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
                    {vi ? "Tá»•ng káº¿ hoáº¡ch 1 tuáº§n" : "Weekly Summary"}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {vi ? "Tá»•ng cho cáº£ nhÃ³m" : "Whole group total"}
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
                      { label: vi ? "Tá»•ng nÄƒng lÆ°á»£ng" : "Total Calories",  value: `${totalKcal.toLocaleString()} kcal`, color: "text-white"      },
                      { label: vi ? "Cháº¥t Ä‘áº¡m"         : "Protein",         value: `${totalPro.toLocaleString()}g`,       color: "text-cyan-400"   },
                      { label: vi ? "Tinh bá»™t"          : "Carbohydrates",   value: `${totalCarbs.toLocaleString()}g`,     color: "text-yellow-400" },
                      { label: vi ? "Cháº¥t bÃ©o"          : "Fats",            value: `${totalFat.toLocaleString()}g`,       color: "text-pink-400"   },
                    ].map(row => (
                      <div key={row.label} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">{row.label}</span>
                        <span className={`text-base font-black ${row.color}`}>{row.value}</span>
                      </div>
                    ))}

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4 mt-2">
                      <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {vi ? "ÄÃ£ Ä‘á»‘i chiáº¿u chuáº©n dinh dÆ°á»¡ng" : "Nutrition-verified"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        {vi
                          ? `Thá»±c Ä‘Æ¡n Ä‘Æ°á»£c tÃ­nh theo chuáº©n "${dbNameMap[databaseRef]}", Ä‘iá»u chá»‰nh theo nhÃ¢n kháº©u há»c ${totalPeople} ngÆ°á»i.`
                          : `Portions calculated against "${dbNameMap[databaseRef]}" guidelines, scaled for ${totalPeople} people.`}
                      </p>
                    </div>

                    {/* Vietnamese meal structure legend */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">
                        {vi ? "Cáº¥u trÃºc mÃ¢m cÆ¡m Viá»‡t" : "Vietnamese meal structure"}
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
