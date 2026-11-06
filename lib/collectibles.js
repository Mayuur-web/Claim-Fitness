import { haversineDistance, latLngToCellId } from './grid';

export const COLLECTIBLE_TYPES = [
  {
    type: 'overdrive',
    name: 'Hyper-Pulse',
    desc: 'Auto-claims adjacent neighbor cells for 45s!',
    duration: 45,
    color: '#3DE1FF',
    badge: '⚡',
  },
  {
    type: 'aegis',
    name: 'Aegis Matrix',
    desc: '5-minute fortified shields on all newly claimed cells!',
    duration: 60,
    color: '#FFB020',
    badge: '🛡️',
  },
  {
    type: 'battery',
    name: 'Nano Battery',
    desc: 'Instant 4-cell burst claim around your position!',
    duration: 0,
    color: '#B6FF3B',
    badge: '🔋',
  },
];

/**
 * Spawns collectibles in an orbit around a given coordinate (120m - 280m away)
 */
export function spawnCollectibles(centerLat, centerLng, count = 3) {
  const items = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const template = COLLECTIBLE_TYPES[i % COLLECTIBLE_TYPES.length];
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const distanceMeters = 130 + Math.random() * 140; // 130m - 270m

    const dLat = (distanceMeters / 111195) * Math.cos(angle);
    const dLng = (distanceMeters / (111195 * Math.cos((centerLat * Math.PI) / 180))) * Math.sin(angle);

    const lat = centerLat + dLat;
    const lng = centerLng + dLng;
    const cellId = latLngToCellId(lat, lng);

    items.push({
      id: `drop_${now}_${i}`,
      type: template.type,
      name: template.name,
      desc: template.desc,
      duration: template.duration,
      color: template.color,
      badge: template.badge,
      lat,
      lng,
      cellId,
    });
  }

  return items;
}

/**
 * Check if player has stepped close enough to pick up any collectible
 */
export function checkCollectiblesPickup(playerLat, playerLng, collectibles, pickupRadius = 32) {
  let collected = null;
  const remaining = [];

  for (const item of collectibles) {
    if (!collected) {
      const dist = haversineDistance(playerLat, playerLng, item.lat, item.lng);
      if (dist <= pickupRadius) {
        collected = item;
        continue;
      }
    }
    remaining.push(item);
  }

  return { collected, remaining };
}

