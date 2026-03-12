
import React from 'react';
import { X, Zap, Target, Flame, ChevronRight, Trophy } from 'lucide-react';
import Button from './Button';
import { GameLevel } from '../types';

interface DifficultySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (difficulty: 'Easy' | 'Medium' | 'Hard') => void;
  level: GameLevel | null;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ isOpen, onClose, onSelect, level }) => {
  if (!isOpen || !level) return null;

  const basePoints = level.logic.winConditionScore;

  const options = [
    { 
      id: 'Easy' as const, 
      label: 'Chill', 
      desc: 'Slower pace.', 
      targetPoints: Math.floor(basePoints * 0.7),
      icon: <Zap className="text-emerald-400" size={16} />,
      color: 'from-emerald-500/10 to-teal-500/5',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400'
    },
    { 
      id: 'Medium' as const, 
      label: 'Standard', 
      desc: 'Normal chaos.', 
      targetPoints: basePoints,
      icon: <Target className="text-blue-400" size={16} />,
      color: 'from-blue-500/10 to-indigo-500/5',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400'
    },
    { 
      id: 'Hard' as const, 
      label: 'Insane', 
      desc: 'Hyper speed.', 
      targetPoints: Math.floor(basePoints * 1.5),
      icon: <Flame className="text-rose-400" size={16} />,
      color: 'from-rose-500/10 to-pink-500/5',
      borderColor: 'border-rose-500/20',
      textColor: 'text-rose-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative glass w-full max-w-sm sm:max-w-md max-h-[90dvh] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <header className="space-y-0.5 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase truncate vibrant-text">ARENA DEPLOY</h2>
            <p className="font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.2em] truncate vibrant-text-alt">{level.name}</p>
          </header>
          <button onClick={onClose} className="p-2 text-slate-400 active:scale-90 hover:text-blue-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto no-scrollbar pr-1 pb-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${opt.borderColor} bg-gradient-to-br ${opt.color} active:scale-98 transition-all text-left shadow-sm`}
            >
              <div className="p-3 bg-black/40 rounded-xl shrink-0">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-black italic tracking-tight ${opt.textColor} uppercase`}>{opt.label}</h4>
                <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                  <Trophy size={10} /> Goal: {opt.targetPoints} PTS
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500 shrink-0" />
            </button>
          ))}
        </div>
        
        <div className="pt-4 shrink-0">
          <Button onClick={onClose} variant="glass" className="w-full py-4 border-none shadow-none text-slate-400 text-[10px]">
            ABORT DEPLOYMENT
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DifficultySelector;
