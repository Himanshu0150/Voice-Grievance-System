import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Navbar from '../navbar/Navbar'
import Sidebar from '../sidebar/Sidebar'
import Footer from '../footer/Footer'
import ChatWidget from '../chat/ChatWidget'
import NotificationPoller from '../notifications/NotificationPoller'

export default function ProtectedLayout() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="page-loader"><div className="loader-spinner" /></div>
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-body">
        <Sidebar />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
      <NotificationPoller />
      <Footer />
    </div>
  )
}
