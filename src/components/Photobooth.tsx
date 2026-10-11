import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  FlipHorizontal,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { photoboothConfig as cfg } from "@/config/photoboothConfig";
import {
  captureFrame,
  composePhotos,
  downloadBlob,
  loadFrame,
  startCamera,
  uploadPhoto,
} from "@/services/photobooth";
import type { SharedPhoto } from "@/services/photobooth";
import { soundEffects } from "@/services/audio";

type Screen = "splash" | "camera" | "review" | "results";
type Photos = (string | null)[];
const empty = (): Photos => Array(cfg.photoCount).fill(null);

export function Photobooth() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [photos, setPhotos] = useState<Photos>(empty);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const ensureCamera = useCallback(async (mode: "user" | "environment" = "user") => {
    if (streamRef.current?.active) {
      stopCamera();
    }
    const s = await startCamera(mode);
    streamRef.current = s;
    return s;
  }, [stopCamera]);

  const reset = useCallback(() => {
    stopCamera();
    setPhotos(empty());
    setRetakeIndex(null);
    setError(null);
    setScreen("splash");
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const start = async () => {
    if (starting) return;
    soundEffects.playClick();
    setStarting(true);
    setError(null);
    try {
      await loadFrame().catch(() => {
        throw new Error("The photobooth frame couldn't be loaded. Please ensure the frame asset is reachable.");
      });
      await ensureCamera("user");
      setPhotos(empty());
      setScreen("camera");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const goCamera = async (index: number | null) => {
    soundEffects.playClick();
    setRetakeIndex(index);
    setError(null);
    try {
      await ensureCamera("user");
      setScreen("camera");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onCaptured = (url: string) => {
    const next = [...photos];
    const idx = retakeIndex ?? next.findIndex((p) => !p);
    next[idx] = url;
    setPhotos(next);
    if (retakeIndex !== null || next.every(Boolean)) {
      setRetakeIndex(null);
      stopCamera();
      soundEffects.playFanfare();
      setScreen("review");
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden select-none">
      {/* Background enchanted forest image */}
      <img
        src={cfg.forestBgUrl}
        alt=""
        width={1920}
        height={1280}
        className="fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="fixed inset-0 -z-10 bg-[#08140f]/80 backdrop-blur-xs" />
      <Particles />

      <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        {screen === "splash" && <Splash onStart={start} starting={starting} error={error} />}

        {screen === "camera" && (
          <CameraScreen
            stream={streamRef.current}
            photos={photos}
            retakeIndex={retakeIndex}
            onCaptured={onCaptured}
            onBusy={setBusy}
            onRetryCamera={async () => {
              stopCamera();
              await ensureCamera("user");
            }}
            onBack={() => {
              stopCamera();
              setRetakeIndex(null);
              setScreen(photos.every(Boolean) ? "review" : "splash");
            }}
          />
        )}

        {screen === "review" && (
          <Review
            photos={photos}
            onRetake={goCamera}
            onContinue={() => {
              soundEffects.playClick();
              setScreen("results");
            }}
            onRestart={() => {
              soundEffects.playClick();
              setPhotos(empty());
              goCamera(null);
            }}
            error={error}
          />
        )}

        {screen === "results" && (
          <Results
            photos={photos}
            onBusy={setBusy}
            onRetake={() => {
              soundEffects.playClick();
              setScreen("review");
            }}
            onNew={reset}
          />
        )}
      </main>

      {screen !== "splash" && <IdleManager paused={busy} onTimeout={reset} />}
    </div>
  );
}

/* ---------- Splash Screen ---------- */
function Splash({ onStart, starting, error }: { onStart: () => void; starting: boolean; error: string | null }) {
  return (
    <section className="m-auto flex max-w-xl flex-col items-center text-center animate-reveal">
      {/* Official AUF CCS Honor Society Logo - Direct image without background container */}
      <img
        src={cfg.logoUrl}
        alt="AUF CCS Honor Society official logo"
        className="mb-6 h-36 sm:h-52 w-auto max-w-full object-contain drop-shadow-[0_4px_18px_rgba(212,175,55,0.45)]"
      />

      <p className="font-title text-xs sm:text-sm uppercase tracking-[0.4em] text-amber-300 font-semibold">
        AUF College of Computer Studies
      </p>

      <h1 className="mt-3 font-title text-3xl sm:text-5xl font-black text-ivory text-glow">
        AUF CCS HonSoc Photobooth
      </h1>

      <p className="mt-3 font-title text-sm sm:text-lg italic text-amber-200/80">
        CCS Month 2026 Commemorative Royal Photobooth
      </p>

      <p className="mt-4 text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
        Step into the sacred grove. Capture 4 honorable poses, seal them within the royal frame, 
        and scan your phone QR code to take your memory home.
      </p>

      <button className="btn-rune mt-8 min-h-14 px-10 text-base sm:text-lg" onClick={onStart} disabled={starting}>
        {starting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Awakening camera…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Start Photobooth
          </>
        )}
      </button>

      {error && <ErrorBox message={error} onRetry={onStart} />}
    </section>
  );
}

/* ---------- Camera Screen ---------- */
function CameraScreen({
  stream,
  photos,
  retakeIndex,
  onCaptured,
  onBusy,
  onRetryCamera,
  onBack,
}: {
  stream: MediaStream | null;
  photos: Photos;
  retakeIndex: number | null;
  onCaptured: (url: string) => void;
  onBusy: (b: boolean) => void;
  onRetryCamera: () => Promise<void>;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);

  const filledCount = photos.filter(Boolean).length;
  const currentSlotIndex = retakeIndex ?? photos.findIndex((p) => !p);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) {
      setErr("Camera isn't running.");
      return;
    }
    setErr(null);
    setReady(false);
    v.srcObject = stream;
    v.onloadedmetadata = () => {
      v.play()
        .then(() => setReady(true))
        .catch(() => setErr("Camera playback was blocked by browser."));
    };
  }, [stream]);

  const snap = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      soundEffects.playShutter();
      setFlash((f) => f + 1);
      const url = captureFrame(v, isMirrored);
      onCaptured(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [isMirrored, onCaptured]);

  const startCountdown = () => {
    if (!ready || count !== null) return;
    soundEffects.playClick();
    onBusy(true);
    setCount(cfg.countdownSeconds);
    soundEffects.playCountdown(cfg.countdownSeconds);

    let c = cfg.countdownSeconds;
    const interval = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearInterval(interval);
        setCount(null);
        onBusy(false);
        snap();
      } else {
        setCount(c);
        soundEffects.playCountdown(c);
      }
    }, 1000);
  };

  return (
    <section className="flex flex-1 flex-col items-center justify-between gap-4 pb-6">
      <header className="flex w-full items-center justify-between gap-2 max-w-3xl">
        <button className="btn-quiet text-xs sm:text-sm" onClick={onBack}>
          <RotateCcw className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-amber-400/30 text-amber-200 font-title text-xs sm:text-sm tracking-wider">
            {retakeIndex !== null ? (
              <span>RETAKING PHOTO {retakeIndex + 1} OF 4</span>
            ) : (
              <span>PHOTO {Math.min(filledCount + 1, 4)} OF 4</span>
            )}
          </div>
        </div>

        <button
          className="btn-quiet text-xs"
          onClick={() => {
            soundEffects.playClick();
            setIsMirrored((m) => !m);
          }}
          title="Toggle mirrored selfie preview"
        >
          <FlipHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{isMirrored ? "Mirrored" : "Normal"}</span>
        </button>
      </header>

      {/* Camera Viewport */}
      <div className="relative w-full max-w-2xl aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-black shadow-2xl flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-transform ${isMirrored ? "scale-x-[-1]" : ""}`}
        />

        {/* Shutter Flash */}
        {flash > 0 && keyRender(flash)}

        {/* Countdown Overlay */}
        {count !== null && (
          <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-xs">
            <span key={count} className="font-title text-7xl sm:text-8xl font-black text-ivory text-glow animate-count">
              {count}
            </span>
          </div>
        )}

        {/* Viewport Framing Marks */}
        <div className="pointer-events-none absolute inset-3 border border-amber-400/20 rounded-xl flex flex-col justify-between p-2">
          <div className="flex justify-between">
            <div className="w-4 h-4 border-t-2 border-l-2 border-amber-400/60" />
            <div className="w-4 h-4 border-t-2 border-r-2 border-amber-400/60" />
          </div>
          <div className="flex justify-between">
            <div className="w-4 h-4 border-b-2 border-l-2 border-amber-400/60" />
            <div className="w-4 h-4 border-b-2 border-r-2 border-amber-400/60" />
          </div>
        </div>

        {/* Camera Loading State */}
        {!ready && !err && (
          <div className="absolute inset-0 grid place-items-center bg-black/85 text-amber-200">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <p className="font-title text-sm">Awakening camera lens…</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {err && (
          <div className="absolute inset-0 grid place-items-center bg-black/90 p-4 text-center">
            <ErrorBox message={err} onRetry={onRetryCamera} retryLabel="Retry Camera" />
          </div>
        )}
      </div>

      {/* 4 Slots Preview Strip */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-lg overflow-hidden border-2 transition-all ${
              i === currentSlotIndex
                ? "border-amber-400 ring-2 ring-amber-400/40 scale-105"
                : photos[i]
                ? "border-emerald-500/80"
                : "border-stone-700 bg-black/40"
            }`}
          >
            {photos[i] ? (
              <img src={photos[i]!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-stone-500 font-mono">
                {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Trigger Button */}
      <button
        className="btn-rune min-h-14 px-10 text-lg shadow-xl"
        onClick={startCountdown}
        disabled={!ready || count !== null}
      >
        <Camera className="h-5 w-5" />
        <span>{count !== null ? `Pose! (${count})` : "Capture Shot"}</span>
      </button>
    </section>
  );
}

function keyRender(key: number) {
  return <div key={key} className="pointer-events-none absolute inset-0 bg-white animate-flash" />;
}

/* ---------- Review Screen ---------- */
function Review({
  photos,
  onRetake,
  onContinue,
  onRestart,
  error,
}: {
  photos: Photos;
  onRetake: (index: number) => void;
  onContinue: () => void;
  onRestart: () => void;
  error: string | null;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <section className="m-auto flex w-full max-w-3xl flex-col items-center gap-6 animate-reveal">
      <div className="text-center">
        <h2 className="font-title text-2xl sm:text-4xl text-ivory text-glow font-bold">
          Review Your 4 Poses
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-stone-300">
          Retake any pose individually before sealing the final keepsake
        </p>
      </div>

      <div className="grid w-full grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {photos.map((p, i) => (
          <figure key={i} className="panel-ornate p-2.5 flex flex-col">
            <div className="aspect-[238/274] w-full overflow-hidden rounded-lg bg-black">
              {p && <img src={p} alt={`Memory ${i + 1}`} className="h-full w-full object-cover" />}
            </div>
            <figcaption className="mt-2.5 flex items-center justify-between gap-1">
              <span className="font-title text-xs font-semibold text-amber-200">Pose {i + 1}</span>
              <button
                className="btn-quiet text-[11px] py-1 px-2.5 min-h-8"
                onClick={() => onRetake(i)}
              >
                <RefreshCw className="h-3 w-3" /> Retake
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      <div className="flex flex-wrap justify-center gap-4 pt-2 pb-6">
        <button className="btn-quiet" onClick={() => setConfirm(true)}>
          <RotateCcw className="h-4 w-4" /> Retake All
        </button>
        <button className="btn-rune px-8 text-base" onClick={onContinue}>
          <Sparkles className="h-5 w-5" /> Seal & Finalize Photo
        </button>
      </div>

      {confirm && (
        <Dialog
          title="Start over?"
          body="All four photos will be cleared and reset."
          confirmLabel="Yes, Retake All"
          onConfirm={() => {
            setConfirm(false);
            onRestart();
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </section>
  );
}

/* ---------- Results Screen ---------- */
function Results({
  photos,
  onBusy,
  onRetake,
  onNew,
}: {
  photos: Photos;
  onBusy: (b: boolean) => void;
  onRetake: () => void;
  onNew: () => void;
}) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [composeErr, setComposeErr] = useState<string | null>(null);
  const [shared, setShared] = useState<SharedPhoto | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const uploadLock = useRef(false);

  const compose = useCallback(async () => {
    setComposeErr(null);
    onBusy(true);
    try {
      const b = await composePhotos(photos as string[], 2);
      setBlob(b);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
      return b;
    } catch (err) {
      console.error("Composition error:", err);
      setComposeErr("We couldn't assemble your photo with the frame.");
      return null;
    } finally {
      onBusy(false);
    }
  }, [photos, onBusy]);

  const upload = useCallback(async (b: Blob) => {
    if (uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadErr(null);
    onBusy(true);
    try {
      // 1. Upload to Supabase Storage and obtain authoritative shareUrl
      const sharedResult = await uploadPhoto(b);
      setShared(sharedResult);

      // 2. Generate genuine QR code encoding the exact same shareUrl
      const code = await QRCode.toDataURL(sharedResult.shareUrl, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#08140f",
          light: "#faf6ea",
        },
      });

      setQr(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", err);
      setUploadErr(msg || "QR sharing is temporarily unavailable. You can still download your photo below.");
    } finally {
      uploadLock.current = false;
      setUploading(false);
      onBusy(false);
    }
  }, [onBusy]);

  useEffect(() => {
    let cancelled = false;
    compose().then((b) => {
      if (b && !cancelled) upload(b);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // Download QR Code image
  const handleDownloadQR = () => {
    if (!qr || !shared) return;
    soundEffects.playClick();
    const a = document.createElement("a");
    a.href = qr;
    a.download = `auf-ccs-honor-society-qr-${shared.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Copy Link action
  const handleCopyLink = async () => {
    if (!shared?.shareUrl) return;
    soundEffects.playClick();
    try {
      await navigator.clipboard.writeText(shared.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this public photo link:", shared.shareUrl);
    }
  };

  // Open Photo action
  const handleOpenPhoto = () => {
    if (!shared?.shareUrl) return;
    soundEffects.playClick();
    window.open(shared.shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="flex flex-1 flex-col items-center gap-6 pb-8 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
      {/* Left: Frame Preview */}
      <div className="w-full max-w-md">
        <h2 className="mb-4 text-center font-title text-2xl sm:text-3xl text-ivory text-glow font-bold">
          Your Keepsake Is Sealed!
        </h2>
        <div className="panel-ornate p-3 shadow-2xl">
          {preview ? (
            <img src={preview} alt="Your finished photobooth picture" className="w-full rounded-lg animate-reveal shadow-lg" />
          ) : composeErr ? (
            <ErrorBox message={composeErr} onRetry={() => compose().then((b) => b && upload(b))} />
          ) : (
            <div className="grid aspect-[682/1024] place-items-center text-amber-200">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                <p className="font-title text-sm">Composing sacred seal…</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions & QR Sharing Box */}
      <div className="flex w-full max-w-sm flex-col gap-4 lg:pt-14">
        {/* Direct Download Button */}
        <button
          className="btn-rune w-full shadow-lg"
          disabled={!blob}
          onClick={() => {
            soundEffects.playClick();
            if (blob) downloadBlob(blob);
          }}
        >
          <Download className="h-5 w-5" /> Download Photo (PNG)
        </button>

        {/* QR Code Sharing Box */}
        <div className="panel-ornate flex flex-col items-center p-5 text-center shadow-2xl">
          <p className="font-title text-sm sm:text-base text-amber-200 font-semibold">
            Scan to view & download on your phone
          </p>

          <div className="mt-4 grid h-60 w-60 place-items-center rounded-xl bg-[#faf6ea] p-2.5 shadow-inner border-2 border-amber-400/40">
            {qr ? (
              <img src={qr} alt="QR code linking to your photo" className="h-full w-full object-contain block" />
            ) : uploading || (!uploadErr && !composeErr) ? (
              <div className="flex flex-col items-center gap-2 text-stone-800">
                <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
                <span className="text-xs font-semibold">Generating QR…</span>
              </div>
            ) : (
              <span className="text-xs text-rose-700 font-medium">QR Unavailable</span>
            )}
          </div>

          {uploadErr && (
            <div className="w-full mt-3">
              <ErrorBox message={uploadErr} onRetry={blob ? () => upload(blob) : undefined} />
            </div>
          )}

          {/* Action buttons (Copy Link, Download QR Code, Open Photo) */}
          {shared?.shareUrl && (
            <div className="mt-4 w-full flex flex-col gap-2">
              <button className="btn-quiet w-full text-xs font-semibold" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" /> Copied Link!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Link
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-quiet text-xs font-semibold"
                  onClick={handleDownloadQR}
                  title="Download the QR code image as PNG"
                >
                  <Download className="h-3.5 w-3.5" /> Save QR Code
                </button>

                <button
                  className="btn-quiet text-xs font-semibold"
                  onClick={handleOpenPhoto}
                  title="Open the public sharing page in a new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Photo
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] text-stone-400">
            Public link is permanently accessible to anyone who scans or opens it.
          </p>
        </div>

        {/* Retake & New Session */}
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-quiet" onClick={onRetake}>
            <RefreshCw className="h-4 w-4" /> Retake
          </button>
          <button className="btn-quiet" onClick={onNew}>
            <Sparkles className="h-4 w-4" /> New Session
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Inactivity Idle Manager ---------- */
function IdleManager({ paused, onTimeout }: { paused: boolean; onTimeout: () => void }) {
  const [left, setLeft] = useState<number>(cfg.idleTimeoutSeconds);

  useEffect(() => {
    const bump = () => setLeft(cfg.idleTimeoutSeconds);
    const evs = ["pointerdown", "keydown", "touchstart", "mousemove"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  useEffect(() => {
    if (paused) {
      setLeft(cfg.idleTimeoutSeconds);
      return;
    }
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    if (left <= 0) onTimeout();
  }, [left, onTimeout]);

  if (left > cfg.idleWarningSeconds) return null;

  return (
    <Dialog
      title="Still there, adventurer?"
      body={`This photobooth session will reset in ${Math.max(left, 0)} seconds to protect your privacy.`}
      confirmLabel="Continue Session"
      onConfirm={() => {
        soundEffects.playClick();
        setLeft(cfg.idleTimeoutSeconds);
      }}
    />
  );
}

function Dialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="panel-ornate w-full max-w-sm p-6 text-center animate-reveal shadow-2xl">
        <h3 className="font-title text-xl text-ivory font-bold">{title}</h3>
        <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed">{body}</p>
        <div className="mt-6 flex justify-center gap-3">
          {onCancel && (
            <button className="btn-quiet text-xs" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn-rune px-6 text-sm" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: (() => void) | undefined;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs sm:text-sm text-rose-200 text-center"
    >
      <p>{message}</p>
      {onRetry && (
        <button className="btn-quiet mt-2 min-h-8 text-xs" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> {retryLabel}
        </button>
      )}
    </div>
  );
}

function Particles() {
  const dots = [8, 22, 37, 51, 66, 79, 91];
  return (
    <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden>
      {dots.map((x, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-drift"
          style={{
            left: `${x}%`,
            top: `${20 + ((i * 37) % 65)}%`,
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}
export default Photobooth;
