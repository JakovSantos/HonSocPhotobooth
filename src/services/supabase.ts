import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig, UploadResult } from '../types/photobooth';

const STORAGE_KEY = 'honsoc_supabase_config';
const DEFAULT_BUCKET = 'photobooth';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static cachedConfig: SupabaseConfig | null = null;

  // Retrieve current active config from .env or localStorage
  public static getConfig(): SupabaseConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const envBucket = import.meta.env.VITE_SUPABASE_BUCKET || DEFAULT_BUCKET;
    const envPublicUrl = import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    let localConfig: Partial<SupabaseConfig> = {};
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          localConfig = JSON.parse(stored);
        }
      } catch {
        // Ignore JSON error
      }
    }

    this.cachedConfig = {
      url: localConfig.url || envUrl,
      anonKey: localConfig.anonKey || envKey,
      bucket: localConfig.bucket || envBucket || DEFAULT_BUCKET,
      publicUrl: localConfig.publicUrl || envPublicUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
    };

    return this.cachedConfig;
  }

  // Save manual configuration (e.g. from Settings modal)
  public static saveConfig(config: SupabaseConfig) {
    this.cachedConfig = { ...config };
    this.client = null; // Reset client
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  }

  // Check if Supabase has been properly configured
  public static isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
  }

  // Get initialized Supabase client
  public static getClient(): SupabaseClient | null {
    if (this.client) return this.client;

    const config = this.getConfig();
    if (!config.url || !config.anonKey) return null;

    try {
      this.client = createClient(config.url, config.anonKey);
      return this.client;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  // Test the Supabase connection and bucket access
  public static async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = this.getClient();
    const config = this.getConfig();

    if (!client) {
      return {
        success: false,
        message: 'Supabase URL and Anon Key are missing or invalid.',
      };
    }

    try {
      const { data, error } = await client.storage.from(config.bucket).list('', { limit: 1 });
      if (error) {
        return {
          success: false,
          message: `Storage error: ${error.message}. Please verify bucket "${config.bucket}" exists and has public read/upload policy.`,
        };
      }
      return {
        success: true,
        message: `Successfully connected to bucket "${config.bucket}" (${data.length} items visible).`,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Connection test failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Upload a composed photobooth image blob to persistent Supabase Storage
   */
  public static async uploadPhoto(blob: Blob): Promise<UploadResult> {
    const config = this.getConfig();
    const client = this.getClient();

    if (!client || !this.isConfigured()) {
      throw new Error(
        'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or Settings modal.'
      );
    }

    // Generate unique, unpredictable identifier
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const photoId = `honsoc_${timestamp}_${randomHex}`;
    const filePath = `photobooth/${photoId}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await client.storage
      .from(config.bucket)
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Retrieve public accessible URL
    const { data } = client.storage.from(config.bucket).getPublicUrl(filePath);
    const storageUrl = data.publicUrl;

    // Sharing page URL
    const baseOrigin = config.publicUrl.replace(/\/$/, '') || window.location.origin;
    const sharingUrl = `${baseOrigin}/photo/${photoId}`;

    return {
      photoId,
      storageUrl,
      sharingUrl,
    };
  }

  /**
   * Fetch an image URL or Blob for a given photoId on the sharing page
   */
  public static async getPhotoInfo(photoId: string): Promise<{
    url: string;
    blob: Blob | null;
  }> {
    const config = this.getConfig();
    const client = this.getClient();
    const filePath = `photobooth/${photoId}.png`;

    if (client) {
      // Direct download from Supabase API (bypasses CORS restrictions)
      try {
        const { data: blobData, error: downloadError } = await client.storage
          .from(config.bucket)
          .download(filePath);

        if (!downloadError && blobData) {
          const { data } = client.storage.from(config.bucket).getPublicUrl(filePath);
          return {
            url: data.publicUrl,
            blob: blobData,
          };
        }
      } catch (e) {
        console.warn('Direct Supabase download failed, falling back to public URL fetch:', e);
      }
    }

    // Fallback: construct public URL from configured endpoint
    const url = `${config.url.replace(/\/$/, '')}/storage/v1/object/public/${config.bucket}/${filePath}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return { url, blob };
      }
    } catch (e) {
      console.warn('Fetch fallback failed:', e);
    }

    return { url, blob: null };
  }

  /**
   * Helper to download cross-origin PNG reliably by fetching blob
   */
  public static async downloadImageFromUrl(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      }, 150);
    } catch {
      // Fallback: open in new window if direct blob fetch fails
      window.open(url, '_blank');
    }
  }
}
