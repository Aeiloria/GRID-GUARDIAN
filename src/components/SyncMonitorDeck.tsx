import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Wifi, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SyncMonitorDeckProps {
  hrvHistory?: number[];
  currentHrv?: number;
}

export function SyncMonitorDeck({ hrvHistory: propHrvHistory, currentHrv: propCurrentHrv }: SyncMonitorDeckProps) {
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR'>('SYNCED');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [backendHealth, setBackendHealth] = useState<string>('SYSTEM_OPERATIONAL');
  const [latencyMs, setLatencyMs] = useState<number>(4.2);
  const [queuedRecords, setQueuedRecords] = useState<number>(0);

  const { isWhiteTheme } = useTheme();

  // Local state for HRV readings if not provided or to ensure continuous telemetry
  const [localHrvHistory, setLocalHrvHistory] = useState<number[]>([42, 44, 47, 45, 50, 48, 55, 58, 54, 62]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Synchronize when prop changes
  useEffect(() => {
    if (propHrvHistory && propHrvHistory.length > 0) {
      setLocalHrvHistory(propHrvHistory.slice(-10));
    }
  }, [propHrvHistory]);

  const checkHealth = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/health');
      const delta = performance.now() - start;
      setLatencyMs(parseFloat(delta.toFixed(2)));
      if (res.ok) {
        const data = await res.json();
        setBackendHealth(data.status || 'SYSTEM_OPERATIONAL');
      }
    } catch {
      setBackendHealth('STANDBY_EMULATOR');
      setLatencyMs(1.1);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setSyncStatus('SYNCING');
    await checkHealth();
    setTimeout(() => {
      setSyncStatus('SYNCED');
      setLastSyncTime(new Date().toLocaleTimeString());
      setQueuedRecords(0);
    }, 600);
  };

  // Sparkline calculations for 10 data points
  const rawReadings = localHrvHistory.slice(-10);
  const readings = rawReadings.length === 10
    ? rawReadings
    : Array(10 - rawReadings.length).fill(rawReadings[0] || 45).concat(rawReadings);

  const minHrv = Math.min(...readings);
  const maxHrv = Math.max(...readings);
  const avgHrv = parseFloat((readings.reduce((sum, v) => sum + v, 0) / readings.length).toFixed(1));
  const currentVal = propCurrentHrv ?? readings[readings.length - 1];

  const initialVal = readings[0];
  const deltaFromStart = currentVal - initialVal;
  const percentDelta = parseFloat(((deltaFromStart / (initialVal || 1)) * 100).toFixed(1));

  let trendColor = isWhiteTheme ? '#16a34a' : '#38ef7d';
  let trendText = 'AUTONOMIC TONE ELEVATED';
  let TrendIcon = TrendingUp;

  if (percentDelta > 3) {
    trendColor = isWhiteTheme ? '#16a34a' : '#38ef7d';
    trendText = 'AUTONOMIC TONE ELEVATED';
    TrendIcon = TrendingUp;
  } else if (percentDelta < -3) {
    trendColor = isWhiteTheme ? '#d97706' : '#ffaa00';
    trendText = 'SYMPATHETIC LOAD SHIFT';
    TrendIcon = TrendingDown;
  } else {
    trendColor = isWhiteTheme ? '#0284c7' : '#00e1ff';
    trendText = 'AUTONOMIC HOMEOSTASIS';
    TrendIcon = Minus;
  }

  // SVG Chart geometry
  const width = 340;
  const height = 64;
  const paddingX = 14;
  const paddingY = 8;
  const usableWidth = width - (paddingX * 2);
  const usableHeight = height - (paddingY * 2);
  const valueSpan = Math.max(12, maxHrv - minHrv);

  const points = readings.map((val, idx) => {
    const x = paddingX + idx * (usableWidth / (readings.length - 1));
    const y = (height - paddingY) - ((val - minHrv) / valueSpan) * usableHeight;
    return { x, y, val, idx };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M ${points[0].x.toFixed(1)},${height} L ${polylinePoints} L ${points[points.length - 1].x.toFixed(1)},${height} Z`;

  const avgY = (height - paddingY) - ((avgHrv - minHrv) / valueSpan) * usableHeight;

  return (
    <div className={`p-4 border-b transition-colors ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#060a13] text-[#c0d4ec]'
    }`}>
      {/* Top Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00e1ff]'}`} />
          <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]'
          }`}>
            CORE INGESTION & CLOUD SYNC MONITOR
          </h2>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncStatus === 'SYNCING'}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded cursor-pointer transition-colors border ${
            isWhiteTheme
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-800 font-bold'
              : 'bg-[#101b2c] hover:bg-[#1a2d48] border-[#213757] text-[#00ffcc]'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
          <span>{syncStatus === 'SYNCING' ? 'REPLICATING...' : 'FORCE SYNC'}</span>
        </button>
      </div>

      {/* Backend Core Status Matrix */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className={`p-2 rounded border transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#09101d] border-[#182638]'
        }`}>
          <div className={`text-[9px] font-bold uppercase mb-0.5 font-mono ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#556e8f]'
          }`}>
            BACKEND CORE
          </div>
          <div className={`text-xs font-mono font-bold flex items-center gap-1 truncate ${
            isWhiteTheme ? 'text-emerald-700' : 'text-[#38ef7d]'
          }`}>
            <span className={`w-2 h-2 rounded-full inline-block ${
              isWhiteTheme ? 'bg-emerald-600' : 'bg-[#38ef7d] shadow-[0_0_6px_#38ef7d]'
            }`} />
            {backendHealth}
          </div>
        </div>

        <div className={`p-2 rounded border transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#09101d] border-[#182638]'
        }`}>
          <div className={`text-[9px] font-bold uppercase mb-0.5 font-mono ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#556e8f]'
          }`}>
            EDGE LATENCY
          </div>
          <div className={`text-xs font-mono font-bold flex items-center gap-1 ${
            isWhiteTheme ? 'text-sky-700' : 'text-[#00ffcc]'
          }`}>
            <Wifi className="w-3 h-3" />
            {latencyMs} ms
          </div>
        </div>

        <div className={`p-2 rounded border transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#09101d] border-[#182638]'
        }`}>
          <div className={`text-[9px] font-bold uppercase mb-0.5 font-mono ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#556e8f]'
          }`}>
            OUTBOX BUFFER
          </div>
          <div className={`text-xs font-mono font-bold ${
            isWhiteTheme ? 'text-slate-700' : 'text-[#bad0ec]'
          }`}>
            {queuedRecords} PENDING
          </div>
        </div>
      </div>

      {/* HRV Long-Term Variability Sparkline Deck */}
      <div className={`p-3 rounded border relative overflow-hidden transition-colors ${
        isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#070c17] border-[#19273c]'
      }`}>
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: isWhiteTheme
              ? 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)'
              : 'linear-gradient(to right, #162438 1px, transparent 1px), linear-gradient(to bottom, #162438 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Sparkline Header Readout */}
        <div className="flex flex-wrap items-baseline justify-between gap-1 mb-2 relative z-10">
          <div className="flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
              isWhiteTheme ? 'text-slate-900' : 'text-white'
            }`}>
              HRV VARIABILITY TREND
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              isWhiteTheme ? 'text-slate-500 bg-white border-slate-200' : 'text-[#5f799d] bg-[#0c1626] border-[#18283f]'
            }`}>
              LAST 10 SAMPLES (RMSSD)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-baseline gap-1 font-mono">
              <span className={`text-base font-black tabular-nums ${
                isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
              }`}>
                {currentVal}
              </span>
              <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-400' : 'text-[#718dae]'}`}>MS</span>
            </div>

            <div
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: trendColor,
                borderColor: `${trendColor}40`,
                backgroundColor: `${trendColor}15`
              }}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{percentDelta >= 0 ? `+${percentDelta}%` : `${percentDelta}%`}</span>
            </div>
          </div>
        </div>

        {/* Statistical Bounds Ribbon */}
        <div className={`flex items-center justify-between text-[9px] font-mono mb-2 px-1 relative z-10 border-b pb-1.5 ${
          isWhiteTheme ? 'text-slate-500 border-slate-200' : 'text-[#637f9f] border-[#121c2c]'
        }`}>
          <div>
            <span>MIN: </span>
            <span className={`font-bold ${isWhiteTheme ? 'text-slate-700' : 'text-[#a4bdda]'}`}>{minHrv}ms</span>
          </div>
          <div>
            <span>AVERAGE: </span>
            <span className={`font-bold ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`}>{avgHrv}ms</span>
          </div>
          <div>
            <span>MAX: </span>
            <span className={`font-bold ${isWhiteTheme ? 'text-slate-700' : 'text-[#a4bdda]'}`}>{maxHrv}ms</span>
          </div>
          <div className="hidden sm:block font-bold" style={{ color: trendColor }}>
            <span>● </span>
            <span>{trendText}</span>
          </div>
        </div>

        {/* SVG Sparkline Graph Canvas */}
        <div className={`relative w-full h-[70px] rounded overflow-hidden border shadow-inner ${
          isWhiteTheme ? 'bg-white border-slate-200' : 'bg-[#040810] border-[#131f32]'
        }`}>
          <svg
            className="w-full h-full block"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="hrvSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isWhiteTheme ? '#0284c7' : '#00ffcc'}
                  stopOpacity={isWhiteTheme ? '0.25' : '0.35'}
                />
                <stop
                  offset="60%"
                  stopColor={isWhiteTheme ? '#0ea5e9' : '#00e1ff'}
                  stopOpacity={isWhiteTheme ? '0.08' : '0.12'}
                />
                <stop
                  offset="100%"
                  stopColor={isWhiteTheme ? '#0284c7' : '#00ffcc'}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Average Reference Line */}
            <line
              x1={paddingX}
              y1={avgY}
              x2={width - paddingX}
              y2={avgY}
              stroke={isWhiteTheme ? '#cbd5e1' : '#1f324a'}
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Filled Area Gradient */}
            <path
              d={areaPath}
              fill="url(#hrvSparklineGradient)"
            />

            {/* Main Sparkline Curve */}
            <polyline
              fill="none"
              stroke={isWhiteTheme ? '#0284c7' : '#00ffcc'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
              style={{
                filter: isWhiteTheme ? 'none' : 'drop-shadow(0 0 5px rgba(0, 255, 204, 0.45))'
              }}
            />

            {/* Interactive/Hovered Vertical Guide Bar */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <line
                x1={points[hoveredIndex].x}
                y1={0}
                x2={points[hoveredIndex].x}
                y2={height}
                stroke={isWhiteTheme ? '#0284c7' : '#00e1ff'}
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
            )}

            {/* Discrete Reading Nodes */}
            {points.map((p, i) => {
              const isLatest = i === points.length - 1;
              const isHovered = hoveredIndex === i;

              return (
                <g key={i}>
                  {isLatest && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill="none"
                      stroke={isWhiteTheme ? '#0284c7' : '#00ffcc'}
                      strokeWidth="1.2"
                      opacity="0.6"
                      className="animate-ping"
                    />
                  )}

                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 4.5 : isLatest ? 3.5 : 2.5}
                    fill={isHovered ? (isWhiteTheme ? '#0284c7' : '#ffffff') : isLatest ? (isWhiteTheme ? '#0284c7' : '#00ffcc') : (isWhiteTheme ? '#ffffff' : '#040810')}
                    stroke={isWhiteTheme ? '#0284c7' : '#00ffcc'}
                    strokeWidth={isHovered ? 2 : 1.5}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Telemetry Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className={`absolute pointer-events-none px-2 py-0.5 rounded text-[9px] font-mono shadow-xl -translate-x-1/2 -translate-y-full top-5 border ${
                isWhiteTheme
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-[#091222]/95 border-[#00ffcc] text-[#00ffcc]'
              }`}
              style={{
                left: `${(points[hoveredIndex].x / width) * 100}%`
              }}
            >
              <span>{hoveredIndex === points.length - 1 ? 'CURRENT' : `T-${points.length - 1 - hoveredIndex}`}: </span>
              <strong className={isWhiteTheme ? 'text-sky-300' : 'text-white'}>{points[hoveredIndex].val} ms</strong>
            </div>
          )}
        </div>

        {/* Horizontal Timeline Scale */}
        <div className={`flex items-center justify-between text-[8px] font-mono mt-1.5 px-1 relative z-10 ${
          isWhiteTheme ? 'text-slate-400' : 'text-[#4c6585]'
        }`}>
          <span>T-9</span>
          <span>T-8</span>
          <span>T-7</span>
          <span>T-6</span>
          <span>T-5</span>
          <span>T-4</span>
          <span>T-3</span>
          <span>T-2</span>
          <span>T-1</span>
          <span className={`font-bold ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`}>NOW</span>
        </div>
      </div>
    </div>
  );
}
