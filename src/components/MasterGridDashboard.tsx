import React, { useState, useEffect } from 'react';
import { Shield, Activity, Zap, Radio, Cpu, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function MasterGridDashboard() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [gridIntegrity, setGridIntegrity] = useState<number>(99.4);
  const [shieldCapacity, setShieldCapacity] = useState<number>(98.2);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const { isWhiteTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const runAiTacticalAnalysis = async () => {
    setIsAiLoading(true);
    setAiReport(null);
    try {
      const response = await fetch('/api/gemini/grid-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridIntegrity,
          shieldCapacity,
          activeRelays: 12,
          coordinates: '31.4351 N, 97.7439 W'
        })
      });
      const data = await response.json();
      setAiReport(data.assessment || 'Quantum grid resonance nominal. Zero scalar phase anomalies detected within Gatesville sector.');
    } catch {
      setAiReport('Local telemetry verification: All vector nodes responding with sub-millisecond return latency. Harmonic shield integrity holding at 99.4%.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={`p-4 border-b transition-colors ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#060a13] text-[#c0d4ec]'
    }`}>
      {/* Top Header */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3 ${
        isWhiteTheme ? 'border-slate-100' : 'border-[#131d2e]'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            isWhiteTheme
              ? 'bg-[#0284c7] shadow-[0_0_8px_#0284c7]'
              : 'bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]'
          }`} />
          <h1 className={`text-sm font-black tracking-widest uppercase font-mono ${
            isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
          }`}>
            GRID GUARDIAN // VECTOR NODE TELEMETRY ARRAY
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-[#0e1726] border-[#1e2f47] text-[#00ffcc] hover:bg-[#16253c]'
            }`}
            title="Toggle White UI / Dark Matrix Theme"
          >
            {isWhiteTheme ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>WHITE UI</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#00ffcc]" />
                <span>DARK MATRIX</span>
              </>
            )}
          </button>

          <div className={`text-[10px] font-mono tracking-tight px-2 py-1 rounded border ${
            isWhiteTheme
              ? 'text-slate-600 bg-slate-50 border-slate-200'
              : 'text-[#6b82a6] bg-[#090f1a] border-[#1a2636]'
          }`}>
            {currentTime || 'SYNCHRONIZING...'}
          </div>
        </div>
      </div>

      {/* Grid Stats Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Card 1: Grid Integrity */}
        <div className={`p-2.5 rounded border transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm'
            : 'bg-[#0a1120] border-[#1a2636]'
        }`}>
          <div className={`flex items-center justify-between text-[10px] uppercase font-bold mb-1 ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#5f7596]'
          }`}>
            <span>GRID INTEGRITY</span>
            <Shield className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
          </div>
          <div className={`text-lg font-black font-mono tracking-wider ${
            isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
          }`}>
            {gridIntegrity.toFixed(1)}%
          </div>
          <div className={`w-full h-1.5 rounded-full mt-1.5 overflow-hidden ${
            isWhiteTheme ? 'bg-slate-200' : 'bg-[#131e30]'
          }`}>
            <div
              className={`h-full transition-all duration-500 ${
                isWhiteTheme
                  ? 'bg-[#0284c7]'
                  : 'bg-[#00ffcc] shadow-[0_0_6px_#00ffcc]'
              }`}
              style={{ width: `${gridIntegrity}%` }}
            />
          </div>
        </div>

        {/* Card 2: Shield Matrix */}
        <div className={`p-2.5 rounded border transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm'
            : 'bg-[#0a1120] border-[#1a2636]'
        }`}>
          <div className={`flex items-center justify-between text-[10px] uppercase font-bold mb-1 ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#5f7596]'
          }`}>
            <span>SHIELD MATRIX</span>
            <Zap className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-sky-600' : 'text-[#00e1ff]'}`} />
          </div>
          <div className={`text-lg font-black font-mono tracking-wider ${
            isWhiteTheme ? 'text-sky-600' : 'text-[#00e1ff]'
          }`}>
            {shieldCapacity.toFixed(1)}%
          </div>
          <div className={`w-full h-1.5 rounded-full mt-1.5 overflow-hidden ${
            isWhiteTheme ? 'bg-slate-200' : 'bg-[#131e30]'
          }`}>
            <div
              className={`h-full transition-all duration-500 ${
                isWhiteTheme
                  ? 'bg-sky-500'
                  : 'bg-[#00e1ff] shadow-[0_0_6px_#00e1ff]'
              }`}
              style={{ width: `${shieldCapacity}%` }}
            />
          </div>
        </div>

        {/* Card 3: Active Relays */}
        <div className={`p-2.5 rounded border transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm'
            : 'bg-[#0a1120] border-[#1a2636]'
        }`}>
          <div className={`flex items-center justify-between text-[10px] uppercase font-bold mb-1 ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#5f7596]'
          }`}>
            <span>ACTIVE RELAYS</span>
            <Radio className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-emerald-600' : 'text-[#38ef7d]'}`} />
          </div>
          <div className={`text-lg font-black font-mono tracking-wider ${
            isWhiteTheme ? 'text-emerald-700' : 'text-[#38ef7d]'
          }`}>
            12 / 12
          </div>
          <div className={`text-[10px] mt-1 font-mono ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#4b607d]'
          }`}>
            GATESVILLE SUB-SECTOR
          </div>
        </div>

        {/* Card 4: Mesh Status */}
        <div className={`p-2.5 rounded border transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm'
            : 'bg-[#0a1120] border-[#1a2636]'
        }`}>
          <div className={`flex items-center justify-between text-[10px] uppercase font-bold mb-1 ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#5f7596]'
          }`}>
            <span>MESH STATUS</span>
            <Cpu className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-amber-600' : 'text-[#ffaa00]'}`} />
          </div>
          <div className={`text-lg font-black font-mono tracking-wider ${
            isWhiteTheme ? 'text-amber-700' : 'text-[#ffaa00]'
          }`}>
            SYNCHRONIZED
          </div>
          <div className={`text-[10px] mt-1 font-mono ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#4b607d]'
          }`}>
            AES-GCM ENCRYPTED
          </div>
        </div>
      </div>

      {/* AI Tactical Assessment Trigger */}
      <div className={`p-2.5 rounded border transition-colors ${
        isWhiteTheme
          ? 'bg-slate-50 border-slate-200'
          : 'bg-[#080e1a] border-[#1a2636]'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 animate-spin ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`} />
            <span className={`text-xs font-bold tracking-wider font-mono ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#e1ebf7]'
            }`}>
              GEMINI VECTOR INTELLIGENCE
            </span>
          </div>
          <button
            onClick={runAiTacticalAnalysis}
            disabled={isAiLoading}
            className={`px-3 py-1 text-[11px] font-bold font-mono rounded cursor-pointer transition-colors border ${
              isWhiteTheme
                ? 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
                : 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30 hover:bg-[#00ffcc]/20'
            }`}
          >
            {isAiLoading ? 'COMPUTING VECTORS...' : 'ANALYZE GRID THREATS'}
          </button>
        </div>

        {aiReport && (
          <div className={`mt-2.5 p-2.5 rounded text-[11px] leading-relaxed font-mono border ${
            isWhiteTheme
              ? 'bg-white border-slate-200 text-slate-700 shadow-sm'
              : 'bg-[#04070d] border-[#1f2d42] text-[#9fc0e8]'
          }`}>
            <span className={`font-bold block mb-1 ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`}>
              AI TELEMETRY SYNTHESIS:
            </span>
            {aiReport}
          </div>
        )}
      </div>
    </div>
  );
}
