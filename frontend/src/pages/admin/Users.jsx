import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../../components/common/SearchBar'
import DataTable from '../../components/tables/DataTable'
import Pagination from '../../components/common/Pagination'
import Button from '../../components/common/Button'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ErrorState from '../../components/common/ErrorState'
import { formatDate, getInitials } from '../../utils/helpers'
import { useNotification } from '../../context/NotificationContext'
import adminService from '../../services/adminService'

export default function AdminUsers() {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [confirmAction, setConfirmAction] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [page])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getAllUsers({ search, page, limit: 10 })
      setUsers(data.users || data.data || data || [])
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId) => {
    setProcessing(true)
    try {
      await adminService.toggleUserStatus(userId)
      success('User status updated')
      loadUsers()
    } catch (err) {
      showError('Failed to update user status')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    setProcessing(true)
    try {
      await adminService.deleteUser(userId)
      success('User deleted successfully')
      loadUsers()
    } catch (err) {
      showError('Failed to delete user')
    } finally {
      setProcessing(false)
      setConfirmAction(null)
    }
  }

  const columns = [
    { header: 'User ID', accessor: 'userId', width: '120px' },
    {
      header: 'User',
      accessor: 'fullName',
      render: (row) => (
        <div className="user-cell">
          <div className="user-avatar-sm">{getInitials(row.fullName)}</div>
          <div>
            <p className="user-name">{row.fullName}</p>
            <p className="user-email">{row.email}</p>
          </div>
        </div>
      )
    },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Village', accessor: 'village' },
    { header: 'District', accessor: 'district' },
    { header: 'Complaints', accessor: 'complaintCount', render: (row) => row.complaintCount || 0 },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <span className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { header: 'Joined', accessor: 'createdAt', render: (row) => formatDate(row.createdAt) },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="action-btns">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/complaints?userId=${row.id}`) }}>
            Complaints
          </Button>
          <Button size="sm" variant={row.isActive ? 'warning' : 'success'} onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'toggle', user: row }) }}>
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete', user: row }) }}>
            Delete
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Manage Users</h2>
        <p>View and manage registered citizens</p>
      </div>

      <div className="table-toolbar">
        <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or phone..." />
      </div>

      <div className="table-container">
        <DataTable columns={columns} data={users} loading={loading} emptyMessage="No users found." />
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction.type === 'toggle') handleToggleStatus(confirmAction.user.id)
          else handleDeleteUser(confirmAction.user.id)
        }}
        title={confirmAction?.type === 'toggle' ? 'Toggle User Status' : 'Delete User'}
        message={confirmAction?.type === 'toggle'
          ? `Are you sure you want to ${confirmAction?.user?.isActive ? 'deactivate' : 'activate'} ${confirmAction?.user?.fullName}?`
          : `Are you sure you want to permanently delete ${confirmAction?.user?.fullName}? This action cannot be undone.`
        }
        variant={confirmAction?.type === 'delete' ? 'danger' : 'warning'}
        loading={processing}
      />
    </div>
  )
}
