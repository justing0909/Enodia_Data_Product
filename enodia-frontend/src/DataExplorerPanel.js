import React, { useState, useEffect } from 'react';

export default function DataExplorerPanel({ onRowClick, rows: propRows }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (propRows) {
      setRows(propRows);
    } else {
      fetch('/api/points')
        .then(res => res.json())
        .then(data => setRows(data))
        .catch(console.error);
    }
  }, [propRows]);

  const filtered = rows.filter(r =>
    Object.values(r).some(val =>
      String(val).toLowerCase().includes(filter.toLowerCase())
    )
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="panel">
      <h2 className="panel-title">Data Explorer</h2>
      <input
        className="filter-input"
        type="text"
        placeholder="Filter..."
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(1); }}
      />
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Latitude</th>
              <th>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id} onClick={() => onRowClick([r.lat, r.lng])}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.lat.toFixed(4)}</td>
                <td>{r.lng.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}