import React, { useState, useEffect } from 'react';
import { MasterGridDashboard } from './components/MasterGridDashboard';
import { BiometricActionDeck } from './components/BiometricActionDeck';
import { VagalToneAnalysisCard } from './components/VagalToneAnalysisCard';
import { AudioConfigMenu } from './components/AudioConfigMenu';
import { WaveAnalyzer } from './components/WaveAnalyzer';
import { WaveformAnalyzer } from './components/WaveformAnalyzer';
import { FuturisticMap } from './components/FuturisticMap';
import { DataLogDashboard } from './components/DataLogDashboard';
import { SyncMonitorDeck } from './components/SyncMonitorDeck';
import { PerfTesterDeck } from './components/PerfTesterDeck';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { useBleBiometrics } from './hooks/useBleBiometrics';
import { useIndexedDB } from './hooks/useIndexedDB';
import { startAudioProtectionFreq, stopAudioProtectionFreq, getAnalyserNode } from './utils/audioEngine';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon, Shield, Activity, Radio, Volume2 } from 'lucide-react';

export const GridGuardianApp = () => {
  // Initialize state to track the active tab, defaulting to 'biometrics' as specified
  const [activeTab, setActiveTab] = useState<'dashboard' | 'biometrics' | 'audio' | 'diagnostics'>('biometrics');

  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<number>(432.0);
  const [waveType, setWaveType] = useState<OscillatorType>('sine');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const { isWhiteTheme, toggleTheme } = useTheme();

  const GATESVILLE_LAT = 31.4351;
  const GATESVILLE_LON = -97.7439;

  const { heartRate, hrv, hrvHistory, isBleConnected, connectGattDevice, disconnectGattDevice } = useBleBiometrics();
  const { wellnessLogs, customPins, saveWellnessLog, saveCustomPin, deleteCustomPin } = useIndexedDB();

  useEffect(() => {
    setAnalyser(isAudioActive ? getAnalyserNode() : null);
  }, [isAudioActive]);

  useEffect(() => {
    const runNetworkAudit = () => {
      if ('performance' in window) {
        const resourceLogs = performance.getEntriesByType('resource');
        resourceLogs.forEach((resource: any) => {
          if (resource.name && (resource.name.includes('sw.js') || resource.name.includes('assets/') || resource.name.includes('arcgis'))) {
            const name = resource.name.split('/').pop() || 'resource';
            console.log(`📦 [RESOURCE] ${name} | Wire: ${(resource.transferSize / 1024).toFixed(2)}KB | Unpacked: ${(resource.decodedBodySize / 1024).toFixed(2)}KB`);
          }
        });
      }
    };
    const timer = setTimeout(runNetworkAudit, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleAudio = () => {
    if (isAudioActive) {
      stopAudioProtectionFreq();
      setIsAudioActive(false);
    } else {
      startAudioProtectionFreq(frequency, waveType);
      setIsAudioActive(true);
    }
  };

  const handleActionTrigger = (actionType: string) => {
    if (actionType === 'ANUHAZI_CHANT') {
      handleToggleAudio();
    } else if (actionType === 'YOGA_STRETCH') {
      saveWellnessLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'YOGA_STRETCH',
        heartRateBefore: heartRate || 75,
        heartRateAfter: 70,
        notes: 'Vagus nerve calibration routine completed'
      });
    } else if (actionType === 'BREATHING_478') {
      saveWellnessLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'BREATHING_478',
        heartRateBefore: heartRate || 75,
        heartRateAfter: Math.max(54, (heartRate || 75) - 8),
        notes: '4-7-8 Vagal breathing protocol (4 cycles) completed. Parasympathetic brake engaged.'
      });
    }
  };

  // Define tabs aligned with Keylontic and Kristic ideals
  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'KATHARA GRID · VECTOR MATRIX',
      icon: '🌐',
      kristicRole: 'Shield Vectors & Safe Zones'
    },
    {
      id: 'biometrics' as const,
      label: 'KRISTIC BIO-REGENESIS',
      icon: '🫀',
      kristicRole: 'Maharic Vagal Realignment & 4-7-8'
    },
    {
      id: 'audio' as const,
      label: 'ANUHAZI SCALAR HARMONICS',
      icon: '🎼',
      kristicRole: 'Kee-Ra-ShA Sound Currents & Music'
    },
    {
      id: 'diagnostics' as const,
      label: 'MERKABA SHIELD & TELEMETRY',
      icon: '🛡️',
      kristicRole: 'GATT Sensor & Cryptographic Logs'
    }
  ];

  // Function to conditionally render the active deck
  const renderActiveDeck = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-4">
            <MasterGridDashboard />
            <FuturisticMap
              centerLat={GATESVILLE_LAT}
              centerLon={GATESVILLE_LON}
              customPins={customPins}
              onSaveCustomPin={saveCustomPin}
              onDeleteCustomPin={deleteCustomPin}
            />
          </div>
        );

      case 'biometrics':
        return (
          <div className="space-y-4">
            <BiometricActionDeck
              heartRateBpm={heartRate || 75}
              hrvMs={hrv || 48}
              isBleConnected={isBleConnected}
              onTriggerRoutine={handleActionTrigger}
              logs={wellnessLogs}
            />
            <VagalToneAnalysisCard
              hrvHistory={hrvHistory}
              currentHrv={hrv}
              logs={wellnessLogs}
            />
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <AudioConfigMenu
              activeFreq={frequency}
              activeWave={waveType}
              isAudioActive={isAudioActive}
              onSettingsChange={(f, w) => {
                setFrequency(f);
                setWaveType(w);
                if (isAudioActive) startAudioProtectionFreq(f, w);
              }}
              onToggleAudio={handleToggleAudio}
            />
            <WaveformAnalyzer externalAnalyserNode={analyser} />
            <WaveAnalyzer analyserNode={analyser} isAudioActive={isAudioActive} />
          </div>
        );

      case 'diagnostics':
        return (
          <div className="space-y-4">
            <SyncMonitorDeck hrvHistory={hrvHistory} currentHrv={hrv} />
            <div style={{
              backgroundColor: isWhiteTheme ? '#ffffff' : '#070c17',
              border: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1a2636',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    WEARABLE TELEMETRY GATT SENSOR
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isBleConnected
                    ? (isWhiteTheme ? '#dcfce7' : '#064e3b')
                    : (isWhiteTheme ? '#f1f5f9' : '#1e293b'),
                  color: isBleConnected
                    ? (isWhiteTheme ? '#15803d' : '#34d399')
                    : (isWhiteTheme ? '#64748b' : '#94a3b8')
                }}>
                  {isBleConnected ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <button
                onClick={isBleConnected ? disconnectGattDevice : connectGattDevice}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: isBleConnected
                    ? (isWhiteTheme ? '#fee2e2' : 'rgba(255,0,51,0.1)')
                    : (isWhiteTheme ? '#0284c7' : '#0284c7'),
                  color: '#ffffff',
                  border: isBleConnected
                    ? (isWhiteTheme ? '1px solid #fca5a5' : '1px solid #ff0033')
                    : 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isBleConnected ? '❌ DISCONNECT WEARABLE SENSOR' : '🔗 SYNC BIOMETRIC DEVICE (BLUETOOTH / EMULATED)'}
              </button>
            </div>
            <DataLogDashboard logs={wellnessLogs} pins={customPins} />
            <PerfTesterDeck />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: isWhiteTheme ? '#f1f5f9' : '#020408',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      color: isWhiteTheme ? '#0f172a' : '#c0d4ec',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      {/* Top Vector Modulation Status Lock Banner */}
      <div style={{
        backgroundColor: isAudioActive
          ? (isWhiteTheme ? '#0284c7' : '#00ffcc')
          : (isWhiteTheme ? '#ffffff' : '#0a101d'),
        color: isAudioActive
          ? '#ffffff'
          : (isWhiteTheme ? '#475569' : '#8fa0ba'),
        padding: '7px 16px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        borderBottom: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1a2636',
        letterSpacing: '0.06em',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAudioActive ? '#22c55e' : (isBleConnected ? '#38bdf8' : '#94a3b8')
          }} />
          <span>
            {isAudioActive ? '🔊 KEE-RA-SHA SCALAR MODULATION ACTIVE · KRISTIC HARMONIC LOCK' : 'KATHARA HUB STANDBY // SCALAR SOUND CURRENT OFFLINE'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
          <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>
            NODE: <strong>GATESVILLE-TX</strong>
          </span>
          <span style={{ color: isWhiteTheme ? '#64748b' : '#94a3b8' }}>
            HR: <strong style={{ color: (heartRate || 75) > 85 ? '#ef4444' : '#10b981' }}>{heartRate || 75} BPM</strong>
          </span>
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #334155',
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
            title={isWhiteTheme ? 'Switch to Dark Cybernetic UI' : 'Switch to White Clinical Lab UI'}
          >
            {isWhiteTheme ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            <span>{isWhiteTheme ? 'DARK' : 'WHITE UI'}</span>
          </button>
        </div>
      </div>

      {/* Top Tab Navigation Bar */}
      <nav style={{
        backgroundColor: isWhiteTheme ? '#ffffff' : '#070c17',
        borderBottom: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1a2636',
        display: 'flex',
        padding: '0 16px',
        gap: '4px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        overflowX: 'auto',
        boxShadow: isWhiteTheme ? '0 1px 3px rgba(0,0,0,0.03)' : 'none'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px',
                backgroundColor: isActive
                  ? (isWhiteTheme ? '#f8fafc' : '#0e1726')
                  : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #0284c7' : '3px solid transparent', // Cobalt active indicator
                color: isActive
                  ? (isWhiteTheme ? '#0f172a' : '#38bdf8')
                  : (isWhiteTheme ? '#64748b' : '#7ea1c9'),
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '2px',
                transition: 'all 0.2s ease',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                <span style={{ fontWeight: 'bold' }}>{tab.label}</span>
              </div>
              <span style={{
                fontSize: '9px',
                opacity: 0.75,
                paddingLeft: '23px',
                fontFamily: 'monospace'
              }}>
                {tab.kristicRole}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        padding: '24px 16px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {renderActiveDeck()}
      </main>

      <PwaUpdatePrompt />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <GridGuardianApp />
    </ThemeProvider>
  );
}
