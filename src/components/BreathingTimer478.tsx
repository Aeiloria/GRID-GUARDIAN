import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Wind,
  CheckCircle2,
  Heart,
  Sparkles,
  Music,
  Sliders
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CelebrationGlow } from './CelebrationGlow';

export type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale';
export type AudioCueStyle = 'gong' | 'hum' | 'bell';

interface BreathingTimer478Props {
  onCompleteCycle?: (cycleCount: number) => void;
  onLogRoutine?: () => void;
  currentHeartRate?: number;
}

export function BreathingTimer478({
  onCompleteCycle,
  onLogRoutine,
  currentHeartRate = 75
}: BreathingTimer478Props) {
  const [phase, setPhase] = useState<BreathPhase>('idle');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(4);
  const [cycleCount, setCycleCount] = useState<number>(1);
  const totalCycles = 4;
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Audio Cue State (defaults to true for immediate out-of-the-box acoustic guidance)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('grid_breathing_sound_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [cueStyle, setCueStyle] = useState<AudioCueStyle>(() => {
    try {
      const stored = localStorage.getItem('grid_breathing_cue_style');
      return (stored === 'gong' || stored === 'hum' || stored === 'bell') ? stored : 'gong';
    } catch {
      return 'gong';
    }
  });

  const [cueVolume, setCueVolume] = useState<number>(65);
  const [showAudioControls, setShowAudioControls] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  const { isWhiteTheme } = useTheme();

  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Auto-dismiss celebration after 4.5 seconds
  useEffect(() => {
    if (showCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showCelebration]);

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('grid_breathing_sound_enabled', nextVal.toString());
    } catch {
      // Ignore
    }
  };

  const handleCueStyleChange = (style: AudioCueStyle) => {
    setCueStyle(style);
    try {
      localStorage.setItem('grid_breathing_cue_style', style);
    } catch {
      // Ignore
    }
  };

  const phaseConfig = {
    idle: {
      name: 'READY',
      duration: 0,
      instruction: 'Tap Start to initiate 4-7-8 vagal coherence',
      color: isWhiteTheme ? '#64748b' : '#8fa8cc',
      strokeColor: isWhiteTheme ? '#cbd5e1' : '#25354d',
      glowColor: isWhiteTheme ? 'rgba(100, 116, 139, 0.15)' : 'rgba(143, 168, 204, 0.2)',
    },
    inhale: {
      name: 'INHALE',
      duration: 4,
      instruction: 'Inhale deeply & silently through nose',
      color: isWhiteTheme ? '#0284c7' : '#00ffcc',
      strokeColor: isWhiteTheme ? '#0284c7' : '#00ffcc',
      glowColor: isWhiteTheme ? 'rgba(2, 132, 199, 0.35)' : 'rgba(0, 255, 204, 0.45)',
    },
    hold: {
      name: 'HOLD',
      duration: 7,
      instruction: 'Retain breath & steady your core',
      color: isWhiteTheme ? '#d97706' : '#ffaa00',
      strokeColor: isWhiteTheme ? '#d97706' : '#ffaa00',
      glowColor: isWhiteTheme ? 'rgba(217, 119, 6, 0.35)' : 'rgba(255, 170, 0, 0.45)',
    },
    exhale: {
      name: 'EXHALE',
      duration: 8,
      instruction: 'Exhale completely via mouth with steady release',
      color: isWhiteTheme ? '#16a34a' : '#38ef7d',
      strokeColor: isWhiteTheme ? '#16a34a' : '#38ef7d',
      glowColor: isWhiteTheme ? 'rgba(22, 163, 74, 0.35)' : 'rgba(56, 239, 125, 0.45)',
    },
  };

  // =========================================================================
  // ORGANIC LOW-FREQUENCY GONG / HUM SYNTHESIS ENGINE FOR PHASE TRANSITIONS
  // =========================================================================
  const playTransitionCue = useCallback((targetPhase: 'inhale' | 'hold' | 'exhale' | 'complete') => {
    if (!soundEnabled) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      const vol = (cueVolume / 100) * 0.16;

      // Resonant Lowpass Filter to give warm acoustic, non-piercing character
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = cueStyle === 'gong' ? 2.5 : (cueStyle === 'bell' ? 4.0 : 1.5);

      let baseFreq = 216;
      let harmonicFreq = 432;
      let decayTime = 1.0;
      let oscType: OscillatorType = cueStyle === 'gong' ? 'triangle' : 'sine';

      if (targetPhase === 'inhale') {
        // Breath-in: Warm rising resonant hum signaling expansion
        baseFreq = cueStyle === 'gong' ? 180 : 216;
        harmonicFreq = baseFreq * 2;
        filter.frequency.setValueAtTime(380, now);
        filter.frequency.exponentialRampToValueAtTime(750, now + 0.35);
        decayTime = 0.9;
      } else if (targetPhase === 'hold') {
        // Hold: Grounded centering Tibetan bowl / bell harmonic
        baseFreq = cueStyle === 'gong' ? 144 : 174;
        harmonicFreq = baseFreq * 2;
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.6);
        decayTime = 0.95;
      } else if (targetPhase === 'exhale') {
        // Release: Deep soothing low-frequency gong with slow reverberation
        baseFreq = cueStyle === 'gong' ? 108 : 136.1; // Deep 108Hz low gong fundamental
        harmonicFreq = baseFreq * 2;
        filter.frequency.setValueAtTime(360, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 1.2);
        decayTime = 1.35; // Gentle long release
      } else if (targetPhase === 'complete') {
        // Completion: Harmonic shimmer chord
        baseFreq = 432;
        harmonicFreq = 528;
        filter.frequency.setValueAtTime(900, now);
        decayTime = 1.6;
      }

      // Oscillator 1: Fundamental hum / gong resonance
      const osc1 = ctx.createOscillator();
      osc1.type = oscType;
      osc1.frequency.setValueAtTime(baseFreq, now);

      // Oscillator 2: Overtone harmonic singing bowl
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(harmonicFreq, now);

      // Subtle organic pitch settling on gong release
      if (cueStyle === 'gong' && targetPhase === 'exhale') {
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.97, now + decayTime);
      }

      // Smooth Envelope: Gentle attack (prevents clicks), warm swell, natural decay
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(vol, now + 0.045);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + decayTime + 0.1);
      osc2.stop(now + decayTime + 0.1);
    } catch {
      // Audio policy fallback
    }
  }, [soundEnabled, cueVolume, cueStyle]);

  // Main countdown tick engine (100ms resolution)
  useEffect(() => {
    if (!isActive || isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        const next = Math.max(0, parseFloat((prev - 0.1).toFixed(1)));

        if (next <= 0) {
          if (phase === 'inhale') {
            setPhase('hold');
            playTransitionCue('hold');
            return phaseConfig.hold.duration;
          } else if (phase === 'hold') {
            setPhase('exhale');
            playTransitionCue('exhale');
            return phaseConfig.exhale.duration;
          } else if (phase === 'exhale') {
            if (cycleCount >= totalCycles) {
              setIsActive(false);
              setIsCompleted(true);
              setPhase('idle');
              playTransitionCue('complete');
              setShowCelebration(true);
              if (onCompleteCycle) onCompleteCycle(cycleCount);
              if (onLogRoutine) onLogRoutine();
              return 0;
            } else {
              setCycleCount((c) => c + 1);
              setPhase('inhale');
              playTransitionCue('inhale');
              return phaseConfig.inhale.duration;
            }
          }
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase, cycleCount, totalCycles, isCompleted, playTransitionCue, onCompleteCycle, onLogRoutine, phaseConfig]);

  const handleStart = () => {
    setShowCelebration(false);
    if (isCompleted) {
      setIsCompleted(false);
      setCycleCount(1);
    }
    if (phase === 'idle') {
      setPhase('inhale');
      setTimeRemaining(phaseConfig.inhale.duration);
      playTransitionCue('inhale');
    }
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setShowCelebration(false);
    setPhase('idle');
    setTimeRemaining(phaseConfig.inhale.duration);
    setCycleCount(1);
    setIsCompleted(false);
  };

  // Ring geometry
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  const currentTotal = phase === 'idle' ? 4 : phaseConfig[phase].duration;
  const progressRatio = phase === 'idle' ? 0 : Math.max(0, Math.min(1, (currentTotal - timeRemaining) / currentTotal));
  const strokeDashoffset = circumference - (progressRatio * circumference);

  let orbScale = 0.85;
  if (phase === 'inhale') {
    orbScale = 0.65 + (progressRatio * 0.5);
  } else if (phase === 'hold') {
    orbScale = 1.15;
  } else if (phase === 'exhale') {
    orbScale = 1.15 - (progressRatio * 0.5);
  }

  const currentConfig = phaseConfig[phase];
  const isPaused = !isActive && phase !== 'idle' && !isCompleted;

  return (
    <div className={`rounded p-3 border relative overflow-hidden transition-colors ${
      isWhiteTheme
        ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
        : 'bg-[#050913] border-[#162438] text-[#c0d4ec]'
    }`}>
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: isWhiteTheme
            ? `
              radial-gradient(circle at 50% 50%, rgba(2, 132, 199, 0.08) 0%, transparent 70%),
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `
            : `
              radial-gradient(circle at 50% 50%, rgba(0, 255, 204, 0.15) 0%, transparent 70%),
              linear-gradient(to right, #1a2a40 1px, transparent 1px),
              linear-gradient(to bottom, #1a2a40 1px, transparent 1px)
            `,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px'
        }}
      />

      {/* Header & Controls bar */}
      <div className={`flex items-center justify-between mb-2 border-b pb-2 relative z-10 flex-wrap gap-2 ${
        isWhiteTheme ? 'border-slate-100' : 'border-[#121c2c]'
      }`}>
        <div className="flex items-center gap-2">
          <Wind className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
          <div>
            <span className={`text-xs font-bold tracking-wider font-mono ${
              isWhiteTheme ? 'text-slate-900' : 'text-white'
            }`}>
              4-7-8 VAGAL COHERENCE TIMER
            </span>
            <div className={`text-[10px] font-mono ${isWhiteTheme ? 'text-slate-500' : 'text-[#637d9f]'}`}>
              PARASYMPATHETIC RESET · 19s PER CYCLE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Subtle Audio Cue Toggle with Status Badge */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-bold transition-all cursor-pointer ${
              soundEnabled
                ? (isWhiteTheme
                    ? 'bg-sky-100 border-[#0284c7] text-[#0284c7] shadow-xs'
                    : 'bg-[#00ffcc]/15 border-[#00ffcc]/50 text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.25)]')
                : (isWhiteTheme
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-[#0d1624] border-[#1d2d42] text-[#627a99]')
            }`}
            title="Toggle subtle transition hum & gong audio cue"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>CUE: {soundEnabled ? cueStyle.toUpperCase() : 'MUTED'}</span>
          </button>

          {/* Audio Cue Customizer Cog */}
          <button
            onClick={() => setShowAudioControls(!showAudioControls)}
            className={`p-1.5 rounded border text-xs font-mono transition-colors cursor-pointer ${
              showAudioControls
                ? (isWhiteTheme ? 'bg-sky-200 text-sky-900 border-sky-400' : 'bg-[#15273d] text-[#00e1ff] border-cyan-500')
                : (isWhiteTheme ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0d1624] border-[#1d2d42] text-[#8fa8cc]')
            }`}
            title="Customize audio cue tone & volume"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Reset Sequence */}
          <button
            onClick={handleReset}
            className={`p-1.5 rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                : 'bg-[#0d1624] hover:bg-[#142236] border-[#1d2d42] text-[#8fa8cc] hover:text-white'
            }`}
            title="Reset Breathing Sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Audio Cue Settings & Preview Tray */}
      {showAudioControls && (
        <div className={`p-2.5 rounded-md mb-2.5 border text-xs font-mono relative z-10 transition-all ${
          isWhiteTheme ? 'bg-sky-50/80 border-sky-200 text-slate-800' : 'bg-[#091526] border-[#1b3454] text-[#c0d4ec]'
        }`}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <Music className="w-3.5 h-3.5 text-sky-500" />
              <span>PHASE TRANSITION AUDIO CUE SYNTHESIS</span>
            </div>

            <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#7090b8]'}`}>
              ACOUSTIC ENTRAINMENT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Tone Style Selector */}
            <div>
              <span className={`block text-[10px] font-bold mb-1 ${isWhiteTheme ? 'text-slate-600' : 'text-[#85a3c9]'}`}>
                CUE TONE PROFILE:
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: 'gong' as const, label: 'LOW GONG (108Hz)' },
                  { id: 'hum' as const, label: 'WARM HUM (216Hz)' },
                  { id: 'bell' as const, label: 'TIBETAN BELL' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleCueStyleChange(preset.id)}
                    className={`px-2 py-1 text-[9px] rounded border font-bold cursor-pointer transition-colors ${
                      cueStyle === preset.id
                        ? (isWhiteTheme ? 'bg-sky-600 text-white border-sky-600' : 'bg-[#00ffcc] text-slate-950 border-[#00ffcc]')
                        : (isWhiteTheme ? 'bg-white border-slate-300 text-slate-700' : 'bg-[#0d1c30] border-[#1d3554] text-[#8fa8cc]')
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume & Test Action */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${isWhiteTheme ? 'text-slate-600' : 'text-[#85a3c9]'}`}>
                  VOL:
                </span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={cueVolume}
                  onChange={(e) => setCueVolume(parseInt(e.target.value, 10))}
                  className="w-20 accent-sky-600 cursor-pointer"
                />
                <span className="text-[10px] font-bold w-6">{cueVolume}%</span>
              </div>

              {/* Instant Cue Preview Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => playTransitionCue('inhale')}
                  className={`px-2 py-1 rounded text-[9px] font-bold border cursor-pointer ${
                    isWhiteTheme ? 'bg-white hover:bg-sky-100 border-sky-300 text-sky-800' : 'bg-[#10243d] hover:bg-[#18365c] border-cyan-500/40 text-cyan-300'
                  }`}
                  title="Test Breath-in audio cue"
                >
                  TEST INHALE
                </button>
                <button
                  onClick={() => playTransitionCue('exhale')}
                  className={`px-2 py-1 rounded text-[9px] font-bold border cursor-pointer ${
                    isWhiteTheme ? 'bg-white hover:bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-[#10243d] hover:bg-[#18365c] border-emerald-500/40 text-emerald-300'
                  }`}
                  title="Test Release gong audio cue"
                >
                  TEST GONG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Visual Display Stage */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2 relative z-10">
        {/* Animated Progress Ring & Orb */}
        <div className="relative w-[150px] h-[150px] flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 150 150">
            {/* Outer Subtle Dial Calibration Ring */}
            <circle
              cx="75"
              cy="75"
              r="70"
              fill="none"
              stroke={isWhiteTheme ? '#e2e8f0' : '#0f1928'}
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            {/* Base Background Track Ring */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={isWhiteTheme ? '#f1f5f9' : '#111c2e'}
              strokeWidth="7"
            />

            {/* Active Dynamic Progress Ring */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={isCompleted ? (isWhiteTheme ? '#10b981' : '#38ef7d') : currentConfig.strokeColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={isCompleted ? 0 : strokeDashoffset}
              className="breathing-ring-progress"
              style={{
                filter: isCompleted
                  ? (isWhiteTheme ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))' : 'drop-shadow(0 0 8px rgba(56, 239, 125, 0.6))')
                  : `drop-shadow(0 0 6px ${currentConfig.glowColor})`,
                transition: 'stroke-dashoffset 0.8s linear, stroke 1.5s ease'
              }}
            />
          </svg>

          {/* Center Resonant Breathing Orb (Slower, meditative transition pace) */}
          <div
            className="absolute rounded-full pointer-events-none breathing-orb flex items-center justify-center"
            style={{
              width: '88px',
              height: '88px',
              transform: `scale(${orbScale})`,
              transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1), background 2.5s ease-in-out, box-shadow 2.5s ease-in-out, border-color 2.5s ease-in-out',
              background: isCompleted
                ? (isWhiteTheme
                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(248, 250, 252, 0.95) 75%)'
                    : 'radial-gradient(circle, rgba(56, 239, 125, 0.45) 0%, rgba(7, 14, 26, 0.85) 75%)')
                : (isWhiteTheme
                    ? `radial-gradient(circle, ${currentConfig.glowColor} 0%, rgba(248, 250, 252, 0.95) 75%)`
                    : `radial-gradient(circle, ${currentConfig.glowColor} 0%, rgba(7, 14, 26, 0.85) 75%)`),
              border: `1px solid ${isCompleted ? (isWhiteTheme ? '#10b981' : '#38ef7d') : currentConfig.strokeColor}`,
              boxShadow: isCompleted
                ? (isWhiteTheme ? '0 0 24px rgba(16, 185, 129, 0.5)' : '0 0 28px rgba(56, 239, 125, 0.6)')
                : `0 0 14px ${currentConfig.glowColor}`
            }}
          />

          {/* Center Display: Circular Resume Button Integrated with Countdown OR Digital Telemetry Readout */}
          {isPaused ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
              <button
                onClick={handleStart}
                className={`group w-[84px] h-[84px] rounded-full flex flex-col items-center justify-center shadow-xl transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer border ring-4 ring-offset-2 backdrop-blur-md relative ${
                  isWhiteTheme
                    ? 'bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white border-sky-300 ring-[#0284c7]/25 ring-offset-white shadow-sky-300/40'
                    : 'bg-gradient-to-br from-[#00ffcc] to-[#00b4d8] text-slate-950 border-cyan-300 ring-[#00ffcc]/30 ring-offset-[#050913] shadow-[0_0_24px_rgba(0,255,204,0.45)]'
                }`}
                title="Resume 4-7-8 Breathing Protocol"
              >
                {/* Subtle pulsating outer halo */}
                <span className="absolute inset-0 rounded-full border border-current opacity-30 animate-ping pointer-events-none" />

                <Play className="w-6 h-6 fill-current ml-0.5 mb-0.5 transition-transform group-hover:scale-110 shrink-0" />
                <span className="text-[9px] font-mono font-black tracking-widest uppercase leading-none">
                  RESUME
                </span>
                <span className="text-[8px] font-mono font-bold opacity-85 mt-0.5">
                  {Math.ceil(timeRemaining)}s left
                </span>
              </button>

              {/* Integrated countdown & phase indicator pill below circular button */}
              <div className={`mt-1.5 px-2 py-0.5 rounded-full border text-[8px] font-mono font-bold flex items-center gap-1 shadow-xs ${
                isWhiteTheme
                  ? 'bg-white/95 border-slate-200 text-slate-700'
                  : 'bg-[#091424]/95 border-[#1a2d48] text-cyan-300'
              }`}>
                <span className="opacity-70">PAUSED AT</span>
                <span className="font-black text-amber-500">{Math.ceil(timeRemaining)}s</span>
                <span className="opacity-70 uppercase">({currentConfig.name})</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-20">
              <span
                className="text-[10px] font-mono font-bold tracking-widest uppercase transition-colors"
                style={{ color: isCompleted ? (isWhiteTheme ? '#10b981' : '#38ef7d') : currentConfig.color }}
              >
                {isCompleted ? 'COMPLETE' : currentConfig.name}
              </span>

              <span className={`text-2xl font-black font-mono tabular-nums my-0.5 tracking-tight ${
                isWhiteTheme ? 'text-slate-900' : 'text-white'
              }`}>
                {isCompleted ? '✓' : Math.ceil(timeRemaining)}
                {!isCompleted && <span className={`text-[10px] font-normal ml-0.5 ${
                  isWhiteTheme ? 'text-slate-400' : 'text-[#6f8baa]'
                }`}>s</span>}
              </span>

              <span className={`text-[9px] font-mono tracking-tighter ${
                isWhiteTheme ? 'text-slate-500' : 'text-[#7a96b9]'
              }`}>
                {isCompleted ? 'RESTORED' : `${currentTotal}s TOTAL`}
              </span>
            </div>
          )}
        </div>

        {/* Phase Guide & Metrics Status Column */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-2.5">
          {/* Phase Sequence Chips with Tone Icons */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className={`p-1.5 rounded border transition-all ${
              phase === 'inhale'
                ? (isWhiteTheme
                    ? 'bg-sky-50 border-[#0284c7] text-[#0284c7] font-bold shadow-sm'
                    : 'bg-[#00ffcc]/15 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.3)] font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-[#0a1120] border-[#162338] text-[#556e8e]')
            }`}>
              <div className="text-[9px] flex items-center justify-center gap-1">
                <span>STEP 1</span>
                {soundEnabled && <Music className="w-2.5 h-2.5 opacity-70" />}
              </div>
              <div className="text-[10px]">INHALE 4s</div>
            </div>

            <div className={`p-1.5 rounded border transition-all ${
              phase === 'hold'
                ? (isWhiteTheme
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold shadow-sm'
                    : 'bg-[#ffaa00]/15 border-[#ffaa00] text-[#ffaa00] shadow-[0_0_8px_rgba(255,170,0,0.3)] font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-[#0a1120] border-[#162338] text-[#556e8e]')
            }`}>
              <div className="text-[9px] flex items-center justify-center gap-1">
                <span>STEP 2</span>
                {soundEnabled && <Music className="w-2.5 h-2.5 opacity-70" />}
              </div>
              <div className="text-[10px]">HOLD 7s</div>
            </div>

            <div className={`p-1.5 rounded border transition-all ${
              phase === 'exhale'
                ? (isWhiteTheme
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm'
                    : 'bg-[#38ef7d]/15 border-[#38ef7d] text-[#38ef7d] shadow-[0_0_8px_rgba(56,239,125,0.3)] font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-[#0a1120] border-[#162338] text-[#556e8e]')
            }`}>
              <div className="text-[9px] flex items-center justify-center gap-1">
                <span>STEP 3</span>
                {soundEnabled && <Music className="w-2.5 h-2.5 opacity-70" />}
              </div>
              <div className="text-[10px]">EXHALE 8s</div>
            </div>
          </div>

          {/* Active Phase Live Directive */}
          <div className={`p-2 rounded border transition-colors ${
            isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#09101d] border-[#16253c]'
          }`}>
            <div className={`text-[9px] font-mono font-bold uppercase mb-0.5 flex items-center justify-between ${
              isWhiteTheme ? 'text-slate-500' : 'text-[#587394]'
            }`}>
              <span>CURRENT DIRECTIVE</span>
              {soundEnabled && (
                <span className="text-[8px] text-sky-500 flex items-center gap-0.5">
                  <Volume2 className="w-2.5 h-2.5" />
                  AUDIO CUE ACTIVE
                </span>
              )}
            </div>
            <div className={`text-xs font-mono leading-tight ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#d2e2f5]'
            }`}>
              {isCompleted ? 'Vagal coherence attained. Autonomic balance restored.' : currentConfig.instruction}
            </div>
          </div>

          {/* Cycle Meter & Target Vagal Heart Rate Projection */}
          <div className={`flex items-center justify-between text-[10px] font-mono px-2.5 py-1.5 rounded border transition-colors ${
            isWhiteTheme ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#09101d] border-[#16253c]'
          }`}>
            <div>
              <span className={isWhiteTheme ? 'text-slate-500' : 'text-[#587394]'}>CYCLE: </span>
              <span className={`font-bold ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>{cycleCount}</span>
              <span className={isWhiteTheme ? 'text-slate-500' : 'text-[#587394]'}> / {totalCycles}</span>
            </div>

            <div className="flex items-center gap-1">
              {[...Array(totalCycles)].map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full inline-block transition-colors ${
                    i + 1 < cycleCount || isCompleted
                      ? (isWhiteTheme ? 'bg-[#0284c7]' : 'bg-[#00ffcc] shadow-[0_0_4px_#00ffcc]')
                      : i + 1 === cycleCount && isActive
                      ? (isWhiteTheme ? 'bg-amber-500 animate-pulse' : 'bg-[#ffaa00] animate-pulse')
                      : (isWhiteTheme ? 'bg-slate-300' : 'bg-[#18273b]')
                  }`}
                />
              ))}
            </div>

            <div className={`flex items-center gap-1 font-bold ${
              isWhiteTheme ? 'text-emerald-700' : 'text-[#38ef7d]'
            }`}>
              <Heart className="w-3 h-3 fill-current" />
              <span>~{Math.max(56, currentHeartRate - (isCompleted ? 8 : (cycleCount - 1) * 2))} BPM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className={`mt-2.5 p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10 font-mono ${
          isWhiteTheme
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
            : 'bg-[#031d15] border-[#38ef7d]/50'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isWhiteTheme ? 'text-emerald-600' : 'text-[#38ef7d]'}`} />
            <div>
              <div className={`text-xs font-bold ${isWhiteTheme ? 'text-emerald-950' : 'text-white'}`}>
                4-7-8 CALIBRATION COMPLETE
              </div>
              <div className={`text-[10px] ${isWhiteTheme ? 'text-emerald-700' : 'text-[#71cf9a]'}`}>
                Vagus nerve reset logged to encrypted store
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setShowCelebration(true)}
              className={`px-2 py-1 text-[9px] font-bold rounded cursor-pointer border transition-colors ${
                isWhiteTheme
                  ? 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-[#0b241c] border-[#38ef7d]/40 text-[#38ef7d] hover:bg-[#12362a]'
              }`}
              title="Trigger celebration glow effect"
            >
              ✨ REPLAY GLOW
            </button>

            <button
              onClick={handleStart}
              className={`px-2.5 py-1 font-bold text-[10px] rounded cursor-pointer ${
                isWhiteTheme
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-[#38ef7d] text-[#060b13] hover:bg-[#52f390]'
              }`}
            >
              REPEAT
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Controls Bar */}
      <div className={`mt-2.5 pt-2 border-t flex items-center gap-2 relative z-10 ${
        isWhiteTheme ? 'border-slate-100' : 'border-[#121c2c]'
      }`}>
        {isPaused ? (
          <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
            <span className={`text-[10px] font-mono flex items-center gap-1.5 ${
              isWhiteTheme ? 'text-slate-500' : 'text-[#728fae]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>TIMER PAUSED · TAP CIRCLE IN CENTER TO RESUME</span>
            </span>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={handleReset}
                className={`px-2.5 py-1.5 font-bold font-mono text-[10px] rounded cursor-pointer border transition-colors flex items-center gap-1 ${
                  isWhiteTheme
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-[#0d1624] hover:bg-[#152438] border-[#1d2d42] text-[#8fa8cc]'
                }`}
                title="Reset session"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET</span>
              </button>

              <button
                onClick={handleStart}
                className={`px-3 py-1.5 font-bold font-mono text-[10px] rounded cursor-pointer flex items-center gap-1 transition-all ${
                  isWhiteTheme
                    ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs'
                    : 'bg-[#00ffcc] hover:bg-[#33ffdd] text-[#060a13] shadow-[0_0_8px_rgba(0,255,204,0.3)]'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>RESUME</span>
              </button>
            </div>
          </div>
        ) : !isActive ? (
          <button
            onClick={handleStart}
            className={`flex-1 py-2 px-3 font-bold font-mono text-xs rounded cursor-pointer flex items-center justify-center gap-2 transition-all ${
              isWhiteTheme
                ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sm active:scale-98'
                : 'bg-[#00ffcc] hover:bg-[#33ffdd] text-[#060a13] shadow-[0_0_12px_rgba(0,255,204,0.3)] active:scale-98'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isCompleted ? 'START NEW 4-CYCLE SESSION' : 'START 4-7-8 PROTOCOL'}</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className={`flex-1 py-2 px-3 font-bold font-mono text-xs rounded cursor-pointer flex items-center justify-center gap-2 transition-all ${
              isWhiteTheme
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm active:scale-98'
                : 'bg-[#ffaa00] hover:bg-[#ffbb22] text-[#060a13] shadow-[0_0_12px_rgba(255,170,0,0.3)] active:scale-98'
            }`}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE BREATHING TIMER</span>
          </button>
        )}
      </div>

      {/* Subtle Confetti and Ambient Screen Glow Celebration Overlay */}
      {showCelebration && (
        <CelebrationGlow onDismiss={() => setShowCelebration(false)} />
      )}
    </div>
  );
}
