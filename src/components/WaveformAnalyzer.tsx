import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Activity,
  CircleDot,
  Sliders,
  Volume2,
  Radio,
  Zap,
  Maximize2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type VisualizationMode = 'bars' | 'wave' | 'circular';

interface WaveformAnalyzerProps {
  externalAnalyserNode?: AnalyserNode | null;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({ externalAnalyserNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const simIntervalRef = useRef<number | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [micMode, setMicMode] = useState<'mic' | 'synthetic'>('mic');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peakFrequency, setPeakFrequency] = useState<number>(432);
  const [avgDb, setAvgDb] = useState<number>(-24);

  // New controls: visualization mode and sensitivity
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('bars');
  const [sensitivity, setSensitivity] = useState<number>(1.2);

  // Refs for seamless real-time 60fps render access without restarting canvas loops
  const viewModeRef = useRef<VisualizationMode>('bars');
  const sensitivityRef = useRef<number>(1.2);

  const { isWhiteTheme } = useTheme();

  // Synthetic frequency array fallback if mic permission is denied or unavailable
  const syntheticBufferRef = useRef<Uint8Array | null>(null);

  // Synchronize state changes to refs immediately
  const handleModeChange = (mode: VisualizationMode) => {
    setVisualizationMode(mode);
    viewModeRef.current = mode;
  };

  const handleSensitivityChange = (val: number) => {
    const clamped = Math.max(0.2, Math.min(3.0, val));
    setSensitivity(clamped);
    sensitivityRef.current = clamped;
  };

  const startAnalysis = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const analyzer = audioCtx.createAnalyser();

      // 256 BINS as specified in the UI requirements (fftSize = 512)
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);

      audioContextRef.current = audioCtx;
      analyzerRef.current = analyzer;
      setMicMode('mic');
      setIsAnalyzing(true);

