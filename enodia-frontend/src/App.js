// App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import PointsMap from './PointsMap';
import { Sun, Moon, Search } from 'lucide-react';
import logo from './assets/Enodia_PNG_02_Transparent_BG.png'; // ← drop your logo here

function AnalysisPanel() {
  return (
    <div className="panel">
      <h2 className="panel-title">Analysis</h2>
      <p className="panel-text">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. 
        Praesent libero. Sed cursus ante dapibus diam.
      </p>

      <div className="stats-grid">
        <div className="card">
          <h3 className="card-heading">Savings</h3>
          <p className="card-value">$5,000</p>
          <p className="card-desc">on maintenance repairs</p>
        </div>
        <div className="card">
          <h3 className="card-heading">Time Saved</h3>
          <p className="card-value">20 hrs</p>
          <p className="card-desc">of repair work</p>
        </div>
        <div className="card">
          <h3 className="card-heading">People Redirected</h3>
          <p className="card-value">15</p>
          <p className="card-desc">to priority tasks</p>
        </div>
      </div>
    </div>
  );
}

function SimulationPanel() {
  const [wind, setWind] = useState(50);
  const [precip, setPrecip] = useState(10);
  const [scenario, setScenario] = useState('Hurricane');

  const runSimulation = () => {
    console.log({ wind, precip, scenario });
    // TODO: hook into your simulation logic
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
        />{' '}mph
      </div>

      <div className="control-group">
        <label>Precipitation:</label>
        <input
          type="number"
          value={precip}
          onChange={e => setPrecip(+e.target.value)}
        />{' '}in
      </div>

      <div className="control-group">
        <button
          className={`scenario-button ${
            scenario === 'Hurricane' ? 'active-scenario' : ''
          }`}
          onClick={() => setScenario('Hurricane')}
        >
          &lt; Hurricane &gt;
        </button>
      </div>

      <button className="simulate-button" onClick={runSimulation}>
        Simulate
      </button>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('Analysis');
  const [dark, setDark] = useState(
    () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  console.log('🚀 App rendering', { tab, dark });

  // Optional: persist across reloads
  useEffect(() => {
    localStorage.setItem('darkMode', dark);
  }, [dark]);

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
               if (e.key === 'Enter') setSearchQuery(search);
             }}
           />
         </div>

         <div className="tabs">
          {['Analysis','Simulation'].map(t => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>
        <button
           className="toggle-button"
           onClick={() => setDark(d => !d)}
         >
           {dark ? <Sun size={20} /> : <Moon size={20} />}
         </button>
      </header>

      <div className="map-container">
        <PointsMap
          dark={dark}
          searchQuery={searchQuery}
        />
      </div>
      <aside className="sidebar">
        {tab === 'Analysis' ? <AnalysisPanel/> : <SimulationPanel/>}
      </aside>
    </div>
  );
}

export default App;