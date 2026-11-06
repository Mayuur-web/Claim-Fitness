'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  History,
  Route,
  Clock,
  Zap,
  Swords,
  Download,
  Trash2,
  Flame,
  Award,
} from 'lucide-react';
import { formatTime, formatDistance, formatPace } from '@/lib/grid';
import { generateGpx, downloadGpxFile } from '@/lib/gpx';

export default function HistoryModal({
  isOpen,
  onClose,
  history = [],
  careerStats = {},
  onDeleteRun,
}) {
  const {
    totalRuns = 0,
    totalDistanceMeters = 0,
    totalDurationSeconds = 0,
    totalCellsStolen = 0,
    longestRunMeters = 0,
    currentOwnedCells = 0,
  } = careerStats;

  const handleExportSingleRun = (run) => {
    const runDate = new Date(run.date).getTime();
    const gpx = generateGpx(run.path || [], runDate, run.duration || 0);
    const filename = `claimr-${new Date(run.date).toISOString().slice(0, 10)}-${Math.round(
      run.distance || 0
    )}m.gpx`;
    downloadGpxFile(gpx, filename);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full max-w-lg max-h-[85vh] bg-[rgba(14,20,28,0.95)] border border-[rgba(255,255,255,0.12)] rounded-t-[28px] sm:rounded-[28px] flex flex-col shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-path/20 flex items-center justify-center">
                  <History className="w-4 h-4 text-path" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Activity History</h3>
                  <p className="text-xs text-muted">Past runs & career milestones</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted hover:text-text transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Career Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Route className="w-3 h-3 text-path" /> Total Dist
                  </span>
                  <span className="text-lg font-bold text-text mt-1">
                    {formatDistance(totalDistanceMeters)}{' '}
                    <span className="text-xs font-normal text-muted">km</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Zap className="w-3 h-3 text-mine" /> Turf Held
                  </span>
                  <span className="text-lg font-bold text-mine mt-1">
                    {currentOwnedCells}{' '}
                    <span className="text-xs font-normal text-muted">cells</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Flame className="w-3 h-3 text-warn" /> Runs
                  </span>
                  <span className="text-lg font-bold text-text mt-1">{totalRuns}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-white/5 flex flex-col">
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <Award className="w-3 h-3 text-[#E040FB]" /> Longest
                  </span>
                  <span className="text-lg font-bold text-text mt-1">
                    {formatDistance(longestRunMeters)}{' '}
                    <span className="text-xs font-normal text-muted">km</span>
                  </span>
                </div>
              </div>

              {/* Past Activities List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Recorded Sessions ({history.length})
                </h4>

                {history.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                    <Zap className="w-8 h-8 text-mine/50 mb-2" />
                    <p className="text-sm font-semibold text-text">No recorded runs yet</p>
                    <p className="text-xs text-muted mt-1 max-w-xs">
                      Start your first run to claim local territory and record activity stats!
                    </p>
                  </div>
                ) : (
                  history.map((run) => {
                    const runDate = new Date(run.date);
                    const formattedDate = runDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedClock = runDate.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={run.id}
                        className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] border border-white/5 flex flex-col gap-3 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-text">
                              {formattedDate}
                            </span>
                            <span className="text-[11px] text-muted ml-2">
                              {formattedClock}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Export GPX */}
                            <button
                              onClick={() => handleExportSingleRun(run)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-muted hover:text-path transition-colors"
                              title="Export GPX (Strava/Garmin)"
                              aria-label="Export GPX"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete single run */}
                            {onDeleteRun && (
                              <button
                                onClick={() => onDeleteRun(run.id)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                                title="Delete Run"
                                aria-label="Delete run"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metric pills */}
                        <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-white/5">
                          <div>
                            <span className="text-[10px] text-muted block">Distance</span>
                            <span className="text-xs font-bold text-text">
                              {formatDistance(run.distance || 0)} km
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-muted block">Time</span>
                            <span className="text-xs font-bold text-text font-mono">
                              {formatTime(run.duration || 0)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-muted block">Avg Pace</span>
                            <span className="text-xs font-bold text-text">
                              {formatPace(run.distance || 0, run.duration || 0)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-muted block">Claimed</span>
                            <span className="text-xs font-bold text-mine">
                              {run.cellsClaimed || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

