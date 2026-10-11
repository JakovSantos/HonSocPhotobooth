import React, { useState } from 'react';
import {
  X,
  Save,
  CheckCircle,
  AlertCircle,
  Database,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { SupabaseService } from '../services/supabase';
import { soundEffects } from '../services/audio';
import type { SupabaseConfig } from '../types/photobooth';

interface SettingsModalProps {
  onClose: () => void;
  inactivityTimeout: number;
  onUpdateInactivityTimeout: (secs: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  inactivityTimeout,
  onUpdateInactivityTimeout,
}) => {
  const currentConfig = SupabaseService.getConfig();

  const [url, setUrl] = useState<string>(currentConfig.url);
  const [anonKey, setAnonKey] = useState<string>(currentConfig.anonKey);
  const [bucket, setBucket] = useState<string>(currentConfig.bucket || 'photobooth');
  const [publicUrl, setPublicUrl] = useState<string>(
    currentConfig.publicUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  );
  const [timeoutSecs, setTimeoutSecs] = useState<number>(inactivityTimeout);

  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Test Supabase connection
  const handleTestConnection = async () => {
    soundEffects.playClick();
    setTestStatus({ loading: true });

    // Temporarily apply current inputs
    SupabaseService.saveConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      bucket: bucket.trim(),
      publicUrl: publicUrl.trim(),
    });

    const res = await SupabaseService.testConnection();
    setTestStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  // Save settings
  const handleSave = () => {
    soundEffects.playClick();
    const newConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      bucket: bucket.trim() || 'photobooth',
      publicUrl: publicUrl.trim() || window.location.origin,
    };

    SupabaseService.saveConfig(newConfig);
    onUpdateInactivityTimeout(timeoutSecs);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const sqlPolicy = `-- Run this in your Supabase SQL Editor if your bucket needs public permissions:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photobooth', 'photobooth', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'photobooth');

CREATE POLICY "Public Reads" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'photobooth');`;

  const copySql = async () => {
    soundEffects.playClick();
    await navigator.clipboard.writeText(sqlPolicy);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl fantasy-panel rounded-3xl p-6 border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.95)] my-8">
        {/* Close Button */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-emerald-950/60 text-stone-400 hover:text-amber-200 border border-amber-500/20 hover:border-amber-400 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="font-title text-xl font-bold text-amber-200">
            PHOTOBOOTH CONFIGURATION
          </h2>
        </div>
        <p className="text-xs text-stone-300 mb-6">
          Configure Supabase persistent storage for live phone QR code scans & downloads
        </p>

        {/* Form Inputs */}
        <div className="flex flex-col gap-4 text-left">
          {/* Supabase URL */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition font-mono"
            />
          </div>

          {/* Anon Key */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
              Supabase Anon Public Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition font-mono"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Safe to use in frontend. Never use your service_role secret key here.
            </p>
          </div>

          {/* Bucket Name & Public Sharing Origin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                Storage Bucket Name
              </label>
              <input
                type="text"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="photobooth"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                Public Sharing Base URL
              </label>
              <input
                type="text"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://auf-ccs-photobooth.vercel.app"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Inactivity Timeout */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
              Inactivity Timeout (Seconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={30}
                max={300}
                value={timeoutSecs}
                onChange={(e) => setTimeoutSecs(Math.max(20, parseInt(e.target.value) || 60))}
                className="w-28 px-3.5 py-2 rounded-xl bg-black/50 border border-amber-500/30 text-amber-100 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-stone-400">
                Default: 60s. Auto-resets kiosk session between participants.
              </span>
            </div>
          </div>

          {/* Connection Test Result */}
          {testStatus.message && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testStatus.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words leading-relaxed">
                {testStatus.message}
              </div>
            </div>
          )}

          {/* Setup / SQL Helper accordion */}
          <div className="mt-1 p-3 rounded-xl bg-black/40 border border-amber-500/15 text-stone-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Supabase Storage Policy Instructions</span>
              </span>
              <button
                onClick={copySql}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-amber-500/30 text-amber-200 hover:border-amber-400 flex items-center gap-1 transition"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="text-[10px] font-mono text-stone-400 bg-black/60 p-2 rounded-lg overflow-x-auto max-h-24">
              {sqlPolicy}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleTestConnection}
              disabled={testStatus.loading || !url || !anonKey}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-amber-500/40 text-amber-200 font-title font-semibold text-xs tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {testStatus.loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 text-amber-400" />
              )}
              <span>TEST CONNECTION</span>
            </button>

            <button
              onClick={handleSave}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 font-title font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition"
            >
              {savedSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savedSuccess ? 'SAVED!' : 'SAVE SETTINGS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
