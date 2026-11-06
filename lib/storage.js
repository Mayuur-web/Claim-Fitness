// Local persistence module for Claimr territory & run history

const CELLS_STORAGE_KEY = 'claimr_cells_v1';
const HISTORY_STORAGE_KEY = 'claimr_history_v1';

/**
 * Load saved cells from localStorage
 */
export function loadSavedCells() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CELLS_STORAGE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return new Map(list.map((c) => [c.id, c]));
    }
  } catch (err) {
    console.warn('Failed to load saved cells:', err);
  }
  return null;
}

/**
 * Persist cells map to localStorage
 */
export function saveCells(cellsMap) {
  if (typeof window === 'undefined' || !cellsMap) return;
  try {
    const list = Array.from(cellsMap.values());
    localStorage.setItem(CELLS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to persist cells:', err);
  }
}

/**
 * Clear all cells from storage (reset turf)
 */
export function clearSavedCells() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CELLS_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear cells:', err);
  }
}

/**
 * Load all recorded run summaries
 */
export function loadRunHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load run history:', err);
    return [];
  }
}

/**
 * Save a new completed run to history
 */
export function saveRunToHistory(runData) {
  if (typeof window === 'undefined' || !runData) return [];
  try {
    const existing = loadRunHistory();
    const newEntry = {
      id: 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      date: new Date().toISOString(),
      duration: runData.duration || 0,
      distance: runData.distance || 0,
      cellsClaimed: runData.cellsClaimed || 0,
      cellsStolen: runData.cellsStolen || 0,
      claimedCellIds: runData.claimedCellIds || [],
      path: runData.path || [],
    };
    const updated = [newEntry, ...existing];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save run to history:', err);
    return [];
  }
}

/**
 * Delete a specific run from history
 */
export function deleteRunFromHistory(runId) {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadRunHistory();
    const updated = existing.filter((r) => r.id !== runId);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to delete run:', err);
    return [];
  }
}

/**
 * Calculate career cumulative stats from run history & cells
 */
export function calculateCareerStats(history = [], currentCellsMap = null) {
  let totalDistance = 0;
  let totalDuration = 0;
  let totalCellsStolen = 0;
  let longestRunMeters = 0;

  history.forEach((run) => {
    totalDistance += run.distance || 0;
    totalDuration += run.duration || 0;
    totalCellsStolen += run.cellsStolen || 0;
    if ((run.distance || 0) > longestRunMeters) {
      longestRunMeters = run.distance;
    }
  });

  let currentOwnedCount = 0;
  if (currentCellsMap) {
    currentCellsMap.forEach((c) => {
      if (c.owner === 'player') currentOwnedCount++;
    });
  }

  return {
    totalRuns: history.length,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
    totalCellsStolen,
    longestRunMeters,
    currentOwnedCells: currentOwnedCount,
  };
}

