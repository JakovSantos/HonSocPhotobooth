import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RotateCw,
  FlipHorizontal,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CameraService } from '../services/camera';
import { soundEffects } from '../services/audio';
import { FRAME_SLOTS } from '../types/photobooth';
import type { CapturedPhoto } from '../types/photobooth';

interface CaptureScreenProps {
  photos: Record<number, CapturedPhoto>;
  onPhotoCaptured: (slotIndex: number, photo: CapturedPhoto) => void;
  onCompleteCapture: () => void;
  onResetAll: () => void;
  onUserActivity: () => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  photos,
  onPhotoCaptured,
  onCompleteCapture,
  onResetAll,
  onUserActivity,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);

  // Camera settings
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Active slot (0, 1, 2, 3)
  const [targetSlot, setTargetSlot] = useState<number>(0);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Check how many slots are filled
  const filledCount = Object.keys(photos).length;
  const isAllFilled = [0, 1, 2, 3].every((idx) => Boolean(photos[idx]));

  // Auto-advance targetSlot to next empty slot when photos change
  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      if (!photos[i]) {
        setTargetSlot(i);
        break;
      }
    }
  }, [photos]);

  // Check for available video devices
  useEffect(() => {
    CameraService.getVideoDevices().then((devices) => {
      setHasMultipleCameras(devices.length > 1);
    });
  }, []);

  // Initialize camera stream
  const initCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop existing stream if running
    if (stream) {
      CameraService.stopStream(stream);
      setStream(null);
    }

    try {
      const newStream = await CameraService.startCamera(mode);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsLoadingCamera(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Camera initialization error:', err);
      setCameraError(
        errorMsg.includes('Permission') || errorMsg.includes('NotAllowedError')
          ? 'Camera permission was denied. Please allow camera access in your browser address bar and tap Retry.'
          : `Failed to access camera: ${errorMsg}. Please ensure your camera is not in use by another application.`
      );
      setIsLoadingCamera(false);
    }
  }, [stream]);

  // Start camera on mount & cleanup on unmount
  useEffect(() => {
    initCamera(facingMode);

    return () => {
      if (stream) {
        CameraService.stopStream(stream);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    onUserActivity();
    soundEffects.playClick();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // Usually environment camera shouldn't be mirrored
    setIsMirrored(nextMode === 'user');
  };

  // Toggle mirroring
  const handleToggleMirror = () => {
    onUserActivity();
    soundEffects.playClick();
    setIsMirrored((prev) => !prev);
  };

  // Capture execution
  const takePhotoNow = useCallback(() => {
    if (!videoRef.current) return;

    soundEffects.playShutter();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const dataUrl = CameraService.captureFrame(videoRef.current, isMirrored);
    const newPhoto: CapturedPhoto = {
      slotIndex: targetSlot,
      dataUrl,
      timestamp: Date.now(),
    };

    onPhotoCaptured(targetSlot, newPhoto);

    // If next slots are empty, advance targetSlot
    const nextSlot = [0, 1, 2, 3].find((i) => i !== targetSlot && !photos[i]);
    if (nextSlot !== undefined) {
      setTargetSlot(nextSlot);
    }
  }, [isMirrored, onPhotoCaptured, photos, targetSlot]);

  // Initiate countdown
  const handleStartCountdown = () => {
    if (countdown !== null || !stream || isLoadingCamera) return;

    onUserActivity();
    setCountdown(3);
    soundEffects.playCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(timer);
          return null;
        }
        if (prev <= 1) {
          clearInterval(timer);
          takePhotoNow();
          return null;
        }
        const nextVal = prev - 1;
        soundEffects.playCountdown(nextVal);
        return nextVal;
      });
    }, 1000);
  };

  return (
    <div
      className="relative max-w-5xl mx-auto px-4 py-4 flex flex-col items-center select-none"
      onClick={onUserActivity}
    >
      {/* Shutter Flash Overlay */}
      {isFlashing && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Header Info Banner */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-amber-400/30 text-amber-300 font-title font-semibold text-xs sm:text-sm tracking-wider flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>PHOTO {Math.min(filledCount + 1, 4)} OF 4</span>
          </div>
          <span className="text-xs text-stone-300 hidden sm:inline">
            Capturing Slot: <strong className="text-amber-200">{FRAME_SLOTS[targetSlot].label}</strong>
          </span>
        </div>

        {/* Action controls (Flip Camera & Mirror) */}
        <div className="flex items-center gap-2">
          {hasMultipleCameras && (
            <button
              onClick={handleToggleFacingMode}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-amber-500/20 text-xs text-amber-200 hover:border-amber-400 hover:bg-emerald-900/60 transition flex items-center gap-1"
              title="Flip between front and rear camera"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Flip</span>
            </button>
          )}

          <button
            onClick={handleToggleMirror}
            className={`px-2.5 py-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
              isMirrored
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-emerald-950/60 border-amber-500/20 text-stone-400 hover:text-amber-200'
            }`}
            title="Mirror preview for selfie perspective"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>{isMirrored ? 'Mirrored' : 'Normal'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport (Live Camera + Slots Strip) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Left/Center: Live Camera Viewport (3 cols) */}
        <div className="lg:col-span-3 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[68vh] rounded-3xl overflow-hidden bg-black border-2 border-amber-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform duration-300 ${
                isMirrored ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Loading Camera State */}
            {isLoadingCamera && !cameraError && (
              <div className="absolute inset-0 bg-[#08140f]/90 flex flex-col items-center justify-center gap-3 z-10">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm font-title text-amber-200 tracking-wide">
                  Summoning camera lens...
                </p>
              </div>
            )}

            {/* Camera Error / Permission Denied State */}
            {cameraError && (
              <div className="absolute inset-0 bg-[#0a1811]/95 p-6 flex flex-col items-center justify-center text-center gap-4 z-20">
                <AlertCircle className="w-12 h-12 text-rose-400 animate-bounce" />
                <h3 className="font-title text-lg font-bold text-rose-300">
                  Camera Access Unavailable
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 max-w-md leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={() => initCamera(facingMode)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm tracking-wide shadow-lg transition"
                >
                  Retry Camera Connection
                </button>
              </div>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-amber-400/80 bg-emerald-950/80 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.7)] animate-ping absolute" />
                  <span className="font-title text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 drop-shadow-[0_4px_16px_rgba(234,179,8,0.9)] z-10 animate-pulse">
                    {countdown}
                  </span>
                </div>
              </div>
            )}

            {/* Subtle Viewport Framing Marks */}
            <div className="absolute inset-3 pointer-events-none border border-amber-400/15 rounded-2xl flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400/50" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400/50" />
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400/50" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400/50" />
              </div>
            </div>
          </div>

          {/* Primary Action Button Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 w-full">
            {/* Capture Button */}
            <button
              onClick={handleStartCountdown}
              disabled={countdown !== null || isLoadingCamera || !!cameraError}
              className={`relative px-8 sm:px-12 py-3.5 rounded-2xl font-title font-bold text-base sm:text-lg tracking-wider flex items-center gap-3 transition-all duration-300 shadow-lg ${
                countdown !== null || isLoadingCamera || cameraError
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_35px_rgba(234,179,8,0.7)] transform hover:-translate-y-0.5 active:scale-95'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-rose-600 animate-ping" />
              <span>
                {countdown !== null
                  ? `PREPARE POSE... (${countdown})`
                  : `CAPTURE SHOT (${FRAME_SLOTS[targetSlot].label})`}
              </span>
            </button>

            {/* Review Button if all 4 are filled */}
            {isAllFilled && (
              <button
                onClick={() => {
                  soundEffects.playFanfare();
                  onCompleteCapture();
                }}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-title font-bold text-sm sm:text-base tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition transform hover:-translate-y-0.5"
              >
                <span>VIEW FINAL KEEPSAKE</span>
                <ArrowRight className="w-4 h-4 text-stone-950" />
              </button>
            )}
          </div>
        </div>

        {/* Right: 4-Photo Live Grid Strip (1 col) */}
        <div className="lg:col-span-1 w-full bg-emerald-950/40 border border-amber-500/25 rounded-2xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
            <span className="text-xs font-title font-bold text-amber-200">
              FRAME POSITIONS
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">
              {filledCount}/4 READY
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            {FRAME_SLOTS.map((slot) => {
              const photo = photos[slot.index];
              const isSelected = targetSlot === slot.index;

              return (
                <div
                  key={slot.index}
                  onClick={() => {
                    onUserActivity();
                    soundEffects.playClick();
                    setTargetSlot(slot.index);
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02]'
                      : photo
                      ? 'border-emerald-600/70 hover:border-amber-400/50'
                      : 'border-dashed border-amber-500/30 bg-emerald-950/20 hover:border-amber-400/50'
                  }`}
                  style={{ aspectRatio: '238/274' }}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo.dataUrl}
                        alt={`Slot ${slot.index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
                        <Camera className="w-4 h-4 text-amber-300" />
                        <span className="text-[10px] font-bold tracking-wide text-amber-200">
                          Tap to Retake
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                          isSelected
                            ? 'bg-amber-400 text-stone-950 shadow-md'
                            : 'bg-emerald-900/60 text-amber-200/70'
                        }`}
                      >
                        {slot.index + 1}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {slot.label}
                      </span>
                    </div>
                  )}

                  {/* Active target badge */}
                  {isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap shadow">
                      Next Shot
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Retake All photos button */}
          {filledCount > 0 && (
            <button
              onClick={() => {
                onUserActivity();
                soundEffects.playClick();
                if (window.confirm('Retake all 4 photos?')) {
                  onResetAll();
                }
              }}
              className="mt-1 w-full py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-[11px] font-medium transition"
            >
              Clear & Retake All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
