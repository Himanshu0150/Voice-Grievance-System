import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { useNotification } from '../../context/NotificationContext'
import adminService from '../../services/adminService'

export default function AdminSettings() {
  const { success, error: showError } = useNotification()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    app_name: '',
    panchayat_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    facebook: '',
    twitter: '',
    logo_url: '',
    default_resolution_days: '30'
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getSettings()
      if (data) {
        setForm({
          app_name: data.app_name || '',
          panchayat_name: data.panchayat_name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          logo_url: data.logo_url || '',
          default_resolution_days: data.default_resolution_days?.toString() || '30'
        })
      }
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateSettings({
        ...form,
        default_resolution_days: parseInt(form.default_resolution_days)
      })
      success('Settings saved successfully')
    } catch {
      showError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(p => ({ ...p, logo_url: ev.target.result }))
    reader.readAsDataURL(file)
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadSettings} />

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure system settings</p>
      </div>

      <div className="settings-layout">
        <Card className="settings-card">
          <h3 className="form-section-title">Branding</h3>
          <Input label="Application Name" name="app_name" value={form.app_name} onChange={(e) => setForm(p => ({ ...p, app_name: e.target.value }))} />
          <div className="form-row-grid">
            <div className="form-group">
              <label>Logo</label>
              <div className="logo-upload-row">
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="logo-preview" />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="file-input" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="settings-card">
          <h3 className="form-section-title">Panchayat Information</h3>
          <Input label="Panchayat Name" name="panchayat_name" value={form.panchayat_name} onChange={(e) => setForm(p => ({ ...p, panchayat_name: e.target.value }))} />
          <div className="form-row-grid">
            <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
            <Input label="Email" name="email" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <Input label="Address" name="address" value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
        </Card>

        <Card className="settings-card">
          <h3 className="form-section-title">Contact & Social</h3>
          <div className="form-row-grid">
            <Input label="Website" name="website" value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} />
            <Input label="Facebook" name="facebook" value={form.facebook} onChange={(e) => setForm(p => ({ ...p, facebook: e.target.value }))} />
          </div>
          <Input label="Twitter" name="twitter" value={form.twitter} onChange={(e) => setForm(p => ({ ...p, twitter: e.target.value }))} />
        </Card>

        <Card className="settings-card">
          <h3 className="form-section-title">System</h3>
          <Input label="Default Resolution Days" name="default_resolution_days" type="number" value={form.default_resolution_days} onChange={(e) => setForm(p => ({ ...p, default_resolution_days: e.target.value }))} />
        </Card>

        <div className="form-actions">
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
