
import React from 'react';
import Button from './Button';
import { Play, Trophy, LayoutGrid, ChevronRight, Activity, Zap, Cpu, Users, Star, Shield, Settings } from 'lucide-react';
import { UserStats, GameLevel } from '../types';

interface HomePageProps {
  stats: UserStats;
  featuredLevel: GameLevel;
  onPlayFeatured: (level: GameLevel) => void;
  onGoToHub: () => void;
  onUpgrade: () => void;
  onOpenSettings: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ stats, featuredLevel, onPlayFeatured, onGoToHub, onUpgrade, onOpenSettings }) => {
  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-10 pt-[calc(2rem+env(safe-area-inset-top))] pb-28 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Top Status Bar (Pilot Identity) */}
      <header className="flex items-center gap-4 glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-sm">
         <div className="absolute top-0 right-0 w-24 h-full bg-blue-600/5 blur-3xl pointer-events-none" />
         
         <div className="relative">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border border-fuchsia-500/20 shadow-lg relative group bg-slate-200 dark:bg-slate-800">
              <img src={stats.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="pilot" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-[7px] sm:text-[9px] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg border border-white/20 shadow-md text-white">
               L{Math.floor(stats.xp / 1000)}
            </div>
         </div>

         <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-3xl font-black italic tracking-tighter leading-none mb-0.5 truncate uppercase vibrant-text">
              {stats.username}
            </h2>
            <div className="flex items-center gap-1 text-[7px] sm:text-[10px] font-black text-fuchsia-500 dark:text-fuchsia-400 uppercase tracking-widest opacity-80">
               <Shield size={10} className="text-blue-500" /> {stats.rank}
            </div>
         </div>

         <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
               <button 
                 onClick={onOpenSettings}
                 className="p-2 sm:p-3 glass rounded-xl sm:rounded-2xl text-slate-500 hover:text-blue-500 active:scale-90 transition-all"
                 title="Settings"
               >
                 <Settings size={18} className="sm:w-6 sm:h-6" />
               </button>
               <div className="flex flex-col items-end">
                  <div className="text-xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 leading-none tracking-tighter tabular-nums">
                    {stats.totalWhacks}
                  </div>
                  <div className="text-[6px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Score</div>
               </div>
            </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        {/* Highlight Mission Card */}
        <section 
          className="lg:col-span-2 relative glass rounded-3xl p-5 sm:p-8 space-y-4 sm:space-y-6 group active:scale-[0.98] transition-all overflow-hidden shadow-sm cursor-pointer"
          onClick={() => onPlayFeatured(featuredLevel)}
        >
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-fuchsia-600/5 via-transparent to-blue-600/5 pointer-events-none" />
           
           <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-fuchsia-500/10 rounded-full border border-fuchsia-500/20">
                    <Trophy size={12} className="text-fuchsia-600" />
                    <span className="text-[8px] sm:text-[10px] font-black text-fuchsia-600 uppercase tracking-widest">FEATURED LEVEL</span>
                 </div>
                 <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-black text-[10px] sm:text-xs">
                    <Star size={12} fill="currentColor" /> {featuredLevel.rating}
                 </div>
              </div>

              <div className="space-y-2">
                 <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none truncate vibrant-text">
                   {featuredLevel.name}
                 </h1>
                 <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-snug line-clamp-2 opacity-80">
                   {featuredLevel.description}
                 </p>
              </div>

              <div className="flex items-center gap-6 sm:gap-10">
                 <div className="flex flex-col">
                    <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">PLAYERS</span>
                    <div className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                       <Users size={12} className="text-blue-600" /> {featuredLevel.plays.toLocaleString()}
                    </div>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[7px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">SIZE</span>
                    <div className="text-[10px] sm:text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                       <LayoutGrid size={12} className="text-fuchsia-600" /> {featuredLevel.gridSize}x{featuredLevel.gridSize}
                    </div>
                 </div>
              </div>

              <Button onClick={() => onPlayFeatured(featuredLevel)} variant="primary" className="w-full py-4 sm:py-6 rounded-2xl sm:rounded-3xl">
                 <div className="flex items-center justify-center gap-3">
                    <Play size={20} fill="currentColor" />
                    <span className="text-lg sm:text-2xl italic tracking-tighter">PLAY NOW</span>
                 </div>
              </Button>
           </div>
        </section>

        {/* Navigation Sub-Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
           <button 
             onClick={onGoToHub}
             className="group flex flex-col items-center justify-center p-5 sm:p-8 glass rounded-2xl sm:rounded-3xl hover:bg-white/30 dark:hover:bg-white/[0.03] transition-all active:scale-95 shadow-sm"
           >
              <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-blue-500/5 rounded-xl sm:rounded-2xl mb-3 group-hover:bg-blue-500/10 transition-all">
                 <Activity size={24} className="text-blue-600 sm:w-8 sm:h-8" />
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Browse Levels</span>
           </button>
           
           <button 
             onClick={onUpgrade}
             className="group flex flex-col items-center justify-center p-5 sm:p-8 glass rounded-2xl sm:rounded-3xl hover:bg-white/30 dark:hover:bg-white/[0.03] transition-all active:scale-95 shadow-sm"
           >
              <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-purple-500/5 rounded-xl sm:rounded-2xl mb-3 group-hover:bg-purple-500/10 transition-all">
                 <Zap size={24} className="text-purple-600 sm:w-8 sm:h-8" />
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Upgrade Mission</span>
           </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
