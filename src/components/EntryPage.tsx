import React, { useState, useEffect } from 'react';
import Button from './Button';
import { Smartphone, Download, Zap, Shield, Cpu, Activity, X } from 'lucide-react';

interface EntryPageProps {
  onEnter: () => void;
  onPlayFeatured: () => void;
}

const EntryPage: React.FC<EntryPageProps> = ({ onEnter, onPlayFeatured }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [syncAction, setSyncAction] = useState<'home' | 'play'>('home');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Automatically show our custom pop-up after a short delay
      setTimeout(() => setShowInstallPopup(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleSync = (action: 'home' | 'play') => {
    setSyncAction(action);
    setIsSyncing(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          if (action === 'home') {
            onEnter();
          } else {
            onPlayFeatured();
          }
          // Reset for potential back navigation
          setTimeout(() => {
            setIsSyncing(false);
            setSyncProgress(0);
          }, 1000);
        }, 500);
      }
      setSyncProgress(progress);
    }, 150);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the browser install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setDeferredPrompt(null);
      setShowInstallPopup(false);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center bg-app-bg overflow-x-hidden p-4 sm:p-8 transition-colors duration-500">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 dark:bg-fuchsia-600/20 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full animate-float [animation-delay:2s]" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-2xl flex flex-col items-center gap-12 sm:gap-16 text-center">
        {/* Logo Section */}
        <div className="space-y-6 sm:space-y-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600 to-blue-600 blur-2xl opacity-20 dark:opacity-40 group-hover:opacity-70 transition-opacity rounded-full" />
            <div className="relative w-32 h-32 sm:w-56 sm:h-56 glass rounded-[3rem] sm:rounded-[4rem] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
              <span className="text-6xl sm:text-9xl animate-pulse drop-shadow-2xl">🧠</span>
              {/* Spinning Ring */}
              <div className="absolute inset-2 border-2 border-dashed border-fuchsia-500/20 dark:border-fuchsia-500/30 rounded-[2.5rem] sm:rounded-[3.5rem] animate-[spin_10s_linear_infinite]" />
            </div>
          </div>

          <div className="space-y-2 px-2 w-full">
            <h1 className="flex flex-col items-center justify-center text-4xl sm:text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.85] drop-shadow-2xl vibrant-text">
              <span className="mb-2 sm:mb-0">XUBILAS</span>
              <span className="gradient-text">MIND WHACK</span>
            </h1>
            <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mt-4">
               <Activity size={12} className="text-fuchsia-500 sm:w-4 sm:h-4" /> 
               Game Ready 
               <Activity size={12} className="text-blue-500 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full max-w-sm sm:max-w-md space-y-4 px-2">
          {!isSyncing ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
              <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
                {/* Modern Game Style Button: Start */}
                <Button 
                  onClick={() => handleSync('play')} 
                  variant="primary" 
                  size="lg" 
                  className="w-full sm:w-auto px-4 sm:px-20 py-4 sm:py-5 text-xl sm:text-3xl rounded-full border-2 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] hover:scale-105 active:scale-95 group overflow-hidden transition-all duration-500"
                >
                  <div className="flex items-center justify-center gap-3 sm:gap-4 w-full px-2">
                    <span className="text-xl sm:text-2xl group-hover:animate-pulse transition-transform duration-500 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">🎮</span> 
                    <span className="tracking-tighter font-black drop-shadow-lg text-center whitespace-nowrap">START GAME</span>
                  </div>
                </Button>

                {/* Modern Game Style Button: Home */}
                <Button 
                  onClick={() => handleSync('home')} 
                  variant="glass" 
                  size="lg" 
                  className="w-full sm:w-[80%] px-4 sm:px-16 py-3 sm:py-3.5 text-sm sm:text-base rounded-full border border-blue-500/40 backdrop-blur-xl shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 overflow-hidden transition-all duration-500 group"
                >
                  <div className="flex items-center justify-center gap-2 sm:gap-3 w-full px-2">
                    <span className="text-base sm:text-lg group-hover:scale-110 transition-transform duration-500">🏠</span> 
                    <span className="tracking-widest font-black opacity-90 group-hover:opacity-100 italic text-center whitespace-nowrap text-slate-800 dark:text-white">HOME</span>
                  </div>

                  {/* Scanline effect */}
                  <div className="absolute inset-0 bg-linear-to-b from-transparent via-blue-400/10 to-transparent h-[4px] w-full animate-[scanline_3s_linear_infinite] pointer-events-none" />
                </Button>
              </div>

              <div className="flex justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <Shield size={10} /> Secure Protocol
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <Zap size={10} /> Latency: 4ms
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6 animate-in zoom-in duration-300">
               <div className="h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-fuchsia-600 to-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
               </div>
               <div className="flex flex-col gap-2">
                 <div className="text-xs font-black text-fuchsia-500 uppercase tracking-[0.3em] animate-pulse">
                   {syncAction === 'play' ? 'Loading Featured Level...' : 'Synchronizing Neural Link...'}
                 </div>
                 <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                   Progress: {Math.floor(syncProgress)}%
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <footer className="mt-8 flex flex-col items-center gap-3">
           <a 
            href="https://riajuldaian-arpon.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-6 py-2 glass border-white/5 rounded-full hover:border-blue-500/30 transition-all"
           >
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
             <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-400 uppercase tracking-widest transition-colors">
               Created by Arpon
             </span>
           </a>

           <a 
            href="https://xubilas-webdevcorp.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 glass border-white/5 rounded-full hover:border-fuchsia-500/30 transition-all text-center"
           >
             <div className="w-1.5 h-1.5 shrink-0 bg-fuchsia-500 rounded-full animate-pulse shadow-[0_0_8px_#d946ef]" />
             <span className="text-[8px] sm:text-[9px] font-black text-slate-500 group-hover:text-fuchsia-400 uppercase tracking-widest transition-colors leading-tight">
               Designed and developed by <span className="text-fuchsia-500 block sm:inline">Xubilas Web Dev Corp</span>
             </span>
           </a>

        </footer>
      </div>

      {/* Pop-up Install Modal */}
      {showInstallPopup && deferredPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowInstallPopup(false)} />
           <div className="relative glass w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl border-white/10 overflow-hidden animate-in slide-in-from-bottom-10">
              <header className="flex justify-between items-start">
                 <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Install MindWhack</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Optimize your neural link for the best mobile arena experience.</p>
                 </div>
                 <button onClick={() => setShowInstallPopup(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </header>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                 <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/10">
                    🧠
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">Neural Arena v1.2</div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Performance & Offline Mode</div>
                 </div>
              </div>

              <div className="space-y-3">
                 <Button onClick={handleInstallClick} variant="primary" size="lg" className="w-full py-5 rounded-full text-base italic tracking-tighter">
                   <Download size={20} className="mr-2" /> ADD TO HOME SCREEN
                 </Button>
                 <button onClick={() => setShowInstallPopup(false)} className="w-full py-3 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                   Maybe Later
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EntryPage;
