export interface SlotCoordinates {
  index: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Exact coordinates calculated from the supplied PNG frame (682x1024)
export const FRAME_WIDTH = 682;
export const FRAME_HEIGHT = 1024;

export const FRAME_SLOTS: SlotCoordinates[] = [
  { index: 0, label: 'Top Left', x: 90, y: 212, width: 238, height: 274 },
  { index: 1, label: 'Top Right', x: 353, y: 212, width: 238, height: 274 },
  { index: 2, label: 'Bottom Left', x: 90, y: 514, width: 238, height: 274 },
  { index: 3, label: 'Bottom Right', x: 353, y: 514, width: 238, height: 274 },
];

export interface CapturedPhoto {
  slotIndex: number;
  dataUrl: string;
  blob?: Blob;
  timestamp: number;
}

export type PhotoboothStep = 'splash' | 'capturing' | 'review';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  bucket: string;
  publicUrl: string; // Base URL for sharing, e.g. https://auf-ccs-photobooth.vercel.app
}

export interface UploadResult {
  photoId: string;
  storageUrl: string;
  sharingUrl: string;
}
