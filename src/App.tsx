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
import { useStore } from "./lib/store";
import { useEffect, useState } from "react";
import OnboardingScreen from "./components/OnboardingScreen";

export default function App() {
  const checkAndResetDaily = useStore(state => state.checkAndResetDaily);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("fitmetric_onboarding_done");
  });

  useEffect(() => {
    checkAndResetDaily();
  }, [checkAndResetDaily]);

  return (
    <TranslationProvider>
      <AuthProvider>
        <BrowserRouter>
          {showOnboarding ? (
            <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
          ) : (
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
          )}
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: '#1e2330',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f1f5f9',
                fontFamily: "'Be Vietnam Pro', sans-serif",
                fontSize: '13px',
                borderRadius: '12px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </TranslationProvider>
  );
}
