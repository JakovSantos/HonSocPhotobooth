import React from 'react';
import { RotateCcw, Play, Clock } from 'lucide-react';
import { soundEffects } from '../services/audio';

interface InactivityModalProps {
  remainingSeconds: number;
  onStay: () => void;
  onResetNow: () => void;
}

export const InactivityModal: React.FC<InactivityModalProps> = ({
  remainingSeconds,
  onStay,
  onResetNow,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm fantasy-panel rounded-3xl p-6 border-2 border-amber-500/50 shadow-[0_0_50px_rgba(212,175,55,0.3)] flex flex-col items-center text-center">
        {/* Animated hourglass / clock icon */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center text-amber-300">
            <Clock className="w-8 h-8 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold font-mono">
            {remainingSeconds}
          </div>
        </div>

        <h3 className="font-title text-lg font-bold text-amber-200 mb-1">
          STILL EXPLORING THE REALM?
        </h3>

        <p className="text-xs text-stone-300 mb-5 leading-relaxed">
          Due to inactivity, your photobooth session will automatically reset in{' '}
          <span className="font-bold text-amber-300 font-mono text-sm">{remainingSeconds}s</span> to protect your privacy for the next scholar.
        </p>

        <div className="flex flex-col gap-2.5 w-full">
          {/* Continue button */}
          <button
            onClick={() => {
              soundEffects.playClick();
              onStay();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 font-title font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>CONTINUE MY SESSION</span>
          </button>

          {/* Reset now button */}
          <button
            onClick={() => {
              soundEffects.playClick();
              onResetNow();
            }}
            className="w-full py-2 px-4 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-xs font-medium transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset & Leave Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
