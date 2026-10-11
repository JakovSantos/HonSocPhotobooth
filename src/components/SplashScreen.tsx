import React from 'react';
import { Camera, Sparkles, Shield, Compass, ChevronRight } from 'lucide-react';
import { soundEffects } from '../services/audio';

interface SplashScreenProps {
  onStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div className="relative min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background magical fantasy ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle radial emerald gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-900/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-teal-800/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Decorative corner runes */}
        <div className="absolute top-8 left-8 text-amber-500/20 font-serif text-3xl select-none hidden md:block">
          ᛗ ᛉ ᚱ
        </div>
        <div className="absolute top-8 right-8 text-amber-500/20 font-serif text-3xl select-none hidden md:block">
          ᚠ ᚢ ᚦ
        </div>
        <div className="absolute bottom-8 left-8 text-amber-500/20 font-serif text-3xl select-none hidden md:block">
          ᚨ ᚱ ᚲ
        </div>
        <div className="absolute bottom-8 right-8 text-amber-500/20 font-serif text-3xl select-none hidden md:block">
          ᚷ ᚹ ᚺ
        </div>
      </div>

      {/* Main Fantasy Card */}
      <div className="relative z-10 max-w-2xl w-full text-center fantasy-panel rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {/* Top Emblem Ribbon */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>AUF College of Computer Studies</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        {/* Official AUF CCS Honor Society Logo - Strictly preserved */}
        <div className="flex justify-center mb-6">
          <div className="relative p-3 rounded-2xl bg-[#091510]/80 border border-amber-500/20 shadow-[0_0_35px_rgba(212,175,55,0.2)]">
            <img
              src="/assets/honsoc-logo.png"
              alt="AUF CCS Honor Society Official Logo"
              className="w-48 sm:w-64 h-auto max-h-52 object-contain transition-transform duration-500 hover:scale-[1.02]"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(212, 175, 55, 0.35))',
              }}
            />
          </div>
        </div>

        {/* Legend of HonSoc Title */}
        <h1 className="font-title text-2xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#fef08a] via-[#eab308] to-[#b45309] tracking-wider mb-2 drop-shadow-[0_2px_10px_rgba(234,179,8,0.3)]">
          THE LEGEND OF HONSOC
        </h1>

        <p className="text-sm sm:text-base text-amber-200/90 font-medium tracking-wide mb-6">
          CCS Month 2026 Commemorative Royal Photobooth
        </p>

        {/* Short Welcome Message */}
        <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed mb-8">
          Welcome, Honored Scholar! Embark on a legendary capture journey across four poses. 
          Your finished quest will be framed within the ancient sacred seal and made instantly available 
          via your smartphone.
        </p>

        {/* Key Features Icons */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8 text-stone-300">
          <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-950/40 border border-amber-500/15">
            <Camera className="w-5 h-5 text-amber-400 mb-1.5" />
            <span className="text-xs font-semibold text-amber-100">4 Shots</span>
            <span className="text-[10px] text-stone-400">Manual flow</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-950/40 border border-amber-500/15">
            <Shield className="w-5 h-5 text-emerald-400 mb-1.5" />
            <span className="text-xs font-semibold text-amber-100">Sacred Frame</span>
            <span className="text-[10px] text-stone-400">Official artwork</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-950/40 border border-amber-500/15">
            <Compass className="w-5 h-5 text-teal-400 mb-1.5" />
            <span className="text-xs font-semibold text-amber-100">Phone QR</span>
            <span className="text-[10px] text-stone-400">Scan & download</span>
          </div>
        </div>

        {/* Prominent Start Button */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onStart();
          }}
          className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-stone-950 font-title font-extrabold text-base sm:text-lg tracking-wider shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_45px_rgba(234,179,8,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          <Camera className="w-5 h-5 text-stone-950 transition-transform group-hover:rotate-12" />
          <span>START PHOTOBOOTH</span>
          <ChevronRight className="w-5 h-5 text-stone-950 transition-transform group-hover:translate-x-1" />
        </button>

        {/* Footer Note */}
        <p className="mt-6 text-[11px] text-stone-400/80">
          Camera permission will be requested • Free public keepsake for AUF CCS students
        </p>
      </div>
    </div>
  );
};
