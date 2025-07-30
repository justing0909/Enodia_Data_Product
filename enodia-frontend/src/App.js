import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PointsMap from './PointsMap';
import DataExplorerPanel from './DataExplorerPanel';
import SimulationPanel from './SimulationPanel';
import { Sun, Moon, Search } from 'lucide-react';
import logo from './assets/enodia_logo.png';

export default function App() {
  const [tab, setTab] = useState('Data Explorer');
  const [dark, setDark] = useState(
    () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const skipFetchRef = useRef(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', dark);
  }, [dark]);

  // Autocomplete suggestions
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (search.length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(search)}`,
      { signal: ctrl.signal }
    )
      .then(res => res.json())
      .then(data => setSuggestions(data))
      .catch(err => { if (!ctrl.signal.aborted) console.error(err); });
    return () => ctrl.abort();
  }, [search]);

  // Handle selecting suggestion or row
  const handleSelection = (coords, id = null, label = null) => {
    if (label !== null) {
      setSearch(label);
      skipFetchRef.current = true;
      setSuggestions([]);
    }
    setSelectedPos(coords);
    setSelectedId(id);
  };

  // Perform search via Enter key
  const handleSearchKey = e => {
    if (e.key === 'Enter' && search) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`
      )
        .then(res => res.json())
        .then(data => {
          if (data[0]) {
            handleSelection([+data[0].lat, +data[0].lon], null, data[0].display_name);
          }
        })
        .catch(console.error);
      setSuggestions([]);
    }
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
            onKeyDown={handleSearchKey}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map(p => (
                <li
                  key={p.place_id}
                  className="suggestion-item"
                  onClick={() => handleSelection([+p.lat, +p.lon], null, p.display_name)}
                >
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
        <PointsMap dark={dark} highlightPos={selectedPos} />
      </div>

      <aside className="sidebar">
        {tab === 'Data Explorer' ? (
          <DataExplorerPanel
            onRowClick={(coords, id) => handleSelection(coords, id)}
            selectedId={selectedId}
            clearSelection={() => handleSelection(null, null)}
          />
        ) : (
          <SimulationPanel onRowClick={coords => handleSelection(coords)} />
        )}
      </aside>
    </div>
  );
}