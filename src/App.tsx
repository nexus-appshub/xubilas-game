
import React, { useState, useEffect, Suspense } from 'react';
import { AppView, GameLevel, UserStats } from './types';
import { INITIAL_LEVELS } from './constants';
import { soundService } from './services/soundService';
import { getSupabase } from './services/supabaseClient';
import { SyncService } from './services/syncService';
import { Session } from '@supabase/supabase-js';

const CommunityHub = React.lazy(() => import('./components/CommunityHub'));
const LevelEditor = React.lazy(() => import('./components/LevelEditor'));
const LevelPlayer = React.lazy(() => import('./components/LevelPlayer'));
const HomePage = React.lazy(() => import('./components/HomePage'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));
const NavBar = React.lazy(() => import('./components/NavBar'));
const EntryPage = React.lazy(() => import('./components/EntryPage'));
const DifficultySelector = React.lazy(() => import('./components/DifficultySelector'));
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));

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
    return s === null ? true : s === 'true'; // Default to true
  });
  const [bgmEnabled, setBgmEnabled] = useState(() => {
    const s = localStorage.getItem('mindwhack_bgm_enabled');
    return s === 'true'; // Default to false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customAppBgm, setCustomAppBgm] = useState<string | null>(() => localStorage.getItem('mindwhack_custom_app_bgm'));

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
      return s ? JSON.parse(s) : INITIAL_LEVELS;
    } catch (e) {
      console.warn("Failed to parse levels from localStorage", e);
      return INITIAL_LEVELS;
    }
  });
  
  const [activeLevel, setActiveLevel] = useState<GameLevel | null>(null);
  const [editingLevel, setEditingLevel] = useState<GameLevel | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [session, setSession] = useState<Session | null>(null);
  const [isGeneratingBGM, setIsGeneratingBGM] = useState(false);

  useEffect(() => {
    const generateDefaultBGM = async () => {
      if (localStorage.getItem('mindwhack_bgm')) return;
      
      setIsGeneratingBGM(true);
      try {
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: 'Say cheerfully: Welcome to MindWhack! Focus your mind, hit the targets, and reach for the stars. Neural link established. Play now!' }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          localStorage.setItem('mindwhack_bgm', `data:audio/mp3;base64,${base64Audio}`);
          // Update initial levels to use this BGM if they were using the old one
          const updatedLevels = INITIAL_LEVELS.map(l => ({
            ...l,
            logic: {
              ...l.logic,
              customBgmUrl: `data:audio/mp3;base64,${base64Audio}`
            }
          }));
          setLevels(prev => {
            const s = localStorage.getItem('mindwhack_levels');
            if (!s) return updatedLevels;
            const current = JSON.parse(s);
            return current.map((l: any) => {
              if (l.id.startsWith('default-')) {
                return { ...l, logic: { ...l.logic, customBgmUrl: `data:audio/mp3;base64,${base64Audio}` } };
              }
              return l;
            });
          });
        }
      } catch (e) {
        console.error("Failed to generate default BGM:", e);
      } finally {
        setIsGeneratingBGM(false);
      }
    };

    generateDefaultBGM();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log("App is online, triggering sync...");
      if (session?.user) {
        SyncService.syncProfile(user, session.user.id);
        levels.forEach(level => {
          if (!level.id.startsWith('default-') && !level.isLocalOnly) {
            SyncService.syncLevel(level, session.user.id);
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session, user, levels]);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    } catch (e) {
      console.warn("Supabase not configured or offline, running in local mode.");
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const remoteProfile = await SyncService.fetchUserProfile(session.user.id);
        if (remoteProfile) {
          setUser(u => ({
            ...u,
            ...remoteProfile,
            nextRankXp: (Math.floor((remoteProfile.xp || 0) / 1000) + 1) * 1000
          }));
        } else {
          // Fallback to local or create new
          const newProfile = {
            username: session.user.user_metadata.username || session.user.email?.split('@')[0],
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
            totalWhacks: user.totalWhacks,
            xp: user.xp,
            rank: user.rank
          };
          SyncService.syncProfile({ ...user, ...newProfile }, session.user.id);
        }
      };
      fetchProfile();
    }
  }, [session]);

  useEffect(() => {
    const fetchLevels = async () => {
      const remoteLevels = await SyncService.fetchRemoteLevels();
      if (remoteLevels.length > 0) {
        setLevels(prev => {
          const combined = [...remoteLevels];
          // Keep local levels that aren't in remote yet
          prev.forEach(pl => {
            if (!combined.find(cl => cl.id === pl.id)) {
              combined.push(pl);
            }
          });
          // Ensure defaults are there
          INITIAL_LEVELS.forEach(il => {
            if (!combined.find(cl => cl.id === il.id)) {
              combined.push(il);
            }
          });
          return combined;
        });
      }
    };
    fetchLevels();
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      SyncService.syncProfile(user, session.user.id);
    }
  }, [user.xp, user.totalWhacks, user.username, user.avatar, session]);

  useEffect(() => {
    soundService.setSfxEnabled(sfxEnabled);
    localStorage.setItem('mindwhack_sfx_enabled', sfxEnabled.toString());
  }, [sfxEnabled]);

  useEffect(() => {
    soundService.setBgmEnabled(bgmEnabled);
    localStorage.setItem('mindwhack_bgm_enabled', bgmEnabled.toString());
  }, [bgmEnabled]);

  useEffect(() => {
    const isMainView = view === 'home' || view === 'hub' || view === 'profile' || view === 'editor';
    if (isMainView && bgmEnabled) {
      const bgmUrl = customAppBgm || localStorage.getItem('mindwhack_bgm');
      if (bgmUrl) {
        soundService.startBGM('custom', bgmUrl);
      } else {
        // High-quality Chill Lo-Fi track
        soundService.startBGM('custom', 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3');
      }
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

      if (session?.user) {
        SyncService.syncProfile(updatedUser, session.user.id);
      }

      return updatedUser;
    });
    
    setView('hub');
    setActiveLevel(null);
  };

  const handleLogout = async () => {
    soundService.playClick();
    try {
      await getSupabase().auth.signOut();
    } catch (e) {
      console.warn("Logout failed or Supabase not configured.");
    }
    localStorage.removeItem('mindwhack_user');
    setUser({ ...DEFAULT_USER, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}` });
    setView('entry');
    setIsSettingsOpen(false);
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
        <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2 bg-clip-text text-transparent bg-linear-to-br from-fuchsia-500 to-blue-500">MindWhack</h1>
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse">Initializing Neural Link...</div>
      </div>
    );
  }

  const showNav = view !== 'play' && view !== 'entry' && view !== 'editor';

  const featuredLevel = levels.find(l => l.id === 'default-1') || levels.find(l => l.id.startsWith('default-')) || levels[0];

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden select-none touch-none transition-colors duration-500 bg-app-bg text-app-text ${theme}`}>
      <main className="flex-1 overflow-y-auto relative z-10 w-full max-w-screen-2xl mx-auto">
        <Suspense fallback={<div className="p-10 text-center opacity-50">Loading...</div>}>
          {view === 'entry' && <EntryPage onEnter={() => setView('home')} />}
          {view === 'home' && <HomePage stats={user} featuredLevel={featuredLevel} onPlayFeatured={handleStartMission} onGoToHub={() => setView('hub')} onUpgrade={() => handleEditLevel(featuredLevel)} onOpenSettings={() => setIsSettingsOpen(true)} />}
          {view === 'hub' && <CommunityHub levels={levels} onPlay={handleStartMission} onCreate={() => setView('editor')} onImport={(l) => setLevels([l, ...levels])} onEdit={handleEditLevel} />}
          {view === 'editor' && (
            <LevelEditor 
              initialLevel={editingLevel}
              onSave={(l) => { 
                const levelToSave = { ...l, isLocalOnly: !session };
                if (editingLevel) {
                  setLevels(levels.map(lvl => lvl.id === editingLevel.id ? levelToSave : lvl));
                } else {
                  setLevels([levelToSave, ...levels]); 
                }
                if (session?.user && !levelToSave.isLocalOnly) {
                  SyncService.syncLevel(levelToSave, session.user.id);
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
              isAuthenticated={!!session}
              onAuthSuccess={() => setView('profile')}
            />
          )}
          
          {view === 'play' && activeLevel && (
            <LevelPlayer 
              level={activeLevel} 
              difficulty={selectedDifficulty} 
              onExit={() => setView('hub')} 
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
    </div>
  );
};

export default App;
