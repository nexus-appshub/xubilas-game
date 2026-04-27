
import React, { useState, useEffect, Suspense } from 'react';
import { AppView, GameLevel, UserStats } from './types';
import { INITIAL_LEVELS, DEFAULT_BGM } from './constants';
import { soundService } from './services/soundService';
import { SyncService } from './services/syncService';
import { auth } from './firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup } from 'firebase/auth';
import { googleProvider } from './firebase';
import { Wifi, WifiOff } from 'lucide-react';

import PWAInstallPrompt from './components/PWAInstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';

const CommunityHub = React.lazy(() => import('./components/CommunityHub'));
const LevelEditor = React.lazy(() => import('./components/LevelEditor'));
const LevelPlayer = React.lazy(() => import('./components/LevelPlayer'));
const HomePage = React.lazy(() => import('./components/HomePage'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const NavBar = React.lazy(() => import('./components/NavBar'));
const EntryPage = React.lazy(() => import('./components/EntryPage'));
const DifficultySelector = React.lazy(() => import('./components/DifficultySelector'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const NewGamesHub = React.lazy(() => import('./components/NewGamesHub'));

const DEFAULT_USER: UserStats = {
  username: "ArenaPilot",
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
  totalWhacks: 0,
  levelsCreated: 0,
  rank: "NOVICE",
  xp: 0,
  nextRankXp: 1000
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('entry');
  const [isInitializing, setIsInitializing] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const s = localStorage.getItem('mindwhack_theme');
    return (s as 'dark' | 'light') || 'dark';
  });
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    const s = localStorage.getItem('mindwhack_sfx_enabled');
    return s === null ? true : s === 'true'; 
  });
  const [bgmEnabled, setBgmEnabled] = useState(() => {
    const s = localStorage.getItem('mindwhack_bgm_enabled');
    return s === 'true'; 
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customAppBgm, setCustomAppBgm] = useState<string | null>(() => {
    // Aggressive cleanup of legacy keys
    localStorage.removeItem('mindwhack_bgm');
    
    const saved = localStorage.getItem('mindwhack_custom_app_bgm');
    if (!saved) return DEFAULT_BGM;
    
    const blacklisted = ['dirty-thinkin', 'deep-urban'];
    const isBlacklisted = blacklisted.some(term => saved.toLowerCase().includes(term));
    
    if (isBlacklisted) {
      localStorage.removeItem('mindwhack_custom_app_bgm');
      return DEFAULT_BGM;
    }
    
    return saved || DEFAULT_BGM;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [hasFetchedProfile, setHasFetchedProfile] = useState(false);

  const [user, setUser] = useState<UserStats>(() => {
    try {
      const s = localStorage.getItem('mindwhack_user');
      return s ? JSON.parse(s) : DEFAULT_USER;
    } catch (e) {
      console.warn("Failed to parse user from localStorage", e);
      return DEFAULT_USER;
    }
  });
  const [levels, setLevels] = useState<GameLevel[]>(() => {
    try {
      const s = localStorage.getItem('mindwhack_levels');
      const parsed = s ? JSON.parse(s) : INITIAL_LEVELS;
      
      // Migration: Use aggressive substring matching to remove legacy tracks
      const blacklisted = ['dirty-thinkin', 'deep-urban'];
      
      return parsed.map((lvl: GameLevel) => {
        const bgmUrl = lvl.logic.customBgmUrl || '';
        const isBlacklisted = blacklisted.some(term => bgmUrl.toLowerCase().includes(term));
        
        if (isBlacklisted) {
          return { ...lvl, logic: { ...lvl.logic, customBgmUrl: DEFAULT_BGM } };
        }
        return lvl;
      });
    } catch (e) {
      console.warn("Failed to parse levels from localStorage", e);
      return INITIAL_LEVELS;
    }
  });
  
  const [activeLevel, setActiveLevel] = useState<GameLevel | null>(null);
  const [editingLevel, setEditingLevel] = useState<GameLevel | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isChecking = false;

    const handleOnline = () => {
      setIsOnline(prev => {
        if (!prev) {
          setShowStatusToast(true);
          setTimeout(() => setShowStatusToast(false), 3000);
          console.log("App is actively online, triggering sync...");
          if (sessionUser) {
            SyncService.syncProfile(user, sessionUser.uid);
            levels.forEach(level => {
              if (!level.id.startsWith('default-') && !level.isLocalOnly) {
                SyncService.syncLevel(level, sessionUser.uid);
              }
            });
          }
        }
        return true;
      });
    };

    const handleOffline = () => {
      setIsOnline(prev => {
        if (prev) {
          setShowStatusToast(true);
          setTimeout(() => setShowStatusToast(false), 3000);
        }
        return false;
      });
    };

    // Preload essential audio for offline PWA capabilities
    const preloadAudio = async () => {
      try {
        if (!navigator.onLine) return;
        const defaultWhackUrl = 'https://nsfiahwdfmnrrrmjkxjd.supabase.co/storage/v1/object/public/level-assets/bgm/mixkit-strong-punches-to-the-body-2198.wav';
        await Promise.all([
          fetch(DEFAULT_BGM).catch(() => {}),
          fetch(defaultWhackUrl).catch(() => {})
        ]);
        console.log("Essential audio precached.");
      } catch (e) {
        // Silent fail
      }
    };
    preloadAudio();

    // Active Internet Check
    const activelyCheckConnection = async () => {
      if (isChecking) return;
      isChecking = true;
      
      // Fast bypass if physical network link is fully down
      if (!navigator.onLine) {
        handleOffline();
        isChecking = false;
        return;
      }

      try {
        // Lightweight request to verify true internet flow
        const response = await fetch(window.location.origin + '/?ping=' + Date.now(), { 
          method: 'HEAD', 
          cache: 'no-store' 
        });
        
        if (response.ok || response.type === 'opaque') {
          handleOnline();
        } else {
          handleOffline();
        }
      } catch (err) {
        handleOffline();
      } finally {
        isChecking = false;
      }
    };

    // Initial check immediately
    activelyCheckConnection();

    // Recheck continuously to keep connection sticky and verify active data
    const pingInterval = setInterval(activelyCheckConnection, 10000);

    // Listen to native events to fire active checks immediately on physical switch
    window.addEventListener('online', activelyCheckConnection);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('online', activelyCheckConnection);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionUser, user, levels]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setSessionUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (sessionUser) {
      const fetchProfile = async () => {
        try {
          const remoteProfile = await SyncService.fetchUserProfile(sessionUser.uid);
          if (remoteProfile) {
            setUser(u => {
              const updated = {
                ...u,
                ...remoteProfile,
                nextRankXp: (Math.floor((remoteProfile.xp || 0) / 1000) + 1) * 1000
              };
              localStorage.setItem('mindwhack_user', JSON.stringify(updated));
              return updated;
            });
          } else {
            // New user, push current state to cloud
            await SyncService.syncProfile(user, sessionUser.uid);
          }
        } catch (e) {
          console.error("Fetch profile failed:", e);
        } finally {
          setHasFetchedProfile(true);
        }
      };
      fetchProfile();
    } else {
      setHasFetchedProfile(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    const fetchLevels = async () => {
      const remoteLevels = await SyncService.fetchRemoteLevels();
      
      // Migration: Use aggressive substring matching to remove legacy tracks for remote levels
      const blacklisted = ['dirty-thinkin', 'deep-urban'];
      
      const normalizedRemote = remoteLevels.map(lvl => {
        const bgmUrl = lvl.logic.customBgmUrl || '';
        const isBlacklisted = blacklisted.some(term => bgmUrl.toLowerCase().includes(term));
        
        if (isBlacklisted) {
          return { ...lvl, logic: { ...lvl.logic, customBgmUrl: DEFAULT_BGM } };
        }
        return lvl;
      });

      if (normalizedRemote.length > 0) {
        setLevels(prev => {
          const combined = [...normalizedRemote];
          prev.forEach(pl => {
            if (!combined.find(cl => cl.id === pl.id)) {
              combined.push(pl);
            }
          });
          INITIAL_LEVELS.forEach(il => {
            if (!combined.find(cl => cl.id === il.id)) {
              combined.push(il);
            }
          });
          return combined;
        });
      }
    };
    if (isAuthReady) {
      fetchLevels();
    }
  }, [isAuthReady]);

  useEffect(() => {
    if (sessionUser && hasFetchedProfile) {
      SyncService.syncProfile(user, sessionUser.uid);
    }
  }, [user.xp, user.totalWhacks, user.username, user.avatar, sessionUser, hasFetchedProfile]);

  useEffect(() => {
    soundService.setSfxEnabled(sfxEnabled);
    localStorage.setItem('mindwhack_sfx_enabled', sfxEnabled.toString());
  }, [sfxEnabled]);

  useEffect(() => {
    soundService.setBgmEnabled(bgmEnabled);
    localStorage.setItem('mindwhack_bgm_enabled', bgmEnabled.toString());
  }, [bgmEnabled]);

  useEffect(() => {
    const isMainView = view === 'home' || view === 'hub' || view === 'profile' || view === 'editor' || view === 'new_games';
    if (isMainView && bgmEnabled) {
      const bgmUrl = customAppBgm || DEFAULT_BGM;
      soundService.startBGM('custom', bgmUrl);
    } else if (view === 'entry' || view === 'play' || !bgmEnabled) {
      // Entry has its own vibe, Play has level BGM
      if (view !== 'play') soundService.stopBGM();
    }

    return () => {
      // Only stop if we are navigating AWAY from a main view to something that isn't Play
      // Actually, it's safer to let the next view handle it or just stop it.
    };
  }, [view, bgmEnabled, customAppBgm]);

  useEffect(() => {
    localStorage.setItem('mindwhack_user', JSON.stringify(user));
    localStorage.setItem('mindwhack_levels', JSON.stringify(levels));
    localStorage.setItem('mindwhack_theme', theme);
    if (customAppBgm) {
      localStorage.setItem('mindwhack_custom_app_bgm', customAppBgm);
    } else {
      localStorage.removeItem('mindwhack_custom_app_bgm');
    }
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [user, levels, theme]);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStartMission = (level: GameLevel) => {
    setActiveLevel(level);
    setShowDifficultyModal(true);
  };

  const handleConfirmDifficulty = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
    setSelectedDifficulty(difficulty);
    setShowDifficultyModal(false);
    setView('play');
  };

  const handleFinishGame = (score: number) => {
    const xpMultiplier = selectedDifficulty === 'Hard' ? 2 : selectedDifficulty === 'Medium' ? 1.2 : 0.8;
    const xpEarned = Math.floor(score * 10 * xpMultiplier);
    const winCondition = activeLevel?.logic.winConditionScore || 20;
    const success = score >= winCondition;
    
    soundService.playGameEnd(success);
    
    setUser(u => {
      const newXp = u.xp + xpEarned;
      const ranks = ["NOVICE", "RECRUIT", "OPERATIVE", "ELITE", "LEGEND", "GOD"];
      const rankIdx = Math.min(Math.floor(newXp / 1000), ranks.length - 1);
      
      const updatedUser = {
        ...u,
        xp: newXp,
        totalWhacks: u.totalWhacks + Math.floor(score / 2),
        rank: ranks[rankIdx],
        nextRankXp: (rankIdx + 1) * 1000
      };

      if (sessionUser) {
        SyncService.syncProfile(updatedUser, sessionUser.uid);
      }

      return updatedUser;
    });
    
    setView('home');
    setActiveLevel(null);
  };

  const handleLogin = async () => {
    soundService.playClick();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.warn("Login failed", e);
      alert("Sign in failed. Check your connection or popup blocker.");
    }
  };

  const handleLogout = async () => {
    soundService.playClick();
    try {
      await signOut(auth);
      // Only clear storage and state IF signout succeeds
      localStorage.removeItem('mindwhack_user');
      setUser({ ...DEFAULT_USER, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}` });
      setSessionUser(null);
      setHasFetchedProfile(false);
      setView('entry');
      setIsSettingsOpen(false);
    } catch (e) {
      console.warn("Logout failed", e);
      alert("Sign out failed. Check your connection.");
    }
  };

  const toggleSfx = () => {
    setSfxEnabled(!sfxEnabled);
  };

  const toggleBgm = () => {
    setBgmEnabled(!bgmEnabled);
  };

  const handleNavigate = (v: AppView) => {
    if (v !== 'editor') setEditingLevel(null);
    setView(v);
  };

  const handleEditLevel = (level: GameLevel) => {
    setEditingLevel(level);
    setView('editor');
  };

  if (isInitializing) {
    return (
      <div 
        className={`fixed inset-0 flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 bg-app-bg text-app-text ${theme}`}
      >
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-fuchsia-500/10 dark:border-fuchsia-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl drop-shadow-2xl">🧠</div>
        </div>
        <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2 bg-clip-text text-transparent bg-linear-to-br from-fuchsia-500 to-blue-500">Xubilas Mind Whack</h1>
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse">Initializing Neural Link...</div>
      </div>
    );
  }

  const handleDirectPlay = (level: GameLevel) => {
    setActiveLevel(level);
    setShowDifficultyModal(true);
  };

  const showNav = view !== 'play' && view !== 'entry' && view !== 'editor';

  const featuredLevel = levels.find(l => l.id === 'default-1') || levels.find(l => l.id.startsWith('default-')) || levels[0];

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none touch-none transition-colors duration-500 bg-app-bg text-app-text ${theme}`}>
      <main className="flex-1 overflow-y-auto relative z-10 w-full max-w-screen-2xl mx-auto">
        <Suspense fallback={<div className="p-10 text-center opacity-50">Loading...</div>}>
          {view === 'entry' && (
            <EntryPage 
              onEnter={() => setView('home')} 
              onPlayFeatured={() => handleDirectPlay(featuredLevel)} 
            />
          )}
          {view === 'home' && <HomePage stats={user} featuredLevel={featuredLevel} onPlayFeatured={handleStartMission} onGoToHub={() => setView('hub')} onUpgrade={() => handleEditLevel(featuredLevel)} onOpenSettings={() => setIsSettingsOpen(true)} />}
          {view === 'new_games' && <NewGamesHub />}
          {view === 'hub' && <CommunityHub levels={levels} onPlay={handleStartMission} onCreate={() => setView('editor')} onImport={(l) => setLevels([l, ...levels])} onEdit={handleEditLevel} />}
          {view === 'editor' && (
            <LevelEditor 
              initialLevel={editingLevel}
              onLogin={handleLogin}
              sessionUser={sessionUser}
              onSave={(l) => { 
                const levelToSave = { ...l, isLocalOnly: !sessionUser };
                if (editingLevel) {
                  setLevels(levels.map(lvl => lvl.id === editingLevel.id ? levelToSave : lvl));
                } else {
                  setLevels([levelToSave, ...levels]); 
                }
                if (sessionUser && !levelToSave.isLocalOnly) {
                  SyncService.syncLevel(levelToSave, sessionUser.uid);
                }
                setEditingLevel(null);
                setView('hub'); 
              }} 
              onCancel={() => {
                setEditingLevel(null);
                setView('hub');
              }} 
            />
          )}
          {view === 'profile' && (
            <ProfilePage 
              stats={user} 
              myLevels={levels.filter(l => l.author === user.username || l.author === 'Pilot')} 
              onPlayLevel={handleStartMission} 
              onLogout={handleLogout} 
              onOpenSettings={() => setIsSettingsOpen(true)} 
              onEditLevel={handleEditLevel}
              isAuthenticated={!!sessionUser}
              onAuthSuccess={() => setView('profile')}
            />
          )}
          
          {view === 'play' && activeLevel && (
            <LevelPlayer 
              level={activeLevel} 
              difficulty={selectedDifficulty} 
              onExit={() => setView('home')} 
              onFinish={handleFinishGame} 
              onUpgrade={handleEditLevel}
            />
          )}
        </Suspense>
      </main>

      {showDifficultyModal && (
        <Suspense fallback={null}>
          <DifficultySelector 
            isOpen={showDifficultyModal} 
            onClose={() => setShowDifficultyModal(false)} 
            level={activeLevel} 
            onSelect={handleConfirmDifficulty} 
          />
        </Suspense>
      )}

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            user={user}
            sfxEnabled={sfxEnabled}
            bgmEnabled={bgmEnabled}
            onToggleSfx={toggleSfx}
            onToggleBgm={toggleBgm}
            onUpdateUser={(updates) => setUser(u => ({ ...u, ...updates }))}
            theme={theme}
            onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            onLogout={handleLogout}
            onLogin={handleLogin}
            sessionUser={sessionUser}
            customAppBgm={customAppBgm}
            onUpdateBgm={setCustomAppBgm}
          />
        </Suspense>
      )}

      {showNav && (
        <Suspense fallback={null}>
          <NavBar
            currentView={view}
            onNavigate={handleNavigate}
            theme={theme}
            toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          />
        </Suspense>
      )}

      <PWAInstallPrompt />
      <UpdatePrompt />

      {/* Connectivity Status Toast */}
      {showStatusToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 fade-in duration-500">
          <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-xl border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span className="text-[10px] font-black uppercase tracking-widest italic font-mono">
              Network: {isOnline ? 'Online - Synchronizing' : 'Offline - Local Mode'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
