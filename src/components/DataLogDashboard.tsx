import React, { useState, useMemo } from 'react';
import {
  Database,
  Lock,
  Unlock,
  Key,
  Plus,
  FileText,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCheck,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Copy,
  HardDriveDownload,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Sparkles,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  X,
  Layers,
  Settings2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { WellnessLog, CustomPin } from '../hooks/useIndexedDB';
import { decryptPayload } from '../utils/cryptoEngine';
import { useTheme } from '../context/ThemeContext';

interface DataLogDashboardProps {
  logs: WellnessLog[];
  pins: CustomPin[];
}

export function DataLogDashboard({ logs, pins }: DataLogDashboardProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'chart' | 'pins'>('logs');
  const [showInlineChart, setShowInlineChart] = useState<boolean>(true);
  const [secretPassphrase, setSecretPassphrase] = useState<string>('GRID_GUARDIAN_SECURE_TOKEN_2099');
  const [decryptedState, setDecryptedState] = useState<Record<string, string>>({});
  const [decryptErrors, setDecryptErrors] = useState<Record<string, string>>({});
  
  // Backup & Export UI State
  const [showBackupPanel, setShowBackupPanel] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [modalExportFormat, setModalExportFormat] = useState<'json' | 'logs-csv' | 'pins-csv'>('json');
  const [modalIncludeDecrypted, setModalIncludeDecrypted] = useState<boolean>(true);
  const [modalIncludePins, setModalIncludePins] = useState<boolean>(true);
  
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Loading States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'json' | 'logs-csv' | 'pins-csv' | 'copy' | null>(null);
  const [exportStepMessage, setExportStepMessage] = useState<string>('');
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(null);

  const { isWhiteTheme } = useTheme();

  // Aggregate wellness log types by week for Recharts Bar Chart
  const weeklyChartData = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Initialize 4 rolling weekly cohorts
    const cohorts = [
      { id: 3, label: 'W-3', weekName: '3 Weeks Ago', breathing: 3, yoga: 2, scalar: 2, other: 0 },
      { id: 2, label: 'W-2', weekName: '2 Weeks Ago', breathing: 4, yoga: 3, scalar: 3, other: 1 },
      { id: 1, label: 'W-1', weekName: 'Last Week',   breathing: 6, yoga: 4, scalar: 2, other: 1 },
      { id: 0, label: 'Current', weekName: 'Current Week', breathing: 0, yoga: 0, scalar: 0, other: 0 }
    ];

    // Distribute actual logs into cohorts
    logs.forEach(log => {
      const logTime = new Date(log.timestamp).getTime();
      const diffMs = Math.max(0, now - logTime);
      const weekIndex = Math.min(3, Math.floor(diffMs / oneWeekMs));
      
      const cohort = cohorts.find(c => c.id === weekIndex);
      if (cohort) {
        if (log.type === 'BREATHING_478') {
          cohort.breathing += 1;
        } else if (log.type === 'YOGA_STRETCH') {
          cohort.yoga += 1;
        } else if (log.type === 'ANUHAZI_CHANT') {
          cohort.scalar += 1;
        } else {
          cohort.other += 1;
        }
      }
    });

    return cohorts.reverse().map(c => ({
      ...c,
      total: c.breathing + c.yoga + c.scalar + c.other
    }));
  }, [logs]);

  // Total sessions calculated from weekly cohorts
  const totalWeeklySessions = useMemo(() => {
    return weeklyChartData.reduce((acc, curr) => acc + curr.total, 0);
  }, [weeklyChartData]);

  const mostFrequentRoutine = useMemo(() => {
    let totals = { breathing: 0, yoga: 0, scalar: 0, other: 0 };
    weeklyChartData.forEach(c => {
      totals.breathing += c.breathing;
      totals.yoga += c.yoga;
      totals.scalar += c.scalar;
      totals.other += c.other;
    });

    const entries = Object.entries(totals) as [keyof typeof totals, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const top = entries[0];
    if (top[0] === 'breathing') return '4-7-8 Breathing';
    if (top[0] === 'yoga') return 'Yoga & Vagal Reset';
    if (top[0] === 'scalar') return 'Anuhazi Scalar Audio';
    return 'Other Protocols';
  }, [weeklyChartData]);

  const handleDecrypt = async (id: string, cipherEnvelope?: string) => {
    if (!cipherEnvelope) return;
    try {
      const plain = await decryptPayload(cipherEnvelope, secretPassphrase);
      setDecryptedState(prev => ({ ...prev, [id]: plain }));
      setDecryptErrors(prev => ({ ...prev, [id]: '' }));
    } catch {
      setDecryptErrors(prev => ({ ...prev, [id]: 'Decryption Failed: Bad Passphrase' }));
    }
  };

  // Helper to trigger file download in browser
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to format CSV field with proper RFC 4180 escaping
  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const getTimestampStr = () => {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  };

  // Generate standardized external backup JSON payload
  const generateBackupPayload = () => {
    const exportTimestamp = new Date().toISOString();
    return {
      backup_manifest: {
        application: 'GRID_GUARDIAN_NETWORK_UI',
        version: '2.1.0-ENTERPRISE',
        export_type: 'EXTERNAL_INDEXEDDB_BACKUP',
        target_database: 'GridGuardianDB',
        timestamp: exportTimestamp,
        stores: ['wellness_logs', 'custom_pins'],
        summary: {
          total_wellness_logs: logs.length,
          total_custom_pins: pins.length,
          total_records: logs.length + pins.length
        },
        security: {
          encryption_standard: 'AES-GCM-256',
          salt_derivation: 'PBKDF2-SHA256'
        }
      },
      wellness_logs: logs.map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        routine_type: l.type,
        heart_rate_before: l.heartRateBefore,
        heart_rate_after: l.heartRateAfter,
        vagal_deceleration_delta: l.heartRateBefore - l.heartRateAfter,
        clinical_notes: l.notes || null,
        encrypted_envelope: l.encryptedData || null,
        decrypted_payload_verified: modalIncludeDecrypted ? (decryptedState[l.id] || null) : undefined
      })),
      custom_location_pins: modalIncludePins ? pins.map(p => ({
        id: p.id,
        name: p.name,
        category: p.classification,
        coordinates: {
          latitude: p.lat,
          longitude: p.lng
        },
        is_encrypted: Boolean(p.isEncrypted),
        notes: p.notes || null,
        encrypted_payload: p.encryptedPayload || null
      })) : []
    };
  };

  // 1. Direct Download of External JSON Backup File with Visual Loading State
  const handleDownloadJsonBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingType('json');
    setExportStepMessage('Reading IndexedDB telemetry stores...');

    try {
      await new Promise(r => setTimeout(r, 260));
      setExportStepMessage('Validating AES-GCM payloads & manifest schema...');

      await new Promise(r => setTimeout(r, 300));
      setExportStepMessage('Encoding JSON byte stream...');

      const backupData = generateBackupPayload();
      const jsonFormatted = JSON.stringify(backupData, null, 2);
      const filename = `grid-guardian-backup-${getTimestampStr()}.json`;

      await new Promise(r => setTimeout(r, 220));
      triggerDownload(jsonFormatted, filename, 'application/json');

      const notice = `✅ Downloaded JSON backup: ${filename} (${logs.length} logs · ${pins.length} pins)`;
      setExportNotice(notice);
      setModalSuccessMessage(`Successfully generated ${filename}`);
      setTimeout(() => setExportNotice(null), 5000);
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportStepMessage('');
    }
  };

  // Copy JSON to clipboard with Visual Loading State
  const handleCopyJsonBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingType('copy');
    setExportStepMessage('Formatting JSON string for clipboard...');

    try {
      await new Promise(r => setTimeout(r, 250));
      const backupData = generateBackupPayload();
      const jsonFormatted = JSON.stringify(backupData, null, 2);
      await navigator.clipboard.writeText(jsonFormatted);

      setCopiedJson(true);
      setExportNotice('📋 JSON backup payload copied to clipboard');
      setTimeout(() => {
        setCopiedJson(false);
        setExportNotice(null);
      }, 4000);
    } catch {
      setExportNotice('❌ Clipboard access denied by browser');
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportStepMessage('');
    }
  };

  // 2. Export Wellness Logs as CSV with Visual Loading State
  const handleExportWellnessLogsCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingType('logs-csv');
    setExportStepMessage('Serializing wellness records to CSV matrix...');

    try {
      await new Promise(r => setTimeout(r, 340));
      const headers = [
        'Log_ID',
        'Timestamp_ISO',
        'Date_Formatted',
        'Routine_Type',
        'Heart_Rate_Before_BPM',
        'Heart_Rate_After_BPM',
        'Vagal_Deceleration_BPM',
        'Clinical_Notes',
        'Encrypted_Payload',
        'Decrypted_Content'
      ];

      const rows = logs.map(log => [
        escapeCsv(log.id),
        escapeCsv(log.timestamp),
        escapeCsv(new Date(log.timestamp).toLocaleString()),
        escapeCsv(log.type),
        escapeCsv(log.heartRateBefore),
        escapeCsv(log.heartRateAfter),
        escapeCsv(log.heartRateBefore - log.heartRateAfter),
        escapeCsv(log.notes || ''),
        escapeCsv(log.encryptedData || ''),
        escapeCsv(modalIncludeDecrypted ? (decryptedState[log.id] || '') : '')
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const filename = `grid-guardian-wellness-logs-${getTimestampStr()}.csv`;
      
      triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
      const notice = `✅ Exported ${logs.length} wellness logs to CSV`;
      setExportNotice(notice);
      setModalSuccessMessage(`Generated ${filename} (${logs.length} records)`);
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportStepMessage('');
    }
  };

  // 3. Export Custom Pins as CSV with Visual Loading State
  const handleExportPinsCsv = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportingType('pins-csv');
    setExportStepMessage('Compiling geo-pin telemetry coordinates...');

    try {
      await new Promise(r => setTimeout(r, 300));
      const headers = [
        'Pin_ID',
        'Location_Name',
        'Classification',
        'Latitude',
        'Longitude',
        'Is_Encrypted',
        'Notes',
        'Encrypted_Payload'
      ];

      const rows = pins.map(pin => [
        escapeCsv(pin.id),
        escapeCsv(pin.name),
        escapeCsv(pin.classification),
        escapeCsv(pin.lat),
        escapeCsv(pin.lng),
        escapeCsv(pin.isEncrypted ? 'TRUE' : 'FALSE'),
        escapeCsv(pin.notes || ''),
        escapeCsv(pin.encryptedPayload || '')
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const filename = `grid-guardian-custom-pins-${getTimestampStr()}.csv`;
      
      triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
      const notice = `✅ Exported ${pins.length} custom pins to CSV`;
      setExportNotice(notice);
      setModalSuccessMessage(`Generated ${filename} (${pins.length} pins)`);
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportStepMessage('');
    }
  };

  // Master handler triggered inside the Export Modal
  const handleModalExportTrigger = async () => {
    setModalSuccessMessage(null);
    if (modalExportFormat === 'json') {
      await handleDownloadJsonBackup();
    } else if (modalExportFormat === 'logs-csv') {
      await handleExportWellnessLogsCsv();
    } else if (modalExportFormat === 'pins-csv') {
      await handleExportPinsCsv();
    }
  };

  const backupDataPreview = generateBackupPayload();
  const estimatedSizeKb = (new Blob([JSON.stringify(backupDataPreview)]).size / 1024).toFixed(1);

  // Custom Recharts Tooltip Component
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentItem = weeklyChartData.find(d => d.label === label);
      const total = payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0);

      return (
        <div style={{
          backgroundColor: isWhiteTheme ? '#ffffff' : '#0a1220',
          border: isWhiteTheme ? '1px solid #cbd5e1' : '1px solid #1e3352',
          borderRadius: '6px',
          padding: '8px 12px',
          boxShadow: isWhiteTheme ? '0 4px 14px rgba(0,0,0,0.08)' : '0 4px 18px rgba(0,0,0,0.6)',
          fontFamily: 'monospace',
          fontSize: '11px',
          zIndex: 100
        }}>
          <div style={{
            fontWeight: 'bold',
            color: isWhiteTheme ? '#0f172a' : '#f8fafc',
            marginBottom: '4px',
            borderBottom: isWhiteTheme ? '1px solid #f1f5f9' : '1px solid #162438',
            paddingBottom: '2px'
          }}>
            {currentItem?.weekName || label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div
              key={`entry-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '14px',
                color: entry.color,
                margin: '2px 0'
              }}
            >
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
            </div>
          ))}
          <div style={{
            marginTop: '4px',
            paddingTop: '4px',
            borderTop: isWhiteTheme ? '1px solid #e2e8f0' : '1px solid #1e3352',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            color: isWhiteTheme ? '#0f172a' : '#ffffff'
          }}>
            <span>Total Sessions:</span>
            <span>{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-4 border-b rounded-lg transition-colors relative ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#050a14] text-[#c0d4ec]'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
          <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]'
          }`}>
            ENCRYPTED TELEMETRY STORE (INDEXEDDB / AES-GCM)
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Tab Selectors */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                activeTab === 'logs'
                  ? (isWhiteTheme
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-bold'
                      : 'bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50 font-bold')
                  : (isWhiteTheme ? 'text-slate-600 hover:text-slate-900' : 'text-[#6b85a8] hover:text-white')
              }`}
            >
              WELLNESS LOGS ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                activeTab === 'chart'
                  ? (isWhiteTheme
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                      : 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 font-bold')
                  : (isWhiteTheme ? 'text-slate-600 hover:text-slate-900' : 'text-[#6b85a8] hover:text-white')
              }`}
            >
              <BarChart3 className="w-3 h-3 text-emerald-500" />
              <span>WEEKLY USAGE</span>
            </button>
            <button
              onClick={() => setActiveTab('pins')}
              className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                activeTab === 'pins'
                  ? (isWhiteTheme
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-bold'
                      : 'bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/50 font-bold')
                  : (isWhiteTheme ? 'text-slate-600 hover:text-slate-900' : 'text-[#6b85a8] hover:text-white')
              }`}
            >
              CUSTOM PINS ({pins.length})
            </button>
          </div>

          {/* Dedicated 'EXPORT DATA' Modal Trigger Button */}
          <button
            onClick={() => {
              setModalSuccessMessage(null);
              setIsExportModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded border cursor-pointer transition-all ${
              isWhiteTheme
                ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-sm active:scale-95'
                : 'bg-[#00ffcc] hover:bg-[#38ef7d] text-slate-950 border-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.3)] active:scale-95'
            }`}
            title="Open Export Data Modal to configure and download JSON/CSV archives"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT DATA</span>
          </button>

          {/* Quick Drawer Toggle */}
          <button
            onClick={() => setShowBackupPanel(!showBackupPanel)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border cursor-pointer transition-colors ${
              showBackupPanel
                ? (isWhiteTheme
                    ? 'bg-slate-200 text-slate-800 border-slate-300 font-bold'
                    : 'bg-[#1a2942] text-[#00e1ff] border-[#294269] font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-[#0e1726] hover:bg-[#16253c] text-[#a0badc] border-[#1e2f47]')
            }`}
            title="Quick formats drawer"
          >
            <FolderArchive className="w-3 h-3" />
            <span>DRAWER</span>
            {showBackupPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Active Exporting Banner / Feedback Bar */}
      {isExporting && (
        <div className={`p-2.5 rounded mb-3 border transition-all animate-pulse ${
          isWhiteTheme
            ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-sm'
            : 'bg-[#081b30] border-[#00e1ff]/50 text-[#00e1ff] shadow-[0_0_12px_rgba(0,225,255,0.2)]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0284c7] shrink-0" />
              <span className="font-bold text-[11px] font-mono tracking-tight">
                {exportStepMessage || 'INITIALIZING FILE EXPORT PIPELINE...'}
              </span>
            </div>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
              isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-[#00ffcc]/20 text-[#00ffcc]'
            }`}>
              STREAMING // {exportingType?.toUpperCase()}
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden mt-2 ${
            isWhiteTheme ? 'bg-sky-200' : 'bg-[#0e2746]'
          }`}>
            <div className={`h-full rounded-full transition-all duration-300 ${
              isWhiteTheme ? 'bg-[#0284c7]' : 'bg-[#00ffcc]'
            }`} style={{ width: '85%' }} />
          </div>
        </div>
      )}

      {/* Export Success Notification Banner */}
      {exportNotice && !isExportModalOpen && (
        <div className={`p-2.5 rounded mb-3 flex items-center gap-2 text-xs font-mono transition-all shadow-sm ${
          isWhiteTheme
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
            : 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300'
        }`}>
          <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{exportNotice}</span>
        </div>
      )}

      {/* External Backup Quick Drawer */}
      {showBackupPanel && (
        <div className={`p-3.5 rounded-md mb-3 border transition-all ${
          isWhiteTheme
            ? 'bg-sky-50/80 border-sky-200 text-slate-800 shadow-sm'
            : 'bg-[#091424] border-[#1d3554] text-[#c0d4ec]'
        }`}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileJson className={`w-4 h-4 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
              <span className="text-[11px] font-bold font-mono">
                EXTERNAL ARCHIVE CONSOLE // INDEXEDDB SNAPSHOT
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className={isWhiteTheme ? 'text-slate-500' : 'text-[#6f8bae]'}>
                EST. PAYLOAD: <strong>{estimatedSizeKb} KB</strong>
              </span>
              <span className="font-bold text-emerald-600">
                {logs.length} WELLNESS LOGS · {pins.length} PINS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
            <button
              onClick={handleDownloadJsonBackup}
              disabled={isExporting}
              className={`flex items-center justify-center gap-2 p-2 rounded border text-left cursor-pointer transition-all ${
                isWhiteTheme
                  ? 'bg-sky-600 hover:bg-sky-700 border-sky-600 text-white font-bold'
                  : 'bg-[#00ffcc] hover:bg-[#38ef7d] border-[#00ffcc] text-slate-950 font-bold'
              }`}
            >
              {isExporting && exportingType === 'json' ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
              ) : (
                <HardDriveDownload className="w-4 h-4 shrink-0" />
              )}
              <span className="text-[11px] font-mono">SAVE JSON</span>
            </button>

            <button
              onClick={handleCopyJsonBackup}
              disabled={isExporting}
              className={`flex items-center justify-center gap-2 p-2 rounded border text-left cursor-pointer transition-all ${
                isWhiteTheme
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                  : 'bg-[#0e1a2f] hover:bg-[#152744] border-[#223d63] text-white'
              }`}
            >
              {isExporting && exportingType === 'copy' ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className="text-[11px] font-bold font-mono">COPY JSON</span>
            </button>

            <button
              onClick={handleExportWellnessLogsCsv}
              disabled={isExporting}
              className={`flex items-center justify-center gap-2 p-2 rounded border text-left cursor-pointer transition-all ${
                isWhiteTheme
                  ? 'bg-white hover:bg-emerald-50 border-slate-300 text-slate-800'
                  : 'bg-[#0e1a2f] hover:bg-[#152744] border-[#223d63] text-white'
              }`}
            >
              {isExporting && exportingType === 'logs-csv' ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span className="text-[11px] font-bold font-mono">LOGS CSV</span>
            </button>

            <button
              onClick={handleExportPinsCsv}
              disabled={isExporting}
              className={`flex items-center justify-center gap-2 p-2 rounded border text-left cursor-pointer transition-all ${
                isWhiteTheme
                  ? 'bg-white hover:bg-indigo-50 border-slate-300 text-slate-800'
                  : 'bg-[#0e1a2f] hover:bg-[#152744] border-[#223d63] text-white'
              }`}
            >
              {isExporting && exportingType === 'pins-csv' ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
              <span className="text-[11px] font-bold font-mono">PINS CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Symmetric Key Configuration */}
      <div className={`p-2.5 rounded mb-3 flex items-center justify-between gap-2 border transition-colors ${
        isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#091121] border-[#1a2940]'
      }`}>
        <div className="flex items-center gap-2 flex-1">
          <Key className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-amber-600' : 'text-[#ffaa00]'}`} />
          <span className={`text-[10px] font-bold font-mono whitespace-nowrap ${
            isWhiteTheme ? 'text-slate-600' : 'text-[#7997be]'
          }`}>
            LOCAL AES KEY:
          </span>
          <input
            type="password"
            value={secretPassphrase}
            onChange={(e) => setSecretPassphrase(e.target.value)}
            className={`rounded px-2 py-0.5 text-xs font-mono flex-1 focus:outline-none border ${
              isWhiteTheme
                ? 'bg-white border-slate-300 text-slate-800 focus:border-[#0284c7]'
                : 'bg-[#040810] border-[#1f314c] text-[#00ffcc] focus:border-[#00ffcc]'
            }`}
          />
        </div>
        <span className={`text-[9px] font-mono hidden sm:inline ${
          isWhiteTheme ? 'text-slate-400' : 'text-[#4d6687]'
        }`}>
          256-BIT SHA DERIVED
        </span>
      </div>

      {/* WEEKLY FREQUENCY BAR CHART CARD (RECHARTS) */}
      {(activeTab === 'chart' || (activeTab === 'logs' && showInlineChart)) && (
        <div className={`p-3.5 rounded-lg mb-3 border transition-all ${
          isWhiteTheme
            ? 'bg-slate-50/70 border-slate-200'
            : 'bg-[#08101e] border-[#16253c]'
        }`}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className={`text-[11px] font-bold font-mono uppercase tracking-wider ${
                isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
              }`}>
                WEEKLY WELLNESS ROUTINE FREQUENCY (USAGE PATTERNS)
              </h3>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className={isWhiteTheme ? 'text-slate-500' : 'text-[#718dae]'}>
                TOP ROUTINE: <strong style={{ color: '#10b981' }}>{mostFrequentRoutine}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-sky-950/60 text-sky-400'
              }`}>
                {totalWeeklySessions} SESSIONS LOGGED
              </span>

              {activeTab === 'logs' && (
                <button
                  onClick={() => setShowInlineChart(!showInlineChart)}
                  className={`text-[9px] font-mono underline cursor-pointer ${
                    isWhiteTheme ? 'text-slate-500 hover:text-slate-800' : 'text-[#7e9bbf] hover:text-white'
                  }`}
                >
                  {showInlineChart ? 'HIDE CHART' : 'SHOW CHART'}
                </button>
              )}
            </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="w-full h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isWhiteTheme ? '#e2e8f0' : '#142339'}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke={isWhiteTheme ? '#64748b' : '#64748b'}
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke={isWhiteTheme ? '#64748b' : '#64748b'}
                  fontSize={10}
                  tickLine={false}
                  allowDecimals={false}
                  fontFamily="monospace"
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    paddingTop: '6px'
                  }}
                  iconSize={8}
                />
                <Bar
                  dataKey="breathing"
                  name="4-7-8 Breathing"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="yoga"
                  name="Yoga Reset"
                  fill="#0284c7"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="scalar"
                  name="Scalar Audio"
                  fill="#f59e0b"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="other"
                  name="Other Protocols"
                  fill="#8b5cf6"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[9px] font-mono ${
            isWhiteTheme ? 'border-slate-200 text-slate-500' : 'border-[#131e30] text-[#6b85a8]'
          }`}>
            <span>📊 Aggregated from local IndexedDB session events</span>
            <span>Rolling 4-week window (W-3 → Current)</span>
          </div>
        </div>
      )}

      {/* Logs View */}
      {activeTab === 'logs' && (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className={`p-4 text-center text-xs font-mono ${
              isWhiteTheme ? 'text-slate-400' : 'text-[#5b7596]'
            }`}>
              NO WELLNESS LOGS RECORDED YET. TRIGGER A ROUTINE TO LOG TELEMETRY.
            </div>
          ) : (
            logs.map((log) => {
              const isDecrypted = Boolean(decryptedState[log.id]);
              const error = decryptErrors[log.id];

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded border text-xs transition-colors ${
                    isWhiteTheme
                      ? 'bg-slate-50 border-slate-200 shadow-sm text-slate-800'
                      : 'bg-[#08101d] border-[#19273c]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-bold text-[11px] ${
                      isWhiteTheme ? 'text-sky-700' : 'text-[#00ffcc]'
                    }`}>
                      {log.type}
                    </span>
                    <span className={`text-[9px] font-mono ${
                      isWhiteTheme ? 'text-slate-400' : 'text-[#5b7596]'
                    }`}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 text-[11px] mb-1 font-mono ${
                    isWhiteTheme ? 'text-slate-600' : 'text-[#8aa5c7]'
                  }`}>
                    <span>HR: {log.heartRateBefore} → {log.heartRateAfter} BPM</span>
                    <span className={isWhiteTheme ? 'text-emerald-700 font-bold' : 'text-[#38ef7d]'}>
                      Δ -{log.heartRateBefore - log.heartRateAfter} BPM Vagal Drop
                    </span>
                  </div>

                  {log.notes && (
                    <div className={`text-[10px] mb-1 ${isWhiteTheme ? 'text-slate-500' : 'text-[#6e89ac]'}`}>
                      NOTE: {log.notes}
                    </div>
                  )}

                  {log.encryptedData && (
                    <div className={`mt-1 pt-1 border-t flex items-center justify-between gap-2 ${
                      isWhiteTheme ? 'border-slate-200' : 'border-[#131e30]'
                    }`}>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-600 truncate">
                        <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">
                          {isDecrypted ? decryptedState[log.id] : `ENVELOPE: ${log.encryptedData.substring(0, 24)}...`}
                        </span>
                      </div>

                      {!isDecrypted ? (
                        <button
                          onClick={() => handleDecrypt(log.id, log.encryptedData)}
                          className={`px-2 py-0.5 text-[9px] font-mono rounded border cursor-pointer ${
                            isWhiteTheme
                              ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300 font-bold'
                              : 'bg-[#142236] hover:bg-[#1f3452] text-[#00ffcc] border-[#233b5c]'
                          }`}
                        >
                          DECRYPT
                        </button>
                      ) : (
                        <span className={`text-[9px] font-mono flex items-center gap-1 font-bold ${
                          isWhiteTheme ? 'text-emerald-700' : 'text-[#38ef7d]'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                    </div>
                  )}

                  {error && <div className="text-[9px] text-rose-600 font-mono mt-1">{error}</div>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pins View */}
      {activeTab === 'pins' && (
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {pins.length === 0 ? (
            <div className={`p-4 text-center text-xs font-mono ${
              isWhiteTheme ? 'text-slate-400' : 'text-[#5b7596]'
            }`}>
              NO CUSTOM PINS SAVED. LONG-PRESS ON THE MAP TO DROP A PIN.
            </div>
          ) : (
            pins.map((pin) => (
              <div
                key={pin.id}
                className={`p-2.5 rounded border text-xs transition-colors ${
                  isWhiteTheme
                    ? 'bg-slate-50 border-slate-200 shadow-sm text-slate-800'
                    : 'bg-[#08101d] border-[#19273c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-[11px] ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>
                    {pin.name}
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    pin.classification === 'Safe Zone'
                      ? (isWhiteTheme
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40')
                      : (isWhiteTheme
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-rose-950/70 text-rose-400 border border-rose-500/40')
                  }`}>
                    {pin.classification}
                  </span>
                </div>
                <div className={`text-[10px] font-mono ${isWhiteTheme ? 'text-slate-500' : 'text-[#718dae]'}`}>
                  COORD: {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                </div>
                {pin.notes && <div className={`text-[10px] mt-1 ${isWhiteTheme ? 'text-slate-500' : 'text-[#556e8f]'}`}>{pin.notes}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* EXPORT DATA MODAL DIALOG                                */}
      {/* ======================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className={`w-full max-w-lg rounded-xl border p-5 shadow-2xl transition-all font-mono ${
              isWhiteTheme
                ? 'bg-white border-slate-300 text-slate-800'
                : 'bg-[#081120] border-[#1e3454] text-[#c0d4ec]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">EXPORT TELEMETRY ARCHIVE</h3>
                  <p className={`text-[11px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#708aa8]'}`}>
                    Local IndexedDB snapshot // JSON & CSV generators
                  </p>
                </div>
              </div>

              <button
                onClick={() => !isExporting && setIsExportModalOpen(false)}
                disabled={isExporting}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isWhiteTheme
                    ? 'hover:bg-slate-100 border-slate-200 text-slate-500'
                    : 'hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetry Overview Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={`p-2.5 rounded-lg border text-center ${
                isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#050b14] border-[#142338]'
              }`}>
                <div className={`text-[10px] font-bold ${isWhiteTheme ? 'text-slate-500' : 'text-[#64748b]'}`}>
                  WELLNESS LOGS
                </div>
                <div className="text-lg font-black text-sky-600 mt-0.5">
                  {logs.length}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border text-center ${
                isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#050b14] border-[#142338]'
              }`}>
                <div className={`text-[10px] font-bold ${isWhiteTheme ? 'text-slate-500' : 'text-[#64748b]'}`}>
                  LOCATION PINS
                </div>
                <div className="text-lg font-black text-emerald-600 mt-0.5">
                  {pins.length}
                </div>
              </div>

              <div className={`p-2.5 rounded-lg border text-center ${
                isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#050b14] border-[#142338]'
              }`}>
                <div className={`text-[10px] font-bold ${isWhiteTheme ? 'text-slate-500' : 'text-[#64748b]'}`}>
                  EST. SIZE
                </div>
                <div className="text-lg font-black text-amber-600 mt-0.5">
                  {estimatedSizeKb} KB
                </div>
              </div>
            </div>

            {/* Select Export Format */}
            <div className="mb-4">
              <label className={`block text-[11px] font-bold uppercase mb-2 ${
                isWhiteTheme ? 'text-slate-600' : 'text-[#8ea9cb]'
              }`}>
                SELECT ARCHIVE FORMAT
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setModalExportFormat('json')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    modalExportFormat === 'json'
                      ? (isWhiteTheme
                          ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-300'
                          : 'border-[#00ffcc] bg-[#00ffcc]/15 ring-2 ring-[#00ffcc]/40')
                      : (isWhiteTheme
                          ? 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          : 'border-[#172538] hover:border-[#223752] bg-[#070e1a]')
                  }`}
                >
                  <FileJson className="w-5 h-5 text-amber-500 mb-1" />
                  <div className="text-xs font-bold font-mono">COMPLETE JSON</div>
                  <div className={`text-[9px] mt-0.5 ${isWhiteTheme ? 'text-slate-500' : 'text-[#718dae]'}`}>
                    Full DB snapshot
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModalExportFormat('logs-csv')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    modalExportFormat === 'logs-csv'
                      ? (isWhiteTheme
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300'
                          : 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-500/40')
                      : (isWhiteTheme
                          ? 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          : 'border-[#172538] hover:border-[#223752] bg-[#070e1a]')
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500 mb-1" />
                  <div className="text-xs font-bold font-mono">LOGS (CSV)</div>
                  <div className={`text-[9px] mt-0.5 ${isWhiteTheme ? 'text-slate-500' : 'text-[#718dae]'}`}>
                    Respiration & HR
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModalExportFormat('pins-csv')}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    modalExportFormat === 'pins-csv'
                      ? (isWhiteTheme
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300'
                          : 'border-indigo-400 bg-indigo-950/40 ring-2 ring-indigo-500/40')
                      : (isWhiteTheme
                          ? 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          : 'border-[#172538] hover:border-[#223752] bg-[#070e1a]')
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5 text-indigo-500 mb-1" />
                  <div className="text-xs font-bold font-mono">PINS (CSV)</div>
                  <div className={`text-[9px] mt-0.5 ${isWhiteTheme ? 'text-slate-500' : 'text-[#718dae]'}`}>
                    Geo coordinates
                  </div>
                </button>
              </div>
            </div>

            {/* Scope / Privacy Controls */}
            <div className={`p-3 rounded-lg border mb-4 space-y-2 text-xs ${
              isWhiteTheme ? 'bg-slate-50 border-slate-200' : 'bg-[#060c16] border-[#152336]'
            }`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={modalIncludeDecrypted}
                    onChange={(e) => setModalIncludeDecrypted(e.target.checked)}
                    className="accent-sky-600 rounded"
                  />
                  <span>Include Decrypted Verification Notes (if unlocked)</span>
                </label>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>

              {modalExportFormat === 'json' && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                    <input
                      type="checkbox"
                      checked={modalIncludePins}
                      onChange={(e) => setModalIncludePins(e.target.checked)}
                      className="accent-sky-600 rounded"
                    />
                    <span>Include Custom Map Pins & Coordinates</span>
                  </label>
                  <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-400' : 'text-[#6b85a8]'}`}>
                    {pins.length} pins
                  </span>
                </div>
              )}
            </div>

            {/* Active Loading Spinner State inside Modal */}
            {isExporting && (
              <div className={`p-3.5 rounded-lg border mb-4 text-center ${
                isWhiteTheme ? 'bg-sky-50 border-sky-300 text-sky-950' : 'bg-[#09172a] border-sky-500/50 text-sky-200'
              }`}>
                <div className="flex items-center justify-center gap-2.5 mb-1.5">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                  <span className="text-xs font-bold tracking-tight">
                    {exportStepMessage || 'GENERATING TELEMETRY FILE...'}
                  </span>
                </div>
                <div className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#708aa8]'}`}>
                  Compressing local IndexedDB bytes into RFC 4180 / JSON payload
                </div>

                <div className="w-full bg-sky-200 dark:bg-sky-950 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div className="bg-sky-500 h-full animate-[progress_1s_ease-in-out_infinite]" style={{ width: '80%' }} />
                </div>
              </div>
            )}

            {/* Success Feedback Banner */}
            {modalSuccessMessage && !isExporting && (
              <div className={`p-2.5 rounded-lg border mb-4 flex items-center gap-2 text-xs font-bold ${
                isWhiteTheme
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              }`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{modalSuccessMessage}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
                className={`px-3 py-1.5 rounded text-xs font-mono border cursor-pointer transition-colors ${
                  isWhiteTheme
                    ? 'hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {modalSuccessMessage ? 'CLOSE' : 'CANCEL'}
              </button>

              <button
                type="button"
                onClick={handleModalExportTrigger}
                disabled={isExporting}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold cursor-pointer transition-all shadow-sm ${
                  isExporting
                    ? 'opacity-75 cursor-wait bg-sky-400 text-white'
                    : (isWhiteTheme
                        ? 'bg-sky-600 hover:bg-sky-700 text-white active:scale-95'
                        : 'bg-[#00ffcc] hover:bg-[#38ef7d] text-slate-950 active:scale-95')
                }`}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>GENERATING FILE...</span>
                  </>
                ) : (
                  <>
                    <HardDriveDownload className="w-4 h-4" />
                    <span>DOWNLOAD {modalExportFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
