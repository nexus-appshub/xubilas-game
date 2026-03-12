
import { GameLevel } from './types';

export const TARGET_ICONS: Record<string, string> = {
  dog: '🐶',
  cat: '🐱',
  rat: '🐭',
  bonus: '⭐',
  hazard: '💣'
};

export const INITIAL_LEVELS: GameLevel[] = [
  {
    id: 'default-1',
    name: "Beginner's Luck",
    author: 'System',
    description: 'Catch the ideas before they fade! Avoid the distractions.',
    gridSize: 3,
    plays: 15420,
    rating: 4.9,
    ratingCount: 892,
    createdAt: Date.now(),
    logic: {
      spawnInterval: 1200,
      activeDuration: 1000,
      winConditionScore: 15,
      timeLimit: 30,
      description: 'Perfect for starting your journey.',
      targetWeights: { dog: 50, rat: 30, cat: 10, bonus: 5, hazard: 5 },
      targetScores: { dog: 5, cat: -10, rat: 2, bonus: 20, hazard: -15 },
      gameType: 'Standard',
      boardTheme: 'Cyber',
      bgmType: 'custom',
      customBgmUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3',
      speedMultiplier: 1.0,
      targetSizeMultiplier: 1.0,
      customIcons: { dog: '🐶', cat: '🐱', rat: '🐭', bonus: '⭐', hazard: '💣' }
    }
  },
  {
    id: 'default-2',
    name: 'Focus Master',
    author: 'Admin',
    description: 'High speed challenge. Only pure insights matter here.',
    gridSize: 4,
    plays: 8902,
    rating: 4.7,
    ratingCount: 412,
    createdAt: Date.now() - 86400000,
    logic: {
      spawnInterval: 1000,
      activeDuration: 1200,
      winConditionScore: 40,
      timeLimit: 30,
      description: 'Test your reflexes and focus.',
      targetWeights: { dog: 30, rat: 30, cat: 25, bonus: 10, hazard: 5 },
      targetScores: { dog: 10, cat: -20, rat: 5, bonus: 50, hazard: -50 },
      gameType: 'Focus',
      boardTheme: 'Void',
      bgmType: 'custom',
      customBgmUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3',
      speedMultiplier: 1.2,
      targetSizeMultiplier: 1.0,
      customIcons: { dog: '🐶', cat: '🐱', rat: '🐭', bonus: '⭐', hazard: '💣' }
    }
  },
  {
    id: 'default-3',
    name: 'Zen Garden',
    author: 'Nature',
    description: 'A calm and peaceful session. Slow down and breathe.',
    gridSize: 3,
    plays: 4500,
    rating: 4.8,
    ratingCount: 210,
    createdAt: Date.now() - 172800000,
    logic: {
      spawnInterval: 2000,
      activeDuration: 1500,
      winConditionScore: 10,
      timeLimit: 60,
      description: 'Relaxing pace for mindful play.',
      targetWeights: { dog: 60, rat: 20, cat: 10, bonus: 10, hazard: 0 },
      targetScores: { dog: 2, cat: -2, rat: 1, bonus: 5, hazard: 0 },
      gameType: 'Standard',
      boardTheme: 'Cyber',
      bgmType: 'custom',
      customBgmUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3',
      speedMultiplier: 0.7,
      targetSizeMultiplier: 1.2,
      customIcons: { dog: '🐶', cat: '🐱', rat: '🐭', bonus: '⭐', hazard: '💣' }
    }
  },
  {
    id: 'default-4',
    name: 'Space Race',
    author: 'Cosmos',
    description: 'Out of this world speed! Can you keep up with the stars?',
    gridSize: 5,
    plays: 12300,
    rating: 4.6,
    ratingCount: 560,
    createdAt: Date.now() - 259200000,
    logic: {
      spawnInterval: 600,
      activeDuration: 500,
      winConditionScore: 100,
      timeLimit: 45,
      description: 'Extreme speed for the bravest pilots.',
      targetWeights: { dog: 40, rat: 40, cat: 5, bonus: 10, hazard: 5 },
      targetScores: { dog: 8, cat: -30, rat: 4, bonus: 100, hazard: -80 },
      gameType: 'Standard',
      boardTheme: 'Void',
      bgmType: 'custom',
      customBgmUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3',
      speedMultiplier: 1.8,
      targetSizeMultiplier: 0.8,
      customIcons: { dog: '🐶', cat: '🐱', rat: '🐭', bonus: '⭐', hazard: '💣' }
    }
  },
  {
    id: 'default-5',
    name: 'Neural Overload',
    author: 'Chaos',
    description: 'The ultimate test of neural processing. Insane speed, insane stakes.',
    gridSize: 4,
    plays: 666,
    rating: 5.0,
    ratingCount: 66,
    createdAt: Date.now(),
    logic: {
      spawnInterval: 600,
      activeDuration: 800,
      winConditionScore: 150,
      timeLimit: 60,
      description: 'WARNING: High cognitive load detected.',
      targetWeights: { dog: 30, rat: 30, cat: 20, bonus: 10, hazard: 10 },
      targetScores: { dog: 15, cat: -50, rat: 10, bonus: 200, hazard: -100 },
      gameType: 'Insane',
      boardTheme: 'Insane',
      bgmType: 'custom',
      customBgmUrl: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3',
      speedMultiplier: 1.8,
      targetSizeMultiplier: 0.9,
      customIcons: { dog: '🐶', cat: '🐱', rat: '🐭', bonus: '⭐', hazard: '💣' }
    }
  }
];
