// src/PointsMap.js
import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, CircleMarker } from 'react-leaflet';
import markerIconUrl from '../../img_assets/marker.png';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// custom marker icon stylization
const siteIcon = new L.Icon({
  iconUrl: markerIconUrl,         // from assets folder
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
  shadowUrl: null,
});

// center on Lahaina / Maui County
const DEFAULT_CENTER = [20.884215698247573, -156.67333867620937]; 
const DEFAULT_ZOOM = 14;

// component to sync map view with highlight position. this will pan to higlighted position if provided
function MapViewSync({ highlightPos }) {
  const map = useMap();
  const initialized = useRef(false);

  // if highlightPos is provided and map already exists, pan to it but keep zoom.
  useEffect(() => {
    if (highlightPos) {
      if (!initialized.current) {
        map.setView(highlightPos, map.getZoom()); // zoom from first selection
        initialized.current = true;
      } else {
        map.panTo(highlightPos, { animate: true });
      }
    }
  }, [highlightPos, map]);

  return null;
}

// component to handle map clicks for deselection
function MapClickHandler({ onLineSelect, selectedLine }) {
  const map = useMap();

  // handle map click to deselect line if one is selected
  useEffect(() => {
    const handleMapClick = (e) => {
      // only deselect if there's currently a selected line                 // TODO: also apply this when popup is X'd out
      if (selectedLine && onLineSelect) {
        onLineSelect(null);
      }
    };

    // attach click handler to map
    map.on('click', handleMapClick);

    // cleanup function to remove the click handler
    // this prevents memory leaks and ensures the handler is removed when component unmounts
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onLineSelect, selectedLine]);

  return null;
}

