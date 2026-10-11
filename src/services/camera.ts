export interface CameraState {
  stream: MediaStream | null;
  error: string | null;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  facingMode: 'user' | 'environment';
  isMirrored: boolean;
}

export class CameraService {
  /**
   * Request media stream with preferred facing mode or device ID
   */
  public static async startCamera(
    facingMode: 'user' | 'environment' = 'user',
    deviceId?: string
  ): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        'Camera API is not supported in this browser. Please ensure you are using HTTPS or a modern browser.'
      );
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? {
            deviceId: { exact: deviceId },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          }
        : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
      // Fallback with minimal constraints if high resolution failed
      console.warn('Initial camera constraints failed, attempting fallback:', err);
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facingMode } },
      });
    }
  }

  /**
   * Enumerate available video input devices
   */
  public static async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'videoinput');
    } catch (err) {
      console.warn('Failed to enumerate devices:', err);
      return [];
    }
  }

  /**
   * Stop all active media tracks to release camera hardware
   */
  public static stopStream(stream: MediaStream | null) {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (err) {
      console.warn('Error stopping stream tracks:', err);
    }
  }

  /**
   * Capture a single still frame from a video element
   * Returns high-quality PNG data URL
   */
  public static captureFrame(
    video: HTMLVideoElement,
    mirror: boolean = false
  ): string {
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context for frame capture');

    if (mirror) {
      // Flip horizontally so the photo matches what the user saw in their mirrored preview
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/png', 0.95);
  }
}
