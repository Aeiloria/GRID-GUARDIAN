/**
 * Audio Protection & Scalar Frequency Synthesis Engine
 * Provides Keylontic/Kristic harmonic vector modulation, Web Audio Analyser,
 * musical resonance layering (chords, ambient pads, binaural beats),
 * configurable Harmonic Intervals (Perfect Fifth, Octave, Major Third, etc.), and frequency locks.
 */

export type MusicalMode = 'pure' | 'sacred_triad' | 'ambient_pad' | 'binaural_theta' | 'crystal_bowl';

export type HarmonicIntervalType =
  | 'none'
  | 'major_third'
  | 'perfect_fourth'
  | 'perfect_fifth'
  | 'golden_ratio'
  | 'major_sixth'
  | 'octave'
  | 'sub_octave';

export interface HarmonicIntervalDef {
  id: HarmonicIntervalType;
  name: string;
  shortName: string;
  ratio: number;
  ratioFraction: string;
  semitones: string;
  description: string;
  feeling: string;
  badge: string;
}

export const HARMONIC_INTERVALS: HarmonicIntervalDef[] = [
  {
    id: 'none',
    name: 'Solo Fundamental',
    shortName: 'Solo',
    ratio: 1.0,
    ratioFraction: '1:1',
    semitones: '0 st',
    description: 'Pure single carrier wave without secondary interval.',
    feeling: 'Focused Carrier',
    badge: 'UNISON'
  },
  {
    id: 'major_third',
    name: 'Major Third (5:4)',
    shortName: 'Maj 3rd',
    ratio: 1.25,
    ratioFraction: '5:4',
    semitones: '+4 st',
    description: 'Bright, sweet, uplifting harmonic warmth creating a natural major sonority.',
    feeling: 'Emotional Warmth & Heart Opening',
    badge: 'MAJOR 3RD'
  },
  {
    id: 'perfect_fourth',
    name: 'Perfect Fourth (4:3)',
    shortName: 'Perf 4th',
    ratio: 4 / 3,
    ratioFraction: '4:3',
    semitones: '+5 st',
    description: 'Centering, balanced sacred interval establishing acoustic equilibrium.',
    feeling: 'Equilibrium & Centered Calm',
    badge: 'PERFECT 4TH'
  },
  {
    id: 'perfect_fifth',
    name: 'Perfect Fifth (3:2)',
    shortName: 'Perf 5th',
    ratio: 1.5,
    ratioFraction: '3:2',
    semitones: '+7 st',
    description: 'The golden interval of creation: maximum harmonic consonance and acoustic resonance.',
    feeling: 'Cosmic Consonance & Clarity',
    badge: 'PERFECT 5TH'
  },
  {
    id: 'golden_ratio',
    name: 'Golden Ratio Phi (1.618)',
    shortName: 'Golden Phi',
    ratio: 1.61803398875,
    ratioFraction: 'Φ : 1',
    semitones: '~8.3 st',
    description: 'Sacred Fibonacci spiral harmonic for morphogenetic scalar field alignment.',
    feeling: 'Golden Spiral Sacred Geometry',
    badge: 'PHI SPIRAL'
  },
  {
    id: 'major_sixth',
    name: 'Major Sixth (5:3)',
    shortName: 'Maj 6th',
    ratio: 5 / 3,
    ratioFraction: '5:3',
    semitones: '+9 st',
    description: 'Expansive, hopeful, open resonance uplifting the mental and etheric fields.',
    feeling: 'Expansive Uplift & Joy',
    badge: 'MAJOR 6TH'
  },
  {
    id: 'octave',
    name: 'Octave (2:1)',
    shortName: 'Octave',
    ratio: 2.0,
    ratioFraction: '2:1',
    semitones: '+12 st',
    description: 'Double fundamental frequency for transcendent clarity and dimensional expansion.',
    feeling: 'Transcendence & Dimensional Lift',
    badge: 'OCTAVE'
  },
  {
    id: 'sub_octave',
    name: 'Sub-Octave (1:2)',
    shortName: 'Sub-Octave',
    ratio: 0.5,
    ratioFraction: '1:2',
    semitones: '-12 st',
    description: 'Half fundamental frequency providing deep, soothing somatic grounding.',
    feeling: 'Deep Grounding & Core Anchor',
    badge: 'SUB-OCTAVE'
  }
];

