
import React, { useState, useRef } from 'react';
import { UserStats } from '../types';
import Button from './Button';
import { X, Save, Camera, Volume2, VolumeX, Moon, Sun, LogOut, Upload, Loader2, RefreshCcw, Music, Link, Trash2, PlayCircle } from 'lucide-react';
import { getSupabase } from '../services/supabaseClient';
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
  customAppBgm: string | null;
  onUpdateBgm: (url: string | null) => void;
}

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
  customAppBgm,
  onUpdateBgm
}) => {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar);
  const [bgmUrl, setBgmUrl] = useState(customAppBgm || '');
  const [uploading, setUploading] = useState(false);
  const [bgmUploading, setBgmUploading] = useState(false);
  const [pendingBgmFile, setPendingBgmFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    let finalBgmUrl = bgmUrl;
    
    if (pendingBgmFile) {
      setBgmUploading(true);
      const uploadedUrl = await uploadBgmToSupabase(pendingBgmFile);
      if (uploadedUrl) {
        finalBgmUrl = uploadedUrl;
      } else {
        // If upload failed, clear the base64 to avoid local storage bloat
        finalBgmUrl = '';
        alert("Audio upload failed. Settings saved without custom music.");
      }
      setBgmUploading(false);
    } else if (finalBgmUrl.startsWith('data:')) {
      // Safety check: don't allow base64 strings to be saved
      finalBgmUrl = '';
    }

    onUpdateUser({ username: username.trim() || user.username, avatar });
    onUpdateBgm(finalBgmUrl.trim() || null);
    onClose();
  };

  const uploadBgmToSupabase = async (file: File): Promise<string | null> => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `bgm/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('level-assets')
        .upload(filePath, file);

      if (uploadError) {
        const { error: fallbackError } = await supabase.storage
          .from('level-icons')
          .upload(filePath, file);
        if (fallbackError) throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(uploadError ? 'level-icons' : 'level-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("BGM upload failed:", error);
      return null;
    }
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Audio file too large (Max 10MB).");
      return;
    }

    setPendingBgmFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBgmUrl(reader.result as string);
      soundService.playClick();
    };
    reader.readAsDataURL(file);
  };

  const handleRandomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fallbackToLocal = () => {
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

    try {
      let supabase;
      try {
        supabase = getSupabase();
      } catch (err) {
        console.warn("Supabase not configured, falling back to local avatar.");
        fallbackToLocal();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        fallbackToLocal();
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatar(publicUrl);
      setUploading(false);
    } catch (error: any) {
      console.error("Avatar upload failed, falling back to local:", error);
      fallbackToLocal();
    }
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
                  accept="image/*" 
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
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Neural Soundtrack</h3>
             </div>
             
             <div className="space-y-3">
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

                {bgmUrl && (
                  <button 
                    onClick={() => { setBgmUrl(''); soundService.playClick(); }}
                    className="w-full py-2 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all"
                  >
                    <Trash2 size={12} /> Reset to Default AI
                  </button>
                )}
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 shrink-0">
           <Button onClick={handleSave} variant="primary" size="lg" className="w-full py-5 rounded-2xl text-base italic tracking-tighter">
             CONFIRM UPDATES
           </Button>
           <button 
             onClick={onLogout} 
             className="w-full py-4 mt-2 flex items-center justify-center gap-2 text-rose-500 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95"
           >
             <LogOut size={16} /> DISCONNECT SESSION
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
