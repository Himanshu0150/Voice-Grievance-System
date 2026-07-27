export default function DataTable({ columns, data, onRowClick, loading, emptyMessage = 'No data found' }) {
  if (loading) {
    return (
      <div className="table-skeleton">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-row">
            {columns.map((col, j) => (
              <div key={j} className="skeleton-cell" style={{ width: col.width || 'auto' }} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <div className="table-empty">{emptyMessage}</div>
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
