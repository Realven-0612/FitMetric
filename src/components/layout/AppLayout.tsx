import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutGrid, 
  CalendarDays, 
  UtensilsCrossed, 
  Maximize, 
  BookOpen, 
  Watch, 
  User, 
  LogOut, 
  Globe,
  Menu,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "../AIChatbot";
import { useTranslation } from "../../lib/i18n";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useTranslation();

  const navItems = [
    { name: t("dashboard"), href: "/", icon: LayoutGrid },
    { name: t("training"), href: "/training", icon: CalendarDays },
    { name: t("nutrition"), href: "/nutrition", icon: UtensilsCrossed },
    { name: t("scanner"), href: "/scanner", icon: Maximize },
    { name: t("library"), href: "/library", icon: BookOpen },
    { name: t("watch"), href: "/watch", icon: Watch },
    { name: t("profile"), href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 font-sans flex flex-col">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Top Navbar */}
      <header className="flex-none w-full p-4 lg:p-6 lg:pb-0 z-50">
        <div className="mx-auto flex items-center justify-between bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-6 py-4 flex-wrap lg:flex-nowrap gap-4">
          
          {/* Logo Area */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center mr-1 relative group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all duration-300 transform group-hover:scale-105">
                  <div className="w-full h-full bg-[#111111] rounded-[14px] flex items-center justify-center overflow-hidden relative">
                     <Activity className="h-6 w-6 text-cyan-400 absolute z-0 group-hover:scale-110 transition-transform duration-300" />
                     <img 
                        src="/assets/app_icon.png" 
                        alt="Logo" 
                        className="w-full h-full object-cover z-10 relative" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                     />
                  </div>
                </div>
              </div>
              <div className="border-l border-white/10 pl-4">
                <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
                  Fit<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-light">Metric</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1.5 rounded-xl w-24 h-16 text-[10px] font-bold tracking-wider transition-all border ${
                    isActive
                      ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                      : "bg-transparent text-slate-400 border-white/5 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-5 w-5 mb-0.5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
             <div className="flex items-center gap-1 bg-[#111111] border border-white/10 rounded-full p-1 shadow-inner">
                <button 
                  onClick={() => setLanguage('en')}
                  title="English"
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('vi')}
                  title="Tiếng Việt"
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${language === 'vi' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  VI
                </button>
             </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center">
            <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-transparent border-white/10 text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isOpen && (
          <div className="lg:hidden w-full bg-[#111111]/95 backdrop-blur-xl border border-white/5 rounded-2xl mt-4 p-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold tracking-wider transition-all border ${
                    isActive
                      ? "bg-cyan-400 text-black border-cyan-400"
                      : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}

            <div className="h-px bg-white/5 my-2" />
            
            <div className="flex items-center justify-between px-4 py-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" /> Language
              </span>
              <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-full p-1 shadow-inner">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center px-4 h-8 rounded-full text-[10px] font-black transition-all ${language === 'en' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:text-white'}`}
                >
                  ENGLISH
                </button>
                <button 
                  onClick={() => setLanguage('vi')}
                  className={`flex items-center justify-center px-4 h-8 rounded-full text-[10px] font-black transition-all ${language === 'vi' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-slate-400 hover:text-white'}`}
                >
                  TIẾNG VIỆT
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full p-4 lg:p-6 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
      <AIChatbot />
    </div>
  );
}
