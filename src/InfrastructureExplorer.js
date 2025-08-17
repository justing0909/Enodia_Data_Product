// src/InfrastructureExplorer.js
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as turf from '@turf/turf';

export default function InfrastructureExplorer({
  infrastructureLayers,
  onToggleLayer,
  onLineSelect,
  proximityThresholdMeters = 500,
  selectedSite,
}) {
  const selectedSitePt = selectedSite ? turf.point([selectedSite.lng, selectedSite.lat]) : null;

  const relatedLinesForSite = useMemo(() => {
    if (!selectedSitePt) return {};
    const related = {};
    infrastructureLayers.forEach(layer => {
      if (!layer.enabled) return;
      const matches = layer.geojson.features.filter(f => {
        const dist = turf.pointToLineDistance(selectedSitePt, f, { units: 'meters' });
        return dist <= proximityThresholdMeters;
      });
      if (matches.length) related[layer.key] = matches;
    });
    return related;
  }, [selectedSitePt, infrastructureLayers, proximityThresholdMeters]);

  return (
    <div className="infrastructure-explorer">
      <h3>Infrastructure Lines</h3>
      <div className="infra-layers-list">
        {infrastructureLayers.map(layer => (
          <div key={layer.key} className="layer-card">
            <div className="layer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="legend-dot" style={{ background: layer.color }} aria-label={layer.displayName} />
                <span>{layer.displayName}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label
                  className="switch"
                  aria-label={`Toggle ${layer.displayName}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => e.stopPropagation?.()} // prevents row click if the whole row is clickable
                >
                  <input
                    type="checkbox"
                    checked={!!layer.enabled}
                    onChange={() => onToggleLayer && onToggleLayer(layer.key)}
                  />
                  <span className="slider" />
                </label>
                <button
                  onClick={() => {}}
                  aria-label={`Expand metadata for ${layer.displayName}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ▸
                </button>
              </div>
            </div>
            <div className="metadata">
              {Object.entries(layer.metadata || {}).map(([k, v]) => (
                <div key={k}>
                  <strong>{k}:</strong> {String(v)}
                </div>
              ))}
            </div>
            {selectedSite && relatedLinesForSite[layer.key] && (
              <div className="related-summary">
                Nearby related segments: {relatedLinesForSite[layer.key].length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

InfrastructureExplorer.propTypes = {
  infrastructureLayers: PropTypes.array.isRequired,
  onToggleLayer: PropTypes.func.isRequired,
  onLineSelect: PropTypes.func,
  proximityThresholdMeters: PropTypes.number,
  selectedSite: PropTypes.object,
};
