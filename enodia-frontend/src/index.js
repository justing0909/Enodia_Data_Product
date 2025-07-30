// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';       // <-- named import!
import './index.css';
import 'leaflet/dist/leaflet.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);                  // <-- createRoot, not ReactDOM
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
