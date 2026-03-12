
import React, { useState, useEffect } from 'react';
import { TargetType, BoardTheme, ThemeConfig } from '../types';
import { TARGET_ICONS } from '../constants';

interface GameHoleProps {
  isActive: boolean;
  type: TargetType | null;
  onHit: () => void;
  wasHit?: boolean;
  disabled?: boolean;
  theme?: BoardTheme;
  customIcons?: Record<string, string>;
  themeConfig?: ThemeConfig;
  targetSizeMultiplier?: number;
}

const THEME_STYLES: Record<BoardTheme, { outer: string, inner: string, glow: string }> = {
  Cyber: { outer: 'from-slate-800 to-black border-blue-500/30', inner: 'bg-black', glow: 'rgba(56,189,248,0.4)' },
  Classic: { outer: 'from-amber-900 to-black border-amber-950', inner: 'bg-green-950', glow: 'rgba(132,204,22,0.3)' },
  Volcano: { outer: 'from-red-950 to-black border-red-900', inner: 'bg-orange-950', glow: 'rgba(239,68,68,0.4)' },
  Void: { outer: 'from-indigo-950 to-black border-purple-900/40', inner: 'bg-black', glow: 'rgba(168,85,247,0.4)' },
  CandyLand: { outer: 'from-pink-300 to-rose-400 border-white/50', inner: 'bg-fuchsia-100', glow: 'rgba(244,114,182,0.6)' },
  SciFiCity: { outer: 'from-slate-700 to-slate-900 border-cyan-400/50', inner: 'bg-slate-950', glow: 'rgba(34,211,238,0.5)' },
  EnchantedForest: { outer: 'from-emerald-900 to-stone-900 border-lime-800/50', inner: 'bg-emerald-950', glow: 'rgba(132,204,22,0.5)' },
  Insane: { outer: 'from-rose-950 to-black border-rose-600/50', inner: 'bg-black', glow: 'rgba(244,63,94,0.6)' }
};

const GameHole: React.FC<GameHoleProps> = ({ isActive, type, onHit, wasHit, disabled, theme = 'Cyber', customIcons, themeConfig, targetSizeMultiplier = 1.0 }) => {
  const baseStyles = THEME_STYLES[theme] || THEME_STYLES.Cyber;
  const [displayType, setDisplayType] = useState<TargetType | null>(type);

  useEffect(() => {
    if (isActive) setDisplayType(type);
    else {
      const t = setTimeout(() => setDisplayType(null), 400);
      return () => clearTimeout(t);
    }
  }, [isActive, type]);

  const getIconData = (t: TargetType): string => {
    if (customIcons && customIcons[t]) return customIcons[t];
    return TARGET_ICONS[t] || '❓';
  };

  const isImageData = (str: string) => {
    return str.startsWith('data:image') || str.startsWith('http');
  };

  // Override styles if themeConfig is present
  const customOuterStyle = themeConfig?.primaryColor 
    ? { backgroundImage: `linear-gradient(to bottom, ${themeConfig.primaryColor}, black)`, borderColor: themeConfig.accentColor || 'transparent' } 
    : {};
  const customInnerStyle = themeConfig?.secondaryColor ? { backgroundColor: themeConfig.secondaryColor } : {};
  const customGlow = themeConfig?.accentColor ? { background: `radial-gradient(circle at center, ${themeConfig.accentColor}66 0%, transparent 75%)` } : { background: `radial-gradient(circle at center, ${baseStyles.glow} 0%, transparent 75%)` };

  const iconData = displayType ? getIconData(displayType) : '';
  const isImg = isImageData(iconData);

  return (
    <div className="relative w-full aspect-square p-1">
      <div className={`relative w-full h-full rounded-full transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100'}`}>
        {/* Hole base */}
        <div 
          className={`absolute inset-0 bg-gradient-to-b ${!themeConfig?.primaryColor ? baseStyles.outer : ''} rounded-full border-4 shadow-2xl transition-colors duration-500`}
          style={customOuterStyle}
        />
        <div 
          className={`absolute inset-[15%] ${!themeConfig?.secondaryColor ? baseStyles.inner : ''} rounded-full shadow-inner overflow-hidden transition-colors duration-500`}
          style={customInnerStyle}
        >
           {/* Glow Effect */}
           <div 
             className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
             style={customGlow}
           />
           
           {/* Target Piece */}
           <div 
             onPointerDown={() => isActive && !disabled && onHit()}
             className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out transform
               ${isActive ? 'translate-y-[-10%] opacity-100' : 'translate-y-full opacity-0 scale-50'}`}
             style={isActive ? { transform: `translateY(-10%) scale(${targetSizeMultiplier})` } : {}}
           >
              {displayType && (
                isImg ? (
                  <img 
                    src={iconData} 
                    alt="target" 
                    className="w-[80%] h-[80%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  />
                ) : (
                  <span className="text-4xl sm:text-6xl drop-shadow-md select-none">{iconData}</span>
                )
              )}
           </div>

           {/* Hit Burst Effect */}
           {wasHit && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="text-4xl animate-ping">💥</div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default GameHole;
