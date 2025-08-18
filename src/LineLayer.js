// src/LineLayer.js
import React from 'react';
import { GeoJSON, useMap } from 'react-leaflet';

export default function LineLayer({
  layerDef,
  onFeatureClick,
  selectedFeature, // highlight this feature if matches
  highlightRelated, // optional predicate
}) {
  const map = useMap();

  // Better comparison function that handles different ways features might be identified
  const isFeatureSelected = (feature) => {
    if (!selectedFeature || !feature) return false;
    
    // Try different comparison methods
    const featureProps = feature.properties || {};
    const selectedProps = selectedFeature.properties || {};
    
    // Method 1: Compare by id if it exists
    if (featureProps.id && selectedProps.id) {
      const match = featureProps.id === selectedProps.id;
      return match;
    }
    
    // Method 2: Compare by coordinates (for lines without IDs)
    if (feature.geometry && selectedFeature.geometry) {
      const match = JSON.stringify(feature.geometry.coordinates) === JSON.stringify(selectedFeature.geometry.coordinates);
      return match;
    }
    
    // Method 3: Compare entire properties object as fallback
    const match = JSON.stringify(featureProps) === JSON.stringify(selectedProps);
    return match;
  };

  const style = feature => {
    const base = {
      color: layerDef.color,
      weight: 4,
      opacity: 0.8,
    };
    
    const isSelected = isFeatureSelected(feature);
    
    // if this is the selected feature, override with purple
    if (isSelected) {
      return {
        color: '#d9a3ff',
        weight: 6,
        opacity: 1,
      };
    }
    
    // dim non-related if predicate given
    if (highlightRelated && !highlightRelated(feature)) {
      return { ...base, opacity: 0.2 };
    }
    
    return base;
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        
        if (onFeatureClick) {
          // If clicking the same feature, deselect it
          if (isFeatureSelected(feature)) {
            onFeatureClick(null); // Deselect
          } else {
            onFeatureClick(feature); // Select new feature
          }
        }
      },
    });

    const props = feature.properties || {};
    const infoLines = Object.entries(props)
      .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
      .join('');
    layer.bindPopup(`
      <div style="font-size:0.85rem; min-width:160px;">
        ${infoLines}
      </div>
    `);
  };

  if (!layerDef.enabled) return null;

  return (
    <GeoJSON data={layerDef.geojson} style={style} onEachFeature={onEachFeature} />
  );
}