export interface AudioEngineOptions {
  volume?: number; // 0.0 - 1.0
  mode?: MusicalMode;
  harmonicRichness?: number; // 0.0 - 1.0
  warmthFilter?: number; // Cutoff multiplier (1 - 6)
  interval?: HarmonicIntervalType;
  intervalMix?: number; // 0.0 - 1.0
}

let audioCtx: AudioContext | null = null;
let primaryOsc: OscillatorNode | null = null;
let secondaryIntervalOsc: OscillatorNode | null = null;
let fifthOsc: OscillatorNode | null = null;
let octaveOsc: OscillatorNode | null = null;
let subOsc: OscillatorNode | null = null;
let lfoOsc: OscillatorNode | null = null;

let masterGain: GainNode | null = null;
let secondaryIntervalGain: GainNode | null = null;
let fifthGain: GainNode | null = null;
let octaveGain: GainNode | null = null;
let subGain: GainNode | null = null;
let lfoGain: GainNode | null = null;

let biquadFilter: BiquadFilterNode | null = null;
let analyserNode: AnalyserNode | null = null;

let currentVolume: number = 0.65;
let currentMode: MusicalMode = 'sacred_triad';
let currentRichness: number = 0.6;
let currentInterval: HarmonicIntervalType = 'perfect_fifth';
let currentIntervalMix: number = 0.75;
let currentFreq: number = 432.0;
let currentWave: OscillatorType = 'sine';

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAudioPlaying(): boolean {
  return primaryOsc !== null;
}

export function setAudioVolume(vol: number): void {
  currentVolume = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx && audioCtx.state === 'running') {
    const targetGain = currentVolume * 0.18;
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + 0.05);
  }
}

export function setHarmonicRichness(level: number): void {
  currentRichness = Math.max(0, Math.min(1, level));
  if (audioCtx && audioCtx.state === 'running') {
    const now = audioCtx.currentTime;
    if (fifthGain) {
      fifthGain.gain.setValueAtTime(fifthGain.gain.value, now);
      fifthGain.gain.linearRampToValueAtTime(currentRichness * 0.45, now + 0.05);
    }
    if (octaveGain) {
      octaveGain.gain.setValueAtTime(octaveGain.gain.value, now);
      octaveGain.gain.linearRampToValueAtTime(currentRichness * 0.35, now + 0.05);
    }
    if (subGain) {
      subGain.gain.setValueAtTime(subGain.gain.value, now);
      subGain.gain.linearRampToValueAtTime(currentRichness * 0.5, now + 0.05);
    }
  }
}

export function setHarmonicInterval(interval: HarmonicIntervalType): void {
  currentInterval = interval;
  if (!audioCtx || audioCtx.state !== 'running' || !primaryOsc || !biquadFilter) return;

  const now = audioCtx.currentTime;
  const intervalDef = HARMONIC_INTERVALS.find(i => i.id === interval);

  if (!intervalDef || interval === 'none') {
    if (secondaryIntervalGain) {
      secondaryIntervalGain.gain.setValueAtTime(secondaryIntervalGain.gain.value, now);
      secondaryIntervalGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    }
    return;
  }

  const targetSecFreq = currentFreq * intervalDef.ratio;
  const targetGain = currentIntervalMix * 0.48;

  if (secondaryIntervalOsc && secondaryIntervalGain) {
    secondaryIntervalOsc.frequency.setValueAtTime(secondaryIntervalOsc.frequency.value, now);
    secondaryIntervalOsc.frequency.exponentialRampToValueAtTime(targetSecFreq, now + 0.08);

    secondaryIntervalGain.gain.setValueAtTime(secondaryIntervalGain.gain.value, now);
    secondaryIntervalGain.gain.linearRampToValueAtTime(targetGain, now + 0.08);
  } else {
    // Spin up secondary interval oscillator if not yet created
    secondaryIntervalOsc = audioCtx.createOscillator();
    secondaryIntervalOsc.type = 'sine';
    secondaryIntervalOsc.frequency.setValueAtTime(targetSecFreq, now);

    secondaryIntervalGain = audioCtx.createGain();
    secondaryIntervalGain.gain.setValueAtTime(0.0001, now);
    secondaryIntervalGain.gain.linearRampToValueAtTime(targetGain, now + 0.08);

    secondaryIntervalOsc.connect(secondaryIntervalGain);
    secondaryIntervalGain.connect(biquadFilter);
    secondaryIntervalOsc.start(now);
  }
}

