import React, { useState, useEffect, useRef } from 'react';
import { GameLevel, LevelLogic, BoardTheme, TargetType, GameType, ThemeConfig } from '../types';
import Button from './Button';
import GameHole from './GameHole';
import { soundService } from '../services/soundService';
import { auth } from '../firebase';
import { uploadToSupabase } from '../supabase';
import { compressImageFallback } from '../utils/imageCompressor';
import { AUDIO_PRESETS, DEFAULT_BGM } from '../constants';
import { 
  X, Palette, Clock, Target, Info, PlayCircle, Sliders, Plus, Trash2, Upload, RefreshCcw, Loader2, Crosshair, Zap, Focus, Timer, Activity, Shield, Cpu, ChevronLeft, Type as TypeIcon, Check, AlertCircle, FastForward, LayoutGrid, Edit3, Music
} from 'lucide-react';

interface LevelEditorProps {
  initialLevel?: GameLevel | null;
  onSave: (level: GameLevel) => void;
  onCancel: () => void;
  onLogin: () => void;
  sessionUser: any;
}

const PRESET_ICONS = [
  '💡', '🧩', '🎯', '✨', '💎', '🔥', '⚡', '💣', '💤', '📱', '🚫', '⚠️', '👑', '🌟', '🧠', '🚀',
  '🧪', '📡', '🔋', '🛡️', '🛠️', '🔑', '🧬', '⚙️', '🧊', '🌀', '🧿', '👾', '🤖', '🛸', '☄️', '🌈',
  '🐱', '🐶', '🐭', '🦁', '🐸', '🐵', '🐔', '🦄', '🍎', '🍕', '🍦', '🎮', '⚽', '🎸', '⌚', '💾'
];

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const MISSION_TYPE_PRESETS: Record<GameType, Partial<LevelLogic> & { desc: string }> = {
  'Standard': {
    desc: 'Balanced gameplay with moderate speed and scoring.',
    spawnInterval: 1000,
    activeDuration: 850,
    winConditionScore: 25,
    timeLimit: 30,
    speedMultiplier: 1.0,
    targetWeights: { dog: 45, rat: 35, cat: 10, bonus: 5, hazard: 5 },
    targetScores: { dog: 5, rat: 3, cat: -10, bonus: 20, hazard: -15 },
    targetDecayFactors: { dog: 1.0, rat: 1.0, cat: 1.0, bonus: 1.0, hazard: 1.0 },
    bgmType: 'custom',
    customBgmUrl: DEFAULT_BGM
  },
  'Catch': {
    desc: 'High spawn rate, focus on collecting bonus points.',
    spawnInterval: 600,
    activeDuration: 1000,
    winConditionScore: 50,
    timeLimit: 45,
    speedMultiplier: 1.2,
    targetWeights: { dog: 60, rat: 20, cat: 5, bonus: 15, hazard: 0 },
    targetScores: { dog: 10, rat: 5, cat: -5, bonus: 30, hazard: 0 },
    targetDecayFactors: { dog: 0.8, rat: 0.8, cat: 1.0, bonus: 0.7, hazard: 1.0 },
    bgmType: 'custom',
    customBgmUrl: DEFAULT_BGM
  },
  'Focus': {
    desc: 'Slow but punishing. Every miss or wrong hit counts.',
    spawnInterval: 1200,
    activeDuration: 1000,
    winConditionScore: 15,
    timeLimit: 30,
    speedMultiplier: 0.9,
    targetWeights: { dog: 20, rat: 20, cat: 20, bonus: 10, hazard: 30 },
    targetScores: { dog: 15, rat: 10, cat: -20, bonus: 50, hazard: -50 },
    targetDecayFactors: { dog: 1.2, rat: 1.2, cat: 1.0, bonus: 1.5, hazard: 1.0 },
    bgmType: 'custom',
    customBgmUrl: DEFAULT_BGM
  },
  'Insane': {
    desc: 'Maximum chaos. Extreme speed and high stakes.',
    spawnInterval: 600,
    activeDuration: 700,
    winConditionScore: 100,
    timeLimit: 60,
    speedMultiplier: 1.6,
    targetWeights: { dog: 30, rat: 30, cat: 10, bonus: 10, hazard: 20 },
    targetScores: { dog: 20, rat: 15, cat: -30, bonus: 100, hazard: -100 },
    targetDecayFactors: { dog: 1.0, rat: 1.0, cat: 1.0, bonus: 1.0, hazard: 1.0 },
    bgmType: 'custom',
    customBgmUrl: DEFAULT_BGM
  }
};

const INITIAL_LOGIC: LevelLogic = {
  spawnInterval: 1000,
  activeDuration: 800,
  winConditionScore: 20,
  timeLimit: 30,
  description: '',
  targetWeights: { dog: 40, rat: 30, cat: 15, bonus: 10, hazard: 5 },
  targetScores: { dog: 5, rat: 3, cat: -10, bonus: 20, hazard: -15 },
  targetDecayFactors: { dog: 1.0, rat: 1.0, cat: 1.0, bonus: 1.0, hazard: 1.0 },
  customIcons: { dog: '💡', rat: '🧩', cat: '📱', bonus: '✨', hazard: '💤' },
  gameType: 'Standard',
  boardTheme: 'Cyber',
  speedMultiplier: 1.0,
  targetSizeMultiplier: 1.0,
  bgmType: 'custom',
  customBgmUrl: DEFAULT_BGM,
  themeConfig: {
    bgStyle: 'none',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    bgImageUrl: ''
  }
};

