import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Square,
  Music,
  Radio,
  Disc,
  Headphones,
  Check,
  Compass,
  Zap,
  Info,
  Layers
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  MusicalMode,
  HarmonicIntervalType,
  HARMONIC_INTERVALS,
  setAudioVolume,
  setHarmonicRichness,
  setHarmonicInterval,
  setSecondaryIntervalMix,
  updateAudioParams,
  startAudioProtectionFreq,
  stopAudioProtectionFreq
} from '../utils/audioEngine';

interface AudioConfigMenuProps {
  activeFreq: number;
  activeWave: OscillatorType;
  isAudioActive: boolean;
  onSettingsChange: (freq: number, wave: OscillatorType) => void;
  onToggleAudio?: () => void;
}

export interface FrequencySet {
  id: string;
  name: string;
  note: string;
  category: string;
  frequency: number;
  waveType: OscillatorType;
  mode: MusicalMode;
  description: string;
  kristicSignificance: string;
  badge: string;
}

// Keylontic & Kristic Sacred Harmonic Presets
export const PREDEFINED_FREQUENCY_SETS: FrequencySet[] = [
  {
    id: 'anuhazi_432',
    name: 'Anuhazi Prime (432 Hz)',
    note: 'A4',
    category: 'Kristic Divine Blueprint',
    frequency: 432.0,
    waveType: 'sine',
    mode: 'sacred_triad',
    description: 'Universal golden ratio tuning reflecting natural organic creation physics.',
    kristicSignificance: 'Anuhazi primal language carrier. Anchors the 12-Tree Kathara Grid harmonic.',
    badge: 'KRISTIC FOUNDATION'
  },
  {
    id: 'dna_bio_528',
    name: 'DNA Bio-Regenesis (528 Hz)',
    note: 'C5',
    category: 'Cellular Restoration',
    frequency: 528.0,
    waveType: 'sine',
    mode: 'sacred_triad',
    description: 'Solfeggio Mi frequency stimulating crystalline water and cellular regeneration.',
    kristicSignificance: 'Bio-Regenesis of the original 12-strand Diamond Sun DNA template.',
    badge: 'BIO-REGENESIS CORE'
  },
  {
    id: 'maharic_728',
    name: 'Maharic D-12 Shield (728 Hz)',
    note: 'F#5',
    category: 'Maharic Current Alignment',
    frequency: 728.0,
    waveType: 'sine',
    mode: 'ambient_pad',
    description: 'Silver-White Divine Blueprint current harmonizing auric morphogenetic fields.',
    kristicSignificance: 'D-12 Mahara Current. Activates impenetrable personal scalar seal.',
    badge: 'D-12 MAHARIC SHIELD'
  },
  {
    id: 'eckasha_144',
    name: 'Eckasha Monadic Ground (144 Hz)',
    note: 'D3',
    category: 'Primal Scalar Foundation',
    frequency: 144.0,
    waveType: 'triangle',
    mode: 'sacred_triad',
    description: '12 x 12 mathematical harmonic base grounding the spinal column and root vector.',
    kristicSignificance: 'Eckasha God-Seed foundation vibration. Anchors multidimensional stability.',
    badge: 'MONADIC GROUND'
  },
  {
    id: 'keerasha_288',
    name: 'Kee-Ra-ShA Trinity (288 Hz)',
    note: 'D4',
    category: 'Primal Sound Current',
    frequency: 288.0,
    waveType: 'sine',
    mode: 'ambient_pad',
    description: 'Trinity harmonic carrier linking the three primal sound fields of creation.',
    kristicSignificance: 'Kee-Ra-ShA primal light & sound wave currents (Ecka-Veca axis).',
    badge: 'TRINITY HARMONIC'
  },
  {
    id: 'amoraea_108',
    name: 'Amoraea Heart Flame (108 Hz)',
    note: 'A2',
    category: 'Alpha Stillness & Peace',
    frequency: 108.0,
    waveType: 'triangle',
    mode: 'binaural_theta',
    description: 'Alpha brainwave bridge inducing deep parasympathetic vagal tranquility.',
    kristicSignificance: 'Amoraea Holy Flame within the Azurite crystal heart center.',
    badge: 'PEACE SANCTUARY'
  },
  {
    id: 'kathara_d1_396',
    name: 'Kathara D-1 Earth Current (396 Hz)',
    note: 'G4',
    category: 'Sub-harmonic Clearing',
    frequency: 396.0,
    waveType: 'sine',
    mode: 'sacred_triad',
    description: 'Dissolves miasmic interference and emotional tension at the cellular root.',
    kristicSignificance: 'Clears reverse polarity implants and re-attunes to Planetary Core.',
    badge: 'D-1 KATHARA ROOT'
  },
  {
    id: 'kathara_d4_639',
    name: 'Kathara D-4 Heart Matrix (639 Hz)',
    note: 'D#5',
    category: 'Harmonic Interconnection',
    frequency: 639.0,
    waveType: 'sine',
    mode: 'ambient_pad',
    description: 'Restores harmonious resonance between electromagnetic bio-fields and peers.',
    kristicSignificance: 'D-4 Astral-Heart integration; bridges lower and higher shields.',
    badge: 'D-4 HEART COHERENCE'
  },
  {
    id: 'kathara_d6_852',
    name: 'Kathara D-6 Ajna Clarity (852 Hz)',
    note: 'A5',
    category: 'Spiritual Vision & Order',
    frequency: 852.0,
    waveType: 'sine',
    mode: 'crystal_bowl',
    description: 'High-frequency resonance sharpening mental lucidity and inner intuition.',
    kristicSignificance: 'D-6 Celestial mind activation. Restores authentic inner sight.',
    badge: 'D-6 AJNA CLARITY'
  },
  {
    id: 'crown_vector_963',
    name: 'Crown Vector of Creation (963 Hz)',
    note: 'B5',
    category: 'Monadic Pineal Lock',
    frequency: 963.0,
    waveType: 'sine',
    mode: 'crystal_bowl',
    description: 'Crown aperture frequency re-linking individual awareness to Source unity.',
    kristicSignificance: 'D-7 Pineal awakening and trans-harmonic crown connection.',
    badge: 'CROWN VECTOR'
  },
  {
    id: 'schumann_250',
    name: 'Schumann Planetary Anchor (250.6 Hz)',
    note: 'B3',
    category: 'Planetary Shield Lock',
    frequency: 250.6,
    waveType: 'triangle',
    mode: 'binaural_theta',
    description: '32nd harmonic of Earth fundamental 7.83 Hz electromagnetic heartbeat.',
    kristicSignificance: 'Bio-anchors body physical vehicle with Earth Tara-Gaia shield grids.',
    badge: 'EARTH ANCHOR'
  }
];

