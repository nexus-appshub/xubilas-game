import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Zap, Gamepad2, Shield, Star, Timer, Sparkles, Pause, Play, Home } from 'lucide-react';
import { soundService } from '../../services/soundService';

interface SnakeGameProps {
  onBack: () => void;
}

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

type FoodType = 'NORMAL' | 'BONUS' | 'SPEED' | 'SHIELD' | 'SLOW' | 'MULTIPLIER';

interface FoodData extends Point {
  type: FoodType;
  expiresAt?: number;
}

interface ActiveEffect {
  type: FoodType;
  color: string;
  expiresAt: number;
}

interface Portal {
  a: Point;
  b: Point;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = 'UP';

const THEMES = [
  { bg: 'bg-emerald-900', border: 'border-emerald-500/30', head: 'bg-emerald-400', body: 'bg-emerald-600', shadowColor: 'emerald', grid: '#10b981' },
  { bg: 'bg-indigo-900', border: 'border-indigo-500/30', head: 'bg-indigo-400', body: 'bg-indigo-600', shadowColor: 'indigo', grid: '#6366f1' },
  { bg: 'bg-rose-900', border: 'border-rose-500/30', head: 'bg-rose-400', body: 'bg-rose-600', shadowColor: 'rose', grid: '#f43f5e' },
  { bg: 'bg-amber-900', border: 'border-amber-500/30', head: 'bg-amber-400', body: 'bg-amber-600', shadowColor: 'amber', grid: '#f59e0b' },
  { bg: 'bg-cyan-900', border: 'border-cyan-500/30', head: 'bg-cyan-400', body: 'bg-cyan-600', shadowColor: 'cyan', grid: '#06b6d4' },
  { bg: 'bg-fuchsia-900', border: 'border-fuchsia-500/30', head: 'bg-fuchsia-400', body: 'bg-fuchsia-600', shadowColor: 'fuchsia', grid: '#d946ef' },
];

const SnakeGame: React.FC<SnakeGameProps> = ({ onBack }) => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<FoodData>({ x: 5, y: 5, type: 'NORMAL' });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [obstacles, setObstacles] = useState<Point[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [activeEffect, setActiveEffect] = useState<ActiveEffect | null>(null);
  const [hasShield, setHasShield] = useState(false);
  
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [shake, setShake] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [combo, setCombo] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  directionRef.current = direction;

  const activeTheme = THEMES[(currentLevel - 1) % THEMES.length];

  const generateFood = useCallback((currentSnake: Point[], obs: Point[], ports: Portal[], forceType?: FoodType): FoodData => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      
      const onSnake = currentSnake.some(s => s.x === newFood.x && s.y === newFood.y);
      const onObstacle = obs.some(o => o.x === newFood.x && o.y === newFood.y);
      const onPortal = ports.some(p => (p.a.x === newFood.x && p.a.y === newFood.y) || (p.b.x === newFood.x && p.b.y === newFood.y));
      
      if (!onSnake && !onObstacle && !onPortal) {
        break;
      }
    }
    
    let type: FoodType = forceType || 'NORMAL';
    if (!forceType) {
      const rand = Math.random();
      if (rand > 0.95) type = 'MULTIPLIER';
      else if (rand > 0.88) type = 'SHIELD';
      else if (rand > 0.83) type = 'SLOW';
      else if (rand > 0.70) type = 'BONUS';
      else if (rand > 0.60) type = 'SPEED';
    }

    return {
      ...newFood,
      type,
      expiresAt: type !== 'NORMAL' && type !== 'SHIELD' ? Date.now() + 6000 : undefined
    };
  }, []);

  const generateLevelData = useCallback((level: number, diff: Difficulty) => {
    // Generate obstactles and portals
    const obsTotal = diff === 'EASY' ? 0 : diff === 'MEDIUM' ? Math.floor(level / 2) * 2 : level * 2;
    const portalsTotal = diff !== 'EASY' && level > 2 ? Math.floor(level / 3) : 0;
    
    const obs: Point[] = [];
    const ports: Portal[] = [];
    
    const isSafe = (x: number, y: number) => {
      // Avoid center spawn area
      if (Math.abs(x - 10) <= 2 && Math.abs(y - 10) <= 2) return false;
      // Avoid existing obstacles
      if (obs.some(o => o.x === x && o.y === y)) return false;
      // Avoid existing portals
      if (ports.some(p => (p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y))) return false;
      return true;
    };

    const getSafePoint = (): Point => {
      let pt: Point;
      do {
        pt = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      } while (!isSafe(pt.x, pt.y));
      return pt;
    };
    
    for (let i=0; i<obsTotal; i++) {
      obs.push(getSafePoint());
    }
    
    for (let i=0; i<portalsTotal; i++) {
        let a = getSafePoint();
        // temporarily push 'a' so 'b' won't overlap 'a'
        ports.push({ a, b: {x: -1, y: -1} }); 
        let b = getSafePoint();
        ports[ports.length - 1].b = b;
    }
    return { obs, ports };
  }, []);


  const startGame = (selectedDifficulty: Difficulty) => {
    soundService.playGameStart();
    soundService.startBGM('energetic');
    setDifficulty(selectedDifficulty);
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setCombo(0);
    setCurrentLevel(1);
    setSpeedMultiplier(1);
    setActiveEffect(null);
    setHasShield(false);
    setGameOver(false);
    setHasStarted(false);
    setParticles([]);
    setPopups([]);
    
    const { obs, ports } = generateLevelData(1, selectedDifficulty);
    setObstacles(obs);
    setPortals(ports);
    
    setFood(generateFood(INITIAL_SNAKE, obs, ports, 'NORMAL'));
  };

  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Removed old useEffect that called generateFood immediately

  useEffect(() => {
    let animFrame: number;
    const updateParticles = () => {
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0)
      );
      animFrame = requestAnimationFrame(updateParticles);
    };
    animFrame = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 0.5 + Math.random() * 0.5;
      return {
        id: Date.now() + i,
        x: (x + 0.5) * (100 / GRID_SIZE),
        y: (y + 0.5) * (100 / GRID_SIZE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1
      };
    });
    setParticles(prev => [...prev, ...newParticles]);
  };

  const spawnPopup = (x: number, y: number, text: string, color: string) => {
    const popup = {
      id: Date.now(),
      x: (x + 0.5) * (100 / GRID_SIZE),
      y: (y - 0.5) * (100 / GRID_SIZE),
      text,
      color
    };
    setPopups(prev => [...prev, popup]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== popup.id));
    }, 800);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (!hasStarted && !gameOver) setHasStarted(true);
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== 'LEFT') setDirection('RIGHT');
          break;
        case ' ':
          if (gameOver) {
            if (difficulty) startGame(difficulty);
          }
          else setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, hasStarted]);

  useEffect(() => {
    if (!hasStarted || gameOver || isPaused || difficulty === null) return;

    if (food.expiresAt && Date.now() > food.expiresAt) {
      setCombo(0);
      setFood(generateFood(snake, obstacles, portals, 'NORMAL'));
    }
    
    if (activeEffect && Date.now() > activeEffect.expiresAt) {
      setActiveEffect(null);
      setSpeedMultiplier(1);
    }

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        let newHead = { ...head };

        switch (directionRef.current) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Wrap around walls
        if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
        else if (newHead.x >= GRID_SIZE) newHead.x = 0;
        
        if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
        else if (newHead.y >= GRID_SIZE) newHead.y = 0;
        
        // Handle Portals
        const pMatch = portals.find(p => (p.a.x === newHead.x && p.a.y === newHead.y) || (p.b.x === newHead.x && p.b.y === newHead.y));
        if (pMatch) {
            newHead = (pMatch.a.x === newHead.x && pMatch.a.y === newHead.y) ? { ...pMatch.b } : { ...pMatch.a };
            soundService.playBeep(true);
            spawnParticles(newHead.x, newHead.y, '#9333ea');
        }

        // Collision with self or obstacles
        const onSelf = prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y);
        const onObstacle = obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y);
        
        if (onSelf || onObstacle) {
          if (hasShield) {
            setHasShield(false);
            setActiveEffect(null);
            soundService.playHeartLoss();
            spawnParticles(newHead.x, newHead.y, '#94a3b8');
            spawnPopup(newHead.x, newHead.y, 'Shield Broken!', '#94a3b8');
            setShake(true);
            setTimeout(() => setShake(false), 300);
            return prevSnake; // Skip this move, snake survives but stops advancing
          } else {
            soundService.stopBGM();
            soundService.playGameEnd(false);
            setShake(true);
            setTimeout(() => setShake(false), 300);
            setGameOver(true);
            return prevSnake;
          }
        }

        const newSnake = [newHead, ...prevSnake];

        // Eat food
        if (newHead.x === food.x && newHead.y === food.y) {
          soundService.playWhack();
          
          let points = 10;
          let color = activeTheme.grid;
          
          if (food.type === 'BONUS') {
            points = 30;
            color = '#f59e0b';
            setCombo(c => c + 1);
            setActiveEffect({ type: 'BONUS', color, expiresAt: Date.now() + 1000 });
          } else if (food.type === 'SPEED') {
            points = 20;
            color = '#3b82f6';
            setSpeedMultiplier(s => Math.min(s + 0.5, 2.5));
            setCombo(c => c + 1);
            setActiveEffect({ type: 'SPEED', color, expiresAt: Date.now() + 6000 });
          } else if (food.type === 'SLOW') {
            points = 20;
            color = '#6366f1';
            setSpeedMultiplier(0.5);
            setCombo(c => c + 1);
            setActiveEffect({ type: 'SLOW', color, expiresAt: Date.now() + 8000 });
          } else if (food.type === 'SHIELD') {
            points = 20;
            color = '#94a3b8';
            setHasShield(true);
            setCombo(c => c + 1);
            setActiveEffect({ type: 'SHIELD', color, expiresAt: Date.now() + 999999999 }); // until broken
          } else if (food.type === 'MULTIPLIER') {
            points = 20;
            color = '#d946ef';
            setCombo(c => c + 1);
            setActiveEffect({ type: 'MULTIPLIER', color, expiresAt: Date.now() + 10000 });
          } else {
            setCombo(c => c + 1);
          }
          
          let multi = activeEffect?.type === 'MULTIPLIER' ? 2 : 1;
          const comboBonus = Math.floor(combo / 3) * 5;
          const totalPoints = (points + comboBonus) * multi;
          
          spawnParticles(newHead.x, newHead.y, color);
          spawnPopup(newHead.x, newHead.y, `+${totalPoints}${multi > 1 ? ' (x2)' : ''}${comboBonus > 0 ? ' Combo!' : ''}`, color);

          setScore(s => {
            const newScore = s + totalPoints;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('snakeHighScore', newScore.toString());
            }
            
            // Check level up
            const nextLevel = Math.floor(newScore / 500) + 1;
            if (nextLevel > currentLevel) {
               soundService.playLevelLoad();
               setCurrentLevel(nextLevel);
               spawnPopup(newHead.x, newHead.y - 2, `LEVEL UP!`, '#10b981');
               const { obs, ports } = generateLevelData(nextLevel, difficulty);
               setObstacles(obs);
               setPortals(ports);
               setFood(generateFood(newSnake, obs, ports, 'NORMAL'));
               return newScore;
            }
            
            return newScore;
          });
          
          const nextLevel = Math.floor((score + totalPoints) / 500) + 1;
          if (nextLevel === currentLevel) {
             setFood(generateFood(newSnake, obstacles, portals));
          }
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const baseSpeed = difficulty === 'HARD' ? 120 : difficulty === 'MEDIUM' ? 170 : 250;
    const currentSpeed = Math.max(60, baseSpeed * Math.max(0.4, 1 - (snake.length * 0.015)) / speedMultiplier);
    const gameInterval = setInterval(moveSnake, currentSpeed);
    return () => clearInterval(gameInterval);
  }, [hasStarted, gameOver, isPaused, food, highScore, generateFood, combo, speedMultiplier, snake.length, difficulty, currentLevel, activeEffect, obstacles, portals, hasShield, score, activeTheme]);

  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(int);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    // Prevent default scrolling on the game area
    if (e.cancelable) e.preventDefault();
    
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;
    
    if (Math.abs(deltaX) < 40 && Math.abs(deltaY) < 40) return;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) handleControlClick('RIGHT');
      else handleControlClick('LEFT');
    } else {
      if (deltaY > 0) handleControlClick('DOWN');
      else handleControlClick('UP');
    }
    
    // Reset to avoid double triggering continually
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleControlClick = (newDir: Direction) => {
    if (!hasStarted && !gameOver) setHasStarted(true);
    
    if (newDir === 'UP' && directionRef.current !== 'DOWN') setDirection('UP');
    if (newDir === 'DOWN' && directionRef.current !== 'UP') setDirection('DOWN');
    if (newDir === 'LEFT' && directionRef.current !== 'RIGHT') setDirection('LEFT');
    if (newDir === 'RIGHT' && directionRef.current !== 'LEFT') setDirection('RIGHT');
  };

  const getFoodColor = (type: FoodType) => {
    switch(type) {
      case 'BONUS': return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]';
      case 'SPEED': return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]';
      case 'SHIELD': return 'bg-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.6)]';
      case 'SLOW': return 'bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.6)]';
      case 'MULTIPLIER': return 'bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.6)]';
      default: return 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col pt-safe animate-in fade-in duration-300">
      <header className="p-3 sm:p-4 flex items-center justify-between z-10 sticky top-0 border-b border-white/5 bg-slate-950/80 backdrop-blur-md shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-all p-2 rounded-xl bg-white/5 active:scale-90">
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 text-white">
          <Gamepad2 size={18} className="text-emerald-400 sm:w-6 sm:h-6" />
          <h2 className="text-sm sm:text-lg font-bold tracking-widest uppercase">
            FUN HUB
          </h2>
        </div>
        <div className="w-10" />
      </header>

      <div 
        className="flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 touch-none overflow-hidden relative"
        onTouchStart={difficulty ? handleTouchStart : undefined}
        onTouchMove={difficulty ? handleTouchMove : undefined}
        onTouchEnd={difficulty ? handleTouchEnd : undefined}
      >
        {difficulty && (
          <div className="w-full max-w-[450px] bg-slate-900/50 border border-slate-800 rounded-2xl p-2 sm:p-4 mb-2 sm:mb-4 flex flex-col gap-2 sm:gap-4 shrink-0 shadow-lg backdrop-blur-sm">
             <div className="flex justify-between items-center">
                 <div className="flex flex-col items-start min-w-[50px] sm:min-w-[60px]">
                     <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold tracking-widest uppercase">Score</span>
                     <span className="text-xl sm:text-2xl font-black text-rose-400 leading-none">{score}</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <button 
                       onClick={() => {
                         soundService.playClick();
                         setIsPaused(!isPaused);
                       }}
                       className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 hover:bg-white/10 active:scale-90 transition-all"
                     >
                       {isPaused ? <Play size={14} /> : <Pause size={14} />}
                     </button>
                     <button 
                       onClick={() => {
                         soundService.playClick();
                         startGame(difficulty);
                       }}
                       className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 hover:bg-white/10 active:scale-90 transition-all"
                     >
                       <RotateCcw size={14} />
                     </button>
                 </div>
                 
                 <div className="flex flex-col items-end min-w-[50px] sm:min-w-[60px]">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold tracking-widest uppercase">Level</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 leading-none">{currentLevel}</span>
                 </div>
             </div>
             
             <div className="w-full bg-slate-950 rounded-full p-1 sm:p-1.5 flex items-center gap-1 border border-slate-800/50">
                {THEMES.map((theme, i) => (
                  <div key={i} className={`h-1 sm:h-2 rounded-full flex-1 transition-all duration-500 ${currentLevel > i ? theme.head : 'bg-slate-800 opacity-30'} ${currentLevel === i + 1 ? 'shadow-[0_0_10px_currentColor] scale-y-125' : ''}`} />
                ))}
             </div>
          </div>
        )}

        {!difficulty ? (
          <div className="w-full max-w-[400px] flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95 my-auto">
             <Gamepad2 size={64} className="text-emerald-500 mb-4 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
             <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-6 text-center">Select Difficulty</h2>
             {['EASY', 'MEDIUM', 'HARD'].map(d => (
               <button 
                 key={d}
                 onClick={() => startGame(d as Difficulty)}
                 className={`w-full py-4 rounded-xl font-black italic tracking-widest text-lg uppercase transition-all shadow-lg active:scale-95 ${
                   d === 'EASY' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                   d === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' :
                   'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                 }`}
               >
                 {d}
               </button>
             ))}
          </div>
        ) : (
          <div className={`relative aspect-square w-full max-w-[min(100%,500px,calc(100vh-300px))] ${activeTheme.bg} border-4 ${activeTheme.border} rounded-2xl ${activeTheme.shadowColor ? `shadow-[0_0_30px_rgba(${activeTheme.grid === '#10b981' ? '16,185,129' : activeTheme.grid === '#6366f1' ? '99,102,241' : activeTheme.grid === '#f43f5e' ? '244,63,94' : activeTheme.grid === '#f59e0b' ? '245,158,11' : activeTheme.grid === '#06b6d4' ? '6,182,212' : '217,70,239'},0.15)]` : ''} overflow-hidden ${shake ? 'animate-shake' : ''} transition-all duration-300 shadow-2xl`}>
            
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: `linear-gradient(to right, ${activeTheme.grid} 1px, transparent 1px), linear-gradient(to bottom, ${activeTheme.grid} 1px, transparent 1px)`,
              backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
            }}/>

            {/* Effect Overlays */}
            {activeEffect && activeEffect.type !== 'SHIELD' && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-950/80 backdrop-blur-sm z-30" style={{ borderColor: activeEffect.color, color: activeEffect.color }}>
                {activeEffect.type === 'SLOW' && <Timer size={12} />}
                {activeEffect.type === 'SPEED' && <Zap size={12} />}
                {activeEffect.type === 'BONUS' && <Star size={12} />}
                {activeEffect.type === 'MULTIPLIER' && <Sparkles size={12} />}
                <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
                  {activeEffect.type} {Math.max(0, Math.ceil((activeEffect.expiresAt - now) / 1000))}S
                </span>
              </div>
            )}
            
            {hasShield && (
               <div className={`absolute top-3 ${activeEffect && activeEffect.type !== 'SHIELD' ? 'left-[100px]' : 'left-3'} flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-950/80 backdrop-blur-sm z-30 transition-all`} style={{ borderColor: '#cbd5e1', color: '#cbd5e1' }}>
                 <Shield size={12} />
                 <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">SHIELD</span>
               </div>
            )}

            {combo > 1 && (
               <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-30">
                  <span className="text-[10px] font-black italic tracking-wider text-amber-400">COMBO x{combo}</span>
                  <div className="w-16 h-1 bg-amber-950 rounded-full overflow-hidden">
                     <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${combo > 0 && combo % 3 === 0 ? 100 : (combo % 3) * 33.33}%` }} />
                  </div>
               </div>
            )}

            {/* Render obstacles */}
            {obstacles.map((obs, i) => (
              <div 
                key={`obs-${i}`}
                className="absolute bg-slate-400 flex items-center justify-center rounded-[2px]"
                style={{
                  left: `${(obs.x / GRID_SIZE) * 100}%`,
                  top: `${(obs.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                }}
              >
                 <div className="w-full h-full border border-slate-600 border-t-slate-200 border-l-slate-200" />
              </div>
            ))}
            
            {/* Render portals */}
            {portals.map((p, i) => (
              <React.Fragment key={`portal-${i}`}>
                <div 
                  className="absolute bg-purple-600 rounded-full animate-spin flex items-center justify-center opacity-80"
                  style={{
                    left: `${(p.a.x / GRID_SIZE) * 100}%`,
                    top: `${(p.a.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    boxShadow: '0 0 10px #9333ea'
                  }}
                ><div className="w-1.5 h-1.5 rounded-full bg-black" /></div>
                <div 
                  className="absolute bg-purple-600 rounded-full animate-spin flex items-center justify-center opacity-80"
                  style={{
                    left: `${(p.b.x / GRID_SIZE) * 100}%`,
                    top: `${(p.b.y / GRID_SIZE) * 100}%`,
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    boxShadow: '0 0 10px #9333ea'
                  }}
                ><div className="w-1.5 h-1.5 rounded-full bg-black" /></div>
              </React.Fragment>
            ))}

            {/* Render snake */}
            {snake.map((segment, index) => {
              const baseHeadColor = activeTheme.head;
              const baseBodyColor = activeTheme.body;
              
              // Map tailwind bg colors dynamically if activeEffect color is hex
              let styleObj: any = {
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - (index / Math.max(10, snake.length)))
              };
              
              if (activeEffect) {
                 styleObj.backgroundColor = activeEffect.color;
                 if (index === 0) styleObj.boxShadow = `0 0 10px ${activeEffect.color}`;
              }

              return (
                <div
                  key={`${segment.x}-${segment.y}-${index}`}
                  className={`absolute transition-all duration-75 ${
                     activeEffect ? (index === 0 ? 'z-10 rounded-sm' : 'rounded-sm scale-[0.85]') :
                     (index === 0 ? `${baseHeadColor} z-10 rounded-sm shadow-[0_0_10px_currentColor]` : `${baseBodyColor} rounded-sm scale-[0.85]`)
                  }`}
                  style={styleObj}
                />
              )
            })}

            {/* Render food */}
            <div
              className={`absolute rounded-full animate-pulse transition-all flex items-center justify-center ${getFoodColor(food.type)}`}
              style={{
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                transform: food.type !== 'NORMAL' ? 'scale(0.9)' : 'scale(0.8)'
              }}
            >
              {food.type === 'BONUS' && <Star size={12} className="text-white drop-shadow-md" />}
              {food.type === 'SPEED' && <Zap size={12} className="text-white drop-shadow-md" />}
              {food.type === 'SHIELD' && <Shield size={10} className="text-slate-700 drop-shadow-md" />}
              {food.type === 'SLOW' && <Timer size={12} className="text-white drop-shadow-md" />}
              {food.type === 'MULTIPLIER' && <Sparkles size={12} className="text-white drop-shadow-md" />}
            </div>

            {/* Render particles */}
            {particles.map(p => (
              <div
                key={p.id}
                className="absolute w-1.5 h-1.5 rounded-full z-20 pointer-events-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  backgroundColor: p.color,
                  opacity: p.life,
                  transform: `scale(${p.life})`
                }}
              />
            ))}

            {/* Render popups */}
            {popups.map(p => (
              <div
                key={p.id}
                className="absolute z-30 pointer-events-none text-[10px] font-black uppercase italic tracking-widest animate-in slide-in-from-bottom-4 fade-in duration-300"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  color: p.color,
                  transform: 'translate(-50%, -100%)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {p.text}
              </div>
            ))}

            {!hasStarted && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                <span className="text-white font-black italic tracking-widest uppercase animate-pulse text-lg mb-2">Swipe or Use Arrows</span>
                <div className="flex flex-wrap items-center justify-center gap-3 px-4 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Normal</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Bonus</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Speed</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300" /> Shield</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Slow</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-fuchsia-500" /> 2x</span>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 backdrop-blur-md z-20 transition-all duration-300">
                <h3 className="text-4xl font-black italic tracking-tighter uppercase text-rose-500 drop-shadow-lg mb-2">Game Over</h3>
                <p className="text-white font-black mb-6 text-xl">Final Score: {score}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => startGame(difficulty)}
                    className="flex items-center gap-2 px-6 py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <RotateCcw size={20} /> Play Again
                  </button>
                  <button 
                    onClick={() => setDifficulty(null)}
                    className="flex items-center gap-2 px-6 py-4 bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-600 active:scale-95 transition-all shadow-lg"
                  >
                    Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Controls */}
        {difficulty && (
          <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-2 sm:hidden w-full max-w-[200px] sm:max-w-[240px]">
            <div />
            <button onClick={() => handleControlClick('UP')} className="bg-white/10 active:bg-white/20 p-3 sm:p-4 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="rotate-90 w-5 h-5" /></button>
            <div />
            <button onClick={() => handleControlClick('LEFT')} className="bg-white/10 active:bg-white/20 p-3 sm:p-4 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <button onClick={() => handleControlClick('DOWN')} className="bg-white/10 active:bg-white/20 p-3 sm:p-4 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="-rotate-90 w-5 h-5" /></button>
            <button onClick={() => handleControlClick('RIGHT')} className="bg-white/10 active:bg-white/20 p-3 sm:p-4 rounded-xl flex items-center justify-center text-white transition-colors"><ArrowLeft className="rotate-180 w-5 h-5" /></button>
          </div>
        )}
      </div>

    </div>
  );
};

export default SnakeGame;
