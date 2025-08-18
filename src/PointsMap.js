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

// Component to handle map clicks for deselection
function MapClickHandler({ onLineSelect, selectedLine }) {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e) => {
      // Only deselect if there's currently a selected line
      if (selectedLine && onLineSelect) {
        onLineSelect(null);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onLineSelect, selectedLine]);

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
  const currentPopupRef = useRef(null);
  const layerRefsRef = useRef(new Map()); // Store references to all layers

  // Fixed style function with proper selection logic
  const getLineStyle = (layer, feature) => {
    const baseColor = layer.color;
    
    // Check if this feature is the selected one
    const isSelected = selectedLine && 
      feature.properties && 
      selectedLine.properties && 
      feature.properties.id === selectedLine.properties.id;
    
    return {
      color: isSelected ? '#d9a3ff' : baseColor, // Purple for selected, original color for others
      weight: isSelected ? 6 : 3,
      opacity: 1,
      dashArray: layer.key === 'road' ? null : null,
    };
  };

  // Handle click on a line feature with toggle functionality
  const onEachLine = (layerObj, layerDef) => (feature, layer) => {
    
    // Store layer reference for manual style updates
    const featureId = feature.properties?.id;
    if (featureId) {
      layerRefsRef.current.set(featureId, { layer, layerDef });
    }
    
    layer.on({
      click: (e) => {
        
        // Prevent map click event from firing
        L.DomEvent.stopPropagation(e);
        
        // Create proper popup content
        const popupContent = `<div style="min-width:160px; font-size:14px;">
          <strong style="color: #333;">${layerDef.displayName}</strong><br/>
          <strong>ID:</strong> ${feature.properties.id || 'n/a'}<br/>
          ${Object.entries(feature.properties)
            .filter(([k]) => k !== 'layerType' && k !== 'id')
            .map(([k, v]) => `<div style="margin-top: 4px;"><strong>${k}:</strong> ${v}</div>`)
            .join('')}
        </div>`;
        
        
        // Close any existing popup first
        if (currentPopupRef.current) {
          currentPopupRef.current.closePopup();
          currentPopupRef.current = null;
        }
        
        try {
          // Popup with options for better persistence
          layer.bindPopup(popupContent, {
            closeOnClick: false,
            autoClose: false,
            closeOnEscapeKey: true
          }).openPopup();
          currentPopupRef.current = layer;
        } catch (error) {
        }
        
        if (onLineSelect) {
          // Handle selection immediately - no re-render, just manual style updates
          const wasSelected = selectedLine && 
            feature.properties?.id === selectedLine.properties?.id;
          
          if (wasSelected) {
            onLineSelect(null);
            // Close popup when deselecting
            setTimeout(() => {
              if (currentPopupRef.current) {
                currentPopupRef.current.closePopup();
                currentPopupRef.current = null;
              }
            }, 50);
          } else {
            onLineSelect(feature);
          }
        }
      }
      // NOTE: mouseover/mouseout handlers are now managed dynamically in useEffect
    });
  };

  // Update styles manually when selection changes, without re-rendering
  useEffect(() => {
    
    layerRefsRef.current.forEach(({ layer, layerDef }, featureId) => {
      const isSelected = selectedLine && selectedLine.properties?.id === featureId;
      
      if (isSelected) {
        layer.setStyle({
          color: '#d9a3ff', // Purple for selected
          weight: 6,
          opacity: 1,
        });
        
        // CRITICAL: Remove mouseout handler for selected lines to prevent color override
        layer.off('mouseout');
        
        // Add mouseover handler back for selected lines (for consistency)
        layer.off('mouseover');
        layer.on('mouseover', () => {
          // Selected lines don't need hover effects, keep purple
          layer.setStyle({
            color: '#d9a3ff',
            weight: 6,
            opacity: 1,
          });
        });
        
      } else {
        layer.setStyle({
          color: layerDef.color, // Original color
          weight: 3,
          opacity: 1,
        });
        
        // Restore normal hover behavior for unselected lines
        layer.off('mouseover');
        layer.off('mouseout');
        
        layer.on('mouseover', () => {
          layer.setStyle({ 
            color: layerDef.color,
            weight: 5,
            opacity: 1
          });
        });
        
        layer.on('mouseout', () => {
          layer.setStyle({
            color: layerDef.color,
            weight: 3,
            opacity: 1
          });
        });
      }
    });
  }, [selectedLine]);

  // Use completely stable keys - no re-renders based on selection
  const renderedLayers = useMemo(() => {
    
    return infrastructureLayers
      .filter(l => l.enabled && l.geojson && l.geojson.features && l.geojson.features.length)
      .map(layer => {
        console.log(`🗺️ Creating GeoJSON layer for ${layer.key}`);
        return (
          <GeoJSON
            key={`${layer.key}-stable`} // Completely stable key
            data={layer.geojson}
            style={feature => getLineStyle(layer, feature)}
            onEachFeature={onEachLine(null, layer)}
          />
        );
      });
  }, [infrastructureLayers]); // Only re-render when layers themselves change

  // Close popup when selection changes externally (like map click deselection)
  useEffect(() => {
    if (!selectedLine && currentPopupRef.current) {
      currentPopupRef.current.closePopup();
      currentPopupRef.current = null;
    }
  }, [selectedLine]);

  // Remove the useEffect - let React handle the re-rendering

  // Selected site coordinates from sampleSites or passed in
  const selectedSitePosition = useMemo(() => {
    if (!selectedSiteId) return null;
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
      <MapClickHandler onLineSelect={onLineSelect} selectedLine={selectedLine} />
      
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

      {/* Selected site marker */}
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