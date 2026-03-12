
import React from 'react';
import { soundService } from '../services/soundService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  onClick,
  loading = false,
  disabled,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-black transition-all duration-300 rounded-xl active:scale-[0.96] group select-none touch-manipulation overflow-hidden whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed uppercase italic tracking-tighter";
  
  const variants = {
    primary: `
      bg-gradient-to-br from-purple-500 via-fuchsia-600 to-pink-700 
      text-amber-200 
      shadow-[0_2px_0_0_rgba(112,26,117,1),0_4px_8px_-4px_rgba(236,72,153,0.5)] 
      hover:shadow-[0_3px_0_0_rgba(112,26,117,1),0_6px_12px_-4px_rgba(236,72,153,0.6)] 
      active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(112,26,117,1),0_1px_3px_-2px_rgba(236,72,153,0.4)]
    `,
    secondary: `
      bg-gradient-to-br from-indigo-400 via-purple-500 to-fuchsia-700 
      text-blue-100 
      shadow-[0_2px_0_0_rgba(75,30,138,1),0_4px_8px_-4px_rgba(168,85,247,0.5)] 
      active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(75,30,138,1),0_1px_3px_-2px_rgba(168,85,247,0.4)]
    `,
    danger: `
      bg-gradient-to-br from-rose-400 via-rose-500 to-pink-700 
      text-slate-200 
      shadow-[0_2px_0_0_rgba(159,18,57,1),0_4px_8px_-4px_rgba(244,63,94,0.5)] 
      active:translate-y-0.5 active:shadow-[0_1px_0_0_rgba(159,18,57,1),0_1px_3px_-2px_rgba(244,63,94,0.4)]
    `,
    glass: `
      glass text-slate-900 dark:text-slate-100 
      active:translate-y-0.5 active:shadow-none
    `
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-[9px] uppercase tracking-wider",
    md: "px-4 py-2.5 text-[10px] tracking-wide",
    lg: "px-6 py-3.5 text-xs tracking-tighter italic uppercase"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) return;
    soundService.playClick();
    if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      <span className="absolute inset-x-0 top-0 h-[1px] bg-white/20 rounded-t-xl pointer-events-none" />
      <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
        {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {children}
      </span>
      <div className="absolute inset-0 translate-x-[-100%] group-hover:animate-[shine_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </button>
  );
};

export default Button;
