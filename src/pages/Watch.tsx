import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Link2, Unlink, Watch as WatchIcon, BookOpen, Smartphone, Activity as ActivityIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "../lib/i18n";
import { useStore } from "../lib/store";

export default function Watch() {
  const { t, language } = useTranslation();
  const [stravaConnected, setStravaConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("strava_token");
    if (token) {
      setStravaConnected(true);
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("localhost") && !event.origin.endsWith(".run.app") && !event.origin.endsWith(".onrender.com") && !event.origin.endsWith(".render.com")) return;

      if (event.data?.type === "STRAVA_AUTH_SUCCESS") {
        localStorage.setItem("strava_token", JSON.stringify(event.data.payload));
        setStravaConnected(true);
        toast.success(t('strava_connected_successfully'));
      }

      if (event.data?.type === "STRAVA_AUTH_ERROR") {
        toast.error(`${t('strava_connection_failed')}: ${event.data.error}`);
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
        toast.error(t('strava_not_configured'));
      }
    } catch (err) {
      toast.error(t('strava_init_failed'));
    }
  };

  const disconnectStrava = () => {
    localStorage.removeItem("strava_token");
    setStravaConnected(false);
    toast.info(t('strava_disconnected'));
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
        <Card className="bg-[#111111]/80 backdrop-blur-md border border-white/5 relative overflow-hidden shadow-none rounded-3xl h-fit">
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

        {/* Strava Setup Guide Card */}
        <Card className="col-span-1 bg-[#111111]/80 backdrop-blur-md border border-white/5 relative shadow-none rounded-3xl h-fit">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-cyan-400 text-sm font-black uppercase tracking-wider">
              <BookOpen className="w-5 h-5"/> {language === 'vi' ? 'Hướng dẫn cài đặt & đồng bộ' : 'Setup & Sync Guide'}
            </CardTitle>
            <CardDescription className="text-cyan-200/60 font-medium">
              {language === 'vi' ? 'Các bước chi tiết để bắt đầu sử dụng Strava trên Android và iOS.' : 'Step-by-step instructions for getting started with Strava.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {language === 'vi' ? (
              <div className="space-y-6 text-sm text-slate-300">
                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><Smartphone className="w-4 h-4 text-cyan-400"/> 1. Cài đặt & Tạo tài khoản</h3>
                  <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="font-semibold text-cyan-300 mb-1">Android:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                        <li>Mở <strong>Google Play Store</strong>.</li>
                        <li>Tìm kiếm "Strava" và nhấn <strong>Cài đặt</strong>.</li>
                        <li>Mở ứng dụng và đăng ký bằng email, Google, hoặc Facebook.</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-semibold text-cyan-300 mb-1">iOS (iPhone):</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                        <li>Mở <strong>App Store</strong>.</li>
                        <li>Tìm kiếm "Strava" và nhấn <strong>Nhận</strong> (Get).</li>
                        <li>Mở ứng dụng và đăng ký bằng Apple ID, email, Google, hoặc FB.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><ActivityIcon className="w-4 h-4 text-orange-400"/> 2. Ghi lại một hoạt động</h3>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-400">
                      <li>Mở ứng dụng Strava.</li>
                      <li>Nhấn nút <strong>Record</strong> (vòng tròn giữa dưới cùng).</li>
                      <li>Chọn loại hoạt động (biểu tượng giày/xe đạp).</li>
                      <li>Nhấn <strong>Start</strong> để ghi lại.</li>
                      <li>Khi tập xong, nhấn <strong>Stop</strong>, rồi <strong>Finish</strong>.</li>
                      <li>Lưu với tiêu đề & bấm <strong>Save Activity</strong>.</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><WatchIcon className="w-4 h-4 text-green-400"/> 3. Kết nối thiết bị & App</h3>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-400">
                      <li>Tại ứng dụng FitMetric này, nhấn nút <strong>Kết nối với Strava</strong> ở trên.</li>
                      <li>Đồng ý cấp quyền trên trình duyệt mở ra.</li>
                      <li>Để nối đồng hồ thông minh (Garmin, Apple Watch...): Vào app Strava &gt; Tab <strong>You</strong> &gt; <strong>Settings</strong> &gt; <strong>Link Other Services</strong> (hoặc <strong>Sensors</strong> cho đai tim) và làm theo hướng dẫn.</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-sm text-slate-300">
                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><Smartphone className="w-4 h-4 text-cyan-400"/> 1. Installation & Account Setup</h3>
                  <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="font-semibold text-cyan-300 mb-1">Android:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                        <li>Open the <strong>Google Play Store</strong>.</li>
                        <li>Search for "Strava" and tap <strong>Install</strong>.</li>
                        <li>Open the app and sign up using your email, Google, or FB account.</li>
                      </ol>
                    </div>
                    <div>
                      <p className="font-semibold text-cyan-300 mb-1">iOS (iPhone):</p>
                      <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-400">
                        <li>Open the <strong>App Store</strong>.</li>
                        <li>Search for "Strava" and tap <strong>Get</strong>.</li>
                        <li>Open the app and sign up using your Apple ID, email, Google, or FB.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><ActivityIcon className="w-4 h-4 text-orange-400"/> 2. Tracking an Activity</h3>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-400">
                      <li>Open the Strava app.</li>
                      <li>Tap the <strong>Record</strong> button (circular icon at the bottom center).</li>
                      <li>Select your activity type by tapping the shoe/bike icon.</li>
                      <li>Tap <strong>Start</strong> to begin recording.</li>
                      <li>Once finished, tap <strong>Stop</strong>, then <strong>Finish</strong>.</li>
                      <li>Save with a title by tapping <strong>Save Activity</strong>.</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2 tracking-wide uppercase text-xs"><WatchIcon className="w-4 h-4 text-green-400"/> 3. Connecting App & Devices</h3>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                    <ol className="list-decimal list-inside space-y-2 ml-1 text-slate-400">
                      <li>Using this FitMetric app, tap the <strong>Connect with Strava</strong> button above.</li>
                      <li>Authorize the connection in the opened browser window.</li>
                      <li>To connect smartwatches (Garmin, Apple Watch, etc.): In the Strava app &gt; <strong>You</strong> tab &gt; <strong>Settings</strong> &gt; <strong>Link Other Services</strong> (or <strong>Sensors</strong> for HR monitors) and follow instructions.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
