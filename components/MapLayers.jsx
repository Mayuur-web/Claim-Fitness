'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Rectangle,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { cellIdToBounds, getVisibleGridLines } from '@/lib/grid';

// Custom player pulsing marker icon
function createPlayerIcon() {
  return L.divIcon({
    className: 'player-marker-container',
    html: `
      <div style="position: relative; width: 44px; height: 44px; pointer-events: none;">
        <div class="player-marker-pulse"></div>
        <div class="player-marker-core"></div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// Custom glowing collectible power-up drop icon
function createCollectibleIcon(item) {
  return L.divIcon({
    className: 'collectible-drop-container',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${item.color}35; border: 1.5px solid ${item.color}; animation: pulse-ring 1.8s infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #0E141C; border: 1.5px solid ${item.color}; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 0 12px ${item.color}99;">
          ${item.badge}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Controller component to handle user panning, zoom events, and camera follow
function MapController({
  playerPos,
  isFollowUser,
  onUserPan,
  onBoundsChange,
}) {
  const map = useMap();
  const isPannedByUserRef = useRef(false);

  const updateBounds = useCallback(() => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    onBoundsChange(bounds, zoom);
  }, [map, onBoundsChange]);

  useMapEvents({
    dragstart: () => {
      isPannedByUserRef.current = true;
      onUserPan();
    },
    movestart: (e) => {
      // If user drags or pinches
      if (e.originalEvent) {
        isPannedByUserRef.current = true;
        onUserPan();
      }
    },
    moveend: () => {
      updateBounds();
    },
    zoomend: () => {
      updateBounds();
    },
  });

  // Center on player when follow mode is active or user clicks "Center on me"
  useEffect(() => {
    if (!playerPos) return;

    if (isFollowUser) {
      isPannedByUserRef.current = false;
      map.setView(playerPos, map.getZoom() < 16 ? 17 : map.getZoom(), {
        animate: true,
        duration: 0.6,
      });
    }
  }, [playerPos, isFollowUser, map]);

  // Initial bounds calculation
  useEffect(() => {
    updateBounds();
  }, [updateBounds]);

  return null;
}

export default function MapLayers({
  initialCenter = [37.7749, -122.4194],
  playerPos,
  path = [],
  cells = [],
  collectibles = [],
  isFollowUser = true,
  onUserPan,
}) {
  const [gridLines, setGridLines] = useState([]);
  const playerIcon = useMemo(() => createPlayerIcon(), []);

  const handleBoundsChange = useCallback((bounds, zoom) => {
    const lines = getVisibleGridLines(bounds, zoom, 8000);
    setGridLines(lines);
  }, []);

  const now = Date.now();

  return (
    <div className="relative w-full h-full select-none">
      <MapContainer
        center={initialCenter}
        zoom={17}
        minZoom={13}
        maxZoom={19}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
        style={{ background: '#0B0F14' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapController
          playerPos={playerPos}
          isFollowUser={isFollowUser}
          onUserPan={onUserPan}
          onBoundsChange={handleBoundsChange}
        />

        {/* Global square grid rendered as ONE multi-polyline */}
        {gridLines.length > 0 && (
          <Polyline
            positions={gridLines}
            pathOptions={{
              color: 'rgba(255, 255, 255, 0.10)',
              weight: 1,
              interactive: false,
            }}
          />
        )}

        {/* Claimed territory cells (Mine & Rivals) */}
        {cells.map((cell) => {
          const bounds = cellIdToBounds(cell.id);
          const isMine = cell.owner === 'player';
          const isShielded = cell.shieldedUntil && cell.shieldedUntil > now;

          // Theme styling based on design system
          const fillColor = isMine ? '#B6FF3B' : (cell.color || '#FF4D8D');
          const strokeColor = isShielded ? '#FFB020' : fillColor;

          return (
            <Rectangle
              key={cell.id}
              bounds={bounds}
              pathOptions={{
                fillColor: fillColor,
                fillOpacity: 0.3,
                color: strokeColor,
                weight: 1.5,
                dashArray: isShielded ? '4, 4' : undefined,
                interactive: false,
              }}
            />
          );
        })}

        {/* Collectible map drops / power-ups */}
        {collectibles.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={createCollectibleIcon(item)}
            zIndexOffset={500}
          />
        ))}

        {/* Player run path: thick faint cyan under thin bright cyan */}
        {path.length > 1 && (
          <>
            <Polyline
              positions={path}
              pathOptions={{
                color: '#3DE1FF',
                weight: 8,
                opacity: 0.25,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false,
              }}
            />
            <Polyline
              positions={path}
              pathOptions={{
                color: '#3DE1FF',
                weight: 3,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false,
              }}
            />
          </>
        )}

        {/* Player marker with pulse ring */}
        {playerPos && (
          <Marker position={playerPos} icon={playerIcon} zIndexOffset={1000} />
        )}
      </MapContainer>
    </div>
  );
}
