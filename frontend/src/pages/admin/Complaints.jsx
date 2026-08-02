import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from '../../components/common/SearchBar'
import Select from '../../components/common/Select'
import DataTable from '../../components/tables/DataTable'
import StatusChip from '../../components/common/StatusChip'
import EmotionBadge from '../../components/common/EmotionBadge'
import Pagination from '../../components/common/Pagination'
import ErrorState from '../../components/common/ErrorState'
import { formatDate } from '../../utils/helpers'
import { COMPLAINT_CATEGORIES } from '../../utils/constants'
import adminService from '../../services/adminService'

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

const perPageOptions = [
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' }
]

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'alpha', label: 'Alphabetical' },
  { value: 'priority', label: 'Priority' }
]

export default function AdminComplaints() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [villageFilter, setVillageFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [perPage, setPerPage] = useState('10')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const userIdParam = searchParams.get('userId')

  useEffect(() => {
    loadComplaints()
  }, [statusFilter, categoryFilter, departmentFilter, villageFilter, page, perPage])

  const loadComplaints = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getComplaints({
        search,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        departmentId: departmentFilter || undefined,
        village: villageFilter || undefined,
        userId: userIdParam || undefined,
        sort,
        page,
        limit: parseInt(perPage)
      })
      setComplaints(data.complaints || data.data || data || [])
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / parseInt(perPage)) || 1)
    } catch {
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
    { header: 'Title', accessor: 'title', render: (row) => row.title?.substring(0, 40) },
    { header: 'User', accessor: 'userName', render: (row) => row.userName || 'Anonymous' },
    { header: 'Category', accessor: 'category' },
    { header: 'Department', accessor: 'departmentName', render: (row) => row.departmentName || '-' },
    { header: 'Village', accessor: 'village' },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => <span className={`priority-badge priority-${row.priority?.toLowerCase()}`}>{row.priority || 'Medium'}</span>
    },
    { header: 'Emotion', accessor: 'emotion', render: (row) => <EmotionBadge emotion={row.emotion} confidence={row.emotionConfidence} /> },
    { header: 'Supporters', accessor: 'supporterCount', render: (row) => row.supporterCount > 0 ? `\u2605 ${row.supporterCount}` : '-' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusChip status={row.status} /> },
    { header: 'Date', accessor: 'createdAt', render: (row) => formatDate(row.createdAt) }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>All Complaints</h2>
        <p>Manage and resolve citizen complaints</p>
      </div>

      <div className="table-toolbar">
        <div className="search-group">
          <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, title, user..." />
          <button className="btn btn-sm btn-primary" onClick={handleSearch}>Search</button>
        </div>
        <Select name="status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} options={statusOptions} />
        <Select name="category" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }} options={categoryOptions} />
        <input type="text" className="form-input filter-input" placeholder="Village" value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1) }} />
        <Select name="sort" value={sort} onChange={(e) => setSort(e.target.value)} options={sortOptions} />
        <Select name="perPage" value={perPage} onChange={(e) => { setPerPage(e.target.value); setPage(1) }} options={perPageOptions} />
      </div>

      <div className="table-container">
        <DataTable
          columns={columns}
          data={complaints}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/complaints/${row.id}`)}
          emptyMessage="No complaints found."
        />
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