export function setSecondaryIntervalMix(mix: number): void {
  currentIntervalMix = Math.max(0, Math.min(1, mix));
  if (secondaryIntervalGain && audioCtx && audioCtx.state === 'running') {
    const now = audioCtx.currentTime;
    const targetGain = currentInterval === 'none' ? 0.0001 : currentIntervalMix * 0.48;
    secondaryIntervalGain.gain.setValueAtTime(secondaryIntervalGain.gain.value, now);
    secondaryIntervalGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
  }
}

export function startAudioProtectionFreq(
  frequency: number = 432.0,
  waveType: OscillatorType = 'sine',
  options: AudioEngineOptions = {}
): void {
  try {
    const ctx = getAudioContext();

    // Clean up existing audio instances
    stopAudioProtectionFreq();

    currentFreq = frequency;
    currentWave = waveType;
    if (options.volume !== undefined) currentVolume = options.volume;
    if (options.mode !== undefined) currentMode = options.mode;
    if (options.harmonicRichness !== undefined) currentRichness = options.harmonicRichness;
    if (options.interval !== undefined) currentInterval = options.interval;
    if (options.intervalMix !== undefined) currentIntervalMix = options.intervalMix;

    const now = ctx.currentTime;

    // 1. Analyser Node setup for spectrum visualization
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.82;

    // 2. Master Gain with gentle anti-click attack ramp
    masterGain = ctx.createGain();
    const targetMaster = currentVolume * 0.18;
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(targetMaster, now + 0.12);

    // 3. Resonant Lowpass Filter to remove harsh digital bite
    biquadFilter = ctx.createBiquadFilter();
    biquadFilter.type = 'lowpass';
    const filterMultiplier = options.warmthFilter || (currentMode === 'crystal_bowl' ? 5.5 : 3.5);
    const cutoff = Math.min(Math.max(frequency * filterMultiplier, 600), 16000);
    biquadFilter.frequency.setValueAtTime(cutoff, now);
    biquadFilter.Q.value = currentMode === 'crystal_bowl' ? 3.0 : 1.2;

    // 4. Primary Carrier Oscillator (Fundamental Tone $f_0$)
    primaryOsc = ctx.createOscillator();
    primaryOsc.type = waveType;
    primaryOsc.frequency.setValueAtTime(frequency, now);
    primaryOsc.connect(biquadFilter);

    // 5. Explicit Layered Harmonic Interval Oscillator (User Configured)
    if (currentInterval !== 'none') {
      const intervalDef = HARMONIC_INTERVALS.find(i => i.id === currentInterval) || HARMONIC_INTERVALS[3];
      const targetSecFreq = frequency * intervalDef.ratio;

      secondaryIntervalOsc = ctx.createOscillator();
      secondaryIntervalOsc.type = 'sine';
      secondaryIntervalOsc.frequency.setValueAtTime(targetSecFreq, now);

      secondaryIntervalGain = ctx.createGain();
      secondaryIntervalGain.gain.setValueAtTime(0.0001, now);
      secondaryIntervalGain.gain.linearRampToValueAtTime(currentIntervalMix * 0.48, now + 0.1);

      secondaryIntervalOsc.connect(secondaryIntervalGain);
      secondaryIntervalGain.connect(biquadFilter);
      secondaryIntervalOsc.start(now);
    }

    // 6. Musical Harmony Layers depending on currentMode:
    if (currentMode === 'sacred_triad' || currentMode === 'ambient_pad' || currentMode === 'crystal_bowl') {
      // Perfect Fifth ($1.5 \times f_0$) harmonic resonance
      fifthOsc = ctx.createOscillator();
      fifthOsc.type = 'sine';
      fifthOsc.frequency.setValueAtTime(frequency * 1.5, now);
      fifthGain = ctx.createGain();
      fifthGain.gain.setValueAtTime(currentRichness * 0.38, now);
      fifthOsc.connect(fifthGain);
      fifthGain.connect(biquadFilter);
      fifthOsc.start(now);

      // Octave ($2 \times f_0$) shimmering harmonic
      octaveOsc = ctx.createOscillator();
      octaveOsc.type = 'sine';
      octaveOsc.frequency.setValueAtTime(frequency * 2.0, now);
      octaveGain = ctx.createGain();
      octaveGain.gain.setValueAtTime(currentRichness * 0.25, now);
      octaveOsc.connect(octaveGain);
      octaveGain.connect(biquadFilter);
      octaveOsc.start(now);

      // Deep Sub-Harmonic ($0.5 \times f_0$) grounding drone
      subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(frequency * 0.5, now);
      subGain = ctx.createGain();
      subGain.gain.setValueAtTime(currentRichness * 0.45, now);
      subOsc.connect(subGain);
      subGain.connect(biquadFilter);
      subOsc.start(now);
    } else if (currentMode === 'binaural_theta') {
      // Binaural Theta offset (+6 Hz entrainment beat)
      fifthOsc = ctx.createOscillator();
      fifthOsc.type = 'sine';
      fifthOsc.frequency.setValueAtTime(frequency + 6.0, now);
      fifthGain = ctx.createGain();
      fifthGain.gain.setValueAtTime(currentRichness * 0.65, now);
      fifthOsc.connect(fifthGain);
      fifthGain.connect(biquadFilter);
      fifthOsc.start(now);

      // Sub-harmonic octave
      subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(frequency * 0.5, now);
      subGain = ctx.createGain();
      subGain.gain.setValueAtTime(currentRichness * 0.4, now);
      subOsc.connect(subGain);
      subGain.connect(biquadFilter);
      subOsc.start(now);
    }

    // 7. Subtle Musical LFO Chorusing / Shimmer for Ambient Pad Mode
    if (currentMode === 'ambient_pad' || currentMode === 'crystal_bowl') {
      lfoOsc = ctx.createOscillator();
      lfoOsc.type = 'sine';
      lfoOsc.frequency.setValueAtTime(0.25, now); // Slow 0.25 Hz celestial drift

      lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(1.8, now); // Subtle pitch modulation
      lfoOsc.connect(lfoGain);
      lfoGain.connect(primaryOsc.frequency);
      lfoOsc.start(now);
    }

    // Connect node graph
    biquadFilter.connect(masterGain);
    masterGain.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    // Launch main oscillation
    primaryOsc.start(now);
  } catch (error) {
    console.error('Scalar audio engine start failed:', error);
  }
}

