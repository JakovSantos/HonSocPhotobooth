import { useEffect, useState } from "react";
import { Download, Loader2, ArrowLeft, Share2, Check } from "lucide-react";
import { photoboothConfig as cfg } from "@/config/photoboothConfig";
import { downloadBlob, downloadFilename, fetchPhotoBlob } from "@/services/photobooth";
import { soundEffects } from "@/services/audio";

interface SharedPhotoProps {
  id: string;
  onGoBack: () => void;
}

export function SharedPhoto({ id, onGoBack }: SharedPhotoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setErr(null);
      try {
        const photoBlob = await fetchPhotoBlob(id);
        if (isCancelled) return;
        setBlob(photoBlob);
        const objUrl = URL.createObjectURL(photoBlob);
        setUrl(objUrl);
      } catch (e: unknown) {
        if (isCancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Failed to load shared photo:", e);
        setErr(msg || "This photo link is invalid or could not be loaded from storage.");
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  // Robust cross-origin PNG blob download
  const handleDownload = () => {
    if (!blob) return;
    soundEffects.playClick();
    setDownloading(true);
    try {
      downloadBlob(blob, downloadFilename(`auf-ccs-${id.slice(0, 8)}`));
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleShare = async () => {
    soundEffects.playClick();
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AUF CCS Honor Society Photobooth",
          text: "Check out my official The Legend of HonSoc Photobooth keepsake!",
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy photo link:", shareUrl);
    }
  };

  return (
    <div className="relative min-h-dvh flex flex-col items-center select-none">
      {/* Background enchanted forest */}
      <img
        src={cfg.forestBgUrl}
        alt=""
        width={1920}
        height={1280}
        className="fixed inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="fixed inset-0 -z-10 bg-[#08140f]/85 backdrop-blur-xs" />

      {/* Top Header */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between p-4 z-10">
        <button
          onClick={() => {
            soundEffects.playClick();
            onGoBack();
          }}
          className="btn-quiet text-xs sm:text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Launch Photobooth</span>
        </button>

        <div className="flex items-center gap-2">
          <img
            src={cfg.logoUrl}
            alt="AUF CCS Honor Society"
            className="h-8 w-auto object-contain"
          />
          <span className="font-title text-xs sm:text-sm font-bold text-amber-200 hidden sm:inline">
            AUF CCS HONOR SOCIETY
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-4 z-10">
        <div className="text-center">
          <h1 className="font-title text-2xl sm:text-3xl text-ivory text-glow font-bold">
            Your Royal Keepsake
          </h1>
          <p className="mt-1 text-xs text-amber-200/80">
            AUF CCS Month 2026 • The Legend of HonSoc
          </p>
        </div>

        {/* Ornate Photo Frame Container */}
        <div className="panel-ornate w-full p-3 shadow-2xl">
          {url ? (
            <img
              src={url}
              alt="Your official AUF CCS Honor Society photobooth keepsake"
              className="w-full rounded-lg animate-reveal shadow-lg block"
            />
          ) : err ? (
            <div role="alert" className="p-8 text-center text-rose-300">
              <p className="font-bold text-sm mb-2">Photo Unavailable</p>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">{err}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-quiet text-xs"
              >
                Reload Page
              </button>
            </div>
          ) : (
            <div className="grid aspect-[682/1024] place-items-center text-amber-300">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
                <p className="font-title text-sm">Retrieving photo from sacred vault…</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {url && (
          <div className="w-full flex flex-col gap-3">
            <button
              className="btn-rune w-full text-base sm:text-lg shadow-xl"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Preparing PNG…
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" /> Download Photo (PNG)
                </>
              )}
            </button>

            <button
              className="btn-quiet w-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
              onClick={handleShare}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Link Copied to Clipboard!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-amber-400" /> Share Photo Link
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-stone-400 leading-relaxed">
              On iPhone & Android, you can also press and hold the photo to save it directly to your Photos.
            </p>
          </div>
        )}

        <button
          onClick={() => {
            soundEffects.playClick();
            onGoBack();
          }}
          className="mt-2 text-xs font-title text-amber-300/80 hover:text-amber-200 underline transition"
        >
          Take New Photos at AUF CCS Honor Society Photobooth
        </button>
      </main>
    </div>
  );
}
export default SharedPhoto;
