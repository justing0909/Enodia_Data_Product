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

  const style = feature => {
    const base = {
      color: layerDef.color,
      weight: 4,
      opacity: 0.8,
    };
    // if this is the selected feature, override
    if (
      selectedFeature &&
      feature.properties &&
      selectedFeature.properties &&
      feature.properties.id === selectedFeature.properties.id
    ) {
      return {
        color: '#d9a3ff', // bright light purple
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
        onFeatureClick && onFeatureClick(feature);
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
