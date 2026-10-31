window.MelonAudio = (() => {
  function create(initialEnabled = true) {
    let enabled = initialEnabled, context = null, output = null, resuming = null, generation = 0;
    const voices = new Set();

    async function unlock() {
      if (!enabled) return false;
      try {
        if (!context || context.state === 'closed') {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return false;
          context = new AudioContext({latencyHint: 'interactive'});
          output = context.createGain();
          output.gain.value = .8;
          const limiter = context.createDynamicsCompressor();
          limiter.threshold.value = -12;
          limiter.knee.value = 12;
          limiter.ratio.value = 4;
          output.connect(limiter);
          limiter.connect(context.destination);
        }
        if (context.state !== 'running') {
          if (!resuming) resuming = context.resume().finally(() => { resuming = null; });
          await resuming;
        }
        return context.state === 'running';
      } catch {
        return false;
      }
    }

    function note(start, frequency, endFrequency, duration, volume, waveform = 'sine') {
      if (voices.size >= 32) return;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain);gain.connect(output);
      const voice = {oscillator, gain};voices.add(voice);
      oscillator.onended = () => { voices.delete(voice);oscillator.disconnect();gain.disconnect(); };
      oscillator.start(start);oscillator.stop(start + duration + .015);
    }

    async function schedule(draw) {
      const ticket = generation, requested = performance.now();
      if (!enabled || !await unlock()) return;
      // Resuming audio is asynchronous. Keep the first click, but discard stale or muted events.
      if (!enabled || ticket !== generation || performance.now() - requested > 800) return;
      draw(context.currentTime + .008);
    }

    function play(event, tier = 0) {
      return schedule(start => {
        if (event === 'drop') {
          const pitch = 1 + Math.min(tier, 4) * .035;
          note(start, 610 * pitch, 165 * pitch, .14, .22, 'sine');
          note(start, 980, 370, .055, .045, 'triangle');
        } else if (event === 'merge') {
          const pitch = 1 + Math.min(tier, 10) * .022;
          [659.25, 830.61, 1046.5].forEach((frequency, index) => {
            const at = start + index * .065;
            note(at, frequency * pitch, frequency * pitch * 1.018, .23, .105, 'triangle');
            note(at, frequency * pitch * 2, frequency * pitch * 2, .16, .022, 'sine');
          });
        } else if (event === 'enabled') {
          note(start, 523.25, 523.25, .12, .10);
          note(start + .075, 783.99, 783.99, .17, .08);
        }
      });
    }

    function tone(frequency, duration, waveform = 'sine', volume = .08) {
      return schedule(start => note(start, frequency, frequency * .7, duration, volume, waveform));
    }
    function cancel() {
      generation++;
      for (const voice of voices) {
        voice.gain.disconnect();
        try { voice.oscillator.stop(); } catch { /* The voice may already have ended. */ }
      }
      voices.clear();
    }
    function setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled) cancel();
    }
    return Object.freeze({unlock, play, tone, cancel, setEnabled});
  }
  return {create};
})();
