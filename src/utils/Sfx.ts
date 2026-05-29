import { getVolumeFactor } from './audio';

type Tone = {
  freq: number;
  dur: number;
  type: OscillatorType;
  vol?: number;
  slide?: number;
};

class Sfx {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private play({ freq, dur, type, vol = 0.06, slide = 0 }: Tone) {
    const master = getVolumeFactor();
    if (master <= 0) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    }
    gain.gain.setValueAtTime(vol * master, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  jump() { this.play({ freq: 520, dur: 0.09, type: 'square', vol: 0.05, slide: 200 }); }
  attack() { this.play({ freq: 200, dur: 0.06, type: 'sawtooth', vol: 0.05 }); }
  dash() { this.play({ freq: 720, dur: 0.12, type: 'sine', vol: 0.06, slide: -500 }); }
  hitEnemy() { this.play({ freq: 240, dur: 0.08, type: 'square', vol: 0.07 }); }
  playerHurt() { this.play({ freq: 160, dur: 0.22, type: 'square', vol: 0.08, slide: -80 }); }
  enemyDie() { this.play({ freq: 420, dur: 0.3, type: 'sawtooth', vol: 0.07, slide: -360 }); }
  stageClear() { this.play({ freq: 660, dur: 0.45, type: 'triangle', vol: 0.08, slide: 220 }); }
  save() {
    this.play({ freq: 880, dur: 0.18, type: 'triangle', vol: 0.06, slide: 240 });
    setTimeout(() => this.play({ freq: 1320, dur: 0.22, type: 'sine', vol: 0.05, slide: 180 }), 80);
  }
  bossTelegraph() { this.play({ freq: 90, dur: 0.36, type: 'sawtooth', vol: 0.07, slide: 60 }); }
  bossSlam() {
    this.play({ freq: 70, dur: 0.4, type: 'sawtooth', vol: 0.1, slide: -40 });
    setTimeout(() => this.play({ freq: 180, dur: 0.18, type: 'square', vol: 0.06, slide: -120 }), 30);
  }
  doorLocked() { this.play({ freq: 140, dur: 0.14, type: 'square', vol: 0.05, slide: -40 }); }
}

export const sfx = new Sfx();
