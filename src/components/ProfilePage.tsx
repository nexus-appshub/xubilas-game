
import React, { useState } from 'react';
import { UserStats, GameLevel } from '../types';
import Button from './Button';
import { Settings, LogOut, Award, Star, Clock, Hammer, ShieldCheck, Play, Lock, User as UserIcon, LogIn, Chrome, Share2, Edit3, ChevronLeft, LayoutGrid, ExternalLink } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface ProfilePageProps {
  stats: UserStats;
  myLevels: GameLevel[];
  onPlayLevel: (level: GameLevel) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onEditLevel: (level: GameLevel) => void;
  isAuthenticated: boolean;
  onAuthSuccess: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ stats, myLevels, onPlayLevel, onLogout, onOpenSettings, onEditLevel, isAuthenticated, onAuthSuccess }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleShare = async (level: GameLevel) => {
    const shareData = {
      title: `Play ${level.name} on MindWhack`,
      text: `Check out this level I built on MindWhack: ${level.description}`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const code = btoa(JSON.stringify(level));
        await navigator.clipboard.writeText(code);
        alert("Level code copied to clipboard! Share it with friends.");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (showAuth && !isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="flex justify-start">
          <button onClick={() => setShowAuth(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 flex items-center gap-2">
            <ChevronLeft size={14} /> Back to Profile
          </button>
        </div>
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
            <LogIn size={40} className="text-blue-500" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">Login Here</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Access your profile on any device</p>
          </div>
        </div>

        <div className="glass p-8 rounded-[3rem] border-black/5 dark:border-white/10 space-y-6">
          <div className="text-center space-y-4 px-2">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed">
              Logging in allows you to save your high scores, arena creations, and rank across all devices.
            </p>
          </div>

          <div className="space-y-4">
             {error && (
               <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">
                 {error}
               </div>
             )}

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-6 rounded-full bg-blue-600 text-white flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.1em] hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/20 border border-blue-500/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Chrome size={20} className="text-white" /> Continue with Google
                </>
              )}
            </button>
          </div>

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/5"></div></div>
            <div className="relative flex justify-center text-[7px] font-black uppercase tracking-[0.4em]"><span className="bg-app-bg px-4 text-slate-500">Authorized Access Only</span></div>
          </div>
        </div>
        
        <p className="text-center text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
          By logging in, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-10 animate-in fade-in slide-in-from-right-10 duration-700">
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center gap-10 bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-8 sm:p-12 rounded-[3.5rem] border border-black/5 dark:border-white/10 relative overflow-hidden glass">
        <div className="absolute top-0 right-0 p-8 flex gap-2">
          <button 
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="p-3 glass rounded-2xl text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors border-none shadow-none active:scale-90"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="relative">
          <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl">
            <img src={stats.avatar} alt={stats.username} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-slate-950 p-3 rounded-2xl shadow-xl font-black text-sm">
             LVL {Math.floor(stats.xp / 1000)}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none uppercase italic vibrant-text">{stats.username}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-xs">
              <ShieldCheck size={14} /> {stats.rank} RANK { !isAuthenticated && <span className="ml-2 px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-[8px] text-slate-500">GUEST</span>}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
              <span>XP PROGRESS</span>
              <span>{stats.xp} / {stats.nextRankXp}</span>
            </div>
            <div className="w-full h-4 bg-black/5 dark:bg-black/40 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                style={{ width: `${(stats.xp / stats.nextRankXp) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
            {isAuthenticated ? (
              <button 
                type="button"
                onClick={onLogout}
                className="px-6 py-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 shadow-sm relative z-20"
              >
                <LogOut size={16} /> LOGOUT SESSION
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 relative z-20"
              >
                <LogIn size={16} /> LOGIN HERE
              </button>
            )}
            <div className="glass px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-300 border-black/5 dark:border-white/10">
              <Hammer size={14} className="text-blue-500" /> {stats.totalWhacks} Ops
            </div>
            <div className="glass px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-300 border-black/5 dark:border-white/10">
              <Award size={14} className="text-yellow-500" /> Veteran
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Creations */}
        <section className="lg:col-span-7 space-y-6">
           <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-3 px-2 uppercase vibrant-text-alt">
              <Play size={24} className="text-blue-500" /> MY CREATIONS
           </h2>
           <div className="space-y-4">
              {myLevels.length > 0 ? myLevels.map(level => (
                <div key={level.id} className="glass p-6 rounded-[2rem] border-black/5 dark:border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => onPlayLevel(level)}>
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase vibrant-text-alt">{level.name}</h4>
                        {level.isLocalOnly && (
                          <div className="px-2 py-0.5 bg-amber-500/20 rounded text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                            <Lock size={10} /> Local
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-yellow-500" /> {level.rating}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(level.createdAt).toLocaleDateString()}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         onEditLevel(level);
                       }}
                       className="p-2 glass rounded-full text-fuchsia-500 hover:bg-fuchsia-500/10 active:scale-90 transition-all"
                       title="Edit Level"
                     >
                       <Edit3 size={16} />
                     </button>
                     <Button 
                       size="sm" 
                       variant="glass" 
                       className="rounded-full shadow-none border-none p-2"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleShare(level);
                       }}
                     >
                       <Share2 size={16} />
                     </Button>
                     <Button size="sm" variant="glass" className="rounded-full shadow-none border-none">PLAY</Button>
                   </div>
                </div>
              )) : (
                <div className="glass p-12 rounded-[2rem] border-dashed border-2 border-black/5 dark:border-white/10 text-center space-y-4 opacity-50">
                  <Play size={48} className="mx-auto text-slate-400" />
                  <p className="font-black uppercase tracking-widest text-xs text-slate-500">No levels built yet</p>
                </div>
              )}
           </div>
        </section>

        {/* Right: Achievements */}
        <section className="lg:col-span-5 space-y-6">
           <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-3 px-2 uppercase vibrant-text">
              <Award size={24} className="text-yellow-500" /> UNLOCKED
           </h2>
           <div className="grid grid-cols-3 gap-4">
              {[
                { icon: '🚀', label: 'Trainee' },
                { icon: '🔥', label: '10x Hit' },
                { icon: '🎨', label: 'Creator' },
                { icon: '👑', label: 'Champion' },
                { icon: '⚡', label: 'Quick Tap' },
                { icon: '🛡️', label: 'Founder' },
              ].map((badge, i) => (
                <div key={i} className="glass aspect-square rounded-[2rem] flex flex-col items-center justify-center p-4 text-center group hover:bg-yellow-400/10 transition-colors cursor-help border-black/5 dark:border-white/10">
                   <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{badge.icon}</span>
                   <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{badge.label}</span>
                </div>
              ))}
           </div>
        </section>
      </div>

      {/* Floating App Hub Button */}
      <a 
        href="https://xubilas-appshub.vercel.app/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-28 right-6 sm:right-12 z-[90] group flex items-center gap-3 px-6 py-4 bg-slate-900/10 dark:bg-white/5 backdrop-blur-md text-slate-900 dark:text-white rounded-full shadow-2xl shadow-blue-600/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-slate-900/10 dark:border-white/20"
      >
        <div className="relative">
          <LayoutGrid size={22} className="group-hover:rotate-12 transition-transform text-blue-600 dark:text-blue-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-100 dark:border-slate-900 animate-pulse" />
        </div>
        <div className="flex flex-col items-start leading-none pr-1">
          <span className="text-sm font-black uppercase tracking-tighter italic flex items-center gap-1">
            XUBILAS HUB <ExternalLink size={12} className="opacity-50" />
          </span>
        </div>
      </a>
    </div>
  );
};

export default ProfilePage;
