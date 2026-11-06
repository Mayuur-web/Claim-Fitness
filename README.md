# Claimr ⚡️

A mobile-first web app where players claim real-world territory by walking or running. Strava's activity tracking meets a turf-war game.

## Tech Stack
- **Framework**: Next.js 14 (App Router, JavaScript)
- **Styling**: Tailwind CSS + Custom Dark Glass HUD design system
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Map**: React-Leaflet v4 + OpenStreetMap tiles with custom Dark HUD filter (100% free, no API key or sign-up needed)
- **Typography**: Sora (UI & stats) + JetBrains Mono (coordinates)
- **Audio & Haptics**: Native Web Audio API synth (zero external audio files) + Vibration API
- **Persistence**: Ref-backed synchronized state + localStorage persistence for turf and activity history
- **Screen**: Screen Wake Lock API keeping display awake mid-run
- **Export**: Standard GPX generator (importable into Strava & Garmin)

---

## Getting Started Locally

### 1. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Verify Build
```bash
npm run build
npm run start
```

---

## Testing on Desktop (Simulation Mode)

1. Open [http://localhost:3000](http://localhost:3000) on your desktop.
2. Tap the **Bug icon** in the top-right corner to open the Debug & Simulator menu.
3. Toggle **"Simulate walk"** ON. Claimr will simulate a realistic wandering walk (~12 m every 600 ms).
4. Tap **"Start run"** on the bottom sheet. Audio and haptic feedback trigger automatically (toggle with the speaker icon in the top HUD).
5. Watch your cyan route illuminate on the map as cells are claimed in lime (`#B6FF3B`) with a 60-second shield (`#FFB020` dashed border).
6. Walk near rival territories (pink cells) to steal them and watch toasts ("Stolen from Nova") and the leaderboard update in real time.
7. Tap **"Pause"** and then **"Resume"** to verify no sudden distance jumps occur.
8. Tap **"Finish"** to view the full Run Summary with sector preview, stats, and a **"Export GPX"** download button.
9. Tap **"Save to History"** to persist your run and turf across page refreshes.
10. Tap the **History icon** in the top HUD to review past activities, career milestones (total km, sectors held, longest run), or download any previous GPX track.

---

## Testing on a Phone over HTTPS (Required for Real GPS)

Mobile browsers (iOS Safari, Android Chrome) **require a secure HTTPS origin** to grant `navigator.geolocation` permissions when accessed over a network.

### Option A: Next.js Built-in HTTPS (Recommended)
Next.js supports generating local self-signed certificates out of the box:

```bash
npm run dev:https
```
1. Look at the terminal output for the Network URL (e.g., `https://192.168.1.XX:3000`).
2. Make sure your phone is connected to the same Wi-Fi network as your computer.
3. Open `https://192.168.1.XX:3000` in Safari or Chrome on your phone.
4. Accept the local development SSL warning (tap *Advanced* -> *Proceed to 192.168.1.XX*).
5. Allow location access when prompted. The app will lock onto your real GPS coordinates and cluster rivals around your actual neighborhood!

### Option B: Cloudflare Tunnel / Ngrok (Zero-config Public HTTPS)
If you prefer not to accept self-signed certificate warnings on your mobile device:

```bash
# Terminal 1:
npm run dev

# Terminal 2 (using cloudflared or ngrok):
npx untun@latest tunnel --port 3000
# or
npx ngrok http 3000
```
Open the generated `https://xxxx.trycloudflare.com` or `https://xxxx.ngrok-free.app` URL on your phone!

