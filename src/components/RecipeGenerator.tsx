import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Utensils, Loader2, X, Clock, Flame, Beef, Wheat, Droplets, ChefHat } from "lucide-react";
import { generateAIContent } from "../lib/ai";

interface RecipeGeneratorProps {
  remainingMacros: { kcal: number; protein: number; carbs: number; fat: number };
  onClose: () => void;
}

interface Recipe {
  name: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
  macros: { kcal: number; protein: number; carbs: number; fat: number };
}

export function RecipeGenerator({ remainingMacros, onClose }: RecipeGeneratorProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generateRecipe = async () => {
    setLoading(true);
    setError(false);
    try {
      const prompt = `
        Create 1 high-protein dinner recipe fitting these macros:
        ${remainingMacros.kcal} kcal | ${remainingMacros.protein}g protein | ${remainingMacros.carbs}g carbs | ${remainingMacros.fat}g fat
        Return ONLY a valid JSON object, no markdown, no explanation:
        {
          "name": "Recipe Name",
          "prepTime": "10 min",
          "cookTime": "20 min",
          "ingredients": ["200g chicken", "100g rice", "..."],
          "steps": ["Step one.", "Step two.", "..."],
          "macros": { "kcal": 500, "protein": 40, "carbs": 45, "fat": 12 }
        }
      `;
      const response = await generateAIContent(prompt);
      const text = response.text || response;
      const json = JSON.parse(text.replace(/\`\`\`json|\`\`\`/g, '').trim());
      setRecipe(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <Card className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_60px_rgba(112,0,255,0.15)]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-b from-purple-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Macro-Gen Engine</h2>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-widest">{remainingMacros.kcal} kcal left</span>
                <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{remainingMacros.protein}g protein</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white p-0 border border-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!recipe ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center text-center py-16 px-8 gap-6">
              <div className="w-20 h-20 rounded-full bg-purple-500/5 border border-purple-500/10 flex items-center justify-center">
                <Utensils className="w-9 h-9 text-slate-700" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-white italic">AI Chef sẵn sàng</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">Tạo công thức bữa tối khớp chính xác với macro còn lại của bạn hôm nay.</p>
              </div>
              {error && <p className="text-xs text-red-400">Lỗi tạo công thức. Thử lại nhé!</p>}
              <Button
                onClick={generateRecipe}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-400 text-black font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-2xl shadow-[0_0_20px_rgba(112,0,255,0.3)] w-full max-w-xs"
              >
                {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Đang tạo...</> : <><ChefHat className="w-4 h-4 mr-2" /> Tạo công thức</>}
              </Button>
            </div>
          ) : (
            /* Recipe display */
            <div className="p-5 space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
              
              {/* Recipe name + time */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                <h3 className="text-lg font-black text-white mb-2">{recipe.name}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] font-bold">Prep {recipe.prepTime}</span>
                  </div>
                  <span className="text-slate-700">·</span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[11px] font-bold">Cook {recipe.cookTime}</span>
                  </div>
                </div>
              </div>

              {/* Macro pills */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'kcal', value: recipe.macros.kcal, icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                  { label: 'protein', value: `${recipe.macros.protein}g`, icon: Beef, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                  { label: 'carbs', value: `${recipe.macros.carbs}g`, icon: Wheat, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                  { label: 'fat', value: `${recipe.macros.fat}g`, icon: Droplets, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
                ].map(m => (
                  <div key={m.label} className={`${m.bg} border rounded-xl p-2.5 flex flex-col items-center gap-0.5`}>
                    <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                    <span className="text-white font-black text-xs">{m.value}</span>
                    <span className="text-[8px] text-slate-600 uppercase tracking-widest">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Ingredients */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Nguyên liệu</p>
                <ul className="space-y-1.5">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Cách làm</p>
                <ol className="space-y-2.5">
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-[12px] text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {recipe && (
          <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
            <Button onClick={() => setRecipe(null)} variant="outline" className="flex-1 rounded-2xl h-11 border-white/10 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/5">
              Ý tưởng khác
            </Button>
            <Button onClick={onClose} className="flex-1 rounded-2xl h-11 bg-purple-500 hover:bg-purple-400 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_15px_rgba(112,0,255,0.3)]">
              Xong
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
