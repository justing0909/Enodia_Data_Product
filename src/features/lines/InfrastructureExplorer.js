// src/InfrastructureExplorer.js
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as turf from '@turf/turf';

// InfrastructureExplorer component to display and manage infrastructure layers
export default function InfrastructureExplorer({
  infrastructureLayers,
  onToggleLayer,
  onLineSelect,
  proximityThresholdMeters = 500,
  selectedSite,
}) {
  // ensure infrastructureLayers is an array
  const selectedSitePt = selectedSite ? turf.point([selectedSite.lng, selectedSite.lat]) : null;

  // calculate related lines for the selected site (helps with dependencies between networks / betweenness centrality)
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


  // render the infrastructure lines subtab with toggles and metadata
  return (
    <div className="infrastructure-explorer">
      <h3>Infrastructure Lines</h3>                             {/* Infrastructure Lines Header for subtab */}
      <div className="infra-layers-list">
        {infrastructureLayers.map(layer => (

          // each layer is a card with toggle and metadata
          <div key={layer.key} className="layer-card">

            {/* layer header: colored dot, display name */}
            <div className="layer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="legend-dot" style={{ background: layer.color }} aria-label={layer.displayName} />
                <span>{layer.displayName}</span>
              </div>

              {/* Toggle switch for enabling/disabling layer */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label
                  className="switch"
                  aria-label={`Toggle ${layer.displayName}`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => e.stopPropagation?.()}
                >

                  {/* Toggle switch input */}
                  <input
                    type="checkbox"
                    checked={!!layer.enabled}
                    onChange={() => onToggleLayer && onToggleLayer(layer.key)}
                  />
                  <span className="slider" />
                </label>
                {/* //! this button is for future expansion, currently does nothing
                    <button
                  onClick={() => {}}
                  aria-label={`Expand metadata for ${layer.displayName}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ▸
                </button> */}
                </div>
              </div>

            {/* currently "source" info, otherwise the highlighted metadata */}
            <div className="metadata">
              <div>
                  <strong>source:</strong> {String(layer.metadata?.source || 'OpenStreetMap or other')}
              </div>
            </div>

            {/* If a site is selected, show related segments.
            This is by proximity, not actually connected as of now */}
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
