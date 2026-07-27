import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/common/Card'
import StatusChip from '../../components/common/StatusChip'
import ImageViewer from '../../components/common/ImageViewer'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { formatDateTime } from '../../utils/helpers'
import complaintService from '../../services/complaintService'

export default function UserComplaintDetails() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadComplaint()
  }, [id])

  const loadComplaint = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.getById(id)
      setComplaint(data)
    } catch (err) {
      setError('Failed to load complaint details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadComplaint} />
  if (!complaint) return <ErrorState title="Not Found" message="Complaint not found." />

  const mapLink = complaint.latitude && complaint.longitude
    ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
    : null

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/complaints">My Complaints</Link> / <span>Complaint #{complaint.complaintId || complaint.id}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <Card>
            <div className="detail-header">
              <h2>{complaint.title}</h2>
              <StatusChip status={complaint.status} />
            </div>
            <div className="detail-meta">
              <span>ID: <strong>#{complaint.complaintId || complaint.id}</strong></span>
              <span>Category: <strong>{complaint.category}</strong></span>
              {complaint.departmentName && <span>Department: <strong>{complaint.departmentName}</strong></span>}
              {complaint.priority && <span>Priority: <strong>{complaint.priority}</strong></span>}
              <span>Submitted: <strong>{formatDateTime(complaint.createdAt)}</strong></span>
            </div>
            <div className="detail-description">
              <h4>Description</h4>
              <p>{complaint.description}</p>
            </div>
          </Card>

          {complaint.aiSummary && (
            <Card className="ai-analysis-card">
              <h4>AI Analysis Summary</h4>
              <div className="ai-analysis-grid">
                <div className="ai-analysis-item">
                  <label>Category</label>
                  <span className="ai-value">{complaint.detectedCategory || complaint.category}</span>
                </div>
                <div className="ai-analysis-item">
                  <label>Priority</label>
                  <span className={`priority-badge priority-${complaint.priority?.toLowerCase()}`}>{complaint.priority}</span>
                </div>
                {complaint.aiConfidence && (
                  <div className="ai-analysis-item">
                    <label>Confidence</label>
                    <span className="ai-value">{(complaint.aiConfidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                {complaint.originalLanguage && (
                  <div className="ai-analysis-item">
                    <label>Original Language</label>
                    <span className="ai-value">{complaint.originalLanguage}</span>
                  </div>
                )}
              </div>
              <p className="ai-summary-text">{complaint.aiSummary}</p>
              {(() => {
                const kws = Array.isArray(complaint.aiKeywords)
                  ? complaint.aiKeywords
                  : typeof complaint.aiKeywords === 'string'
                    ? (() => { try { return JSON.parse(complaint.aiKeywords); } catch { return []; } })()
                    : [];
                return kws.length > 0 ? (
                  <div className="keyword-chips" style={{ marginTop: 8 }}>
                    {kws.map((kw, i) => <span key={i} className="keyword-chip">{kw}</span>)}
                  </div>
                ) : null;
              })()}
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
              <audio controls className="audio-player" src={complaint.audioFile}>
                Your browser does not support the audio element.
              </audio>
            </Card>
          )}

          {complaint.images && complaint.images.length > 0 && (
            <Card>
              <h4>Attached Images</h4>
              <div className="detail-images">
                {complaint.images.map((img, i) => (
                  <ImageViewer key={i} src={img} alt={`Complaint image ${i + 1}`} />
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

          {mapLink && (
            <Card>
              <h4>Location</h4>
              <p>Latitude: {complaint.latitude}, Longitude: {complaint.longitude}</p>
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                View on Google Maps
              </a>
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
            <h4>Timeline</h4>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <p className="timeline-status">Submitted</p>
                  <span className="timeline-date">{formatDateTime(complaint.createdAt)}</span>
                </div>
              </div>
              {complaint.status === 'In Progress' && (
                <div className="timeline-item active">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <p className="timeline-status">In Progress</p>
                    <span className="timeline-date">Being reviewed</span>
                  </div>
                </div>
              )}
              {complaint.status === 'Resolved' && (
                <>
                  <div className="timeline-item active">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <p className="timeline-status">In Progress</p>
                      <span className="timeline-date">Reviewed</span>
                    </div>
                  </div>
                  <div className="timeline-item completed">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <p className="timeline-status">Resolved</p>
                      <span className="timeline-date">{complaint.resolvedAt ? formatDateTime(complaint.resolvedAt) : 'Recently'}</span>
                    </div>
                  </div>
                </>
              )}
              {complaint.status === 'Rejected' && (
                <div className="timeline-item rejected">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <p className="timeline-status">Rejected</p>
                    <span className="timeline-date">{complaint.resolvedAt ? formatDateTime(complaint.resolvedAt) : ''}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {complaint.resolutionRemark && (
            <Card>
              <h4>Resolution Remarks</h4>
              <p>{complaint.resolutionRemark}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
