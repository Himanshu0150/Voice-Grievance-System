export default function SkeletonLoader({ type = 'card', count = 1 }) {
  if (type === 'table') {
    return (
      <div className="table-skeleton">
        {Array.from({ length: count || 5 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell" style={{ width: '12%' }} />
            <div className="skeleton-cell" style={{ width: '30%' }} />
            <div className="skeleton-cell" style={{ width: '18%' }} />
            <div className="skeleton-cell" style={{ width: '15%' }} />
            <div className="skeleton-cell" style={{ width: '25%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card" />
        ))}
      </div>
    )
  }

  if (type === 'profile') {
    return (
      <div className="card card-padded">
        <div className="profile-card-content">
          <div className="skeleton skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text-lg" />
            <div className="skeleton skeleton-text-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'detail') {
    return (
      <div className="card card-padded">
        <div className="skeleton skeleton-text-lg" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        <div className="skeleton skeleton-text-sm" style={{ marginTop: 16 }} />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
      </div>
    )
  }

  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" />
      ))}
    </div>
  )
}
