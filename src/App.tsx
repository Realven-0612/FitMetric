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

export default function App() {
  return (
    <TranslationProvider>
      <AuthProvider>
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
      </AuthProvider>
    </TranslationProvider>
  );
}
