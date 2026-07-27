import { classNames } from '../../utils/helpers'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className
}) {
  return (
    <div className={classNames('search-bar', className)}>
      <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="search-input"
      />
    </div>
  )
}