// main PointsMap component (renders the Leaflet map)
export default function PointsMap({
  dark,
  highlightPos,
  infrastructureLayers = [],
  selectedSiteId,
  selectedLine,
  onLineSelect,
}) {

  // refs to store map instance and current popup
  const mapRef = useRef();
  const currentPopupRef = useRef(null);
  const layerRefsRef = useRef(new Map()); // store references to all layers

  // fixed style function with proper selection logic
  const getLineStyle = (layer, feature) => {
    const baseColor = layer.color;
    
    // check if this feature is the selected one
    const isSelected = selectedLine && 
      feature.properties && 
      selectedLine.properties && 
      feature.properties.id === selectedLine.properties.id;
    
    // style of the line based on selection state
    return {
      color: isSelected ? '#d9a3ff' : baseColor,
      weight: isSelected ? 6 : 3,
      opacity: 1,
      dashArray: layer.key === 'road' ? null : null,
    };
  };

  // handle click on a line feature with toggle functionality
  const onEachLine = (layerObj, layerDef) => (feature, layer) => {
    
    // store layer reference for manual style updates
    const featureId = feature.properties?.id;
    if (featureId) {
      layerRefsRef.current.set(featureId, { layer, layerDef });
    }
    
    // bind click event to toggle selection
    layer.on({
      click: (e) => {
        
        // prevent map click event from firing
        L.DomEvent.stopPropagation(e);
        
        // create proper popup content (and style)
        const popupContent = `<div style="min-width:160px; font-size:14px;">
          <strong style="color: #333;">${layerDef.displayName}</strong><br/>
          <strong>ID:</strong> ${feature.properties.id || 'n/a'}<br/>
          ${Object.entries(feature.properties)
            .filter(([k]) => k !== 'layerType' && k !== 'id')
            .map(([k, v]) => `<div style="margin-top: 4px;"><strong>${k}:</strong> ${v}</div>`)
            .join('')}
        </div>`;
        
        
        // close any existing popup first
        if (currentPopupRef.current) {
          currentPopupRef.current.closePopup();
          currentPopupRef.current = null;
        }
        
        try {
          // popup with options for better persistence
          layer.bindPopup(popupContent, {
            closeOnClick: false,
            autoClose: false,
            closeOnEscapeKey: true
          }).openPopup();
          currentPopupRef.current = layer;
        } catch (error) {
        }
        
        if (onLineSelect) {
          // handle selection immediately - no re-render, just manual style updates
          const wasSelected = selectedLine && 
            feature.properties?.id === selectedLine.properties?.id;
          
          // toggle selection state
          if (wasSelected) {

            // deselect this line...
            onLineSelect(null);
            // ...and close popup when deselecting
            setTimeout(() => {
              if (currentPopupRef.current) {
                currentPopupRef.current.closePopup();
                currentPopupRef.current = null;
              }
            }, 50);

          } else { // select this line
            onLineSelect(feature);
          }
        }
      }
    });
  };

  // update styles manually when selection changes, without re-rendering
  useEffect(() => {
    layerRefsRef.current.forEach(({ layer, layerDef }, featureId) => {
      const isSelected = selectedLine && selectedLine.properties?.id === featureId;
      
      // apply styles based on selection state
      if (isSelected) {
        layer.setStyle({
          color: '#d9a3ff',
          weight: 6,
          opacity: 1,
        });
        
        // this specific line ensures that the line doesn't change
        // to the original color when mouseout.
        layer.off('mouseout');

        // add mouseover handler back for selected lines (for consistency)
        layer.off('mouseover');
        layer.on('mouseover', () => {

          // selected lines don't need hover effects, keep purple
          layer.setStyle({
            color: '#d9a3ff',
            weight: 6,
            opacity: 1,
          });
        });
        
        // reset to original style for unselected lines //
      } else { 
        layer.setStyle({
          color: layerDef.color, // original color
          weight: 3,
          opacity: 1,
        });

        // restore normal hover behavior for unselected lines
        layer.off('mouseover');
        layer.off('mouseout');

        // bolden line when cursor hovers over it
        layer.on('mouseover', () => {
          layer.setStyle({ 
            color: layerDef.color,
            weight: 5,              // bold
            opacity: 1
          });
        });
        
        // reset style when cursor leaves
        layer.on('mouseout', () => {
          layer.setStyle({
            color: layerDef.color,
            weight: 3,
            opacity: 1
          });
        });
      }
    });
  }, [selectedLine]);


  // use completely stable keys - no re-renders based on selection
  const renderedLayers = useMemo(() => {
    
    // filter out layers that are not enabled or have no features
    return infrastructureLayers
      .filter(l => l.enabled && l.geojson && l.geojson.features && l.geojson.features.length)
      .map(layer => {
        return (
          <GeoJSON
            key={`${layer.key}-stable`} // completely stable key
            data={layer.geojson}
            style={feature => getLineStyle(layer, feature)}
            onEachFeature={onEachLine(null, layer)}
          />
        );
      });
  }, [infrastructureLayers]); // only re-render when layers themselves change

  // close popup when selection changes externally (like map click deselection)
  useEffect(() => {
    if (!selectedLine && currentPopupRef.current) {
      currentPopupRef.current.closePopup();
      currentPopupRef.current = null;
    }
  }, [selectedLine]);

  // selected site coordinates from sampleSites or passed in
  // const selectedSitePosition = useMemo(() => {
  //   if (!selectedSiteId) return null;
  //   return null;
  // }, [selectedSiteId]); 

  // resize observer or similar could be added to invalidate map size if parent dimensions change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize?.();
    }
  }, []);

  return (
    // map at start up
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      whenCreated={mapInstance => {
        mapRef.current = mapInstance;
      }}
      scrollWheelZoom={true}              // zoom in and out tool
    >

      {/* sync map view with highlight position */}
      <MapViewSync highlightPos={highlightPos} />
      <MapClickHandler onLineSelect={onLineSelect} selectedLine={selectedLine} />
      
      {/* tile layer for the map background */}
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url={
          dark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }
      />

      {/* render infrastructure line layers */}
      {renderedLayers}

      {/* popup for point data */}                              {/* //TODO: update point popups with more db data // */}
      {highlightPos && (
        <Marker position={highlightPos} icon={siteIcon}>
          <Popup>
            <div>
              <strong>Selected Site</strong>
              <div>Coordinates: {highlightPos[0].toFixed(5)}, {highlightPos[1].toFixed(5)}</div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}