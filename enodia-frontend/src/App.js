// src/App.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import PointsMap from './PointsMap';
import DataExplorerPanel from './DataExplorerPanel';
import SimulationPanel from './SimulationPanel';
import InfrastructureExplorer from './InfrastructureExplorer';
import { Sun, Moon, Search, Droplet, Wind, FireExtinguisher, Snowflake, Cpu } from 'lucide-react';
import logo from './assets/enodia_logo.png';
import sampleSites from './data/sampleData.json';
import { fetchOsmInfrastructure } from './utils/fetchOsmLines';

// Tab identifiers (avoid magic strings)
const TOP_TABS = ['Data Explorer', 'Simulation'];
const SUBTABS = {
  SITES: 'Sites',
  INFRA: 'Infrastructure',
};

// Disaster definitions (icon-only)
const DISASTERS = [
  { key: 'flood', label: 'Flood', Icon: Droplet },
  { key: 'hurricane', label: 'Hurricane', Icon: Wind },
  { key: 'wildfire', label: 'Wildfire', Icon: FireExtinguisher },
  { key: 'winter', label: 'Winter Storm', Icon: Snowflake },
  { key: 'cyber', label: 'Cyberattack', Icon: Cpu },
];

function getDefaultParams(disaster) {
  switch (disaster) {
    case 'flood':
      return { intensity: 'medium', duration: '6h', area: 'low-lying' };
    case 'hurricane':
      return { windSpeed: '80mph', category: 2, stormSurge: '2ft' };
    case 'wildfire':
      return { dryness: 'high', wind: '10mph', spreadRate: 'moderate' };
    case 'winter':
      return { temp: '15°F', snowfall: '8in', ice: 'light' };
    case 'cyber':
      return { vector: 'phishing', severity: 'medium', duration: '2h' };
    default:
      return {};
  }
}

// Hook: dark mode with persistence
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', dark);
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = e => {
      const stored = localStorage.getItem('darkMode');
      if (stored === null) {
        setDark(e.matches);
      }
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  return [dark, setDark];
}

