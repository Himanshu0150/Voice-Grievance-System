import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ImageUpload from '../../components/upload/ImageUpload'
import { useNotification } from '../../context/NotificationContext'
import { SPEECH_LANGUAGES } from '../../utils/constants'
import complaintService from '../../services/complaintService'

const LANGUAGES = SPEECH_LANGUAGES

function getDefaultLanguage() {
  const browserLang = navigator.language || 'en-IN'
  const match = LANGUAGES.find(l => l.code.startsWith(browserLang.slice(0, 2)))
  return match ? match.code : 'hi-IN'
}

export default function NewComplaint() {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [step, setStep] = useState('language')
  const [language, setLanguage] = useState(getDefaultLanguage)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [images, setImages] = useState([])
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [hasRecording, setHasRecording] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  useEffect(() => {
    if (!SpeechRecognition) setIsSupported(false)
  }, [SpeechRecognition])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const stopRecording = useCallback(() => {
    stopTimer()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
    setRecordingTime(0)
  }, [stopTimer])

  const startRecording = useCallback(async () => {
    setTranscript('')
    setInterimText('')
    setHasRecording(false)
    setAiResult(null)
    setRecordingTime(0)

    if (!SpeechRecognition) {
      showError('Speech recognition not supported on this browser.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = language
      recognition.continuous = true
      recognition.interimResults = true

      let finalText = ''

      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript + ' '
          } else {
            interim += result[0].transcript
          }
        }
        setTranscript(finalText.trim())
        setInterimText(interim)
      }

      recognition.onerror = () => { stopRecording() }

      recognition.onend = () => {
        if (finalText.trim()) setHasRecording(true)
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      let msg = 'Microphone not available.'
      if (err.name === 'NotAllowedError') msg = 'Microphone access denied. Please allow permissions.'
      showError(msg)
      stopRecording()
    }
  }, [SpeechRecognition, language, stopRecording, showError])

  const deleteRecording = () => {
    setTranscript('')
    setInterimText('')
    setHasRecording(false)
    setAiResult(null)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) {
      showError('Please record your complaint before submitting')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('voiceTranscript', transcript)
      formData.append('speechLanguage', language)
      formData.append('address', address || '')

      if (location) {
        formData.append('latitude', location.latitude)
        formData.append('longitude', location.longitude)
      }

      images.forEach(img => formData.append('images', img))

      const res = await complaintService.createVoice(formData)
      const payload = res.data || res
      setAiResult(payload.aiAnalysis || null)
      success(`Complaint ${payload.complaintId || ''} submitted successfully!`)
      setShowConfirm(true)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit complaint')
    } finally {
      setLoading(false)
    }
  }

  if (showConfirm && aiResult) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>Complaint Submitted</h2>
          <p>Your grievance has been automatically analyzed and registered.</p>
        </div>
        <Card className="voice-result-card">
          <div className="voice-result-header">
            <span className="voice-result-icon">&#10003;</span>
            <h3>AI Analysis Complete</h3>
          </div>
          <div className="voice-result-grid">
            <div className="voice-result-item">
              <label>Category</label>
              <span className="voice-result-value highlight">{aiResult.category}</span>
            </div>
            <div className="voice-result-item">
              <label>Department</label>
              <span className="voice-result-value">{aiResult.department}</span>
            </div>
            <div className="voice-result-item">
              <label>Priority</label>
              <span className={`priority-badge priority-${aiResult.priority?.toLowerCase()}`}>{aiResult.priority}</span>
            </div>
            <div className="voice-result-item">
              <label>Confidence</label>
              <span className="voice-result-value">{(aiResult.confidence * 100).toFixed(0)}%</span>
            </div>
            {aiResult.needsManualReview && (
              <div className="voice-result-item full-width">
                <span className="voice-result-warning">Needs Manual Review - AI confidence was low</span>
              </div>
            )}
          </div>
          {aiResult.summary && (
            <div className="voice-result-section">
              <label>Summary</label>
              <p>{aiResult.summary}</p>
            </div>
          )}
          {aiResult.keywords?.length > 0 && (
            <div className="voice-result-section">
              <label>Keywords</label>
              <div className="keyword-chips">
                {aiResult.keywords.map((kw, i) => <span key={i} className="keyword-chip">{kw}</span>)}
              </div>
            </div>
          )}
          {aiResult.suggestedAction && (
            <div className="voice-result-section">
              <label>Suggested Action</label>
              <p>{aiResult.suggestedAction}</p>
            </div>
          )}
          {aiResult.imageAnalysis?.length > 0 && (
            <div className="voice-result-section">
              <label>Image Analysis</label>
              {aiResult.imageAnalysis.map((img, i) => (
                <p key={i} className="image-analysis-line">
                  {img.detected !== 'unknown' ? `Detected: ${img.detected}` : 'Image received for review'}
                </p>
              ))}
            </div>
          )}
        </Card>
        <div className="voice-submit-actions">
          <Button variant="secondary" onClick={() => navigate('/complaints')}>View My Complaints</Button>
          <Button onClick={() => { setShowConfirm(false); setStep('language'); setTranscript(''); setHasRecording(false); setImages([]); setAiResult(null) }}>
            Submit Another
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'language') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h2>New Complaint</h2>
          <p>Speak your grievance naturally in your preferred language</p>
        </div>
        <Card className="voice-language-card">
          <div className="voice-language-selector">
            <label className="voice-lang-label">Select your language</label>
            <div className="voice-lang-grid">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  className={`voice-lang-btn ${language === l.code ? 'active' : ''}`}
                  onClick={() => setLanguage(l.code)}
                >
                  <span className="voice-lang-native">{l.native}</span>
                  <span className="voice-lang-en">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="voice-language-note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Your complaint will be automatically translated and classified by AI.</span>
          </div>
          <Button fullWidth onClick={() => setStep('record')} className="voice-start-btn">
            Start Recording
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Record Your Complaint</h2>
        <p>Describe your problem naturally - the AI will understand and categorize it</p>
      </div>

      <Card className="voice-recorder-card">
        <div className="voice-status-bar">
          <span className="voice-lang-badge">{LANGUAGES.find(l => l.code === language)?.native || language}</span>
          {isRecording && <span className="voice-recording-badge">Recording {formatTime(recordingTime)}</span>}
        </div>

        <div className="voice-main-controls">
          {!isRecording ? (
            <button className="voice-record-btn" onClick={startRecording} disabled={loading}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"/>
                <path d="M17 11a5 5 0 01-10 0H5a7 7 0 0014 0h-2z"/>
              </svg>
              <span>Tap to Record</span>
            </button>
          ) : (
            <div className="voice-recording-active">
              <div className="voice-pulse" />
              <button className="voice-stop-btn" onClick={stopRecording}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              </button>
              <span>Tap to Stop</span>
            </div>
          )}
        </div>

        {transcript && (
          <div className="voice-transcript-box">
            <label>Your Complaint:</label>
            <p className="voice-transcript-text">{transcript}</p>
            {interimText && <p className="voice-transcript-interim">{interimText}</p>}
            {hasRecording && (
              <button className="voice-delete-btn" onClick={deleteRecording}>Delete & Re-record</button>
            )}
          </div>
        )}
      </Card>

      <Card className="voice-extra-card">
        <h3>Additional Information (Optional)</h3>
        <div className="voice-image-upload">
          <ImageUpload onImages={setImages} maxFiles={5} />
        </div>
        <div className="voice-address-input">
          <label>Address / Location Description</label>
          <input
            type="text"
            className="form-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Describe where the issue is located..."
          />
          {location && (
            <p className="voice-location-hint">
              Location detected: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
        </div>
      </Card>

      <div className="voice-submit-actions">
        <Button variant="secondary" onClick={() => { setStep('language'); deleteRecording() }}>
          Change Language
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!transcript.trim()}
        >
          Submit Complaint
        </Button>
      </div>
    </div>
  )
}
