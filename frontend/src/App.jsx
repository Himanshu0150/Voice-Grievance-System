import { Routes, Route } from 'react-router-dom'
import PublicLayout from './components/layout/PublicLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedLayout from './components/layout/ProtectedLayout'
import NotificationToast from './components/notifications/NotificationToast'

import Home from './pages/common/Home'
import NotFound from './pages/common/NotFound'
import ServerError from './pages/common/ServerError'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AdminLogin from './pages/auth/AdminLogin'
import UserDashboard from './pages/user/Dashboard'
import NewComplaint from './pages/user/NewComplaint'
import ComplaintHistory from './pages/user/ComplaintHistory'
import UserComplaintDetails from './pages/user/ComplaintDetails'
import UserProfile from './pages/user/Profile'
import UserFeedback from './pages/user/Feedback'
import UserNotifications from './pages/user/Notifications'
import AdminDashboard from './pages/admin/Dashboard'
import AdminComplaints from './pages/admin/Complaints'
import AdminComplaintDetail from './pages/admin/ComplaintDetail'
import AdminUsers from './pages/admin/Users'
import AdminDepartments from './pages/admin/Departments'
import AdminAnalytics from './pages/admin/Analytics'
import AdminReports from './pages/admin/Reports'
import AdminSettings from './pages/admin/Settings'
import AdminHeatmap from './pages/admin/Heatmap'
import ChatWidget from './components/chat/ChatWidget'

export default function App() {
  return (
    <>
      <NotificationToast />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Route>

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/new-complaint" element={<NewComplaint />} />
          <Route path="/complaints" element={<ComplaintHistory />} />
          <Route path="/complaints/:id" element={<UserComplaintDetails />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/feedback" element={<UserFeedback />} />
          <Route path="/notifications" element={<UserNotifications />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/complaints" element={<AdminComplaints />} />
          <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
          <Route path="/admin/heatmap" element={<AdminHeatmap />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/departments" element={<AdminDepartments />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
