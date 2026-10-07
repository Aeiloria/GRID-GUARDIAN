import React, { useMemo } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CelebrationGlowProps {
  onDismiss?: () => void;
}

interface Particle {
  id: number;
  x: number; // percentage across screen 10-90%
  size: number; // size in px
  color: string;
  shape: 'circle' | 'square' | 'diamond';
  delay: number; // in seconds
  duration: number; // in seconds
  driftX: number; // drift in px
  rotation: number; // initial rotation
}

export function CelebrationGlow({ onDismiss }: CelebrationGlowProps) {
  const { isWhiteTheme } = useTheme();

  // Generate 42 delicate celebration particles
  const particles = useMemo<Particle[]>(() => {
    const palette = isWhiteTheme
      ? ['#0284c7', '#10b981', '#059669', '#f59e0b', '#06b6d4', '#6366f1']
      : ['#00ffcc', '#38ef7d', '#00e1ff', '#ffd700', '#70e000', '#ffffff'];

    const shapes: ('circle' | 'square' | 'diamond')[] = ['circle', 'square', 'diamond'];

    return Array.from({ length: 42 }).map((_, i) => ({
      id: i,
      x: 15 + Math.random() * 70, // clustered around center 70% width
      size: 4 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.6,
      driftX: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 360,
    }));
  }, [isWhiteTheme]);

  return (
    <aside
      aria-label="Vagal coherence calibration celebration"
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex flex-col items-center justify-start pt-16 sm:pt-24"
    >
      {/* 1. Full-screen Ambient Radial Screen Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out animate-[pulse_3s_ease-in-out_infinite]"
        style={{
          background: isWhiteTheme
            ? `
              radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.22) 0%, rgba(2, 132, 199, 0.12) 40%, transparent 70%),
              radial-gradient(circle at 50% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)
            `
            : `
              radial-gradient(ellipse at 50% 30%, rgba(0, 255, 204, 0.24) 0%, rgba(56, 239, 125, 0.16) 40%, transparent 70%),
              radial-gradient(circle at 50% 80%, rgba(0, 225, 255, 0.12) 0%, transparent 60%)
            `
        }}
      />

      {/* Perimeter Edge Vignette Bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: isWhiteTheme
            ? 'inset 0 0 80px rgba(16, 185, 129, 0.18), inset 0 0 30px rgba(2, 132, 199, 0.12)'
            : 'inset 0 0 90px rgba(0, 255, 204, 0.22), inset 0 0 40px rgba(56, 239, 125, 0.18)'
        }}
      />

      {/* 2. Floating Delicate Confetti Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute top-12"
            style={{
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'diamond' ? '1px' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              boxShadow: `0 0 8px ${p.color}`,
              animation: `particleFloat ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* 3. Subtle Celebration HUD Toast */}
      <div
        className={`relative z-10 mx-4 px-4 py-2 rounded-full border shadow-2xl flex items-center gap-2.5 font-mono text-xs animate-[bounce_1s_ease-out_1] ${
          isWhiteTheme
            ? 'bg-white/95 border-emerald-400 text-emerald-900 shadow-emerald-500/20'
            : 'bg-[#06141c]/95 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_25px_rgba(0,255,204,0.4)]'
        }`}
        style={{
          backdropFilter: 'blur(8px)',
        }}
      >
        <Sparkles className={`w-4 h-4 shrink-0 ${isWhiteTheme ? 'text-amber-500' : 'text-[#00ffcc]'}`} />
        <span className="font-bold tracking-wider">
          4-7-8 VAGAL COHERENCE LOCKED
        </span>
        <span className={`text-[10px] hidden sm:inline ${isWhiteTheme ? 'text-emerald-700' : 'text-emerald-400'}`}>
          · Parasympathetic Reset Active
        </span>
        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isWhiteTheme ? 'text-emerald-600' : 'text-[#38ef7d]'}`} />
      </div>

      {/* Inline Keyframe Styles for the Floating Particle Trajectories */}
      <style>{`
        @keyframes particleFloat {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(0.6);
          }
          15% {
            opacity: 0.95;
            transform: translate3d(${(Math.random() - 0.5) * 30}px, 40px, 0) rotate(45deg) scale(1.1);
          }
          60% {
            opacity: 0.8;
            transform: translate3d(${(Math.random() - 0.5) * 70}px, 220px, 0) rotate(180deg) scale(1.0);
          }
          100% {
            opacity: 0;
            transform: translate3d(${(Math.random() - 0.5) * 120}px, 480px, 0) rotate(360deg) scale(0.4);
          }
        }
      `}</style>
    </aside>
  );
}
