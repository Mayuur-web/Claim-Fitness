import assert from 'node:assert';
import {
  latLngToCellId,
  cellIdToBounds,
  cellIdToCenter,
  getNeighborCellIds,
  haversineDistance,
  formatTime,
  formatDistance,
  formatPace,
  CELL_SIZE_METERS,
} from '../lib/grid.js';

console.log('--- RUNNING GRID & MATH TESTS ---');

// Test 1: Deterministic Cell ID
const testLat = 37.7749;
const testLng = -122.4194;
const cellId = latLngToCellId(testLat, testLng);
console.log(`Cell ID for SF [${testLat}, ${testLng}]: ${cellId}`);
assert(typeof cellId === 'string' && cellId.includes(':'), 'Cell ID must be row:col');

// Test 2: Cell bounds and dimensions (~44m)
const bounds = cellIdToBounds(cellId);
const [south, west] = bounds[0];
const [north, east] = bounds[1];
const heightMeters = haversineDistance(south, west, north, west);
const widthMeters = haversineDistance(south, west, south, east);
console.log(`Cell height: ${heightMeters.toFixed(2)}m, width: ${widthMeters.toFixed(2)}m (Target: ~${CELL_SIZE_METERS}m)`);
assert(Math.abs(heightMeters - CELL_SIZE_METERS) < 1.0, 'Cell height should match ~44m');
assert(Math.abs(widthMeters - CELL_SIZE_METERS) < 1.0, 'Cell width should match ~44m');

// Test 3: Cell center is inside bounds
const center = cellIdToCenter(cellId);
assert(center[0] >= south && center[0] <= north, 'Center lat within bounds');
assert(center[1] >= west && center[1] <= east, 'Center lng within bounds');

// Test 4: Neighboring cells
const neighbors4 = getNeighborCellIds(cellId, false);
assert(neighbors4.length === 4, '4 neighbors generated');
const neighbors8 = getNeighborCellIds(cellId, true);
assert(neighbors8.length === 8, '8 neighbors generated');

// Test 5: Distance and jump thresholds
const d0 = haversineDistance(testLat, testLng, testLat, testLng);
assert.strictEqual(d0, 0, 'Distance to same point is 0');

// Small step ~12 meters
const nextLat = testLat + 12 / 111195;
const d12 = haversineDistance(testLat, testLng, nextLat, testLng);
console.log(`12m step calculated distance: ${d12.toFixed(2)}m`);
assert(Math.abs(d12 - 12) < 0.2, 'Step distance accurate');

// Test 6: Formatting
assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(65), '01:05');
assert.strictEqual(formatTime(3665), '01:01:05');
assert.strictEqual(formatDistance(1450), '1.45');
assert.strictEqual(formatPace(1000, 300), `5'00"`);

console.log('✓ ALL TESTS PASSED SUCCESSFULLY!');