export function updateAudioParams(
  frequency: number,
  waveType: OscillatorType,
  options: AudioEngineOptions = {}
): void {
  if (!isAudioPlaying()) {
    currentFreq = frequency;
    currentWave = waveType;
    if (options.volume !== undefined) currentVolume = options.volume;
    if (options.mode !== undefined) currentMode = options.mode;
    if (options.harmonicRichness !== undefined) currentRichness = options.harmonicRichness;
    if (options.interval !== undefined) currentInterval = options.interval;
    if (options.intervalMix !== undefined) currentIntervalMix = options.intervalMix;
    return;
  }

  // Smooth live parameter transition without stopping audio
  if (audioCtx && audioCtx.state === 'running' && primaryOsc) {
    const now = audioCtx.currentTime;
    currentFreq = frequency;
    currentWave = waveType;

    if (options.mode !== undefined && options.mode !== currentMode) {
      // Reconfigure mode cleanly
      startAudioProtectionFreq(frequency, waveType, { ...options, volume: currentVolume });
      return;
    }

    primaryOsc.type = waveType;
    primaryOsc.frequency.setValueAtTime(primaryOsc.frequency.value, now);
    primaryOsc.frequency.exponentialRampToValueAtTime(frequency, now + 0.08);

    if (options.interval !== undefined) {
      setHarmonicInterval(options.interval);
    } else if (secondaryIntervalOsc && currentInterval !== 'none') {
      const intervalDef = HARMONIC_INTERVALS.find(i => i.id === currentInterval);
      if (intervalDef) {
        secondaryIntervalOsc.frequency.setValueAtTime(secondaryIntervalOsc.frequency.value, now);
        secondaryIntervalOsc.frequency.exponentialRampToValueAtTime(frequency * intervalDef.ratio, now + 0.08);
      }
    }

    if (fifthOsc) {
      const fifthTarget = currentMode === 'binaural_theta' ? frequency + 6.0 : frequency * 1.5;
      fifthOsc.frequency.setValueAtTime(fifthOsc.frequency.value, now);
      fifthOsc.frequency.exponentialRampToValueAtTime(fifthTarget, now + 0.08);
    }

    if (octaveOsc) {
      octaveOsc.frequency.setValueAtTime(octaveOsc.frequency.value, now);
      octaveOsc.frequency.exponentialRampToValueAtTime(frequency * 2.0, now + 0.08);
    }

    if (subOsc) {
      subOsc.frequency.setValueAtTime(subOsc.frequency.value, now);
      subOsc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.08);
    }

    if (biquadFilter) {
      const filterMultiplier = options.warmthFilter || (currentMode === 'crystal_bowl' ? 5.5 : 3.5);
      const cutoff = Math.min(Math.max(frequency * filterMultiplier, 600), 16000);
      biquadFilter.frequency.setValueAtTime(biquadFilter.frequency.value, now);
      biquadFilter.frequency.exponentialRampToValueAtTime(cutoff, now + 0.1);
    }

    if (options.volume !== undefined) setAudioVolume(options.volume);
    if (options.harmonicRichness !== undefined) setHarmonicRichness(options.harmonicRichness);
    if (options.intervalMix !== undefined) setSecondaryIntervalMix(options.intervalMix);
  }
}

