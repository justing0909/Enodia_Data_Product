import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIconUrl from './assets/marker.png';

const CENTER = [43.6591, -70.2568];
const lightURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const darkURL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const customIcon = new L.Icon({ iconUrl: markerIconUrl, iconSize: [30,30], iconAnchor: [15,30] });

// Component to update map view when position changes
function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 12, { animate: true });
    }
  }, [position, map]);
  return null;
}

export default function PointsMap({ dark, highlightPos }) {
  const mapRef = useRef();
  const url = dark ? darkURL : lightURL;

  return (
    <MapContainer center={CENTER} zoom={12}
      style={{ height: '100%', width: '100%' }}
      whenCreated={m => mapRef.current = m}
    >
      <TileLayer attribution="© OpenStreetMap contributors" url={url} />
      {highlightPos && <MapFlyTo position={highlightPos} />}
      {highlightPos && (
        <Marker position={highlightPos} icon={customIcon}>
          <Popup>Selected Point</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}