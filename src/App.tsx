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
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { TranslationProvider } from "./lib/i18n";
import { useStore } from "./lib/store";
import { useEffect, useState } from "react";
import OnboardingScreen from "./components/OnboardingScreen";
import ErrorBoundary from "./components/ErrorBoundary";

// Splash screen shown while Firebase resolves auth state
function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center gap-5">
      <img
        src="/assets/app_icon.png"
        alt="FitMetric"
        className="w-20 h-20 rounded-3xl object-cover drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] animate-pulse"
      />
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function AppShell() {
  const { loading, user, hasCompleteProfile } = useAuth();
  const checkAndResetDaily = useStore(state => state.checkAndResetDaily);
  const profile = useStore(state => state.profile);

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkAndResetDaily();
  }, [checkAndResetDaily]);

  // Wait for Firebase to finish initialising before making any routing decision
  useEffect(() => {
    if (loading) return;

    if (user) {
      // Signed-in user: skip onboarding if their Firestore profile is complete
      if (hasCompleteProfile) {
        localStorage.setItem("fitmetric_onboarding_done", "true");
        setShowOnboarding(false);
      } else {
        // Signed-in but profile incomplete → show onboarding (pre-filled with Google name)
        setShowOnboarding(true);
      }
    } else {
      // Guest: fall back to localStorage flag
      const done = !!localStorage.getItem("fitmetric_onboarding_done");
      setShowOnboarding(!done);
    }
  }, [loading, user, hasCompleteProfile]);

  // Show splash while Firebase / Firestore is loading OR routing decision not yet made
  if (loading || showOnboarding === null) return <SplashScreen />;

  return (
    <>
      {showOnboarding ? (
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      ) : (
        <AppLayout>
          <Routes>
            <Route path="/" element={<ErrorBoundary label="Dashboard"><Dashboard /></ErrorBoundary>} />
            <Route path="/training" element={<ErrorBoundary label="Training"><Training /></ErrorBoundary>} />
            <Route path="/library" element={<ErrorBoundary label="Library"><Library /></ErrorBoundary>} />
            <Route path="/scanner" element={<ErrorBoundary label="Scanner"><Scanner /></ErrorBoundary>} />
            <Route path="/nutrition" element={<ErrorBoundary label="Nutrition"><Nutrition /></ErrorBoundary>} />
            <Route path="/profile" element={<ErrorBoundary label="Profile"><Profile /></ErrorBoundary>} />
            <Route path="/watch" element={<ErrorBoundary label="Watch"><Watch /></ErrorBoundary>} />
          </Routes>
        </AppLayout>
      )}
    </>
  );
}

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
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
