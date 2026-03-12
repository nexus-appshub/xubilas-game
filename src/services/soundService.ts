class SoundService {
  private ctx: AudioContext | null = null;
  private bgmEnabled: boolean = false;
  private sfxEnabled: boolean = true;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private bgmNodes: { osc?: OscillatorNode, gain: GainNode, source?: AudioBufferSourceNode }[] = [];
  private bgmIntervals: any[] = [];
  private customWhackBuffer: AudioBuffer | null = null;
  private customBgmBuffer: AudioBuffer | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();

  setBgmEnabled(val: boolean) {
    this.bgmEnabled = val;
    if (!val) this.stopBGM();
  }

  setSfxEnabled(val: boolean) {
    this.sfxEnabled = val;
  }

  async setCustomWhackSound(url: string | null) {
    if (!url) {
      this.customWhackBuffer = null;
      return;
    }
    try {
      this.customWhackBuffer = await this.loadAudio(url);
    } catch (e) {
      console.error("Failed to load custom whack sound:", e);
      this.customWhackBuffer = null;
    }
  }

  private async loadAudio(url: string): Promise<AudioBuffer> {
    if (this.audioCache.has(url)) return this.audioCache.get(url)!;
    
    try {
      let arrayBuffer: ArrayBuffer;

      if (url.startsWith('data:')) {
        // Handle data URIs directly to avoid fetch issues with large strings
        const base64 = url.split(',')[1];
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        arrayBuffer = await response.arrayBuffer();
      }

      if (arrayBuffer.byteLength === 0) throw new Error("Audio buffer is empty");

      const ctx = this.init();
      // Use the promise-based version
      try {
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.audioCache.set(url, audioBuffer);
        return audioBuffer;
      } catch (decodeError) {
        console.error("Audio decoding failed. This usually happens with unsupported formats or corrupted files.", decodeError);
        throw new Error("Decoding failed");
      }
    } catch (e) {
      console.error(`Failed to load audio from ${url.substring(0, 50)}...`, e);
      throw e;
    }
  }

  async startBGM(type: 'energetic' | 'horror' | 'chill' | 'traditional' | 'custom' | 'none' = 'traditional', customUrl?: string): Promise<void> {
    if (!this.bgmEnabled) return;
    
    this.stopBGM();

    const ctx = this.init();

    if (type === 'custom' && customUrl) {
      try {
        const buffer = await this.loadAudio(customUrl);
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        this.bgmNodes.push({ source, gain });
        return;
      } catch (e) {
        console.error("Failed to start custom BGM, falling back to traditional:", e);
        return this.startBGM('traditional');
      }
    }
    
    const createPart = (freq: number, type: OscillatorType, volume: number, pattern: number[]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      
      const stepTime = 0.15;
      let step = 0;
      const interval = setInterval(() => {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const time = this.ctx.currentTime;
        if (pattern[step % pattern.length]) {
          gain.gain.cancelScheduledValues(time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(volume, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, time + stepTime * 0.9);
        }
        step++;
      }, stepTime * 1000);
      
      return { osc, gain, interval };
    };

    let bassFreq = 55;
    let leadFreq = 220;
    let bassPattern = [1, 0, 1, 0, 1, 0, 1, 1];
    let leadPattern = [0, 0, 1, 0, 0, 1, 0, 1];

    if (type === 'horror') {
      bassFreq = 40;
      leadFreq = 110;
      bassPattern = [1, 1, 1, 1, 1, 1, 1, 1];
      leadPattern = [1, 0, 0, 0, 1, 0, 0, 0];
    } else if (type === 'chill') {
      bassFreq = 65;
      leadFreq = 330;
      bassPattern = [1, 0, 0, 0, 1, 0, 0, 0];
      leadPattern = [0, 0, 0, 0, 1, 0, 0, 0];
    } else if (type === 'traditional') {
      // Dreamy Music Box / Kalimba style - Soft and pleasant
      const createKalimba = (freq: number, pattern: number[], delay: number = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; // Pure tone
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        
        const stepTime = 0.4;
        let step = 0;
        const interval = setInterval(() => {
          if (!this.ctx || this.ctx.state === 'suspended') return;
          const time = this.ctx.currentTime;
          if (pattern[step % pattern.length]) {
            gain.gain.cancelScheduledValues(time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.03, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, time + stepTime * 2.5);
          }
          step++;
        }, stepTime * 1000);
        return { osc, gain, interval };
      };

      // Gentle, sparkling melody
      const melody = createKalimba(659.25, [1, 0, 1, 0, 0, 1, 0, 0]); // E5
      const harmony = createKalimba(523.25, [0, 1, 0, 0, 1, 0, 1, 0], 0.2); // C5
      const high = createKalimba(880.00, [0, 0, 0, 1, 0, 0, 0, 1], 0.1); // A5
      
      this.bgmIntervals.push(melody.interval, harmony.interval, high.interval);
      this.bgmNodes.push(
        { osc: melody.osc, gain: melody.gain }, 
        { osc: harmony.osc, gain: harmony.gain },
        { osc: high.osc, gain: high.gain }
      );
      return;
    }

    const bass = createPart(bassFreq, 'sawtooth', 0.04, bassPattern);
    const lead = createPart(leadFreq, 'triangle', 0.02, leadPattern);
    
    this.bgmIntervals.push(bass.interval, lead.interval);
    this.bgmNodes.push({ osc: bass.osc, gain: bass.gain }, { osc: lead.osc, gain: lead.gain });
  }

  stopBGM() {
    this.bgmIntervals.forEach(i => clearInterval(i));
    this.bgmNodes.forEach(n => {
      try {
        if (n.osc) {
          n.osc.stop();
          n.osc.disconnect();
        }
        if (n.source) {
          n.source.stop();
          n.source.disconnect();
        }
        n.gain.disconnect();
      } catch (e) {}
    });
    this.bgmIntervals = [];
    this.bgmNodes = [];
  }

  private createOscillator(freq: number, type: OscillatorType = 'sine'): { osc: OscillatorNode, gain: GainNode } | null {
    if (!this.sfxEnabled) return null;
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    return { osc, gain };
  }

  playClick() {
    const result = this.createOscillator(800, 'sine');
    if (!result) return;
    const { osc, gain } = result;
    const ctx = this.init();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playLevelLoad() {
    if (!this.sfxEnabled) return;
    const ctx = this.init();
    const result = this.createOscillator(110, 'sine');
    if (!result) return;
    const { osc, gain } = result;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  }

  playWhack() {
    if (!this.sfxEnabled) return;
    const ctx = this.init();

    if (this.customWhackBuffer) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = this.customWhackBuffer;
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return;
    }

    const core = this.createOscillator(400, 'sawtooth');
    if (core) {
      core.osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.35);
      core.gain.gain.setValueAtTime(0.4, ctx.currentTime);
      core.gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      core.osc.start();
      core.osc.stop(ctx.currentTime + 0.35);
    }
    const boom = this.createOscillator(100, 'sine');
    if (boom) {
      boom.gain.gain.setValueAtTime(0.6, ctx.currentTime);
      boom.gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      boom.osc.start();
      boom.osc.stop(ctx.currentTime + 0.5);
    }
  }

  playBeep(isHigh = false) {
    const result = this.createOscillator(isHigh ? 880 : 440, 'sine');
    if (!result) return;
    const { osc, gain } = result;
    const ctx = this.init();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  playGameStart() {
    if (!this.sfxEnabled) return;
    const ctx = this.init();
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const result = this.createOscillator(freq, 'sine');
      if (!result) return;
      const { osc, gain } = result;
      const time = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
      gain.gain.linearRampToValueAtTime(0, time + 0.2);
      osc.start(time);
      osc.stop(time + 0.2);
    });
  }

  playGameEnd(success: boolean) {
    if (!this.sfxEnabled) return;
    const ctx = this.init();
    if (success) {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const result = this.createOscillator(freq, 'triangle');
        if (!result) return;
        const { osc, gain } = result;
        const time = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.1);
        gain.gain.linearRampToValueAtTime(0, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
      });
    } else {
      const result = this.createOscillator(220, 'sawtooth');
      if (!result) return;
      const { osc, gain } = result;
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  }
}

export const soundService = new SoundService();