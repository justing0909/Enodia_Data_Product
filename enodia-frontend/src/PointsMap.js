import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIconUrl from './assets/marker.png';

const CENTER = [43.6591, -70.2568];
const lightURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const darkURL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const customIcon = new L.Icon({ iconUrl: markerIconUrl, iconSize: [30,30], iconAnchor: [15,30] });

export default function PointsMap({ dark, highlightPos }) {
  const mapRef = useRef();
  const url = dark ? darkURL : lightURL;

  useEffect(() => {
    if (highlightPos && mapRef.current) {
      mapRef.current.setView(highlightPos, 12);
    }
  }, [highlightPos]);

  return (
    <MapContainer center={CENTER} zoom={12} style={{ height: '100%', width: '100%' }} whenCreated={m => mapRef.current = m}>
      <TileLayer attribution="© OpenStreetMap contributors" url={url} />
      {highlightPos && (
        <Marker position={highlightPos} icon={customIcon}>
          <Popup>Selected Point</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}