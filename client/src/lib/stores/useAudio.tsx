import { create } from "zustand";

// Create an audio context for generating beep sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play a beep sound with a specific frequency
const playBeep = (frequency: number, duration: number = 0.1, volume: number = 0.15) => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if it's suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    // Silently fail if AudioContext is not supported
    console.log("Audio playback failed:", error);
  }
};

// Frequency mapping for each digit (similar to DTMF but simplified)
const digitFrequencies: { [key: number]: number } = {
  1: 697,
  2: 770,
  3: 852,
  4: 941,
  5: 1209,
  6: 1336,
  7: 1477,
  8: 1633,
  9: 1800,
  0: 600,
};

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playDigit: (digit: number) => void;
  playDelete: () => void;
  playError: () => void;
  playSuccess: () => void;
  playConfirm: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  successSound: null,
  isMuted: false, // Start unmuted by default
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    set({ isMuted: newMutedState });
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playDigit: (digit: number) => {
    const { isMuted } = get();
    if (isMuted) return;
    
    const frequency = digitFrequencies[digit] || 800;
    playBeep(frequency, 0.08, 0.15);
  },
  
  playDelete: () => {
    const { isMuted } = get();
    if (isMuted) return;
    
    // Play a lower frequency beep for delete
    playBeep(300, 0.12, 0.2);
  },
  
  playError: () => {
    const { isMuted } = get();
    if (isMuted) return;
    
    // Play a dissonant double beep for error
    playBeep(200, 0.15, 0.25);
    setTimeout(() => playBeep(180, 0.15, 0.25), 80);
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (isMuted) return;
    
    if (successSound) {
      successSound.currentTime = 0;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    } else {
      // Fallback: play a nice ascending tone
      playBeep(523, 0.1, 0.2); // C
      setTimeout(() => playBeep(659, 0.1, 0.2), 100); // E
      setTimeout(() => playBeep(784, 0.2, 0.2), 200); // G
    }
  },
  
  playConfirm: () => {
    const { isMuted } = get();
    if (isMuted) return;
    
    // Play a pleasant double beep for confirm (higher pitched than digit sounds)
    playBeep(1200, 0.08, 0.18);
    setTimeout(() => playBeep(1400, 0.08, 0.18), 60);
  }
}));
