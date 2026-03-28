import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
      // Show banner after 3 seconds if not already installed
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onClick = (evt: React.MouseEvent) => {
    evt.preventDefault();
    if (!promptInstall) return;
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
        setShowBanner(false);
      } else {
        console.log("User dismissed the install prompt");
      }
    });
  };

  if (!supportsPWA) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="fixed bottom-8 left-8 right-8 md:left-auto md:right-12 md:w-96 z-50"
        >
          <div className="bg-brand-card border border-white/10 p-6 rounded-[2rem] shadow-2xl backdrop-blur-xl flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-brand-accent/20 transition-all" />
            
            <div className="bg-brand-accent/20 p-4 rounded-2xl text-brand-accent shadow-inner relative z-10">
              <Download size={28} />
            </div>
            
            <div className="flex-1 relative z-10">
              <p className="font-black text-white tracking-tight">Instalar App</p>
              <p className="text-xs text-brand-text-muted font-bold leading-tight mt-1">Accede más rápido desde tu pantalla de inicio.</p>
            </div>

            <div className="flex flex-col gap-3 relative z-10">
              <button 
                onClick={onClick}
                className="bg-brand-accent text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-accent/90 transition-all active:scale-95 shadow-lg shadow-brand-accent/20"
              >
                Instalar
              </button>
              <button 
                onClick={() => setShowBanner(false)}
                className="text-brand-text-muted hover:text-white transition-colors flex items-center justify-center p-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
