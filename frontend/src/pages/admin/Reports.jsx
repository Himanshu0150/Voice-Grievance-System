import { useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import Input from '../../components/common/Input'
import DataTable from '../../components/tables/DataTable'
import StatusChip from '../../components/common/StatusChip'
import { useNotification } from '../../context/NotificationContext'
import { formatDate } from '../../utils/helpers'
import adminService from '../../services/adminService'

const reportTypes = [
  { value: 'summary', label: 'Summary Report' },
  { value: 'detailed', label: 'Detailed Report' },
  { value: 'department', label: 'Department-wise' },
  { value: 'village', label: 'Village-wise' }
]

export default function AdminReports() {
  const { success, error: showError } = useNotification()
  const [reportType, setReportType] = useState('summary')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)

  const generateReport = async () => {
    setGenerating(true)
    try {
      const data = await adminService.getReports({
        type: reportType,
        from: fromDate,
        to: toDate
      })
      setReportData(data)
      success('Report generated successfully')
    } catch (err) {
      showError('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const downloadCSV = () => {
    if (!reportData) return
    const rows = reportData.data || reportData.complaints || reportData.rows || reportData || []
    const arr = Array.isArray(rows) ? rows : [rows]
    if (!arr.length) return
    const headers = Object.keys(arr[0])
    const csvContent = [
      headers.join(','),
      ...arr.map(row => headers.map(h => {
        let val = row[h] ?? ''
        val = String(val).replace(/"/g, '""')
        return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val
      }).join(','))
    ].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grievance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = () => {
    if (!reportData) return
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grievance-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    window.print()
  }

  const reportColumns = reportData?.columns || [
    { header: 'ID', accessor: 'id' },
    { header: 'Title', accessor: 'title' },
    { header: 'Category', accessor: 'category' },
    { header: 'Status', accessor: 'status', render: (row) => <StatusChip status={row.status} /> },
    { header: 'Date', accessor: 'createdAt', render: (row) => formatDate(row.createdAt) }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Reports</h2>
        <p>Generate and download complaint reports</p>
      </div>

      <div className="reports-layout">
        <Card className="report-controls">
          <h3>Report Parameters</h3>
          <Select
            label="Report Type"
            name="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reportTypes}
          />
          <div className="form-row-grid">
            <Input label="From Date" name="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To Date" name="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="report-actions">
            <Button onClick={generateReport} loading={generating} fullWidth>
              Generate Report
            </Button>
            {reportData && (
              <div className="report-download-actions">
                <Button variant="secondary" onClick={downloadCSV}>
                  Download CSV
                </Button>
                <Button variant="secondary" onClick={downloadJSON}>
                  Download JSON
                </Button>
                <Button variant="secondary" onClick={printReport}>
                  Print
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="report-preview">
          <h3>Report Preview</h3>
          {reportData ? (
            <>
              <div className="report-summary">
                <p>Total Complaints: <strong>{reportData.total || reportData.length || 0}</strong></p>
              </div>
              <DataTable
                columns={reportColumns}
                data={reportData.data || reportData.complaints || reportData.rows || reportData || []}
                emptyMessage="No data for this report."
              />
            </>
          ) : (
            <div className="report-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p>Select parameters and generate a report</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
