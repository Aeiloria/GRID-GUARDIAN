import React, { useRef, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface WaveAnalyzerProps {
  analyserNode: AnalyserNode | null;
  isAudioActive: boolean;
}

export function WaveAnalyzer({ analyserNode, isAudioActive }: WaveAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isWhiteTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      // Background with subtle trace persistence
      ctx.fillStyle = isWhiteTheme ? 'rgba(248, 250, 252, 0.45)' : 'rgba(6, 10, 19, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = isWhiteTheme ? '#e2e8f0' : '#121d2e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (isAudioActive && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          if (isWhiteTheme) {
            gradient.addColorStop(0, '#0284c7');
            gradient.addColorStop(0.5, '#0ea5e9');
            gradient.addColorStop(1, '#10b981');
          } else {
            gradient.addColorStop(0, '#005544');
            gradient.addColorStop(0.5, '#00e1ff');
            gradient.addColorStop(1, '#00ffcc');
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, Math.max(1, barWidth - 1), barHeight);

          // Top peak pixel indicator
          ctx.fillStyle = isWhiteTheme ? '#0f172a' : '#ffffff';
          ctx.fillRect(x, height - barHeight - 1, Math.max(1, barWidth - 1), 1.5);

          x += barWidth + 1;
        }

        // Oscilloscope overlay line
        const timeData = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(timeData);
        ctx.beginPath();
        ctx.strokeStyle = isWhiteTheme ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        const sliceWidth = width / bufferLength;
        let lineX = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(lineX, y);
          else ctx.lineTo(lineX, y);
          lineX += sliceWidth;
        }
        ctx.stroke();

      } else {
        // Idle Ambient Sine Wave Sweep
        const time = Date.now() * 0.003;
        ctx.beginPath();
        ctx.strokeStyle = isWhiteTheme ? '#cbd5e1' : '#1b2a40';
        ctx.lineWidth = 1.5;
        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * 0.04 + time) * 8 + Math.cos(x * 0.01 - time * 0.5) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = isWhiteTheme ? '#64748b' : '#415573';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OSCILLATOR STANDBY // WAITING FOR SCALAR ACTIVATION', width / 2, height / 2 + 3);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, isAudioActive, isWhiteTheme]);

  return (
    <div className={`p-4 border-b transition-colors ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#050912] text-[#c0d4ec]'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
          <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]'
          }`}>
            HARMONIC WAVEFORM ANALYZER (FFT SPECTRUM)
          </h2>
        </div>
        <span className={`text-[10px] font-mono ${isWhiteTheme ? 'text-slate-500' : 'text-[#556e8f]'}`}>
          256 BINS // 48kHz
        </span>
      </div>

      <div className={`border rounded overflow-hidden relative shadow-inner ${
        isWhiteTheme ? 'border-slate-200 bg-[#f8fafc]' : 'border-[#182638] bg-[#04070d]'
      }`}>
        <canvas
          ref={canvasRef}
          width={560}
          height={110}
          className="w-full h-[110px] block"
        />
      </div>
    </div>
  );
}
