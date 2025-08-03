// src/SimulationPanel.js
import React from 'react';

export default function SimulationPanel({
  selectedDisaster = '',
  simulationParams = {},
  setSimulationParams = () => {},
  onRowClick,
}) {
  const params = simulationParams || {};

  return (
    <div className="simulation-panel">
      <h2 style={{ marginTop: 0 }}>Simulation: {selectedDisaster}</h2>
      <div className="params" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(params).map(([k, v]) => (
          <div
            key={k}
            className="param-row"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <label style={{ flex: '0 0 140px', textTransform: 'capitalize' }}>
              {k.replace(/_/g, ' ')}:
            </label>
            <input
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #444',
                background: 'inherit',
                color: 'inherit',
              }}
              value={v}
              onChange={e => {
                setSimulationParams({
                  ...simulationParams,
                  [k]: e.target.value,
                });
              }}
            />
          </div>
        ))}
        <button
          className="run-sim"
          style={{
            padding: '10px 14px',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
          }}
          onClick={() => {
            console.log('Running simulation:', selectedDisaster, simulationParams);
          }}
        >
          Run Simulation
        </button>
      </div>
    </div>
  );
}
