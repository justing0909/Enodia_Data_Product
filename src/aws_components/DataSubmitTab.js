//* when ready to wire it to AWS, pass an `endpointUrl` and `onSubmit` that POSTs to the API.
import React, { useMemo, useState } from 'react';
import Toast from './toast';

export default function DataSubmitTab({
  endpointHint = "AWS API Gateway (POST) — add your URL",
  endpointUrl, // optional — used to render a cURL snippet
  onSubmit,    // optional — a function(payload) that actually does the POST later
}) {

  const SAMPLE_JSON =
  `{
    "type": "building",
    "num_floors": 3,
    "foundataion_type": "slab",
    "usage": "residential",
    "year_built": 1995,
    "metadata": {
      "lastUpdated": "2025-01-01",
      }
    }`;

  // state to manage form inputs, errors, and submission result
  const [form, setForm] = useState({
    name: "",
    type: "site",
    lat: "",
    lon: "",
    propsText: SAMPLE_JSON,
  });

  // state to manage validation errors and submission result
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // { message, payload }
  const payload = useMemo(() => buildPayload(form), [form]);

  // build the payload from the form state
  function buildPayload(f) {
    let props = {};
    try {
      // if empty or whitespace, use empty object
      // if it's the sample JSON, use empty object
      if (!f.propsText.trim() || !f.propsText || f.propsText === SAMPLE_JSON) {
        props = {};
       } else {
        props = JSON.parse(f.propsText);
      }
    } catch {}
    return {
      name: (f.name || "").trim(),
      type: (f.type || "").trim(),
      lat: f.lat === "" ? null : Number(f.lat),
      lon: f.lon === "" ? null : Number(f.lon),
      properties: props,
    };
  }

  // validate the payload
  function validate(p) {
    const e = {};
    if (!p.name) e.name = "Asset Name is Required";
    if (!p.type) e.type = "Asset Type is Required";
    if (p.lat === null || !Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) e.lat = "Please enter a valid latitude.";
    if (p.lon === null || !Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) e.lon = "Please enter a valid longitude.";
    try {
      // only validate JSON if there's content and it's not the sample
      if (form.propsText && form.propsText !== SAMPLE_JSON) {
        JSON.parse(form.propsText);
      }
    } catch {
      e.propsText = "Properties must be a valid JSON.";
    }
    return e;
  }

  // handle input changes
  function handleChange(field, value) {
    setForm((s) => ({ ...s, [field]: value }));
  }

  // handle form submission
  async function handleSubmit(e) {
    e.preventDefault();
    const eMap = validate(payload);
    setErrors(eMap);
    if (Object.keys(eMap).length) return;

    // front-end only
    const message = `Thanks for your submission! This feature still needs to connect to the dynamic AWS table.`;
    setResult({ message, payload });

    // if a developer provided onSubmit, allow them to tap into it (e.g., console.log or draft POST)
    try {
      if (typeof onSubmit === "function") await onSubmit(payload);
    } catch (err) {
      /* no-op for now */
    }
  }

  // copy JSON or cURL to clipboard with a toast confirmation
  const [showToast, setShowToast] = useState(false);
  function copy(text) {
    try { navigator.clipboard.writeText(text); 
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
  };

  const curl = endpointUrl
    ? `curl -X POST "${endpointUrl}" -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`
    : null;

  return (
    // main form container (header)
    <div className="panel simulation-panel" style={{ padding: 8 }}>
      <div className="filter-bar" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <h3 className="panel-title" style={{ margin: 0 }}>Data Submission Form (Beta)</h3>
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>*Required</span>
      </div>

      {/* main form for data submission */}
      <form onSubmit={handleSubmit} className="folder-content" style={{ padding: 12, marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>

            {/* Name field */}
            <label>Name*</label>
            <input value={form.name} onChange={(e)=>handleChange('name', e.target.value)} placeholder="e.g., Substation A" style={inputStyle(errors.name)} />
            {errors.name && <small style={errStyle}>{errors.name}</small>}
          </div>

          {/* Type field */}
          <div>
            <label>Type*</label>
            <input value={form.type} onChange={(e)=>handleChange('type', e.target.value)} placeholder="e.g., substation" style={inputStyle(errors.type)} />
            {errors.type && <small style={errStyle}>{errors.type}</small>}
          </div>

          {/* Latitude field */}
          <div>
            <label>Latitude*</label>
            <input value={form.lat} onChange={(e)=>handleChange('lat', e.target.value)} placeholder="43.6591" style={inputStyle(errors.lat)} />
            {errors.lat && <small style={errStyle}>{errors.lat}</small>}
          </div>

          {/* Longitude field */}
          <div>
            <label>Longitude*</label>
            <input value={form.lon} onChange={(e)=>handleChange('lon', e.target.value)} placeholder="-70.2568" style={inputStyle(errors.lon)} />
            {errors.lon && <small style={errStyle}>{errors.lon}</small>}
          </div>
        </div>

        {/* Properties (JSON) field */}
        <div style={{ marginTop: 12 }}>
          <label>Properties (JSON)</label>
          <textarea 
            rows={6} 
            value={form.propsText} 
            onChange={(e)=>handleChange('propsText', e.target.value)}
            onFocus={(e) => {
              if (e.target.value === SAMPLE_JSON) {
                handleChange('propsText', '');
              }
            }}
            onBlur={(e) => {
              if (e.target.value === '') {
                handleChange('propsText', SAMPLE_JSON);
              }
            }}
            style={{ 
              ...inputStyle(errors.propsText), 
              fontFamily: 'monospace', 
              fontSize: 12,
              color: form.propsText === SAMPLE_JSON ? '#aaa' : '#000',
              whiteSpace: 'pre',
              lineHeight: '1.4',
            }} 
          />
          {errors.propsText && <small style={errStyle}>{errors.propsText}</small>}
        </div>

        {/* Submit and Clear buttons */}
        <div className="filter-bar" style={{ marginTop: 12, gap: 8 }}>
          <button className="clear-button" type="submit">Submit</button>
          <button className="desort-button" type="button" onClick={()=>{ setForm({ name: "", type: "site", lat: "", lon: "", propsText: "{}" }); setErrors({}); setResult(null); }}>Clear</button>
          <span style={{ marginLeft: 8, color: 'var(--fg-muted)' }}>|</span>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Target: {endpointHint}</span>
        </div>
      </form>

      {result && (

        // Submission capture section
        <div className="folder-content" style={{ padding: 12, marginTop: 8 }}>
          <div style={{
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
            padding: 10, borderRadius: 8, marginBottom: 8
          }}>
            <strong>Submission captured.</strong>
            <div style={{ fontSize: 13 }}>{result.message}</div>
          </div>

          {/* Payload details */}
          <details open>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>View payload</summary>
            <pre style={preStyle}>{JSON.stringify(result.payload, null, 2)}</pre>
            <div style={{ display: 'flex', gap: 8 }}>

              {/* Copy JSON button */}
              <button className="clear-button" onClick={()=>copy(JSON.stringify(result.payload))}>Copy JSON</button>

              {/* Copy cURL button if endpointUrl is provided */}
              {curl && <button className="desort-button" onClick={()=>copy(curl)}>Copy cURL</button>}
            </div>
          </details>

          {/* Hint for endpointUrl */}
          {!endpointUrl && (
            <small style={{ color: 'var(--fg-muted)' }}>
              Add an <code>endpointUrl</code> prop to show a ready-to-post cURL snippet here.
            </small>
          )}
        </div>
      )}
      {showToast && (
        <Toast 
          message="JSON copied to clipboard" 
          onClose={() => setShowToast(false)} 
        />
      )}
    </div>
  );
}

// Styles
const inputStyle = (hasErr) => ({
  display: 'block', width: '100%', padding: '8px', borderRadius: 4,
  border: `1px solid var(--border)`, outline: 'none',
  boxShadow: hasErr ? '0 0 0 2px rgba(220, 38, 38, 0.25)' : 'none'
});
const errStyle = { color: 'crimson' };
const preStyle = { background: 'var(--bg-raised)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, overflowX: 'auto' };
