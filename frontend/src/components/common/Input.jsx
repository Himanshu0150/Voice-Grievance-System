import { classNames } from '../../utils/helpers'

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  icon,
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
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={classNames('form-input', icon && 'has-icon', error && 'input-error')}
          {...props}
        />
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
