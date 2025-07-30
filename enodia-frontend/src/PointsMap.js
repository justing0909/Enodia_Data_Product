import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const CENTER = [43.6591, -70.2568];
const lightURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const darkURL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export default function PointsMap({ dark, searchQuery, highlightPos }) {
  const mapRef = useRef();
  const url = dark ? darkURL : lightURL;

  useEffect(() => {
    if (!searchQuery || !mapRef.current) return;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        searchQuery
      )}`
    )
      .then(r => r.json())
      .then(data => {
        if (data[0]) {
          const { lat, lon } = data[0];
          mapRef.current.setView([+lat, +lon], 12);
        }
      })
      .catch(console.error);
  }, [searchQuery]);

  return (
    <MapContainer
      center={CENTER}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      whenCreated={map => { mapRef.current = map; }}
    >
      <TileLayer attribution="© OpenStreetMap contributors" url={url} />
      {highlightPos && (
        <Marker position={highlightPos}>
          <Popup>Selected Point</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}