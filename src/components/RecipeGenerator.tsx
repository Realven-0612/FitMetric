import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Utensils, Loader2, Info, CheckCircle2, ChevronRight, X } from "lucide-react";
import Markdown from "react-markdown";

interface RecipeGeneratorProps {
  remainingMacros: { kcal: number; protein: number; carbs: number; fat: number };
  onClose: () => void;
}

export function RecipeGenerator({ remainingMacros, onClose }: RecipeGeneratorProps) {
  const [recipe, setRecipe] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRecipe = async () => {
    setLoading(true);
    try {
      const prompt = `
        You are an elite fitness chef. 
        Create 1 high-protein recipe for dinner that fits exactly within these remaining daily macros:
        - Calories: ${remainingMacros.kcal} kcal
        - Protein: ${remainingMacros.protein}g
        - Carbs: ${remainingMacros.carbs}g
        - Fat: ${remainingMacros.fat}g
        
        The recipe should be healthy, easy to cook, and professional.
        Format the output clearly with:
        - Recipe Name
        - Prep Time
        - Ingredients List
        - Steps
        - Macro Breakdown of this specific meal
      `;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error('AI request failed');
      const resultData = await response.json();

      setRecipe(resultData.text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <Card className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,1)]">
        <Button 
          variant="ghost" 
          onClick={onClose} 
          className="absolute top-8 right-8 z-20 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white p-0 border border-white/10"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="p-10 pb-6 border-b border-white/5 bg-gradient-to-b from-purple-500/10 to-transparent">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Macro-Gen Engine</h2>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{remainingMacros.kcal} kcal Left</span>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full">{remainingMacros.protein}g Protein Target</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {!recipe ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-10">
               <div className="w-24 h-24 rounded-full bg-purple-500/5 flex items-center justify-center border border-purple-500/10">
                  <Utensils className="w-10 h-10 text-slate-600" />
               </div>
               <div className="space-y-2 max-w-md">
                 <h3 className="text-xl font-black text-white italic capitalize">Your remaining macros are calculated.</h3>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">
                   Our AI chef will analyze your current intake vs targets and craft a meal that hits your numbers perfectly.
                 </p>
               </div>
               <Button 
                onClick={generateRecipe}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-400 text-black font-black uppercase text-xs tracking-widest h-14 px-10 rounded-2xl shadow-[0_0_30px_rgba(112,0,255,0.3)] w-full max-w-xs"
               >
                 {loading ? <Loader2 className="animate-spin w-5 h-5 mr-3" /> : null}
                 {loading ? "Synthesizing Recipe..." : "Generate Dinner Plan"}
               </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
               <div className="prose prose-invert prose-sm max-w-none">
                 <div className="markdown-body">
                   <Markdown>{recipe}</Markdown>
                 </div>
               </div>
               
               <div className="pt-8 border-t border-white/5">
                 <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10 flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                       <p className="text-sm font-black text-white uppercase tracking-wider mb-1">Precision Cooking</p>
                       <p className="text-xs text-slate-400 font-medium">This recipe was generated using your real-time metabolism data. Adjust portions slightly if you feel overly satiated.</p>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>

        {recipe && (
          <div className="p-8 border-t border-white/5 flex gap-4">
            <Button onClick={() => setRecipe(null)} variant="outline" className="flex-1 rounded-2xl h-12 border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">New Idea</Button>
            <Button onClick={onClose} className="flex-1 rounded-2xl h-12 bg-white text-black font-black uppercase text-[10px] tracking-widest">Done</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
