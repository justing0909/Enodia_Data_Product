import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PointsMap({ points }) {
  if (!points.length) return null;
  const center = [points[0].lat, points[0].lon];
  return (
    <MapContainer center={center} zoom={7} style={{ height: '400px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {points.map((point, idx) => (
        <Marker key={idx} position={[point.lat, point.lon]}>
          <Popup>
            <strong>{point.name}</strong><br />
            Type: {point.type}<br />
            Org: {point.org_id}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}