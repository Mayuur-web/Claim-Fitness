'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';

export default function Leaderboard({
  isOpen,
  onClose,
  playerCellCount = 0,
  rivals = [],
}) {
  // Build ranking list combining player and rivals
  const standings = [
    {
      id: 'player',
      name: 'You',
      cells: playerCellCount,
      isPlayer: true,
      color: '#B6FF3B',
    },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.name,
      cells: r.cells,
      isPlayer: false,
      color: r.color || '#FF4D8D',
    })),
  ].sort((a, b) => b.cells - a.cells);

  const totalTerritory = standings.reduce((acc, curr) => acc + curr.cells, 0) || 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-full sm:max-w-md max-h-[85dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] glass-panel bg-[rgba(14,20,28,0.92)] border border-[rgba(255,255,255,0.1)] overflow-hidden shadow-2xl"
          >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-mine/15 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-mine" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text tracking-tight">
                  Turf Leaderboard
                </h2>
                <p className="text-xs text-muted">Real-time local territory control</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center text-muted hover:text-text transition-all"
              aria-label="Close leaderboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Standings List */}
          <div className="overflow-y-auto px-6 py-3 divide-y divide-white/5 space-y-1">
            {standings.map((item, idx) => {
              const rank = idx + 1;
              const percent = ((item.cells / totalTerritory) * 100).toFixed(1);

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-3 px-3 rounded-2xl transition-colors ${
                    item.isPlayer
                      ? 'bg-mine/10 border border-mine/25'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 text-center text-sm font-bold tabular-nums ${
                        rank === 1
                          ? 'text-mine'
                          : rank <= 3
                          ? 'text-text'
                          : 'text-muted'
                      }`}
                    >
                      #{rank}
                    </span>
                    <div
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white/10 shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex flex-col">
                      <span
                        className={`text-sm tracking-tight ${
                          item.isPlayer
                            ? 'font-bold text-mine'
                            : 'font-medium text-text'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[11px] text-muted">
                        {percent}% of controlled grid
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-text tabular-nums tracking-tight">
                      {item.cells}{' '}
                      <span className="text-xs font-normal text-muted">cells</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="p-4 bg-[rgba(10,14,19,0.7)] border-t border-[rgba(255,255,255,0.06)] text-center text-xs text-muted">
            <span className="text-text font-semibold">{totalTerritory}</span> active cells held across the sector
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

