import { classNames } from '../../utils/helpers'

export default function Badge({ children, variant = 'primary', className }) {
  return (
    <span className={classNames('badge', `badge-${variant}`, className)}>
      {children}
    </span>
  )
}
