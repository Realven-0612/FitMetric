import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Link2, Unlink, Watch as WatchIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n";

export default function Watch() {
  const { t } = useTranslation();
  const [stravaConnected, setStravaConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("strava_token");
    if (token) {
      setStravaConnected(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("localhost") && !event.origin.endsWith(".run.app")) return;

      if (event.data?.type === "STRAVA_AUTH_SUCCESS") {
        localStorage.setItem("strava_token", JSON.stringify(event.data.payload));
        setStravaConnected(true);
        toast.success(t('strava_connected_successfully', { defaultValue: 'Strava connected successfully!' }));
      }

      if (event.data?.type === "STRAVA_AUTH_ERROR") {
        toast.error(`${t('strava_connection_failed', { defaultValue: 'Strava connection failed' })}: ${event.data.error}`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [t]);

  const connectStrava = async () => {
    try {
      const response = await fetch("/api/strava/auth");
      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, "strava_auth", "width=600,height=700");
      } else {
        toast.error(t('strava_not_configured', { defaultValue: 'Strava client not configured on server.' }));
      }
    } catch (err) {
      toast.error(t('strava_init_failed', { defaultValue: 'Failed to initiate Strava connection.' }));
    }
  };

  const disconnectStrava = () => {
    localStorage.removeItem("strava_token");
    setStravaConnected(false);
    toast.info(t('strava_disconnected', { defaultValue: 'Strava disconnected.' }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111111]/80 backdrop-blur-md p-6 rounded-3xl border border-white/5">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
               <WatchIcon className="w-7 h-7 text-orange-400" />
            </div>
            <div>
               <h1 className="text-xl font-black text-white uppercase tracking-wider">{t('wearables')}</h1>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('device_connectivity')}</p>
            </div>
         </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 relative overflow-hidden shadow-none rounded-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fc4c02]/10 rounded-full blur-[60px] pointer-events-none"></div>
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-[#fc4c02] text-sm font-black uppercase tracking-wider">
              <Activity className="w-5 h-5"/> {t('strava_integration')}
            </CardTitle>
            <CardDescription className="text-orange-200/60 font-medium">{t('strava_sync_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stravaConnected ? (
              <div className="space-y-4 relative z-10">
                 <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#fc4c02]/20 flex items-center justify-center">
                       <Activity className="w-6 h-6 text-[#fc4c02]" />
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse"></div>
                          <span className="font-bold text-white text-sm">{t('strava_connected_status')}</span>
                       </div>
                       <span className="text-[10px] uppercase font-bold tracking-widest text-[#fc4c02]">{t('strava_syncing')}</span>
                    </div>
                 </div>
                 <Button onClick={disconnectStrava} variant="outline" className="w-full hover:bg-red-500/10 hover:text-red-400 border-white/5 bg-black/20 text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs h-12">
                   <Unlink className="w-4 h-4 mr-2"/> {t('disconnect_strava')}
                 </Button>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                 <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
                    {t('strava_connect_desc')}
                 </p>
                 <Button onClick={connectStrava} className="w-full bg-[#fc4c02] text-white hover:bg-[#fc4c02]/80 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#fc4c02]/20 border-none h-12 text-xs">
                   <Link2 className="w-4 h-4 mr-2"/> {t('connect_strava_btn')}
                 </Button>
                 <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-wide">
                    <strong className="text-orange-400">Developer Note:</strong> {t('strava_dev_note').replace('Developer Note:', '')}
                 </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
