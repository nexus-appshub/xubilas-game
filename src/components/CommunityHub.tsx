
import React from 'react';
import { GameLevel, TargetType } from '../types';
import Button from './Button';
import GameHole from './GameHole';
import { LayoutGrid, Play, Plus, Star, Users, Download, Share2, Edit3, Zap, Lock } from 'lucide-react';

interface CommunityHubProps {
  levels: GameLevel[];
  onPlay: (level: GameLevel) => void;
  onCreate: () => void;
  onImport: (level: GameLevel) => void;
  onEdit: (level: GameLevel) => void;
}

const CommunityHub: React.FC<CommunityHubProps> = ({ levels, onPlay, onCreate, onImport, onEdit }) => {
  const handleImport = () => {
    const code = prompt("Enter Level Data Packet (Base64 Code):");
    if (!code) return;
    try {
      const data = JSON.parse(atob(code));
      const newLevel: GameLevel = {
        ...data,
        id: 'imported-' + Math.random().toString(36).substr(2, 5),
        author: data.author || 'Foreign Pilot',
        createdAt: Date.now(),
        plays: 0,
        rating: 5.0,
        ratingCount: 1
      };
      onImport(newLevel);
    } catch (e) {
      alert("Invalid Data Packet Protocol.");
    }
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto p-4 sm:p-8 space-y-8 sm:space-y-12 pt-8 animate-in fade-in duration-500">
      <header className="px-2 space-y-1 sm:space-y-2">
        <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter uppercase leading-none vibrant-text">
          BROWSE LEVELS
        </h1>
        <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.4em]">Community Creations</p>
      </header>

      {/* Action Button Strip */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button onClick={onCreate} variant="secondary" className="flex-1 py-4 sm:py-6 rounded-2xl shadow-none bg-slate-900 dark:bg-slate-800 text-white dark:text-white">
          <Plus size={20} className="mr-2" /> CREATE NEW
        </Button>
        <button 
          onClick={handleImport}
          className="flex items-center justify-center gap-2 px-6 py-4 sm:py-6 bg-slate-200/50 dark:bg-white/5 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <Download size={20} />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Import</span>
        </button>
      </div>

      {/* Scrolling Level Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pb-24">
        {levels.map(level => (
          <div 
            key={level.id} 
            className="group glass rounded-[2rem] p-5 sm:p-6 active:bg-slate-200/50 dark:active:bg-white/[0.03] transition-all shadow-sm cursor-pointer hover:scale-[1.02] duration-300"
            onClick={() => onPlay(level)}
          >
            <div className="flex flex-col h-full justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-blue-500/20 rounded text-[8px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    @{level.author}
                  </div>
                  {level.isLocalOnly && (
                    <div className="px-2 py-0.5 bg-amber-500/20 rounded text-[8px] sm:text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                      <Lock size={10} /> Local Only
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-black text-[10px] sm:text-xs">
                    <Star size={12} fill="currentColor" /> {level.rating}
                  </div>
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-black leading-tight vibrant-text-alt">{level.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-sm font-medium line-clamp-2 leading-relaxed">
                  {level.description}
                </p>
                
                <div className="flex items-center gap-4 text-[9px] sm:text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest pt-1">
                  <span className="flex items-center gap-1"><Users size={14} /> {level.plays.toLocaleString()} Plays</span>
                  <span className="flex items-center gap-1"><LayoutGrid size={14} /> {level.gridSize}x{level.gridSize} Board</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-2xl border-black/10 dark:border-white/10 flex items-center justify-center p-2 shadow-inner">
                   <div className="scale-50 sm:scale-75">
                      {(() => {
                        const weights = level.logic.targetWeights;
                        const mostWeightedType = Object.entries(weights).reduce((a, b) => a[1] > b[1] ? a : b)[0] as TargetType;
                        return (
                          <GameHole 
                            isActive={true} 
                            type={mostWeightedType} 
                            onHit={() => {}} 
                            theme={level.logic.boardTheme || 'Cyber'}
                            customIcons={level.logic.customIcons}
                            disabled
                          />
                        );
                      })()}
                   </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(level);
                    }}
                    className="flex items-center gap-2 px-4 py-3 glass rounded-xl text-fuchsia-500 hover:bg-fuchsia-500/10 active:scale-90 transition-all border border-fuchsia-500/20 shadow-sm"
                    title="Upgrade Level"
                  >
                    <Zap size={16} className="fill-fuchsia-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Upgrade</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const shareData = {
                        title: `Play ${level.name} on MindWhack`,
                        text: `Check out this level on MindWhack: ${level.description}`,
                        url: window.location.origin
                      };
                      if (navigator.share) {
                        navigator.share(shareData);
                      } else {
                        const code = btoa(JSON.stringify(level));
                        navigator.clipboard.writeText(code);
                        alert("Level code copied to clipboard!");
                      }
                    }}
                    className="p-3 glass rounded-full text-slate-500 hover:text-blue-600 active:scale-90 transition-transform"
                  >
                    <Share2 size={20} />
                  </button>
                  <button className="p-3 bg-blue-600 rounded-full text-white shadow-lg active:scale-90 transition-transform">
                    <Play size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityHub;
