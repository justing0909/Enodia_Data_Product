import React, { useState } from 'react';
import DataExplorerPanel from './DataExplorerPanel';

export default function SimulationPanel({ onRowClick }) {
  const [wind, setWind] = useState(50);
  const [precip, setPrecip] = useState(10);
  const [scenario, setScenario] = useState('Hurricane');
  const [results, setResults] = useState(null);

  const runSimulation = async () => {
    // Placeholder: fetch actual simulation results from your API
    // Here we reuse your points endpoint to demo
    const res = await fetch('/api/points').then(r => r.json());
    setResults(res);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Simulation</h2>
      <div className="control-group">
        <label>Wind speed:</label>
        <input type="number" value={wind} onChange={e => setWind(+e.target.value)} /> mph
      </div>
      <div className="control-group">
        <label>Precipitation:</label>
        <input type="number" value={precip} onChange={e => setPrecip(+e.target.value)} /> in
      </div>
      <button onClick={runSimulation} className="simulate-button">Simulate</button>

      {results && (
        <div className="simulation-results">
          <h3>Simulation Results</h3>
          {/* Display simulated data in a table */}
          <DataExplorerPanel rows={results} onRowClick={onRowClick} />
        </div>
      )}
    </div>
  );
}
