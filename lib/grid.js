// Earth radius and cell dimension constants
const EARTH_RADIUS_METERS = 6371000;
export const CELL_SIZE_METERS = 44; // ~44 meter cells

// Approximate latitude degrees per meter: 1 deg lat = (pi * R) / 180 meters
export const DELTA_LAT = CELL_SIZE_METERS / ((Math.PI * EARTH_RADIUS_METERS) / 180);

/**
 * Returns longitude step in degrees for a given latitude to keep cells square (~44m)
 */
export function getDeltaLng(lat) {
  const rad = (lat * Math.PI) / 180;
  const cosLat = Math.max(0.01, Math.cos(rad));
  return DELTA_LAT / cosLat;
}

/**
 * Converts a (lat, lng) coordinate to a global deterministic cell ID "row:col"
 */
export function latLngToCellId(lat, lng) {
  const row = Math.floor(lat / DELTA_LAT);
  const centerLat = (row + 0.5) * DELTA_LAT;
  const dLng = getDeltaLng(centerLat);
  const col = Math.floor(lng / dLng);
  return `${row}:${col}`;
}

/**
 * Given a cell ID "row:col", returns the Leaflet LatLngBounds [[south, west], [north, east]]
 */
export function cellIdToBounds(cellId) {
  const [rowStr, colStr] = cellId.split(':');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);

  const south = row * DELTA_LAT;
  const north = (row + 1) * DELTA_LAT;
  const centerLat = (row + 0.5) * DELTA_LAT;
  const dLng = getDeltaLng(centerLat);
  const west = col * dLng;
  const east = (col + 1) * dLng;

  return [
    [south, west],
    [north, east],
  ];
}

/**
 * Given a cell ID "row:col", returns the center [lat, lng]
 */
export function cellIdToCenter(cellId) {
  const [rowStr, colStr] = cellId.split(':');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);

  const centerLat = (row + 0.5) * DELTA_LAT;
  const dLng = getDeltaLng(centerLat);
  const centerLng = (col + 0.5) * dLng;

  return [centerLat, centerLng];
}

/**
 * Computes grid line segments as an array of segments [[p1, p2], ...]
 * for drawing as a single Leaflet multi-polyline.
 * Only rendered at zoom >= 15 with a cap on cell count (~8000).
 */
export function getVisibleGridLines(bounds, zoom, maxCells = 8000) {
  if (zoom < 15 || !bounds) return [];

  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  const minRow = Math.floor(south / DELTA_LAT);
  const maxRow = Math.ceil(north / DELTA_LAT);

  const midLat = (south + north) / 2;
  const dLng = getDeltaLng(midLat);

  const minCol = Math.floor(west / dLng);
  const maxCol = Math.ceil(east / dLng);

  const cellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  if (cellCount > maxCells || cellCount <= 0) {
    return [];
  }

  const lines = [];

  // Horizontal lines across latitude steps
  for (let r = minRow; r <= maxRow; r++) {
    const lat = r * DELTA_LAT;
    lines.push([
      [lat, minCol * dLng],
      [lat, maxCol * dLng],
    ]);
  }

  // Vertical lines across longitude steps
  for (let c = minCol; c <= maxCol; c++) {
    const lng = c * dLng;
    lines.push([
      [minRow * DELTA_LAT, lng],
      [maxRow * DELTA_LAT, lng],
    ]);
  }

  return lines;
}

/**
 * Returns adjacent cell IDs (8-way or 4-way neighbors)
 */
export function getNeighborCellIds(cellId, includeDiagonals = false) {
  const [rowStr, colStr] = cellId.split(':');
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);

  const deltas = includeDiagonals
    ? [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

  return deltas.map(([dr, dc]) => `${row + dr}:${col + dc}`);
}

/**
 * Haversine formula in meters between two lat/lng pairs
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = EARTH_RADIUS_METERS;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats seconds into hh:mm:ss (or mm:ss if under an hour)
 */
export function formatTime(seconds) {
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Formats distance in km with 2 decimals
 */
export function formatDistance(meters) {
  const km = meters / 1000;
  return km.toFixed(2);
}

/**
 * Calculates average pace: min / km as mm'ss"
 */
export function formatPace(meters, seconds) {
  if (meters < 10 || seconds < 1) return `--'--"`;
  const km = meters / 1000;
  const paceSecondsPerKm = seconds / km;
  if (paceSecondsPerKm > 3600) return `>60'00"`;
  const m = Math.floor(paceSecondsPerKm / 60);
  const s = Math.floor(paceSecondsPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}
