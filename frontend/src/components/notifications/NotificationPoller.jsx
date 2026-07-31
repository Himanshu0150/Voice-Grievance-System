import { useEffect, useRef } from 'react'
import { useNotification } from '../../context/NotificationContext'
import notificationService from '../../services/notificationService'

export default function NotificationPoller({ interval = 30000 }) {
  const { info } = useNotification()
  const lastCountRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let timer = null

    const check = async () => {
      try {
        const res = await notificationService.getUnreadCount()
        const count = res?.count ?? 0
        const last = lastCountRef.current
        if (last !== null && count > last) {
          try {
            const all = await notificationService.getAll({ limit: 3 })
            const list = all.notifications || all.data || []
            if (list.length > 0) {
              const newest = list.slice(0, count - last)
              newest.forEach(n => info(n.message, 8000))
            }
          } catch {
            // best-effort toast
          }
        }
        lastCountRef.current = count
      } catch {
        // ignore polling errors (e.g. offline)
      }
    }

    check()
    timer = setInterval(() => {
      if (!cancelled) check()
    }, interval)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [interval, info])

  return null
}
