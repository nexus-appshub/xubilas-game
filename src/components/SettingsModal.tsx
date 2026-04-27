
import React, { useState, useRef } from 'react';
import { UserStats } from '../types';
import Button from './Button';
import { X, Save, Camera, Volume2, VolumeX, Moon, Sun, LogOut, Upload, Loader2, RefreshCcw, Music, Link, Trash2, PlayCircle, Zap } from 'lucide-react';
import { soundService } from '../services/soundService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserStats;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  onToggleSfx: () => void;
  onToggleBgm: () => void;
  onUpdateUser: (updates: Partial<UserStats>) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onLogin: () => void;
  sessionUser: any;
  customAppBgm: string | null;
  onUpdateBgm: (url: string | null) => void;
}

import { auth } from '../firebase';
import { uploadToSupabase } from '../supabase';
import { compressImageFallback } from '../utils/imageCompressor';
import { AUDIO_PRESETS, DEFAULT_BGM } from '../constants';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  sfxEnabled, 
  bgmEnabled,
  onToggleSfx, 
  onToggleBgm, 
  onUpdateUser,
  theme,
  onToggleTheme,
  onLogout,
  onLogin,
  sessionUser,
  customAppBgm,
  onUpdateBgm
}) => {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [bgmUrl, setBgmUrl] = useState(customAppBgm || '');
  const [uploading, setUploading] = useState(false);
  const [bgmUploading, setBgmUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    onUpdateUser({ username: username.trim() || user.username, avatar });
    onUpdateBgm(bgmUrl.trim() || null);
    onClose();
  };

  const handleBgmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Audio file too large. Max 5MB.");
      return;
    }

    setBgmUploading(true);
    const currentUser = auth.currentUser;
    const isGuest = !currentUser;

    const processLocalBgm = () => {
      // Firestore limit is 1MB. Base64 adds 33%. Safe cap is ~700KB.
      if (file.size > 700 * 1024) {
        alert(isGuest 
          ? "Local storage limit reached (700KB). Signed-in users can upload up to 5MB." 
          : "Storage unavailable: File exceeds the 700KB limit for database fallback. Configure Supabase or use a smaller file.");
        setBgmUploading(false);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBgmUrl(result);
        if (bgmEnabled) {
          soundService.startBGM('custom', result);
        } else {
          soundService.playClick();
        }
        setBgmUploading(false);
      };
      reader.onerror = () => {
        setBgmUploading(false);
        alert("Failed to process local file.");
      }
      reader.readAsDataURL(file);
    };

    if (isGuest) {
      processLocalBgm();
      return;
    }

    const uid = currentUser?.uid || 'guest';
    const fileExtension = file.name.split('.').pop() || 'mp3';

    // 1. Try Supabase
    const supabaseUrl = await uploadToSupabase(file, `bgm/${uid}_${Date.now()}.${fileExtension}`, 'level-assets');
    if (supabaseUrl) {
      setBgmUrl(supabaseUrl);
      if (bgmEnabled) {
        soundService.startBGM('custom', supabaseUrl);
      } else {
        soundService.playClick();
      }
      setBgmUploading(false);
      return;
    }

    // 2. Fallback to schema (Data URL)
    console.warn("Supabase upload failed, falling back to schema base64.");
    alert("Audio upload to Supabase failed. Fallback to offline mode is limited to 700KB.");
    processLocalBgm();
  };

  const handleRandomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file too large (Max 5MB).");
      return;
    }

    setUploading(true);
    const currentUser = auth.currentUser;
    const isGuest = !currentUser;

    const processLocalAvatar = async () => {
      // Automatically compress images > 700KB to fit Firebase limits.
      // If it's an image (and not a GIF), we can try shrinking it via canvas.
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (file.size > 700 * 1024 && file.type.startsWith('image/') && !isGif) {
         try {
           const compressedBase64 = await compressImageFallback(file, 700);
           setAvatar(compressedBase64);
           setUploading(false);
           return;
         } catch (e) {
           console.warn("Compression failed", e);
           // Fallthrough to standard sizing checks
         }
      }
      
      // Firestore limit is 1MB. Base64 adds 33%. Safe cap is ~700KB.
      if (file.size > 700 * 1024) {
        alert(isGuest 
          ? "Local storage limit reached (700KB). Signed-in users can upload up to 5MB." 
          : "Storage unavailable: Image exceeds limit and couldn't be compressed. Configure Supabase or use a smaller file.");
        setUploading(false);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setUploading(false);
      };
      reader.onerror = () => {
        alert("Failed to read local file.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    };

    if (isGuest) {
      await processLocalAvatar();
      return;
    }

    const uid = currentUser?.uid || 'guest';
    let fileExtension = file.name.split('.').pop();
    if (!fileExtension || fileExtension === file.name) {
      fileExtension = file.type.split('/').pop() || 'png';
    }
    if (file.type === 'image/gif') fileExtension = 'gif';

    // 1. Try Supabase
    const supabaseUrl = await uploadToSupabase(file, `avatars/${uid}_${Date.now()}.${fileExtension}`, 'avatars');
    if (supabaseUrl) {
      setAvatar(supabaseUrl);
      setUploading(false);
      return;
    }

    // 2. Fallback to schema (Data URL)
    console.warn("Supabase upload failed, falling back to schema base64.");
    alert("Supabase upload failed. Ensure bucket 'avatars' exists. Falling back to offline mode.");
    await processLocalAvatar();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative glass w-full max-w-sm sm:max-w-md max-h-[90dvh] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none vibrant-text">Pilot Setup</h2>
            <p className="text-slate-500 font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.3em]">Neural Interface</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-400 active:scale-90 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto no-scrollbar pr-1 pb-4">
          {!sessionUser && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 shadow-lg animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-500">
                     <Zap size={16} className="animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-relaxed">
                        Sign in to sync your Neural Identity and custom soundtracks across devices.
                     </p>
                     <button 
                        onClick={onLogin}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                     >
                        <LogOut size={10} className="rotate-180" /> Connect Profile
                     </button>
                  </div>
               </div>
            </div>
          )}

          <div className="p-4 bg-slate-100/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-fuchsia-500/30 shadow-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                  {uploading ? <Loader2 size={24} className="text-blue-600 dark:text-white animate-spin" /> : <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />}
                </div>
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  <button 
                    onClick={handleRandomizeAvatar}
                    title="Randomize"
                    className="p-2 bg-blue-600 text-white rounded-xl shadow-xl transform active:scale-90 transition-all border-2 border-white dark:border-slate-900"
                  >
                    <RefreshCcw size={12} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload"
                    className="p-2 bg-fuchsia-600 text-white rounded-xl shadow-xl transform active:scale-90 transition-all border-2 border-white dark:border-slate-900"
                  >
                    <Upload size={12} />
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/gif, image/*" 
                  onChange={handleAvatarUpload} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Pilot ID</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-black outline-none focus:border-blue-500 transition-all"
                  placeholder="Enter Callsign..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={onToggleSfx}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${sfxEnabled ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400' : 'bg-slate-200/50 dark:bg-white/5 border-slate-300 dark:border-transparent text-slate-500'}`}
             >
                <div className="mb-2">{sfxEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}</div>
                <span className="font-black uppercase tracking-widest text-[8px]">SFX Link</span>
             </button>

             <button 
                onClick={onToggleBgm}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${bgmEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200/50 dark:bg-white/5 border-slate-300 dark:border-transparent text-slate-500'}`}
             >
                <div className="mb-2">{bgmEnabled ? <Music size={24} /> : <Music size={24} className="opacity-40" />}</div>
                <span className="font-black uppercase tracking-widest text-[8px]">BGM Link</span>
             </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
             <button 
                onClick={onToggleTheme}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-700'}`}
             >
                <div className="mb-2">{theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}</div>
                <span className="font-black uppercase tracking-widest text-[8px]">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
             </button>
          </div>

          <div className="p-5 bg-slate-100/50 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10 space-y-4">
             <div className="flex items-center gap-2 mb-1">
                <Music size={16} className="text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Soundtrack (BGM)</h3>
             </div>
             
             <div className="space-y-3">
                <div className="flex flex-wrap gap-2 py-1">
                   {AUDIO_PRESETS.bgm.map(preset => (
                      <button
                         key={preset.url}
                         onClick={() => {
                            setBgmUrl(preset.url);
                            if (bgmEnabled) soundService.startBGM('custom', preset.url);
                         }}
                         className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${bgmUrl === preset.url ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}
                      >
                         {preset.name}
                      </button>
                   ))}
                </div>
                
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                         <Link size={14} />
                      </div>
                      <input 
                        type="text"
                        value={bgmUrl}
                        onChange={(e) => setBgmUrl(e.target.value)}
                        placeholder="Paste Audio URL..."
                        className="w-full bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-3 text-[10px] text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all"
                      />
                   </div>
                   {bgmUrl && (
                     <button 
                       onClick={() => soundService.startBGM('custom', bgmUrl)}
                       className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl active:scale-90 transition-all"
                       title="Preview Music"
                     >
                        <PlayCircle size={18} />
                     </button>
                   )}
                   <button 
                     onClick={() => bgmInputRef.current?.click()}
                     className={`p-3 rounded-xl border transition-all active:scale-90 ${bgmUploading ? 'bg-blue-500/20 border-blue-500/50' : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/5 text-slate-500 dark:text-slate-400'}`}
                     title="Upload Local Audio"
                   >
                      {bgmUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Upload size={18} />}
                   </button>
                   <input 
                     type="file" 
                     ref={bgmInputRef} 
                     className="hidden" 
                     accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg" 
                     onChange={handleBgmUpload} 
                   />
                </div>

                {bgmUrl && bgmUrl !== DEFAULT_BGM && (
                  <button 
                    onClick={() => { setBgmUrl(DEFAULT_BGM); soundService.playClick(); }}
                    className="w-full py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-all"
                  >
                    <RefreshCcw size={12} /> RESTORE ORIGINAL XUBILAS BGM
                  </button>
                )}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 shrink-0">
           {sessionUser && (
             <div className="space-y-3">
               <div className="flex items-center justify-between px-4 py-2 bg-emerald-600/10 dark:bg-emerald-500/5 rounded-xl border border-emerald-600/20 dark:border-emerald-500/10">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                     <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest italic">Neural Link Active</span>
                  </div>
                  <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">ID: {sessionUser.uid.substring(0, 8)}</span>
               </div>
               <button 
                 onClick={onLogout} 
                 className="w-full py-4 flex items-center justify-center gap-2 text-rose-500 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95 border border-rose-500/10"
               >
                 <LogOut size={16} /> DISCONNECT SESSION
               </button>
             </div>
           )}
           <Button onClick={handleSave} variant="primary" size="lg" className="w-full py-5 rounded-[2rem] text-base italic font-black tracking-tighter mt-2 border-b-4 border-black/20">
             SAVE & SYNC
           </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
