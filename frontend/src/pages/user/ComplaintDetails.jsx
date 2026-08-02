import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/common/Card'
import StatusChip from '../../components/common/StatusChip'
import EmotionBadge from '../../components/common/EmotionBadge'
import ImageViewer from '../../components/common/ImageViewer'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import Button from '../../components/common/Button'
import { formatDateTime } from '../../utils/helpers'
import { PRIORITY_COLORS, EMOTION_META } from '../../utils/constants'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import complaintService from '../../services/complaintService'

function getImpactLevel(score) {
  if (!score && score !== 0) return { label: 'Not calculated', color: '#6c757d' }
  if (score >= 80) return { label: 'Very High Impact', color: '#DC3545' }
  if (score >= 50) return { label: 'High Impact', color: '#FD7E14' }
  if (score >= 25) return { label: 'Moderate Impact', color: '#FFC107' }
  return { label: 'Low Impact', color: '#198754' }
}

export default function UserComplaintDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const { success, error: showError } = useNotification()
  const [complaint, setComplaint] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [supporting, setSupporting] = useState(false)

  const loadTimeline = useCallback(async (complaintId) => {
    try {
      const events = await complaintService.getTimeline(complaintId)
      setTimeline(events || [])
    } catch {
      setTimeline([])
    }
  }, [])

  useEffect(() => {
    loadComplaint()
  }, [id])

  const loadComplaint = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.getById(id)
      setComplaint(data)
      if (data.id) loadTimeline(data.id)
    } catch (err) {
      setError('Failed to load complaint details')
    } finally {
      setLoading(false)
    }
  }

  const handleSupport = async () => {
    setSupporting(true)
    try {
      const res = await complaintService.supportComplaint(complaint.id)
      success(`You are now supporting this complaint. Total supporters: ${res.supporterCount}`)
      loadComplaint()
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to support complaint')
    } finally {
      setSupporting(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadComplaint} />
  if (!complaint) return <ErrorState title="Not Found" message="Complaint not found." />

  const mapLink = complaint.latitude && complaint.longitude
    ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
    : null

  const isOwner = complaint.userId === user?.id
  const impact = getImpactLevel(complaint.impactScore)

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
              {complaint.priority && (
                <span>
                  Priority: <strong style={{ color: PRIORITY_COLORS[complaint.priority] || undefined }}>{complaint.priority}</strong>
                </span>
              )}
              {complaint.emotion && (
                <span>
                  Emotion: <EmotionBadge emotion={complaint.emotion} confidence={complaint.emotionConfidence} />
                </span>
              )}
              <span>Submitted: <strong>{formatDateTime(complaint.createdAt)}</strong></span>
            </div>
            <div className="detail-description">
              <h4>Description</h4>
              <p>{complaint.description}</p>
            </div>
          </Card>

          <Card className="impact-card">
            <h4>Impact Score</h4>
            <div className="impact-score-row">
              <div className="impact-score-bar">
                <div
                  className="impact-score-fill"
                  style={{
                    width: `${Math.min(complaint.impactScore || 0, 100)}%`,
                    backgroundColor: impact.color
                  }}
                />
              </div>
              <span className="impact-score-value" style={{ color: impact.color }}>
                {complaint.impactScore || 0}/100
              </span>
            </div>
            <p className="impact-score-label" style={{ color: impact.color }}>{impact.label}</p>
            <div className="impact-info-grid">
              {typeof complaint.estimatedResolutionDays === 'number' && (
                <div className="impact-info-item">
                  <label>Estimated Resolution</label>
                  <span>{complaint.estimatedResolutionDays} day{complaint.estimatedResolutionDays !== 1 ? 's' : ''}</span>
                </div>
              )}
              {complaint.estimatedCompletionDate && (
                <div className="impact-info-item">
                  <label>Expected Completion</label>
                  <span>{formatDateTime(complaint.estimatedCompletionDate)}</span>
                </div>
              )}
              <div className="impact-info-item">
                <label>Supporters</label>
                <span>{complaint.supporterCount || 0} citizen{complaint.supporterCount === 1 ? '' : 's'}</span>
              </div>
              <div className="impact-info-item">
                <label>Reported</label>
                <span>{complaint.ageInDays !== undefined && complaint.ageInDays !== null ? `${complaint.ageInDays} day${complaint.ageInDays === 1 ? '' : 's'} ago` : formatDateTime(complaint.createdAt)}</span>
              </div>
            </div>
          </Card>

          {!isOwner && (
            <Card>
              <h4>Support This Complaint</h4>
              <p>Supporting this complaint increases its impact score and priority, helping it get resolved faster.</p>
              <Button onClick={handleSupport} loading={supporting}>Support This Complaint</Button>
            </Card>
          )}

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
                {complaint.emotion && (
                  <div className="ai-analysis-item">
                    <label>Detected Emotion</label>
                    <span className="ai-value">
                      {EMOTION_META[complaint.emotion]?.icon || ''} {complaint.emotion}
                      {complaint.emotionConfidence != null && ` (${Math.round(complaint.emotionConfidence * 100)}% confidence)`}
                    </span>
                  </div>
                )}
                {complaint.emotionReason && (
                  <div className="ai-analysis-item full-width">
                    <label>Reason</label>
                    <span className="ai-value">{complaint.emotionReason}</span>
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
                {complaint.status === 'Resolved' && (
                  <div className="timeline-item completed">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <p className="timeline-status">Resolved</p>
                      <span className="timeline-date">{complaint.resolvedAt ? formatDateTime(complaint.resolvedAt) : 'Recently'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {complaint.status === 'In Progress' && (
              <div className="timeline-future">
                <span>Currently in progress</span>
              </div>
            )}
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
