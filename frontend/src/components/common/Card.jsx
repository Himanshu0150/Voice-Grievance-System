import { classNames } from '../../utils/helpers'

export default function Card({
  children,
  className,
  padding = true,
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      className={classNames(
        'card',
        padding && 'card-padded',
        hover && 'card-hover',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={classNames('card-header', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...props }) {
  return (
    <div className={classNames('card-body', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div className={classNames('card-footer', className)} {...props}>
      {children}
    </div>
  )
}
