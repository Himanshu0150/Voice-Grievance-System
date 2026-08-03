import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../../components/common/SearchBar'
import Select from '../../components/common/Select'
import DataTable from '../../components/tables/DataTable'
import StatusChip from '../../components/common/StatusChip'
import Pagination from '../../components/common/Pagination'
import ErrorState from '../../components/common/ErrorState'
import { formatDate } from '../../utils/helpers'
import { COMPLAINT_CATEGORIES } from '../../utils/constants'
import complaintService from '../../services/complaintService'

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Work Started', label: 'Work Started' },
  { value: 'Inspection', label: 'Inspection' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Rejected', label: 'Rejected' }
]

const categoryOptions = [
  { value: '', label: 'All Categories' },
  ...COMPLAINT_CATEGORIES.map(c => ({ value: c, label: c }))
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alpha', label: 'Alphabetical' }
]

export default function ComplaintHistory() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadComplaints()
  }, [statusFilter, categoryFilter, page])

  const loadComplaints = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        search,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        sort,
        page,
        limit: 10
      }
      const data = await complaintService.getUserComplaints(params)
      setComplaints(data.complaints || data.data || data || [])
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1)
    } catch (err) {
      setError('Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadComplaints()
  }

  const columns = [
    { header: 'ID', accessor: 'complaintId', width: '140px', render: (row) => row.complaintId || `#${row.id}` },
    { header: 'Title', accessor: 'title', render: (row) => row.title?.substring(0, 50) },
    { header: 'Category', accessor: 'category' },
    { header: 'Department', accessor: 'departmentName', render: (row) => row.departmentName || '-' },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusChip status={row.status} />
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => <span className={`priority-badge priority-${row.priority?.toLowerCase()}`}>{row.priority || 'Medium'}</span>
    },
    {
      header: 'Supporters',
      accessor: 'supporterCount',
      render: (row) => row.supporterCount > 0 ? `\u2605 ${row.supporterCount}` : '-'
    },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (row) => formatDate(row.createdAt)
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Complaints</h2>
        <p>Track and manage your submitted complaints</p>
      </div>

      <div className="table-toolbar">
        <div className="toolbar-left">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            placeholder="Search by ID, title, or category..."
          />
          <Select name="status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} options={statusOptions} />
          <Select name="category" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }} options={categoryOptions} />
          <Select name="sort" value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} />
        </div>
      </div>

      <div className="table-container">
        <DataTable
          columns={columns}
          data={complaints}
          loading={loading}
          onRowClick={(row) => navigate(`/complaints/${row.id}`)}
          emptyMessage="No complaints found. Submit your first complaint!"
        />
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