const LevelEditor: React.FC<LevelEditorProps> = ({ initialLevel, onSave, onCancel, onLogin, sessionUser }) => {
  const [name, setName] = useState(initialLevel?.name || '');
  const [description, setDescription] = useState(initialLevel?.description || '');
  const [gridSize, setGridSize] = useState(initialLevel?.gridSize || 3);
  const [logic, setLogic] = useState<LevelLogic>(initialLevel?.logic || INITIAL_LOGIC);
  const [activeTab, setActiveTab] = useState<'start' | 'presets' | 'identity' | 'timing' | 'visuals' | 'audio' | 'targets' | 'balancing' | 'review'>('start');
  const [creationMode, setCreationMode] = useState<'manual' | 'template' | null>(initialLevel ? 'manual' : null);
  const [showStartModal, setShowStartModal] = useState(!initialLevel);
  const [completedModes, setCompletedModes] = useState<string[]>([]);
  const [showCompletionSuggestion, setShowCompletionSuggestion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Upload Flow States
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [pendingBgmFile, setPendingBgmFile] = useState<File | null>(null);
  
  // Icon Picker State
  const [iconPickerTarget, setIconPickerTarget] = useState<string | null>(null);
  const [stagedIcon, setStagedIcon] = useState<string>('');
  const [pickerError, setPickerError] = useState<string | null>(null);
  
  // Scroll visibility
  const [showUI, setShowUI] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setShowUI(false);
    } else if (currentScrollY < lastScrollY) {
      setShowUI(true);
    }
    setLastScrollY(currentScrollY);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const whackSoundInputRef = useRef<HTMLInputElement>(null);
  const missSoundInputRef = useRef<HTMLInputElement>(null);
  const heartLossSoundInputRef = useRef<HTMLInputElement>(null);

  // Helper for uploading files. Favors Supabase Storage to prevent Firestore 1MB limits.
  const uploadToStorageWithFallback = async (file: File, folder: string, bucket: string, callback: (url: string) => void) => {
    const reader = new FileReader();

    const isGuest = !auth.currentUser;
    
    const processLocalFile = async () => {
      if (!isGuest) console.warn("Falling back to Base64 (may hit Firestore 1MB limit)");
      
      const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
      if (file.size > 700 * 1024 && file.type.startsWith('image/') && !isGif) {
         try {
           const compressedBase64 = await compressImageFallback(file, 700);
           callback(compressedBase64);
           return;
         } catch (e) {
           console.warn("Compression failed", e);
         }
      }

      if (file.size > 700 * 1024) {
        alert(isGuest 
          ? "Local storage limit reached (700KB). Guest sessions are limited to smaller files to ensure cross-device consistency. Please sign in for unlimited cloud storage." 
          : "Storage unavailable: File exceeds the 700KB limit for database fallback. Configure Supabase or use a smaller file.");
        return;
      }
      reader.onloadend = () => callback(reader.result as string);
      reader.onerror = () => alert("Failed to process local file.");
      reader.readAsDataURL(file);
    };

    if (isGuest) {
      await processLocalFile();
      return;
    }

    const uid = auth.currentUser?.uid || 'guest';
    let fileExtension = file.name.split('.').pop();
    if (!fileExtension || fileExtension === file.name) {
      fileExtension = file.type.split('/').pop() || 'file';
    }
    if (file.type === 'image/gif') fileExtension = 'gif';
    
    const supabaseUrl = await uploadToSupabase(file, `levels/${uid}/${folder}_${Date.now()}.${fileExtension}`, bucket);
    if (supabaseUrl) {
      callback(supabaseUrl);
    } else {
      alert(`Supabase upload to bucket '${bucket}' failed. Falling back to local offline storage.`);
      await processLocalFile();
    }
  };

  const handleBgmFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("Audio Data Limit Exceeded (Max 6MB).");
      return;
    }

    setIsLoading(true);
    await uploadToStorageWithFallback(file, 'bgm', 'level-assets', (url) => {
      updateLogic({ customBgmUrl: url });
      // Play immediately after successful upload
      soundService.startBGM('custom', url);
      setIsLoading(false);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, callback: (data: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Max 6MB.");
      return;
    }

    setIsLoading(true);
    await uploadToStorageWithFallback(file, 'bg', 'level-assets', (url) => {
      callback(url);
      setIsLoading(false);
    });
  };

  const [previewActive, setPreviewActive] = useState(false);
  const [previewHole, setPreviewHole] = useState<number | null>(null);
  const [previewType, setPreviewType] = useState<TargetType>('dog');

  useEffect(() => {
    if (previewActive) {
      const interval = setInterval(() => {
        const types = Object.keys(logic.targetWeights);
        if (types.length === 0) return;
        setPreviewHole(Math.floor(Math.random() * (gridSize * gridSize)));
        setPreviewType(types[Math.floor(Math.random() * types.length)]);
      }, logic.spawnInterval / (logic.speedMultiplier || 1));
      return () => clearInterval(interval);
    } else {
      setPreviewHole(null);
    }
  }, [previewActive, logic.spawnInterval, logic.speedMultiplier, gridSize, logic.targetWeights]);

  const updateLogic = (updates: Partial<LevelLogic>) => {
    setLogic(prev => ({ ...prev, ...updates }));
  };

  const handleGameTypeChange = (type: GameType) => {
    const preset = MISSION_TYPE_PRESETS[type];
    updateLogic({ 
      gameType: type,
      ...preset
    });
  };

  const handleIconChange = (type: string, data: string) => {
    updateLogic({ 
      customIcons: { ...logic.customIcons, [type]: data } as Record<string, string> 
    });
  };

  const handleOpenIconPicker = (type: string) => {
    setPickerError(null);
    setIconPickerTarget(type);
    setStagedIcon(logic.customIcons?.[type] || '');
  };

  const handleConfirmIcon = () => {
    if (iconPickerTarget) {
      // Fallback to a target icon if they leave it blank
      const finalIcon = stagedIcon.trim() || '🎯';
      handleIconChange(iconPickerTarget, finalIcon);
      setIconPickerTarget(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPickerError(null);

    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setPickerError("Invalid format. Use PNG, JPG, WEBP, or GIF.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setPickerError("File too large. Maximum size is 6MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingFile(file);
        setPendingFilePreview(reader.result as string);
        setShowUploadConfirm(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const processUpload = async () => {
    if (!pendingFile) return;
    
    setShowUploadConfirm(false);
    setIsLoading(true);

    try {
      await uploadToStorageWithFallback(pendingFile, 'icon', 'level-icons', (url) => {
        setStagedIcon(url);
        setIsLoading(false);
        setShowUploadSuccess(true);
        setPendingFile(null);
        setPendingFilePreview(null);
      });
    } catch (err) {
      setIsLoading(false);
      setPickerError("Failed to upload image.");
    }
  };

  const handleWeightChange = (type: string, val: number) => {
    updateLogic({ 
      targetWeights: { ...logic.targetWeights, [type]: val } 
    });
  };

  const handleDecayChange = (type: string, val: number) => {
    updateLogic({
      targetDecayFactors: { ...(logic.targetDecayFactors || {}), [type]: val }
    });
  };

  const handleScoreChange = (type: string, val: number) => {
    updateLogic({ 
      targetScores: { ...logic.targetScores, [type]: val } 
    });
  };

  const handleAddTarget = () => {
    const newId = `Target_${Object.keys(logic.targetWeights).length + 1}`;
    updateLogic({
      targetWeights: { ...logic.targetWeights, [newId]: 0 },
      targetScores: { ...logic.targetScores, [newId]: 10 },
      targetDecayFactors: { ...(logic.targetDecayFactors || {}), [newId]: 1.0 },
      customIcons: { ...logic.customIcons, [newId]: '🎯' }
    });
  };

  const handleRemoveTarget = (id: string) => {
    const { [id]: _, ...newWeights } = logic.targetWeights;
    const { [id]: __, ...newScores } = logic.targetScores;
    const { [id]: ___, ...newDecay } = logic.targetDecayFactors || {};
    const { [id]: ____, ...newIcons } = logic.customIcons || {};
    updateLogic({
      targetWeights: newWeights,
      targetScores: newScores,
      targetDecayFactors: newDecay,
      customIcons: newIcons
    });
  };

  const handleRenameTarget = (oldId: string, newId: string) => {
    if (!newId || newId === oldId || logic.targetWeights[newId] !== undefined) return;
    const { [oldId]: weight, ...restWeights } = logic.targetWeights;
    const { [oldId]: score, ...restScores } = logic.targetScores;
    const { [oldId]: decay, ...restDecay } = logic.targetDecayFactors || {};
    const { [oldId]: icon, ...restIcons } = logic.customIcons || {};

    updateLogic({
      targetWeights: { ...restWeights, [newId]: weight },
      targetScores: { ...restScores, [newId]: score },
      targetDecayFactors: { ...restDecay, [newId]: decay ?? 1.0 },
      customIcons: { ...restIcons, [newId]: icon || '❓' }
    });
  };

  const handlePublish = async () => {
    if (!name && !initialLevel) {
      alert("Mission Callsign Required for new arenas.");
      return;
    }

    setIsLoading(true);
    let finalLogic = { ...logic };

    try {
      if (finalLogic.customBgmUrl?.startsWith('data:')) {
        // Warning if base64 is too large for db
        if (finalLogic.customBgmUrl.length > 800000) {
          alert('Custom audio data is too large for database sync, please provide an external URL or expect sync issues.');
        }
      }
    } catch (err) {
      console.error("Publish error:", err);
    }

    setIsLoading(false);
    setShowCompletionSuggestion(true);
    if (creationMode) {
      setCompletedModes(prev => Array.from(new Set([...prev, creationMode])));
    }
  };

  const handleFinalSave = async () => {
    let sessionUser = auth.currentUser;
    
    const sanitizedLogic = { ...logic };

    const newLevel: GameLevel = {
      id: initialLevel?.id || Math.random().toString(36).substr(2, 9),
      name,
      author: initialLevel?.author || sessionUser?.displayName || 'Pilot',
      description,
      gridSize,
      logic: sanitizedLogic,
      rating: initialLevel?.rating || 5.0,
      ratingCount: initialLevel?.ratingCount || 1,
      plays: initialLevel?.plays || 0,
      createdAt: initialLevel?.createdAt || Date.now()
    };

    onSave(newLevel);
  };

  const renderTabContent = () => {
    const labelStyle = "text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em] px-1 mb-2 block";
    const moduleHeaderStyle = "flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2 mb-4";
    const moduleTitleStyle = "text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest";
    const inputStyle = "w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 font-bold text-sm transition-all placeholder:opacity-30";

    switch (activeTab) {
      case 'start':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase vibrant-text">Neural Constructor</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs mx-auto">
                Select your development protocol for this arena.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => {
                  setCreationMode('manual');
                  setActiveTab('identity');
                }}
                className={`group relative glass p-8 rounded-[3rem] border-2 transition-all duration-500 text-left overflow-hidden active:scale-95 ${creationMode === 'manual' ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:border-blue-500/50'}`}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sliders size={80} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                    <Sliders size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Customizable Edit</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                      Full manual control over every parameter, target, and visual detail.
                    </p>
                  </div>
                </div>
                {creationMode === 'manual' && (
                  <div className="absolute top-6 right-6 bg-blue-500 text-white p-1 rounded-full">
                    <Check size={16} />
                  </div>
                )}
              </button>
            </div>
            
            {creationMode && (
              <div className="flex justify-center pt-4">
                <Button onClick={() => setActiveTab('identity')} variant="primary" className="px-12 py-4 rounded-full">
                  CONTINUE TO {creationMode.toUpperCase()}
                </Button>
              </div>
            )}
          </div>
        );

      case 'presets':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-4">
              <h3 className="text-xl font-black italic text-slate-900 dark:text-white uppercase tracking-tight">Mission Presets</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select a base protocol to pre-fill settings</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {(Object.keys(MISSION_TYPE_PRESETS) as GameType[]).map(type => {
                const preset = MISSION_TYPE_PRESETS[type];
                const isActive = logic.gameType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleGameTypeChange(type)}
                    className={`group relative glass p-6 rounded-[2.5rem] border-2 transition-all duration-300 text-left overflow-hidden active:scale-95 ${isActive ? 'border-blue-500 bg-blue-500/5' : 'border-transparent hover:border-blue-500/30'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-black/5 dark:bg-white/5 text-slate-500'}`}>
                        {type === 'Standard' && <Crosshair size={24} />}
                        {type === 'Catch' && <Zap size={24} />}
                        {type === 'Focus' && <Focus size={24} />}
                        {type === 'Insane' && <Zap size={24} className="text-rose-500 animate-pulse" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-lg font-black italic uppercase tracking-tight ${isActive ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>{type}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{preset.desc}</p>
                      </div>
                      {isActive && <Check size={20} className="text-blue-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center pt-4">
              <Button onClick={() => setActiveTab('identity')} variant="primary" className="px-12 py-4 rounded-full">
                CONTINUE TO INFO
              </Button>
            </div>
          </div>
        );

      case 'identity':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="glass p-6 rounded-[3rem] space-y-6">
              <div className={moduleHeaderStyle}>
                <Shield size={16} className="text-blue-500" />
                <h3 className={moduleTitleStyle}>Level Info</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className={labelStyle}>Game Mode</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'Standard', icon: <Crosshair size={18} /> },
                      { id: 'Catch', icon: <Zap size={18} /> },
                      { id: 'Focus', icon: <Focus size={18} /> },
                      { id: 'Insane', icon: <Zap size={18} className="text-rose-500 animate-pulse" /> }
                    ].map(type => (
                      <button 
                        key={type.id} 
                        onClick={() => handleGameTypeChange(type.id as GameType)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${logic.gameType === type.id ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500'}`}
                      >
                        {type.icon}
                        <span className="text-[10px] font-black uppercase tracking-tighter">{type.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Level Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name..." className={inputStyle} />
                </div>
                <div>
                  <label className={labelStyle}>Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this level about?" rows={3} className={`${inputStyle} resize-none`} />
                </div>
              </div>
            </div>
          </div>
        );

      case 'timing':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="glass p-6 rounded-[3rem] space-y-6">
               <div className={moduleHeaderStyle}>
                 <Clock size={16} className="text-fuchsia-500" />
                 <h3 className={moduleTitleStyle}>Timing</h3>
               </div>
               <div className="space-y-8 pb-2">
                  {[
                    { label: 'Spawn Speed', field: 'spawnInterval', min: 200, max: 2000, suffix: 'ms', icon: <Activity size={14}/> },
                    { label: 'Stay Time', field: 'activeDuration', min: 100, max: 1500, suffix: 'ms', icon: <Timer size={14}/> },
                    { label: 'Time Limit', field: 'timeLimit', min: 10, max: 120, suffix: 's', icon: <Clock size={14}/> }
                  ].map((s) => (
                    <div key={s.field} className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">
                        <div className="flex items-center gap-2">{s.icon} {s.label}</div>
                        <span className="text-fuchsia-600 tabular-nums">{(logic as any)[s.field]}{s.suffix}</span>
                      </div>
                      <input type="range" min={s.min} max={s.max} step={50} value={(logic as any)[s.field]} onChange={(e) => updateLogic({ [s.field]: parseFloat(e.target.value) })} className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" />
                    </div>
                  ))}
               </div>
            </div>
          </div>
        );

      case 'visuals':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="glass p-6 rounded-[3rem] space-y-6">
              <div className={moduleHeaderStyle}>
                <Palette size={16} className="text-blue-500" />
                <h3 className={moduleTitleStyle}>Look & Feel</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className={labelStyle}>Grid Size</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[2,3,4,5].map(g => (
                      <button key={g} onClick={() => setGridSize(g)} className={`py-4 text-sm font-black rounded-2xl border transition-all active:scale-95 ${gridSize === g ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20' : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500'}`}>{g}x{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Cyber', 'Classic', 'Volcano', 'Void', 'CandyLand', 'Insane', 'Horror'].map(t => (
                      <button key={t} onClick={() => updateLogic({ boardTheme: t as BoardTheme })} className={`flex items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${logic.boardTheme === t ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-md' : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500'}`}>
                        <span className="text-[11px] font-black uppercase tracking-widest italic">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Background Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['none', 'grid', 'particles', 'blobs', 'matrix', 'horror'].map(s => (
                      <button key={s} onClick={() => updateLogic({ themeConfig: { ...logic.themeConfig, bgStyle: s as any } })} className={`flex items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${logic.themeConfig?.bgStyle === s ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-md' : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest italic">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Custom Background Image</label>
                  <div className="flex gap-2">
                    <input 
                      value={logic.themeConfig?.bgImageUrl || ''} 
                      onChange={(e) => updateLogic({ themeConfig: { ...logic.themeConfig, bgImageUrl: e.target.value } })} 
                      placeholder="https://example.com/bg.jpg or upload..." 
                      className={`${inputStyle} flex-1`} 
                    />
                    <button 
                      onClick={() => bgImageInputRef.current?.click()}
                      className="p-4 bg-blue-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-600/20"
                      title="Upload Image/GIF"
                    >
                      <Upload size={20} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={bgImageInputRef} 
                    className="hidden" 
                    accept="image/png,image/jpeg,image/webp,image/gif" 
                    onChange={(e) => handleFileSelect(e, (data) => updateLogic({ themeConfig: { ...logic.themeConfig, bgImageUrl: data } }))} 
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="glass p-6 rounded-[3rem] space-y-6">
              <div className={moduleHeaderStyle}>
                <Music size={16} className="text-blue-500" />
                <h3 className={moduleTitleStyle}>Audio Protocol</h3>
              </div>

              {!sessionUser && (
                <div className="p-4 rounded-2xl bg-blue-600/15 dark:bg-blue-500/10 border border-blue-600/20 dark:border-blue-500/20 flex items-start gap-3 animate-in fade-in duration-500">
                  <Zap size={16} className="text-blue-600 dark:text-blue-500 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-relaxed">
                      Sign in with Google to save your custom music and whack sounds permanently to your profile.
                    </p>
                    <button 
                      onClick={onLogin}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                      Sign in for Cloud Storage
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className={labelStyle}>Background Music Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['energetic', 'horror', 'chill', 'traditional', 'none', 'custom'].map(t => (
                      <button key={t} onClick={() => updateLogic({ bgmType: t as any })} className={`flex items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${logic.bgmType === t ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-md' : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500'}`}>
                        <span className="text-[11px] font-black uppercase tracking-widest italic">{t}</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        updateLogic({ bgmType: 'custom' });
                        setTimeout(() => bgmInputRef.current?.click(), 100);
                      }}
                      className="flex items-center justify-center p-4 rounded-2xl border border-dashed border-blue-500/30 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10 transition-all active:scale-95"
                    >
                       <Upload size={16} className="mr-2" />
                       <span className="text-[11px] font-black uppercase tracking-widest italic">Upload</span>
                    </button>
                  </div>
                </div>

                {logic.bgmType === 'custom' && (
                  <div className="bg-slate-200/50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4 animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-blue-600/10 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-700 dark:text-blue-400">
                          <Music size={20} />
                       </div>
                       <div>
                          <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Custom Soundtrack</h4>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Link or upload your own audio</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 mb-2 bg-black/20 p-2 rounded-xl border border-white/5">
                        {AUDIO_PRESETS.bgm.map(preset => (
                          <button
                            key={preset.url}
                            onClick={() => {
                              updateLogic({ customBgmUrl: preset.url, bgmType: 'custom' });
                              soundService.startBGM('custom', preset.url);
                            }}
                            className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border ${logic.customBgmUrl === preset.url ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-300/50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input 
                            value={logic.customBgmUrl || ''} 
                            onChange={(e) => {
                              const url = e.target.value;
                              updateLogic({ customBgmUrl: url });
                              if ((url.startsWith('https://') || url.startsWith('http://')) && url.endsWith('.mp3')) {
                                soundService.startBGM('custom', url);
                              }
                            }} 
                            placeholder="Paste MP3 URL..." 
                            className={`${inputStyle} pr-12`} 
                          />
                          {logic.customBgmUrl && (
                            <button 
                              onClick={() => {
                                const audio = new Audio(logic.customBgmUrl);
                                audio.play().catch(e => alert("Could not play audio. Check URL."));
                                setTimeout(() => audio.pause(), 5000);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 active:scale-90 transition-all"
                              title="Preview (5s)"
                            >
                              <PlayCircle size={20} />
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => bgmInputRef.current?.click()}
                          className="p-4 bg-blue-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                          title="Upload Local File"
                        >
                          <Upload size={20} />
                          <span className="text-[10px] font-black uppercase hidden sm:inline">Local</span>
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">Supports MP3, WAV, OGG (Max 6MB)</p>
                    </div>

                    <input 
                      type="file" 
                      ref={bgmInputRef} 
                      className="hidden" 
                      accept="audio/*" 
                      onChange={handleBgmFileSelect} 
                    />
                  </div>
                )}

                <div className="bg-slate-200/50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-fuchsia-500/10 rounded-xl flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-500">
                        <Zap size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Custom Whack SFX</h4>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sound played on successful hit</p>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2 bg-fuchsia-500/10 p-2 rounded-xl border border-fuchsia-500/10">
                    {AUDIO_PRESETS.whack.map(preset => (
                      <button
                        key={preset.url}
                        onClick={() => {
                          updateLogic({ customWhackSoundUrl: preset.url });
                          soundService.setCustomWhackSound(preset.url).then(() => soundService.playWhack());
                        }}
                        className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border ${logic.customWhackSoundUrl === preset.url ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-300/50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      value={logic.customWhackSoundUrl || ''} 
                      onChange={(e) => {
                        const url = e.target.value;
                        updateLogic({ customWhackSoundUrl: url });
                        if (url.startsWith('https://') || url.startsWith('data:')) {
                           soundService.setCustomWhackSound(url).then(() => soundService.playWhack());
                        }
                      }} 
                      placeholder="SFX URL or upload..." 
                      className={`${inputStyle} flex-1`} 
                    />
                    <button 
                      onClick={() => whackSoundInputRef.current?.click()}
                      className="p-4 bg-fuchsia-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-fuchsia-600/20"
                      title="Upload SFX"
                    >
                      <Upload size={20} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={whackSoundInputRef} 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={(e) => handleFileSelect(e, async (data) => {
                      updateLogic({ customWhackSoundUrl: data });
                      await soundService.setCustomWhackSound(data);
                      soundService.playWhack();
                    })} 
                  />
                </div>

                {/* Point Minus Sound */}
                <div className="bg-slate-200/50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-rose-600/10 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-700 dark:text-rose-500">
                        <AlertCircle size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Point Minus SFX</h4>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sound played on wrong hit</p>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2 bg-rose-500/10 p-2 rounded-xl border border-rose-500/10">
                    {AUDIO_PRESETS.miss.map(preset => (
                      <button
                        key={preset.url}
                        onClick={() => {
                          updateLogic({ customMissSoundUrl: preset.url });
                          soundService.setCustomMissSound(preset.url).then(() => soundService.playMiss());
                        }}
                        className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border ${logic.customMissSoundUrl === preset.url ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-300/50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      value={logic.customMissSoundUrl || ''} 
                      onChange={(e) => {
                        const url = e.target.value;
                        updateLogic({ customMissSoundUrl: url });
                        if (url.startsWith('https://') || url.startsWith('data:')) {
                           soundService.setCustomMissSound(url).then(() => soundService.playMiss());
                        }
                      }} 
                      placeholder="SFX URL or upload..." 
                      className={`${inputStyle} flex-1`} 
                    />
                    <button 
                      onClick={() => missSoundInputRef.current?.click()}
                      className="p-4 bg-rose-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-rose-600/20"
                      title="Upload SFX"
                    >
                      <Upload size={20} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={missSoundInputRef} 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={(e) => handleFileSelect(e, async (data) => {
                      updateLogic({ customMissSoundUrl: data });
                      await soundService.setCustomMissSound(data);
                      soundService.playMiss();
                    })} 
                  />
                </div>

                {/* Heart Loss Sound */}
                <div className="bg-slate-200/50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-black/5 dark:border-white/5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 bg-amber-600/10 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-700 dark:text-amber-500">
                        <Activity size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900 dark:text-white">Heart Loss SFX</h4>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sound played on losing life</p>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2 bg-amber-500/10 p-2 rounded-xl border border-amber-500/10">
                    {AUDIO_PRESETS.heartLoss.map(preset => (
                      <button
                        key={preset.url}
                        onClick={() => {
                          updateLogic({ customHeartLossSoundUrl: preset.url });
                          soundService.setCustomHeartLossSound(preset.url).then(() => soundService.playHeartLoss());
                        }}
                        className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all border ${logic.customHeartLossSoundUrl === preset.url ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-300/50 dark:bg-white/5 border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      value={logic.customHeartLossSoundUrl || ''} 
                      onChange={(e) => {
                        const url = e.target.value;
                        updateLogic({ customHeartLossSoundUrl: url });
                        if (url.startsWith('https://') || url.startsWith('data:')) {
                           soundService.setCustomHeartLossSound(url).then(() => soundService.playHeartLoss());
                        }
                      }} 
                      placeholder="SFX URL or upload..." 
                      className={`${inputStyle} flex-1`} 
                    />
                    <button 
                      onClick={() => heartLossSoundInputRef.current?.click()}
                      className="p-4 bg-amber-600 text-white rounded-2xl active:scale-95 transition-all shadow-lg shadow-amber-600/20"
                      title="Upload SFX"
                    >
                      <Upload size={20} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={heartLossSoundInputRef} 
                    className="hidden" 
                    accept="audio/*" 
                    onChange={(e) => handleFileSelect(e, async (data) => {
                      updateLogic({ customHeartLossSoundUrl: data });
                      await soundService.setCustomHeartLossSound(data);
                      soundService.playHeartLoss();
                    })} 
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'targets':
        return (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-4 shrink-0">
               <div className="flex items-center gap-2">
                  <Target size={18} className="text-rose-500" />
                  <h3 className={moduleTitleStyle}>Targets</h3>
               </div>
               <button onClick={handleAddTarget} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-90 transition-transform">
                 <Plus size={14} /> ADD TARGET
               </button>
            </div>
            
            <div className="space-y-3 px-2 max-h-[55dvh] overflow-y-auto no-scrollbar pb-6">
              {Object.keys(logic.targetWeights).map(type => {
                const iconData = logic.customIcons?.[type] || '❓';
                const isImg = iconData.startsWith('data:image') || iconData.startsWith('http');
                
                return (
                  <div key={type} className="glass p-5 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-center justify-between shadow-xl border-white/5 group hover:border-blue-500/30 transition-all animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-4 sm:gap-5 w-full sm:flex-1 min-w-0">
                      <div className="relative shrink-0">
                        <button 
                          onClick={() => handleOpenIconPicker(type)} 
                          className="w-14 h-14 sm:w-16 sm:h-16 bg-black/40 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center overflow-hidden border-2 border-blue-500/20 hover:border-blue-500 hover:scale-105 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                        >
                          {isImg ? (
                            <img src={iconData} alt="icon" className="w-full h-full object-contain p-2 animate-in zoom-in-50 duration-500" />
                          ) : (
                            <span className="text-3xl animate-in zoom-in-50 duration-500">{iconData}</span>
                          )}
                        </button>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300">
                          <Edit3 size={12} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Target Identity</div>
                        <input 
                          type="text" 
                          value={type} 
                          onChange={(e) => handleRenameTarget(type, e.target.value)} 
                          className="bg-black/20 dark:bg-black/40 border border-slate-200/20 dark:border-white/10 rounded-xl px-3 py-2 text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase outline-none focus:text-blue-500 w-full truncate italic tracking-tighter" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 justify-end w-full sm:w-auto mt-2 sm:mt-0 flex-wrap">
                      <div className="flex flex-col gap-2 items-start py-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              (logic.lifeLossTargetsOnWhack !== undefined ? logic.lifeLossTargetsOnWhack.includes(type) : (type === 'hazard' || logic.targetScores[type] <= -15)) 
                              ? 'bg-rose-500 border-rose-500' : 'border-slate-300 dark:border-white/20 bg-transparent'
                           }`}>
                             {(logic.lifeLossTargetsOnWhack !== undefined ? logic.lifeLossTargetsOnWhack.includes(type) : (type === 'hazard' || logic.targetScores[type] <= -15)) && <X size={10} className="text-white" />}
                           </div>
                           <input 
                              type="checkbox" 
                              className="hidden"
                              checked={logic.lifeLossTargetsOnWhack !== undefined ? logic.lifeLossTargetsOnWhack.includes(type) : (type === 'hazard' || logic.targetScores[type] <= -15)}
                              onChange={(e) => {
                                 const isChecked = e.target.checked;
                                 let currentList = logic.lifeLossTargetsOnWhack;
                                 if (!currentList) {
                                     currentList = Object.keys(logic.targetWeights).filter(k => k === 'hazard' || logic.targetScores[k] <= -15);
                                 }
                                 if (isChecked) updateLogic({ lifeLossTargetsOnWhack: Array.from(new Set([...currentList, type])) });
                                 else updateLogic({ lifeLossTargetsOnWhack: currentList.filter(t => t !== type) });
                              }}
                           />
                           <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest group-hover:text-rose-400 transition-colors">Fatal Hit</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              (logic.lifeLossTargetsOnMiss !== undefined ? logic.lifeLossTargetsOnMiss.includes(type) : (logic.gameType === 'Focus' && (type === 'dog' || type === 'rat'))) 
                              ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-white/20 bg-transparent'
                           }`}>
                             {(logic.lifeLossTargetsOnMiss !== undefined ? logic.lifeLossTargetsOnMiss.includes(type) : (logic.gameType === 'Focus' && (type === 'dog' || type === 'rat'))) && <X size={10} className="text-white" />}
                           </div>
                           <input 
                              type="checkbox" 
                              className="hidden"
                              checked={logic.lifeLossTargetsOnMiss !== undefined ? logic.lifeLossTargetsOnMiss.includes(type) : (logic.gameType === 'Focus' && (type === 'dog' || type === 'rat'))}
                              onChange={(e) => {
                                 const isChecked = e.target.checked;
                                 let currentList = logic.lifeLossTargetsOnMiss;
                                 if (!currentList) {
                                     currentList = logic.gameType === 'Focus' ? Object.keys(logic.targetWeights).filter(k => k === 'dog' || k === 'rat') : [];
                                 }
                                 if (isChecked) updateLogic({ lifeLossTargetsOnMiss: Array.from(new Set([...currentList, type])) });
                                 else updateLogic({ lifeLossTargetsOnMiss: currentList.filter(t => t !== type) });
                              }}
                           />
                           <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest group-hover:text-amber-400 transition-colors">Fatal Miss</span>
                        </label>
                      </div>
                      <div className="flex flex-col items-center flex-1 sm:flex-none ml-2">
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">PTS</span>
                        <input 
                          type="number" 
                          value={logic.targetScores[type]} 
                          onChange={(e) => handleScoreChange(type, parseInt(e.target.value) || 0)} 
                          className="w-full sm:w-20 bg-surface dark:bg-slate-900 border-2 border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl text-center text-blue-600 dark:text-blue-400 font-black py-2 sm:py-3 text-base sm:text-lg outline-none tabular-nums shadow-lg focus:ring-4 focus:ring-blue-500/30 transition-all appearance-none" 
                        />
                      </div>
                      {Object.keys(logic.targetWeights).length > 1 && (
                        <button onClick={() => handleRemoveTarget(type)} className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl sm:rounded-2xl active:scale-95 transition-all"><Trash2 size={20} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {iconPickerTarget && (
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIconPickerTarget(null)} />
                <div className="relative glass w-full max-w-sm max-h-[85dvh] rounded-[3.5rem] p-6 sm:p-8 space-y-6 shadow-2xl border-white/10 overflow-hidden flex flex-col">
                   <header className="flex justify-between items-center shrink-0">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Change Icon</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target: {iconPickerTarget}</p>
                      </div>
                      <button onClick={() => setIconPickerTarget(null)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={24} /></button>
                   </header>
                   
                   <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-6">
                      {pickerError && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
                           <AlertCircle className="text-rose-500 shrink-0" size={18} />
                           <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">{pickerError}</span>
                        </div>
                      )}

                      <section className="bg-black/20 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block px-1 text-center">Selected Icon</label>
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-32 h-32 bg-gradient-to-br from-black/60 to-black/20 rounded-[2.5rem] flex items-center justify-center text-6xl border-2 border-blue-500/40 shadow-2xl relative group overflow-hidden shrink-0 animate-in zoom-in-75 duration-300">
                            {stagedIcon ? (
                              stagedIcon.startsWith('data') || stagedIcon.startsWith('http') ? (
                                <img src={stagedIcon} className="w-full h-full object-contain p-4" />
                              ) : <span className="drop-shadow-2xl">{stagedIcon}</span>
                            ) : (
                              <span className="opacity-30">❓</span>
                            )}
                            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="w-full space-y-4">
                            <div className="relative">
                              <div className="flex items-center gap-3 bg-white/5 focus-within:bg-white/10 transition-colors rounded-2xl px-5 py-4 border border-white/10 focus-within:border-blue-500/50 shadow-lg">
                                <TypeIcon size={18} className="text-blue-500" />
                                <input 
                                  type="text" 
                                  placeholder="Type Icon/Emoji..." 
                                  value={(!stagedIcon.startsWith('data') && !stagedIcon.startsWith('http')) ? stagedIcon : ''}
                                  className="flex-1 bg-transparent border-none text-lg text-slate-900 dark:text-white font-black outline-none placeholder:text-slate-600 italic tracking-tight"
                                  maxLength={8}
                                  onChange={(e) => {
                                    setPickerError(null);
                                    setStagedIcon(e.target.value);
                                  }}
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setPickerError(null);
                                fileInputRef.current?.click();
                              }} 
                              className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:shadow-blue-600/20 active:scale-95 transition-all"
                            >
                              <Upload size={18} /> UPLOAD IMAGE
                            </button>
                          </div>
                        </div>
                      </section>
                      
                      <section>
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block px-1">Presets</label>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            {PRESET_ICONS.map(emoji => (
                              <button 
                                key={emoji} 
                                onClick={() => { setPickerError(null); setStagedIcon(emoji); }} 
                                className={`aspect-square flex items-center justify-center text-3xl rounded-2xl bg-slate-200/50 dark:bg-white/5 border transition-all active:scale-90 ${stagedIcon === emoji ? 'border-blue-500 bg-blue-500/20 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-transparent hover:border-slate-300 dark:hover:border-white/10'}`}
                              >
                                {emoji}
                              </button>
                            ))}
                        </div>
                      </section>
                   </div>

                   <div className="pt-4 border-t border-slate-200 dark:border-white/10 shrink-0">
                      <button 
                        onClick={handleConfirmIcon}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[2rem] font-black italic tracking-tighter text-xl shadow-2xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        <Check size={24} strokeWidth={3} /> CONFIRM ICON
                      </button>
                   </div>
                   
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageUpload} />
                </div>
              </div>
            )}
          </div>
        );

      case 'balancing':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="glass p-6 rounded-[3rem] space-y-6">
                <div className={moduleHeaderStyle}>
                  <Sliders size={16} className="text-fuchsia-500" />
                  <h3 className={moduleTitleStyle}>Spawn Rates</h3>
                </div>
                <div className="space-y-6 max-h-[55dvh] overflow-y-auto no-scrollbar pr-1 pb-8">
                  {Object.keys(logic.targetWeights).map(type => (
                    <div key={type} className="p-6 bg-black/5 dark:bg-black/40 rounded-[2.5rem] space-y-6 border border-transparent hover:border-white/5 transition-all shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-2xl text-xl shadow-md">
                              {logic.customIcons?.[type]?.startsWith('data') || logic.customIcons?.[type]?.startsWith('http') ? <img src={logic.customIcons[type]} className="w-6 h-6 object-contain" /> : logic.customIcons?.[type]}
                           </div>
                           <span className="text-sm font-black uppercase text-slate-900 dark:text-white italic tracking-tight">{type}</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-60">Rate</span>
                           <span className="text-sm font-black text-fuchsia-600 tabular-nums">{logic.targetWeights[type]}%</span>
                        </div>
                      </div>
                      
                      {/* Spawn Probability Slider */}
                      <div className="space-y-2">
                        <input type="range" min="0" max="100" value={logic.targetWeights[type]} onChange={(e) => handleWeightChange(type, parseInt(e.target.value))} className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" />
                      </div>

                      {/* Decay Rate Section */}
                      <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-2">
                              <FastForward size={14} className="text-blue-500" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Speed Up</span>
                           </div>
                           <span className="text-xs font-black text-blue-500 tabular-nums">{(logic.targetDecayFactors?.[type] ?? 1.0).toFixed(1)}x</span>
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3.0" 
                            step="0.1" 
                            value={logic.targetDecayFactors?.[type] ?? 1.0} 
                            onChange={(e) => handleDecayChange(type, parseFloat(e.target.value))} 
                            className="w-full h-2 bg-slate-300 dark:bg-slate-800 rounded-full appearance-none accent-blue-500 cursor-pointer" 
                          />
                          <div className="flex justify-between px-1">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">SLOW (0.1x)</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">FAST (3.0x)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-500 pb-12">
             <div className="text-center space-y-2">
                <h3 className="text-2xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter">Preview</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Checking {name || 'Unnamed Level'}</p>
             </div>
             <div className={`relative glass p-8 rounded-[4rem] transition-all duration-700 shadow-2xl ${previewActive ? 'ring-8 ring-blue-500/10 scale-[1.02]' : ''}`}>
                <div className="w-56 h-56 flex items-center justify-center relative z-10">
                   <div className="grid gap-3 w-full h-full" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                     {Array.from({length: gridSize*gridSize}).map((_, i) => (
                       <GameHole 
                         key={i} 
                         isActive={previewHole === i} 
                         type={previewType} 
                         theme={logic.boardTheme} 
                         customIcons={logic.customIcons} 
                         themeConfig={logic.themeConfig} 
                         targetSizeMultiplier={logic.targetSizeMultiplier} 
                         onHit={() => {}} 
                         disabled 
                       />
                     ))}
                   </div>
                </div>
                <button onClick={() => setPreviewActive(!previewActive)} className="absolute inset-0 bg-blue-600/5 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 rounded-[4rem] z-20">
                   <div className="p-5 bg-blue-500 rounded-full text-white shadow-2xl shadow-blue-600/40 transform scale-110">
                     {previewActive ? <X size={32} /> : <PlayCircle size={32} />}
                   </div>
                   <span className="text-xs font-black uppercase tracking-[0.3em] text-white">TEST PLAY</span>
                </button>
             </div>
             <div className="w-full space-y-4 px-6">
                <Button onClick={handlePublish} variant="primary" size="lg" className="w-full py-7 rounded-[2rem] text-2xl italic tracking-tighter shadow-2xl shadow-fuchsia-600/20">
                   PUBLISH LEVEL
                </Button>
                <button onClick={onCancel} className="w-full py-4 text-rose-500 text-[11px] font-black uppercase tracking-[0.4em] transition-all active:scale-95">
                   CANCEL
                </button>
             </div>
          </div>
        );
    }
  };

  const startOptions = [
    { 
      id: 'manual' as const, 
      label: 'MANUAL CONSTRUCT', 
      desc: 'Full customizable edit.', 
      icon: <Sliders className="text-blue-400" size={16} />,
      color: 'from-blue-500/10 to-indigo-500/5',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400'
    },
    { 
      id: 'template' as const, 
      label: 'TEMPLATE REMIX', 
      desc: 'Start from a preset base.', 
      icon: <LayoutGrid className="text-emerald-400" size={16} />,
      color: 'from-emerald-500/10 to-teal-500/5',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-app-bg relative transition-colors duration-500 overflow-hidden">
      {/* Start Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
          <div className="relative glass w-full max-w-sm sm:max-w-md rounded-[3rem] p-8 shadow-2xl border-white/10 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <header className="space-y-1">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase vibrant-text">ARENA PROTOCOL</h2>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">SELECT CREATION MODE</p>
              </header>
              <button onClick={() => setShowStartModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {startOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCreationMode(opt.id);
                    setShowStartModal(false);
                    if (opt.id === 'template') {
                      setActiveTab('presets');
                    }
                    else setActiveTab('identity');
                  }}
                  className={`w-full flex items-center gap-5 p-6 rounded-[2rem] border ${opt.borderColor} bg-gradient-to-br ${opt.color} active:scale-95 transition-all text-left group`}
                >
                  <div className="p-4 bg-black/40 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-lg font-black italic tracking-tight ${opt.textColor} uppercase`}>{opt.label}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{opt.desc}</p>
                  </div>
                  <Plus size={20} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <button onClick={() => setShowStartModal(false)} className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-blue-500 transition-colors">
                SKIP TO BUILDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Suggestion Modal */}
      {showCompletionSuggestion && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" />
          <div className="relative glass w-full max-w-sm sm:max-w-md rounded-[3rem] p-8 shadow-2xl border-white/10 overflow-hidden flex flex-col text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2 vibrant-text">ARENA DEPLOYED</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">
              Mission callsign <span className="text-blue-400 font-black italic">"{name}"</span> is now active in the neural network.
            </p>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">SUGGESTED NEXT STEPS</p>
              {startOptions.filter(opt => !completedModes.includes(opt.id)).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setCreationMode(opt.id);
                    setShowCompletionSuggestion(false);
                    if (opt.id === 'template') setActiveTab('visuals');
                    else setActiveTab('identity');
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${opt.borderColor} bg-gradient-to-br ${opt.color} active:scale-95 transition-all text-left`}
                >
                  <div className="p-3 bg-black/40 rounded-xl shrink-0">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-black italic tracking-tight ${opt.textColor} uppercase`}>BUILD WITH {opt.label}</h4>
                  </div>
                  <Plus size={16} className="text-slate-500" />
                </button>
              ))}
              
              <Button onClick={handleFinalSave} variant="primary" className="w-full py-6 rounded-3xl text-xl italic tracking-tighter mt-4">
                FINISH & RETURN TO HUB
              </Button>
            </div>
          </div>
        </div>
      )}
      <header className={`fixed top-2 sm:top-6 inset-x-2 sm:inset-x-4 h-16 sm:h-20 flex items-center z-[110] pointer-events-none transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0'}`}>
        <div className="glass w-full h-full rounded-3xl sm:rounded-[3rem] px-4 sm:px-8 flex items-center justify-between shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] pointer-events-auto border-white/5 backdrop-blur-3xl">
          <button onClick={onCancel} className="p-2 sm:p-4 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all active:scale-90"><ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" /></button>
          <div className="flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-black vibrant-text uppercase tracking-tighter italic leading-none">Level Builder</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 opacity-60">
               <Cpu size={10} className="text-blue-500 animate-pulse sm:w-3 sm:h-3" />
               <button 
                 onClick={() => setShowTutorial(true)}
                 className="flex items-center gap-1 text-[7px] sm:text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] hover:text-blue-400 transition-colors"
                >
                 <Info size={10} /> GUIDE
               </button>
            </div>
          </div>
          <div className="w-10 sm:w-14" /> {/* Spacer */}
        </div>
      </header>
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pt-24 pb-28 sm:pt-36 sm:pb-36 no-scrollbar">
        <div className="max-w-xl mx-auto">{renderTabContent()}</div>
      </div>
      <nav className={`fixed bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 z-[110] px-2 sm:px-4 w-full max-w-lg transition-all duration-300 ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}>
        <div className="glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 p-1 sm:p-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] flex items-center overflow-x-auto no-scrollbar gap-1 relative backdrop-blur-3xl">
          {[
            { id: 'start', label: 'Setup', icon: <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'presets', label: 'Presets', icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'identity', label: 'Info', icon: <Info className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'timing', label: 'Time', icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'visuals', label: 'Look', icon: <Palette className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'audio', label: 'Audio', icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'targets', label: 'Targets', icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'balancing', label: 'Rates', icon: <Sliders className="w-5 h-5 sm:w-6 sm:h-6" /> },
            { id: 'review', label: 'Publish', icon: <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6" /> }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`relative flex-1 min-w-[50px] sm:min-w-0 flex flex-col items-center justify-center py-2 sm:py-3.5 rounded-[1.25rem] sm:rounded-2xl transition-all duration-300 active:scale-90 ${activeTab === tab.id ? 'bg-gradient-to-br from-fuchsia-600 via-pink-600 to-purple-700 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
            >
              <div className={`${activeTab === tab.id ? 'scale-105 sm:scale-110 translate-y-[-1px] sm:translate-y-[-2px]' : 'scale-100'} transition-transform duration-300`}>{tab.icon}</div>
              <span className={`text-[6px] sm:text-[7px] font-black uppercase tracking-widest mt-1 sm:mt-1.5 ${activeTab === tab.id ? 'block' : 'hidden'}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Upload Confirmation Modal */}
      {showUploadConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowUploadConfirm(false)} />
          <div className="relative glass w-full max-w-sm rounded-[3rem] p-8 shadow-2xl text-center space-y-6">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter vibrant-text">Confirm Upload</h3>
            <div className="w-32 h-32 mx-auto bg-black/40 rounded-[2rem] border-2 border-blue-500/30 overflow-hidden flex items-center justify-center shadow-xl">
              {pendingFilePreview && <img src={pendingFilePreview} alt="Preview" className="w-full h-full object-contain p-2" />}
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Are you sure you want to upload this icon?</p>
            <div className="flex flex-col gap-3">
              <Button onClick={processUpload} variant="primary" className="w-full py-4 rounded-2xl">
                YES, UPLOAD
              </Button>
              <button onClick={() => setShowUploadConfirm(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Success Modal */}
      {showUploadSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowUploadSuccess(false)} />
          <div className="relative glass w-full max-w-sm rounded-[3rem] p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
              <Check size={32} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-500">Upload Complete</h3>
            <div className="w-24 h-24 mx-auto bg-black/40 rounded-2xl border-2 border-emerald-500/30 overflow-hidden flex items-center justify-center">
              <img src={stagedIcon} alt="Uploaded Icon" className="w-full h-full object-contain p-2" />
            </div>
            <Button onClick={() => setShowUploadSuccess(false)} variant="primary" className="w-full py-4 rounded-2xl">
              AWESOME
            </Button>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={32} className="text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.4em] text-blue-500 animate-pulse">Processing Neural Data...</p>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setShowTutorial(false)} />
          <div className="relative glass w-full max-w-lg max-h-[85dvh] rounded-[3rem] p-8 shadow-2xl border-white/10 overflow-hidden flex flex-col">
            <header className="flex justify-between items-center mb-8 shrink-0">
              <div className="space-y-1">
                <h2 className="text-2xl font-black italic tracking-tighter uppercase vibrant-text">Neural Constructor Guide</h2>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Level Design Protocol</p>
              </div>
              <button onClick={() => setShowTutorial(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2 pb-6 text-slate-300">
              {[
                { 
                  title: '1. Setup & Modes', 
                  desc: 'Choose "Manual" for full control or "Template" to start from an existing blueprint. Templates are great for rapid iteration.',
                  icon: <LayoutGrid className="text-blue-400" /> 
                },
                { 
                  title: '2. Presets', 
                  desc: 'Select from tuned game logic patterns (Standard, Catch, Focus, Insane) to instantly set spawn rates and scoring rules.',
                  icon: <Zap className="text-yellow-400" /> 
                },
                { 
                  title: '3. Identity', 
                  desc: 'Every arena needs a unique callsing (name). This is where you set the mission title and its core difficulty logic.',
                  icon: <Info className="text-fuchsia-400" /> 
                },
                { 
                  title: '4. Timing', 
                  desc: 'Precision control over spawn intervals (frequency), stay time (how long targets remain), and total mission duration.',
                  icon: <Clock className="text-emerald-400" /> 
                },
                { 
                  title: '5. Visuals & Themes', 
                  desc: 'Customize the arena environment. Set background styles (Grid, Matrix, Particles, Blobs, Horror) and colors.',
                  icon: <Palette className="text-purple-400" /> 
                },
                { 
                  title: '6. Audio Interface', 
                  desc: 'Configure background music and localized sound effects for hits, misses, and heart loss to enhance immersion.',
                  icon: <Activity className="text-sky-400" /> 
                },
                { 
                  title: '7. Target Configuration', 
                  desc: 'The heart of your level. Add specific target types, assign emojis or custom images, and set their individual point values.',
                  icon: <Target className="text-rose-400" /> 
                },
                { 
                  title: '8. Neural Balancing', 
                  desc: 'Fine-tune spawn probabilities and speed multipliers for each target. Use this to create complex patterns or traps.',
                  icon: <Sliders className="text-indigo-400" /> 
                },
                { 
                  title: '9. Publish & Test', 
                  desc: 'Use the interactive preview to test your arena before final deployment. Once satisfied, publish to the network.',
                  icon: <PlayCircle className="text-amber-400" /> 
                }
              ].map((step, i) => (
                <div key={i} className="flex gap-5 group items-start">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-colors">
                    {step.icon}
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-black italic text-slate-100 uppercase tracking-tight">{step.title}</h4>
                    <p className="text-xs leading-relaxed opacity-60 font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/5 shrink-0">
               <Button onClick={() => setShowTutorial(false)} variant="primary" className="w-full py-5 rounded-2xl font-black italic">
                  I UNDERSTAND THE PROTOCOLS
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelEditor;