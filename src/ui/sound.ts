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

/**
 * The one notification sound: a two-tone chime for a system window opening.
 * Synthesised rather than loaded, so there is no asset to ship or wait on.
 */
export function playNotification(enabled: boolean): void {
  if (!enabled) return;

  const audio = audioContext();
  if (!audio) return;
  // iOS starts the context suspended until a gesture resumes it.
  if (audio.state === 'suspended') void audio.resume();

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.12;
  master.connect(audio.destination);

  for (const [index, freq] of [880, 1318.5].entries()) {
    const start = now + index * 0.09;
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
