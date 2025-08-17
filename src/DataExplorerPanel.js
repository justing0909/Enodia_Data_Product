// src/DataExplorerPanel.js
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import sampleData from './data/sampleData.json';


export default function DataExplorerPanel({
  onRowClick,
  rows: propRows,
  selectedId,
  clearSelection,
}) {
  const [originalRows, setOriginalRows] = useState([]);
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('equals');
  const [filterValue, setFilterValue] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (propRows && Array.isArray(propRows)) {
      setOriginalRows(propRows);
    } else {
      setOriginalRows(sampleData);
    }
  }, [propRows]);

  const columns = useMemo(
    () => [
      { label: 'ID', key: 'id' },
      { label: 'Name', key: 'name' },
      { label: 'Latitude', key: 'lat' },
      { label: 'Longitude', key: 'lng' },
    ],
    []
  );

  const applyFilter = r => {
    if (!filterField || filterValue === '') return true;
    const v = String(r[filterField]).toLowerCase();
    const q = filterValue.toLowerCase();
    switch (filterOp) {
      case 'equals':
        return v === q;
      case 'contains':
        return v.includes(q);
      case 'gt':
        return parseFloat(r[filterField]) > parseFloat(filterValue);
      case 'lt':
        return parseFloat(r[filterField]) < parseFloat(filterValue);
      default:
        return true;
    }
  };

  const processedRows = useMemo(() => {
    let rows = originalRows.filter(applyFilter);
    if (sortCol != null) {
      const key = columns[sortCol].key;
      rows = [...rows].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        return sortDir === 'asc'
          ? a[key] < b[key]
            ? -1
            : 1
          : a[key] > b[key]
          ? -1
          : 1;
      });
    }
    return rows;
  }, [originalRows, filterField, filterOp, filterValue, sortCol, sortDir, columns]);

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginated = processedRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="panel" style={{ width: 'fit-content' }}>
      <h2 className="panel-title">Data Explorer</h2>
      <div style={{ marginBottom: '8px' }}>
        <button className="clear-button" onClick={clearSelection} disabled={!selectedId}>
          Clear Selection
        </button>
        <button
          className="desort-button"
          onClick={() => setSortCol(null)}
          disabled={sortCol == null}
        >
          De-sort Table
        </button>
      </div>

      <div className="filter-bar">
        <select
          value={filterField}
          onChange={e => {
            setFilterField(e.target.value);
            setPage(1);
          }}
        >
          <option value="">-- Field --</option>
          {columns.map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)}>
          <option value="equals">Equals</option>
          <option value="contains">Contains</option>
          <option value="gt">Greater Than</option>
          <option value="lt">Less Than</option>
        </select>
        <input
          type="text"
          placeholder="Value"
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          style={{ maxWidth: '60px' }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  onClick={() => {
                    if (sortCol === i) setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortCol(i);
                      setSortDir('asc');
                    }
                  }}
                >
                  {c.label}
                  {sortCol === i && (
                    <span className="sort-arrow">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr
                key={r.id}
                className={r.id === selectedId ? 'selected-row' : ''}
                onClick={() => onRowClick([r.lat, r.lng], r.id)}
              >
                {columns.map(c => (
                  <td key={c.key}>
                    {c.key.match(/lat|lng/) ? Number(r[c.key]).toFixed(4) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

DataExplorerPanel.propTypes = {
  onRowClick: PropTypes.func.isRequired,
  rows: PropTypes.array,
  selectedId: PropTypes.number,
  clearSelection: PropTypes.func.isRequired,
};
