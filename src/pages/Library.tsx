import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlayCircle, Star, Dumbbell, Youtube } from "lucide-react";

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const exerciseDb = [
    { n: "Barbell Bench Press", m: "Chest", d: 3, e: 5, a: "Push-ups (weighted)", l: "Gym", v: "https://www.youtube.com/watch?v=_FkbD0FhgVE" },
    { n: "Incline DB Press", m: "Chest", d: 3, e: 5, a: "Decline Push-ups", l: "Gym", v: "https://www.youtube.com/watch?v=8fXfwG4ftaQ" },
    { n: "Dumbbell Bench Press", m: "Chest", d: 2, e: 4, a: "Push-ups", l: "Gym", v: "https://www.youtube.com/watch?v=1V3vpcaxRYQ" },
    { n: "Barbell Rows", m: "Back", d: 4, e: 5, a: "Inverted Rows", l: "Gym", v: "https://www.youtube.com/watch?v=Nqh7q3zDCoQ" },
    { n: "Lat Pulldown", m: "Back", d: 2, e: 4, a: "Resistance Band Pulls", l: "Gym", v: "https://www.youtube.com/watch?v=bNmvKpJSWKM" },
    { n: "Seated Cable Row", m: "Back", d: 2, e: 4, a: "Band Rows", l: "Gym", v: "https://www.youtube.com/watch?v=DHA7QGDa2qg" },
    { n: "Back Squat", m: "Legs", d: 5, e: 5, a: "Pistol Squat", l: "Gym", v: "https://www.youtube.com/watch?v=dW3zj79xfrc" },
    { n: "Leg Press", m: "Legs", d: 2, e: 4, a: "Bulgarian Split Squat", l: "Gym", v: "https://www.youtube.com/watch?v=EotSw18oR9w" },
    { n: "Deadlift", m: "Legs", d: 5, e: 5, a: "Single-Leg RDL", l: "Gym", v: "https://www.youtube.com/watch?v=xNwpvDuZJ3k" },
    { n: "Romanian Deadlift", m: "Legs", d: 4, e: 5, a: "Band RDL", l: "Gym", v: "https://www.youtube.com/watch?v=5rIqP63yWFg" },
    { n: "Overhead Press", m: "Shoulders", d: 4, e: 5, a: "Pike Push-ups", l: "Gym", v: "https://www.youtube.com/watch?v=zoN5EH50Dro" },
    { n: "Lateral Raises", m: "Shoulders", d: 2, e: 4, a: "Band Lateral Raises", l: "Gym", v: "https://www.youtube.com/watch?v=Kl3LEzQ5Zqs" },
    { n: "Barbell Curls", m: "Arms", d: 2, e: 4, a: "Band Curls", l: "Gym", v: "https://www.youtube.com/watch?v=54x2WF1_Suc" },
    { n: "Tricep Pushdowns", m: "Arms", d: 1, e: 4, a: "Band Pushdowns", l: "Gym", v: "https://www.youtube.com/watch?v=1FjkhpZsaxc" },
    { n: "Calf Raises", m: "Legs", d: 1, e: 3, a: "-", l: "Gym", v: "https://www.youtube.com/watch?v=a-x_NR-ibos" },
    { n: "Kettlebell Swings", m: "Core", d: 3, e: 5, a: "Dumbbell Swings", l: "Gym", v: "https://www.youtube.com/watch?v=n1df4ASFeZU" },
    { n: "Dumbbell Thrusters", m: "Core", d: 4, e: 5, a: "Band Thrusters", l: "Gym", v: "https://www.youtube.com/watch?v=qnOikHllwWc" },
    { n: "Standard Push-ups", m: "Chest", d: 2, e: 4, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=UIcct-7b6oE" },
    { n: "Diamond Push-ups", m: "Chest", d: 3, e: 4, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=PPTj-MW2tcs" },
    { n: "Chest Dips", m: "Chest", d: 4, e: 5, a: "Chair Dips", l: "Calisthenics", v: "https://www.youtube.com/watch?v=NuhXmq6x9Sk" },
    { n: "Pull-Ups", m: "Back", d: 4, e: 5, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=aSMnckK_xuo" },
    { n: "Chin-Ups", m: "Back", d: 3, e: 5, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=Oi3bW9nQmGI" },
    { n: "Inverted Rows", m: "Back", d: 2, e: 4, a: "Table Rows", l: "Calisthenics", v: "https://www.youtube.com/watch?v=EfE7JeD8o6Y" },
    { n: "Pike Push-ups", m: "Shoulders", d: 3, e: 4, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=89-8waE2XKI" },
    { n: "Handstand Push-ups", m: "Shoulders", d: 5, e: 5, a: "Pike Push-ups", l: "Calisthenics", v: "https://www.youtube.com/watch?v=gSjHRuRQ4hk" },
    { n: "Bodyweight Squats", m: "Legs", d: 1, e: 3, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=-5LhNSMBrEs" },
    { n: "Bulgarian Split Squat", m: "Legs", d: 4, e: 5, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=uBSoEWZu07k" },
    { n: "Pistol Squats", m: "Legs", d: 5, e: 5, a: "Assisted Pistol", l: "Calisthenics", v: "https://www.youtube.com/watch?v=bH3mRwnAN88" },
    { n: "Walking Lunges", m: "Legs", d: 2, e: 4, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=BYe4uyGF-h4" },
    { n: "Plank", m: "Core", d: 2, e: 3, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=v25dawSzRTM" },
    { n: "L-Sit", m: "Core", d: 5, e: 5, a: "Tuck L-Sit", l: "Calisthenics", v: "https://www.youtube.com/watch?v=XN7qnqooLC8" },
    { n: "Hanging Leg Raises", m: "Core", d: 4, e: 5, a: "Lying Leg Raises", l: "Calisthenics", v: "https://www.youtube.com/watch?v=2n4UqRIJyk4" },
    { n: "Dragon Flags", m: "Core", d: 5, e: 5, a: "Lying Leg Raises", l: "Calisthenics", v: "https://www.youtube.com/watch?v=ZA7KEmeZq1E" },
    { n: "Burpees", m: "Core", d: 4, e: 5, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=McK6y7t5_XY" },
    { n: "Mountain Climbers", m: "Core", d: 2, e: 4, a: "-", l: "Calisthenics", v: "https://www.youtube.com/watch?v=7W4JEfEKuC4" },
    { n: "Band Chest Press", m: "Chest", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=T0UJ0W-_yIE" },
    { n: "Band Flyes", m: "Chest", d: 2, e: 3, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=PqoL7FOD_Aw" },
    { n: "Band Seated Row", m: "Back", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=oIIRajGaSfo" },
    { n: "Band Lat Pulldown", m: "Back", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=K59OGC4aeQ4" },
    { n: "Band Squat", m: "Legs", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=S5cTdwO1Trk" },
    { n: "Banded Glute Bridges", m: "Legs", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=6oYSPzZlwL0" },
    { n: "Band Overhead Press", m: "Shoulders", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=1-VfJqjYquQ" },
    { n: "Band Bicep Curls", m: "Arms", d: 1, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=20xtfGZ37nw" },
    { n: "Band Tricep Pushdown", m: "Arms", d: 1, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=PtHlGbiCglY" },
    { n: "Banded Woodchoppers", m: "Core", d: 2, e: 4, a: "-", l: "Band", v: "https://www.youtube.com/watch?v=64RP6a4zK7Q" },
  ];

  const [muscleFilter, setMuscleFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [effFilter, setEffFilter] = useState("all");
  const [sortBy, setSortBy] = useState("effectiveness");

  const filteredExercises = exerciseDb.filter(ex => 
      (ex.n.toLowerCase().includes(searchTerm.toLowerCase()) || 
       ex.m.toLowerCase().includes(searchTerm.toLowerCase()) ||
       ex.l.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (muscleFilter === "all" || ex.m.toLowerCase() === muscleFilter.toLowerCase()) &&
      (styleFilter === "all" || ex.l.toLowerCase() === styleFilter.toLowerCase()) &&
      (diffFilter === "all" || ex.d.toString() === diffFilter) &&
      (effFilter === "all" || ex.e.toString() === effFilter)
  ).sort((a, b) => {
    if (sortBy === "effectiveness") return b.e - a.e;
    if (sortBy === "difficulty") return b.d - a.d;
    return a.n.localeCompare(b.n);
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 max-w-[1600px] mx-auto">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-end gap-6 bg-[#111111]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Search</label>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Ex: Bench Press..." 
              className="pl-11 h-12 rounded-2xl bg-black/40 border-white/5 text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50 shadow-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Muscle Group</label>
          <select 
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            className="w-full sm:w-36 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">all</option>
            <option value="chest">Chest</option>
            <option value="back">Back</option>
            <option value="legs">Legs</option>
            <option value="shoulders">Shoulders</option>
            <option value="arms">Arms</option>
            <option value="core">Core</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Training Style</label>
          <select 
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="w-full sm:w-36 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">all</option>
            <option value="gym">Gym</option>
            <option value="calisthenics">Calisthenics</option>
            <option value="band">Band</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Difficulty</label>
          <select 
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="w-full sm:w-28 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">all</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Effectiveness</label>
          <select 
            value={effFilter}
            onChange={(e) => setEffFilter(e.target.value)}
            className="w-full sm:w-28 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">all</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Sort By</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-40 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="effectiveness">effectiveness</option>
            <option value="difficulty">difficulty</option>
            <option value="name">name</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredExercises.map((ex, i) => {
          const videoId = getYoutubeId(ex.v);
          const isPlaying = playingVideo === videoId;

          return (
            <Card key={i} className="bg-[#111111]/80 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all overflow-hidden flex flex-col group shadow-none p-0 rounded-3xl">
              <div className="h-44 bg-[#0a0a0a] relative flex items-center justify-center border-b border-white/5 overflow-hidden rounded-t-3xl">
                {isPlaying && videoId ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
                    title={ex.n} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="absolute inset-0"
                  ></iframe>
                ) : (
                  <>
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                      alt={ex.n}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent pointer-events-none opacity-80" />
                  </>
                )}
                
                {!isPlaying && (
                  <span className={`absolute top-4 left-4 px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-full shadow-lg ${
                    ex.l === 'Gym' ? 'bg-cyan-400 text-black' : 
                    ex.l === 'Band' ? 'bg-orange-400 text-black' :
                    'bg-indigo-400 text-black'
                  }`}>
                    {ex.l}
                  </span>
                )}
              </div>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="font-extrabold text-xl text-white leading-tight mb-2 tracking-tight">{ex.n}</h3>
                  <div className="inline-flex px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {ex.m}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Effectiveness:</div>
                    <div className="text-sm font-black text-white">{ex.e}/5</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between mb-1">
                      Difficulty:
                      <Dumbbell className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-sm font-black text-white">{ex.d}/5</div>
                  </div>
                </div>
                
                <div className="mt-auto space-y-4">
                  <div className="bg-black/50 border border-white/5 rounded-2xl p-4 flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Home Alternative:</div>
                      <div className="text-xs font-black text-white">{ex.a}</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => !isPlaying && setPlayingVideo(videoId)}
                    className="w-full flex items-center justify-between group/btn pt-2 pl-2"
                  >
                    <span className="text-[10px] font-black text-slate-500 group-hover/btn:text-cyan-400 uppercase tracking-widest transition-colors">View Tutorial</span>
                    <PlayCircle className="w-5 h-5 text-slate-600 group-hover/btn:text-cyan-400 transition-colors" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

