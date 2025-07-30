import React, { useState, useEffect } from 'react';
import './App.css';
import PointsMap from './PointsMap';
import DataExplorerPanel from './DataExplorerPanel';
import SimulationPanel from './SimulationPanel';
import { Sun, Moon, Search } from 'lucide-react';
import logo from './assets/enodia_logo.png';

export default function App() {
  const [tab, setTab] = useState('Data Explorer');
  const [dark, setDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState(null);

  // persist dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', dark);
  }, [dark]);

  // fetch suggestions as user types
  useEffect(() => {
    if (search.length < 3) return setSuggestions([]);
    const ctrl = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(search)}`,
      { signal: ctrl.signal }
    )
      .then(r => r.json())
      .then(data => setSuggestions(data))
      .catch(err => { if (!ctrl.signal.aborted) console.error(err); });
    return () => ctrl.abort();
  }, [search]);

  const handleSelect = place => {
    setSearch(place.display_name);
    setSearchQuery(place.display_name);
    setSuggestions([]);
    setSelectedPos([+place.lat, +place.lon]);
  };

  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      <header className="header">
        <img src={logo} alt="Enodia logo" className="logo" />
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setSearchQuery(search);
                setSuggestions([]);
                // also zoom via selectedPos
                fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`
                )
                  .then(r => r.json())
                  .then(data => {
                    if (data[0]) setSelectedPos([+data[0].lat, +data[0].lon]);
                  });
              }
            }}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map(p => (
                <li key={p.place_id} className="suggestion-item" onClick={() => handleSelect(p)}>
                  {p.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="tabs">
          {['Data Explorer', 'Simulation'].map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="toggle-button" onClick={() => setDark(d => !d)}>
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      <div className="map-container">
        <PointsMap dark={dark} searchQuery={searchQuery} highlightPos={selectedPos} />
      </div>
      <aside className="sidebar">
        {tab === 'Data Explorer' ? (
          <DataExplorerPanel onRowClick={coords => setSelectedPos(coords)} />
        ) : (
          <SimulationPanel onRowClick={coords => setSelectedPos(coords)} />
        )}
      </aside>
    </div>
  );
}