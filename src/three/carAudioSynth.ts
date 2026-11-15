/**
 * Web Audio API synthesizer for realistic exotic car engine startup, idle rumble, and revving.
 * Zero external MP3 dependencies required.
 */
export class CarEngineAudioController {
  private ctx: AudioContext | null = null;
  private oscPrimary: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private basePitch = 58;
  private running = false;

  public startEngine(basePitch = 58): void {
    this.stopEngine();
    this.basePitch = basePitch;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      lfo.type = 'sine';

      // Starter crank -> Ignition flare -> Deep idle
      osc1.frequency.setValueAtTime(28, now);
      osc1.frequency.linearRampToValueAtTime(34, now + 0.25);
      osc1.frequency.exponentialRampToValueAtTime(basePitch * 2.4, now + 0.52); // Ignition roar!
      osc1.frequency.exponentialRampToValueAtTime(basePitch, now + 1.35);

      osc2.frequency.setValueAtTime(14, now);
      osc2.frequency.exponentialRampToValueAtTime(basePitch * 1.2, now + 0.52);
      osc2.frequency.exponentialRampToValueAtTime(basePitch * 0.5, now + 1.35);

      // Exhaust burble LFO modulation
      lfo.frequency.setValueAtTime(11, now);
      lfoGain.gain.setValueAtTime(3.2, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);

      // Lowpass exhaust resonance filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(880, now + 0.52);
      filter.frequency.exponentialRampToValueAtTime(260, now + 1.35);
      filter.Q.setValueAtTime(4.5, now);

      // Volume envelope
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.48);
      gain.gain.linearRampToValueAtTime(0.11, now + 1.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.oscPrimary = osc1;
      this.oscSub = osc2;
      this.filterNode = filter;
      this.masterGain = gain;
      this.running = true;
    } catch {
      // Ignore if browser blocks audio
    }
  }

  public revEngine(): void {
    if (!this.running || !this.ctx || !this.oscPrimary || !this.oscSub || !this.filterNode || !this.masterGain) {
      this.startEngine(this.basePitch);
      return;
    }

    const now = this.ctx.currentTime;
    const peak = this.basePitch * 3.1;

    this.oscPrimary.frequency.cancelScheduledValues(now);
    this.oscPrimary.frequency.setValueAtTime(this.oscPrimary.frequency.value, now);
    this.oscPrimary.frequency.exponentialRampToValueAtTime(peak, now + 0.32);
    this.oscPrimary.frequency.exponentialRampToValueAtTime(this.basePitch, now + 1.15);

    this.oscSub.frequency.cancelScheduledValues(now);
    this.oscSub.frequency.setValueAtTime(this.oscSub.frequency.value, now);
    this.oscSub.frequency.exponentialRampToValueAtTime(peak * 0.5, now + 0.32);
    this.oscSub.frequency.exponentialRampToValueAtTime(this.basePitch * 0.5, now + 1.15);

    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setValueAtTime(this.filterNode.frequency.value, now);
    this.filterNode.frequency.exponentialRampToValueAtTime(1350, now + 0.32);
    this.filterNode.frequency.exponentialRampToValueAtTime(260, now + 1.15);

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.26, now + 0.3);
    this.masterGain.gain.linearRampToValueAtTime(0.11, now + 1.15);
  }

  public stopEngine(): void {
    this.running = false;
    try {
      if (this.oscPrimary) {
        this.oscPrimary.stop();
        this.oscPrimary.disconnect();
        this.oscPrimary = null;
      }
      if (this.oscSub) {
        this.oscSub.stop();
        this.oscSub.disconnect();
        this.oscSub = null;
      }
      if (this.masterGain) {
        this.masterGain.disconnect();
        this.masterGain = null;
      }
    } catch {
      // ignore
    }
  }
}
