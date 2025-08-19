// src/LineLayer.js
import React from 'react';
import { GeoJSON, useMap } from 'react-leaflet';

export default function LineLayer({
  layerDef,
  onFeatureClick,
  selectedFeature,
  highlightRelated,
}) {
  const map = useMap();

  // comparison function that handles different ways features might be identified
  const isFeatureSelected = (feature) => {
    if (!selectedFeature || !feature) return false;
    
    // try different comparison methods...
    const featureProps = feature.properties || {};
    const selectedProps = selectedFeature.properties || {};
    
    // primary method: compare by id if it exists
    if (featureProps.id && selectedProps.id) {
      const match = featureProps.id === selectedProps.id;
      return match;
    }
    
    // fallback 1: compare by coordinates (for lines without ids)
    if (feature.geometry && selectedFeature.geometry) {
      const match = JSON.stringify(feature.geometry.coordinates) === JSON.stringify(selectedFeature.geometry.coordinates);
      return match;
    }
    
    // fallback 2: compare entire properties object as fallback
    const match = JSON.stringify(featureProps) === JSON.stringify(selectedProps);
    return match;
  };

  // style function for the GeoJSON layer
  const style = feature => {
    const base = {
      color: layerDef.color,
      weight: 4,
      opacity: 0.8,
    };
    
    // check if this feature is the selected one
    const isSelected = isFeatureSelected(feature);
    
    // if this isSelected line is the selected feature, color it purple
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

  // onEachFeature function to handle clicks and popups
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        
        // handles the selecting/deselecting of line features, their popups, and their coloring
        if (onFeatureClick) {
          // If clicking the same feature, deselect it
          if (isFeatureSelected(feature)) {
            onFeatureClick(null);
          } else {
            onFeatureClick(feature); // Select new feature
          }
        }
      },
    });

    // for selected feature, add a stylized popup
    const props = feature.properties || {};
    const infoLines = Object.entries(props)

      // filter out empty values and format as HTML
      .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
      .join('');

    // bind a popup to the layer and stylize
    layer.bindPopup(`
      <div style="font-size:0.85rem; min-width:160px;">
        ${infoLines}
      </div>
    `);
  };

  // if layer is not enabled, return null
  if (!layerDef.enabled) return null;

  return (
    <GeoJSON data={layerDef.geojson} style={style} onEachFeature={onEachFeature} />
  );
}