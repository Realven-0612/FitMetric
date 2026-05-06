import { Routes, Route, BrowserRouter } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Training from "./pages/Training";
import Scanner from "./pages/Scanner";
import Nutrition from "./pages/Nutrition";
import Profile from "./pages/Profile";
import Library from "./pages/Library";
import Watch from "./pages/Watch";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./components/AuthProvider";
import { TranslationProvider } from "./lib/i18n";
import { FitnessProvider } from "./components/FitnessProvider";
import { useEffect } from "react";
import { initMessaging } from "./lib/firebase";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";

export default function App() {
  useEffect(() => {
    const setupMessaging = async () => {
      const messaging = await initMessaging();
      if (messaging) {
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          toast(payload.notification?.title || 'Notification', {
            description: payload.notification?.body,
            icon: payload.notification?.icon ? <img src={payload.notification.icon} className="w-5 h-5 rounded" /> : null
          });
        });
      }
    };
    setupMessaging();
  }, []);

  return (
    <TranslationProvider>
      <AuthProvider>
        <FitnessProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/training" element={<Training />} />
                <Route path="/library" element={<Library />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/nutrition" element={<Nutrition />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/watch" element={<Watch />} />
              </Routes>
            </AppLayout>
            <Toaster />
          </BrowserRouter>
        </FitnessProvider>
      </AuthProvider>
    </TranslationProvider>
  );
}
