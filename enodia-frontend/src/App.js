import React, { useEffect, useState } from 'react';
import './App.css';
import { fetchPoints } from './api';
import AddPointForm from './AddPointForm';
import PointsMap from './PointsMap';

function App() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPoints()
      .then(data => {
        setPoints(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  function handleAddPoint(newPoint) {
    setPoints([...points, newPoint]);
  }

  // ...inside App() before return...
  const totalPoints = points.length;
  const uniqueTypes = [...new Set(points.map(p => p.type))].length;
  const uniqueOrgs = [...new Set(points.map(p => p.org_id))].length;

  return (
    <div className="container">
      <header>
        <h1>Enodia Data Product</h1>
        <p>Points of Interest</p>
      </header>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2em' }}>
        <div>
          <strong>Total Points:</strong> {totalPoints}
        </div>
        <div>
          <strong>Infrastructure Types:</strong> {uniqueTypes}
        </div>
        <div>
          <strong>Organizations:</strong> {uniqueOrgs}
        </div>
      </div>
      <AddPointForm onAdd={handleAddPoint} />
      <PointsMap points={points} />
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <ul className="points-list">
        {points.map(point => (
          <li key={point.id || point.name}>
            <strong>{point.name}</strong>
            {point.description && <span> — {point.description}</span>}
          </li>
        ))}
      </ul>
      <table style={{ width: '100%', marginTop: '2em', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Organization</th>
          </tr>
        </thead>
        <tbody>
          {points.map(point => (
            <tr key={point.id || point.name}>
              <td>{point.name}</td>
              <td>{point.type}</td>
              <td>{point.lat}</td>
              <td>{point.lon}</td>
              <td>{point.org_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;