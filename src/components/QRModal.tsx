import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Copy,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Settings,
  Sparkles,
} from 'lucide-react';
import { SupabaseService } from '../services/supabase';
import { soundEffects } from '../services/audio';
import type { UploadResult } from '../types/photobooth';

interface QRModalProps {
  composedBlob: Blob;
  composedDataUrl: string;
  onClose: () => void;
  onOpenSettings: () => void;
  onUserActivity: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({
  composedBlob,
  onClose,
  onOpenSettings,
  onUserActivity,
}) => {
  const [uploadState, setUploadState] = useState<'uploading' | 'success' | 'error' | 'unconfigured'>('uploading');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Perform upload and QR generation
  const performUpload = async () => {
    onUserActivity();
    setUploadState('uploading');
    setErrorMessage(null);

    // 1. Verify Supabase configuration
    if (!SupabaseService.isConfigured()) {
      setUploadState('unconfigured');
      return;
    }

    try {
      // 2. Upload to persistent Supabase Storage
      const result = await SupabaseService.uploadPhoto(composedBlob);
      setUploadResult(result);

      // 3. Generate high-resolution scannable QR code
      // Adequate contrast (pure dark on ivory background) and quiet zone (margin 2)
      const qrDataUrl = await QRCode.toDataURL(result.sharingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#08140f',
          light: '#fdfbf7',
        },
        errorCorrectionLevel: 'H',
      });

      setQrCodeDataUrl(qrDataUrl);
      setUploadState('success');
      soundEffects.playFanfare();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('QR upload failed:', err);
      setErrorMessage(errorMsg);
      setUploadState('error');
    }
  };

  useEffect(() => {
    performUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copy link action
  const handleCopyLink = async () => {
    if (!uploadResult?.sharingUrl) return;
    onUserActivity();
    soundEffects.playClick();
    try {
      await navigator.clipboard.writeText(uploadResult.sharingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      prompt('Copy this sharing URL:', uploadResult.sharingUrl);
    }
  };

  // Download QR code image
  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;
    onUserActivity();
    soundEffects.playClick();
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `AUF_CCS_HonSoc_QR_${uploadResult?.photoId || 'code'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Open sharing page in new tab
  const handleOpenPhoto = () => {
    if (!uploadResult?.sharingUrl) return;
    onUserActivity();
    soundEffects.playClick();
    window.open(uploadResult.sharingUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-md fantasy-panel rounded-3xl p-6 border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center"
        onClick={onUserActivity}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-emerald-950/60 text-stone-400 hover:text-amber-200 border border-amber-500/20 hover:border-amber-400 transition"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-1.5 mb-1 text-amber-300 font-title font-semibold text-xs tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>ROYAL SHARING SEAL</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h3 className="font-title text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#b45309] mb-4">
          CROSS-DEVICE PHOTO ACCESS
        </h3>

        {/* STATE 1: Uploading to Supabase */}
        {uploadState === 'uploading' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <Loader2 className="w-8 h-8 text-amber-300 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="font-title text-base font-bold text-amber-200">
                Sealing & Uploading to Cloud...
              </p>
              <p className="text-xs text-stone-300 mt-1">
                Storing high-res PNG in persistent Supabase Storage
              </p>
            </div>
          </div>
        )}

        {/* STATE 2: Unconfigured Supabase */}
        {uploadState === 'unconfigured' && (
          <div className="py-4 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-title text-base font-bold text-amber-200">
                Supabase Storage Not Configured
              </h4>
              <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
                To generate a live, functional QR code scannable by any mobile phone, 
                connect your Supabase project in the settings or provide <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">.env</code> variables.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onOpenSettings();
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-title font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Settings className="w-4 h-4" />
                <span>CONFIGURE SUPABASE CREDENTIALS</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl border border-stone-700 text-stone-400 hover:text-white text-xs transition"
              >
                Cancel and Return
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: Error */}
        {uploadState === 'error' && (
          <div className="py-4 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-title text-base font-bold text-rose-300">
                Upload Encountered an Error
              </h4>
              <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto break-words">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={performUpload}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-title font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETRY UPLOAD</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  onOpenSettings();
                }}
                className="w-full py-2 px-4 rounded-xl border border-amber-500/30 text-amber-200 hover:bg-emerald-950 text-xs transition flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Check Storage Settings</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: Success - Real Functional QR Code */}
        {uploadState === 'success' && qrCodeDataUrl && uploadResult && (
          <div className="flex flex-col items-center w-full">
            {/* Scannable QR Code with quiet zone & contrast */}
            <div className="p-3 bg-[#fdfbf7] rounded-2xl border-4 border-amber-400/80 shadow-[0_0_35px_rgba(212,175,55,0.4)] mb-4 transition-transform hover:scale-102">
              <img
                src={qrCodeDataUrl}
                alt="Photobooth Share QR Code"
                className="w-60 h-60 object-contain block"
              />
            </div>

            {/* Required Guidance Text */}
            <p className="text-xs sm:text-sm font-medium text-amber-100 max-w-xs leading-snug mb-4">
              Scan the QR code with your phone to view and download your photo.
            </p>

            {/* Sharing URL Display */}
            <div className="w-full bg-[#08140f]/80 border border-amber-500/20 rounded-xl px-3 py-2 mb-4 flex items-center justify-between gap-2 text-left">
              <span className="text-[11px] font-mono text-emerald-300/90 truncate">
                {uploadResult.sharingUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-1.5 rounded-lg bg-emerald-950 border border-amber-500/30 text-amber-300 hover:border-amber-400 text-xs flex items-center gap-1 transition"
                title="Copy Link to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Mandatory Actions: Download QR Code, Copy Link, Open Photo */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                onClick={handleDownloadQR}
                className="py-2.5 px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-amber-500/30 text-amber-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                title="Download QR Code PNG"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span className="text-[10px]">Save QR</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2.5 px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-amber-500/30 text-amber-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                title="Copy Sharing Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={handleOpenPhoto}
                className="py-2.5 px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-amber-500/30 text-amber-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                title="Open Sharing Page in New Tab"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span className="text-[10px]">Open Photo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
