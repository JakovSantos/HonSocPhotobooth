import { FRAME_WIDTH, FRAME_HEIGHT, FRAME_SLOTS } from '../types/photobooth';
import type { CapturedPhoto } from '../types/photobooth';

export class PhotoComposer {
  private static frameImageCache: HTMLImageElement | null = null;

  // Preload the frame PNG
  public static async loadFrameImage(): Promise<HTMLImageElement> {
    if (this.frameImageCache && this.frameImageCache.complete) {
      return this.frameImageCache;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.frameImageCache = img;
        resolve(img);
      };
      img.onerror = (err) => {
        reject(new Error(`Failed to load photobooth frame: ${err}`));
      };
      img.src = '/assets/photobooth-frame.png';
    });
  }

  // Preload an image from dataURL
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`Failed to load photo: ${err}`));
      img.src = src;
    });
  }

  /**
   * Compose the final 4-photo image combined with the exact frame PNG
   * Scale factor can be 1 (682x1024) or 2 (1364x2048) for ultra high resolution
   */
  public static async composeFinalImage(
    photos: Record<number, CapturedPhoto>,
    scale: number = 2
  ): Promise<{ dataUrl: string; blob: Blob; canvas: HTMLCanvasElement }> {
    const frameImg = await this.loadFrameImage();

    const canvas = document.createElement('canvas');
    const width = FRAME_WIDTH * scale;
    const height = FRAME_HEIGHT * scale;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Failed to obtain 2D canvas rendering context');
    }

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw solid dark background under photos in case of slight transparency
    ctx.fillStyle = '#08140f';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw each of the 4 photos into its slot
    const bleed = 3 * scale; // Bleed behind frame border to ensure seamless edges

    for (const slot of FRAME_SLOTS) {
      const photo = photos[slot.index];
      if (photo && photo.dataUrl) {
        try {
          const photoImg = await this.loadImage(photo.dataUrl);

          const slotX = slot.x * scale;
          const slotY = slot.y * scale;
          const slotW = slot.width * scale;
          const slotH = slot.height * scale;

          // Object-fit: cover calculation
          const targetAspect = slotW / slotH;
          const sourceAspect = photoImg.naturalWidth / photoImg.naturalHeight;

          let sx = 0;
          let sy = 0;
          let sWidth = photoImg.naturalWidth;
          let sHeight = photoImg.naturalHeight;

          if (sourceAspect > targetAspect) {
            // Source is wider than slot: crop horizontally
            sWidth = photoImg.naturalHeight * targetAspect;
            sx = (photoImg.naturalWidth - sWidth) / 2;
          } else {
            // Source is taller than slot: crop vertically
            sHeight = photoImg.naturalWidth / targetAspect;
            sy = (photoImg.naturalHeight - sHeight) / 2;
          }

          // Draw the photo behind the frame opening with slight bleed
          ctx.drawImage(
            photoImg,
            sx,
            sy,
            sWidth,
            sHeight,
            slotX - bleed,
            slotY - bleed,
            slotW + bleed * 2,
            slotH + bleed * 2
          );
        } catch (err) {
          console.error(`Error drawing photo for slot ${slot.index}:`, err);
        }
      }
    }

    // 3. Draw the exact PNG frame over the photos
    // This perfectly overlays all ornamental borders, cut corners, and emblems
    ctx.drawImage(frameImg, 0, 0, width, height);

    // 4. Generate high-quality PNG
    const dataUrl = canvas.toDataURL('image/png', 1.0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to generate PNG blob from canvas'));
        },
        'image/png',
        1.0
      );
    });

    return { dataUrl, blob, canvas };
  }

  // Helper to trigger direct browser download
  public static downloadBlob(blob: Blob, filename?: string) {
    const name = filename || `AUF_CCS_HonSoc_${Date.now()}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}
