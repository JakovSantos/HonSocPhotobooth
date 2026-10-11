/**
 * Photobooth Configuration for AUF CCS Honor Society
 * Event: The Legend of HonSoc • CCS Month 2026
 *
 * Exact source-of-truth frame geometry (682x1024) with 4 transparent slot openings:
 * - Slot 0 (Top-Left): x=90, y=212, w=238, h=274
 * - Slot 1 (Top-Right): x=353, y=212, w=238, h=274
 * - Slot 2 (Bottom-Left): x=90, y=514, w=238, h=274
 * - Slot 3 (Bottom-Right): x=353, y=514, w=238, h=274
 */
export const photoboothConfig = {
  eventTitle: "AUF CCS Honor Society",
  subtitle: "The Legend of HonSoc • CCS Month 2026",
  frameUrl: "/assets/photobooth-frame.png",
  logoUrl: "/assets/honsoc-logo.png",
  forestBgUrl: "/assets/forest-bg.jpg",
  frameWidth: 682,
  frameHeight: 1024,
  slots: [
    { x: 90, y: 212, width: 238, height: 274 },
    { x: 353, y: 212, width: 238, height: 274 },
    { x: 90, y: 514, width: 238, height: 274 },
    { x: 353, y: 514, width: 238, height: 274 },
  ],
  photoCount: 4,
  countdownSeconds: 3,
  idleTimeoutSeconds: 60,
  idleWarningSeconds: 10,
  storageBucket: "photobooth",
  /** Objects live under this prefix; the public endpoint maps an id to one object. */
  storagePathPrefix: "sessions",
} as const;
