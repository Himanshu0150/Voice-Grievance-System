import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Textarea from '../../components/common/Textarea'
import Select from '../../components/common/Select'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { useNotification } from '../../context/NotificationContext'
import userService from '../../services/userService'
import complaintService from '../../services/complaintService'

export default function Feedback() {
  const { success, error: showError } = useNotification()
  const [resolvedComplaints, setResolvedComplaints] = useState([])
  const [selectedComplaint, setSelectedComplaint] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingComplaints, setLoadingComplaints] = useState(true)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    loadResolvedComplaints()
  }, [])

  const loadResolvedComplaints = async () => {
    setLoadingComplaints(true)
    setError(null)
    try {
      const data = await complaintService.getUserComplaints({ status: 'Resolved', limit: 100 })
      const list = data.complaints || data.data || data || []
      setResolvedComplaints(list)
    } catch {
      setError('Failed to load complaints')
    } finally {
      setLoadingComplaints(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      showError('Please select a rating')
      return
    }
    setLoading(true)
    try {
      await userService.submitFeedback({
        complaintId: selectedComplaint || undefined,
        rating,
        comment
      })
      setSubmitted(true)
      success('Thank you for your feedback!')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="page-container">
        <Card className="feedback-success">
          <div className="success-icon">&#10003;</div>
          <h2>Thank You!</h2>
          <p>Your feedback has been submitted successfully. We value your input.</p>
          <Button onClick={() => { setSubmitted(false); setRating(0); setComment(''); setSelectedComplaint('') }}>
            Submit Another Feedback
          </Button>
        </Card>
      </div>
    )
  }

  if (loadingComplaints) return <div className="page-container"><Loader /></div>
  if (error) return <div className="page-container"><ErrorState message={error} onRetry={loadResolvedComplaints} /></div>

  const complaintOptions = [
    { value: '', label: 'General Feedback' },
    ...resolvedComplaints.map(c => ({
      value: c.id,
      label: `#${c.complaintId || c.id} - ${c.title?.substring(0, 40)}`
    }))
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Feedback</h2>
        <p>Help us improve our services{resolvedComplaints.length > 0 ? ' — rate your resolved complaints' : ''}</p>
      </div>

      <Card className="feedback-form-card">
        <form onSubmit={handleSubmit}>
          {resolvedComplaints.length > 0 && (
            <Select
              label="Select Complaint (Optional)"
              name="complaintId"
              value={selectedComplaint}
              onChange={(e) => setSelectedComplaint(e.target.value)}
              options={complaintOptions}
              placeholder="Choose a resolved complaint"
            />
          )}

          <div className="rating-section">
            <label>Rate your experience</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= (hover || rating) ? 'star-active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >&#9733;</button>
              ))}
            </div>
          </div>

          <Textarea
            label="Your Comments"
            name="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about the grievance system..."
            rows={4}
          />

          <Button type="submit" fullWidth loading={loading}>
            Submit Feedback
          </Button>
        </form>
      </Card>
    </div>
  )
}
