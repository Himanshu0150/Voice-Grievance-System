import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import Textarea from '../../components/common/Textarea'
import StatusChip from '../../components/common/StatusChip'
import ImageViewer from '../../components/common/ImageViewer'
import ImageUpload from '../../components/upload/ImageUpload'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { useNotification } from '../../context/NotificationContext'
import { formatDateTime } from '../../utils/helpers'
import { COMPLAINT_CATEGORIES } from '../../utils/constants'
import adminService from '../../services/adminService'
import complaintService from '../../services/complaintService'

const statusOptions = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Work Started', label: 'Work Started' },
  { value: 'Inspection', label: 'Inspection' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Rejected', label: 'Rejected' }
]

const priorityOptions = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
]

const categoryOptions = COMPLAINT_CATEGORIES.map(c => ({ value: c, label: c }))

export default function AdminComplaintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [complaint, setComplaint] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState([])
  const [remarks, setRemarks] = useState('')
  const [resolutionImages, setResolutionImages] = useState([])
  const [saving, setSaving] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [editCategory, setEditCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [newConfidence, setNewConfidence] = useState('')

  useEffect(() => {
    loadComplaint()
    loadDepartments()
  }, [id])

  const loadComplaint = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getComplaintById(id)
      setComplaint(data)
      setStatus(data.status)
      setPriority(data.priority || 'Medium')
      setDepartmentId(data.departmentId?.toString() || '')
      setNewCategory(data.detectedCategory || data.category || '')
      setNewDepartment(data.departmentName || '')
      setNewConfidence(data.aiConfidence ? (data.aiConfidence * 100).toFixed(0) : '')
      if (data.id) {
        try {
          const events = await complaintService.getTimeline(data.id)
          setTimeline(events || [])
        } catch {
          setTimeline([])
        }
      }
    } catch {
      setError('Failed to load complaint')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const data = await adminService.getDepartments()
      setDepartments(data.data || data || [])
    } catch {}
  }

  const handleUpdateStatus = async () => {
    setSaving(true)
    try {
      if (status === 'Resolved') {
        const formData = new FormData()
        formData.append('status', status)
        formData.append('remarks', remarks)
        resolutionImages.forEach(img => formData.append('resolution_images', img))
        await adminService.resolveComplaint(id, formData)
      } else {
        await adminService.updateComplaintStatus(id, { status, remarks, priority, departmentId: departmentId || null })
      }
      success('Complaint updated')
      loadComplaint()
      setRemarks('')
      setResolutionImages([])
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleEscalate = async () => {
    setEscalating(true)
    try {
      const res = await adminService.escalateComplaint(id, { reason: remarks || undefined })
      success(res.message || `Complaint escalated to ${res.escalatedToRole}`)
      loadComplaint()
      setRemarks('')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to escalate')
    } finally {
      setEscalating(false)
    }
  }

  const handleUpdateAiPrediction = async () => {
    setSaving(true)
    try {
      await adminService.updateAiPrediction(id, {
        category: newCategory,
        department: newDepartment,
        priority,
        confidence: newConfidence ? parseFloat(newConfidence) / 100 : undefined
      })
      success('AI prediction updated')
      loadComplaint()
      setEditCategory(false)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadComplaint} />
  if (!complaint) return <ErrorState title="Not Found" message="Complaint not found." />

  const mapLink = complaint.latitude && complaint.longitude
    ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
    : null

  const hasAiAnalysis = complaint.aiProcessed || complaint.detectedCategory || complaint.aiConfidence

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/admin/complaints">Complaints</Link> / <span>#{complaint.complaintId || complaint.id}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <Card>
            <div className="detail-header">
              <h2>{complaint.title || 'Voice Complaint'}</h2>
              <StatusChip status={complaint.status} />
            </div>
            <div className="detail-meta">
              <span>ID: <strong>{complaint.complaintId || complaint.id}</strong></span>
              <span>Category: <strong>{complaint.category}</strong></span>
              {complaint.departmentName && <span>Dept: <strong>{complaint.departmentName}</strong></span>}
              <span>Priority: <strong>{complaint.priority || 'Medium'}</strong></span>
              <span>Submitted: <strong>{formatDateTime(complaint.createdAt)}</strong></span>
              <span>By: <strong>{complaint.userName || 'Anonymous Citizen'}</strong></span>
              <span>Village: <strong>{complaint.village || '-'}</strong></span>
              <span>Phone: <strong>{complaint.phone || complaint.userName || '-'}</strong></span>
            </div>
            <div className="impact-info-grid">
              {typeof complaint.impactScore === 'number' && (
                <div className="impact-info-item">
                  <label>Impact Score</label>
                  <span>{complaint.impactScore}/100</span>
                </div>
              )}
              <div className="impact-info-item">
                <label>Supporters</label>
                <span>{complaint.supporterCount || 0}</span>
              </div>
              {typeof complaint.estimatedResolutionDays === 'number' && (
                <div className="impact-info-item">
                  <label>Est. Resolution</label>
                  <span>{complaint.estimatedResolutionDays} day{complaint.estimatedResolutionDays !== 1 ? 's' : ''}</span>
                </div>
              )}
              {complaint.officerRecommendation && (
                <div className="impact-info-item">
                  <label>Officer Recommendation</label>
                  <span>{complaint.officerRecommendation}</span>
                </div>
              )}
            </div>
          </Card>

          {hasAiAnalysis && (
            <Card className="ai-analysis-card">
              <h3>
                AI Analysis
                {complaint.aiConfidence && (
                  <span className="ai-confidence-badge">
                    {(complaint.aiConfidence * 100).toFixed(0)}% confidence
                  </span>
                )}
                {complaint.needsManualReview ? (
                  <span className="ai-review-badge">Needs Review</span>
                ) : (
                  <span className="ai-auto-badge">Auto-classified</span>
                )}
              </h3>
              <div className="ai-analysis-grid">
                <div className="ai-analysis-item">
                  <label>Detected Category</label>
                  <span className="ai-value">{complaint.detectedCategory || complaint.category}</span>
                </div>
                <div className="ai-analysis-item">
                  <label>AI Confidence</label>
                  <span className="ai-value">{complaint.aiConfidence ? `${(complaint.aiConfidence * 100).toFixed(0)}%` : 'N/A'}</span>
                </div>
                <div className="ai-analysis-item">
                  <label>Priority</label>
                  <span className={`priority-badge priority-${complaint.priority?.toLowerCase()}`}>{complaint.priority}</span>
                </div>
                {(() => {
                  const kws = Array.isArray(complaint.aiKeywords)
                    ? complaint.aiKeywords
                    : typeof complaint.aiKeywords === 'string'
                      ? (() => { try { return JSON.parse(complaint.aiKeywords); } catch { return []; } })()
                      : [];
                  return kws.length > 0 ? (
                    <div className="ai-analysis-item full-width">
                      <label>Keywords</label>
                      <div className="keyword-chips">
                        {kws.map((kw, i) => <span key={i} className="keyword-chip">{kw}</span>)}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
              {complaint.aiSummary && (
                <div className="ai-summary-section">
                  <label>AI Summary</label>
                  <p>{complaint.aiSummary}</p>
                </div>
              )}
              {complaint.suggestedAction && (
                <div className="ai-summary-section">
                  <label>Suggested Action</label>
                  <p className="suggested-action-text">{complaint.suggestedAction}</p>
                </div>
              )}
            </Card>
          )}

          {complaint.description && (
            <Card>
              <h4>
                English Translation
                {complaint.translationAvailable === false && (
                  <span className="translation-unavailable-badge">Unavailable</span>
                )}
              </h4>
              {complaint.translationAvailable === false && (
                <div className="alert alert-warning" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 13 }}>
                  AI translation not available. Showing original text.
                </div>
              )}
              <p>{complaint.description}</p>
            </Card>
          )}

          {complaint.originalText && (
            <Card>
              <h4>Original Complaint ({complaint.originalLanguage || complaint.speechLanguage})</h4>
              <p className="voice-transcript-text">{complaint.originalText}</p>
            </Card>
          )}

          {complaint.voiceTranscript && !complaint.originalText && (
            <Card>
              <h4>Voice Transcript</h4>
              <p className="voice-transcript-text">{complaint.voiceTranscript}</p>
            </Card>
          )}

          {complaint.audioFile && (
            <Card>
              <h4>Audio Recording</h4>
              <audio controls className="audio-player" src={complaint.audioFile}>Audio not supported</audio>
            </Card>
          )}

          {complaint.images && complaint.images.length > 0 && (
            <Card>
              <h4>Complaint Images</h4>
              <div className="detail-images">
                {complaint.images.map((img, i) => (
                  <ImageViewer key={i} src={img} alt={`Image ${i + 1}`} />
                ))}
              </div>
            </Card>
          )}

          {complaint.resolvedImage && (
            <Card>
              <h4>Resolution Image</h4>
              <div className="detail-images">
                <ImageViewer src={complaint.resolvedImage} alt="Resolution evidence" />
              </div>
            </Card>
          )}

          {complaint.resolutionRemark && (
            <Card>
              <h4>Resolution Remarks</h4>
              <p>{complaint.resolutionRemark}</p>
            </Card>
          )}

          {mapLink && (
            <Card>
              <h4>Location</h4>
              <p>Lat: {complaint.latitude}, Lng: {complaint.longitude}</p>
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">View on Google Maps</a>
            </Card>
          )}

          {complaint.address && (
            <Card>
              <h4>Address</h4>
              <p>{complaint.address}</p>
            </Card>
          )}
        </div>

        <div className="detail-sidebar">
          <Card>
            <h4>Update Status</h4>
            <Select label="Status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            <Select label="Priority" name="priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={priorityOptions} />
            <Select
              label="Assign Department"
              name="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[{ value: '', label: 'Unassigned' }, ...departments.map(d => ({ value: String(d.id), label: d.departmentName }))]}
            />
            <Textarea label="Remarks" name="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add admin remarks..." rows={3} />
            {status === 'Resolved' && (
              <div className="resolution-upload">
                <label>Resolution Images</label>
                <ImageUpload onImages={setResolutionImages} maxFiles={3} />
              </div>
            )}
            <Button fullWidth onClick={handleUpdateStatus} loading={saving}>Update</Button>
            <Button
              fullWidth
              variant="danger"
              style={{ marginTop: 8 }}
              onClick={handleEscalate}
              loading={escalating}
              disabled={complaint.status === 'Resolved' || complaint.status === 'Rejected'}
            >
              Escalate Complaint
            </Button>
          </Card>

          {hasAiAnalysis && (
            <Card>
              <h4>AI Prediction {!editCategory && <button className="btn-link" onClick={() => setEditCategory(true)}>Edit</button>}</h4>
              {editCategory ? (
                <div className="ai-edit-form">
                  <Select label="Category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} options={categoryOptions} />
                  <div className="form-group">
                    <label>Department</label>
                    <input className="form-input" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Confidence %</label>
                    <input className="form-input" type="number" min="0" max="100" value={newConfidence} onChange={(e) => setNewConfidence(e.target.value)} />
                  </div>
                  <div className="ai-edit-actions">
                    <Button size="sm" onClick={handleUpdateAiPrediction} loading={saving}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditCategory(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="ai-prediction-display">
                  <p><strong>Category:</strong> {complaint.detectedCategory || complaint.category}</p>
                  <p><strong>Dept:</strong> {complaint.departmentName || 'Auto-assigned'}</p>
                  <p><strong>Confidence:</strong> {complaint.aiConfidence ? `${(complaint.aiConfidence * 100).toFixed(0)}%` : 'N/A'}</p>
                </div>
              )}
            </Card>
          )}

          <Card>
            <h4>Timeline</h4>
            {timeline.length > 0 ? (
              <div className="timeline">
                {timeline.map((event, index) => (
                  <div key={event.id || index} className={`timeline-item ${index === timeline.length - 1 ? 'active' : ''}`}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <p className="timeline-status">{event.event}</p>
                      <span className="timeline-date">{formatDateTime(event.createdAt)}</span>
                      {event.description && <p className="timeline-details">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <p className="timeline-status">Submitted</p>
                    <span className="timeline-date">{formatDateTime(complaint.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
