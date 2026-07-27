import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Textarea from '../../components/common/Textarea'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import DataTable from '../../components/tables/DataTable'
import ErrorState from '../../components/common/ErrorState'
import { useNotification } from '../../context/NotificationContext'
import adminService from '../../services/adminService'

export default function AdminDepartments() {
  const { success, error: showError } = useNotification()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDept, setEditDept] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ departmentName: '', description: '' })

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getDepartments()
      setDepartments(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditDept(null)
    setForm({ departmentName: '', description: '' })
    setModalOpen(true)
  }

  const openEdit = (dept) => {
    setEditDept(dept)
    setForm({ departmentName: dept.departmentName, description: dept.description || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.departmentName.trim()) {
      showError('Department name is required')
      return
    }
    setSaving(true)
    try {
      if (editDept) {
        await adminService.updateDepartment(editDept.id, form)
        success('Department updated')
      } else {
        await adminService.createDepartment(form)
        success('Department created')
      }
      setModalOpen(false)
      loadDepartments()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setSaving(true)
    try {
      await adminService.deleteDepartment(id)
      success('Department deleted')
      loadDepartments()
    } catch (err) {
      showError('Failed to delete department')
    } finally {
      setSaving(false)
      setConfirmAction(null)
    }
  }

  const columns = [
    { header: 'Name', accessor: 'departmentName' },
    { header: 'Description', accessor: 'description', render: (row) => row.description || '-' },
    { header: 'Complaints', accessor: 'complaintCount', render: (row) => row.complaintCount || 0 },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="action-btns">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(row) }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmAction(row) }}>Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Department Management</h2>
        <p>Manage complaint categories and departments</p>
        <Button onClick={openCreate}>Add Department</Button>
      </div>

      <div className="table-container">
        <DataTable columns={columns} data={departments} loading={loading} emptyMessage="No departments found." />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editDept ? 'Edit Department' : 'Add Department'}>
        <div className="modal-form">
          <Input label="Department Name" name="departmentName" value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} required />
          <Textarea label="Description" name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editDept ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDelete(confirmAction.id)}
        title="Delete Department"
        message={`Are you sure you want to delete "${confirmAction?.departmentName}"? This will unassign complaints from this department.`}
        variant="danger"
        loading={saving}
      />
    </div>
  )
}
