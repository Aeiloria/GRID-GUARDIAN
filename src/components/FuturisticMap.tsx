import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Zap,
  MapPin,
  Shield,
  AlertTriangle,
  Radio,
  Plus,
  Trash2,
  X,
  Check,
  Navigation,
  Locate,
  LocateFixed,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CustomPin } from '../hooks/useIndexedDB';

interface FuturisticMapProps {
  centerLat: number;
  centerLon: number;
  customPins?: CustomPin[];
  onSaveCustomPin?: (pin: CustomPin) => Promise<void>;
  onDeleteCustomPin?: (pinId: string) => Promise<void>;
}

interface GridNode {
  node_id: string;
  name: string;
  classification: string;
  latitude: number;
  longitude: number;
  base_radius_meters: number;
  is_shielded: boolean;
  shield_expires_at?: string;
}

export interface InterferenceRegion {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: 'custom_pin' | 'grid_node';
}

export interface SafeZoneTarget {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: 'custom_pin' | 'grid_node';
  distanceToUser: number;
  notes?: string;
}

// Calculate Haversine distance in meters between two geographic coordinates
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function FuturisticMap({
  centerLat,
  centerLon,
  customPins = [],
  onSaveCustomPin,
  onDeleteCustomPin
}: FuturisticMapProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);
  const [selectedPin, setSelectedPin] = useState<CustomPin | null>(null);
  const [isShielding, setIsShielding] = useState<boolean>(false);
  const [radarAngle, setRadarAngle] = useState<number>(0);

  // User Current GPS Location (Real Browser Geolocation or Simulated GPS)
  const [userGps, setUserGps] = useState<{ lat: number; lng: number }>({
    lat: centerLat,
    lng: centerLon
  });
  const [gpsSource, setGpsSource] = useState<'simulated' | 'real'>('simulated');
  const [isGpsTrackingActive, setIsGpsTrackingActive] = useState<boolean>(false);
  const [realGpsError, setRealGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Long-press detection and custom pin modal state
  const [longPressProgress, setLongPressProgress] = useState<number>(0);
  const [pressPos, setPressPos] = useState<{ x: number; y: number } | null>(null);
  const [newPinCoord, setNewPinCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [newPinName, setNewPinName] = useState<string>('');
  const [newPinCategory, setNewPinCategory] = useState<'Safe Zone' | 'High Interference'>('Safe Zone');
  const [newPinNotes, setNewPinNotes] = useState<string>('');
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressIntervalRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const { isWhiteTheme } = useTheme();

  const [nodes, setNodes] = useState<GridNode[]>([
    {
      node_id: 'NODE-GV-01',
      name: 'Gatesville Primary Substation Alpha',
      classification: 'POWER_GRID',
      latitude: centerLat,
      longitude: centerLon,
      base_radius_meters: 250,
      is_shielded: true,
      shield_expires_at: new Date(Date.now() + 86400000).toISOString()
    },
    {
      node_id: 'NODE-GV-02',
      name: 'Leon River Water Treatment Array',
      classification: 'HYDRO_INFRA',
      latitude: centerLat - 0.0066,
      longitude: centerLon + 0.0059,
      base_radius_meters: 180,
      is_shielded: true,
      shield_expires_at: new Date(Date.now() + 43200000).toISOString()
    },
    {
      node_id: 'NODE-GV-03',
      name: 'Coryell Memorial Medical Grid',
      classification: 'BIO_MEDICAL',
      latitude: centerLat + 0.0069,
      longitude: centerLon - 0.0071,
      base_radius_meters: 300,
      is_shielded: false
    },
    {
      node_id: 'NODE-GV-04',
      name: 'Hwy 36 Vector Transit Beacon',
      classification: 'LOGISTICS',
      latitude: centerLat + 0.0149,
      longitude: centerLon - 0.0161,
      base_radius_meters: 150,
      is_shielded: false
    },
    {
      node_id: 'NODE-GV-05',
      name: 'Fort Cavazos Perimeter Relay',
      classification: 'PERIMETER_DEFENSE',
      latitude: centerLat - 0.0241,
      longitude: centerLon + 0.0239,
      base_radius_meters: 400,
      is_shielded: true,
      shield_expires_at: new Date(Date.now() + 120000000).toISOString()
    }
  ]);

  // Sync with backend grid endpoint if available
  useEffect(() => {
    fetch('/api/grid/status')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNodes(data);
        }
      })
      .catch(() => {
        // Fallback to local default nodes
      });
  }, []);

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle(prev => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Geolocation tracking effect when real GPS mode is active
  useEffect(() => {
    if (gpsSource !== 'real') {
      setIsGpsTrackingActive(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setRealGpsError('Geolocation is not supported in this browser.');
      setGpsSource('simulated');
      return;
    }

    setRealGpsError(null);
    setIsGpsTrackingActive(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setIsGpsTrackingActive(true);
      },
      (err) => {
        setRealGpsError(err.message || 'GPS Signal Unavailable');
        setIsGpsTrackingActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsSource]);

  // 1. Identify all high-interference regions (custom pins with 'High Interference'/EMF and unshielded nodes)
  const interferenceRegions = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      source: 'custom_pin' | 'grid_node';
    }> = [];

    // Custom pins categorized as High Interference
    customPins.forEach((p) => {
      const cls = (p.classification || '').toLowerCase();
      if (cls === 'high interference' || cls.includes('interference') || cls.includes('emf')) {
        list.push({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          source: 'custom_pin'
        });
      }
    });

    // Unshielded or high-EMF grid nodes
    nodes.forEach((n) => {
      if (!n.is_shielded || n.classification === 'HIGH_INTERFERENCE') {
        list.push({
          id: n.node_id,
          name: n.name,
          lat: n.latitude,
          lng: n.longitude,
          source: 'grid_node'
        });
      }
    });

    // Fallback reference anchor if no interference source exists
    if (list.length === 0) {
      list.push({
        id: 'sector-high-emf-anchor',
        name: 'Coryell Unshielded High-EMF Substation',
        lat: centerLat + 0.0031, // ~340 meters from center
        lng: centerLon - 0.0028,
        source: 'grid_node'
      });
    }

    return list;
  }, [customPins, nodes, centerLat, centerLon]);

  // 2. Identify all Safe Zone pins (both custom pins and shielded nodes)
  const safeZonePins = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      source: 'custom_pin' | 'grid_node';
      distanceToUser: number;
      notes?: string;
    }> = [];

    customPins.forEach((p) => {
      const cls = (p.classification || '').toLowerCase();
      if (cls === 'safe zone' || cls.includes('safe') || cls === 'safe_zone') {
        list.push({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          source: 'custom_pin',
          distanceToUser: calculateDistanceMeters(userGps.lat, userGps.lng, p.lat, p.lng),
          notes: p.notes
        });
      }
    });

    // Include shielded nodes as safe havens
    nodes.forEach((n) => {
      if (n.is_shielded) {
        list.push({
          id: n.node_id,
          name: n.name,
          lat: n.latitude,
          lng: n.longitude,
          source: 'grid_node',
          distanceToUser: calculateDistanceMeters(userGps.lat, userGps.lng, n.latitude, n.longitude)
        });
      }
    });

    return list.sort((a, b) => a.distanceToUser - b.distanceToUser);
  }, [customPins, nodes, userGps]);

  // 3. Proximity check: Is user's current GPS location within 500 meters of any high-interference region?
  const nearestInterference = useMemo<{ region: InterferenceRegion; distance: number } | null>(() => {
    if (interferenceRegions.length === 0) return null;
    let closest: { region: InterferenceRegion; distance: number } | null = null;

    interferenceRegions.forEach((reg: InterferenceRegion) => {
      const dist = calculateDistanceMeters(userGps.lat, userGps.lng, reg.lat, reg.lng);
      if (!closest || dist < closest.distance) {
        closest = { region: reg, distance: dist };
      }
    });

    return closest;
  }, [interferenceRegions, userGps]);

  const isWithin500mOfInterference = Boolean(
    nearestInterference && nearestInterference.distance <= 500
  );

  const nearestSafeZone = safeZonePins[0] || null;

  // Simulation controls
  const handleSimulateNearInterference = () => {
    if (interferenceRegions.length === 0) return;
    const target = interferenceRegions[0];
    // Position ~280 meters from the high interference region
    setUserGps({
      lat: target.lat + 0.0020,
      lng: target.lng + 0.0016
    });
    setGpsSource('simulated');
  };

  const handleSimulateSafeLocation = () => {
    // Position in a clear zone > 900 meters away from any interference
    setUserGps({
      lat: centerLat - 0.010,
      lng: centerLon + 0.012
    });
    setGpsSource('simulated');
  };

  const handleResetToCenter = () => {
    setUserGps({
      lat: centerLat,
      lng: centerLon
    });
    setGpsSource('simulated');
  };

  const handleClearNodeShield = async (node: GridNode) => {
    setIsShielding(true);
    try {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo_signature';
      const res = await fetch('/api/grid/clear-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: node.node_id })
      });
      if (res.ok) {
        setNodes(prev => prev.map(n => n.node_id === node.node_id ? { ...n, is_shielded: true } : n));
        if (selectedNode && selectedNode.node_id === node.node_id) {
          setSelectedNode(prev => prev ? { ...prev, is_shielded: true } : null);
        }
      } else {
        setNodes(prev => prev.map(n => n.node_id === node.node_id ? { ...n, is_shielded: true } : n));
        if (selectedNode && selectedNode.node_id === node.node_id) {
          setSelectedNode(prev => prev ? { ...prev, is_shielded: true } : null);
        }
      }
    } catch {
      setNodes(prev => prev.map(n => n.node_id === node.node_id ? { ...n, is_shielded: true } : n));
      if (selectedNode && selectedNode.node_id === node.node_id) {
        setSelectedNode(prev => prev ? { ...prev, is_shielded: true } : null);
      }
    } finally {
      setIsShielding(false);
    }
  };

  const latSpan = 0.05 / zoom;
  const lonSpan = 0.07 / zoom;

  const getPosition = (lat: number, lon: number) => {
    const xPct = 50 + ((lon - centerLon) / lonSpan) * 100;
    const yPct = 50 - ((lat - centerLat) / latSpan) * 100;
    return {
      left: `${Math.max(5, Math.min(95, xPct))}%`,
      top: `${Math.max(5, Math.min(95, yPct))}%`
    };
  };

  // Convert click/touch relative offset back into geographic coordinates
  const calculateGeoFromContainerXY = (clientX: number, clientY: number) => {
    if (!mapContainerRef.current) return null;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const xPct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));
    const lon = centerLon + ((xPct - 50) / 100) * lonSpan;
    const lat = centerLat - ((yPct - 50) / 100) * latSpan;
    return { lat, lon, xPct, yPct };
  };

  // Start Long-Press Handler
  const startLongPress = (clientX: number, clientY: number) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    startPosRef.current = { x: clientX, y: clientY };
    setPressPos({ x: localX, y: localY });
    setLongPressProgress(0);

    const startTime = Date.now();
    const duration = 500; // 500ms long-press

    longPressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setLongPressProgress(progress);
    }, 20);

    longPressTimerRef.current = window.setTimeout(() => {
      // Trigger long-press action!
      if (longPressIntervalRef.current) clearInterval(longPressIntervalRef.current);
      setLongPressProgress(0);
      setPressPos(null);

      const geo = calculateGeoFromContainerXY(clientX, clientY);
      if (geo) {
        setNewPinCoord({ lat: geo.lat, lon: geo.lon });
        setNewPinName(`Sector Pin ${customPins.length + 1}`);
        setNewPinCategory('Safe Zone');
        setNewPinNotes('');
      }
    }, duration);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
    setLongPressProgress(0);
    setPressPos(null);
    startPosRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to left button
    if (e.button !== 0) return;
    startLongPress(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPosRef.current) return;
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 10) {
      cancelLongPress();
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinCoord || !onSaveCustomPin) return;
    setIsSavingPin(true);
    try {
      const pinPayload: CustomPin = {
        id: `pin-${Date.now()}`,
        name: newPinName.trim() || `${newPinCategory} Pin`,
        lat: parseFloat(newPinCoord.lat.toFixed(6)),
        lng: parseFloat(newPinCoord.lon.toFixed(6)),
        classification: newPinCategory,
        isEncrypted: false,
        notes: newPinNotes.trim()
      };
      await onSaveCustomPin(pinPayload);
      setNewPinCoord(null);
    } catch (err) {
      console.error('Failed to save pin to IndexedDB:', err);
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleDeletePin = async (pinId: string) => {
    if (!onDeleteCustomPin) return;
    try {
      await onDeleteCustomPin(pinId);
      setSelectedPin(null);
    } catch (err) {
      console.error('Failed to delete pin from IndexedDB:', err);
    }
  };

  return (
    <div className={`p-4 border-b transition-colors relative ${
      isWhiteTheme
        ? 'border-slate-200 bg-white text-slate-800'
        : 'border-[#1a2636] bg-[#040810] text-[#c0d4ec]'
    }`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className={`w-4 h-4 animate-spin ${isWhiteTheme ? 'text-[#0284c7]' : 'text-[#00ffcc]'}`} />
          <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isWhiteTheme ? 'text-slate-800' : 'text-[#d0e0f5]'
          }`}>
            SECTOR 31-GATESVILLE // HIGH-DENSITY VECTOR RADAR
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Pin Drop Button for desktop mouse users */}
          <button
            onClick={() => {
              setNewPinCoord({ lat: centerLat, lon: centerLon });
              setNewPinName(`Center Pin ${customPins.length + 1}`);
              setNewPinCategory('Safe Zone');
              setNewPinNotes('');
            }}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
                : 'bg-[#00ffcc]/10 border-[#00ffcc]/30 text-[#00ffcc] hover:bg-[#00ffcc]/20'
            }`}
            title="Drop custom pin at reticle coordinates"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">PIN COORD</span>
          </button>

          <button
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.3))}
            className={`p-1 rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-slate-100'
                : 'bg-[#0f1827] border-[#1e2f47] text-[#8fa8cc] hover:text-[#00ffcc]'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.7, prev - 0.3))}
            className={`p-1 rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-slate-100'
                : 'bg-[#0f1827] border-[#1e2f47] text-[#8fa8cc] hover:text-[#00ffcc]'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`p-1 rounded border cursor-pointer transition-colors ${
              isWhiteTheme
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-slate-100'
                : 'bg-[#0f1827] border-[#1e2f47] text-[#8fa8cc] hover:text-[#00ffcc]'
            }`}
            title="Reset Grid"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GPS Telemetry & Proximity Scenario Bar */}
      <div className={`p-2 rounded mb-2 border font-mono flex items-center justify-between flex-wrap gap-2 text-[10px] transition-colors ${
        isWhiteTheme ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#060e1a] border-[#152336] text-[#93b2d7]'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Navigation className={`w-3.5 h-3.5 ${
              isWithin500mOfInterference ? 'text-amber-500 animate-bounce' : 'text-sky-500'
            }`} />
            <span className="font-bold">GPS:</span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${
              gpsSource === 'real'
                ? (isWhiteTheme ? 'bg-sky-100 text-sky-800' : 'bg-sky-950/80 text-sky-400')
                : (isWhiteTheme ? 'bg-purple-100 text-purple-800' : 'bg-purple-950/80 text-purple-400')
            }`}>
              {gpsSource.toUpperCase()} {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}
            </span>
          </div>

          <span className="text-[9px] text-slate-400">
            [{userGps.lat.toFixed(4)}° N, {userGps.lng.toFixed(4)}° W]
          </span>

          {/* Real vs Simulated Toggle */}
          <div className="flex items-center gap-1 border-l pl-2 border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setGpsSource('simulated')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                gpsSource === 'simulated'
                  ? 'bg-purple-600 text-white font-bold'
                  : (isWhiteTheme ? 'bg-white hover:bg-slate-100 text-slate-600' : 'bg-[#0d1b2e] hover:bg-[#142944] text-slate-300')
              }`}
              title="Use Simulated GPS Coordinates"
            >
              SIMULATED
            </button>
            <button
              onClick={() => setGpsSource('real')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                gpsSource === 'real'
                  ? 'bg-sky-600 text-white font-bold'
                  : (isWhiteTheme ? 'bg-white hover:bg-slate-100 text-slate-600' : 'bg-[#0d1b2e] hover:bg-[#142944] text-slate-300')
              }`}
              title="Use Device Real GPS Geolocation"
            >
              <LocateFixed className="w-2.5 h-2.5" />
              <span>REAL</span>
            </button>
          </div>
        </div>

        {/* Proximity Simulation Triggers for User Verification */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] text-slate-400 hidden md:inline">TEST SCENARIO:</span>
          <button
            onClick={handleSimulateNearInterference}
            className={`px-2 py-0.5 rounded border text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
              isWithin500mOfInterference
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : (isWhiteTheme
                    ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                    : 'bg-[#211107] hover:bg-[#331a0b] border-amber-600/50 text-amber-300')
            }`}
            title="Simulate user position within 300m of high-interference EMF source"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>NEAR EMF (&lt;500m)</span>
          </button>

          <button
            onClick={handleSimulateSafeLocation}
            className={`px-2 py-0.5 rounded border text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
              !isWithin500mOfInterference
                ? 'bg-emerald-600 text-white border-emerald-600'
                : (isWhiteTheme
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-[#081f16] hover:bg-[#0c2f22] border-emerald-600/50 text-emerald-300')
            }`}
            title="Simulate user position safe and far from interference (>500m)"
          >
            <Shield className="w-2.5 h-2.5" />
            <span>SAFE HAVEN</span>
          </button>

          <button
            onClick={handleResetToCenter}
            className={`px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors ${
              isWhiteTheme ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-600' : 'bg-[#0d1a29] hover:bg-[#14273e] border-[#1f3552] text-slate-300'
            }`}
            title="Reset position to sector center"
          >
            CENTER
          </button>
        </div>
      </div>

      {/* High-Interference Proximity Alert Banner (Triggers when user GPS <= 500m of interference) */}
      {isWithin500mOfInterference && nearestInterference && (
        <div className={`p-2.5 rounded mb-2 border font-mono flex items-center justify-between flex-wrap gap-2 transition-all animate-pulse ${
          isWhiteTheme
            ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-md ring-2 ring-amber-400/30'
            : 'bg-[#241006] border-amber-500 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 animate-bounce" />
            <div>
              <div className="text-xs font-black flex items-center gap-2">
                <span>HIGH-INTERFERENCE PROXIMITY DETECTED</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-600 text-white">
                  {nearestInterference.distance}m DISTANCE (&le; 500m)
                </span>
              </div>
              <p className={`text-[10px] mt-0.5 ${isWhiteTheme ? 'text-amber-900' : 'text-amber-300'}`}>
                User GPS is within 500m of <strong>{nearestInterference.region.name}</strong>. Automatically highlighting nearby Safe Zone pins on radar.
              </p>
            </div>
          </div>

          {nearestSafeZone && (
            <button
              onClick={() => {
                const pinMatch = customPins.find(p => p.id === nearestSafeZone.id);
                if (pinMatch) {
                  setSelectedPin(pinMatch);
                  setSelectedNode(null);
                } else {
                  const nodeMatch = nodes.find(n => n.node_id === nearestSafeZone.id);
                  if (nodeMatch) {
                    setSelectedNode(nodeMatch);
                    setSelectedPin(null);
                  }
                }
              }}
              className="px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors shadow-sm flex items-center gap-1 shrink-0"
              title="Lock target on closest safe zone"
            >
              <Shield className="w-3 h-3 fill-current" />
              <span>LOCK NEAREST HAVEN ({nearestSafeZone.distanceToUser}m)</span>
            </button>
          )}
        </div>
      )}

      {realGpsError && gpsSource === 'real' && (
        <div className={`p-2 rounded mb-2 border text-[10px] font-mono flex items-center gap-1.5 ${
          isWhiteTheme ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
        }`}>
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Real GPS Notice: {realGpsError} (Operating in Simulated coordinates)</span>
        </div>
      )}

      {/* Map Interactive Canvas */}
      <div
        ref={mapContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className={`relative h-[290px] w-full rounded overflow-hidden border shadow-inner transition-colors select-none cursor-crosshair ${
          isWhiteTheme
            ? 'bg-[#f8fafc] border-slate-200'
            : 'bg-[#02050c] border-[#162438] shadow-2xl'
        }`}
      >
        {/* Vector Grid Lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: isWhiteTheme
              ? `
                radial-gradient(circle at 50% 50%, rgba(2,132,199,0.08) 0%, transparent 70%),
                linear-gradient(to right, #cbd5e1 1px, transparent 1px),
                linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
              `
              : `
                radial-gradient(circle at 50% 50%, rgba(0,255,204,0.12) 0%, transparent 70%),
                linear-gradient(to right, #112035 1px, transparent 1px),
                linear-gradient(to bottom, #112035 1px, transparent 1px)
              `,
            backgroundSize: '100% 100%, 28px 28px, 28px 28px'
          }}
        />

        {/* Concentric Telemetry Range Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-[120px] h-[120px] rounded-full border ${
            isWhiteTheme ? 'border-sky-300/40' : 'border-[#00ffcc]/20'
          }`} />
          <div className={`w-[200px] h-[200px] rounded-full border border-dashed ${
            isWhiteTheme ? 'border-sky-300/30' : 'border-[#00ffcc]/15'
          }`} />
          <div className={`w-[270px] h-[270px] rounded-full border ${
            isWhiteTheme ? 'border-sky-300/20' : 'border-[#00ffcc]/10'
          }`} />
        </div>

        {/* Dynamic Sweeping Radar Beam */}
        <div
          className="absolute inset-0 pointer-events-none origin-center"
          style={{
            transform: `rotate(${radarAngle}deg)`
          }}
        >
          <div
            className="w-1/2 h-full absolute right-1/2 top-0"
            style={{
              background: isWhiteTheme
                ? 'conic-gradient(from 180deg at 100% 50%, rgba(2,132,199,0.18) 0deg, rgba(2,132,199,0.0) 65deg, transparent 90deg)'
                : 'conic-gradient(from 180deg at 100% 50%, rgba(0,255,204,0.2) 0deg, rgba(0,255,204,0.0) 65deg, transparent 90deg)'
            }}
          />
        </div>

        {/* Long-Press Visual Charging Reticle Indicator */}
        {pressPos && longPressProgress > 0 && (
          <div
            className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: pressPos.x, top: pressPos.y }}
          >
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={isWhiteTheme ? '#cbd5e1' : '#1e2f47'}
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={isWhiteTheme ? '#0284c7' : '#00ffcc'}
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - longPressProgress / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-[8px] font-mono font-bold text-[#0284c7] dark:text-[#00ffcc]">
              {Math.round(longPressProgress)}%
            </div>
          </div>
        )}

        {/* Center Coordinate Reticle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
          <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${
            isWhiteTheme ? 'border-[#0284c7]' : 'border-[#00ffcc]'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-ping ${
              isWhiteTheme ? 'bg-[#0284c7]' : 'bg-[#00ffcc]'
            }`} />
          </div>
          <span className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded shadow-sm border ${
            isWhiteTheme
              ? 'text-sky-900 bg-white/90 border-slate-200'
              : 'text-[#00ffcc] bg-[#02050c]/80 border-transparent'
          }`}>
            GATESVILLE (31.4351° N, 97.7439° W)
          </span>
        </div>

        {/* User Current GPS Marker (Real Browser Geolocation or Simulated GPS) */}
        {(() => {
          const userPos = getPosition(userGps.lat, userGps.lng);
          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none transition-all duration-300"
              style={{ left: userPos.left, top: userPos.top }}
            >
              {/* 500m Perimeter Aura Ring */}
              <div
                className={`w-12 h-12 rounded-full -translate-x-3.5 -translate-y-3.5 absolute pointer-events-none border border-dashed ${
                  isWithin500mOfInterference
                    ? 'border-amber-400 bg-amber-500/20 animate-ping'
                    : 'border-sky-400/40 bg-sky-500/10 animate-spin-slow'
                }`}
              />

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-lg ${
                  isWithin500mOfInterference
                    ? 'bg-amber-500 border-white text-slate-950 shadow-[0_0_14px_#f59e0b]'
                    : 'bg-sky-600 border-white text-white shadow-[0_0_10px_#0284c7]'
                }`}
              >
                <Navigation className="w-2.5 h-2.5 fill-current" />
              </div>

              <div
                className={`absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap text-[8px] px-1.5 py-0.5 rounded font-mono font-black border shadow-sm ${
                  isWithin500mOfInterference
                    ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50'
                    : (isWhiteTheme ? 'bg-sky-900 text-white border-sky-700' : 'bg-[#051a33] text-sky-300 border-sky-500')
                }`}
              >
                YOU ({gpsSource.toUpperCase()})
              </div>
            </div>
          );
        })()}

        {/* Directional Vector Guide Line to Closest Safe Zone */}
        {isWithin500mOfInterference && nearestSafeZone && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
            <line
              x1={getPosition(userGps.lat, userGps.lng).left}
              y1={getPosition(userGps.lat, userGps.lng).top}
              x2={getPosition(nearestSafeZone.lat, nearestSafeZone.lng).left}
              y2={getPosition(nearestSafeZone.lat, nearestSafeZone.lng).top}
              stroke={isWhiteTheme ? '#059669' : '#00ffcc'}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {/* Default System Grid Nodes */}
        {nodes.map(node => {
          const pos = getPosition(node.latitude, node.longitude);
          const isSelected = selectedNode?.node_id === node.node_id;
          const isNodeSafeHighlight = isWithin500mOfInterference && node.is_shielded;

          return (
            <div
              key={node.node_id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin(null);
                setSelectedNode(node);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 z-10"
              style={{ left: pos.left, top: pos.top }}
            >
              {/* Radius Aura */}
              <div
                className={`w-6 h-6 rounded-full -translate-x-1 -translate-y-1 absolute pointer-events-none ${
                  isNodeSafeHighlight
                    ? 'bg-emerald-400/40 border-2 border-emerald-400 animate-ping shadow-[0_0_20px_#10b981]'
                    : node.is_shielded
                    ? (isWhiteTheme ? 'bg-emerald-500/15 border border-emerald-500/40 animate-pulse' : 'bg-[#00ffcc]/15 border border-[#00ffcc]/40 animate-pulse')
                    : (isWhiteTheme ? 'bg-rose-500/20 border border-rose-500/50 animate-pulse' : 'bg-[#ff3366]/20 border border-[#ff3366]/50 animate-pulse')
                }`}
              />

              <div
                className={`rounded-full flex items-center justify-center border font-bold transition-all ${
                  isNodeSafeHighlight
                    ? 'w-5 h-5 bg-emerald-500 border-2 border-white text-white ring-2 ring-emerald-400 shadow-[0_0_12px_#10b981] scale-110 text-[9px]'
                    : node.is_shielded
                    ? (isWhiteTheme
                        ? 'w-4 h-4 bg-emerald-100 border-emerald-600 text-emerald-800 shadow-sm text-[9px]'
                        : 'w-4 h-4 bg-[#031e18] border-[#00ffcc] text-[#00ffcc] shadow-[0_0_8px_#00ffcc] text-[9px]')
                    : (isWhiteTheme
                        ? 'w-4 h-4 bg-rose-100 border-rose-600 text-rose-800 shadow-sm text-[9px]'
                        : 'w-4 h-4 bg-[#29050e] border-[#ff3366] text-[#ff3366] shadow-[0_0_8px_#ff3366] text-[9px]')
                } ${isSelected ? 'ring-2 ring-slate-900 dark:ring-white' : ''}`}
              >
                {node.is_shielded ? '✓' : '!'}
              </div>

              {/* Node Label Tag */}
              <div className={`absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] px-1.5 py-0.5 rounded font-mono pointer-events-none border shadow-sm ${
                isNodeSafeHighlight
                  ? (isWhiteTheme ? 'bg-emerald-600 text-white border-emerald-700 font-bold' : 'bg-[#00ffcc] text-slate-950 border-emerald-300 font-bold')
                  : (isWhiteTheme ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#060d19]/90 border-[#1b2b42] text-[#bad0ec]')
              }`}>
                {node.name.split(' ')[0]} {isNodeSafeHighlight ? '★' : ''}
              </div>
            </div>
          );
        })}

        {/* Custom User Location Pins from IndexedDB */}
        {customPins.map(pin => {
          const pos = getPosition(pin.lat, pin.lng);
          const isSelected = selectedPin?.id === pin.id;
          const isSafeZone = pin.classification === 'Safe Zone';
          const isNearbySafeHighlight = isWithin500mOfInterference && isSafeZone;
          const distanceToUser = calculateDistanceMeters(userGps.lat, userGps.lng, pin.lat, pin.lng);

          return (
            <div
              key={pin.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(null);
                setSelectedPin(pin);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 group ${
                isNearbySafeHighlight ? 'z-30 scale-110' : 'z-20'
              }`}
              style={{ left: pos.left, top: pos.top }}
            >
              {/* Classification Aura Pulse & Highlighting Beacon */}
              <div
                className={`rounded-full -translate-x-1.5 -translate-y-1.5 absolute pointer-events-none ${
                  isNearbySafeHighlight
                    ? 'w-10 h-10 -translate-x-2.5 -translate-y-2.5 bg-emerald-400/40 border-2 border-emerald-400 animate-ping shadow-[0_0_25px_#10b981]'
                    : isSafeZone
                    ? 'w-7 h-7 bg-emerald-500/20 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse'
                    : 'w-7 h-7 bg-amber-500/25 border border-rose-500 animate-ping shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                }`}
              />

              {isNearbySafeHighlight && (
                <div className="w-14 h-14 rounded-full -translate-x-4.5 -translate-y-4.5 absolute pointer-events-none border-2 border-emerald-400/70 animate-pulse bg-emerald-500/10" />
              )}

              {/* Pin Core Badge */}
              <div
                className={`rounded-full flex items-center justify-center border font-black shadow-md transition-all ${
                  isNearbySafeHighlight
                    ? 'w-6 h-6 bg-emerald-500 border-2 border-white text-white shadow-[0_0_18px_#10b981] ring-4 ring-emerald-400/70 animate-pulse'
                    : isSafeZone
                    ? 'w-5 h-5 bg-emerald-600 border-white text-white shadow-[0_0_8px_#10b981]'
                    : 'w-5 h-5 bg-rose-600 border-amber-300 text-white shadow-[0_0_8px_#f43f5e]'
                } ${isSelected ? 'ring-2 ring-white scale-110' : ''}`}
              >
                {isSafeZone ? (
                  <Shield className={`${isNearbySafeHighlight ? 'w-3.5 h-3.5' : 'w-3 h-3'} fill-current`} />
                ) : (
                  <Radio className="w-3 h-3" />
                )}
              </div>

              {/* Pin Name Tooltip Tag */}
              <div className={`absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] px-2 py-0.5 rounded font-mono border shadow-md flex items-center gap-1.5 transition-all ${
                isNearbySafeHighlight
                  ? (isWhiteTheme
                      ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400 font-bold scale-110 shadow-lg'
                      : 'bg-[#00ffcc] text-slate-950 border-emerald-300 ring-2 ring-emerald-400 font-bold scale-110 shadow-[0_0_16px_#00ffcc]')
                  : isSafeZone
                  ? (isWhiteTheme ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-[#061e16] border-emerald-500 text-emerald-300')
                  : (isWhiteTheme ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-[#26080e] border-rose-500 text-rose-300')
              }`}>
                {isNearbySafeHighlight && <Sparkles className="w-2.5 h-2.5 animate-spin" />}
                <span>{pin.name}</span>
                <span className={`text-[8px] ${isNearbySafeHighlight ? 'font-black' : 'opacity-75'}`}>
                  {isNearbySafeHighlight ? `[★ SAFE HAVEN · ${distanceToUser}m]` : (isSafeZone ? '(SAFE)' : '(EMF)')}
                </span>
              </div>
            </div>
          );
        })}

        {/* Bottom Legend and Long-Press Tip */}
        <div className={`absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between text-[9px] font-mono pointer-events-none p-1.5 rounded border shadow-sm gap-2 ${
          isWhiteTheme
            ? 'bg-white/95 text-slate-600 border-slate-200'
            : 'bg-[#02050c]/85 text-[#5b7396] border-[#101b2c]'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-600" /> SAFE ZONE
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-600" /> HIGH INTERFERENCE
            </span>
            <span className={`flex items-center gap-1 font-bold ${
              isWithin500mOfInterference ? 'text-amber-500 animate-pulse' : 'text-slate-500'
            }`}>
              PROXIMITY: {isWithin500mOfInterference ? `⚠️ THREAT (<500m) · SAFE PINS HIGHLIGHTED` : `NOMINAL (>500m)`}
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[9px] text-sky-600 dark:text-[#00ffcc] font-bold">
            <span>LONG-PRESS TO SAVE PIN</span>
          </div>
        </div>
      </div>

      {/* Save Custom Location Pin Modal Dialog */}
      {newPinCoord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
          <div className={`w-full max-w-sm rounded-lg p-4 border shadow-2xl transition-all ${
            isWhiteTheme ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#08101e] border-[#1a2c46] text-[#c0d4ec]'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600 dark:text-[#00ffcc]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  SAVE CUSTOM PIN TO INDEXEDDB
                </h3>
              </div>
              <button
                onClick={() => setNewPinCoord(null)}
                className="p-1 hover:text-rose-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              {/* Coordinates Readout */}
              <div className={`p-2 rounded border text-[11px] ${
                isWhiteTheme ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#040810] border-[#16253c] text-sky-400'
              }`}>
                <div className="text-[9px] text-slate-500 font-bold mb-0.5">SELECTED VECTOR COORDINATES:</div>
                <div className="font-mono font-bold">
                  LAT: {newPinCoord.lat.toFixed(5)}° N · LON: {newPinCoord.lon.toFixed(5)}° W
                </div>
              </div>

              {/* Pin Name Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Location Pin Label
                </label>
                <input
                  type="text"
                  required
                  value={newPinName}
                  onChange={(e) => setNewPinName(e.target.value)}
                  placeholder="e.g. Ridge Perimeter Safe Haven"
                  className={`w-full px-2.5 py-1.5 text-xs rounded border focus:outline-none ${
                    isWhiteTheme
                      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500'
                      : 'bg-[#040810] border-[#1a2c46] text-white focus:border-[#00ffcc]'
                  }`}
                />
              </div>

              {/* Category Selector ('Safe Zone' vs 'High Interference') */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Vector Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPinCategory('Safe Zone')}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      newPinCategory === 'Safe Zone'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e1c] border-slate-200 dark:border-[#16253c] text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[11px]">Safe Zone</span>
                    </div>
                    <div className="text-[9px] opacity-75">Resonant calm area</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPinCategory('High Interference')}
                    className={`p-2 rounded border text-left cursor-pointer transition-all ${
                      newPinCategory === 'High Interference'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-[#070e1c] border-slate-200 dark:border-[#16253c] text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Radio className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[11px]">High Interference</span>
                    </div>
                    <div className="text-[9px] opacity-75">EMF / Scalar distortion</div>
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Tactical Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newPinNotes}
                  onChange={(e) => setNewPinNotes(e.target.value)}
                  placeholder="Field observations or harmonic interference notes..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded border focus:outline-none resize-none ${
                    isWhiteTheme
                      ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-500'
                      : 'bg-[#040810] border-[#1a2c46] text-white focus:border-[#00ffcc]'
                  }`}
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#152338]">
                <button
                  type="button"
                  onClick={() => setNewPinCoord(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSavingPin}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingPin ? 'PERSISTING...' : 'SAVE PIN TO INDEXEDDB'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Custom Pin Inspector Drawer */}
      {selectedPin && (
        <div className={`mt-2.5 p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm text-slate-800'
            : 'bg-[#08101f] border-[#1d2d47] text-[#c0d4ec]'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                selectedPin.classification === 'Safe Zone'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {selectedPin.classification.toUpperCase()}
              </span>
              <span className={`text-xs font-bold ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>
                {selectedPin.name}
              </span>
            </div>
            <div className={`text-[10px] font-mono flex flex-wrap gap-x-4 ${
              isWhiteTheme ? 'text-slate-500' : 'text-[#7a95b8]'
            }`}>
              <span>LAT: {selectedPin.lat.toFixed(5)}</span>
              <span>LON: {selectedPin.lng.toFixed(5)}</span>
              <span>STORED: INDEXEDDB</span>
            </div>
            {selectedPin.notes && (
              <div className={`text-[10px] mt-1 ${isWhiteTheme ? 'text-slate-600' : 'text-[#8aa5c7]'}`}>
                NOTE: {selectedPin.notes}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDeletePin(selectedPin.id)}
              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded border border-rose-300 dark:border-rose-800 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE PIN</span>
            </button>
            <button
              onClick={() => setSelectedPin(null)}
              className={`text-xs px-2 py-1 cursor-pointer ${
                isWhiteTheme ? 'text-slate-500 hover:text-slate-800' : 'text-[#647c9f] hover:text-white'
              }`}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Selected System Node Inspector Drawer */}
      {selectedNode && (
        <div className={`mt-2.5 p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isWhiteTheme
            ? 'bg-slate-50 border-slate-200 shadow-sm text-slate-800'
            : 'bg-[#08101f] border-[#1d2d47] text-[#c0d4ec]'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                isWhiteTheme
                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-[#132034] text-[#00ffcc]'
              }`}>
                {selectedNode.node_id}
              </span>
              <span className={`text-xs font-bold ${isWhiteTheme ? 'text-slate-900' : 'text-white'}`}>
                {selectedNode.name}
              </span>
            </div>
            <div className={`text-[10px] font-mono flex flex-wrap gap-x-4 ${
              isWhiteTheme ? 'text-slate-500' : 'text-[#7a95b8]'
            }`}>
              <span>LAT: {selectedNode.latitude.toFixed(4)}</span>
              <span>LON: {selectedNode.longitude.toFixed(4)}</span>
              <span>RADIUS: {selectedNode.base_radius_meters}m</span>
              <span>TYPE: {selectedNode.classification}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedNode.is_shielded ? (
              <button
                onClick={() => handleClearNodeShield(selectedNode)}
                disabled={isShielding}
                className={`px-3 py-1.5 font-bold text-xs rounded cursor-pointer flex items-center gap-1.5 transition-all ${
                  isWhiteTheme
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                    : 'bg-[#00ffcc] hover:bg-[#33ffdd] text-[#060a13] shadow-[0_0_12px_rgba(0,255,204,0.4)]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                {isShielding ? 'LOCKING SHIELD...' : 'DEPLOY 48H SHIELD'}
              </button>
            ) : (
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded border ${
                isWhiteTheme
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30'
              }`}>
                <Shield className="w-3.5 h-3.5" />
                SHIELD ACTIVE // RESONANCE LOCKED
              </div>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className={`text-xs px-2 py-1 cursor-pointer ${
                isWhiteTheme ? 'text-slate-500 hover:text-slate-800' : 'text-[#647c9f] hover:text-white'
              }`}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
