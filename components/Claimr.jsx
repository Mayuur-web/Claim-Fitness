'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Crosshair,
  Trophy,
  Zap,
  Bug,
  AlertTriangle,
  ChevronDown,
  Volume2,
  VolumeX,
  History as HistoryIcon,
  Mic,
  MicOff,
} from 'lucide-react';
import {
  latLngToCellId,
  getNeighborCellIds,
  haversineDistance,
  formatPace,
} from '@/lib/grid';
import {
  playClaimSound,
  playStealSound,
  playLostSound,
  playStartSound,
  playFinishSound,
  playCollectSound,
  isAudioEnabled,
  setAudioEnabled,
} from '@/lib/audio';
import {
  spawnCollectibles,
  checkCollectiblesPickup,
} from '@/lib/collectibles';
import {
  loadSavedCells,
  saveCells,
  saveCellsDebounced,
  clearSavedCells,
  loadRunHistory,
  saveRunToHistory,
  deleteRunFromHistory,
  calculateCareerStats,
} from '@/lib/storage';
import {
  isVoiceEnabled,
  setVoiceEnabled,
  announceMilestone,
  announceTurfLost,
  announcePowerup,
} from '@/lib/voiceCoach';
import { useWakeLock } from '@/lib/useWakeLock';
import Sheet from './Sheet';
import Toasts from './Toasts';
import Leaderboard from './Leaderboard';
import RunSummary from './RunSummary';
import HistoryModal from './HistoryModal';

// Dynamically import map layers to avoid SSR issues
const MapLayers = dynamic(() => import('./MapLayers'), { ssr: false });

const DEFAULT_CENTER = [37.7749, -122.4194]; // San Francisco Civic Center default

const RIVAL_PROFILES = [
  { id: 'nova', name: 'Nova', color: '#FF4D8D' },
  { id: 'cipher', name: 'Cipher', color: '#FF6584' },
  { id: 'valkyrie', name: 'Valkyrie', color: '#E040FB' },
  { id: 'phantom', name: 'Phantom', color: '#FF5252' },
  { id: 'apex', name: 'Apex', color: '#FF7043' },
  { id: 'echo', name: 'Echo', color: '#F06292' },
  { id: 'blitz', name: 'Blitz', color: '#D81B60' },
  { id: 'mirage', name: 'Mirage', color: '#EC407A' },
];