export function stopAudioProtectionFreq(): void {
  try {
    if (masterGain && audioCtx && audioCtx.state === 'running') {
      const now = audioCtx.currentTime;
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      const toStopPrimary = primaryOsc;
      const toStopSec = secondaryIntervalOsc;
      const toStopFifth = fifthOsc;
      const toStopOctave = octaveOsc;
      const toStopSub = subOsc;
      const toStopLfo = lfoOsc;

      primaryOsc = null;
      secondaryIntervalOsc = null;
      fifthOsc = null;
      octaveOsc = null;
      subOsc = null;
      lfoOsc = null;

      setTimeout(() => {
        try {
          toStopPrimary?.stop();
          toStopPrimary?.disconnect();
          toStopSec?.stop();
          toStopSec?.disconnect();
          toStopFifth?.stop();
          toStopFifth?.disconnect();
          toStopOctave?.stop();
          toStopOctave?.disconnect();
          toStopSub?.stop();
          toStopSub?.disconnect();
          toStopLfo?.stop();
          toStopLfo?.disconnect();
        } catch {
          // Ignore state race exceptions on shutdown
        }
      }, 140);
    } else {
      if (primaryOsc) {
        primaryOsc.stop();
        primaryOsc.disconnect();
        primaryOsc = null;
      }
      if (secondaryIntervalOsc) {
        secondaryIntervalOsc.stop();
        secondaryIntervalOsc.disconnect();
        secondaryIntervalOsc = null;
      }
      if (fifthOsc) {
        fifthOsc.stop();
        fifthOsc.disconnect();
        fifthOsc = null;
      }
      if (octaveOsc) {
        octaveOsc.stop();
        octaveOsc.disconnect();
        octaveOsc = null;
      }
      if (subOsc) {
        subOsc.stop();
        subOsc.disconnect();
        subOsc = null;
      }
      if (lfoOsc) {
        lfoOsc.stop();
        lfoOsc.disconnect();
        lfoOsc = null;
      }
    }
  } catch (error) {
    console.warn('Audio engine stop exception:', error);
  }
}

export function getAnalyserNode(): AnalyserNode | null {
  return analyserNode;
}
