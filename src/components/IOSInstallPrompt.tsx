import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Detect if the device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if it's already installed as PWA (standalone mode)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    // Check if user previously dismissed
    const hasBeenDismissed = localStorage.getItem('iosInstallPromptDismissed') === 'true';

    // Show if it's an iOS device, running in browser, and hasn't been dismissed
    if (isIos && !isInStandaloneMode && !hasBeenDismissed) {
      // Delay prompt slightly to not annoy user immediately on load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('iosInstallPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#1e1e24] border border-cyan-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <img src="/assets/app_icon.png" alt="FitMetric" className="w-6 h-6 rounded-md" />
          Cài đặt FitMetric
        </h3>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>
      
      <p className="text-sm text-slate-300">
        Cài đặt app vào iPhone để nhận thông báo sức khỏe và sử dụng mượt mà hơn.
      </p>
      
      <div className="bg-black/30 rounded-xl p-3 text-sm text-slate-200 flex items-center justify-center gap-2 mt-1">
        <span>Nhấn</span>
        <Share size={18} className="text-cyan-400" />
        <span>sau đó chọn</span>
        <PlusSquare size={18} className="text-cyan-400" />
        <span className="font-medium">Thêm vào MH chính</span>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;
