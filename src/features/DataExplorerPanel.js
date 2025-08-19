// src/DataExplorerPanel.js
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import sampleData from './points/sampleData.json';

// data explorer panel component
export default function DataExplorerPanel({
  onRowClick,
  rows: propRows,
  selectedId,
  clearSelection,
}) {

  // state to manage the original rows, filter, sort, and pagination
  const [originalRows, setOriginalRows] = useState([]);
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('equals');
  const [filterValue, setFilterValue] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // effect to initialize original rows from props or sample data
  useEffect(() => {
    if (propRows && Array.isArray(propRows)) {      // if propRows is provided, use it
      setOriginalRows(propRows);
    } else {
      setOriginalRows(sampleData);                  // fallback to sample data if no rows provided
    }
  }, [propRows]);

  // initial data table structure
  const columns = useMemo(
    () => [
      { label: 'ID', key: 'id' },
      { label: 'Name', key: 'name' },
      { label: 'Latitude', key: 'lat' },
      { label: 'Longitude', key: 'lng' },
    ],
    []
  );

  // function to apply filter based on selected field, operation, and value
  const applyFilter = r => {
    // default filter state
    if (!filterField || filterValue === '') return true;

    // convert field value to lowercase for case-insensitive comparison
    const v = String(r[filterField]).toLowerCase();
    const q = filterValue.toLowerCase();
    
    // filter operations
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

  // memoized processed rows based on filter and sort criteria
  const processedRows = useMemo(() => {
    let rows = originalRows.filter(applyFilter);

    // apply sorting if a column is selected
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

  // pagination logic
  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginated = processedRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    // Data Explorer panel UI
    <div className="panel" style={{ width: 'fit-content' }}>
      <h2 className="panel-title">Data Explorer</h2>
      <div style={{ marginBottom: '8px' }}>

        {/* "clear" button */}
        <button className="clear-button" onClick={clearSelection} disabled={!selectedId}>
          Clear Selection
        </button>

        {/* "de-sort" button */}
        <button
          className="desort-button"
          onClick={() => setSortCol(null)}
          disabled={sortCol == null}
        >
          De-sort Table
        </button>
      </div>

      {/* Filter and sort controls */}
      <div className="filter-bar">
        <select
          value={filterField}
          onChange={e => {
            setFilterField(e.target.value);
            setPage(1);
          }}
        >

          {/* Dropdown for selecting filter field */}
          <option value="">-- Field --</option>
          {columns.map(c => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>

        {/* SQL Operation dropdown (default "Equals") */}
        <select value={filterOp} onChange={e => setFilterOp(e.target.value)}>
          <option value="equals">Equals</option>
          <option value="contains">Contains</option>
          <option value="gt">Greater Than</option>
          <option value="lt">Less Than</option>
        </select>

        {/* Input for filter value */}
        <input
          type="text"
          placeholder="Value"
          value={filterValue}
          onChange={e => setFilterValue(e.target.value)}
          style={{ maxWidth: '60px' }}
        />
      </div>

      {/* Data table */}
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

          {/* Highlight selected row from table on map */}
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

      {/* Pagination controls */}
      <div className="pagination">

        {/* "previous" page button */}
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Prev
        </button>

        {/* Page __ of __ */}
        <span>
          Page {page} of {totalPages}
        </span>

        {/* "next" page button */}
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

// PropTypes for DataExplorerPanel
DataExplorerPanel.propTypes = {
  onRowClick: PropTypes.func.isRequired,
  rows: PropTypes.array,
  selectedId: PropTypes.number,
  clearSelection: PropTypes.func.isRequired,
};
