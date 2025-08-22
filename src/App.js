// ====== Imports ====== //
// Main Imports
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './styles/App.css';
import PointsMap from './features/points/PointsMap';

// Style Imports
import logo from './img_assets/enodia_logo.png';
import accountDefault from './img_assets/account_default.png';

// Data Imports
import sampleSites from './features/points/sampleData.json';
import { fetchOsmInfrastructure } from './features/lines/fetchOsmLines'; 

// Authentication Imports
import ProtectedRoute from './aws_components/ProtectedRoute';
import { AuthProvider, useAuth } from './aws_components/AuthProvider';

// Simulation Imports
import { Sun, Moon, Search, Droplet, Wind, FireExtinguisher, Snowflake, Cpu, LogOut } from 'lucide-react';
import SimulationPanel from './features/simulation/SimulationPanel';

// Data Explorer & Subtab Imports
import DataExplorerPanel from './features/DataExplorerPanel';
import InfrastructureExplorer from './features/lines/InfrastructureExplorer';
import DataSubmitTab from './aws_components/DataSubmitTab';


// ====== Tabs and Subtabs ====== //
const TOP_TABS = ['Data Explorer', 'Simulation'];
const SUBTABS = {
  SITES: 'Sites',
  INFRA: 'Infrastructure',
  SUBMIT: 'Submit Data',
};


// ====== Disaster Types ====== //
// define disaster types with icons
const DISASTERS = [
  { key: 'flood', label: 'Flood', Icon: Droplet },
  { key: 'hurricane', label: 'Hurricane', Icon: Wind },
  { key: 'wildfire', label: 'Wildfire', Icon: FireExtinguisher },
  { key: 'winter', label: 'Winter Storm', Icon: Snowflake },
  { key: 'cyber', label: 'Cyberattack', Icon: Cpu },
];

// default simulation parameters for each disaster type
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


// ====== Dark Mode Hook ====== //
// hook: dark mode with persistence
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', dark);
  }, [dark]);

  // listen for system dark mode changes
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

// hook: debounce value
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ====== Search Bar Autocomplete ====== //
// autocomplete component for searching locations
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

  // fetch suggestions from Nominatim API
  useEffect(() => {
    if (debouncedSearch.length < 3) {
      setSuggestions([]);
      setError(null);
      setIsOpen(false);
      return;
    }

    // abort previous fetch if it exists
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
          setError("Couldn't load suggestions.");
          setIsOpen(false);
        }
      });
    return () => controller.abort();
  }, [debouncedSearch]);

  // handle keyboard navigation within suggestions
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

  // scroll highlighted suggestion into view
  useEffect(() => {
    if (highlightedIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx]);

  // close suggestions when clicking outside
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

  // add event listener for clicks outside the component
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // select a suggestion
  const select = suggestion => {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
  };

  // render the autocomplete component
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

            // no results message, when there's no suggested cities
            <li className="suggestion-item no-results">
              No results
            </li>

          )}
        </ul>
      )}
    </div>
  );
}

// ====== Application Tabs ====== //
// renders the header, tabs, and content
function ExplorerSubtabs({
  selectedId,
  handleSiteSelect,
  handleSelection,
  infrastructureLayers,
  handleLineSelect,
  sampleSites,
  onToggleLayer,
}) {

  // state for inner tab selection
  const [innerTab, setInnerTab] = useState(SUBTABS.SITES);
  const selectedSite = useMemo(
    () => (selectedId != null ? sampleSites.find(s => s.id === selectedId) : null),
    [selectedId, sampleSites]
  );

  const switchToSites = useCallback(() => setInnerTab(SUBTABS.SITES), []);
  const switchToInfra = useCallback(() => setInnerTab(SUBTABS.INFRA), []);

  // render the main explorer with sub-tabs
  return (
    <div className="data-explorer-with-subtabs">
      <div className="folder-tabs">
        { /* render buttons for the sub-tabs of:
          sites, infrastructure, and data submission */}
        <button
          // on click, switch to sites tab
          className={`folder-tab ${innerTab === SUBTABS.SITES ? 'active' : ''}`}
          onClick={switchToSites}
          aria-selected={innerTab === SUBTABS.SITES}
          role="tab"
        >
          Sites
        </button>
        <button
          // on click, switch to infrastructure tab
          className={`folder-tab ${
            innerTab === SUBTABS.INFRA ? 'active' : ''
          }`}
          onClick={switchToInfra}
          aria-selected={innerTab === SUBTABS.INFRA}
          role="tab"
        >
          Infrastructure Lines
        </button>
        <button
          // on click, switch to data submission tab
          className={`folder-tab ${innerTab === SUBTABS.SUBMIT ? 'active' : ''}`}
          onClick={() => setInnerTab(SUBTABS.SUBMIT)}
          aria-selected={innerTab === SUBTABS.SUBMIT}
          role="tab"
        >
          Submit Data
        </button>
      </div>
      <div className="folder-content">
        { /* render the selected inner tab content based on the current state */}
        {innerTab === SUBTABS.SITES && (
          <DataExplorerPanel
            onRowClick={handleSiteSelect}
            selectedId={selectedId}
            clearSelection={() => handleSelection(null, null)}
          />
        )}

        {/* render the infrastructure explorer with layers and selected site */}
        {innerTab === SUBTABS.INFRA && (
          <InfrastructureExplorer
            infrastructureLayers={infrastructureLayers}
            onToggleLayer={onToggleLayer}
            onLineSelect={handleLineSelect}
            selectedSite={selectedSite}
          />
        )}

        {/* render the data submission tab */}
        {innerTab === SUBTABS.SUBMIT && (
          <DataSubmitTab />
        )}
      </div>
    </div>
  );
}

