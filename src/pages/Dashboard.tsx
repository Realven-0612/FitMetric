import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Trophy, Calendar, Target, Zap, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const consumptionData = [
  { name: "04/27", value: 0 },
  { name: "04/28", value: 0 },
  { name: "04/29", value: 0 },
  { name: "04/30", value: 0 },
  { name: "05/01", value: 0 },
  { name: "05/02", value: 0 },
  { name: "05/03", value: 0 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Top Row: Command Center & Motivation */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        
        {/* Command Center Card */}
        <Card className="bg-gradient-to-br from-[#1a1c29] to-[#251e30] border-white/5 rounded-[2rem] overflow-hidden shadow-none p-6 lg:p-8 relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
           
           <div className="flex flex-col gap-6 relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-3xl font-black text-white tracking-tight uppercase">COMMAND CENTER</h2>
                   <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase">PRO-ACTIVE HUD ACTIVE</p>
                 </div>
              </div>

              <blockquote className="text-lg text-slate-300 font-medium italic mt-2 mb-4">
                "Discipline equals freedom. Own the day."
              </blockquote>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-auto">
                 {/* KCAL INTAKE */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Flame className="w-3 h-3 text-orange-400" /> Kcal Intake
                    </div>
                    <div className="text-3xl font-black text-white leading-none mb-1">
                      0
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono">
                      / 2000 TDEE
                    </div>
                 </div>

                 {/* STREAK */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Trophy className="w-3 h-3 text-yellow-500" /> Streak
                    </div>
                    <div className="text-3xl font-black text-white leading-none mb-1">
                      0
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono">
                      Days consistent
                    </div>
                 </div>

                 {/* NEXT OPERATION */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Calendar className="w-3 h-3 text-cyan-400" /> Next Operation
                    </div>
                    <div className="text-xl font-bold text-white leading-tight mb-1">
                      Rest
                    </div>
                    <div className="text-xs text-slate-500 font-medium font-mono">
                      Ready to engage
                    </div>
                 </div>

                 {/* CURRENT WEIGHT */}
                 <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                       <Target className="w-3 h-3 text-indigo-400" /> Current Weight
                    </div>
                    <div className="text-xl flex items-baseline gap-1 font-bold text-white leading-tight mb-1">
                      -- <span className="text-sm text-slate-500">kg</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium font-mono">
                      Update Bio-Metrics
                    </div>
                 </div>
              </div>
           </div>
        </Card>

        {/* Motivation Card */}
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col items-start p-6 lg:p-8">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/20 text-orange-500 rounded-xl">
                 <Zap className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Motivation</h3>
           </div>
           <p className="text-slate-400 italic font-medium leading-relaxed">
             "The only bad workout is the one that didn't happen. Your phone and laptop are synced, no excuses left."
           </p>
        </Card>
      </div>

      {/* Bottom Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weight Progression Card */}
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col p-6 lg:p-8 min-h-[300px]">
           <div className="flex items-center gap-3 mb-8">
              <div className="text-indigo-400">
                 <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weight Progression</h3>
           </div>
           
           {/* Empty State */}
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <TrendingUp className="w-8 h-8 opacity-20" />
              <p className="text-sm font-medium">Log 2+ weight entries to see progression map.</p>
           </div>
        </Card>

        {/* Consumption Chart Card */}
        <Card className="bg-[#111111]/80 border-white/5 rounded-[2rem] shadow-none flex flex-col p-6 lg:p-8 min-h-[300px]">
           <div className="flex items-center gap-3 mb-8">
              <div className="text-orange-400">
                 <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Consumption (Last 7 Days)</h3>
           </div>
           
           <div className="flex-1 w-full h-[200px] min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={consumptionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#555" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fillOpacity={0.1} fill="var(--primary)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </Card>

      </div>
    </div>
  );
}
