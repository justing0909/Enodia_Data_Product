// src/PointsMap.js
import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, CircleMarker } from 'react-leaflet';
import markerIconUrl from './assets/marker.png';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon (expects marker.png in /public or adjust path)
const siteIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
  shadowUrl: null,
});

const DEFAULT_CENTER = [44.3210, -69.7652]; // Center on Augusta / Kennebec County
const DEFAULT_ZOOM = 11;

function MapViewSync({ highlightPos }) {
  const map = useMap();
  const initialized = useRef(false);

  // If highlightPos is provided and map already exists, pan to it but keep zoom.
  useEffect(() => {
    if (highlightPos) {
      if (!initialized.current) {
        map.setView(highlightPos, map.getZoom()); // first time selection
        initialized.current = true;
      } else {
        map.panTo(highlightPos, { animate: true });
      }
    }
  }, [highlightPos, map]);

  return null;
}

export default function PointsMap({
  dark,
  highlightPos,
  infrastructureLayers = [],
  selectedSiteId,
  selectedLine,
  onLineSelect,
}) {
  const mapRef = useRef();

  // Style each infrastructure layer: roads green, rail pastel red, others from layer.color
  const getLineStyle = (layer, feature) => {
    const baseColor = layer.color;
    const isSelected =
      selectedLine &&
      feature.properties &&
      selectedLine.properties &&
      feature.properties.id === selectedLine.properties.id;
    return {
      color: isSelected ? '#d9a3ff' : baseColor,
      weight: isSelected ? 6 : 3,
      opacity: 1,
      dashArray: layer.key === 'road' ? null : null,
    };
  };

  // Handle click on a line feature
  const onEachLine = (layerObj, layerDef) => (feature, layer) => {
    layer.on({
      click: () => {
        if (onLineSelect) onLineSelect(feature);
        layer.bindPopup(
          `<div style="min-width:160px"><strong>${layerDef.displayName}</strong><br/>ID: ${feature.properties.id || 'n/a'}<br/>${Object.entries(feature.properties)
            .filter(([k]) => k !== 'layerType')
            .map(([k, v]) => `<div><small>${k}: ${v}</small></div>`)
            .join('')}</div>`
        ).openPopup();
      },
      mouseover: () => {
        layer.setStyle({ weight: 5 });
      },
      mouseout: () => {
        layer.setStyle(getLineStyle(layerDef, feature));
      },
    });
  };

  // Memoize GeoJSON layers to avoid re-renders
  const renderedLayers = useMemo(() => {
    return infrastructureLayers
      .filter(l => l.enabled && l.geojson && l.geojson.features && l.geojson.features.length)
      .map(layer => (
        <GeoJSON
          key={layer.key}
          data={layer.geojson}
          pathOptions={feature => getLineStyle(layer, feature)}
          onEachFeature={onEachLine(null, layer)}
          style={feature => getLineStyle(layer, feature)}
        />
      ));
  }, [infrastructureLayers, selectedLine]);

  // Selected site coordinates from sampleSites or passed in
  // expecting selectedSiteId corresponds to a site with lat/lng in overlay data; if you have site list externally, you'd pass coords
  const selectedSitePosition = useMemo(() => {
    if (!selectedSiteId) return null;
    // If you want to derive from a global dataset, that logic would go external and pass coords instead.
    return null;
  }, [selectedSiteId]);

  // Resize observer or similar could be added to invalidate map size if parent dims change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize?.();
    }
  }, []);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      whenCreated={mapInstance => {
        mapRef.current = mapInstance;
      }}
      scrollWheelZoom={true}
    >
      <MapViewSync highlightPos={highlightPos} />
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url={
          dark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }
      />

      {/* Render infrastructure line layers */}
      {renderedLayers}

      {/* Highlight selected line again on top */}
      {selectedLine && (
        <GeoJSON
          key="selected-line-overlay"
          data={selectedLine}
          style={{
            color: '#d9a3ff',
            weight: 6,
            opacity: 1,
          }}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<div style="min-width:160px"><strong>Selected Line</strong><br/>ID: ${feature.properties.id || 'n/a'}</div>`
            );
          }}
        />
      )}

      {/* Selected site marker (if you pass actual coordinates instead of just ID, wire that here) */}
      {highlightPos && (
        <Marker position={highlightPos} icon={siteIcon}>
          <Popup>
            <div>
              <strong>Selected Site</strong>
              <div>Coordinates: {highlightPos[0].toFixed(5)}, {highlightPos[1].toFixed(5)}</div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
