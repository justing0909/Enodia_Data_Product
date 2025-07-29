import React, { useEffect, useState } from 'react';
import './App.css';
import { fetchPoints } from './api';
import AddPointForm from './AddPointForm';

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

  return (
    <div className="container">
      <header>
        <h1>Enodia Data Product</h1>
        <p>Points of Interest</p>
      </header>
      <AddPointForm onAdd={handleAddPoint} />
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
    </div>
  );
}

export default App;