import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlayCircle, Star, Dumbbell, Youtube } from "lucide-react";
import { useTranslation } from "../lib/i18n";

export default function Library() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const exerciseDb = [
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 max-w-[1600px] mx-auto">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-end gap-6 bg-[#111111]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('search_label')}</label>
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={t('food_search_placeholder')} 
              className="pl-11 h-12 rounded-2xl bg-black/40 border-white/5 text-white placeholder:text-slate-600 focus-visible:ring-cyan-500/50 shadow-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('muscle_group')}</label>
          <select 
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value)}
            className="w-full sm:w-36 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">{t('all' as any)}</option>
            <option value="chest">{t('chest')}</option>
            <option value="back">{t('back')}</option>
            <option value="legs">{t('legs')}</option>
            <option value="shoulders">{t('shoulders')}</option>
            <option value="arms">{t('arms')}</option>
            <option value="core">{t('core')}</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('environment')}</label>
          <select 
            value={styleFilter}
            onChange={(e) => setStyleFilter(e.target.value)}
            className="w-full sm:w-36 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">{t('all' as any)}</option>
            <option value="gym">{t('gym')}</option>
            <option value="calisthenics">{t('calisthenics')}</option>
            <option value="band">{t('band')}</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('difficulty')}</label>
          <select 
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="w-full sm:w-28 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">{t('all' as any)}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('effectiveness')}</label>
          <select 
            value={effFilter}
            onChange={(e) => setEffFilter(e.target.value)}
            className="w-full sm:w-28 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="all">{t('all' as any)}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{t('sort_by')}</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-40 h-12 rounded-2xl bg-black/40 border border-white/5 text-white px-4 text-sm font-bold focus:ring-cyan-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="effectiveness">{t('effectiveness')}</option>
            <option value="difficulty">{t('difficulty')}</option>
            <option value="name">{t('name_label')}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filteredExercises.map((ex, i) => {
          const videoId = getYoutubeId(ex.v);
          const isPlaying = playingVideo === videoId;

          return (
            <Card key={i} className="bg-[#111111]/80 backdrop-blur-md border border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all overflow-hidden flex flex-col group shadow-none p-0 rounded-3xl">
              <div 
                className={`bg-[#0a0a0a] relative flex items-center justify-center border-b border-white/5 overflow-hidden rounded-t-3xl cursor-pointer group/vid transition-all duration-300 ${
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
                    {/* Controls overlay */}
                    <div className="absolute top-2 right-2 z-20 flex gap-1.5">
                      <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/90 transition-colors"
                        title="Mở fullscreen trên YouTube"
                      >
                        <Youtube className="w-4 h-4 text-red-400" />
                      </a>
                      <button
                        onClick={e => { e.stopPropagation(); setPlayingVideo(null); }}
                        className="w-8 h-8 rounded-lg bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                        title="Đóng video"
                      >
                        <span className="text-white text-xs font-black">✕</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img 
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
                      alt={ex.n}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent pointer-events-none opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                        <PlayCircle className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </>
                )}
                
                {!isPlaying && (
                  <span className={`absolute top-4 left-4 px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-full shadow-lg ${
                    ex.l === t('gym') ? 'bg-cyan-400 text-black' : 
                    ex.l === t('band') ? 'bg-orange-400 text-black' :
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
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('effectiveness')}:</div>
                    <div className="text-sm font-black text-white">{ex.e}/5</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between mb-1">
                      {t('difficulty')}:
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
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('home_alternative')}:</div>
                      <div className="text-xs font-black text-white">{ex.a}</div>
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

