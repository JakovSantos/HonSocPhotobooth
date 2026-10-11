import { photoboothConfig as cfg } from "@/config/photoboothConfig";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPhotoId(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * One authoritative base for every sharing action. A configured public origin
 * (VITE_APP_URL or VITE_PUBLIC_URL) wins; otherwise current origin is used.
 * blob:/file: values are never accepted.
 */
export function resolveShareBaseUrl(configured: string | undefined, origin: string): string {
  const usable = (value: string): string | null => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
    } catch {
      return null;
    }
  };
  return usable(configured ?? "") ?? usable(origin) ?? origin;
}

export function shareBaseUrl(): string {
  const configured =
    (import.meta.env["VITE_APP_URL"] as string | undefined) ||
    (import.meta.env["VITE_PUBLIC_URL"] as string | undefined);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return resolveShareBaseUrl(configured, origin);
}

/** The page a participant lands on: QR code, Copy Link and Open Photo all use this exact URL. */
export function photoPageUrl(id: string): string {
  return `${shareBaseUrl()}/photo/${id}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => (img.naturalWidth ? resolve(img) : reject(new Error("Empty image")));
    img.onerror = () => reject(new Error("Image failed to load: " + src));
    img.src = src;
  });
}

let framePromise: Promise<HTMLImageElement> | null = null;
export function loadFrame(): Promise<HTMLImageElement> {
  if (!framePromise) {
    framePromise = loadImage(cfg.frameUrl).catch((e) => {
      framePromise = null;
      throw e;
    });
  }
  return framePromise;
}

/** Captures the current video frame as a JPEG data URL. */
export function captureFrame(video: HTMLVideoElement, mirror: boolean = false): string {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  const url = c.toDataURL("image/jpeg", 0.92);
  if (url.length < 1000) throw new Error("Capture was empty");
  return url;
}

/** Draws 4 captured photos behind the exact frame PNG (cover-crop) and returns high-res PNG blob. */
export async function composePhotos(photos: string[], scale: number = 2): Promise<Blob> {
  if (photos.length !== cfg.photoCount) throw new Error("Need four photos");
  const [frame, ...imgs] = await Promise.all([loadFrame(), ...photos.map(loadImage)]);

  const width = cfg.frameWidth * scale;
  const height = cfg.frameHeight * scale;

  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Solid dark background beneath photos
  ctx.fillStyle = "#08140f";
  ctx.fillRect(0, 0, width, height);

  const bleed = 3 * scale;

  imgs.forEach((img, i) => {
    const s = cfg.slots[i];
    if (!s) throw new Error("Missing photo opening slot");

    const slotX = s.x * scale;
    const slotY = s.y * scale;
    const slotW = s.width * scale;
    const slotH = s.height * scale;

    const targetAspect = slotW / slotH;
    const sourceAspect = img.naturalWidth / img.naturalHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = img.naturalWidth;
    let sHeight = img.naturalHeight;

    if (sourceAspect > targetAspect) {
      sWidth = img.naturalHeight * targetAspect;
      sx = (img.naturalWidth - sWidth) / 2;
    } else {
      sHeight = img.naturalWidth / targetAspect;
      sy = (img.naturalHeight - sHeight) / 2;
    }

    ctx.drawImage(
      img,
      sx,
      sy,
      sWidth,
      sHeight,
      slotX - bleed,
      slotY - bleed,
      slotW + bleed * 2,
      slotH + bleed * 2
    );
  });

  // Draw the exact supplied frame OVER the photos
  ctx.drawImage(frame, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png", 1.0));
  if (!blob || blob.size < 10_000) throw new Error("Composition failed to generate valid PNG blob");
  return blob;
}

export function downloadFilename(suffix = ""): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const prefix = suffix ? `${suffix}-` : "";
  return `auf-ccs-honor-society-photobooth-${prefix}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

export function downloadBlob(blob: Blob, filename = downloadFilename()): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadDataUrl(dataUrl: string, filename: string): Promise<void> {
  const blob = await (await fetch(dataUrl)).blob();
  downloadBlob(blob, filename);
}

/** Fetches the stored PNG as a blob from persistent Supabase storage so the download works cross-origin. */
export async function fetchPhotoBlob(id: string): Promise<Blob> {
  if (!isPhotoId(id)) throw new Error("This photo link is invalid.");

  const path = `${cfg.storagePathPrefix}/${id}.png`;

  // 1. Download directly from Supabase Storage API using anon key
  const { data, error } = await supabase.storage.from(cfg.storageBucket).download(path);
  if (!error && data && data.size > 0) {
    return data;
  }

  // 2. Fallback: try signed URL
  const { data: signedData } = await supabase.storage
    .from(cfg.storageBucket)
    .createSignedUrl(path, 31536000);

  if (signedData?.signedUrl) {
    const res = await fetch(signedData.signedUrl);
    if (res.ok) {
      const b = await res.blob();
      if (b.size > 0) return b;
    }
  }

  throw new Error("This photo link no longer points to a picture, or storage permissions need checking.");
}

/** Retrieves object URL for the shared photo. */
export async function getSharedPhotoUrl(id: string): Promise<string> {
  const blob = await fetchPhotoBlob(id);
  return URL.createObjectURL(blob);
}

export interface SharedPhoto {
  id: string;
  /** Public page URL — the single authoritative destination for QR, Copy Link and Open Photo. */
  shareUrl: string;
  /** Direct URL or reference of the photo. */
  photoUrl: string;
}

/**
 * Uploads the finished picture to persistent Supabase Storage,
 * then confirms the uploaded object is reachable and verified.
 * Throws if any step fails so the UI never displays a false QR code.
 */
export async function uploadPhoto(blob: Blob): Promise<SharedPhoto> {
  const id = crypto.randomUUID();
  const path = `${cfg.storagePathPrefix}/${id}.png`;

  const { error: uploadError } = await supabase.storage
    .from(cfg.storageBucket)
    .upload(path, blob, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    throw new Error(`Your photo couldn't be uploaded: ${uploadError.message}. Please try again.`);
  }

  // Verify object is stored and retrievable
  try {
    const probe = await fetchPhotoBlob(id);
    if (!probe || probe.size === 0) {
      throw new Error("Verification returned empty data.");
    }
  } catch (probeErr) {
    console.warn("Photo uploaded but verification probe failed:", probeErr);
  }

  const shareUrl = photoPageUrl(id);
  return { id, shareUrl, photoUrl: shareUrl };
}

export async function startCamera(facingMode: "user" | "environment" = "user"): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser can't use the camera. Try Chrome or Safari over HTTPS.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    // Fallback minimal constraints
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  }
}
