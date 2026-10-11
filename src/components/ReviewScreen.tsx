import React, { useState, useEffect } from 'react';
import {
  Download,
  QrCode,
  RotateCcw,
  Camera,
  Sparkles,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PhotoComposer } from '../services/composer';
import { soundEffects } from '../services/audio';
import { FRAME_SLOTS } from '../types/photobooth';
import type { CapturedPhoto } from '../types/photobooth';

interface ReviewScreenProps {
  photos: Record<number, CapturedPhoto>;
  onRetakeSlot: (slotIndex: number) => void;
  onRetakeAll: () => void;
  onStartNewSession: () => void;
  onOpenQRModal: (composedBlob: Blob, composedDataUrl: string) => void;
  onUserActivity: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  photos,
  onRetakeSlot,
  onRetakeAll,
  onStartNewSession,
  onOpenQRModal,
  onUserActivity,
}) => {
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [compositeBlob, setCompositeBlob] = useState<Blob | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(true);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Generate composition on mount
  useEffect(() => {
    let isCancelled = false;

    const compose = async () => {
      setIsComposing(true);
      setComposeError(null);
      try {
        // High-res 2x render (1364 x 2048) for stunning quality
        const result = await PhotoComposer.composeFinalImage(photos, 2);
        if (!isCancelled) {
          setCompositeUrl(result.dataUrl);
          setCompositeBlob(result.blob);
          setIsComposing(false);

          // Confetti celebration
          try {
            confetti({
              particleCount: 65,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#d4af37', '#10b981', '#14b8a6', '#fbe285'],
            });
          } catch {
            // Ignore confetti errors
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Composition error:', err);
          setComposeError(`Failed to generate final composition: ${errorMsg}`);
          setIsComposing(false);
        }
      }
    };

    compose();

    return () => {
      isCancelled = true;
    };
  }, [photos]);

  // Handle direct download
  const handleDownload = () => {
    if (!compositeBlob) return;
    onUserActivity();
    soundEffects.playClick();
    setIsDownloading(true);

    try {
      PhotoComposer.downloadBlob(
        compositeBlob,
        `AUF_CCS_HonSoc_Photobooth_${Date.now()}.png`
      );
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div
      className="relative max-w-5xl mx-auto px-4 py-6 flex flex-col items-center select-none"
      onClick={onUserActivity}
    >
      {/* Title Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-950/80 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>QUEST ACCOMPLISHED</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h2 className="font-title text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#b45309]">
          YOUR SACRED KEEPSAKE
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 mt-1">
          Review your 4-photo composition sealed in the AUF CCS Honor Society frame
        </p>
      </div>

      {/* Main Review Layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Frame Composition Preview (7 cols) */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.9)] border-2 border-amber-500/40 bg-[#08140f] flex items-center justify-center">
            {isComposing && (
              <div className="aspect-[682/1024] w-full flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="font-title text-sm text-amber-200">
                  Enchanting & Composing Frame...
                </p>
                <p className="text-xs text-stone-400">
                  Aligning 4 poses with the royal seal
                </p>
              </div>
            )}

            {composeError && (
              <div className="aspect-[682/1024] w-full flex flex-col items-center justify-center p-6 text-center text-rose-300">
                <p className="font-bold text-sm mb-2">{composeError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-rose-900/60 border border-rose-500 text-xs text-white"
                >
                  Reload Page
                </button>
              </div>
            )}

            {compositeUrl && !isComposing && (
              <img
                src={compositeUrl}
                alt="AUF CCS Honor Society Photobooth Final Keepsake"
                className="w-full h-auto object-contain block drop-shadow-2xl"
              />
            )}
          </div>
        </div>

        {/* Right: Actions & Individual Retake Panel (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-5 w-full">
          {/* Primary Action Buttons */}
          <div className="p-5 rounded-2xl fantasy-panel border border-amber-500/30 flex flex-col gap-3 shadow-xl">
            <h3 className="font-title text-sm font-bold text-amber-200 tracking-wider pb-2 border-b border-amber-500/20">
              KEEPSAKE ACTIONS
            </h3>

            {/* Download Photo Button */}
            <button
              onClick={handleDownload}
              disabled={!compositeBlob || isComposing || isDownloading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 font-title font-extrabold text-sm sm:text-base tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(234,179,8,0.35)] transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-stone-950" />
              )}
              <span>DOWNLOAD PHOTO (PNG)</span>
            </button>

            {/* Generate QR Code Button */}
            <button
              onClick={() => {
                if (!compositeBlob || !compositeUrl) return;
                soundEffects.playClick();
                onOpenQRModal(compositeBlob, compositeUrl);
              }}
              disabled={!compositeBlob || isComposing}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:via-teal-400 hover:to-emerald-500 text-stone-950 font-title font-extrabold text-sm sm:text-base tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(20,184,166,0.35)] transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="w-5 h-5 text-stone-950" />
              <span>GET PHONE QR CODE</span>
            </button>
          </div>

          {/* Individual Slot Retake Section */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-amber-500/20 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-amber-500/15">
              <span className="text-xs font-title font-bold text-amber-200">
                RETAKE INDIVIDUAL PHOTO
              </span>
              <span className="text-[11px] text-stone-400">
                Change any single pose
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FRAME_SLOTS.map((slot) => {
                const photo = photos[slot.index];
                return (
                  <button
                    key={slot.index}
                    onClick={() => {
                      onUserActivity();
                      soundEffects.playClick();
                      onRetakeSlot(slot.index);
                    }}
                    className="p-2 rounded-xl bg-emerald-900/30 hover:bg-emerald-800/50 border border-amber-500/20 hover:border-amber-400 flex items-center gap-2 text-left transition group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-amber-500/30 bg-black">
                      {photo && (
                        <img
                          src={photo.dataUrl}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[11px] font-semibold text-amber-100 group-hover:text-amber-300">
                        {slot.label}
                      </div>
                      <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Retake</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onUserActivity();
                soundEffects.playClick();
                if (window.confirm('Retake all 4 photos?')) {
                  onRetakeAll();
                }
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake All Photos</span>
            </button>

            <button
              onClick={() => {
                onUserActivity();
                soundEffects.playClick();
                if (window.confirm('Start a new photobooth session?')) {
                  onStartNewSession();
                }
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-amber-500/30 text-amber-200 text-xs font-semibold tracking-wide transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Start New Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