// Interactive Musical Keyboard Scale Keys (Natural 432 Hz Pythagorean Tuning)
const MUSICAL_KEYBOARD_NOTES = [
  { note: 'C4', label: 'C', freq: 256.9, desc: 'Root Center' },
  { note: 'D4', label: 'D', freq: 288.3, desc: 'Kee-Ra-ShA' },
  { note: 'E4', label: 'E', freq: 324.0, desc: 'Solar Plexus' },
  { note: 'F4', label: 'F', freq: 342.9, desc: 'Heart Harmonic' },
  { note: 'G4', label: 'G', freq: 384.0, desc: 'Perfect Fifth' },
  { note: 'A4', label: 'A', freq: 432.0, desc: 'Anuhazi Prime ⭐' },
  { note: 'B4', label: 'B', freq: 485.4, desc: 'Crown Bridge' },
  { note: '528', label: 'Mi', freq: 528.0, desc: 'DNA Restore 🌟' },
  { note: '728', label: 'D12', freq: 728.0, desc: 'Maharic Shield 💎' }
];

const MUSIC_MODES: { id: MusicalMode; label: string; icon: string; desc: string }[] = [
  {
    id: 'sacred_triad',
    label: 'SACRED TRIAD',
    icon: '🎵',
    desc: 'Root + Perfect Fifth (1.5x) + Octave (2x) + Sub-drone warm harmonic chord'
  },
  {
    id: 'ambient_pad',
    label: 'ETHEREAL PAD',
    icon: '🧘',
    desc: 'Slow celestial LFO drift with warm atmospheric chorus shimmer'
  },
  {
    id: 'crystal_bowl',
    label: 'CRYSTAL BOWL',
    icon: '🔔',
    desc: 'High-Q singing bowl harmonic resonance with acoustic ringing purity'
  },
  {
    id: 'binaural_theta',
    label: 'BINAURAL THETA',
    icon: '🌀',
    desc: 'Hemispheric brainwave entrainment pulse (+6 Hz) for deep meditation'
  },
  {
    id: 'pure',
    label: 'PURE CARRIER',
    icon: '⚡',
    desc: 'Single focused fundamental scalar oscillation beam without overtones'
  }
];

