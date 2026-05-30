import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutGrid, 
  CalendarDays, 
  UtensilsCrossed, 
  Maximize, 
  BookOpen, 
  Watch as WatchIcon, 
  User, 
  Globe,
  Menu,
  Activity,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "../AIChatbot";
import { useTranslation } from "../../lib/i18n";
import { useTheme } from "next-themes";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { name: t("dashboard"), href: "/", icon: LayoutGrid },
    { name: t("training"), href: "/training", icon: CalendarDays },
    { name: t("nutrition"), href: "/nutrition", icon: UtensilsCrossed },
    { name: t("scanner"), href: "/scanner", icon: Maximize },
    { name: t("library"), href: "/library", icon: BookOpen },
    { name: t("watch"), href: "/watch", icon: WatchIcon },
    { name: t("profile"), href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-200">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 opacity-40 dark:opacity-100">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 dark:bg-cyan-900/15 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-950/5 dark:bg-indigo-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Top Navbar */}
      <header className="flex-none w-full p-4 lg:p-6 lg:pb-0 z-50">
        <div className="mx-auto flex items-center justify-between bg-card/75 backdrop-blur-xl border border-border rounded-2xl px-6 py-3.5 flex-wrap lg:flex-nowrap gap-4 shadow-sm">
          
          {/* Logo Area */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center justify-center mr-1 relative group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-sm group-hover:scale-105 transition-all duration-300">
                  <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center overflow-hidden relative">
                     <Activity className="h-5 w-5 text-primary absolute z-0 group-hover:scale-110 transition-transform duration-300" />
                     <img 
                        src="/assets/app_icon.png" 
                        alt="Logo" 
                        className="w-full h-full object-cover z-10 relative" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                     />
                  </div>
                </div>
              </div>
              <div className="border-l border-border pl-4">
                <h1 className="text-xl font-black tracking-tight text-foreground mt-0.5">
                  Fit<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-500">Metric</span>
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 bg-muted/30 p-1 rounded-2xl border border-border/50">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 rounded-xl w-[7.5rem] px-1 h-14 text-[10px] font-bold tracking-wider text-center transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-95"
                      : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
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
             {/* Language Switcher */}
             <div className="flex items-center gap-1 bg-muted/55 border border-border rounded-full p-1 shadow-inner">
                <button 
                  onClick={() => setLanguage('en')}
                  title="English"
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all ${language === 'en' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('vi')}
                  title="Tiếng Việt"
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all ${language === 'vi' ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  VI
                </button>
             </div>

             {/* Theme Toggle */}
             {mounted && (
               <button
                 onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                 className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/40 border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
                 title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
               >
                 {resolvedTheme === "dark" ? (
                   <Sun className="h-4 w-4" />
                 ) : (
                   <Moon className="h-4 w-4" />
                 )}
               </button>
             )}
          </div>

          {/* Mobile Actions */}
          <div className="lg:hidden flex items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted/40 border border-border text-muted-foreground hover:text-foreground transition-all"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-transparent border-border text-foreground hover:bg-muted">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isOpen && (
          <div className="lg:hidden w-full bg-card/95 backdrop-blur-xl border border-border rounded-2xl mt-3 p-3 flex flex-col gap-1.5 shadow-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wider transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            ))}

            <div className="h-px bg-border my-1.5" />
            
            <div className="flex items-center justify-between px-4 py-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Language
              </span>
              <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-full p-1 shadow-inner">
                <button 
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center px-3.5 h-7 rounded-full text-[10px] font-black transition-all ${language === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setLanguage('vi')}
                  className={`flex items-center justify-center px-3.5 h-7 rounded-full text-[10px] font-black transition-all ${language === 'vi' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  VI
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