// ====== User Menu / Account Button ====== //
function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // toggle user menu open/close state (the "blue person" and sign out dropdown)
  return (
    <div className="user-menu" style={{ position: 'relative' }}>
      <button
        // button to toggle user menu
        className="user-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--fg)',
          padding: '8px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >

        {/* display user initials or email */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--brand-color)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          <img
            src={accountDefault}
            alt="User avatar"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              objectFit: 'cover',
              background: 'var(--brand-color)',
              display: 'block',
            }}
          />
        </div>

        {/* display user email (//! currently not displayed) 
        */}
        <span>{user?.email}</span>
      </button>
      
      {isOpen && (
        <div

          // style of dropdown menu for user actions
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '160px',
            zIndex: 1000,
            marginTop: '4px',
          }}
        >
          <button

            // button to sign out
            onClick={() => {
              signOut();
              setIsOpen(false);
            }}

            // style of sign-out button
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}


// ====== Infrastructure Layers Subtab ====== //
function MainApp() {
  const { handleAuthCallback } = useAuth();
  const [tab, setTab] = useState(TOP_TABS[0]);
  const [dark, setDark] = useDarkMode();
  const [search, setSearch] = useState('');
  const [selectedPos, setSelectedPos] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const skipProgrammaticRef = useRef(false);

  // disaster & simulation state
  const [selectedDisaster, setSelectedDisaster] = useState('flood');
  const [simulationParams, setSimulationParams] = useState(() =>
    getDefaultParams('flood')           // default state is flood
  );

  // initial state of infrastucture lines
  const [infrastructureLayers, setInfrastructureLayers] = useState([
    {
      // electricity layer visualization and metadata - in I.L. panel
      key: 'electricity',
      displayName: 'Electricity',
      color: '#f6c23e',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM power' },
      enabled: true,
    },
    {
      // water layer visualization and metadata - in I.L. panel
      key: 'water',
      displayName: 'Water',
      color: '#36b9cc',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM' },
      enabled: false,
    },
    {
      // roads layer visualization and metadata - in I.L. panel
      key: 'road',
      displayName: 'Roads',
      color: '#38a169',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM highways' },
      enabled: false,
    },
    {
      // rail layer visualization and metadata - in I.L. panel
      key: 'rail',
      displayName: 'Rail',
      color: '#ff9999',
      geojson: { type: 'FeatureCollection', features: [] },
      metadata: { source: 'OSM rail' },
      enabled: false,
    },
  ]);

  // load osm infrastructure once on mount
  useEffect(() => {
    fetchOsmInfrastructure()
      .then(result => {
        setInfrastructureLayers(prev =>
          prev.map(layer => {

            // update each layer's geojson with the fetched data
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

  // this function is used to set the selected position and ID
  const handleSelection = useCallback((coords, id = null, label = null) => {

    // if skipProgrammaticRef is true, do not update search
    if (label !== null) {
      setSearch(label);
      skipProgrammaticRef.current = true;
    }
    setSelectedPos(coords);
    setSelectedId(id);
    setSelectedLine(null);
  }, []);

  // handle site selection from the data explorer
  const handleSiteSelect = useCallback((coords, id) => {
    handleSelection(coords, id);
  }, [handleSelection]);

  // handle line selection from the infrastructure explorer
  const handleLineSelect = useCallback(feature => {
    setSelectedLine(feature);
  }, []);

  // toggle infrastructure layer visibility
  const toggleLayer = useCallback(key => {
    setInfrastructureLayers(prev =>
      prev.map(l => (l.key === key ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);
  
  // handle top tab click to switch between Data Explorer and Simulation
  const handleTopTabClick = useCallback(t => setTab(t), []);

  // handle autocomplete suggestion selection
  const onSelectSuggestion = useCallback(
    p => {
      if (p) {
        handleSelection([+p.lat, +p.lon], null, p.display_name);
      }
    },
    [handleSelection]
  );

  // handle disaster change
  const handleDisasterClick = useCallback(d => {
    setSelectedDisaster(d);
    setSimulationParams(getDefaultParams(d));
  }, []);

  // ====== Header JS ====== //
  return (
    <div className={`app${dark ? ' dark' : ''}`}>
      <header className="header">

        {/* Enodia logo in the header */}
        <img src={logo} alt="Enodia logo" className="logo" />

        {/* search bar in the header */}
        <Autocomplete
          search={search}
          setSearch={value => {
            setSearch(value);
            skipProgrammaticRef.current = false;
          }}
          onSelectSuggestion={onSelectSuggestion}
          placeholder="Search city..."                // "Search city..." placeholder text in search bar
        />

        {/* tabs for data explorer and simulation */}
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
        {/* user menu in the header */}
        <UserMenu />


        {/* ====== Disaster Selector ====== */}
        {/* disaster selector only when simulation tab is active */}
        {tab === 'Simulation' && (
          <div className="disaster-selector" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {DISASTERS.map(d => {
              const ActiveIcon = d.Icon;
              return (
                <button
                  key={d.key}
                  className={`folder-tab ${selectedDisaster === d.key ? 'active' : ''}`}
                  onClick={() => handleDisasterClick(d.key)}            // on click, set the selected disaster
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

        
        {/* ====== Dark Mode ====== */}
        {/* dark mode toggle button */}
        <button
          className="toggle-button"
          onClick={() => setDark(d => !d)}
          aria-label="Toggle dark mode"
        >

          {/* dark mode icons */}
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* ====== Map ====== */}
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


        {/* ====== Data Explorer Sidebar ====== */}
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


            // ====== Simulation Panel Sidebar ====== //
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


// authenticate and run main app
export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainApp />
      </ProtectedRoute>
    </AuthProvider>
  );
}