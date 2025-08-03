// utils/fetchOsmLines.js
export async function fetchOsmInfrastructure() {
  // Use the Kennebec County, Maine administrative area
  // First get the relation (or way/node) for Kennebec County
  const areaQuery = `
    [out:json][timeout:25];
    area["name"="Kennebec County"]["boundary"="administrative"]["admin_level"="6"];
    out ids;
  `;
  const areaRes = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: areaQuery,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!areaRes.ok) {
    throw new Error(`Overpass area lookup failed: ${areaRes.status}`);
  }
  const areaJson = await areaRes.json();
  if (!areaJson.elements || areaJson.elements.length === 0) {
    throw new Error('Could not find Kennebec County area');
  }

  // Overpass returns an "area" element already when you query with area[...] in this manner,
  // so the returned element should already be an area ID. But to be safe if it's a relation fallback:
  let rawId = areaJson.elements[0].id;
  // According to Overpass spec, area IDs for relations are relation_id + 3600000000.
  // If this element is less than 3600000000, assume it's a relation and add the offset.
  // (If Overpass already returned an area object, it will be >= 3600000000.)
  const AREA_OFFSET = 3600000000;
  const areaId = rawId >= AREA_OFFSET ? rawId : rawId + AREA_OFFSET;

  // Now fetch infrastructure within that area
  const infraQuery = `
    [out:json][timeout:50];
    area(${areaId})->.searchArea;
    (
      way["power"="line"](area.searchArea);
      way["man_made"="pipeline"]["pipeline"="water"](area.searchArea);
      way["utility"="water"](area.searchArea);
      way["highway"](area.searchArea);
      way["railway"](area.searchArea);
    );
    out geom;
  `;

  const infraRes = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: infraQuery,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!infraRes.ok) {
    throw new Error(`Overpass infrastructure fetch failed: ${infraRes.status}`);
  }
  const osm = await infraRes.json();

  // Convert to GeoJSON features
  const features = [];
  osm.elements.forEach(el => {
    if (el.type === 'way' && el.geometry) {
      const coords = el.geometry.map(g => [g.lon, g.lat]); // GeoJSON expects [lon, lat]
      let layerType = 'other';
      if (el.tags) {
        if (el.tags.power === 'line') layerType = 'electricity';
        else if (
          (el.tags.man_made === 'pipeline' && el.tags.pipeline === 'water') ||
          el.tags.utility === 'water'
        )
          layerType = 'water';
        else if (el.tags.highway) layerType = 'road';
        else if (el.tags.railway) layerType = 'rail';
      }

      features.push({
        type: 'Feature',
        properties: {
          id: el.id,
          ...el.tags,
          layerType,
        },
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      });
    }
  });

  const grouped = { electricity: [], water: [], road: [], rail: [], other: [] };
  features.forEach(f => {
    const key = f.properties.layerType || 'other';
    if (grouped[key]) grouped[key].push(f);
    else grouped.other.push(f);
  });

  return {
    electricity: { type: 'FeatureCollection', features: grouped.electricity },
    water: { type: 'FeatureCollection', features: grouped.water },
    road: { type: 'FeatureCollection', features: grouped.road },
    rail: { type: 'FeatureCollection', features: grouped.rail },
    other: { type: 'FeatureCollection', features: grouped.other },
  };
}
