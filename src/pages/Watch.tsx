import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity, Unlink, Watch as WatchIcon, BookOpen, Smartphone,
  Activity as ActivityIcon, RefreshCw, ExternalLink, Heart,
  MapPin, Clock, Flame, TrendingUp, Bike, PersonStanding, Footprints
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n";
import { API_BASE } from "../lib/api";

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  calories: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  total_elevation_gain: number;
  strava_url: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function getActivityIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('ride') || t.includes('cycling')) return <Bike className="w-5 h-5" />;
  if (t.includes('run')) return <Footprints className="w-5 h-5" />;
  if (t.includes('walk') || t.includes('hike')) return <PersonStanding className="w-5 h-5" />;
  return <ActivityIcon className="w-5 h-5" />;
}
function getActivityColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes('ride') || t.includes('cycling')) return 'text-cyan-400';
  if (t.includes('run')) return 'text-emerald-400';
  if (t.includes('walk') || t.includes('hike')) return 'text-yellow-400';
  return 'text-orange-400';
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Watch() {
  const { t, language } = useTranslation();
  const [stravaConnected, setStravaConnected] = useState(false);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  const fetchActivities = useCallback(async () => {
    const stravaTokenStr = localStorage.getItem("strava_token");
    if (!stravaTokenStr) return;
    setLoadingActivities(true);
    try {
      const tokenData = JSON.parse(stravaTokenStr);
      const res = await fetch(`${API_BASE}/api/strava/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newTokenData) {
          localStorage.setItem("strava_token", JSON.stringify(data.newTokenData));
        }
        setActivities(data.activities || []);
        setActivitiesLoaded(true);
      } else {
        toast.error("Failed to load Strava activities");
      }
    } catch {
      toast.error("Failed to load Strava activities");
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("strava_token");
    if (token) {
      setStravaConnected(true);
      fetchActivities();
    }

    const handleMessage = (event: MessageEvent) => {
      if (
        !event.origin.includes("localhost") &&
        !event.origin.endsWith(".run.app") &&
        !event.origin.endsWith(".onrender.com") &&
        !event.origin.endsWith(".render.com")
      ) return;

      if (event.data?.type === "STRAVA_AUTH_SUCCESS") {
        localStorage.setItem("strava_token", JSON.stringify(event.data.payload));
        setStravaConnected(true);
        toast.success(t("strava_connected_successfully"));
        fetchActivities();
      }
      if (event.data?.type === "STRAVA_AUTH_ERROR") {
        toast.error(`${t("strava_connection_failed")}: ${event.data.error}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [t, fetchActivities]);

  const connectStrava = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/strava/auth`);
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "strava_auth", "width=600,height=700");
      } else {
        toast.error(t("strava_not_configured"));
      }
    } catch {
      toast.error(t("strava_init_failed"));
    }
  };

  const disconnectStrava = () => {
    localStorage.removeItem("strava_token");
    setStravaConnected(false);
    setActivities([]);
    setActivitiesLoaded(false);
    toast.info(t("strava_disconnected"));
  };

  // ── summary stats across all fetched activities ───────────────────────────
  const totalKm = activities.reduce((s, a) => s + a.distance, 0) / 1000;
  const totalCals = activities.reduce((s, a) => s + (a.calories || 0), 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full bg-orange-500/20 blur-sm transition-all duration-1000 ${stravaConnected ? 'animate-ping scale-110' : ''}`} />
            <div className="relative w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <WatchIcon className="w-7 h-7 text-orange-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-widest">{t("wearables")}</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{t("device_connectivity")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">

        {/* ── Strava Connect Card ─────────────────────────────────────────── */}
        <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 relative overflow-hidden shadow-xl rounded-3xl h-fit hover:border-[#fc4c02]/30 transition-all duration-500">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#fc4c02]/10 rounded-full blur-[60px] pointer-events-none" />
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-[#fc4c02] text-xs font-black uppercase tracking-widest">
              <Activity className="w-5 h-5" /> {t("strava_integration")}
            </CardTitle>
            <CardDescription className="text-[11px] text-orange-200/40 font-bold uppercase tracking-wider mt-1">{t("strava_sync_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stravaConnected ? (
              <div className="space-y-4 relative z-10">
                {/* Connected status */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#fc4c02]/10 border border-[#fc4c02]/20 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#fc4c02]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                      <span className="font-black text-white text-xs uppercase tracking-wider">{t("strava_connected_status")}</span>
                    </div>
                    <span className="text-[9px] uppercase font-black tracking-widest text-[#fc4c02]/80 mt-1 block">{t("strava_syncing")}</span>
                  </div>
                </div>

                {/* Refresh + Disconnect */}
                <Button
                  onClick={fetchActivities}
                  disabled={loadingActivities}
                  variant="outline"
                  className="w-full border-white/5 bg-black/30 text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs h-12 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 transition-all shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingActivities ? "animate-spin" : ""}`} />
                  {loadingActivities ? "Syncing..." : "Refresh Activities"}
                </Button>
                <Button
                  onClick={disconnectStrava}
                  variant="outline"
                  className="w-full hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border-white/5 bg-black/30 text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs h-12 transition-all shadow-md"
                >
                  <Unlink className="w-4 h-4 mr-2" /> {t("disconnect_strava")}
                </Button>

                <div className="flex justify-center items-center mt-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Powered by <span className="text-[#FC4C02] font-black">Strava</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6">{t("strava_connect_desc")}</p>

                {/* Official Strava button */}
                <button
                  onClick={connectStrava}
                  className="w-full bg-[#FC4C02] hover:bg-[#E34402] transition-all rounded-xl flex items-center justify-center h-12 shadow-md border-none mb-3 hover:scale-[1.01] duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5 mr-3" aria-hidden="true">
                    <path fill="#ffffff" d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  <span className="text-white font-black uppercase text-xs tracking-widest">Connect with Strava</span>
                </button>

                <div className="flex justify-center items-center pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Powered by <span className="text-[#FC4C02] font-black">Strava</span>
                  </span>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-[9px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                  <strong className="text-orange-400 font-black">Developer Note:</strong> {t("strava_dev_note").replace("Developer Note:", "")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Setup Guide Card (shown only when NOT connected) ─────────────── */}
        {!stravaConnected && (
          <Card className="col-span-1 bg-[#111111]/80 backdrop-blur-md border border-white/5 relative shadow-xl rounded-3xl h-fit hover:border-cyan-500/20 transition-all duration-500">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest">
                <BookOpen className="w-5 h-5" /> {language === "vi" ? "Hướng dẫn cài đặt & đồng bộ" : "Setup & Sync Guide"}
              </CardTitle>
              <CardDescription className="text-[11px] text-cyan-200/40 font-bold uppercase tracking-wider mt-1">
                {language === "vi"
                  ? "Các bước chi tiết để bắt đầu sử dụng Strava trên Android và iOS."
                  : "Step-by-step instructions for getting started with Strava."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {language === "vi" ? (
                <div className="space-y-6 text-sm text-slate-300">
                  <div>
                    <h3 className="text-white font-black mb-2.5 flex items-center gap-2 tracking-widest uppercase text-[10px]"><Smartphone className="w-4 h-4 text-cyan-400" /> 1. Cài đặt & Tạo tài khoản</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div>
                        <p className="font-black text-[10px] text-cyan-400 uppercase tracking-wider mb-2">Android:</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 font-semibold">
                          <li>Mở <strong className="text-slate-300">Google Play Store</strong>.</li>
                          <li>Tìm kiếm "Strava" và nhấn <strong className="text-slate-300">Cài đặt</strong>.</li>
                          <li>Đăng ký tài khoản mới.</li>
                        </ol>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4">
                        <p className="font-black text-[10px] text-cyan-400 uppercase tracking-wider mb-2">iOS (iPhone):</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 font-semibold">
                          <li>Mở <strong className="text-slate-300">App Store</strong>.</li>
                          <li>Tìm kiếm "Strava" và nhấn <strong className="text-slate-300">Nhận</strong>.</li>
                          <li>Đăng ký tài khoản mới.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-black mb-2.5 flex items-center gap-2 tracking-widest uppercase text-[10px]"><ActivityIcon className="w-4 h-4 text-orange-400" /> 2. Ghi lại một hoạt động</h3>
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400 font-semibold">
                        <li>Mở ứng dụng Strava.</li>
                        <li>Nhấn nút <strong className="text-slate-300">Record</strong> (vòng tròn giữa dưới).</li>
                        <li>Chọn loại hoạt động (chạy bộ, xe đạp, đi bộ).</li>
                        <li>Nhấn <strong className="text-slate-300">Start</strong> để ghi lại.</li>
                        <li>Tập xong, nhấn <strong className="text-slate-300">Stop</strong>, rồi <strong className="text-slate-300">Finish</strong> và nhấn lưu.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 text-sm text-slate-300">
                  <div>
                    <h3 className="text-white font-black mb-2.5 flex items-center gap-2 tracking-widest uppercase text-[10px]"><Smartphone className="w-4 h-4 text-cyan-400" /> 1. Installation & Account Setup</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                      <div>
                        <p className="font-black text-[10px] text-cyan-400 uppercase tracking-wider mb-2">Android:</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 font-semibold">
                          <li>Open <strong className="text-slate-300">Play Store</strong>.</li>
                          <li>Search Strava, tap <strong className="text-slate-300">Install</strong>.</li>
                          <li>Sign up for a new account.</li>
                        </ol>
                      </div>
                      <div className="border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-4">
                        <p className="font-black text-[10px] text-cyan-400 uppercase tracking-wider mb-2">iOS (iPhone):</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 font-semibold">
                          <li>Open <strong className="text-slate-300">App Store</strong>.</li>
                          <li>Search Strava, tap <strong className="text-slate-300">Get</strong>.</li>
                          <li>Sign up for a new account.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-black mb-2.5 flex items-center gap-2 tracking-widest uppercase text-[10px]"><ActivityIcon className="w-4 h-4 text-orange-400" /> 2. Tracking an Activity</h3>
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                      <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400 font-semibold">
                        <li>Open the Strava app.</li>
                        <li>Tap <strong className="text-slate-300">Record</strong> at the bottom center.</li>
                        <li>Select activity (run, cycle, walk).</li>
                        <li>Tap <strong className="text-slate-300">Start</strong> to record.</li>
                        <li>When done, tap <strong className="text-slate-300">Stop</strong>, then <strong className="text-slate-300">Finish</strong> to save.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) }

        {/* ── Activity Feed (only when connected) ─────────────────────────── */}
        {stravaConnected && (
          <div className="col-span-1 space-y-4">

            {/* Summary Stats Bar */}
            {activitiesLoaded && activities.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <MapPin className="w-4 h-4" />, label: "Distance", value: `${totalKm.toFixed(1)} km`, color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/10 text-emerald-400" },
                  { icon: <Flame className="w-4 h-4" />, label: "Calories", value: `${Math.round(totalCals)} kcal`, color: "from-orange-500/10 to-orange-500/5 border-orange-500/10 text-orange-400" },
                  { icon: <Clock className="w-4 h-4" />, label: "Time", value: formatDuration(totalTime), color: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/10 text-cyan-400" },
                ].map(stat => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl border p-4 text-center shadow-lg`}>
                    <div className="flex justify-center mb-2">{stat.icon}</div>
                    <div className="text-white font-black text-base tracking-tight">{stat.value}</div>
                    <div className="text-slate-500 text-[9px] uppercase tracking-widest font-bold mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity Cards Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {language === 'vi' ? 'Hoạt động gần đây' : 'Recent Activities'}
              </span>
              {activitiesLoaded && (
                <span className="text-[10px] text-slate-500 font-medium">{activities.length} activities</span>
              )}
            </div>

            {/* Loading skeleton */}
            {loadingActivities && !activitiesLoaded && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#111111]/80 rounded-2xl border border-white/5 p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                        <div className="h-2 bg-white/5 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1,2,3].map(j => <div key={j} className="h-8 bg-white/5 rounded-xl" />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {activitiesLoaded && activities.length === 0 && (
              <div className="bg-[#111111]/80 rounded-3xl border border-white/5 p-10 text-center">
                <ActivityIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium text-sm">
                  {language === 'vi' ? 'Chưa có hoạt động nào.' : 'No activities found.'}
                </p>
                <p className="text-slate-600 text-xs mt-1">
                  {language === 'vi' ? 'Hãy ghi lại một buổi tập trên Strava!' : 'Go record a workout on Strava!'}
                </p>
              </div>
            )}

            {/* Activity cards */}
            {activities.map(act => (
              <div
                key={act.id}
                className="bg-[#111111]/80 backdrop-blur-md rounded-2xl border border-white/5 p-5 hover:border-orange-500/25 hover:shadow-[0_10px_30px_rgba(252,76,2,0.04)] transition-all duration-300 group"
              >
                {/* Top row: icon + name + date + external link */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 ${getActivityColor(act.type)} shadow-inner`}>
                      {getActivityIcon(act.type)}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm leading-tight group-hover:text-orange-400 transition-colors">{act.name}</p>
                      <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black mt-1">
                        {act.type} · {formatDate(act.start_date)}
                      </p>
                    </div>
                  </div>
                  {/* "View on Strava" — required by Strava brand guidelines */}
                  <a
                    href={act.strava_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FC4C02] text-[9px] font-black uppercase tracking-wider flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 underline"
                  >
                    View on Strava <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-white font-black text-xs">{formatDistance(act.distance)}</p>
                    <p className="text-slate-500 text-[8px] uppercase tracking-widest font-bold mt-0.5">Distance</p>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-white font-black text-xs">{formatDuration(act.moving_time)}</p>
                    <p className="text-slate-500 text-[8px] uppercase tracking-widest font-bold mt-0.5">Duration</p>
                  </div>
                  {act.calories > 0 && (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-white font-black text-xs">{Math.round(act.calories)}</p>
                      <p className="text-slate-500 text-[8px] uppercase tracking-widest font-bold mt-0.5">kcal</p>
                    </div>
                  )}
                  {act.average_heartrate && (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
                        <Heart className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-white font-black text-xs">{Math.round(act.average_heartrate)}</p>
                      <p className="text-slate-500 text-[8px] uppercase tracking-widest font-bold mt-0.5">Avg BPM</p>
                    </div>
                  )}
                  {act.total_elevation_gain > 0 && (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-white font-black text-xs">{Math.round(act.total_elevation_gain)}m</p>
                      <p className="text-slate-500 text-[8px] uppercase tracking-widest font-bold mt-0.5">Elevation</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
