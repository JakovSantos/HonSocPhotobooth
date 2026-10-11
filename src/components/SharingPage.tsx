import React, { useState, useEffect } from 'react';
import {
  Download,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Share2,
  Check,
} from 'lucide-react';
import { SupabaseService } from '../services/supabase';
import { PhotoComposer } from '../services/composer';
import { soundEffects } from '../services/audio';

interface SharingPageProps {
  photoId: string;
  onGoToPhotobooth: () => void;
}

export const SharingPage: React.FC<SharingPageProps> = ({
  photoId,
  onGoToPhotobooth,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const loadPhoto = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { url, blob } = await SupabaseService.getPhotoInfo(photoId);

        if (isCancelled) return;

        if (blob) {
          setImageBlob(blob);
          const blobUrl = URL.createObjectURL(blob);
          setImageUrl(blobUrl);
        } else if (url) {
          setImageUrl(url);
        } else {
          throw new Error('Image could not be retrieved from storage.');
        }
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('Failed to load sharing image:', msg);
          setErrorMessage(
            `Unable to retrieve the requested photo (#${photoId}): ${msg}. It may not exist or storage permissions may need configuration.`
          );
          setIsLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      isCancelled = true;
    };
  }, [photoId]);

  // Robust download logic (works across origins, mobile Safari & Android Chrome)
  const handleDownload = async () => {
    soundEffects.playClick();
    setIsDownloading(true);

    try {
      const filename = `AUF_CCS_HonSoc_${photoId}.png`;

      if (imageBlob) {
        // Direct local blob download
        PhotoComposer.downloadBlob(imageBlob, filename);
      } else if (imageUrl) {
        // Fetch blob and trigger download
        await SupabaseService.downloadImageFromUrl(imageUrl, filename);
      }
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: open image URL directly
      if (imageUrl) window.open(imageUrl, '_blank');
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const handleShare = async () => {
    soundEffects.playClick();
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AUF CCS Honor Society Photobooth',
          text: 'Check out my official The Legend of HonSoc Photobooth photo!',
          url: shareUrl,
        });
        return;
      } catch {
        // Cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this sharing link:', shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#08140f] text-[#f7f3e8] flex flex-col items-center px-4 py-8 relative">
      {/* Background magical elements */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-4 mb-6 relative z-10">
        <button
          onClick={onGoToPhotobooth}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-amber-500/20 text-xs sm:text-sm text-amber-200 hover:border-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Launch Photobooth</span>
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/assets/honsoc-logo.png"
            alt="AUF CCS Honor Society"
            className="h-8 w-auto object-contain"
          />
          <span className="font-title text-xs sm:text-sm font-bold text-amber-300 hidden sm:inline">
            AUF CCS HONOR SOCIETY
          </span>
        </div>
      </div>

      {/* Main Sharing Card */}
      <div className="w-full max-w-md fantasy-panel rounded-3xl p-6 border border-amber-500/40 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center relative z-10 backdrop-blur-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-widest uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>OFFICIAL KEEPSAKE</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>

        <h1 className="font-title text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#b45309] mb-1">
          THE LEGEND OF HONSOC
        </h1>
        <p className="text-xs text-stone-300 mb-5">
          AUF CCS Month 2026 • 4-Photo Royal Photobooth
        </p>

        {/* Loading State */}
        {isLoading && (
          <div className="aspect-[682/1024] w-full max-w-[340px] rounded-2xl bg-black/40 border border-amber-500/20 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <p className="font-title text-xs sm:text-sm text-amber-200">
              Retrieving Royal Keepsake...
            </p>
            <p className="text-[11px] text-stone-400">
              Loading image from cloud storage
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && !isLoading && (
          <div className="aspect-[682/1024] w-full max-w-[340px] rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col items-center justify-center gap-3 p-6 text-center text-rose-300">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="font-bold text-xs sm:text-sm">Photo Not Found</p>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Image Display */}
        {imageUrl && !isLoading && (
          <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border-2 border-amber-500/40 bg-black mb-5">
            <img
              src={imageUrl}
              alt="AUF CCS Honor Society Photobooth"
              className="w-full h-auto object-contain block drop-shadow-xl"
            />
          </div>
        )}

        {/* Actions Bar */}
        {imageUrl && !isLoading && (
          <div className="w-full flex flex-col gap-3">
            {/* Prominent Download Photo Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 font-title font-extrabold text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(234,179,8,0.4)] transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-stone-950" />
              )}
              <span>DOWNLOAD PHOTO (PNG)</span>
            </button>

            {/* Share / Copy Link Button */}
            <button
              onClick={handleShare}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Share2 className="w-4 h-4 text-amber-400" />
              )}
              <span>{copied ? 'Link Copied to Clipboard!' : 'Share Photo Link'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <p className="mt-5 text-[11px] text-stone-400">
          Permanent keepsake hosted for AUF College of Computer Studies students & participants.
        </p>
      </div>
    </div>
  );
};
