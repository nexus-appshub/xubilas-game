
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const UpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="glass rounded-3xl p-6 border-fuchsia-500/30 shadow-2xl shadow-fuchsia-500/10 backdrop-blur-3xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center shrink-0">
            <RefreshCw className={`text-fuchsia-500 ${needRefresh ? 'animate-spin' : ''}`} size={24} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              {needRefresh ? 'Update Available' : 'Ready for Offline'}
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              {needRefresh 
                ? 'A new version of the neural arena is ready. Upgrade now for the latest features.' 
                : 'Neural Link established. You can now access the arena without a connection.'}
            </p>
          </div>
          <button onClick={close} className="p-1 hover:text-fuchsia-500 transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {needRefresh && (
          <button
            onClick={() => updateServiceWorker(true)}
            className="w-full py-4 rounded-2xl bg-linear-to-r from-fuchsia-600 to-blue-600 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-fuchsia-600/20"
          >
            Update Now
          </button>
        )}
      </div>
    </div>
  );
};

export default UpdatePrompt;