      drawSpectrum();
    } catch (error: any) {
      console.warn("Audio stream initialization fallback to synthetic scalar generator:", error);
      setErrorMessage(error?.message ? `Live mic note: ${error.message}. Running scalar harmonic synthesizer mode.` : 'Microphone unavailable. Activated scalar wave synthesizer mode.');
      
      startSyntheticMode();
    }
  };

  const startSyntheticMode = () => {
    setMicMode('synthetic');
    setIsAnalyzing(true);
    
    const bufferLength = 256;
    syntheticBufferRef.current = new Uint8Array(bufferLength);
    
    let phase = 0;
    const updateSynthetic = () => {
      phase += 0.05;
      if (!syntheticBufferRef.current) return;
      
      const arr = syntheticBufferRef.current;
      for (let i = 0; i < bufferLength; i++) {
        const freqRatio = i / bufferLength;
        const baseSignal = Math.sin(phase * 2 + i * 0.15) * 35;
        const harmonic432 = Math.exp(-Math.pow(freqRatio - 0.22, 2) / 0.005) * 190;
        const harmonic528 = Math.exp(-Math.pow(freqRatio - 0.28, 2) / 0.004) * 160;
        const ambientNoise = Math.random() * 20;
        
        arr[i] = Math.min(255, Math.max(0, Math.floor(baseSignal + harmonic432 + harmonic528 + ambientNoise)));
      }
    };

    updateSynthetic();
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIntervalRef.current = window.setInterval(updateSynthetic, 40);

    drawSyntheticSpectrum();
  };

  const stopAnalysis = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    analyzerRef.current = null;
    setIsAnalyzing(false);
  };

  // Canvas drawing dispatcher for all 3 visualization modes
  const renderVisualizationFrame = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dataArray: Uint8Array,
    timeDataArray?: Uint8Array
  ) => {
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = dataArray.length;
    const currentMode = viewModeRef.current;
    const currentSens = sensitivityRef.current;

    // Clinical lab slate canvas background
    ctx.fillStyle = isWhiteTheme ? '#f1f5f9' : '#070d18';
    ctx.fillRect(0, 0, width, height);

    // Compute basic telemetry values
    let maxVal = 0;
    let maxIdx = 0;
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i];
      sum += v;
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }
    setPeakFrequency(Math.round((maxIdx / bufferLength) * 24000));
    setAvgDb(Math.round((sum / bufferLength / 255) * 60 - 60));

    // ==========================================
    // 1. BARS MODE (FFT Frequency Spectrum)
    // ==========================================
    if (currentMode === 'bars') {
      // Horizontal reference gridlines
      ctx.strokeStyle = isWhiteTheme ? '#cbd5e1' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(0, height / 4);
      ctx.lineTo(width, height / 4);
      ctx.moveTo(0, (height * 3) / 4);
      ctx.lineTo(width, (height * 3) / 4);
      ctx.stroke();

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const rawHeight = dataArray[i];
        const scaledMagnitude = Math.min(255, rawHeight * currentSens);

        // Dual-tone cobalt (#0284c7) to emerald (#10b981) harmonic spectrum mapping
        const cobaltRatio = 1 - (i / bufferLength);
        const emeraldRatio = i / bufferLength;

        const r = Math.floor(2 * cobaltRatio + 16 * emeraldRatio);
        const g = Math.floor(132 * cobaltRatio + 185 * emeraldRatio);
        const b = Math.floor(199 * cobaltRatio + 129 * emeraldRatio);

        ctx.fillStyle = `rgb(${r},${g},${b})`;

        const barHeight = (scaledMagnitude / 255) * height;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    }

    // ==========================================
    // 2. WAVE MODE (Continuous Oscilloscope Waveform)
    // ==========================================
    else if (currentMode === 'wave') {
      // Grid lines
      ctx.strokeStyle = isWhiteTheme ? '#e2e8f0' : '#142339';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx < width; gx += 40) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
      }
      for (let gy = 0; gy < height; gy += 25) {
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
      }
      ctx.stroke();

      // Center baseline
      ctx.strokeStyle = isWhiteTheme ? '#94a3b8' : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform line tracing
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        let normalized = (dataArray[i] / 255.0);
        if (timeDataArray) {
          normalized = (timeDataArray[i] / 128.0) - 1.0;
        } else {
          // Derive smooth oscillating contour from frequency if time-domain not provided
          normalized = ((dataArray[i] / 255.0) - 0.5) * Math.sin(i * 0.1);
        }

        const y = (height / 2) - (normalized * (height * 0.42) * currentSens);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      // Dual-tone gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#0284c7');
      gradient.addColorStop(0.5, '#0ea5e9');
      gradient.addColorStop(1, '#10b981');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = isWhiteTheme ? 'rgba(2, 132, 199, 0.4)' : '#00e1ff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Soft glow fill below wave
      ctx.lineTo(width, height / 2);
      ctx.lineTo(0, height / 2);
      ctx.fillStyle = isWhiteTheme ? 'rgba(2, 132, 199, 0.06)' : 'rgba(0, 225, 255, 0.05)';
      ctx.fill();
    }

    // ==========================================
    // 3. CIRCULAR MODE (Radial Harmonic Spectrum)
    // ==========================================
    else if (currentMode === 'circular') {
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(centerX, centerY) * 0.42;

      // Concentric calibration rings
      ctx.strokeStyle = isWhiteTheme ? '#cbd5e1' : '#1e293b';
      ctx.lineWidth = 1;
      [baseRadius * 0.5, baseRadius, baseRadius * 1.4, baseRadius * 1.8].forEach((r) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Radiating spokes / harmonic envelope
      ctx.beginPath();
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < bufferLength; i += 2) {
        const angle = (i / bufferLength) * Math.PI * 2 - Math.PI / 2;
        const magnitude = (dataArray[i] / 255) * (baseRadius * 0.95) * currentSens;
        const radius = baseRadius + magnitude;

        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;

        points.push({ x: px, y: py });

        // Radiating spokes from base circle
        const bx = centerX + Math.cos(angle) * baseRadius;
        const by = centerY + Math.sin(angle) * baseRadius;

        const cobaltRatio = 1 - (i / bufferLength);
        const emeraldRatio = i / bufferLength;
        const rVal = Math.floor(2 * cobaltRatio + 16 * emeraldRatio);
        const gVal = Math.floor(132 * cobaltRatio + 185 * emeraldRatio);
        const bVal = Math.floor(199 * cobaltRatio + 129 * emeraldRatio);

        ctx.strokeStyle = `rgba(${rVal},${gVal},${bVal}, 0.75)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Outer bounding contour
      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Center Core Orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = isWhiteTheme ? '#0284c7' : '#00e1ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0284c7';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Center Frequency Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${peakFrequency}Hz`, centerX, centerY);
    }
  };

  const drawSyntheticSpectrum = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 256;

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      const dataArray = syntheticBufferRef.current || new Uint8Array(bufferLength);
      renderVisualizationFrame(ctx, canvas, dataArray);
    };

    renderFrame();
  };

  const drawSpectrum = () => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;
    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      analyzer.getByteFrequencyData(dataArray);
      analyzer.getByteTimeDomainData(timeDataArray);

      renderVisualizationFrame(ctx, canvas, dataArray, timeDataArray);
    };

    renderFrame();
  };

  useEffect(() => {
    if (externalAnalyserNode && !isAnalyzing) {
      analyzerRef.current = externalAnalyserNode;
      setIsAnalyzing(true);
      setMicMode('mic');
      drawSpectrum();
    }
  }, [externalAnalyserNode]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: isWhiteTheme ? '#ffffff' : '#070c17',
      border: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1a2636',
      borderRadius: '8px',
      padding: '16px',
      fontFamily: 'monospace',
      boxShadow: isWhiteTheme ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
      marginBottom: '16px'
    }}>
      {/* Title & Technical Specs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{
            color: isWhiteTheme ? '#0f172a' : '#d0e0f5',
            margin: 0,
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '0.04em'
          }}>
            📊 HARMONIC WAVEFORM ANALYZER (FFT SPECTRUM)
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: isWhiteTheme ? '#64748b' : '#7ea1c9', fontSize: '11px' }}>
            256 BINS // 48kHz
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: isWhiteTheme ? '#f1f5f9' : '#142338',
            color: isWhiteTheme ? '#0284c7' : '#00e1ff'
          }}>
            MODE: {visualizationMode.toUpperCase()}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: isWhiteTheme ? '#eff6ff' : '#0f172a',
          color: isWhiteTheme ? '#0284c7' : '#38bdf8',
          border: isWhiteTheme ? '1px solid #bfdbfe' : '1px solid #1e3a8a',
          borderRadius: '4px',
          fontSize: '11px',
          marginBottom: '10px'
        }}>
          ℹ️ {errorMessage}
        </div>
      )}

      {/* Main Canvas Visualization */}
      <canvas
        ref={canvasRef}
        width={800}
        height={220}
        style={{
          width: '100%',
          height: '220px',
          backgroundColor: isWhiteTheme ? '#f1f5f9' : '#070d18',
          border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1a2636',
          borderRadius: '6px',
          display: 'block'
        }}
      />

      {/* ======================================================== */}
      {/* VISUALIZATION CONTROLS PANEL                             */}
      {/* ======================================================== */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: isWhiteTheme ? '#f8fafc' : '#091220',
        border: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #16263b',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {/* 1. Visualization Mode Toggle Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: isWhiteTheme ? '#64748b' : '#7994b5',
              letterSpacing: '0.04em'
            }}>
              DISPLAY MODE:
            </span>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleModeChange('bars')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: visualizationMode === 'bars'
                    ? (isWhiteTheme ? '1px solid #0284c7' : '1px solid #00e1ff')
                    : (isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e2f47'),
                  backgroundColor: visualizationMode === 'bars'
                    ? (isWhiteTheme ? '#e0f2fe' : 'rgba(0, 225, 255, 0.15)')
                    : (isWhiteTheme ? '#ffffff' : '#0d1829'),
                  color: visualizationMode === 'bars'
                    ? (isWhiteTheme ? '#0284c7' : '#00e1ff')
                    : (isWhiteTheme ? '#475569' : '#8da4c4'),
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s ease'
                }}
              >
                <BarChart2 style={{ width: '12px', height: '12px' }} />
                <span>BARS</span>
              </button>

              <button
                onClick={() => handleModeChange('wave')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: visualizationMode === 'wave'
                    ? (isWhiteTheme ? '1px solid #0284c7' : '1px solid #00e1ff')
                    : (isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e2f47'),
                  backgroundColor: visualizationMode === 'wave'
                    ? (isWhiteTheme ? '#e0f2fe' : 'rgba(0, 225, 255, 0.15)')
                    : (isWhiteTheme ? '#ffffff' : '#0d1829'),
                  color: visualizationMode === 'wave'
                    ? (isWhiteTheme ? '#0284c7' : '#00e1ff')
                    : (isWhiteTheme ? '#475569' : '#8da4c4'),
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s ease'
                }}
              >
                <Activity style={{ width: '12px', height: '12px' }} />
                <span>WAVE</span>
              </button>

              <button
                onClick={() => handleModeChange('circular')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: visualizationMode === 'circular'
                    ? (isWhiteTheme ? '1px solid #0284c7' : '1px solid #00e1ff')
                    : (isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e2f47'),
                  backgroundColor: visualizationMode === 'circular'
                    ? (isWhiteTheme ? '#e0f2fe' : 'rgba(0, 225, 255, 0.15)')
                    : (isWhiteTheme ? '#ffffff' : '#0d1829'),
                  color: visualizationMode === 'circular'
                    ? (isWhiteTheme ? '#0284c7' : '#00e1ff')
                    : (isWhiteTheme ? '#475569' : '#8da4c4'),
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s ease'
                }}
              >
                <CircleDot style={{ width: '12px', height: '12px' }} />
                <span>CIRCULAR</span>
              </button>
            </div>
          </div>

          {/* 2. Sensitivity Slider & Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders style={{ width: '12px', height: '12px', color: isWhiteTheme ? '#64748b' : '#7994b5' }} />
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: isWhiteTheme ? '#64748b' : '#7994b5'
              }}>
                SENSITIVITY:
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: isWhiteTheme ? '#0284c7' : '#00e1ff',
                minWidth: '35px'
              }}>
                {sensitivity.toFixed(1)}x
              </span>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                style={{
                  width: '90px',
                  cursor: 'pointer',
                  accentColor: isWhiteTheme ? '#0284c7' : '#00e1ff'
                }}
              />
            </div>

            {/* Quick Sensitivity Presets */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0.5, 1.0, 1.5, 2.5].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSensitivityChange(preset)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    border: sensitivity === preset
                      ? (isWhiteTheme ? '1px solid #0284c7' : '1px solid #00e1ff')
                      : (isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e2f47'),
                    backgroundColor: sensitivity === preset
                      ? (isWhiteTheme ? '#0284c7' : '#00e1ff')
                      : (isWhiteTheme ? '#ffffff' : '#0d1829'),
                    color: sensitivity === preset
                      ? '#ffffff'
                      : (isWhiteTheme ? '#475569' : '#8da4c4'),
                    fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions & Status Bar */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            style={{
              backgroundColor: isAnalyzing ? '#be123c' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              letterSpacing: '0.04em',
              transition: 'background-color 0.15s ease'
            }}
          >
            {isAnalyzing ? 'HALT TELEMETRY' : 'INITIALIZE SCALAR MIC'}
          </button>

          {!isAnalyzing && (
            <button
              onClick={startSyntheticMode}
              style={{
                backgroundColor: isWhiteTheme ? '#f1f5f9' : '#0e1726',
                color: isWhiteTheme ? '#334155' : '#8fa8cc',
                border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e2f47',
                padding: '8px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            >
              SIMULATE SCALAR FIELD
            </button>
          )}
        </div>

        {isAnalyzing && (
          <div style={{
            display: 'flex',
            gap: '14px',
            fontSize: '11px',
            color: isWhiteTheme ? '#475569' : '#94a3b8'
          }}>
            <span>MODE: <strong style={{ color: isWhiteTheme ? '#0284c7' : '#00e1ff' }}>{micMode.toUpperCase()}</strong></span>
            <span>PEAK: <strong style={{ color: '#10b981' }}>{peakFrequency} Hz</strong></span>
            <span>LEVEL: <strong style={{ color: isWhiteTheme ? '#334155' : '#cbd5e1' }}>{avgDb} dB</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
