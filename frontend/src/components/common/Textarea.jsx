import { classNames } from '../../utils/helpers'

export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  rows = 4,
  className,
  ...props
}) {
  return (
    <div className={classNames('form-group', className)}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={classNames('form-textarea', error && 'input-error')}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
