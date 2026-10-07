import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  Activity,
  Volume2,
  ShieldCheck,
  Flame,
  Wind,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  BellRing,
  Award,
  CheckCircle2,
  Sparkles,
  History,
  Bell,
  BellOff,
  Clock,
  X,
  Target,
  Trophy,
  Moon,
  Eye,
  EyeOff,
  Gauge,
  TrendingDown,
  ArrowDownRight,
  Calendar,
  Timer,
  Zap
} from 'lucide-react';
import { BreathingTimer478 } from './BreathingTimer478';
import { useTheme } from '../context/ThemeContext';
import { useIndexedDB, WellnessLog } from '../hooks/useIndexedDB';

interface BiometricActionDeckProps {
  heartRateBpm: number;
  hrvMs: number;
  isBleConnected: boolean;
  onTriggerRoutine: (actionType: string) => void;
  logs?: WellnessLog[];
}

const PRESET_THRESHOLDS = [75, 85, 100, 120];

const REMINDER_INTERVAL_OPTIONS = [
  { label: 'TEST (15s)', value: 0.00416 },
  { label: '1 HOUR', value: 1 },
  { label: '2 HOURS', value: 2 },
  { label: '4 HOURS (DEF)', value: 4 },
  { label: '8 HOURS', value: 8 }
];

export interface HeartRateZone {
  id: string;
  name: string;
  shortName: string;
  minBpm: number;
  maxBpm: number;
  color: string;
  accentClass: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  description: string;
  intensity: string;
}

export const HEART_RATE_ZONES: HeartRateZone[] = [
  {
    id: 'warmup',
    name: 'Warm-up',
    shortName: 'WARM-UP',
    minBpm: 50,
    maxBpm: 99,
    color: '#10b981',
    accentClass: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/40',
    description: 'Active recovery effort · Vagal calming & parasympathetic foundation',
    intensity: '50-60%'
  },
  {
    id: 'fatburn',
    name: 'Fat Burn',
    shortName: 'FAT BURN',
    minBpm: 100,
    maxBpm: 119,
    color: '#eab308',
    accentClass: 'bg-yellow-500',
    badgeBg: 'bg-yellow-500/15',
    badgeText: 'text-yellow-600 dark:text-yellow-400',
    borderClass: 'border-yellow-500/40',
    description: 'Moderate aerobic pace · Optimal lipid oxidation & steady stamina',
    intensity: '60-70%'
  },
  {
    id: 'cardio',
    name: 'Cardio',
    shortName: 'CARDIO',
    minBpm: 120,
    maxBpm: 144,
    color: '#f97316',
    accentClass: 'bg-orange-500',
    badgeBg: 'bg-orange-500/15',
    badgeText: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-500/40',
    description: 'Aerobic threshold · Cardiac workload & cardiovascular endurance',
    intensity: '70-85%'
  },
  {
    id: 'peak',
    name: 'Peak',
    shortName: 'PEAK',
    minBpm: 145,
    maxBpm: 200,
    color: '#f43f5e',
    accentClass: 'bg-rose-500',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-500/40',
    description: 'Anaerobic ceiling · Maximum cardiovascular output & high intensity',
    intensity: '85-100%'
  }
];

