import React, { useState } from 'react';
import { Gamepad2, ArrowLeft, Plus } from 'lucide-react';
import SnakeGame from './games/SnakeGame';

interface NewGamesHubProps {
  isAdmin?: boolean;
}

const NewGamesHub: React.FC<NewGamesHubProps> = ({ isAdmin = true }) => {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const games = [
    {
      id: 'snake',
      name: 'Retro Snake',
      description: 'Classic point-eating snake game. Offline compatible.',
      icon: <Gamepad2 size={24} className="text-emerald-500" />,
      color: 'bg-emerald-500'
    }
  ];

  if (activeGame === 'snake') {
    return <SnakeGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <div className="min-h-[100dvh] pb-32 pt-safe relative overflow-x-hidden p-6 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase vibrant-text">New Games Base</h1>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Offline Supported Archive</p>
          </div>
          {isAdmin && (
            <button className="flex items-center gap-2 p-3 sm:px-4 sm:py-3 bg-blue-600 text-white rounded-2xl shadow-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest">
              <Plus size={16} />
              <span className="hidden sm:inline">Add Game</span>
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
          {games.map(game => (
            <div key={game.id} className="glass p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col gap-4 relative group overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 active:scale-95">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${game.color}/20 rounded-2xl flex items-center justify-center shrink-0`}>
                  {game.icon}
                </div>
                <div>
                  <h3 className="text-lg font-black italic text-slate-900 dark:text-white uppercase tracking-tight">{game.name}</h3>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Offline Ready</span>
                </div>
              </div>
              
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">{game.description}</p>
              
              <button 
                onClick={() => setActiveGame(game.id)}
                className="w-full mt-auto py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform"
              >
                Play Now
              </button>
            </div>
          ))}
          
          {games.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
              <Gamepad2 size={48} className="mb-4 text-slate-500" />
              <h3 className="text-xl font-black italic uppercase tracking-tighter">No Games Yet</h3>
              <p className="text-sm font-bold mt-2">More generic offline games coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewGamesHub;
