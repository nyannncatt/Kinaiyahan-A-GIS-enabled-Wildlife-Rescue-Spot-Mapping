// Utility to unlock audio for notifications (like Facebook)
// This allows auto-play of notification sounds after first user interaction

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

export const unlockAudio = () => {
  if (audioUnlocked) return true;
  
  try {
    // Create and unlock AudioContext
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext = ctx;
    
    // Unlock audio context by playing a silent sound
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    audioUnlocked = true;
    
    // Store in sessionStorage so it persists across page navigations
    sessionStorage.setItem('audioUnlocked', 'true');
    
    console.log('Audio unlocked - notifications ready');
    return true;
  } catch (error) {
    console.error('Error unlocking audio:', error);
    return false;
  }
};

export const getAudioContext = (): AudioContext | null => {
  // Check if already unlocked
  if (audioUnlocked && audioContext) {
    return audioContext;
  }
  
  // Check sessionStorage
  if (sessionStorage.getItem('audioUnlocked') === 'true') {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    audioUnlocked = true;
    return audioContext;
  }
  
  return null;
};

export const isAudioUnlocked = (): boolean => {
  return audioUnlocked || sessionStorage.getItem('audioUnlocked') === 'true';
};

