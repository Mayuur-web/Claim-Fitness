'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, ChevronUp, ChevronDown, Zap, Clock, Route, Gauge } from 'lucide-react';
import { formatTime, formatDistance, formatPace } from '@/lib/grid';

export default function Sheet({
  runState = 'idle', // 'idle' | 'running' | 'paused' | 'finished'
  duration = 0,
  distance = 0,
  cellCount = 0,
  onStart,
  onPause,
  onResume,
  onFinish,
}) {
  const [isExpanded, setIsExpanded] = useState(runState === 'idle');

  // Automatically collapse when transitioning to running so >= 65% map is visible
  useEffect(() => {
    if (runState === 'running') {
      setIsExpanded(false);
    } else if (runState === 'idle') {
      setIsExpanded(true);
    }
  }, [runState]);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-0 pointer-events-none"
    >
      <div className="w-full max-w-lg mx-auto rounded-[24px] glass-panel bg-[rgba(14,20,28,0.78)] border border-[rgba(255,255,255,0.08)] backdrop-blur-2xl overflow-hidden pointer-events-auto transition-shadow">
        {/* Drag handle & toggle indicator */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full pt-2.5 pb-1 flex flex-col items-center justify-center cursor-pointer select-none group"
        >
          <div className="w-10 h-1 rounded-full bg-white/20 group-hover:bg-white/35 transition-colors" />
          <div className="flex items-center gap-1 text-[11px] text-muted/60 mt-0.5">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {/* Collapsed Bar View (Shown when not expanded) */}
        {!isExpanded && (
          <div className="px-5 pb-3 pt-0.5 flex items-center justify-between">
            {/* Quick stats row */}
            <div className="flex items-center gap-5">
              <div className="flex flex-col">
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Time
                </span>
                <span className="text-sm font-bold text-text tabular-nums font-mono">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <Route className="w-3 h-3" /> Dist
                </span>
                <span className="text-sm font-bold text-text tabular-nums">
                  {formatDistance(distance)}{' '}
                  <span className="text-[10px] text-muted font-normal">km</span>
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-muted flex items-center gap-1">
                  <Zap className="w-3 h-3 text-mine" /> Cells
                </span>
                <motion.span
                  key={cellCount}
                  initial={{ scale: 1.35, color: '#B6FF3B' }}
                  animate={{ scale: 1, color: '#F2F5F8' }}
                  transition={{ duration: 0.25 }}
                  className="text-sm font-bold tabular-nums"
                >
                  {cellCount}
                </motion.span>
              </div>
            </div>

            {/* Quick action button */}
            <div className="flex items-center gap-2">
              {runState === 'running' && (
                <button
                  onClick={onPause}
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-btn bg-white/10 hover:bg-white/15 text-text flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}
              {runState === 'paused' && (
                <button
                  onClick={onResume}
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-btn bg-mine text-[#0B0F14] shadow-glowMine flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              )}
              {runState === 'idle' && (
                <button
                  onClick={onStart}
                  className="min-h-[44px] px-4 rounded-btn bg-mine text-[#0B0F14] shadow-glowMine flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-6 pb-5 pt-1 flex flex-col gap-5">
            {/* Header info */}
            <div>
              <h2 className="text-lg font-bold text-text tracking-tight">
                {runState === 'idle'
                  ? 'Claim your ground'
                  : runState === 'running'
                  ? 'Activity in progress'
                  : runState === 'paused'
                  ? 'Run paused'
                  : 'Run complete'}
              </h2>
              <p className="text-xs text-muted">
                {runState === 'idle'
                  ? 'Every cell you traverse joins your territory.'
                  : 'Traverse ~44m cells to claim or steal rival sectors.'}
              </p>
            </div>

            {/* Four primary stats cards with large tabular numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <span className="text-xs text-muted mb-0.5">Time</span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-text tabular-nums font-mono">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <span className="text-xs text-muted mb-0.5">Distance</span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-text tabular-nums">
                  {formatDistance(distance)}
                  <span className="text-[11px] text-muted font-normal ml-0.5">km</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                <span className="text-xs text-muted mb-0.5">Avg Pace</span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-path tabular-nums font-mono">
                  {formatPace(distance, duration)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center relative overflow-hidden">
                <span className="text-xs text-muted mb-0.5">Cells</span>
                <motion.span
                  key={cellCount}
                  initial={{ scale: 1.3, color: '#B6FF3B' }}
                  animate={{ scale: 1, color: '#B6FF3B' }}
                  transition={{ duration: 0.25 }}
                  className="text-lg sm:text-xl font-bold tracking-tight text-mine tabular-nums"
                >
                  {cellCount}
                </motion.span>
              </div>
            </div>

            {/* State-based main controls (min 56px touch target) */}
            <div className="flex items-center gap-3 w-full">
              {runState === 'idle' && (
                <button
                  onClick={onStart}
                  className="w-full h-14 rounded-btn bg-mine text-[#0B0F14] font-bold text-base tracking-tight flex items-center justify-center gap-2 shadow-glowMine hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start run</span>
                </button>
              )}

              {runState === 'running' && (
                <>
                  <button
                    onClick={onPause}
                    className="flex-1 h-14 rounded-btn bg-white/10 hover:bg-white/15 text-text font-semibold text-sm tracking-tight flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={onFinish}
                    className="flex-1 h-14 rounded-btn bg-rival text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-glowRival hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Finish</span>
                  </button>
                </>
              )}

              {runState === 'paused' && (
                <>
                  <button
                    onClick={onResume}
                    className="flex-1 h-14 rounded-btn bg-mine text-[#0B0F14] font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-glowMine hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={onFinish}
                    className="flex-1 h-14 rounded-btn bg-rival text-white font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-glowRival hover:brightness-105 active:scale-[0.98] transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Finish</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

