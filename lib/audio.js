// Web Audio API synthesizer & Haptic Feedback engine (zero external audio files needed)

let audioCtx = null;
let soundEnabled = true;

// Initialize AudioContext on first user interaction to comply with browser autoplay policies
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAudioEnabled() {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('claimr_sound');
  return stored !== null ? stored === 'true' : true;
}

export function setAudioEnabled(enabled) {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('claimr_sound', String(enabled));
  }
}

// Subtle haptic vibration helper
export function triggerHaptic(pattern = [30]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}

/**
 * Crisp neon ping when claiming a neutral cell
 */
export function playClaimSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([35]);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  const now = ctx.currentTime;

  // Gentle frequency sweep up: 540Hz -> 720Hz
  osc.frequency.setValueAtTime(540, now);
  osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

/**
 * Victorious rising arpeggio when stealing a cell from a rival
 */
export function playStealSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([50, 40, 60]);

  const notes = [440, 587.33, 880]; // A4, D5, A5
  const now = ctx.currentTime;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const noteTime = now + idx * 0.07;

    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0.18, noteTime);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteTime);
    osc.stop(noteTime + 0.17);
  });
}

/**
 * Low warning alert when a rival captures player territory
 */
export function playLostSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([70, 60, 70]);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  const now = ctx.currentTime;

  // Descending alarm tone
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.26);
}

/**
 * Start Run double-tone
 */
export function playStartSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([40, 40]);

  const notes = [523.25, 783.99]; // C5 -> G5
  const now = ctx.currentTime;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const t = now + i * 0.1;

    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.19);
  });
}

/**
 * Finish Run triumphal fanfare
 */
export function playFinishSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  triggerHaptic([60, 50, 100]);

  const chord = [523.25, 659.25, 783.99, 1046.5]; // C major chord arpeggio
  const now = ctx.currentTime;

  chord.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const t = now + i * 0.08;

    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  });
}