export default function Claimr() {
  // --- Game & Run States ---
  const [runState, setRunState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'finished'
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [runCellCount, setRunCellCount] = useState(0);
  const [stolenCount, setStolenCount] = useState(0);

  // --- Location & Follow State ---
  const [playerPos, setPlayerPos] = useState(DEFAULT_CENTER);
  const [accuracy, setAccuracy] = useState(10);
  const [isFollowUser, setIsFollowUser] = useState(true);
  const [gpsError, setGpsError] = useState(null);

  // --- Map of All Owned Cells (ref-backed with React state mirror) ---
  const cellsMapRef = useRef(new Map());
  const [cellsArray, setCellsArray] = useState([]);

  // --- Unique cells entered this run ---
  const claimedCellsThisRunRef = useRef(new Set());
  const runPathRef = useRef([]);
  const [runPath, setRunPath] = useState([]);

  // --- Position tracking refs ---
  const lastPositionRef = useRef(null);
  const justResumedRef = useRef(false);
  const hasCenteredOnRealGpsRef = useRef(false);

  // --- Simulation state ---
  const [isSimulating, setIsSimulating] = useState(false);
  const simHeadingRef = useRef(Math.random() * Math.PI * 2);

  // --- UI Overlays & Sheets ---
  const [toasts, setToasts] = useState([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [runHistory, setRunHistory] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [runSummaryData, setRunSummaryData] = useState(null);

  // Audio voice milestone tracking
  const lastAnnouncedDistanceKmRef = useRef(0);

  // --- Toast helper with 2.5s auto-dismiss ---
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  // --- Power-ups & Collectibles State ---
  const [collectibles, setCollectibles] = useState([]);
  const [activeBuff, setActiveBuff] = useState(null); // { type, name, badge, color, expiresAt }
  const [buffRemainingSeconds, setBuffRemainingSeconds] = useState(0);

  // Buff countdown ticker
  useEffect(() => {
    if (!activeBuff) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((activeBuff.expiresAt - Date.now()) / 1000));
      setBuffRemainingSeconds(remaining);
      if (remaining <= 0) {
        setActiveBuff(null);
        addToast({ type: 'claimed', message: `${activeBuff.badge} ${activeBuff.name} Expired` });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBuff, addToast]);

  // Keep screen awake while a run is active
  useWakeLock(runState === 'running');

  // Sync ref-backed Map to state for rendering & persist smoothly with debounce
  const syncCellsState = useCallback(() => {
    setCellsArray(Array.from(cellsMapRef.current.values()));
    saveCellsDebounced(cellsMapRef.current);
  }, []);

  // Flush unsaved cells to storage before page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCells(cellsMapRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Seed 8 rival clusters around a given coordinate
  const seedRivals = useCallback(
    (centerLat, centerLng) => {
      const now = Date.now();
      const rivalsData = [...RIVAL_PROFILES];

      // Place 8 rival initial clusters in a circle around the player
      rivalsData.forEach((rival, i) => {
        const angle = (i / rivalsData.length) * Math.PI * 2 + 0.3;
        const distMeters = 140 + (i % 3) * 45; // ~140m - 230m away
        const dLat = (distMeters / 111195) * Math.cos(angle);
        const dLng = (distMeters / (111195 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

        const clusterCenterId = latLngToCellId(centerLat + dLat, centerLng + dLng);
        const neighbors = getNeighborCellIds(clusterCenterId, false);
        const clusterCells = [clusterCenterId, ...neighbors.slice(0, 3)];

        clusterCells.forEach((cid) => {
          if (!cellsMapRef.current.has(cid)) {
            cellsMapRef.current.set(cid, {
              id: cid,
              owner: 'rival',
              rivalId: rival.id,
              rivalName: rival.name,
              color: rival.color,
              claimedAt: now - 30000,
              shieldedUntil: 0,
            });
          }
        });
      });

      // Spawn 3 collectible drops in surrounding neighborhood
      setCollectibles(spawnCollectibles(centerLat, centerLng, 3));

      syncCellsState();
    },
    [syncCellsState]
  );

  // Initialize rivals or restore persisted cells and load history
  useEffect(() => {
    setSoundOn(isAudioEnabled());
    setVoiceOn(isVoiceEnabled());
    const history = loadRunHistory();
    setRunHistory(history);

    const saved = loadSavedCells();
    if (saved && saved.size > 0) {
      cellsMapRef.current = saved;
      setCellsArray(Array.from(saved.values()));
    } else {
      seedRivals(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
    }
  }, [seedRivals]);

  // --- SINGLE GPS & SIMULATION HANDLER ---
  const handlePositionUpdate = useCallback(
    ({ latitude, longitude, accuracy: acc, timestamp = Date.now() }) => {
      const newPos = [latitude, longitude];
      setPlayerPos(newPos);
      setAccuracy(acc || 10);

      // Low GPS signal check: ignore fixes over 60m accuracy while running
      if (acc > 60) {
        return;
      }

      // If running, process distance, collectibles, and territory claiming
      if (runState === 'running') {
        // Collectible power-up pickup detection
        setCollectibles((currentDrops) => {
          const { collected, remaining } = checkCollectiblesPickup(latitude, longitude, currentDrops, 35);
          if (collected) {
            playCollectSound();
            if (collected.type === 'battery') {
              // Instant burst: claim 4 adjacent cells immediately
              const currentCid = latLngToCellId(latitude, longitude);
              const neighbors = getNeighborCellIds(currentCid, false);
              const nowTime = Date.now();
              neighbors.forEach((nid) => {
                cellsMapRef.current.set(nid, {
                  id: nid,
                  owner: 'player',
                  claimedAt: nowTime,
                  shieldedUntil: nowTime + 60000,
                });
                claimedCellsThisRunRef.current.add(nid);
              });
              setRunCellCount(claimedCellsThisRunRef.current.size);
              syncCellsState();
              addToast({ type: 'claimed', message: '🔋 Nano Battery! +4 cells burst claimed' });
            } else {
              setActiveBuff({
                ...collected,
                expiresAt: Date.now() + collected.duration * 1000,
              });
              setBuffRemainingSeconds(collected.duration);
              announcePowerup(collected.name);
              addToast({ type: 'claimed', message: `${collected.badge} ${collected.name} Activated!` });
            }
            return remaining;
          }
          return currentDrops;
        });

        // Distance calculation with Haversine formula
        if (justResumedRef.current) {
          lastPositionRef.current = newPos;
          justResumedRef.current = false;
        } else if (lastPositionRef.current) {
          const [prevLat, prevLng] = lastPositionRef.current;
          const distIncrement = haversineDistance(prevLat, prevLng, latitude, longitude);

          // Discard jumps > 250m and ignore jitter < 2m
          if (distIncrement >= 2 && distIncrement <= 250) {
            setDistance((d) => {
              const nextD = d + distIncrement;
              const nextKm = Math.floor(nextD / 1000);
              if (nextKm > lastAnnouncedDistanceKmRef.current && nextKm >= 1) {
                lastAnnouncedDistanceKmRef.current = nextKm;
                announceMilestone(nextD, formatPace(nextD, duration), claimedCellsThisRunRef.current.size);
              }
              return nextD;
            });
            lastPositionRef.current = newPos;

            // Append to path
            runPathRef.current.push(newPos);
            setRunPath([...runPathRef.current]);
          }
        } else {
          lastPositionRef.current = newPos;
          runPathRef.current.push(newPos);
          setRunPath([...runPathRef.current]);
        }

        // Territory claiming logic
        const currentCellId = latLngToCellId(latitude, longitude);
        const existingCell = cellsMapRef.current.get(currentCellId);
        const now = Date.now();
        const shieldDuration = activeBuff?.type === 'aegis' ? 300000 : 60000;

        if (!existingCell) {
          // Unowned cell -> Claim it immediately
          cellsMapRef.current.set(currentCellId, {
            id: currentCellId,
            owner: 'player',
            claimedAt: now,
            shieldedUntil: now + shieldDuration,
          });

          // If Hyper-Pulse Overdrive is active, also claim adjacent neighbors!
          if (activeBuff?.type === 'overdrive') {
            const neighbors = getNeighborCellIds(currentCellId, false);
            neighbors.forEach((nid) => {
              const ex = cellsMapRef.current.get(nid);
              if (!ex || ex.owner !== 'player') {
                cellsMapRef.current.set(nid, {
                  id: nid,
                  owner: 'player',
                  claimedAt: now,
                  shieldedUntil: now + 60000,
                });
                claimedCellsThisRunRef.current.add(nid);
              }
            });
          }

          syncCellsState();

          if (!claimedCellsThisRunRef.current.has(currentCellId)) {
            claimedCellsThisRunRef.current.add(currentCellId);
            setRunCellCount(claimedCellsThisRunRef.current.size);
            playClaimSound();
            addToast({ type: 'claimed', message: 'Cell claimed' });
          }
        } else if (existingCell.owner === 'rival') {
          // Rival cell -> Check shield status
          const isShielded = existingCell.shieldedUntil && existingCell.shieldedUntil > now;

          if (!isShielded) {
            // Steal cell from rival!
            const rivalName = existingCell.rivalName || 'Rival';
            cellsMapRef.current.set(currentCellId, {
              id: currentCellId,
              owner: 'player',
              claimedAt: now,
              shieldedUntil: now + shieldDuration,
            });

            if (activeBuff?.type === 'overdrive') {
              const neighbors = getNeighborCellIds(currentCellId, false);
              neighbors.forEach((nid) => {
                const ex = cellsMapRef.current.get(nid);
                if (!ex || (ex.owner === 'rival' && (!ex.shieldedUntil || ex.shieldedUntil <= now))) {
                  cellsMapRef.current.set(nid, {
                    id: nid,
                    owner: 'player',
                    claimedAt: now,
                    shieldedUntil: now + 60000,
                  });
                  claimedCellsThisRunRef.current.add(nid);
                }
              });
            }

            syncCellsState();

            if (!claimedCellsThisRunRef.current.has(currentCellId)) {
              claimedCellsThisRunRef.current.add(currentCellId);
              setRunCellCount(claimedCellsThisRunRef.current.size);
              setStolenCount((prev) => prev + 1);
              playStealSound();
              addToast({ type: 'stolen', message: `Stolen from ${rivalName}` });
            }
          }
        } else if (existingCell.owner === 'player') {
          // Already player's cell, register unique visit this run if new
          if (!claimedCellsThisRunRef.current.has(currentCellId)) {
            claimedCellsThisRunRef.current.add(currentCellId);
            setRunCellCount(claimedCellsThisRunRef.current.size);
          }
        }
      }
    },
    [runState, syncCellsState, addToast, activeBuff, duration]
  );

  // --- Real Geolocation Watcher (Stage 2) ---
  useEffect(() => {
    if (isSimulating) return; // Simulation mode active: disable real watcher

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        if (!hasCenteredOnRealGpsRef.current) {
          hasCenteredOnRealGpsRef.current = true;
          // Re-seed rival clusters around the user's real location
          seedRivals(pos.coords.latitude, pos.coords.longitude);
        }
        handlePositionUpdate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        if (err.code === 1) {
          setGpsError('Location permission denied. Please allow GPS to claim territory.');
        } else {
          setGpsError('GPS signal temporarily unavailable.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating, handlePositionUpdate]);

  // --- Simulation Movement Mode (Stage 6) ---
  // Wandering walk: ~12m every 600ms with a randomly drifting heading
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Randomly drift heading by up to +/- 28 degrees
      const drift = (Math.random() - 0.5) * 0.5;
      simHeadingRef.current += drift;

      const stepMeters = 12; // ~12 meters per tick
      const latOffset = (stepMeters / 111195) * Math.cos(simHeadingRef.current);
      const lngOffset =
        (stepMeters / (111195 * Math.cos((playerPos[0] * Math.PI) / 180))) *
        Math.sin(simHeadingRef.current);

      const nextLat = playerPos[0] + latOffset;
      const nextLng = playerPos[1] + lngOffset;

      handlePositionUpdate({
        latitude: nextLat,
        longitude: nextLng,
        accuracy: 8,
        timestamp: Date.now(),
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isSimulating, playerPos, handlePositionUpdate]);

  // --- Rival Local AI Simulation (Stage 5) ---
  // Each rival expands by one neighboring cell every 4-8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const rivals = RIVAL_PROFILES;
      const randomRival = rivals[Math.floor(Math.random() * rivals.length)];

      // Find all cells currently held by this rival
      const rivalCells = [];
      cellsMapRef.current.forEach((cell, id) => {
        if (cell.owner === 'rival' && cell.rivalId === randomRival.id) {
          rivalCells.push(id);
        }
      });

      if (rivalCells.length === 0) return;

      // Pick a random cell held by this rival and look at neighbors
      const originCellId = rivalCells[Math.floor(Math.random() * rivalCells.length)];
      const neighbors = getNeighborCellIds(originCellId, false);
      const targetCellId = neighbors[Math.floor(Math.random() * neighbors.length)];

      const existingCell = cellsMapRef.current.get(targetCellId);

      if (!existingCell) {
        // Unowned cell -> Rival claims it
        cellsMapRef.current.set(targetCellId, {
          id: targetCellId,
          owner: 'rival',
          rivalId: randomRival.id,
          rivalName: randomRival.name,
          color: randomRival.color,
          claimedAt: now,
          shieldedUntil: now + 60000,
        });
        syncCellsState();
      } else if (existingCell.owner === 'player') {
        // Player's cell -> Rival tries to take it
        const isShielded = existingCell.shieldedUntil && existingCell.shieldedUntil > now;
        if (!isShielded) {
          cellsMapRef.current.set(targetCellId, {
            id: targetCellId,
            owner: 'rival',
            rivalId: randomRival.id,
            rivalName: randomRival.name,
            color: randomRival.color,
            claimedAt: now,
            shieldedUntil: now + 60000,
          });
          syncCellsState();
          playLostSound();
          announceTurfLost(randomRival.name);
          addToast({ type: 'lost', message: `${randomRival.name} took your cell` });
        }
      }
    }, Math.floor(Math.random() * 4000) + 4000); // 4-8 seconds

    return () => clearInterval(interval);
  }, [syncCellsState, addToast]);

  // --- Run Timer ---
  useEffect(() => {
    let timer;
    if (runState === 'running') {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [runState]);

  // --- Run Controls ---
  const handleStartRun = () => {
    setRunState('running');
    setDuration(0);
    setDistance(0);
    setRunCellCount(0);
    setStolenCount(0);
    lastAnnouncedDistanceKmRef.current = 0;
    claimedCellsThisRunRef.current = new Set();
    runPathRef.current = [playerPos];
    setRunPath([playerPos]);
    lastPositionRef.current = playerPos;
    justResumedRef.current = false;
    setIsFollowUser(true);

    playStartSound();

    // Claim starting cell
    const startCellId = latLngToCellId(playerPos[0], playerPos[1]);
    const now = Date.now();
    const existing = cellsMapRef.current.get(startCellId);
    if (!existing || existing.owner !== 'player') {
      cellsMapRef.current.set(startCellId, {
        id: startCellId,
        owner: 'player',
        claimedAt: now,
        shieldedUntil: now + 60000,
      });
      syncCellsState();
    }
    claimedCellsThisRunRef.current.add(startCellId);
    setRunCellCount(1);
    addToast({ type: 'claimed', message: 'Cell claimed' });
  };

  const handlePauseRun = () => {
    setRunState('paused');
  };

  const handleResumeRun = () => {
    justResumedRef.current = true; // Protects against distance jump on resume
    setRunState('running');
  };

  const handleFinishRun = () => {
    playFinishSound();
    setRunState('finished');
    setRunSummaryData({
      duration,
      distance,
      cellsClaimed: runCellCount,
      cellsStolen: stolenCount,
      claimedCellIds: Array.from(claimedCellsThisRunRef.current),
      path: [...runPathRef.current],
    });
  };

  const handleSaveRun = () => {
    if (runSummaryData) {
      const updatedHistory = saveRunToHistory(runSummaryData);
      setRunHistory(updatedHistory);
      saveCells(cellsMapRef.current);
    }
    addToast({ type: 'claimed', message: 'Activity recorded to history' });
    setRunSummaryData(null);
    setRunState('idle');
  };

  const handleDeleteRun = useCallback((runId) => {
    const updated = deleteRunFromHistory(runId);
    setRunHistory(updated);
  }, []);

  const handleToggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    setAudioEnabled(nextVal);
    if (nextVal) {
      playClaimSound();
    }
  };

  const handleToggleVoice = () => {
    const nextVal = !voiceOn;
    setVoiceOn(nextVal);
    setVoiceEnabled(nextVal);
    addToast({
      type: 'claimed',
      message: nextVal ? 'Voice coach enabled' : 'Voice coach muted',
    });
  };

  const handleNewRun = () => {
    setRunSummaryData(null);
    setRunState('idle');
    setDuration(0);
    setDistance(0);
    setRunCellCount(0);
    setStolenCount(0);
    runPathRef.current = [];
    setRunPath([]);
    claimedCellsThisRunRef.current = new Set();
  };

  // Re-enable camera follow mode
  const handleCenterOnMe = () => {
    setIsFollowUser(true);
  };

  const handleUserPan = () => {
    setIsFollowUser(false);
  };

  // Calculate live cell counts for leaderboard
  const playerTotalCells = useMemo(() => {
    let count = 0;
    cellsArray.forEach((c) => {
      if (c.owner === 'player') count++;
    });
    return count;
  }, [cellsArray]);

  const rivalsLiveScores = useMemo(() => {
    return RIVAL_PROFILES.map((rival) => {
      let count = 0;
      cellsArray.forEach((c) => {
        if (c.owner === 'rival' && c.rivalId === rival.id) count++;
      });
      return {
        ...rival,
        cells: count,
      };
    });
  }, [cellsArray]);

  // Career stats calculation
  const careerStats = useMemo(() => {
    return calculateCareerStats(runHistory, cellsMapRef.current);
  }, [runHistory, cellsArray]);

  // Coordinate display format
  const coordDisplay = useMemo(() => {
    const [lat, lng] = playerPos;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
  }, [playerPos]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-bg font-sans select-none">
      {/* MAP LAYER (At least 65% height, here full 100% with overlays) */}
      <div className="absolute inset-0 z-0">
        <MapLayers
          initialCenter={DEFAULT_CENTER}
          playerPos={playerPos}
          path={runPath}
          cells={cellsArray}
          collectibles={collectibles}
          isFollowUser={isFollowUser}
          onUserPan={handleUserPan}
        />
      </div>

      {/* TOP FLOATING BAR */}
      <header className="fixed top-0 left-0 right-0 z-30 pt-[max(12px,env(safe-area-inset-top))] px-4 flex items-center justify-between pointer-events-none">
        {/* Left: Claimr Wordmark & Status Chip */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Brand pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel bg-[rgba(14,20,28,0.78)] shadow-lg border border-[rgba(255,255,255,0.08)]">
            <div className="w-5 h-5 rounded-full bg-mine/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-mine fill-current" />
            </div>
            <span className="text-sm font-bold tracking-tight text-text">Claimr</span>
          </div>

          {/* Status chip & Active Buff Pill */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full glass-panel bg-[rgba(14,20,28,0.72)] border border-[rgba(255,255,255,0.06)] text-xs">
              {accuracy > 60 ? (
                <div className="flex items-center gap-1.5 text-warn font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Low GPS signal</span>
                </div>
              ) : runState === 'running' ? (
                <div className="flex items-center gap-1.5 text-text font-medium">
                  <span className="w-2 h-2 rounded-full bg-path animate-ping" />
                  <span className="text-path">Live</span>
                </div>
              ) : runState === 'paused' ? (
                <div className="flex items-center gap-1.5 text-warn font-medium">
                  <span className="w-2 h-2 rounded-full bg-warn" />
                  <span>Paused</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted font-medium">
                  <span className="w-2 h-2 rounded-full bg-mine" />
                  <span>Ready</span>
                </div>
              )}
            </div>

            {/* Active Buff Timer Pill */}
            {activeBuff && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-panel border text-xs font-bold animate-pulse shadow-md"
                style={{
                  borderColor: `${activeBuff.color}88`,
                  background: 'rgba(14,20,28,0.85)',
                  color: activeBuff.color,
                }}
              >
                <span>{activeBuff.badge}</span>
                <span className="font-mono text-[11px]">{buffRemainingSeconds}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Round Glass Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-all shadow-md ${
              soundOn ? 'text-mine border-mine/30' : 'text-muted/60'
            }`}
            title={soundOn ? 'Mute SFX' : 'Enable SFX'}
            aria-label="Toggle Sound Effects"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Activity History */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-muted hover:text-path active:scale-95 transition-all shadow-md"
            title="Activity History"
            aria-label="View Activity History"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>

          {/* Center On Me */}
          <button
            onClick={handleCenterOnMe}
            className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-all shadow-md ${
              isFollowUser
                ? 'text-path border-path/40'
                : 'text-muted hover:text-text'
            }`}
            title="Center on me"
            aria-label="Center camera on player"
          >
            <Crosshair className="w-5 h-5" />
          </button>

          {/* Leaderboard Trophy */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-muted hover:text-mine active:scale-95 transition-all shadow-md"
            title="Leaderboard"
            aria-label="View Leaderboard"
          >
            <Trophy className="w-5 h-5" />
          </button>

          {/* Debug Menu Toggle */}
          <button
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center text-muted hover:text-text active:scale-95 transition-all shadow-md ${
              isSimulating ? 'border-path text-path' : ''
            }`}
            title="Debug & Simulator"
            aria-label="Debug menu"
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* GPS ERROR WARNING BANNER */}
      {gpsError && !isSimulating && (
        <div className="fixed top-20 left-4 right-4 z-40 p-3 rounded-2xl glass-panel bg-red-950/70 border border-red-500/30 text-xs text-red-200 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            onClick={() => setIsSimulating(true)}
            className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] shrink-0 ml-2"
          >
            Enable Sim
          </button>
        </div>
      )}

      {/* DEBUG POPOVER MENU */}
      {isDebugOpen && (
        <div className="fixed top-20 right-4 z-40 w-64 p-4 rounded-2xl glass-panel bg-[rgba(14,20,28,0.92)] border border-[rgba(255,255,255,0.12)] flex flex-col gap-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-text">Debug & Simulator</span>
            <button
              onClick={() => setIsDebugOpen(false)}
              className="text-xs text-muted hover:text-text"
            >
              Close
            </button>
          </div>

          {/* Simulation Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-text">Simulate walk</span>
              <span className="text-[10px] text-muted">~12m every 600ms</span>
            </div>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${isSimulating ? 'bg-mine' : 'bg-white/15'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-bg transition-transform ${isSimulating ? 'translate-x-6' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {/* Voice Coach Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-text">Voice coach</span>
              <span className="text-[10px] text-muted">Speech splits & alerts</span>
            </div>
            <button
              onClick={handleToggleVoice}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                voiceOn ? 'bg-path' : 'bg-white/15'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-bg transition-transform ${
                  voiceOn ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reset Rivals */}
          <button
            onClick={() => seedRivals(playerPos[0], playerPos[1])}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-muted hover:text-text font-medium transition-colors"
          >
            Re-cluster rivals nearby
          </button>

          {/* Reset Saved Turf & History */}
          <button
            onClick={() => {
              clearSavedCells();
              cellsMapRef.current.clear();
              seedRivals(playerPos[0], playerPos[1]);
              setRunHistory([]);
              localStorage.removeItem('claimr_history_v1');
              addToast({ type: 'claimed', message: 'Storage cleared' });
            }}
            className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 font-medium transition-colors"
          >
            Reset saved turf & history
          </button>
        </div>
      )}

      {/* OVERLAY: Expandable Map Legend */}
      <div className="fixed top-28 left-4 z-20 pointer-events-auto">
        <div
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="rounded-full glass-panel bg-[rgba(14,20,28,0.75)] border border-[rgba(255,255,255,0.08)] px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-all shadow-md"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-mine" />
            <span className="w-2.5 h-2.5 rounded-full bg-rival" />
            <span className="w-2.5 h-2.5 rounded-full border border-warn border-dashed" />
          </div>
          <span className="text-[11px] text-muted font-medium">Legend</span>
          <ChevronDown
            className={`w-3 h-3 text-muted transition-transform ${isLegendOpen ? 'rotate-180' : ''
              }`}
          />
        </div>

        {isLegendOpen && (
          <div className="mt-2 p-3 rounded-2xl glass-panel bg-[rgba(14,20,28,0.9)] border border-[rgba(255,255,255,0.1)] flex flex-col gap-2 shadow-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-mine/30 border border-mine" />
              <span className="text-text">Mine</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-rival/30 border border-rival" />
              <span className="text-text">Rival</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm border border-warn border-dashed" />
              <span className="text-text">Shielded (60s)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm border border-white/20" />
              <span className="text-muted">Open (~44m)</span>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY: Coordinates Readout in JetBrains Mono */}
      <div className="fixed bottom-24 left-4 z-20 pointer-events-none">
        <div className="px-2.5 py-1 rounded-lg glass-panel bg-[rgba(14,20,28,0.7)] border border-[rgba(255,255,255,0.06)] text-[11px] font-mono text-muted/80 backdrop-blur-md shadow-sm">
          <span>{coordDisplay}</span>
          <span className="ml-2 text-muted/50">±{Math.round(accuracy)}m</span>
        </div>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <Toasts toasts={toasts} />

      {/* LEADERBOARD DRAWER */}
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        playerCellCount={playerTotalCells}
        rivals={rivalsLiveScores}
      />

      {/* ACTIVITY HISTORY MODAL */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={runHistory}
        careerStats={careerStats}
        onDeleteRun={handleDeleteRun}
      />

      {/* FINISH RUN SUMMARY */}
      {runSummaryData && (
        <RunSummary
          summary={runSummaryData}
          onSaveRun={handleSaveRun}
          onNewRun={handleNewRun}
        />
      )}

      {/* BOTTOM CONTROL SHEET */}
      <Sheet
        runState={runState}
        duration={duration}
        distance={distance}
        cellCount={runCellCount}
        onStart={handleStartRun}
        onPause={handlePauseRun}
        onResume={handleResumeRun}
        onFinish={handleFinishRun}
      />
    </div>
  );
}