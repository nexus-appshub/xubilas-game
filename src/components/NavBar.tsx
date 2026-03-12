
import React from 'react';
import { Home, Compass, Hammer, User, Sun, Moon } from 'lucide-react';
import { AppView } from '../types';
import { soundService } from '../services/soundService';

interface NavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, onNavigate, theme, toggleTheme }) => {
  const tabs = [
    { id: 'home', icon: <Home size={18} />, label: 'Home' },
    { id: 'hub', icon: <Compass size={18} />, label: 'Browse' },
    { id: 'editor', icon: <Hammer size={18} />, label: 'Create' },
    { id: 'profile', icon: <User size={18} />, label: 'Profile' }
  ];

  const handleNav = (id: string) => {
    soundService.playClick();
    onNavigate(id as AppView);
  };

  const handleToggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundService.playClick();
    toggleTheme();
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-md sm:max-w-lg">
      <div className="glass rounded-[2rem] p-2 shadow-2xl flex items-center justify-between gap-2 relative overflow-hidden border-slate-200 dark:border-white/10 backdrop-blur-2xl">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNav(tab.id)}
              className={`
                relative flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300 active:scale-90 overflow-hidden
                ${isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}
              `}
            >
              <div className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-300 z-10`}>
                {tab.icon}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest mt-1 z-10 ${isActive ? 'block vibrant-text' : 'hidden'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        
        <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1" />

        <button
          onClick={handleToggleTheme}
          className="p-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-90"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
