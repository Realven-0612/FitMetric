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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "DASHBOARD", href: "/", icon: LayoutGrid },
    { name: "TRAINING", href: "/training", icon: CalendarDays },
    { name: "NUTRITION", href: "/nutrition", icon: UtensilsCrossed },
    { name: "SCANNER", href: "/scanner", icon: Maximize },
    { name: "LIBRARY", href: "/library", icon: BookOpen },
    { name: "WATCH", href: "/watch", icon: Watch },
    { name: "PROFILE", href: "/profile", icon: User },
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
                        src="/assets/logo.png" 
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
             <Button variant="outline" className="rounded-full bg-transparent border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 gap-2 h-10 px-5 text-xs font-bold tracking-wider uppercase">
                <LogOut className="w-4 h-4" /> Login
             </Button>
             <Button variant="outline" size="icon" className="rounded-full bg-transparent border-white/10 text-slate-400 hover:bg-white/5 hover:text-white h-10 w-10">
                <Globe className="w-4 h-4" />
             </Button>
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
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full p-4 lg:p-6 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