export function BiometricActionDeck({
  heartRateBpm,
  hrvMs,
  isBleConnected,
  onTriggerRoutine,
  logs: propLogs
}: BiometricActionDeckProps) {
  const [showBreathingTimer, setShowBreathingTimer] = useState<boolean>(true);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);
  const { isWhiteTheme } = useTheme();

  // Zen Mode: Hides non-essential dashboard elements to focus strictly on 4-7-8 breathing & real-time heart rate
  const [isZenMode, setIsZenMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('grid_zen_mode_enabled');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleZenMode = () => {
    const nextVal = !isZenMode;
    setIsZenMode(nextVal);
    try {
      localStorage.setItem('grid_zen_mode_enabled', nextVal.toString());
    } catch {
      // Ignore
    }
  };

  // Access wellnessLogs state from IndexedDB hook fallback if not passed directly via props
  const { wellnessLogs: dbWellnessLogs } = useIndexedDB();
  const wellnessLogs = propLogs || dbWellnessLogs || [];

  // Total count of completed 4-7-8 breathing sessions (lifetime)
  const completedBreathingSessions = useMemo(() => {
    return wellnessLogs.filter(log => log.type === 'BREATHING_478').length;
  }, [wellnessLogs]);

  // List of the last 5 completed 4-7-8 breathing sessions sorted by most recent
  const last5BreathingSessions = useMemo(() => {
    return wellnessLogs
      .filter(log => log.type === 'BREATHING_478')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [wellnessLogs]);

  // Average heart rate reduction across the last 5 sessions
  const averageHrReduction = useMemo(() => {
    if (last5BreathingSessions.length === 0) return 0;
    const totalReduction = last5BreathingSessions.reduce((acc, log) => {
      return acc + (log.heartRateBefore - log.heartRateAfter);
    }, 0);
    return Math.round(totalReduction / last5BreathingSessions.length);
  }, [last5BreathingSessions]);

  // Daily target stored in localStorage (default to 3 sessions/day)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('grid_daily_breathing_goal');
      return stored ? Math.max(1, parseInt(stored, 10)) : 3;
    } catch {
      return 3;
    }
  });

  const handleUpdateDailyGoal = (newGoal: number) => {
    const clamped = Math.max(1, Math.min(10, newGoal));
    setDailyGoal(clamped);
    try {
      localStorage.setItem('grid_daily_breathing_goal', clamped.toString());
    } catch {
      // Ignore storage errors
    }
  };

  // Sessions completed today (since midnight local time)
  const todayCompletedSessions = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayMs = startOfDay.getTime();

    return wellnessLogs.filter(log => {
      if (log.type !== 'BREATHING_478') return false;
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= startOfDayMs;
    }).length;
  }, [wellnessLogs]);

  const dailyProgressPercent = Math.min(100, Math.round((todayCompletedSessions / Math.max(1, dailyGoal)) * 100));
  const isDailyGoalMet = todayCompletedSessions >= dailyGoal;

  // Categorize current heart rate into standard zones (Warm-up, Fat Burn, Cardio, Peak)
  const currentZone = useMemo(() => {
    if (heartRateBpm < 100) return HEART_RATE_ZONES[0];
    if (heartRateBpm < 120) return HEART_RATE_ZONES[1];
    if (heartRateBpm < 145) return HEART_RATE_ZONES[2];
    return HEART_RATE_ZONES[3];
  }, [heartRateBpm]);

  // Scaled gauge position across 50 to 180 BPM range
  const gaugePercent = useMemo(() => {
    const minScale = 50;
    const maxScale = 180;
    const clamped = Math.max(minScale, Math.min(maxScale, heartRateBpm));
    return ((clamped - minScale) / (maxScale - minScale)) * 100;
  }, [heartRateBpm]);

  // Load custom threshold from localStorage, defaulting to 85 BPM
  const [dangerThreshold, setDangerThreshold] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('grid_danger_hr_threshold');
      return stored ? parseInt(stored, 10) : 85;
    } catch {
      return 85;
    }
  });

  // -------------------------------------------------------------
  // Notification & Screen Pulse Reminder State
  // -------------------------------------------------------------
  const [isReminderEnabled, setIsReminderEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('grid_breathing_reminder_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [reminderIntervalHours, setReminderIntervalHours] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('grid_breathing_reminder_interval');
      return stored ? parseFloat(stored) : 4;
    } catch {
      return 4;
    }
  });

  const [showReminderConfig, setShowReminderConfig] = useState<boolean>(false);
  const [isScreenPulseActive, setIsScreenPulseActive] = useState<boolean>(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const lastNotificationFiredRef = useRef<number>(0);

  const handleToggleReminder = async () => {
    const nextVal = !isReminderEnabled;
    setIsReminderEnabled(nextVal);
    try {
      localStorage.setItem('grid_breathing_reminder_enabled', nextVal.toString());
    } catch {
      // Ignore
    }

    if (nextVal && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore
      }
    }
  };

  const handleIntervalChange = (val: number) => {
    setReminderIntervalHours(val);
    try {
      localStorage.setItem('grid_breathing_reminder_interval', val.toString());
    } catch {
      // Ignore
    }
  };

  const firePushNotification = (hoursDesc: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Grid Guardian · 4-7-8 Breathing Protocol Due', {
          body: `It has been over ${hoursDesc} since your last 4-7-8 breathing session. Tap to calibrate your vagal tone.`,
          icon: '/favicon.ico'
        });
      } catch {
        // Fallback
      }
    }
  };

  useEffect(() => {
    if (!isReminderEnabled) {
      setIsScreenPulseActive(false);
      return;
    }

    const checkIntervalDue = () => {
      if (Date.now() < dismissedUntil) {
        setIsScreenPulseActive(false);
        return;
      }

      const breathingLogs = wellnessLogs.filter(l => l.type === 'BREATHING_478');
      const latestLog = breathingLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      const lastSessionTime = latestLog ? new Date(latestLog.timestamp).getTime() : Date.now() - (reminderIntervalHours * 3600 * 1000 + 1000);
      const intervalMs = reminderIntervalHours * 3600 * 1000;
      const elapsed = Date.now() - lastSessionTime;

      if (elapsed >= intervalMs) {
        setIsScreenPulseActive(true);

        if (Date.now() - lastNotificationFiredRef.current > 60000) {
          const hoursDesc = reminderIntervalHours < 0.1 ? '15 seconds' : `${reminderIntervalHours} hours`;
          firePushNotification(hoursDesc);
          lastNotificationFiredRef.current = Date.now();
        }
      } else {
        setIsScreenPulseActive(false);
      }
    };

    checkIntervalDue();
    const timer = setInterval(checkIntervalDue, 4000);
    return () => clearInterval(timer);
  }, [wellnessLogs, isReminderEnabled, reminderIntervalHours, dismissedUntil]);

  const handleTestAlert = () => {
    setIsScreenPulseActive(true);
    setDismissedUntil(0);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(() => {
        firePushNotification('test demo interval');
      });
    } else {
      firePushNotification('test demo interval');
    }
  };

  const handleDismissPulse = () => {
    setIsScreenPulseActive(false);
    setDismissedUntil(Date.now() + 15 * 60 * 1000);
  };

  const handleThresholdChange = (val: number) => {
    const clamped = Math.max(60, Math.min(180, val));
    setDangerThreshold(clamped);
    try {
      localStorage.setItem('grid_danger_hr_threshold', clamped.toString());
    } catch {
      // Ignore storage errors
    }
  };

  const isDangerZone = heartRateBpm >= dangerThreshold;
  const dangerDelta = heartRateBpm - dangerThreshold;

  // -------------------------------------------------------------
  // Real-Time 'Risk Level' Notification System & >3-Min Toast Alert
  // -------------------------------------------------------------
  const [dangerDurationSeconds, setDangerDurationSeconds] = useState<number>(0);
  const [showRiskToast, setShowRiskToast] = useState<boolean>(false);
  const [showRiskLevelDetails, setShowRiskLevelDetails] = useState<boolean>(false);
  const dangerStartTimeRef = useRef<number | null>(null);
  const hasTriggeredToastThisSpikeRef = useRef<boolean>(false);
  const snoozeToastUntilRef = useRef<number>(0);

  // Synthesize gentle yet distinct medical alert chime via Web Audio API
  const playRiskAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } catch {
      // Audio context policy or unsupported
    }
  };

  // Continuous timer monitoring whether heart rate remains above danger threshold
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isDangerZone) {
      if (dangerStartTimeRef.current === null) {
        dangerStartTimeRef.current = Date.now() - (dangerDurationSeconds * 1000);
      }

      timer = setInterval(() => {
        if (dangerStartTimeRef.current !== null) {
          const elapsed = Math.max(0, Math.floor((Date.now() - dangerStartTimeRef.current) / 1000));
          setDangerDurationSeconds(elapsed);

          // Triggers on-screen toast alert if heart rate remains above danger threshold for > 3 minutes (180s)
          if (elapsed >= 180) {
            const isSnoozed = Date.now() < snoozeToastUntilRef.current;
            if (!hasTriggeredToastThisSpikeRef.current && !isSnoozed) {
              hasTriggeredToastThisSpikeRef.current = true;
              setShowRiskToast(true);
              playRiskAlertChime();
            }
          }
        }
      }, 1000);
    } else {
      // Heart rate returned below danger threshold
      dangerStartTimeRef.current = null;
      setDangerDurationSeconds(0);
      hasTriggeredToastThisSpikeRef.current = false;
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDangerZone, dangerDurationSeconds]);

  // Quick simulation trigger for testing and verifying the >3-minute toast alert
  const handleSimulate3MinDanger = () => {
    dangerStartTimeRef.current = Date.now() - 185 * 1000;
    setDangerDurationSeconds(185);
    hasTriggeredToastThisSpikeRef.current = true;
    snoozeToastUntilRef.current = 0;
    setShowRiskToast(true);
    playRiskAlertChime();
  };

  const handleDismissRiskToast = () => {
    setShowRiskToast(false);
  };

  const handleSnoozeRiskToast = () => {
    setShowRiskToast(false);
    snoozeToastUntilRef.current = Date.now() + 2 * 60 * 1000; // Snooze for 2 minutes
  };

  const handleToastStartBreathing = () => {
    setShowRiskToast(false);
    setShowBreathingTimer(true);
    handleRoutineSelect('BREATHING_478');
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Real-Time Risk Level computation
  const riskLevelData = useMemo(() => {
    if (!isDangerZone) {
      return {
        level: 'NOMINAL',
        stage: 'STAGE 0',
        title: 'NOMINAL (LOW RISK)',
        color: '#10b981',
        badgeClass: isWhiteTheme
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40',
        description: `Homeostatic baseline maintained (< ${dangerThreshold} BPM). Parasympathetic tone active.`,
        isAlertActive: false,
        progressPercent: 0,
      };
    }

    const progressPercent = Math.min(100, Math.round((dangerDurationSeconds / 180) * 100));

    if (dangerDurationSeconds < 60) {
      return {
        level: 'ELEVATED',
        stage: 'STAGE 1',
        title: 'ELEVATED RISK',
        color: '#eab308',
        badgeClass: isWhiteTheme
          ? 'bg-amber-100 text-amber-900 border-amber-300'
          : 'bg-amber-950/70 text-amber-300 border-amber-500/40',
        description: `Initial spike detected (${dangerDurationSeconds}s in danger zone). Monitoring duration.`,
        isAlertActive: false,
        progressPercent,
      };
    }

    if (dangerDurationSeconds < 180) {
      const remainingSec = 180 - dangerDurationSeconds;
      return {
        level: 'MODERATE',
        stage: 'STAGE 2',
        title: 'MODERATE RISK',
        color: '#f97316',
        badgeClass: isWhiteTheme
          ? 'bg-orange-100 text-orange-900 border-orange-300 ring-1 ring-orange-300'
          : 'bg-orange-950/80 text-orange-300 border-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.3)]',
        description: `Sustained elevation (${Math.floor(dangerDurationSeconds / 60)}m ${dangerDurationSeconds % 60}s). Toast alert arms in ${remainingSec}s if sustained.`,
        isAlertActive: false,
        progressPercent,
      };
    }

    return {
      level: 'CRITICAL',
      stage: 'STAGE 3',
      title: 'CRITICAL RISK',
      color: '#ef4444',
      badgeClass: 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse',
      description: `Sustained danger threshold > 3 minutes (${Math.floor(dangerDurationSeconds / 60)}m ${dangerDurationSeconds % 60}s). Real-time toast alert active!`,
      isAlertActive: true,
      progressPercent: 100,
    };
  }, [isDangerZone, dangerDurationSeconds, dangerThreshold, isWhiteTheme]);

  // Floating on-screen toast alert JSX
  const riskToastElement = showRiskToast ? (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] max-w-md w-[calc(100%-2rem)] sm:w-[420px] rounded-xl border p-4 shadow-2xl transition-all duration-300 backdrop-blur-md ${
        isWhiteTheme
          ? 'bg-white/95 border-rose-400 text-slate-900 shadow-rose-200/50 ring-2 ring-rose-400/40'
          : 'bg-[#150409]/95 border-rose-500 text-[#ffd5dd] shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/50'
      }`}
    >
      {/* Toast Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-full bg-rose-500/20 text-rose-500 animate-bounce shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black font-mono tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                CRITICAL RISK LEVEL DETECTED
              </h4>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-black bg-rose-600 text-white animate-pulse">
                &gt;3 MIN SUSTAINED
              </span>
            </div>
            <p className="text-[10px] font-mono opacity-80 mt-0.5">
              Heart rate remained in danger zone for <strong>{formatDuration(dangerDurationSeconds)}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleDismissRiskToast}
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            isWhiteTheme ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-rose-950 text-slate-400'
          }`}
          title="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Telemetry Box */}
      <div className={`p-2.5 rounded-lg mb-3 border text-xs font-mono ${
        isWhiteTheme ? 'bg-rose-50/70 border-rose-200 text-slate-800' : 'bg-[#22070e] border-rose-900/60 text-rose-200'
      }`}>
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-rose-200/50 dark:border-rose-900/40">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">CURRENT HEART RATE:</span>
          <span className="font-black text-rose-600 text-sm">
            {heartRateBpm} BPM <span className="text-[10px] font-normal text-slate-500">(+{dangerDelta} BPM above {dangerThreshold} ceiling)</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">CONTINUOUS EXPOSURE:</span>
          <span className="font-bold text-rose-600 dark:text-rose-300">
            {Math.floor(dangerDurationSeconds / 60)}m {dangerDurationSeconds % 60}s ({dangerDurationSeconds}s)
          </span>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-600 dark:text-rose-300/90">
          ⚠️ Your heart rate has remained above the danger zone threshold (&gt;{dangerThreshold} BPM) for more than 3 continuous minutes. Prolonged autonomic activation impairs vagal recovery. Calibrating parasympathetic tone via 4-7-8 breathing is strongly advised.
        </p>
      </div>

      {/* Toast Action Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={handleToastStartBreathing}
          className="flex-1 min-w-[150px] px-3 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-mono font-black text-xs rounded-lg shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Wind className="w-4 h-4 animate-pulse" />
          <span>START 4-7-8 BREATHING NOW</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSnoozeRiskToast}
            className={`px-2.5 py-2 border rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-[#1b0a12] hover:bg-[#2b101c] border-rose-900/80 text-rose-300'
            }`}
            title="Snooze alert for 2 minutes"
          >
            SNOOZE (2M)
          </button>

          <button
            onClick={handleDismissRiskToast}
            className={`px-2.5 py-2 border rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-[#1b0a12] hover:bg-[#2b101c] border-rose-900/80 text-rose-300'
            }`}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const handleRoutineSelect = (actionType: string) => {
    if (actionType === 'BREATHING_478') {
      setShowBreathingTimer(true);
      setIsScreenPulseActive(false);
    } else {
      onTriggerRoutine(actionType);
    }
  };

  // ========================================================
  // ZEN MODE VIEW: Distraction-free meditation sanctuary
  // Focusing solely on 4-7-8 breathing timer & real-time heart rate
  // ========================================================
  if (isZenMode) {
    return (
      <div className={`p-4 border rounded-xl transition-all duration-300 relative ${
        isWhiteTheme
          ? 'border-purple-200/80 bg-gradient-to-b from-purple-50/40 via-white to-sky-50/30 text-slate-800 shadow-sm'
          : 'border-purple-900/50 bg-gradient-to-b from-[#090614] via-[#050a14] to-[#040812] text-[#d6e4f8] shadow-[0_0_24px_rgba(168,85,247,0.12)]'
      }`}>
        {/* Serene Zen Mode Top Bar */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-200/50 dark:border-purple-900/40 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xs font-bold font-mono uppercase tracking-wider ${
                  isWhiteTheme ? 'text-purple-950' : 'text-purple-200'
                }`}>
                  ZEN MODE · MINDFUL MEDITATION
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  DISTRACTION-FREE
                </span>
              </div>
              <p className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-slate-400'}`}>
                Non-essential telemetry hidden. Dedicated focus on 4-7-8 respiration and real-time heart rate feedback.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleZenMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all shadow-xs ${
              isWhiteTheme
                ? 'bg-white hover:bg-slate-100 border-purple-300 text-purple-900 active:scale-95'
                : 'bg-[#150e26] hover:bg-[#201438] border-purple-600/70 text-purple-200 active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
            }`}
            title="Exit Zen Mode to return to full biometric dashboard"
          >
            <Eye className="w-3.5 h-3.5 text-purple-500" />
            <span>EXIT ZEN MODE</span>
          </button>
        </div>

        {/* Focused Real-Time Heart Rate Monitor Card */}
        <div className={`p-3.5 rounded-xl border mb-4 flex items-center justify-between transition-all ${
          isWhiteTheme
            ? 'bg-white/95 border-slate-200 shadow-xs'
            : 'bg-[#091120]/90 border-[#1a2d48]'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="relative p-2.5 rounded-full bg-rose-500/10 text-rose-500 shrink-0">
              <Heart className="w-6 h-6 animate-pulse" />
              <span className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-mono font-bold tracking-wider ${
                  isWhiteTheme ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  REAL-TIME HEART RATE
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  currentZone.badgeBg
                } ${currentZone.badgeText}`}>
                  {currentZone.name.toUpperCase()} ZONE ({currentZone.intensity})
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black font-mono tracking-tight text-rose-500">
                  {heartRateBpm}
                </span>
                <span className={`text-xs font-mono font-bold ${
                  isWhiteTheme ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  BPM
                </span>
                <span className={`text-[10px] font-mono ml-2 ${
                  isWhiteTheme ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  · HRV Interval: <strong>{hrvMs} ms</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className={`text-[10px] font-mono ${isWhiteTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              SENSOR STATUS
            </span>
            <span className={`text-[11px] font-mono font-bold ${
              isBleConnected
                ? (isWhiteTheme ? 'text-emerald-600' : 'text-[#00ffcc]')
                : (isWhiteTheme ? 'text-amber-600' : 'text-[#ffaa00]')
            }`}>
              {isBleConnected ? '● BLE SENSOR STREAM' : '● SENSOR PROXY'}
            </span>
          </div>
        </div>

        {/* 4-7-8 Breathing Timer */}
        <div className="w-full">
          <BreathingTimer478
            currentHeartRate={heartRateBpm}
            onLogRoutine={() => onTriggerRoutine('BREATHING_478')}
            onCompleteCycle={() => onTriggerRoutine('BREATHING_478')}
          />
        </div>

        {/* Real-time Risk Level On-Screen Toast Alert */}
        {riskToastElement}
      </div>
    );
  }

  return (
    <div className={`p-4 border-b rounded-lg transition-colors relative ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#070c17] text-[#c0d4ec]'
    }`}>
      {/* Gentle Screen Pulse Effect Overlay when 4-7-8 breathing interval is overdue */}
      {isScreenPulseActive && (
        <div className="fixed inset-0 pointer-events-none z-50 border-8 border-cyan-400/40 dark:border-cyan-400/25 shadow-[inset_0_0_60px_rgba(0,225,255,0.22)] animate-pulse transition-all duration-1000" />
      )}

      {/* Top Header with 'Session History' Badge & Notification Toggle */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
          <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]'
          }`}>
            BIOMETRIC TELEMETRY & ROUTINE DECK
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zen Mode Toggle Button */}
          <button
            onClick={handleToggleZenMode}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-all ${
              isWhiteTheme
                ? 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-900 font-bold shadow-xs active:scale-95'
                : 'bg-[#1b102b] hover:bg-[#28163f] border-[#9333ea]/50 text-[#d8b4fe] font-bold shadow-[0_0_8px_rgba(168,85,247,0.25)] active:scale-95'
            }`}
            title="Toggle Zen Mode (hides non-essential elements to focus strictly on 4-7-8 breathing & real-time heart rate)"
          >
            <Moon className="w-3 h-3 text-purple-500" />
            <span>ZEN MODE</span>
          </button>

          {/* Dynamically derived 'Session History' Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[10px] font-mono font-bold shadow-xs transition-all ${
              isWhiteTheme
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
            }`}
            title="Total count of completed 4-7-8 breathing sessions derived from wellnessLogs"
          >
            <History className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Session History:</span>
            <span className={`px-1 rounded ${
              isWhiteTheme ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-500/30 text-emerald-200'
            }`}>
              {completedBreathingSessions}
            </span>
          </div>

          {/* Push Alert / Screen Pulse Notification Toggle */}
          <button
            onClick={() => setShowReminderConfig(!showReminderConfig)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
              isReminderEnabled
                ? (isWhiteTheme
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-bold'
                    : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-[#0f1726] border-[#1e2f47] text-[#6b85a8]')
            }`}
            title="Configure 4-7-8 Breathing Interval Alerts & Screen Pulse"
          >
            {isReminderEnabled ? <BellRing className="w-3 h-3 text-cyan-600 animate-bounce" /> : <BellOff className="w-3 h-3" />}
            <span>ALERT: {isReminderEnabled ? (reminderIntervalHours < 0.1 ? '15s' : `${reminderIntervalHours}H`) : 'OFF'}</span>
          </button>

          {/* Threshold Settings Quick Toggle Button */}
          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
              showThresholdConfig || isDangerZone
                ? (isWhiteTheme
                    ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-400 font-bold')
                : (isWhiteTheme
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                    : 'bg-[#0e1726] hover:bg-[#16253c] border-[#1e2f47] text-[#8fa8cc]')
            }`}
            title="Configure Custom Heart Rate Danger Zone Threshold"
          >
            <Sliders className="w-3 h-3" />
            <span>ALERT: &gt;{dangerThreshold} BPM</span>
          </button>

          {/* Real-Time Risk Level Header Status Button */}
          <button
            onClick={() => setShowRiskLevelDetails(!showRiskLevelDetails)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer transition-all ${
              riskLevelData.badgeClass
            }`}
            title={`Real-Time Risk Level: ${riskLevelData.title}. Click to view 3-minute exposure tracker.`}
          >
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>RISK: {riskLevelData.level}</span>
            {isDangerZone && (
              <span className={`px-1 py-0.2 rounded text-[9px] font-black ${
                dangerDurationSeconds >= 180
                  ? 'bg-white text-rose-950 animate-bounce'
                  : 'bg-black/25 text-current'
              }`}>
                {formatDuration(dangerDurationSeconds)}
              </span>
            )}
          </button>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
              isBleConnected
                ? (isWhiteTheme
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                    : 'text-[#00ffcc] border-[#00ffcc]/30 bg-[#00ffcc]/10')
                : (isWhiteTheme
                    ? 'text-amber-800 border-amber-300 bg-amber-50'
                    : 'text-[#ffaa00] border-[#ffaa00]/30 bg-[#ffaa00]/10')
            }`}
          >
            {isBleConnected ? 'GATT LINKED' : 'LOCAL SENSOR PROXY'}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* OVERDUE 4-7-8 REMINDER BANNER & PULSE CONTROL            */}
      {/* ======================================================== */}
      {isScreenPulseActive && (
        <div className={`mb-3 p-3 rounded-lg border font-mono flex items-center justify-between gap-3 transition-all ${
          isWhiteTheme
            ? 'bg-cyan-50 border-cyan-400 text-cyan-950 shadow-md ring-2 ring-cyan-400/40 animate-pulse'
            : 'bg-[#061b2c] border-[#00e1ff] text-[#00e1ff] shadow-[0_0_20px_rgba(0,225,255,0.3)] animate-pulse'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-cyan-500/20 text-cyan-500 animate-bounce">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
                <span>VAGAL RESET OVERDUE</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-cyan-600 text-white">
                  &gt;{reminderIntervalHours < 0.1 ? '15s' : `${reminderIntervalHours}H`} INTERVAL
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${isWhiteTheme ? 'text-slate-600' : 'text-[#8cc4e8]'}`}>
                No 4-7-8 breathing session detected within your target interval. Parasympathetic brake calibration recommended.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowBreathingTimer(true);
                handleRoutineSelect('BREATHING_478');
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[10px] rounded cursor-pointer transition-colors whitespace-nowrap shadow-sm flex items-center gap-1"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>START 4-7-8 BREATH</span>
            </button>
            <button
              onClick={handleDismissPulse}
              className={`p-1.5 rounded border text-[10px] cursor-pointer transition-colors ${
                isWhiteTheme ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-600' : 'bg-[#091524] hover:bg-[#12253d] border-[#1d3554] text-[#86a5cc]'
              }`}
              title="Dismiss screen pulse for 15 minutes"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* NOTIFICATION & SCREEN PULSE CONFIGURATION PANEL          */}
      {/* ======================================================== */}
      {showReminderConfig && (
        <div className={`mb-3 p-3 rounded-lg border font-mono transition-all ${
          isWhiteTheme ? 'bg-cyan-50/70 border-cyan-200' : 'bg-[#081728] border-[#1a385c]'
        }`}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <BellRing className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-cyan-700' : 'text-cyan-400'}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
              }`}>
                4-7-8 BREATHING INTERVAL NOTIFIER & SCREEN PULSE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold">
                <input
                  type="checkbox"
                  checked={isReminderEnabled}
                  onChange={handleToggleReminder}
                  className="accent-cyan-600 rounded"
                />
                <span>ENABLE NOTIFICATIONS</span>
              </label>
            </div>
          </div>

          <p className={`text-[10px] mb-2.5 ${isWhiteTheme ? 'text-slate-600' : 'text-[#7da2c8]'}`}>
            Triggers a browser push notification and a gentle pulsating screen aura if you haven't completed a 4-7-8 breathing session within the selected interval.
          </p>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-cyan-200/50 dark:border-cyan-900/40">
            <div className="flex items-center gap-1 flex-wrap">
              <span className={`text-[10px] font-bold mr-1 ${isWhiteTheme ? 'text-slate-500' : 'text-[#688eb8]'}`}>
                INTERVAL:
              </span>
              {REMINDER_INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleIntervalChange(opt.value)}
                  className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer font-bold transition-colors ${
                    reminderIntervalHours === opt.value
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : (isWhiteTheme
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-[#091524] hover:bg-[#12253d] border-[#1d3554] text-[#86a5cc]')
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleTestAlert}
              className={`px-2.5 py-1 rounded border text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                isWhiteTheme
                  ? 'bg-white hover:bg-cyan-100 border-cyan-300 text-cyan-800'
                  : 'bg-[#0e243d] hover:bg-[#153457] border-cyan-500/50 text-cyan-300'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span>TEST ALERT & PULSE</span>
            </button>
          </div>
        </div>
      )}

      {/* Biometric Vital Displays (3 Metrics Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        {/* Heart Rate Card with Dynamic Danger Zone Flashing Alert */}
        <div className={`p-2.5 rounded border flex items-center justify-between transition-all duration-300 ${
          isDangerZone
            ? (isWhiteTheme
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.35)] animate-pulse'
                : 'bg-[#29070e] border-[#ff3366] ring-2 ring-rose-500/50 shadow-[0_0_16px_rgba(255,51,102,0.5)] animate-pulse')
            : (isWhiteTheme
                ? 'bg-slate-50 border-slate-200 shadow-sm'
                : 'bg-[#0b1222] border-[#1a2636]')
        }`}>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className={`text-[10px] font-bold font-mono ${
                isDangerZone
                  ? 'text-rose-600 font-black'
                  : (isWhiteTheme ? 'text-slate-500' : 'text-[#5e779b]')
              }`}>
                HEART RATE
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${currentZone.badgeBg} ${currentZone.badgeText}`}>
                {currentZone.shortName}
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${riskLevelData.badgeClass}`}>
                {riskLevelData.level}
              </span>
            </div>

            <div className={`text-xl font-black font-mono flex items-baseline gap-1 ${
              isDangerZone ? 'text-rose-600' : 'text-rose-600'
            }`}>
              {heartRateBpm} <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-400' : 'text-[#708aa8]'}`}>BPM</span>
            </div>

            <div className="text-[9px] font-mono text-slate-500 mt-0.5">
              {isDangerZone ? (
                <div className="flex items-center gap-1 text-rose-600 font-bold flex-wrap">
                  <span>+{dangerDelta} BPM CEILING</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatDuration(dangerDurationSeconds)} &gt; CEILING</span>
                </div>
              ) : (
                <span>SAFE (&lt;{dangerThreshold} BPM)</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            {isDangerZone ? (
              <div className="relative">
                <ShieldAlert className="w-7 h-7 text-rose-600 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              </div>
            ) : (
              <Heart className="w-6 h-6 text-rose-500 animate-bounce" />
            )}
          </div>
        </div>

        {/* HRV Interval Card */}
        <div className={`p-2.5 rounded border flex items-center justify-between transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0b1222] border-[#1a2636]'
        }`}>
          <div>
            <div className={`text-[10px] font-bold font-mono ${isWhiteTheme ? 'text-slate-500' : 'text-[#5e779b]'}`}>
              HRV INTERVAL
            </div>
            <div className={`text-xl font-black font-mono flex items-baseline gap-1 ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`}>
              {hrvMs} <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-400' : 'text-[#708aa8]'}`}>MS</span>
            </div>
            <div className={`text-[9px] font-mono mt-0.5 ${isWhiteTheme ? 'text-slate-400' : 'text-[#5d7699]'}`}>
              AUTONOMIC TONE
            </div>
          </div>
          <ShieldCheck className={`w-6 h-6 ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
        </div>

        {/* Session History Card (Calculated from filtered wellnessLogs state) */}
        <div className={`p-2.5 rounded border flex items-center justify-between transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0b1222] border-[#1a2636]'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[10px] font-bold font-mono ${
                isWhiteTheme ? 'text-emerald-700' : 'text-[#10b981]'
              }`}>
                SESSION HISTORY
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                isWhiteTheme ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/80 text-emerald-400'
              }`}>
                WELLNESS LOGS
              </span>
            </div>

            <div className={`text-xl font-black font-mono flex items-baseline gap-1 ${
              isWhiteTheme ? 'text-emerald-600' : 'text-[#38ef7d]'
            }`}>
              {completedBreathingSessions}
              <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-400' : 'text-[#708aa8]'}`}>
                {completedBreathingSessions === 1 ? 'LIFETIME' : 'LIFETIME'}
              </span>
            </div>

            <div className={`text-[9px] font-mono mt-0.5 flex items-center gap-1 ${
              isWhiteTheme ? 'text-slate-500' : 'text-[#5d7699]'
            }`}>
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              <span>TOTAL 4-7-8 ARCHIVED</span>
            </div>
          </div>

          <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
            <History className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISUAL ZONE TRACKER INDICATOR & COLOR-CODED GAUGE        */}
      {/* ======================================================== */}
      <div className={`p-3.5 rounded-lg border mb-3 font-mono transition-all ${
        isWhiteTheme ? 'bg-slate-50/90 border-slate-200 shadow-xs' : 'bg-[#081220] border-[#16273d]'
      }`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge className={`w-4 h-4 ${
              currentZone.id === 'warmup' ? 'text-emerald-500' :
              currentZone.id === 'fatburn' ? 'text-yellow-500' :
              currentZone.id === 'cardio' ? 'text-orange-500' : 'text-rose-500'
            }`} />
            <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
            }`}>
              CARDIOVASCULAR ZONE TRACKER
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
              currentZone.badgeBg
            } ${currentZone.badgeText} ${currentZone.borderClass} shadow-xs`}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentZone.color }} />
              <span>CURRENT: {currentZone.name.toUpperCase()} ({currentZone.intensity})</span>
            </div>
            <span className={`text-[10px] font-bold ${isWhiteTheme ? 'text-slate-500' : 'text-[#708aa8]'}`}>
              {heartRateBpm} BPM
            </span>
          </div>
        </div>

        {/* Color-Coded Multi-Segment Gauge */}
        <div className="relative pt-6 pb-2">
          {/* Floating Animated Needle & Marker */}
          <div
            className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500 ease-out z-10 pointer-events-none"
            style={{ left: `${gaugePercent}%` }}
          >
            <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shadow-md whitespace-nowrap border ${
              isWhiteTheme ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-950 border-slate-200'
            }`}>
              {heartRateBpm} BPM
            </div>
            <div
              className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]"
              style={{
                borderTopColor: isWhiteTheme ? '#0f172a' : '#ffffff'
              }}
            />
          </div>

          {/* Segmented Color Track */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-200 dark:bg-[#0c1828] p-0.5 gap-0.5 shadow-inner">
            {/* Zone 1: Warm-up (50-99 BPM: ~38% of 50-180 range) */}
            <div
              className={`h-full rounded-l-full transition-all duration-300 relative ${
                currentZone.id === 'warmup'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 ring-1 ring-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-emerald-500/50 opacity-70'
              }`}
              style={{ width: '38%' }}
              title="Warm-up (50-99 BPM)"
            />

            {/* Zone 2: Fat Burn (100-119 BPM: ~15% of 50-180 range) */}
            <div
              className={`h-full transition-all duration-300 relative ${
                currentZone.id === 'fatburn'
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 ring-1 ring-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                  : 'bg-yellow-500/50 opacity-70'
              }`}
              style={{ width: '15%' }}
              title="Fat Burn (100-119 BPM)"
            />

            {/* Zone 3: Cardio (120-144 BPM: ~19% of 50-180 range) */}
            <div
              className={`h-full transition-all duration-300 relative ${
                currentZone.id === 'cardio'
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 ring-1 ring-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                  : 'bg-orange-500/50 opacity-70'
              }`}
              style={{ width: '19%' }}
              title="Cardio (120-144 BPM)"
            />

            {/* Zone 4: Peak (145-180+ BPM: ~28% of 50-180 range) */}
            <div
              className={`h-full rounded-r-full transition-all duration-300 relative ${
                currentZone.id === 'peak'
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 ring-1 ring-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : 'bg-rose-500/50 opacity-70'
              }`}
              style={{ width: '28%' }}
              title="Peak (145+ BPM)"
            />
          </div>

          {/* Zone Boundary Scale Labels */}
          <div className={`flex justify-between text-[9px] mt-1.5 px-0.5 ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#6c88aa]'
          }`}>
            <span>50 BPM</span>
            <span className="text-emerald-600 font-bold">100 (Warm-up)</span>
            <span className="text-yellow-600 font-bold">120 (Fat Burn)</span>
            <span className="text-orange-600 font-bold">145 (Cardio)</span>
            <span className="text-rose-600 font-bold">180+ (Peak)</span>
          </div>
        </div>

        {/* Zone Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-[#142337]">
          {HEART_RATE_ZONES.map((zone) => {
            const isActive = currentZone.id === zone.id;
            return (
              <div
                key={zone.id}
                className={`p-2 rounded border text-left transition-all ${
                  isActive
                    ? (isWhiteTheme
                        ? 'bg-white border-slate-300 ring-2 ring-offset-1 shadow-sm'
                        : 'bg-[#0e1c2e] border-slate-600 ring-2 ring-offset-1 ring-offset-[#081220] shadow-md')
                    : (isWhiteTheme
                        ? 'bg-slate-100/60 border-slate-200/70 opacity-75'
                        : 'bg-[#050b14]/60 border-[#122033] opacity-60')
                }`}
                style={{
                  borderColor: isActive ? zone.color : undefined
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-[10px] font-black uppercase"
                    style={{ color: zone.color }}
                  >
                    {zone.name}
                  </span>
                  <span className={`text-[8px] px-1 rounded font-bold ${
                    isActive
                      ? (isWhiteTheme ? 'bg-slate-900 text-white' : 'bg-white text-slate-950')
                      : (isWhiteTheme ? 'text-slate-400' : 'text-slate-500')
                  }`}>
                    {isActive ? 'ACTIVE' : zone.intensity}
                  </span>
                </div>
                <div className="text-[11px] font-bold font-mono">
                  {zone.id === 'warmup' ? '< 100' : zone.id === 'peak' ? '145+' : `${zone.minBpm}-${zone.maxBpm}`} <span className="text-[9px] font-normal text-slate-500">BPM</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Zone Physiological Description */}
        <div className={`mt-2 text-[10px] flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-[#142337] ${
          isWhiteTheme ? 'text-slate-600' : 'text-[#7e9dc0]'
        }`}>
          <span className="flex items-center gap-1.5">
            <span className="font-bold uppercase" style={{ color: currentZone.color }}>
              {currentZone.name} Guidance:
            </span>
            <span>{currentZone.description}</span>
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 hidden sm:inline ${
            currentZone.badgeBg
          } ${currentZone.badgeText}`}>
            ZONE {HEART_RATE_ZONES.findIndex(z => z.id === currentZone.id) + 1} OF 4
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAILY GOAL PROGRESS BAR CARD (USER-SET TARGET IN LOCALSTORAGE) */}
      {/* ======================================================== */}
      <div className={`p-3 rounded-lg border mb-3 font-mono transition-colors ${
        isWhiteTheme ? 'bg-slate-50/90 border-slate-200' : 'bg-[#081220] border-[#16273d]'
      }`}>
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className={`w-4 h-4 ${isDailyGoalMet ? 'text-emerald-500' : 'text-sky-500'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
            }`}>
              DAILY 4-7-8 VAGAL GOAL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
              isDailyGoalMet
                ? (isWhiteTheme ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-black' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-black')
                : (isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-sky-950/80 text-sky-400')
            }`}>
              {isDailyGoalMet ? '🏆 GOAL ACHIEVED!' : `${todayCompletedSessions} / ${dailyGoal} SESSIONS TODAY`}
            </span>

            {/* Target Adjuster Controls */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#0d1a2d] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#1d3552]">
              <span className={`text-[9px] font-bold mr-0.5 ${isWhiteTheme ? 'text-slate-400' : 'text-[#627f9e]'}`}>
                TARGET:
              </span>
              <button
                onClick={() => handleUpdateDailyGoal(dailyGoal - 1)}
                disabled={dailyGoal <= 1}
                className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 dark:bg-[#16273c] text-[10px] font-bold hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                title="Decrease daily target"
              >
                -
              </button>
              <span className="text-[10px] font-bold px-1 text-center min-w-[14px]">
                {dailyGoal}
              </span>
              <button
                onClick={() => handleUpdateDailyGoal(dailyGoal + 1)}
                disabled={dailyGoal >= 10}
                className="w-4 h-4 flex items-center justify-center rounded bg-slate-100 dark:bg-[#16273c] text-[10px] font-bold hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                title="Increase daily target"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar Track */}
        <div className={`w-full h-2 rounded-full overflow-hidden mt-2 mb-1.5 ${
          isWhiteTheme ? 'bg-slate-200' : 'bg-[#101e30]'
        }`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDailyGoalMet
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : 'bg-gradient-to-r from-[#0284c7] to-[#10b981]'
            }`}
            style={{ width: `${dailyProgressPercent}%` }}
          />
        </div>

        {/* Subtitle Telemetry Readout */}
        <div className={`flex items-center justify-between text-[9px] ${
          isWhiteTheme ? 'text-slate-500' : 'text-[#6a87aa]'
        }`}>
          <span className="flex items-center gap-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">{dailyProgressPercent}%</span>
            <span>of daily parasympathetic target completed</span>
          </span>
          <span>
            {todayCompletedSessions >= dailyGoal
              ? '✨ Autonomic balance sustained for today'
              : `${dailyGoal - todayCompletedSessions} session${(dailyGoal - todayCompletedSessions) > 1 ? 's' : ''} remaining today`}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* REAL-TIME 'RISK LEVEL' NOTIFICATION SYSTEM & EXPOSURE    */}
      {/* ======================================================== */}
      {(showRiskLevelDetails || isDangerZone || dangerDurationSeconds > 0) && (
        <div className={`mb-3 p-3 rounded-lg border font-mono transition-all duration-300 ${
          isWhiteTheme
            ? (riskLevelData.level === 'CRITICAL' ? 'bg-rose-50/90 border-rose-400 shadow-md ring-2 ring-rose-400/30' : 'bg-slate-50/90 border-slate-200 shadow-xs')
            : (riskLevelData.level === 'CRITICAL' ? 'bg-[#20050c] border-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-2 ring-rose-500/40' : 'bg-[#081220] border-[#16273d]')
        }`}>
          {/* Risk Level Panel Header */}
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${
                riskLevelData.level === 'CRITICAL' ? 'text-rose-500 animate-bounce' :
                riskLevelData.level === 'MODERATE' ? 'text-orange-500' :
                riskLevelData.level === 'ELEVATED' ? 'text-yellow-500' : 'text-emerald-500'
              }`} />
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
                  isWhiteTheme ? 'text-slate-800' : 'text-[#e0edfd]'
                }`}>
                  REAL-TIME RISK LEVEL NOTIFICATION SYSTEM
                </h3>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  3-MIN THRESHOLD RULE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all ${riskLevelData.badgeClass}`}>
                {riskLevelData.title}
              </span>

              <button
                onClick={() => setShowRiskLevelDetails(!showRiskLevelDetails)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Toggle details"
              >
                {showRiskLevelDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 4-Stage Risk Progression Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
            {[
              { id: 'NOMINAL', label: 'STAGE 0: NOMINAL', desc: '< CEILING', active: riskLevelData.level === 'NOMINAL', color: '#10b981' },
              { id: 'ELEVATED', label: 'STAGE 1: ELEVATED', desc: '< 1 MIN IN DANGER', active: riskLevelData.level === 'ELEVATED', color: '#eab308' },
              { id: 'MODERATE', label: 'STAGE 2: MODERATE', desc: '1 - 3 MIN IN DANGER', active: riskLevelData.level === 'MODERATE', color: '#f97316' },
              { id: 'CRITICAL', label: 'STAGE 3: CRITICAL', desc: '> 3 MIN (ALERT FIRED)', active: riskLevelData.level === 'CRITICAL', color: '#ef4444' }
            ].map(stage => (
              <div
                key={stage.id}
                className={`p-1.5 rounded border text-[9px] transition-all ${
                  stage.active
                    ? (isWhiteTheme
                        ? 'bg-white border-slate-400 ring-1 ring-slate-300 shadow-xs font-bold'
                        : 'bg-[#0f1d30] border-slate-500 ring-1 ring-slate-600 font-bold')
                    : (isWhiteTheme
                        ? 'bg-slate-100/50 border-slate-200/60 opacity-60'
                        : 'bg-[#050b14]/50 border-[#122033] opacity-50')
                }`}
                style={{
                  borderLeftColor: stage.active ? stage.color : undefined,
                  borderLeftWidth: stage.active ? '3px' : undefined
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{ color: stage.active ? stage.color : undefined }} className="font-bold">
                    {stage.label}
                  </span>
                  {stage.active && (
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: stage.color }} />
                  )}
                </div>
                <div className="text-[8px] text-slate-500 truncate">{stage.desc}</div>
              </div>
            ))}
          </div>

          {/* Continuous Exposure Timer & 3-Minute Progress Gauge */}
          <div className={`p-2 rounded border mb-2 ${
            isWhiteTheme ? 'bg-white border-slate-200' : 'bg-[#050b14] border-[#15253a]'
          }`}>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Timer className={`w-3.5 h-3.5 ${dangerDurationSeconds >= 180 ? 'text-rose-500 animate-spin' : 'text-slate-400'}`} />
                <span>CONTINUOUS TIME ABOVE DANGER CEILING ({dangerThreshold} BPM):</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black tabular-nums ${
                  dangerDurationSeconds >= 180 ? 'text-rose-600 dark:text-rose-400 animate-pulse' :
                  dangerDurationSeconds > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {formatDuration(dangerDurationSeconds)} / 03:00
                </span>
                <span className={`text-[9px] px-1 rounded font-bold ${
                  dangerDurationSeconds >= 180 ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {riskLevelData.progressPercent}% OF 3-MIN
                </span>
              </div>
            </div>

            {/* Progress Bar towards 3-Minute Toast Alert */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${
              isWhiteTheme ? 'bg-slate-200' : 'bg-[#101e30]'
            }`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  dangerDurationSeconds >= 180
                    ? 'bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                    : dangerDurationSeconds >= 60
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-500 to-yellow-500'
                }`}
                style={{ width: `${riskLevelData.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Row & Test Simulation Button */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[10px]">
            <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-600' : 'text-[#7ea0c6]'}`}>
              {riskLevelData.description}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Test Toast Trigger (Simulates > 3 Min continuous danger duration) */}
              <button
                onClick={handleSimulate3MinDanger}
                className={`px-2 py-1 rounded border text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  isWhiteTheme
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800 active:scale-95'
                    : 'bg-[#2b0811] hover:bg-[#3d0b18] border-rose-500/50 text-rose-300 active:scale-95'
                }`}
                title="Immediately test real-time toast alert (> 3 minutes exposure trigger)"
              >
                <Zap className="w-3 h-3 text-rose-500" />
                <span>TEST &gt;3M TOAST ALERT</span>
              </button>

              <button
                onClick={() => setShowThresholdConfig(!showThresholdConfig)}
                className={`px-2 py-1 rounded border text-[9px] font-bold cursor-pointer transition-all ${
                  isWhiteTheme
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-[#0b1626] hover:bg-[#122238] border-[#1d324e] text-slate-300'
                }`}
              >
                CALIBRATE CEILING ({dangerThreshold} BPM)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prominent High-Visibility Danger Zone Alert Banner */}
      {isDangerZone && (
        <div className={`mb-3 p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all font-mono ${
          isWhiteTheme
            ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm'
            : 'bg-[#29050d] border-[#ff3366] text-[#ff99aa] shadow-[0_0_15px_rgba(255,0,51,0.25)]'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-black text-rose-600 flex items-center gap-1.5">
                <span>DANGER ZONE ALERT TRIGGERED</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold">
                  {heartRateBpm} &gt; {dangerThreshold} BPM
                </span>
              </div>
              <div className={`text-[10px] mt-0.5 ${isWhiteTheme ? 'text-rose-800' : 'text-rose-300'}`}>
                Cardiovascular telemetry exceeds calibrated threshold by +{dangerDelta} BPM. Parasympathetic recovery recommended.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowBreathingTimer(true);
              handleRoutineSelect('BREATHING_478');
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded cursor-pointer transition-colors whitespace-nowrap shadow-sm flex items-center justify-center gap-1"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>ENGAGE 4-7-8 VAGAL BRAKE</span>
          </button>
        </div>
      )}

      {/* Expandable Custom Danger Zone Threshold Calibrator */}
      {showThresholdConfig && (
        <div className={`mb-3 p-3 rounded border font-mono transition-colors ${
          isWhiteTheme ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#09101c] border-[#18273b]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BellRing className={`w-3.5 h-3.5 ${isWhiteTheme ? 'text-rose-600' : 'text-rose-400'}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isWhiteTheme ? 'text-slate-900' : 'text-white'
              }`}>
                DANGER ZONE THRESHOLD CALIBRATOR
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-rose-600 tabular-nums">
                {dangerThreshold} BPM
              </span>
              <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#708aa8]'}`}>
                {heartRateBpm >= dangerThreshold ? '⚠️ IN DANGER' : '✓ NORMAL'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <input
              type="range"
              min="60"
              max="150"
              step="5"
              value={dangerThreshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10))}
              className="w-full accent-rose-600 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#7997be]'}`}>
              QUICK PRESETS:
            </span>
            <div className="flex items-center gap-1">
              {PRESET_THRESHOLDS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleThresholdChange(preset)}
                  className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer transition-colors ${
                    dangerThreshold === preset
                      ? 'bg-rose-600 text-white border-rose-600 font-bold'
                      : (isWhiteTheme
                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-[#0d1624] hover:bg-[#152338] border-[#1f314c] text-[#8fa8cc]')
                  }`}
                >
                  {preset} BPM
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Routine Action Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Routine 01 */}
        <button
          onClick={() => handleRoutineSelect('ANUHAZI_CHANT')}
          className={`p-2.5 rounded text-left transition-all group cursor-pointer border ${
            isWhiteTheme
              ? 'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-300 shadow-sm'
              : 'bg-[#0b1222] hover:bg-[#111c33] border-[#16253c] hover:border-[#00e1ff]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[9px] font-mono font-bold tracking-widest ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`}>
              ROUTINE 01
            </span>
            <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0284c7] transition-colors" />
          </div>
          <div className={`font-bold text-[11px] font-mono ${isWhiteTheme ? 'text-slate-900' : 'text-[#ffffff]'}`}>
            ANUHAZI FREQ
          </div>
          <div className={`text-[9px] mt-0.5 truncate ${isWhiteTheme ? 'text-slate-500' : 'text-[#7ea1c9]'}`}>
            Harmonic scalar resonance
          </div>
        </button>

        {/* Routine 02 */}
        <button
          onClick={() => handleRoutineSelect('YOGA_STRETCH')}
          className={`p-2.5 rounded text-left transition-all group cursor-pointer border ${
            isWhiteTheme
              ? 'bg-slate-50 hover:bg-sky-50 border-slate-200 hover:border-sky-300 shadow-sm'
              : 'bg-[#0b1222] hover:bg-[#111c33] border-[#16253c] hover:border-[#00e1ff]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[9px] font-mono font-bold tracking-widest ${
              isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'
            }`}>
              ROUTINE 02
            </span>
            <Flame className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className={`font-bold text-[11px] font-mono ${isWhiteTheme ? 'text-slate-900' : 'text-[#ffffff]'}`}>
            YOGA RESET
          </div>
          <div className={`text-[9px] mt-0.5 truncate ${isWhiteTheme ? 'text-slate-500' : 'text-[#7ea1c9]'}`}>
            Vagal stretch & calibration
          </div>
        </button>

        {/* Routine 03: 4-7-8 Breath with 'Session History' and Today Progress */}
        <button
          onClick={() => setShowBreathingTimer((prev) => !prev)}
          className={`p-2.5 rounded text-left transition-all group cursor-pointer border ${
            showBreathingTimer
              ? (isWhiteTheme
                  ? 'bg-cyan-100 border-cyan-400 text-cyan-900 shadow-sm'
                  : 'bg-[#00e1ff]/20 border-[#00e1ff] text-[#00e1ff] shadow-[0_0_10px_rgba(0,225,255,0.2)]')
              : (isWhiteTheme
                  ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
                  : 'bg-[#00e1ff]/10 hover:bg-[#00e1ff]/20 border-[#00e1ff]/40 text-[#00e1ff]')
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[9px] font-mono font-bold tracking-widest ${
              isWhiteTheme ? 'text-cyan-800' : 'text-[#00e1ff]'
            }`}>
              ROUTINE 03
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[8px] font-mono px-1 rounded font-bold ${
                isWhiteTheme ? 'bg-cyan-200 text-cyan-900' : 'bg-[#00e1ff]/30 text-white'
              }`}>
                {todayCompletedSessions}/{dailyGoal} today
              </span>
              <Wind className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className={`font-bold text-[11px] font-mono ${isWhiteTheme ? 'text-slate-900' : 'text-[#ffffff]'}`}>
            4-7-8 BREATH
          </div>
          <div className={`text-[9px] mt-0.5 flex items-center justify-between ${
            isWhiteTheme ? 'text-slate-500' : 'text-[#7ea1c9]'
          }`}>
            <span>{completedBreathingSessions} lifetime</span>
            {showBreathingTimer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* 4-7-8 Breathing Visual Timer Component with Session History Banner */}
      {showBreathingTimer && (
        <div className="mt-2 space-y-2">
          {/* Dynamically derived 'Session History' Banner */}
          <div className={`px-3 py-1.5 rounded flex items-center justify-between text-xs font-mono border ${
            isWhiteTheme
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>SESSION HISTORY:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                {completedBreathingSessions} COMPLETED ({todayCompletedSessions} TODAY / TARGET {dailyGoal})
              </strong>
            </div>
            <span className={`text-[10px] ${isWhiteTheme ? 'text-slate-500' : 'text-[#7999be]'}`}>
              DERIVED FROM WELLNESS LOGS
            </span>
          </div>

          <BreathingTimer478
            currentHeartRate={heartRateBpm}
            onLogRoutine={() => onTriggerRoutine('BREATHING_478')}
            onCompleteCycle={() => onTriggerRoutine('BREATHING_478')}
          />

          {/* ======================================================== */}
          {/* LAST 5 COMPLETED 4-7-8 BREATHING SESSIONS & REDUCTION    */}
          {/* ======================================================== */}
          <div className={`p-3.5 rounded-lg border font-mono transition-all ${
            isWhiteTheme
              ? 'bg-slate-50/90 border-slate-200 text-slate-800 shadow-xs'
              : 'bg-[#081220] border-[#16273d] text-[#c0d4ec]'
          }`}>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500 shrink-0" />
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
                  isWhiteTheme ? 'text-slate-900' : 'text-[#e0edfd]'
                }`}>
                  LAST 5 COMPLETED 4-7-8 BREATHING SESSIONS
                </h3>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                {last5BreathingSessions.length > 0 && (
                  <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                    isWhiteTheme
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    <TrendingDown className="w-3 h-3 text-emerald-500" />
                    <span>AVG REDUCTION: -{averageHrReduction} BPM</span>
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded font-bold ${
                  isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-sky-950/80 text-sky-300'
                }`}>
                  {completedBreathingSessions} TOTAL LOGGED
                </span>
              </div>
            </div>

            {last5BreathingSessions.length === 0 ? (
              <div className={`p-4 rounded border text-center text-xs ${
                isWhiteTheme ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#050b14] border-[#132034] text-slate-400'
              }`}>
                <Wind className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-emerald-500 animate-pulse" />
                <p className="font-bold">No 4-7-8 breathing sessions recorded yet.</p>
                <p className="text-[10px] mt-0.5 opacity-75">
                  Complete a 4-cycle breathing protocol above to calculate and log vagal heart rate deceleration.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {last5BreathingSessions.map((session, index) => {
                  const hrBefore = session.heartRateBefore;
                  const hrAfter = session.heartRateAfter;
                  const reductionBpm = hrBefore - hrAfter;
                  const reductionPct = hrBefore > 0 ? Math.round((reductionBpm / hrBefore) * 100) : 0;
                  const isLatest = index === 0;

                  const dateObj = new Date(session.timestamp);
                  const formattedDate = dateObj.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  // Relative time calculation
                  const diffMinutes = Math.round((Date.now() - dateObj.getTime()) / 60000);
                  let relativeStr = 'Just now';
                  if (diffMinutes >= 1 && diffMinutes < 60) {
                    relativeStr = `${diffMinutes}m ago`;
                  } else if (diffMinutes >= 60 && diffMinutes < 1440) {
                    relativeStr = `${Math.round(diffMinutes / 60)}h ago`;
                  } else if (diffMinutes >= 1440) {
                    relativeStr = `${Math.round(diffMinutes / 1440)}d ago`;
                  }

                  return (
                    <div
                      key={session.id || `session-${index}`}
                      className={`p-2.5 rounded-md border transition-all ${
                        isLatest
                          ? (isWhiteTheme
                              ? 'bg-white border-emerald-300 ring-1 ring-emerald-300/60 shadow-xs'
                              : 'bg-[#0b182b] border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]')
                          : (isWhiteTheme
                              ? 'bg-white/80 hover:bg-white border-slate-200'
                              : 'bg-[#07101c]/90 hover:bg-[#0c192c] border-[#15253b]')
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Session Sequence & Timestamp */}
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isLatest
                              ? 'bg-emerald-600 text-white font-black'
                              : (isWhiteTheme ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300')
                          }`}>
                            #{index + 1} {isLatest ? 'LATEST' : ''}
                          </span>

                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-bold">{formattedDate} · {formattedTime}</span>
                            <span className={`text-[9px] px-1 rounded ${
                              isWhiteTheme ? 'bg-slate-100 text-slate-500' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {relativeStr}
                            </span>
                          </div>
                        </div>

                        {/* Calculated Heart Rate Reduction Metric */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            <span className="text-slate-400">{hrBefore} BPM</span>
                            <span className="text-slate-400">→</span>
                            <span className={reductionBpm > 0 ? 'text-emerald-500' : 'text-slate-200'}>
                              {hrAfter} BPM
                            </span>
                          </div>

                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${
                              reductionBpm > 0
                                ? (isWhiteTheme
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]')
                                : reductionBpm === 0
                                ? (isWhiteTheme
                                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                                    : 'bg-slate-900 border-slate-700 text-slate-300')
                                : (isWhiteTheme
                                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                                    : 'bg-rose-950/80 border-rose-500/50 text-rose-300')
                            }`}
                          >
                            {reductionBpm > 0 ? (
                              <>
                                <TrendingDown className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>-{reductionBpm} BPM (-{reductionPct}%)</span>
                              </>
                            ) : reductionBpm === 0 ? (
                              <span>0 BPM (MAINTAINED)</span>
                            ) : (
                              <span>+{Math.abs(reductionBpm)} BPM</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Clinical Notes / Routine Log Meta */}
                      {session.notes && (
                        <div className={`text-[9px] mt-1.5 pt-1 border-t flex items-center justify-between ${
                          isWhiteTheme ? 'border-slate-100 text-slate-500' : 'border-[#112035] text-[#6d8bab]'
                        }`}>
                          <span className="truncate max-w-[85%]">{session.notes}</span>
                          <span className="text-[8px] opacity-75 uppercase font-mono">4-CYCLE VAGAL</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Real-time Risk Level On-Screen Toast Alert */}
      {riskToastElement}
    </div>
  );
}
