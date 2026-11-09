// Native Web Speech API Voice Coach for outdoor runners (zero external API, 100% client-side)

let isVoiceCoachEnabled = null;

export function isVoiceEnabled() {
  if (typeof window === 'undefined') return true;
  if (isVoiceCoachEnabled === null) {
    const stored = localStorage.getItem('claimr_voice_coach');
    isVoiceCoachEnabled = stored !== null ? stored === 'true' : true;
  }
  return isVoiceCoachEnabled;
}

export function setVoiceEnabled(enabled) {
  isVoiceCoachEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('claimr_voice_coach', String(enabled));
  }
}

/**
 * Speaks a short phrase via the browser's native text-to-speech engine
 */
export function speakAnnouncement(text, priority = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isVoiceEnabled()) return;

  try {
    if (priority) {
      window.speechSynthesis.cancel(); // Cancel any pending queued phrases
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05; // Slightly brisk for runners
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    // Pick an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Google') && !v.name.includes('Natural')) ||
                    voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Formats distance announcement (e.g. "500 meters" or "1 kilometer")
 */
export function announceMilestone(meters, paceStr, cellCount) {
  const km = (meters / 1000).toFixed(1);
  const text = `${km} kilometers completed. Current pace ${paceStr} per kilometer. ${cellCount} sectors held.`;
  speakAnnouncement(text, true);
}

/**
 * Voice alert when a rival captures territory
 */
export function announceTurfLost(rivalName) {
  speakAnnouncement(`Alert: ${rivalName} captured your sector.`, false);
}

/**
 * Voice alert when collecting a power-up
 */
export function announcePowerup(name) {
  speakAnnouncement(`${name} activated!`, true);
}

