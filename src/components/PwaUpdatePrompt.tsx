import React, { useState, useEffect } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function PwaUpdatePrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  const { isWhiteTheme } = useTheme();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
  };

  return (
    <>
      {isOffline && (
        <div className={`fixed bottom-3 left-3 right-3 sm:left-auto sm:right-3 max-w-sm p-3 rounded shadow-xl flex items-center justify-between text-xs z-50 font-mono border ${
          isWhiteTheme
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : 'bg-[#2e0912] border-[#ff3366] text-[#ff99aa]'
        }`}>
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600" />
            <span>OFFLINE // CACHED VECTOR PROTOCOLS ACTIVE</span>
          </div>
        </div>
      )}

      {showInstall && (
        <div className={`fixed bottom-3 left-3 right-3 sm:left-auto sm:right-3 max-w-sm p-3 rounded shadow-2xl flex items-center justify-between text-xs z-50 font-mono border ${
          isWhiteTheme
            ? 'bg-white border-slate-300 text-slate-800'
            : 'bg-[#081224] border-[#00ffcc] text-[#c0d4ec]'
        }`}>
          <div className="flex items-center gap-2">
            <Download className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <div>
              <div className={`font-bold ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>INSTALL PWA MESH</div>
              <div className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#6e89ac]'}`}>
                Standalone High-Density Telemetry
              </div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className={`px-3 py-1 font-bold rounded cursor-pointer ${
              isWhiteTheme
                ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm'
                : 'bg-[#00ffcc] hover:bg-[#33ffdd] text-[#060a13]'
            }`}
          >
            INSTALL
          </button>
        </div>
      )}
    </>
  );
}