// Hook: debounce value
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Autocomplete({
  search,
  setSearch,
  onSelectSuggestion,
  placeholder = 'Search city...',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const abortRef = useRef(null);

  useEffect(() => {
    if (debouncedSearch.length < 3) {
      setSuggestions([]);
      setError(null);
      setIsOpen(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
        debouncedSearch
      )}`,
      { signal: controller.signal }
    )
      .then(res => res.json())
      .then(data => {
        setSuggestions(data || []);
        setHighlightedIdx(-1);
        setIsOpen(true);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          console.error('Autocomplete fetch error', err);
          setError('Couldn’t load suggestions.');
          setIsOpen(false);
        }
      });
    return () => controller.abort();
  }, [debouncedSearch]);

  const handleKeyDown = e => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
        const p = suggestions[highlightedIdx];
        onSelectSuggestion(p);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (highlightedIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx]);

  const handleClickOutside = useCallback(
    e => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    },
    [setIsOpen]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const select = suggestion => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
  };

  return (
    <div className="autocomplete-wrapper">
      <div className="search-bar">
        <Search size={16} aria-hidden="true" />
        <input
          aria-label="Search location"
          placeholder={placeholder}
          value={search}
          ref={inputRef}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
      {error && (
        <div className="autocomplete-error" role="alert">
          {error}
        </div>
      )}
      {isOpen && (
        <ul id="autocomplete-list" className="suggestions-list" ref={listRef}>
          {suggestions.length > 0 ? (
            suggestions.map((p, idx) => (
              <li
                key={p.place_id}
                data-idx={idx}
                className={`suggestion-item ${
                  highlightedIdx === idx ? 'highlighted' : ''
                }`}
                onMouseEnter={() => setHighlightedIdx(idx)}
                onMouseDown={e => {
                  e.preventDefault();
                }}
                onClick={() => select(p)}
                tabIndex={-1}
              >
                {p.display_name}
              </li>
            ))
          ) : (
            <li className="suggestion-item no-results" aria-disabled="true">
              No results
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ExplorerSubtabs({
  selectedId,
  handleSiteSelect,
  handleSelection,
  infrastructureLayers,
  handleLineSelect,
  sampleSites,
  onToggleLayer,
}) {
  const [innerTab, setInnerTab] = useState(SUBTABS.SITES);
  const selectedSite = useMemo(
    () => (selectedId != null ? sampleSites.find(s => s.id === selectedId) : null),
    [selectedId, sampleSites]
  );

  const switchToSites = useCallback(() => setInnerTab(SUBTABS.SITES), []);
  const switchToInfra = useCallback(() => setInnerTab(SUBTABS.INFRA), []);

  return (
    <div className="data-explorer-with-subtabs">
      <div className="folder-tabs">
        <button
          className={`folder-tab ${innerTab === SUBTABS.SITES ? 'active' : ''}`}
          onClick={switchToSites}
          aria-selected={innerTab === SUBTABS.SITES}
          role="tab"
        >
          Sites
        </button>
        <button
          className={`folder-tab ${
            innerTab === SUBTABS.INFRA ? 'active' : ''
          }`}
          onClick={switchToInfra}
          aria-selected={innerTab === SUBTABS.INFRA}
          role="tab"
        >
          Infrastructure Lines
        </button>
      </div>
      <div className="folder-content">
        {innerTab === SUBTABS.SITES && (
          <DataExplorerPanel
            onRowClick={handleSiteSelect}
            selectedId={selectedId}
            clearSelection={() => handleSelection(null, null)}
          />
        )}
        {innerTab === SUBTABS.INFRA && (
          <InfrastructureExplorer
            infrastructureLayers={infrastructureLayers}
            onToggleLayer={onToggleLayer}
            onLineSelect={handleLineSelect}
            selectedSite={selectedSite}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState(TOP_TABS[0]);
  const [dark, setDark] = useDarkMode();
  const [search, setSearch] = useState('');
  const [selectedPos, setSelectedPos] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const skipProgrammaticRef = useRef(false);

  // Disaster + simulation state
  const [selectedDisaster, setSelectedDisaster] = useState('flood');
  const [simulationParams, setSimulationParams] = useState(() =>
    getDefaultParams('flood')
  );

  const [infrastructureLayers, setInfrastructureLayers] = useState([
    {
      key: 'electricity',
      displayName: 'Electricity',
      color: '#f6c23e',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { criticality: 'high' },
      enabled: true,
    },
    {
      key: 'water',
      displayName: 'Water',
      color: '#36b9cc',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { criticality: 'medium' },
      enabled: false,
    },
    {
      key: 'road',
      displayName: 'Roads',
      color: '#38a169',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM highways' },
      enabled: false,
    },
    {
      key: 'rail',
      displayName: 'Rail',
      color: '#ff9999',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM rail' },
      enabled: false,
    },
  ]);

  // Load OSM infrastructure once on mount
  useEffect(() => {
    fetchOsmInfrastructure()
      .then(result => {
        setInfrastructureLayers(prev =>
          prev.map(layer => {
            if (layer.key === 'road') return { ...layer, geojson: result.road };
            if (layer.key === 'rail') return { ...layer, geojson: result.rail };
            if (layer.key === 'electricity') return { ...layer, geojson: result.electricity };
            if (layer.key === 'water') return { ...layer, geojson: result.water };
            return layer;
          })
        );
      })
      .catch(err => {
        console.error('Failed to load infrastructure:', err);
      });
  }, []);

  const handleSelection = useCallback((coords, id = null, label = null) => {
    if (label !== null) {
      setSearch(label);
      skipProgrammaticRef.current = true;
    }
    setSelectedPos(coords);
    setSelectedId(id);
    setSelectedLine(null);
  }, []);

  const handleSiteSelect = useCallback((coords, id) => {
    handleSelection(coords, id);
  }, [handleSelection]);

  const handleLineSelect = useCallback(feature => {
    setSelectedLine(feature);
  }, []);

  const toggleLayer = useCallback(key => {
    setInfrastructureLayers(prev =>
      prev.map(l => (l.key === key ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  const handleTopTabClick = useCallback(t => setTab(t), []);

  const onSelectSuggestion = useCallback(
    p => {
      if (p) {
        handleSelection([+p.lat, +p.lon], null, p.display_name);
      }
    },
    [handleSelection]
  );

  // Handle disaster change
  const handleDisasterClick = useCallback(d => {
    setSelectedDisaster(d);
    setSimulationParams(getDefaultParams(d));
  }, []);

  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      <header className="header">
        <img src={logo} alt="Enodia logo" className="logo" />
        <Autocomplete
          search={search}
          setSearch={value => {
            setSearch(value);
            skipProgrammaticRef.current = false;
          }}
          onSelectSuggestion={onSelectSuggestion}
          placeholder="Search city..."
        />

        <div className="tabs" role="tablist">
          {TOP_TABS.map(t => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => handleTopTabClick(t)}
              aria-selected={tab === t}
              role="tab"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Disaster selector only when simulation tab is active */}
        {tab === 'Simulation' && (
          <div className="disaster-selector" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {DISASTERS.map(d => {
              const ActiveIcon = d.Icon;
              return (
                <button
                  key={d.key}
                  className={`folder-tab ${selectedDisaster === d.key ? 'active' : ''}`}
                  onClick={() => handleDisasterClick(d.key)}
                  aria-pressed={selectedDisaster === d.key}
                  title={d.label}
                  style={{ padding: '8px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ActiveIcon size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        <button
          className="toggle-button"
          onClick={() => setDark(d => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <div className="main-content">
        <div className="map-container">
          <PointsMap
            dark={dark}
            highlightPos={selectedPos}
            infrastructureLayers={infrastructureLayers}
            selectedSiteId={selectedId}
            selectedLine={selectedLine}
            onLineSelect={handleLineSelect}
          />
        </div>
        <aside className="sidebar">
          {tab === 'Data Explorer' ? (
            <div className="explorer-wrapper">
              <ExplorerSubtabs
                selectedId={selectedId}
                handleSiteSelect={handleSiteSelect}
                handleSelection={handleSelection}
                infrastructureLayers={infrastructureLayers}
                handleLineSelect={handleLineSelect}
                sampleSites={sampleSites}
                onToggleLayer={toggleLayer}
              />
            </div>
          ) : (
            <SimulationPanel
              selectedDisaster={selectedDisaster}
              simulationParams={simulationParams}
              setSimulationParams={setSimulationParams}
              onRowClick={coords => handleSelection(coords)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
