// src/SimulationPanel.js
import React, { useState } from 'react';
import DataExplorerPanel from './DataExplorerPanel';

export default function SimulationPanel({ onRowClick }) {
  const [wind, setWind] = useState(50);
  const [precip, setPrecip] = useState(10);
  const [scenario, setScenario] = useState('Hurricane');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wind, precip, scenario })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      // make sure it’s actually JSON
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got:\n${text}`);
      }

      const data = await response.json();
      setResults(data);

    } catch (err) {
      console.error('Simulation error:', err);
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Simulation</h2>

      <div className="control-group">
        <label>Wind speed:</label>
        <input
          type="number"
          value={wind}
          onChange={e => setWind(+e.target.value)}
        /> mph
      </div>

      <div className="control-group">
        <label>Precipitation:</label>
        <input
          type="number"
          value={precip}
          onChange={e => setPrecip(+e.target.value)}
        /> in
      </div>

      <button
        onClick={runSimulation}
        className="simulate-button"
        disabled={loading}
      >
        {loading ? 'Running…' : 'Simulate'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {results && (
        <div className="simulation-results">
          <h3>Simulation Results</h3>
          <DataExplorerPanel
            rows={results}
            onRowClick={onRowClick}
          />
        </div>
      )}
    </div>
  );
}
