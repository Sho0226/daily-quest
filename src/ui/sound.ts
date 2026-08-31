let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Synthesised rather than loaded, so there is no asset to ship or wait on. */
function playTones(freqs: number[], spacing: number, volume: number): void {
  const audio = audioContext();
  if (!audio) return;
  // iOS starts the context suspended until a gesture resumes it.
  if (audio.state === 'suspended') void audio.resume();

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = volume;
  master.connect(audio.destination);

  for (const [index, freq] of freqs.entries()) {
    const start = now + index * spacing;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.3);
  }
}

/** A system window opening: two tones. */
export function playNotification(enabled: boolean): void {
  if (!enabled) return;
  playTones([880, 1318.5], 0.09, 0.12);
}

/** Levelling up: a rising arpeggio, so it is audibly a different event. */
export function playLevelUp(enabled: boolean): void {
  if (!enabled) return;
  playTones([659.3, 880, 1108.7, 1318.5], 0.085, 0.14);
}
