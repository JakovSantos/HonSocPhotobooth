import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { SplashScreen } from './components/SplashScreen';
import { CaptureScreen } from './components/CaptureScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { QRModal } from './components/QRModal';
import { SharingPage } from './components/SharingPage';
import { InactivityModal } from './components/InactivityModal';
import { SettingsModal } from './components/SettingsModal';
import type { PhotoboothStep, CapturedPhoto } from './types/photobooth';
import { soundEffects } from './services/audio';

export const App: React.FC = () => {
  // Routing detection: /photo/:id
  const [currentRoute, setCurrentRoute] = useState<string>(() => window.location.pathname);

  // Photobooth state
  const [step, setStep] = useState<PhotoboothStep>('splash');
  const [photos, setPhotos] = useState<Record<number, CapturedPhoto>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [qrModalData, setQrModalData] = useState<{ blob: Blob; dataUrl: string } | null>(null);

  // Inactivity timeout (default 60 seconds)
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(60);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Listen to popstate for back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reset activity timestamp
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setRemainingTime(inactivityTimeout);
    setShowInactivityWarning(false);
  }, [inactivityTimeout]);

  // Global activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const onEvent = () => handleUserActivity();

    events.forEach((ev) => window.addEventListener(ev, onEvent, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onEvent));
    };
  }, [handleUserActivity]);

  // Session Reset function
  const handleResetSession = useCallback(() => {
    setPhotos({});
    setStep('splash');
    setQrModalData(null);
    setShowInactivityWarning(false);
    lastActivityRef.current = Date.now();
  }, []);

  // Inactivity countdown ticker
  useEffect(() => {
    // Only tick when in active session (not on splash screen and not on public sharing page)
    if (step === 'splash' || currentRoute.startsWith('/photo/')) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, inactivityTimeout - elapsed);
      setRemainingTime(remaining);

      // Show warning at <= 15s remaining
      if (remaining <= 15 && remaining > 0) {
        setShowInactivityWarning(true);
      } else if (remaining === 0) {
        // Timeout expired: reset session
        handleResetSession();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, currentRoute, inactivityTimeout, handleResetSession]);

  // Handle Photo capture update
  const handlePhotoCaptured = (slotIndex: number, photo: CapturedPhoto) => {
    setPhotos((prev) => {
      const updated = { ...prev, [slotIndex]: photo };
      // Check if all 4 are filled
      const isComplete = [0, 1, 2, 3].every((idx) => Boolean(updated[idx]));
      if (isComplete) {
        // Automatically transition to review after a brief beat
        setTimeout(() => {
          soundEffects.playFanfare();
          setStep('review');
        }, 600);
      }
      return updated;
    });
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
  };

  // Retake individual slot from review
  const handleRetakeSlot = (slotIndex: number) => {
    setStep('capturing');
    // Keep other photos intact
    setPhotos((prev) => {
      const clone = { ...prev };
      delete clone[slotIndex];
      return clone;
    });
  };

  // Retake all photos
  const handleRetakeAll = () => {
    setPhotos({});
    setStep('capturing');
  };

  // Check if current route is a public sharing URL: /photo/:id
  if (currentRoute.startsWith('/photo/')) {
    const photoId = currentRoute.replace('/photo/', '').replace(/\/$/, '');
    return (
      <SharingPage
        photoId={photoId}
        onGoToPhotobooth={() => {
          window.history.pushState({}, '', '/');
          setCurrentRoute('/');
          handleResetSession();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08140f] text-[#f7f3e8] flex flex-col font-sans selection:bg-amber-500/30">
      {/* Top Navigation */}
      <Navbar
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setShowSettings(true)}
        onResetSession={handleResetSession}
        inactivitySeconds={remainingTime}
        showReset={step !== 'splash'}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-center">
        {step === 'splash' && (
          <SplashScreen
            onStart={() => {
              handleUserActivity();
              setStep('capturing');
            }}
          />
        )}

        {step === 'capturing' && (
          <CaptureScreen
            photos={photos}
            onPhotoCaptured={handlePhotoCaptured}
            onCompleteCapture={() => setStep('review')}
            onResetAll={handleRetakeAll}
            onUserActivity={handleUserActivity}
          />
        )}

        {step === 'review' && (
          <ReviewScreen
            photos={photos}
            onRetakeSlot={handleRetakeSlot}
            onRetakeAll={handleRetakeAll}
            onStartNewSession={handleResetSession}
            onOpenQRModal={(blob, dataUrl) => setQrModalData({ blob, dataUrl })}
            onUserActivity={handleUserActivity}
          />
        )}
      </main>

      {/* QR Code Modal */}
      {qrModalData && (
        <QRModal
          composedBlob={qrModalData.blob}
          composedDataUrl={qrModalData.dataUrl}
          onClose={() => setQrModalData(null)}
          onOpenSettings={() => {
            setQrModalData(null);
            setShowSettings(true);
          }}
          onUserActivity={handleUserActivity}
        />
      )}

      {/* Inactivity Warning Dialog */}
      {showInactivityWarning && (
        <InactivityModal
          remainingSeconds={remainingTime}
          onStay={handleUserActivity}
          onResetNow={handleResetSession}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          inactivityTimeout={inactivityTimeout}
          onUpdateInactivityTimeout={(secs) => {
            setInactivityTimeout(secs);
            setRemainingTime(secs);
          }}
        />
      )}
    </div>
  );
};
export default App;
