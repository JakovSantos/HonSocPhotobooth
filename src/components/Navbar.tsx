import React from 'react';
import { Volume2, VolumeX, Settings, RotateCcw, Sparkles } from 'lucide-react';
import { soundEffects } from '../services/audio';

interface NavbarProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onResetSession: () => void;
  inactivitySeconds: number;
  showReset: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onResetSession,
  inactivitySeconds,
  showReset,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#08140f]/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/honsoc-logo.png"
            alt="AUF CCS Honor Society Logo"
            className="h-9 w-auto object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-title text-sm sm:text-base font-bold text-amber-200 tracking-wider">
                AUF CCS HONOR SOCIETY
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse hidden sm:inline" />
            </div>
            <p className="text-[10px] sm:text-xs text-emerald-400/80 font-medium tracking-wide">
              The Legend of HonSoc • CCS Month 2026
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Inactivity indicator */}
          {showReset && (
            <div
              className={`text-xs px-2.5 py-1 rounded-full font-mono transition-colors ${
                inactivitySeconds <= 15
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse'
                  : 'bg-emerald-950/60 text-emerald-300/80 border border-emerald-500/30'
              }`}
              title="Time until session auto-resets"
            >
              <span className="hidden sm:inline">Reset in: </span>
              {inactivitySeconds}s
            </div>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => {
              onToggleSound();
              soundEffects.playClick();
            }}
            className="p-2 rounded-lg bg-emerald-950/40 border border-amber-500/20 text-amber-200 hover:bg-emerald-900/60 hover:border-amber-400 transition"
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Reset / Restart Session button */}
          {showReset && (
            <button
              onClick={() => {
                soundEffects.playClick();
                if (window.confirm('Start a fresh session? Current captured photos will be cleared.')) {
                  onResetSession();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-amber-500/30 text-xs text-amber-200 hover:bg-emerald-900/60 hover:border-amber-400 transition"
              title="Reset Photobooth Session"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={() => {
              soundEffects.playClick();
              onOpenSettings();
            }}
            className="p-2 rounded-lg bg-emerald-950/40 border border-amber-500/20 text-amber-200 hover:bg-emerald-900/60 hover:border-amber-400 transition"
            title="Configure Cloud Storage & Deployment"
            aria-label="Storage Settings"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
