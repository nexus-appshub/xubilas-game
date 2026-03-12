import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameLevel, TargetType } from '../types';
import Button from './Button';
import GameHole from './GameHole';
import { soundService } from '../services/soundService';
import { Trophy, Timer, Heart, ChevronLeft, Pause, Play as PlayIcon, Zap, Info, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { TARGET_ICONS } from '../constants';

interface LevelPlayerProps {
  level: GameLevel;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onExit: () => void;
  onFinish: (score: number) => void;
  onUpgrade?: (level: GameLevel) => void;
}

const LevelPlayer: React.FC<LevelPlayerProps> = ({ level, difficulty, onExit, onFinish, onUpgrade }) => {
  const maxLives = (level.logic.gameType === 'Insane' || level.logic.gameType === 'Focus') ? 5 : 3;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(level.logic.timeLimit || 30);
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'paused' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [holeStates, setHoleStates] = useState<(TargetType | null)[]>(Array(level.gridSize * level.gridSize).fill(null));
  const [hitIndex, setHitIndex] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const getDifficultyModifier = () => {
    switch(difficulty) {
      case 'Easy': return 1.5;
      case 'Hard': return 0.6;
      default: return 1.0;
    }
  };

  // Play loading sound on mount
  useEffect(() => {
    soundService.playLevelLoad();
    if (level.logic.customWhackSoundUrl) {
      soundService.setCustomWhackSound(level.logic.customWhackSoundUrl);
    } else {
      soundService.setCustomWhackSound(null);
    }
  }, [level.logic.customWhackSoundUrl]);

  useEffect(() => {
    if (gameState === 'playing') {
      const bgmType = level.logic.bgmType || 'energetic';
      const customUrl = level.logic.customBgmUrl || '';
      if (bgmType !== 'none') {
        soundService.startBGM(bgmType as any, customUrl);
      }
    } else {
      soundService.stopBGM();
    }
    return () => soundService.stopBGM();
  }, [gameState, level.logic.bgmType, level.logic.customBgmUrl]);

  const holeStatesRef = useRef<(TargetType | null)[]>(holeStates);
  useEffect(() => {
    holeStatesRef.current = holeStates;
  }, [holeStates]);

  const spawnTarget = useCallback(() => {
    if (gameState !== 'playing') return;
    
    const modifier = getDifficultyModifier();
    const currentHoles = holeStatesRef.current;
    const emptyIndices = currentHoles.map((s, i) => s === null ? i : null).filter((i): i is number => i !== null);
    
    if (emptyIndices.length > 0) {
      const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      const weights = level.logic.targetWeights;
      const types = Object.keys(weights);
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      
      if (totalWeight <= 0) return;

      let rand = Math.random() * totalWeight;
      let selected: string = types[0];
      
      for (const type of types) {
        if (rand < weights[type]) {
          selected = type;
          break;
        }
        rand -= weights[type];
      }
      
      setHoleStates(prev => { const n = [...prev]; n[idx] = selected; return n; });
      
      const decayFactor = level.logic.targetDecayFactors?.[selected] ?? 1.0;
      const finalDuration = (level.logic.activeDuration * modifier) / decayFactor;

      setTimeout(() => {
        setHoleStates(prev => { 
          const n = [...prev]; 
          if (n[idx] === selected) {
            n[idx] = null;
            if (gameStateRef.current === 'playing' && level.logic.gameType === 'Focus' && (selected === 'dog' || selected === 'rat')) {
              setLives(l => Math.max(0, l - 1));
            }
          }
          return n; 
        });
      }, finalDuration);
    }
  }, [gameState, level.logic.activeDuration, level.logic.gameType, difficulty, level.logic.targetWeights, level.logic.targetDecayFactors]);

  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      soundService.playBeep(false);
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else if (gameState === 'countdown' && countdown === 0) {
      soundService.playGameStart();
      setGameState('playing');
    }
  }, [gameState, countdown]);

  useEffect(() => {
    if (gameState === 'playing') {
      const modifier = getDifficultyModifier();
      const spawnTimer = setInterval(spawnTarget, (level.logic.spawnInterval / (level.logic.speedMultiplier || 1)) * modifier);
      return () => clearInterval(spawnTimer);
    }
  }, [gameState, spawnTarget, level.logic.spawnInterval, level.logic.speedMultiplier, difficulty]);

  useEffect(() => {
    if (gameState === 'playing') {
      const gameTimer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { 
            setGameState('ended'); 
            return 0; 
          }
          if (t <= 6) soundService.playBeep(true);
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(gameTimer);
    }
  }, [gameState]);

  useEffect(() => {
    if (lives <= 0 && gameState === 'playing') {
      setGameState('ended');
    }
  }, [lives, gameState]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleRestart = () => {
    soundService.playClick();
    setScore(0);
    setLives(maxLives);
    setCombo(0);
    setTimeLeft(level.logic.timeLimit || 30);
    setHoleStates(Array(level.gridSize * level.gridSize).fill(null));
    setCountdown(3);
    setShowGuide(false);
    setGameState('countdown');
  };

  const handleHit = (idx: number) => {
    const type = holeStates[idx];
    if (!type || gameState !== 'playing') return;
    
    if (navigator.vibrate) {
      if (type === 'hazard' || (level.logic.targetScores[type] < 0)) navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(40);
    }

    setCombo(c => c + 1);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => setCombo(0), 1200);

    const basePts = level.logic.targetScores[type] || 0;
    const comboBonus = Math.floor(combo / 3);
    const pts = basePts > 0 ? basePts + comboBonus : basePts;
    
    setScore(s => Math.max(0, s + pts));
    setHoleStates(prev => { const n = [...prev]; n[idx] = null; return n; });
    setHitIndex(idx);
    setTimeout(() => setHitIndex(null), 300);

    if (type === 'hazard' || basePts <= -15) {
      soundService.playBeep(true);
      triggerShake();
      setLives(l => l - 1);
    } else if (basePts < 0) {
      soundService.playBeep(true);
    } else {
      soundService.playWhack();
    }
  };

  const renderBackgroundVisuals = () => {
    const style = level.logic.themeConfig?.bgStyle || 'none';
    const accent = level.logic.themeConfig?.accentColor || '#3b82f6';

    switch (style) {
      case 'grid':
        return (
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        );
      case 'matrix':
        return (
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none flex justify-around overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2 animate-bounce-slow" style={{ animationDelay: `${i * 0.2}s`, animationDuration: `${2 + Math.random() * 3}s` }}>
                {[...Array(30)].map((_, j) => (
                  <div key={j} className="text-[10px] font-black" style={{ color: accent }}>{Math.round(Math.random())}</div>
                ))}
              </div>
            ))}
          </div>
        );
      case 'particles':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {[...Array(15)].map((_, i) => (
               <div 
                 key={i} 
                 className="absolute w-1 h-1 rounded-full animate-float" 
                 style={{ 
                   left: `${Math.random() * 100}%`, 
                   top: `${Math.random() * 100}%`, 
                   backgroundColor: accent,
                   boxShadow: `0 0 10px ${accent}`,
                   animationDelay: `${Math.random() * 5}s`,
                   opacity: 0.3
                 }} 
               />
             ))}
          </div>
        );
      case 'blobs':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-blob opacity-20" style={{ backgroundColor: level.logic.themeConfig?.primaryColor || '#a855f7' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full animate-blob opacity-20 [animation-delay:2s]" style={{ backgroundColor: level.logic.themeConfig?.secondaryColor || '#3b82f6' }} />
          </div>
        );
      case 'horror':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black/40">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-px h-full bg-red-900/20 animate-pulse" 
                style={{ left: `${20 * i + Math.random() * 10}%`, animationDelay: `${i * 0.5}s` }} 
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const containerStyle = level.logic.themeConfig?.bgImageUrl 
    ? { backgroundImage: `url(${level.logic.themeConfig.bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const handleExitClick = () => {
    soundService.playClick();
    if (gameState === 'playing') {
      setGameState('paused');
    }
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    soundService.playClick();
    onExit();
  };

  const cancelExit = () => {
    soundService.playClick();
    setShowExitConfirm(false);
    // Don't automatically resume, let the user decide if they were playing
  };

  return (
    <div 
      className={`fixed inset-0 flex flex-col z-[100] px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-all duration-300 ${shake ? 'translate-x-1 translate-y-1' : ''}`}
      style={containerStyle}
    >
      {renderBackgroundVisuals()}

      <header className="flex items-center justify-between glass p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2.5rem] mt-2 sm:mt-4 relative z-20 mx-2 sm:mx-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={handleExitClick} className="p-2 sm:p-3 bg-slate-200/50 dark:bg-white/5 rounded-xl sm:rounded-2xl active:scale-90 transition-transform"><ChevronLeft size={20} className="sm:w-6 sm:h-6" /></button>
          <button 
            onClick={() => {
              soundService.playClick();
              setGameState('paused');
              setShowGuide(true);
            }} 
            className="p-2 sm:p-3 bg-slate-200/50 dark:bg-white/5 rounded-xl sm:rounded-2xl active:scale-90 transition-transform text-blue-500 dark:text-blue-400"
          >
            <Info size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
           <div className="flex items-center gap-1 sm:gap-2">
              <Trophy size={14} className="text-yellow-500 sm:w-4 sm:h-4" />
              <div className="text-xl sm:text-3xl font-black gradient-text tabular-nums">{score}</div>
           </div>
           <div className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest truncate max-w-[80px] sm:max-w-none vibrant-text">{level.name}</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-1 font-black tabular-nums text-sm sm:text-lg ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
            <Timer size={14} className="sm:w-[18px] sm:h-[18px]" /> {timeLeft}s
          </div>
          <button 
            onClick={handleRestart}
            className="p-2 sm:p-3 bg-slate-200/50 dark:bg-white/5 rounded-xl sm:rounded-2xl text-emerald-600 dark:text-emerald-400 active:scale-90 transition-transform"
            title="Restart Mission"
          >
            <RotateCcw size={20} className="sm:w-6 sm:h-6" />
          </button>
          <button 
            onClick={() => {
              soundService.playClick();
              setGameState(s => s === 'paused' ? 'playing' : 'paused');
            }} 
            className="p-2 sm:p-3 bg-slate-900 dark:bg-slate-800 rounded-xl sm:rounded-2xl text-white active:scale-90 transition-transform"
          >
            {gameState === 'paused' ? <PlayIcon size={20} className="sm:w-6 sm:h-6" fill="currentColor" /> : <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
          </button>
        </div>
      </header>

      <div className="h-12 flex items-center justify-center overflow-hidden relative z-20">
        {combo >= 2 && (
          <div className="flex items-center gap-2 animate-bounce bg-fuchsia-500/10 px-4 py-1 rounded-full border border-fuchsia-500/20">
            <Zap size={14} className="text-fuchsia-400 fill-fuchsia-400" />
            <span className="text-xs font-black uppercase tracking-widest vibrant-text">Combo x{combo}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        {showExitConfirm ? (
          <div className="glass w-full max-w-sm p-8 sm:p-10 rounded-[3rem] text-center space-y-8 animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-rose-500" />
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-rose-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter vibrant-text">Abort Mission?</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">All unsaved neural progress will be purged from the current session.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={confirmExit} variant="primary" className="w-full py-5 rounded-2xl bg-rose-600 shadow-rose-600/20">
                YES, ABORT MISSION
              </Button>
              <Button onClick={cancelExit} variant="glass" className="w-full py-4 rounded-2xl border-white/10 text-slate-400">
                STAY IN ARENA
              </Button>
            </div>
          </div>
        ) : showGuide ? (
          <div className="glass w-full max-w-md p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] space-y-4 sm:space-y-6 animate-in zoom-in duration-300 relative overflow-hidden mx-2">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-blue-500" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg sm:rounded-xl text-blue-400">
                  <Info size={18} className="sm:w-5 sm:h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter vibrant-text">Mission Briefing</h2>
              </div>
              <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-3 sm:space-y-4 max-h-[60dvh] overflow-y-auto pr-2 no-scrollbar">
              {Object.entries(level.logic.targetScores).map(([type, score]) => {
                const weight = level.logic.targetWeights[type] || 0;
                if (weight === 0) return null;
                
                const icon = level.logic.customIcons?.[type] || TARGET_ICONS[type] || '❓';
                const isPositive = score > 0;
                const isHazard = type === 'hazard' || score <= -15;
                const isFocusTarget = level.logic.gameType === 'Focus' && (type === 'dog' || type === 'rat');

                return (
                  <div key={type} className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-3xl sm:text-4xl drop-shadow-md">{icon}</div>
                      <div>
                        <div className="text-[8px] sm:text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">{type}</div>
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          <div className={`text-xs sm:text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? `+${score}` : score} Points
                          </div>
                          {isHazard && (
                            <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-rose-500 uppercase tracking-tighter">
                              <AlertTriangle size={8} className="sm:w-[10px] sm:h-[10px]" /> Loses 1 Life
                            </div>
                          )}
                          {isFocusTarget && (
                            <div className="text-[8px] sm:text-[9px] font-black text-amber-500 uppercase tracking-tighter">
                              ⚠️ Miss = -1 Life
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest">Spawn</div>
                      <div className="text-[10px] sm:text-xs font-black text-slate-400">{weight}%</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={() => setShowGuide(false)} variant="primary" size="lg" className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base">
              Understood
            </Button>
          </div>
        ) : gameState === 'countdown' ? (
          <div className="flex flex-col items-center gap-4 sm:gap-8">
            <div className="text-[8rem] sm:text-[12rem] font-black text-blue-500 animate-bounce drop-shadow-[0_0_50px_rgba(59,130,246,0.3)] leading-none">{countdown}</div>
            <button 
              onClick={() => {
                soundService.playClick();
                setShowGuide(true);
              }}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/5 hover:bg-white/10 rounded-xl sm:rounded-2xl border border-white/10 transition-all active:scale-95"
            >
              <Info size={16} className="text-blue-400 sm:w-[18px] sm:h-[18px]" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300">Mission Briefing</span>
            </button>
          </div>
        ) : gameState === 'paused' || gameState === 'ended' ? (
          <div className="glass w-full max-w-sm p-10 rounded-[3.5rem] text-center space-y-8 animate-in zoom-in duration-300">
             <h2 className="text-4xl font-black italic uppercase tracking-tighter vibrant-text">
              {gameState === 'paused' ? 'Paused' : lives <= 0 ? 'Mission Failed' : 'Mission Complete'}
             </h2>
             {gameState === 'ended' && (
               <div className="text-[10px] font-black uppercase tracking-[0.2em] vibrant-text">
                 {lives <= 0 ? 'Neural Integrity Depleted' : 'Extraction Window Closed'}
               </div>
             )}
             <div className="space-y-1">
                <div className="text-7xl font-black text-amber-500 dark:text-amber-400">{score}</div>
                <div className="text-[10px] font-black uppercase tracking-widest vibrant-text-alt">Total Energy Collected</div>
             </div>
             <div className="flex flex-col gap-3">
               <Button onClick={gameState === 'paused' ? () => setGameState('playing') : () => onFinish(score)} variant="primary" size="lg" className="w-full py-5 rounded-3xl">
                  {gameState === 'paused' ? 'Resume Mission' : 'Extract Data'}
               </Button>

               <Button 
                 onClick={handleRestart} 
                 variant="glass" 
                 className="w-full py-4 rounded-2xl border-white/10 text-emerald-400"
               >
                 <RotateCcw size={18} className="mr-2" /> Restart Mission
               </Button>

               {onUpgrade && (
                 <Button 
                   onClick={() => onUpgrade(level)} 
                   variant="glass" 
                   className="w-full py-4 rounded-2xl border-white/10 text-fuchsia-400"
                 >
                   <Zap size={18} className="mr-2 fill-fuchsia-400" /> Upgrade Mission
                 </Button>
               )}

               {gameState === 'paused' && (
                 <Button 
                   onClick={() => setShowGuide(true)} 
                   variant="glass" 
                   className="w-full py-4 rounded-2xl border-white/10 text-blue-400"
                 >
                   <Info size={18} className="mr-2" /> Mission Briefing
                 </Button>
               )}
               <Button onClick={handleExitClick} variant="glass" className="w-full border-none shadow-none text-slate-400">Abort Mission</Button>
             </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4 md:gap-6 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl aspect-square touch-none" style={{ gridTemplateColumns: `repeat(${level.gridSize}, 1fr)` }}>
            {holeStates.map((type, i) => (
              <GameHole 
                key={i} 
                isActive={type !== null} 
                type={type} 
                onHit={() => handleHit(i)} 
                wasHit={hitIndex === i} 
                theme={level.logic.boardTheme} 
                customIcons={level.logic.customIcons}
                themeConfig={level.logic.themeConfig}
                targetSizeMultiplier={level.logic.targetSizeMultiplier}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3 sm:gap-4 py-6 sm:py-12 relative z-20">
        {[...Array(maxLives)].map((_, i) => (
          <div key={i} className="relative">
            <Heart 
              size={28} 
              className={`sm:w-9 sm:h-9 transition-all duration-500 ${i < lives ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'text-slate-800 scale-90 opacity-20'}`} 
            />
            {i >= lives && <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">❌</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LevelPlayer;