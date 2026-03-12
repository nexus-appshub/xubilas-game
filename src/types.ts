
export type TargetType = string;
export type GameType = 'Standard' | 'Catch' | 'Focus' | 'Insane';
export type BoardTheme = 'Cyber' | 'Classic' | 'Volcano' | 'Void' | 'CandyLand' | 'SciFiCity' | 'EnchantedForest' | 'Insane';

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  bgStyle?: 'none' | 'grid' | 'particles' | 'blobs' | 'matrix' | 'horror';
  bgImageUrl?: string;
}

export interface LevelLogic {
  spawnInterval: number;
  activeDuration: number;
  winConditionScore: number;
  timeLimit: number;
  description: string;
  targetWeights: Record<string, number>;
  targetScores: Record<string, number>;
  targetDecayFactors?: Record<string, number>;
  customIcons?: Record<string, string>;
  gameType: GameType;
  boardTheme: BoardTheme;
  speedMultiplier: number;
  targetSizeMultiplier: number;
  themeConfig?: ThemeConfig;
  bgmType?: 'energetic' | 'horror' | 'chill' | 'traditional' | 'none' | 'custom';
  customBgmUrl?: string;
  customWhackSoundUrl?: string;
}

export interface GameLevel {
  id: string;
  name: string;
  author: string;
  description: string;
  gridSize: number;
  logic: LevelLogic;
  rating: number;
  ratingCount: number;
  plays: number;
  createdAt: number;
  isLocalOnly?: boolean;
}

export interface UserStats {
  username: string;
  avatar: string;
  totalWhacks: number;
  levelsCreated: number;
  rank: string;
  xp: number;
  nextRankXp: number;
}

export type AppView = 'entry' | 'home' | 'hub' | 'editor' | 'play' | 'profile';
