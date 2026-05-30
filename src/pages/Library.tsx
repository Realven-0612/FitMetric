import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlayCircle, Star, Dumbbell, Youtube, SlidersHorizontal, Sparkles } from "lucide-react";
import { useTranslation } from "../lib/i18n";
import { useStore } from "../lib/store";

export default function Library() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const { customExercises } = useStore();

  const exerciseDb = [
    ...customExercises,
    { n: t('ex_bench_press'), m: t('chest'), d: 3, e: 5, a: t('ex_weighted_pushups'), l: t('gym'), v: "https://www.youtube.com/watch?v=_FkbD0FhgVE" },
    { n: t('ex_incline_db_press'), m: t('chest'), d: 3, e: 5, a: t('ex_decline_pushups'), l: t('gym'), v: "https://www.youtube.com/watch?v=8fXfwG4ftaQ" },
    { n: t('ex_db_bench_press'), m: t('chest'), d: 2, e: 4, a: t('ex_pushups'), l: t('gym'), v: "https://www.youtube.com/watch?v=1V3vpcaxRYQ" },
    { n: t('ex_barbell_row'), m: t('back'), d: 4, e: 5, a: t('ex_inverted_row'), l: t('gym'), v: "https://www.youtube.com/watch?v=Nqh7q3zDCoQ" },
    { n: t('ex_lat_pulldown'), m: t('back'), d: 2, e: 4, a: t('ex_band_pulls'), l: t('gym'), v: "https://www.youtube.com/watch?v=bNmvKpJSWKM" },
    { n: t('ex_seated_cable_row'), m: t('back'), d: 2, e: 4, a: t('ex_band_row'), l: t('gym'), v: "https://www.youtube.com/watch?v=DHA7QGDa2qg" },
    { n: t('ex_back_squat'), m: t('legs'), d: 5, e: 5, a: t('ex_pistol_squat'), l: t('gym'), v: "https://www.youtube.com/watch?v=dW3zj79xfrc" },
    { n: t('ex_leg_press'), m: t('legs'), d: 2, e: 4, a: t('ex_bulgarian_split_squat'), l: t('gym'), v: "https://www.youtube.com/watch?v=EotSw18oR9w" },
    { n: t('ex_deadlift'), m: t('legs'), d: 5, e: 5, a: t('ex_single_leg_rdl'), l: t('gym'), v: "https://www.youtube.com/watch?v=xNwpvDuZJ3k" },
    { n: t('ex_romanian_deadlift'), m: t('legs'), d: 4, e: 5, a: t('ex_band_rdl'), l: t('gym'), v: "https://www.youtube.com/watch?v=5rIqP63yWFg" },
    { n: t('ex_overhead_press'), m: t('shoulders'), d: 4, e: 5, a: t('ex_pike_pushups'), l: t('gym'), v: "https://www.youtube.com/watch?v=zoN5EH50Dro" },
    { n: t('ex_lateral_raise'), m: t('shoulders'), d: 2, e: 4, a: t('ex_band_lateral_raise'), l: t('gym'), v: "https://www.youtube.com/watch?v=Kl3LEzQ5Zqs" },
    { n: t('ex_barbell_curl'), m: t('arms'), d: 2, e: 4, a: t('ex_band_curl'), l: t('gym'), v: "https://www.youtube.com/watch?v=54x2WF1_Suc" },
    { n: t('ex_tricep_pushdown'), m: t('arms'), d: 1, e: 4, a: t('ex_band_pushdown'), l: t('gym'), v: "https://www.youtube.com/watch?v=1FjkhpZsaxc" },
    { n: t('ex_calf_raise'), m: t('legs'), d: 1, e: 3, a: "-", l: t('gym'), v: "https://www.youtube.com/watch?v=a-x_NR-ibos" },
    { n: t('ex_kb_swings'), m: t('core'), d: 3, e: 5, a: t('ex_db_swings'), l: t('gym'), v: "https://www.youtube.com/watch?v=n1df4ASFeZU" },
    { n: t('ex_db_thrusters'), m: t('core'), d: 4, e: 5, a: t('ex_band_thrusters'), l: t('gym'), v: "https://www.youtube.com/watch?v=qnOikHllwWc" },
    { n: t('ex_pushups'), m: t('chest'), d: 2, e: 4, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=UIcct-7b6oE" },
    { n: t('ex_diamond_pushups'), m: t('chest'), d: 3, e: 4, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=PPTj-MW2tcs" },
    { n: t('ex_chest_dips'), m: t('chest'), d: 4, e: 5, a: t('ex_chair_dips'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=NuhXmq6x9Sk" },
    { n: t('ex_pullups'), m: t('back'), d: 4, e: 5, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=aSMnckK_xuo" },
    { n: t('ex_chinups'), m: t('back'), d: 3, e: 5, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=Oi3bW9nQmGI" },
    { n: t('ex_inverted_row'), m: t('back'), d: 2, e: 4, a: t('ex_table_row'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=EfE7JeD8o6Y" },
    { n: t('ex_pike_pushups'), m: t('shoulders'), d: 3, e: 4, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=89-8waE2XKI" },
    { n: t('ex_hspu'), m: t('shoulders'), d: 5, e: 5, a: t('ex_pike_pushups'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=gSjHRuRQ4hk" },
    { n: t('ex_bodyweight_squat'), m: t('legs'), d: 1, e: 3, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=-5LhNSMBrEs" },
    { n: t('ex_bulgarian_split_squat'), m: t('legs'), d: 4, e: 5, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=uBSoEWZu07k" },
    { n: t('ex_pistol_squat'), m: t('legs'), d: 5, e: 5, a: t('ex_assisted_pistol'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=bH3mRwnAN88" },
    { n: t('ex_walking_lunges'), m: t('legs'), d: 2, e: 4, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=BYe4uyGF-h4" },
    { n: t('ex_plank'), m: t('core'), d: 2, e: 3, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=v25dawSzRTM" },
    { n: t('ex_lsit'), m: t('core'), d: 5, e: 5, a: t('ex_tuck_lsit'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=XN7qnqooLC8" },
    { n: t('ex_hanging_leg_raise'), m: t('core'), d: 4, e: 5, a: t('ex_lying_leg_raise'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=2n4UqRIJyk4" },
    { n: t('ex_dragon_flag'), m: t('core'), d: 5, e: 5, a: t('ex_lying_leg_raise'), l: t('calisthenics'), v: "https://www.youtube.com/watch?v=ZA7KEmeZq1E" },
    { n: t('ex_burpees'), m: t('core'), d: 4, e: 5, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=McK6y7t5_XY" },
    { n: t('ex_mountain_climber'), m: t('core'), d: 2, e: 4, a: "-", l: t('calisthenics'), v: "https://www.youtube.com/watch?v=7W4JEfEKuC4" },
    { n: t('ex_band_chest_press'), m: t('chest'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=T0UJ0W-_yIE" },
    { n: t('ex_band_fly'), m: t('chest'), d: 2, e: 3, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=PqoL7FOD_Aw" },
    { n: t('ex_band_seated_row'), m: t('back'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=oIIRajGaSfo" },
    { n: t('ex_band_lat_pulldown'), m: t('back'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=K59OGC4aeQ4" },
    { n: t('ex_band_squat'), m: t('legs'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=S5cTdwO1Trk" },
    { n: t('ex_band_glute_bridge'), m: t('legs'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=6oYSPzZlwL0" },
    { n: t('ex_band_ohp'), m: t('shoulders'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=1-VfJqjYquQ" },
    { n: t('ex_band_bicep_curl'), m: t('arms'), d: 1, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=20xtfGZ37nw" },
    { n: t('ex_band_tricep_pushdown'), m: t('arms'), d: 1, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=PtHlGbiCglY" },
    { n: t('ex_band_woodchopper'), m: t('core'), d: 2, e: 4, a: "-", l: t('band'), v: "https://www.youtube.com/watch?v=64RP6a4zK7Q" },
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
      (muscleFilter === "all" || ex.m.toLowerCase() === t(muscleFilter as any).toLowerCase()) &&
      (styleFilter === "all" || ex.l.toLowerCase() === t(styleFilter as any).toLowerCase()) &&
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 max-w-[1600px] mx-auto">
      
      {/* Cybernetic Console Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
         <div className="absolute top-0 left-0 w-36 h-36 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
         <div className="absolute bottom-0 right-0 w-36 h-36 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 w-full justify-between">
            <div>
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-3 font-heading">
                   <Dumbbell className="w-8 h-8 text-primary animate-pulse" />
                   {t('exercise_library' as any) || "Exercise Library"}
                 </h1>
                 <div className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-md border border-primary/20 flex items-center gap-2 shadow-inner uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    {filteredExercises.length} {t('exercises' as any) || "Exercises"}
                 </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5">{t('library_subtitle' as any) || "CYBERNETIC EXERCISE DIRECTORY & VIDEO WORKOUTS"}</p>
            </div>
         </div>
      </div>

      {/* Advanced Filtering Deck */}
      <div className="flex flex-wrap items-end gap-4 bg-card p-6 rounded-3xl border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
        
        <div className="flex-1 min-w-[240px] space-y-2">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-1.5">
            <Search className="w-3 h-3 text-primary" />
            {t('search_label')}
          </label>
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={t('food_search_placeholder')} 
              className="pl-11 h-12 rounded-2xl bg-muted/55 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary shadow-none font-semibold text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">{t('muscle_group')}</label>
          <div className="relative">
            <select 
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              className="w-full sm:w-40 h-12 rounded-2xl bg-muted border border-border text-foreground px-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-border/85 transition-all"
            >
              <option value="all" className="bg-card text-foreground">{t('all' as any)}</option>
              <option value="chest" className="bg-card text-foreground">{t('chest')}</option>
              <option value="back" className="bg-card text-foreground">{t('back')}</option>
              <option value="legs" className="bg-card text-foreground">{t('legs')}</option>
              <option value="shoulders" className="bg-card text-foreground">{t('shoulders')}</option>
              <option value="arms" className="bg-card text-foreground">{t('arms')}</option>
              <option value="core" className="bg-card text-foreground">{t('core')}</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-2 h-2 border-r-2 border-b-2 border-muted-foreground rotate-45" />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">{t('environment')}</label>
          <div className="relative">
            <select 
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="w-full sm:w-40 h-12 rounded-2xl bg-muted border border-border text-foreground px-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-border/85 transition-all"
            >
              <option value="all" className="bg-card text-foreground">{t('all' as any)}</option>
              <option value="gym" className="bg-card text-foreground">{t('gym')}</option>
              <option value="calisthenics" className="bg-card text-foreground">{t('calisthenics')}</option>
              <option value="band" className="bg-card text-foreground">{t('band')}</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-2 h-2 border-r-2 border-b-2 border-muted-foreground rotate-45" />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">{t('difficulty')}</label>
          <div className="relative">
            <select 
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className="w-full sm:w-28 h-12 rounded-2xl bg-muted border border-border text-foreground px-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-border/85 transition-all"
            >
              <option value="all" className="bg-card text-foreground">{t('all' as any)}</option>
              <option value="1" className="bg-card text-foreground">1 ★</option>
              <option value="2" className="bg-card text-foreground">2 ★★</option>
              <option value="3" className="bg-card text-foreground">3 ★★★</option>
              <option value="4" className="bg-card text-foreground">4 ★★★★</option>
              <option value="5" className="bg-card text-foreground">5 ★★★★★</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-2 h-2 border-r-2 border-b-2 border-muted-foreground rotate-45" />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">{t('effectiveness')}</label>
          <div className="relative">
            <select 
              value={effFilter}
              onChange={(e) => setEffFilter(e.target.value)}
              className="w-full sm:w-28 h-12 rounded-2xl bg-muted border border-border text-foreground px-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-border/85 transition-all"
            >
              <option value="all" className="bg-card text-foreground">{t('all' as any)}</option>
              <option value="1" className="bg-card text-foreground">1</option>
              <option value="2" className="bg-card text-foreground">2</option>
              <option value="3" className="bg-card text-foreground">3</option>
              <option value="4" className="bg-card text-foreground">4</option>
              <option value="5" className="bg-card text-foreground">5</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-2 h-2 border-r-2 border-b-2 border-muted-foreground rotate-45" />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
            {t('sort_by')}
          </label>
          <div className="relative">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-44 h-12 rounded-2xl bg-muted border border-border text-foreground px-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-border/85 transition-all"
            >
              <option value="effectiveness" className="bg-card text-foreground">{t('effectiveness')}</option>
              <option value="difficulty" className="bg-card text-foreground">{t('difficulty')}</option>
              <option value="name" className="bg-card text-foreground">{t('name_label')}</option>
            </select>
            <div className="absolute right-4 top-4.5 pointer-events-none w-2 h-2 border-r-2 border-b-2 border-muted-foreground rotate-45" />
          </div>
        </div>
      </div>

      {/* Cyberpunk Exercise Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredExercises.map((ex, i) => {
          const videoId = getYoutubeId(ex.v);
          const isPlaying = playingVideo === videoId;

          return (
            <Card key={i} className="bg-card border border-border hover:border-primary/30 transition-all duration-350 overflow-hidden flex flex-col group rounded-3xl relative shadow-sm hover:shadow-md">
              
              {/* Line Accent */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div 
                className={`bg-muted/40 relative flex items-center justify-center border-b border-border overflow-hidden rounded-t-[1.25rem] cursor-pointer group/vid transition-all duration-550 ${
                  isPlaying ? 'h-52 sm:h-64' : 'h-44'
                }`}
                onClick={() => !isPlaying && setPlayingVideo(videoId)}
              >
                {isPlaying && videoId ? (
                  <>
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
                      title={ex.n} 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                      className="absolute inset-0 z-10"
                    ></iframe>
                    
                    {/* Floating HUD controls */}
                    <div className="absolute top-3 right-3 z-20 flex gap-2">
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur-md border border-border flex items-center justify-center hover:bg-background transition-colors shadow-sm"
                        title="Open on YouTube"
                      >
                        <Youtube className="w-4 h-4 text-red-500" />
                      </a>
                      <button
                        onClick={e => { e.stopPropagation(); setPlayingVideo(null); }}
                        className="w-8 h-8 rounded-xl bg-background/80 backdrop-blur-md border border-border flex items-center justify-center hover:bg-red-500/15 hover:text-red-500 text-muted-foreground transition-all shadow-sm"
                        title="Close Player"
                      >
                        <span className="text-xs font-black">✕</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                      alt={ex.n}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none opacity-85" />
                    
                    {/* HUD play trigger */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-50 group-hover/vid:opacity-100 transition-all duration-300 pointer-events-none">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center justify-center group-hover:scale-105 transition-all">
                        <PlayCircle className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                    </div>
                  </>
                )}
                
                {!isPlaying && (
                  <span className={`absolute top-4 left-4 px-3 py-1.5 text-[9px] uppercase font-black tracking-widest rounded-xl shadow-sm border backdrop-blur-md ${
                    ex.l === t('gym') ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-550 dark:text-cyan-400' : 
                    ex.l === t('band') ? 'bg-orange-500/10 border-orange-500/20 text-orange-650 dark:text-orange-400' :
                    'bg-indigo-500/10 border-indigo-500/20 text-indigo-650 dark:text-indigo-400'
                  }`}>
                    {ex.l}
                  </span>
                )}
              </div>

              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="font-extrabold text-lg text-foreground leading-snug mb-2 tracking-tight group-hover:text-primary transition-colors duration-300 font-heading">{ex.n}</h3>
                  <div className="inline-flex px-2.5 py-1 bg-muted border border-border rounded-lg text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    {ex.m}
                  </div>
                </div>
                
                {/* Visual Stats Gauges */}
                <div className="grid grid-cols-2 gap-4 mb-5 bg-muted/40 p-3 rounded-2xl border border-border shadow-inner">
                  <div>
                    <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{t('effectiveness')}:</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-foreground">{ex.e}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              idx < ex.e ? 'bg-accent shadow-sm' : 'bg-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center justify-between">
                      {t('difficulty')}:
                      <Dumbbell className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-foreground">{ex.d}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              idx < ex.d ? 'bg-indigo-500 dark:bg-purple-400 shadow-sm' : 'bg-muted-foreground/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Alternative Recommendation HUD Box */}
                <div className="mt-auto pt-2">
                  <div className="bg-muted border border-border rounded-2xl p-3.5 flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{t('home_alternative')}:</div>
                      <div className="text-xs font-black text-foreground truncate">{ex.a}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
