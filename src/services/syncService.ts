import { getSupabase } from './supabaseClient';
import { UserStats, GameLevel } from '../types';

export class SyncService {
  private static isOnline(): boolean {
    return navigator.onLine;
  }

  static async syncProfile(user: UserStats, userId: string): Promise<void> {
    if (!this.isOnline()) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: user.username,
          avatar_url: user.avatar,
          total_whacks: user.totalWhacks,
          xp: user.xp,
          rank: user.rank,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (e) {
      console.warn("Profile sync failed:", e);
    }
  }

  static async syncLevel(level: GameLevel, userId: string): Promise<void> {
    if (!this.isOnline()) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('levels')
        .upsert({
          id: level.id,
          user_id: userId,
          name: level.name,
          author: level.author,
          description: level.description,
          grid_size: level.gridSize,
          logic: level.logic,
          rating: level.rating,
          rating_count: level.ratingCount,
          plays: level.plays,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (e) {
      console.warn("Level sync failed:", e);
    }
  }

  static async fetchRemoteLevels(): Promise<GameLevel[]> {
    if (!this.isOnline()) return [];

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(l => ({
        id: l.id,
        name: l.name,
        author: l.author,
        description: l.description,
        gridSize: l.grid_size,
        logic: l.logic,
        rating: l.rating,
        ratingCount: l.rating_count,
        plays: l.plays,
        createdAt: new Date(l.created_at).getTime()
      }));
    } catch (e) {
      console.warn("Fetching remote levels failed:", e);
      return [];
    }
  }

  static async fetchUserProfile(userId: string): Promise<Partial<UserStats> | null> {
    if (!this.isOnline()) return null;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) return null;

      return {
        username: data.username,
        avatar: data.avatar_url,
        totalWhacks: data.total_whacks,
        xp: data.xp,
        rank: data.rank,
      };
    } catch (e) {
      return null;
    }
  }
}