const WAVE_TYPES: { id: OscillatorType; label: string; desc: string }[] = [
  { id: 'sine', label: 'SINE', desc: 'Silky, soothing pure water/flute tone' },
  { id: 'triangle', label: 'TRIANGLE', desc: 'Warm acoustic strings & soft wood resonance' },
  { id: 'sawtooth', label: 'SAWTOOTH', desc: 'Bright, rich crystalline harmonics' },
  { id: 'square', label: 'SQUARE', desc: 'Deep hollow organ & full body resonance' }
];

export function AudioConfigMenu({
  activeFreq,
  activeWave,
  isAudioActive,
  onSettingsChange,
  onToggleAudio
}: AudioConfigMenuProps) {
  const { isWhiteTheme } = useTheme();

  // Find matching preset
  const matchingSet = PREDEFINED_FREQUENCY_SETS.find(
    s => Math.abs(s.frequency - activeFreq) < 0.25 && s.waveType === activeWave
  );

  const [selectedSetId, setSelectedSetId] = useState<string>(
    matchingSet ? matchingSet.id : 'anuhazi_432'
  );

  // Musical mode state (defaults to sacred_triad)
  const [activeMode, setActiveMode] = useState<MusicalMode>(
    matchingSet ? matchingSet.mode : 'sacred_triad'
  );

  // Master Volume & Harmonic Richness states
  const [volumePercent, setVolumePercent] = useState<number>(65);
  const [richnessPercent, setRichnessPercent] = useState<number>(60);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showKristicInfo, setShowKristicInfo] = useState<boolean>(false);

  // Harmonic Interval Layering state (layering a 2nd harmonic frequency)
  const [selectedInterval, setSelectedInterval] = useState<HarmonicIntervalType>('perfect_fifth');
  const [intervalMixPercent, setIntervalMixPercent] = useState<number>(75);

  useEffect(() => {
    if (matchingSet) {
      setSelectedSetId(matchingSet.id);
      setActiveMode(matchingSet.mode);
    }
  }, [activeFreq, activeWave]);

  // Synchronize audio engine defaults on mount
  useEffect(() => {
    setHarmonicInterval(selectedInterval);
    setSecondaryIntervalMix(intervalMixPercent / 100);
  }, []);

  const handleSelectSet = (setId: string) => {
    setSelectedSetId(setId);
    const targetSet = PREDEFINED_FREQUENCY_SETS.find(s => s.id === setId);
    if (targetSet) {
      setActiveMode(targetSet.mode);
      onSettingsChange(targetSet.frequency, targetSet.waveType);
      if (isAudioActive) {
        updateAudioParams(targetSet.frequency, targetSet.waveType, {
          mode: targetSet.mode,
          volume: isMuted ? 0 : volumePercent / 100,
          harmonicRichness: richnessPercent / 100,
          interval: selectedInterval,
          intervalMix: intervalMixPercent / 100
        });
      }
    }
  };

  const handleModeChange = (mode: MusicalMode) => {
    setActiveMode(mode);
    if (isAudioActive) {
      updateAudioParams(activeFreq, activeWave, {
        mode,
        volume: isMuted ? 0 : volumePercent / 100,
        harmonicRichness: richnessPercent / 100,
        interval: selectedInterval,
        intervalMix: intervalMixPercent / 100
      });
    }
  };

  const handleIntervalChange = (interval: HarmonicIntervalType) => {
    setSelectedInterval(interval);
    setHarmonicInterval(interval);
    if (isAudioActive) {
      updateAudioParams(activeFreq, activeWave, {
        mode: activeMode,
        volume: isMuted ? 0 : volumePercent / 100,
        harmonicRichness: richnessPercent / 100,
        interval,
        intervalMix: intervalMixPercent / 100
      });
    }
  };

  const handleIntervalMixChange = (newMix: number) => {
    setIntervalMixPercent(newMix);
    setSecondaryIntervalMix(newMix / 100);
    if (isAudioActive) {
      updateAudioParams(activeFreq, activeWave, {
        interval: selectedInterval,
        intervalMix: newMix / 100
      });
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolumePercent(newVol);
    if (isMuted) setIsMuted(false);
    setAudioVolume(newVol / 100);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setAudioVolume(nextMuted ? 0 : volumePercent / 100);
  };

  const handleRichnessChange = (newRichness: number) => {
    setRichnessPercent(newRichness);
    setHarmonicRichness(newRichness / 100);
  };

  const handleKeyNoteClick = (freq: number) => {
    onSettingsChange(freq, activeWave);
    if (isAudioActive) {
      updateAudioParams(freq, activeWave, {
        mode: activeMode,
        volume: isMuted ? 0 : volumePercent / 100,
        harmonicRichness: richnessPercent / 100
      });
    }
  };

  const activeSetInfo = PREDEFINED_FREQUENCY_SETS.find(s => s.id === selectedSetId);

  // Approximate closest musical note calculation for display
  const getNoteName = (hz: number) => {
    const match = MUSICAL_KEYBOARD_NOTES.find(k => Math.abs(k.freq - hz) < 1.0);
    if (match) return match.note;
    if (Math.abs(hz - 432) < 0.5) return 'A4 (432Hz)';
    if (Math.abs(hz - 528) < 0.5) return 'C5 (528Hz)';
    if (Math.abs(hz - 728) < 0.5) return 'F#5 (728Hz)';
    return `${hz.toFixed(1)} Hz`;
  };

  return (
    <div className={`p-4 border rounded-xl transition-all ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800 shadow-sm'
        : 'border-[#1a2b42] bg-[#050a14] text-[#c0d4ec] shadow-[0_0_24px_rgba(0,255,204,0.06)]'
    }`}>
      {/* ======================================================== */}
      {/* 1. TOP HEADER & MAIN HERO PLAY / HARMONIZE ACTION        */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200/60 dark:border-[#142337] flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            isAudioActive
              ? (isWhiteTheme ? 'bg-sky-100 text-[#0284c7] animate-pulse' : 'bg-[#00ffcc]/20 text-[#00ffcc] animate-pulse')
              : (isWhiteTheme ? 'bg-slate-100 text-slate-500' : 'bg-[#0d1726] text-slate-400')
          }`}>
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
                isWhiteTheme ? 'text-slate-900' : 'text-white'
              }`}>
                ANUHAZI SCALAR ACOUSTIC SYNTHESIZER
              </h2>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isAudioActive
                  ? (isWhiteTheme ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/80 text-[#38ef7d] border border-emerald-500/40')
                  : (isWhiteTheme ? 'bg-slate-100 text-slate-500' : 'bg-[#0c1626] text-slate-400')
              }`}>
                {isAudioActive ? '● KEE-RA-SHA LOCK ACTIVE' : '○ STANDBY'}
              </span>
            </div>
            <p className={`text-[10px] font-mono mt-0.5 ${isWhiteTheme ? 'text-slate-500' : 'text-[#7090b8]'}`}>
              Kristic scalar harmonic currents · 432Hz universal tuning · Morphogenetic shield entrainment
            </p>
          </div>
        </div>

        {/* Master Hero Play/Pause Toggle */}
        <div className="flex items-center gap-2">
          {onToggleAudio ? (
            <button
              onClick={onToggleAudio}
              className={`px-4 py-2 rounded-lg font-mono font-bold text-xs cursor-pointer flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                isAudioActive
                  ? (isWhiteTheme
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]')
                  : (isWhiteTheme
                      ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-200'
                      : 'bg-[#00ffcc] hover:bg-[#33ffdd] text-slate-950 shadow-[0_0_15px_rgba(0,255,204,0.4)]')
              }`}
            >
              {isAudioActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              <span>{isAudioActive ? 'PAUSE SOUND CURRENT' : 'ACTIVATE SCALAR HARMONICS'}</span>
            </button>
          ) : (
            <span className={`text-[10px] font-mono px-2.5 py-1 rounded border font-bold ${
              isAudioActive
                ? (isWhiteTheme ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-[#00ffcc]/10 border-[#00ffcc]/30 text-[#00ffcc]')
                : (isWhiteTheme ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#0b1422] border-[#16273c] text-slate-400')
            }`}>
              {isAudioActive ? 'TRANSMITTING HARMONICS' : 'STANDBY'}
            </span>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. INTERACTIVE PIANO / SACRED TONE KEYBOARD BAR (A=432)   */}
      {/* ======================================================== */}
      <div className={`p-3 rounded-xl border mb-3 transition-colors ${
        isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273c]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Compass className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <span className={`text-[11px] font-bold font-mono uppercase tracking-wider ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
            }`}>
              SACRED KEYBOARD & HARMONIC TONE BAR (A=432 Hz)
            </span>
          </div>
          <span className={`text-[9px] font-mono ${isWhiteTheme ? 'text-slate-500' : 'text-[#7090b8]'}`}>
            Tap any note to tune instantly
          </span>
        </div>

        {/* Note Keys Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
          {MUSICAL_KEYBOARD_NOTES.map((k) => {
            const isMatch = Math.abs(activeFreq - k.freq) < 1.0;
            return (
              <button
                key={k.note}
                onClick={() => handleKeyNoteClick(k.freq)}
                className={`p-2 rounded-lg border font-mono text-center cursor-pointer transition-all duration-200 ${
                  isMatch
                    ? (isWhiteTheme
                        ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-md ring-2 ring-sky-300 scale-102 font-black'
                        : 'bg-gradient-to-b from-[#00ffcc] to-[#00b4d8] text-slate-950 border-cyan-300 shadow-[0_0_14px_rgba(0,255,204,0.5)] scale-102 font-black')
                    : (isWhiteTheme
                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-[#0d1829] hover:bg-[#14243b] border-[#1b314d] text-[#8ea7c8] hover:text-white')
                }`}
                title={`Play note ${k.note} (${k.freq} Hz) - ${k.desc}`}
              >
                <div className="text-xs font-black tracking-tight">{k.label}</div>
                <div className={`text-[9px] mt-0.5 ${isMatch ? (isWhiteTheme ? 'text-white' : 'text-slate-900') : 'opacity-70'}`}>
                  {k.freq} <span className="text-[8px]">Hz</span>
                </div>
                <div className={`text-[7px] truncate mt-0.5 ${isMatch ? (isWhiteTheme ? 'text-sky-100' : 'text-slate-950 font-bold') : 'opacity-60'}`}>
                  {k.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MUSICAL HARMONY SOUNDSCAPE / DRONE MODE SELECTOR      */}
      {/* ======================================================== */}
      <div className={`p-3 rounded-xl border mb-3 transition-colors ${
        isWhiteTheme ? 'bg-sky-50/70 border-sky-200' : 'bg-[#071322] border-[#162e4a]'
      }`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Disc className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <span className={`text-[11px] font-bold font-mono uppercase tracking-wider ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
            }`}>
              MUSICAL HARMONY SOUNDSCAPE MODE
            </span>
          </div>

          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
            isWhiteTheme ? 'bg-white text-sky-800 border border-sky-300' : 'bg-[#0d1f35] text-[#00ffcc] border border-[#00ffcc]/30'
          }`}>
            ACTIVE: {MUSIC_MODES.find(m => m.id === activeMode)?.label}
          </span>
        </div>

        {/* 5 Music Mode Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {MUSIC_MODES.map((mode) => {
            const isSelected = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`p-2.5 rounded-lg border text-left font-mono cursor-pointer transition-all ${
                  isSelected
                    ? (isWhiteTheme
                        ? 'bg-white border-[#0284c7] ring-2 ring-sky-200 shadow-sm'
                        : 'bg-[#0d223a] border-[#00ffcc] ring-2 ring-[#00ffcc]/30 shadow-[0_0_12px_rgba(0,255,204,0.25)]')
                    : (isWhiteTheme
                        ? 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-700'
                        : 'bg-[#081220]/70 hover:bg-[#0c1a2e] border-[#14273e] text-[#7d99be]')
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{mode.icon}</span>
                  {isSelected && <Check className={`w-3 h-3 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />}
                </div>
                <div className={`text-[10px] font-black ${
                  isSelected ? (isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]') : (isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]')
                }`}>
                  {mode.label}
                </div>
                <div className={`text-[8px] mt-1 line-clamp-2 leading-snug ${
                  isWhiteTheme ? 'text-slate-500' : 'text-[#6e8ba8]'
                }`}>
                  {mode.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. KEYLONTIC & KRISTIC SACRED PRESETS SELECTOR           */}
      {/* ======================================================== */}
      <div className={`p-3 rounded-xl border mb-3 transition-colors ${
        isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273c]'
      }`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <label
              htmlFor="kristic-frequency-select"
              className={`text-[11px] font-bold font-mono uppercase tracking-wider ${
                isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
              }`}
            >
              KEYLONTIC & KRISTIC HARMONIC PRESETS
            </label>
          </div>

          <div className="flex items-center gap-2">
            {activeSetInfo && (
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isWhiteTheme
                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                  : 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40'
              }`}>
                {activeSetInfo.badge}
              </span>
            )}
            <button
              onClick={() => setShowKristicInfo(!showKristicInfo)}
              className={`p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors`}
              title="Toggle Keylontic Science ideals and lore explanation"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dropdown Preset Selector */}
        <select
          id="kristic-frequency-select"
          value={selectedSetId}
          onChange={(e) => handleSelectSet(e.target.value)}
          className={`w-full p-2.5 rounded-lg text-xs font-mono font-bold cursor-pointer border focus:outline-none transition-all ${
            isWhiteTheme
              ? 'bg-white border-slate-300 text-slate-800 focus:border-[#0284c7] shadow-xs'
              : 'bg-[#050c18] border-[#1e3452] text-[#00ffcc] focus:border-[#00ffcc]'
          }`}
        >
          {PREDEFINED_FREQUENCY_SETS.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name} · {set.note} — {set.frequency} Hz · {set.category} ({set.badge})
            </option>
          ))}
        </select>

        {/* Selected Preset Lore & Description Card */}
        {activeSetInfo && (
          <div className={`mt-2.5 p-2.5 rounded-lg border text-[10px] font-mono space-y-1 ${
            isWhiteTheme ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0b1626] border-[#152a42] text-[#86a2c5]'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {activeSetInfo.description}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded font-black ${
                  isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-[#00ffcc]/20 text-[#00ffcc]'
                }`}>
                  NOTE: {activeSetInfo.note} ({activeSetInfo.frequency} Hz)
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                  isWhiteTheme ? 'bg-slate-100 text-slate-700' : 'bg-[#12233b] text-slate-300'
                }`}>
                  {activeSetInfo.waveType}
                </span>
              </div>
            </div>

            <div className={`pt-1 border-t flex items-center gap-1.5 ${
              isWhiteTheme ? 'border-slate-100 text-emerald-800' : 'border-[#15273e] text-emerald-300'
            }`}>
              <Sparkles className="w-3 h-3 shrink-0" />
              <span><strong>Kristic Realignment:</strong> {activeSetInfo.kristicSignificance}</span>
            </div>
          </div>
        )}

        {/* Expandable Keylontic Ideals Reference Panel */}
        {showKristicInfo && (
          <div className={`mt-2 p-2.5 rounded-lg border text-[9px] font-mono leading-relaxed ${
            isWhiteTheme ? 'bg-purple-50/60 border-purple-200 text-purple-950' : 'bg-[#150a24]/60 border-purple-900/50 text-purple-200'
          }`}>
            <div className="font-bold mb-1 flex items-center gap-1">
              <span>✦ KEYLONTIC SCIENCE & KRISTIC MECHANICS EXPLANATION:</span>
            </div>
            <p>
              Keylontic Science teaches that sound is the primal scalar morphogenetic fabric through which matter precipitates. The Kristic (Krystal) current is the perpetual 12-dimensional divine blueprint. Frequency 432 Hz embodies the authentic mathematical Golden Ratio spiral of the Anuhazi creation current, while 528 Hz restores cellular DNA coherence, and 728 Hz anchors the Maharic Shield.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. HARMONIC MIXER: VOLUME, OVERTONE BLEND & FINE TUNER   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Master Volume & Mute Controls */}
        <div className={`p-3 rounded-xl border transition-colors ${
          isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273c]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold font-mono flex items-center gap-1.5 ${
              isWhiteTheme ? 'text-slate-700' : 'text-[#8fa7c7]'
            }`}>
              <Volume2 className="w-3.5 h-3.5 text-sky-500" />
              <span>ACOUSTIC OUTPUT LEVEL</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black tabular-nums">
                {isMuted ? 'MUTED' : `${volumePercent}%`}
              </span>
              <button
                onClick={handleToggleMute}
                className={`p-1 rounded cursor-pointer border text-[10px] transition-colors ${
                  isMuted
                    ? (isWhiteTheme ? 'bg-rose-100 border-rose-300 text-rose-800 font-bold' : 'bg-rose-950/70 border-rose-500/50 text-rose-300 font-bold')
                    : (isWhiteTheme ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0d1829] border-[#1b314d] text-slate-300')
                }`}
                title={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volumePercent}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
              isWhiteTheme ? 'bg-slate-200 accent-[#0284c7]' : 'bg-[#142034] accent-[#00ffcc]'
            }`}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>Silent</span>
            <span>Balanced 50%</span>
            <span>Resonant 100%</span>
          </div>
        </div>

        {/* Harmonic Overtone Richness Blend Slider */}
        <div className={`p-3 rounded-xl border transition-colors ${
          isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273c]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold font-mono flex items-center gap-1.5 ${
              isWhiteTheme ? 'text-slate-700' : 'text-[#8fa7c7]'
            }`}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>HARMONIC OVERTONE BLEND</span>
            </span>
            <span className="text-xs font-mono font-black tabular-nums">
              {richnessPercent}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={richnessPercent}
            onChange={(e) => handleRichnessChange(parseInt(e.target.value, 10))}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
              isWhiteTheme ? 'bg-slate-200 accent-[#0284c7]' : 'bg-[#142034] accent-[#00ffcc]'
            }`}
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>Pure Fundamental (0%)</span>
            <span>Sacred Choir (100%)</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. CONTINUOUS CARRIER TUNER & OSCILLATOR GEOMETRY        */}
      {/* ======================================================== */}
      <div className={`p-3 rounded-xl border mb-3 transition-colors ${
        isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273c]'
      }`}>
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <span className={`text-[11px] font-bold font-mono ${
              isWhiteTheme ? 'text-slate-700' : 'text-[#8fa7c7]'
            }`}>
              FINE FREQUENCY CALIBRATION
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-base font-black font-mono tracking-wider tabular-nums ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`}>
              {activeFreq.toFixed(1)} Hz
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
              isWhiteTheme ? 'bg-slate-200 text-slate-700' : 'bg-[#122137] text-slate-300'
            }`}>
              {getNoteName(activeFreq)}
            </span>
          </div>
        </div>

        <input
          type="range"
          min="100"
          max="1200"
          step="0.5"
          value={activeFreq}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onSettingsChange(val, activeWave);
            if (isAudioActive) {
              updateAudioParams(val, activeWave, {
                mode: activeMode,
                volume: isMuted ? 0 : volumePercent / 100,
                harmonicRichness: richnessPercent / 100
              });
            }
          }}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer mb-2.5 ${
            isWhiteTheme ? 'bg-slate-200 accent-[#0284c7]' : 'bg-[#142034] accent-[#00ffcc]'
          }`}
        />

        {/* Waveform Geometry Selector with Acoustic Notes */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-[#142337]">
          <div className="text-[10px] font-mono font-bold text-slate-500 mb-1.5">
            OSCILLATION GEOMETRY:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WAVE_TYPES.map((type) => {
              const isSelected = activeWave === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    onSettingsChange(activeFreq, type.id);
                    if (isAudioActive) {
                      updateAudioParams(activeFreq, type.id, {
                        mode: activeMode,
                        volume: isMuted ? 0 : volumePercent / 100,
                        harmonicRichness: richnessPercent / 100
                      });
                    }
                  }}
                  className={`p-2 rounded-lg text-left font-mono cursor-pointer border transition-all ${
                    isSelected
                      ? (isWhiteTheme
                          ? 'bg-sky-100 border-[#0284c7] text-[#0284c7] font-bold shadow-xs'
                          : 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc] font-bold shadow-[0_0_10px_rgba(0,255,204,0.25)]')
                      : (isWhiteTheme
                          ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          : 'bg-[#0c1626] border-[#182a40] text-[#7189ad] hover:text-white')
                  }`}
                >
                  <div className="text-xs font-black">{type.label}</div>
                  <div className={`text-[8px] mt-0.5 ${isSelected ? 'opacity-90' : 'opacity-65'}`}>
                    {type.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
