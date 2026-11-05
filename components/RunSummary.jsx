'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Swords, Flame, Check, RotateCcw } from 'lucide-react';
import { formatTime, formatDistance, formatPace } from '@/lib/grid';

export default function RunSummary({
  summary,
  onSaveRun,
  onNewRun,
}) {
  const {
    duration = 0,
    distance = 0,
    cellsClaimed = 0,
    cellsStolen = 0,
    claimedCellIds = [],
  } = summary || {};

  // Compute bounding box and relative coordinates for mini SVG preview
  const miniGrid = useMemo(() => {
    if (!claimedCellIds || claimedCellIds.length === 0) return null;

    const coords = claimedCellIds.map((id) => {
      const [r, c] = id.split(':').map((v) => parseInt(v, 10));
      return { r, c };
    });

    const rows = coords.map((pt) => pt.r);
    const cols = coords.map((pt) => pt.c);

    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);

    const dR = Math.max(1, maxR - minR + 1);
    const dC = Math.max(1, maxC - minC + 1);

    // Padding
    const cellSize = Math.min(22, Math.floor(180 / Math.max(dR, dC)));
    const width = (dC + 2) * cellSize;
    const height = (dR + 2) * cellSize;

    const cellsToRender = coords.map((pt) => ({
      x: (pt.c - minC + 1) * cellSize,
      y: (maxR - pt.r + 1) * cellSize, // Invert row for standard screen y-axis
    }));

    return {
      cells: cellsToRender,
      width: Math.max(200, width),
      height: Math.max(140, height),
      cellSize,
    };
  }, [claimedCellIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm rounded-[24px] glass-panel bg-[rgba(14,20,28,0.92)] border border-[rgba(255,255,255,0.1)] p-6 flex flex-col gap-5 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-mine/20 flex items-center justify-center shadow-[0_0_16px_rgba(182,255,59,0.35)]">
            <Trophy className="w-5 h-5 text-mine" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text tracking-tight">Run Complete</h2>
            <p className="text-xs text-muted">Territory claimed and recorded</p>
          </div>
        </div>

        {/* Mini territory preview */}
        <div className="w-full h-36 bg-[rgba(11,15,20,0.8)] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(#3DE1FF12_1px,transparent_1px)] [background-size:12px_12px]" />
          {miniGrid ? (
            <svg
              width={miniGrid.width}
              height={miniGrid.height}
              className="relative z-10"
              viewBox={`0 0 ${miniGrid.width} ${miniGrid.height}`}
            >
              {miniGrid.cells.map((c, i) => (
                <rect
                  key={i}
                  x={c.x}
                  y={c.y}
                  width={miniGrid.cellSize - 2}
                  height={miniGrid.cellSize - 2}
                  rx="3"
                  fill="var(--mine)"
                  fillOpacity="0.45"
                  stroke="var(--mine)"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          ) : (
            <div className="text-xs text-muted font-medium z-10 flex flex-col items-center gap-1">
              <span>No new cells claimed</span>
              <span className="text-[10px] text-muted/70">Keep moving next time to capture ground</span>
            </div>
          )}
          <span className="absolute bottom-2 right-3 text-[10px] text-muted/60 font-mono tracking-wider">
            SECTOR PREVIEW
          </span>
        </div>

        {/* 4 Key Run Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <Zap className="w-3.5 h-3.5 text-mine" />
              <span>Cells claimed</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-mine tabular-nums">
              {cellsClaimed}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <Swords className="w-3.5 h-3.5 text-rival" />
              <span>Cells stolen</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-rival tabular-nums">
              {cellsStolen}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <Flame className="w-3.5 h-3.5 text-path" />
              <span>Distance</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-text tabular-nums">
              {formatDistance(distance)}{' '}
              <span className="text-xs font-normal text-muted">km</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
              <span>Time & Pace</span>
            </div>
            <div className="text-base font-bold tracking-tight text-text tabular-nums">
              {formatTime(duration)}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {formatPace(distance, duration)} /km
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onSaveRun}
            className="w-full h-14 rounded-btn bg-mine text-[#0B0F14] font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-glowMine hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            Save run
          </button>
          <button
            onClick={onNewRun}
            className="w-full h-12 rounded-btn bg-white/5 text-text hover:bg-white/10 font-medium text-xs tracking-tight flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New run
          </button>
        </div>
      </motion.div>
    </div>
  );
}

