import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsfiahwdfmnrrrmjkxjd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZmlhaHdkZm1ucnJybWpreGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjMzNTEsImV4cCI6MjA4NzIzOTM1MX0.5nBNUBxTE9-Ybi6C3gNp8PabAzFu-1ebqlR5TRZrlSM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Attempts to upload a file to Supabase storage.
 * @param file The file to upload
 * @param path The path/filename within the bucket
 * @param bucketName The Supabase bucket name
 * @returns The public URL of the uploaded file, or null if it fails/is unconfigured.
 */
export const uploadToSupabase = async (file: File, path: string, bucketName: string): Promise<string | null> => {
  if (!supabase) return null;

  try {
    const { error } = await supabase.storage.from(bucketName).upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600'
    });

    if (error) {
      console.warn("Supabase upload error details:", error);
      alert(`Supabase Error: ${error.message} (Bucket: ${bucketName})\n\nTips: Ensure public access and that the bucket exists.`);
      return null;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Supabase exception:", err);
    return null;
  }
};
