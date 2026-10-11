# AUF CCS Honor Society — The Legend of HonSoc Photobooth

A production-ready, fantasy-adventure photobooth web application built for the **AUF College of Computer Studies Honor Society** to commemorate **CCS Month 2026**.

Featuring an original fantasy design inspired by *The Legend of Zelda*, the official AUF CCS Honor Society digital gold emblem, and the custom 4-photo royal photobooth frame.

---

## 🌟 Key Features

1. **Official Branding & Exact Assets**
   - **Official Splash Logo**: Exact AUF CCS Honor Society logo (`public/assets/honsoc-logo.png`) with intact proportions, colors, and digital gold motif.
   - **Exact PNG Frame**: Source-of-truth 4-slot layout (`public/assets/photobooth-frame.png`, 682×1024), perfectly composited at high-resolution 2× scaling (1364×2048).
   - **Zelda-Inspired Aesthetics**: Forest emeralds, antique golds, subtle teals, floating rune particles, and synthesized Web Audio chimes (shutter snap, countdown beeps, item-get victory fanfare).

2. **Manual Four-Photo Flow**
   - Participant manually initiates each shot one-by-one (never automatic successive bursts).
   - Visible 3-second animated countdown with audible tick and flash shutter effect.
   - Real-time slot progress (`Photo X of 4`) and live miniature preview strip.
   - Individual slot retake capability without losing the remaining 3 photos.
   - Front/rear camera switching and mirrored selfie preview toggle.

3. **High-Resolution Canvas Composition**
   - Renders captured photos cleanly behind the frame's transparent openings (`x=90, y=212`, `x=353, y=212`, `x=90, y=514`, `x=353, y=514`, each 238×274).
   - Smart center-crop (`object-fit: cover`) preventing distortion or cutoffs.
   - Frame overlays seamlessly with bleed margins to avoid gaps.
   - Instant direct PNG download button (`AUF_CCS_HonSoc_Photobooth_[timestamp].png`).

4. **Functional Phone QR Code & Public Sharing**
   - **Genuine Cloud Storage**: Uploads the finished high-resolution PNG blob directly to **Supabase Storage**.
   - **Scannable QR Code**: Encodes the production public URL (`/photo/:id`) with high contrast and quiet margins.
   - **Dedicated Sharing Page (`/photo/:id`)**: Responsive mobile/desktop page loading the persistent image from storage with a prominent **Download Photo (PNG)** button.
   - Works across separate smartphones, mobile Safari, and Android Chrome without requiring participants to log in.
   - Actions provided: Download QR Code, Copy Link, and Open Photo.

5. **Kiosk Inactivity Protection**
   - 60-second inactivity countdown timer (configurable in settings).
   - Reset on any touch/mouse/keyboard interaction.
   - 15-second modal warning: *"Still exploring the realm?"*
   - Auto-resets session, clears temporary photos, and stops camera streams between participants to ensure privacy.

6. **In-App Admin & Connection Testing**
   - On-screen Settings modal with a 1-click **Test Connection** button to verify Supabase bucket access.
   - Credentials can be configured via `.env` or saved in-app for instant testing.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Google Fonts (*Cinzel* & *Plus Jakarta Sans*)
- **Camera**: Browser MediaDevices API
- **Compositing**: HTML5 2D Canvas API (2× ultra-resolution)
- **Audio**: Web Audio API Synthesizer (zero external audio file dependencies)
- **QR Codes**: `qrcode` library
- **Cloud Storage**: `@supabase/supabase-js`
- **Deployment**: Vercel ready with SPA rewrites (`vercel.json`)

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js v20.19+ or v22.12+ (LTS v22.14 recommended)
- Modern web browser with camera access (Chrome, Edge, Safari, Firefox)

### 2. Install & Run
```bash
# Clone or navigate to the directory
cd "HonSoc Photobooth"

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## ☁️ Supabase Storage Configuration

To enable cross-device phone QR code downloads, connect a Supabase project:

### Step 1: Create a Supabase Bucket
1. Log in to [Supabase](https://supabase.com) and create or open your project.
2. Navigate to **Storage** → **New Bucket**.
3. Name the bucket: `photobooth`.
4. Enable **Public Bucket** toggle so participants can download their photos without authenticating.

### Step 2: Set Storage Security Policies (SQL Editor)
Open your Supabase **SQL Editor** and execute:

```sql
-- Ensure photobooth bucket is created and public
INSERT INTO storage.buckets (id, name, public)
VALUES ('photobooth', 'photobooth', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public anonymous uploads from the photobooth app
CREATE POLICY "Public Photobooth Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photobooth');

-- Allow public anonymous reads from the sharing page & QR code scans
CREATE POLICY "Public Photobooth Reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'photobooth');
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:

```ini
# Your Supabase Project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Your Supabase Anon Key (Project Settings -> API -> Project API Keys -> anon / public)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Bucket name (default: photobooth)
VITE_SUPABASE_BUCKET=photobooth

# Production URL for QR codes (e.g. your Vercel deployment URL)
VITE_PUBLIC_URL=https://your-photobooth-app.vercel.app
```

> **Pro Tip**: You can also enter and test these credentials directly inside the app! Click the ⚙️ **Settings icon** in the top navigation bar and tap **Test Connection**.

---

## 📲 Testing the QR Code & Cross-Device Flow

1. **Take 4 Photos**:
   - Tap **Start Photobooth** on the splash screen.
   - Allow camera access.
   - Press **Capture Shot** for Pose 1, wait for the 3-second countdown.
   - Repeat for Poses 2, 3, and 4.
2. **Review Keepsake**:
   - The final composite image is rendered with the official frame.
   - Tap **Get Phone QR Code**.
3. **Upload & QR Generation**:
   - The app uploads the PNG blob to your persistent Supabase Storage bucket.
   - A genuine QR code is generated pointing to `https://[YOUR_DOMAIN]/photo/[PHOTO_ID]`.
4. **Scan with Phone**:
   - Open the default Camera app on an iPhone or Android phone.
   - Scan the QR code.
   - The mobile browser opens the dedicated sharing page (`/photo/:id`).
   - Tap **Download Photo (PNG)**.
   - The full 4-pose keepsake with the AUF CCS Honor Society frame is saved directly to your phone's gallery!

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Import this repository.
4. Set the Framework Preset to **Vite**.
5. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
   - `VITE_SUPABASE_BUCKET`: `photobooth`
   - `VITE_PUBLIC_URL`: `https://[your-app-name].vercel.app`
6. Click **Deploy**.
7. Once deployed, open your live HTTPS URL. Cameras require HTTPS in production browsers (which Vercel automatically provides with free SSL certificates).

---

## 🏛️ AUF CCS Honor Society Credits
- Designed for **Angeles University Foundation - College of Computer Studies**.
- Celebrated during **#CCSMONTH2026**.
- Original assets provided by the AUF CCS Honor Society Executive Committee.
