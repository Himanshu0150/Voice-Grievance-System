import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ImageUpload from '../../components/upload/ImageUpload'
import StatusChip from '../../components/common/StatusChip'
import { useNotification } from '../../context/NotificationContext'
import { SPEECH_LANGUAGES, RECOMMENDED_LANGUAGES } from '../../utils/constants'
import { getSelectedLanguage, saveSelectedLanguage, getRecentLanguages, getLanguageObject } from '../../utils/language'
import complaintService from '../../services/complaintService'
import { formatDate, truncateText } from '../../utils/helpers'

const LANGUAGES = SPEECH_LANGUAGES

function LanguageCard({ lang, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`voice-lang-btn ${selected ? 'active' : ''}`}
      onClick={() => onSelect(lang)}
      aria-pressed={selected}
    >
      <span className="voice-lang-native">{lang.native}</span>
      <span className="voice-lang-en">{lang.label}</span>
      <span className="voice-lang-code">{lang.code}</span>
    </button>
  )
}

function LanguageSection({ title, subtitle, languages, selected, onSelect }) {
  if (!languages || languages.length === 0) return null
  return (
    <div className="lang-section">
      <h4 className="lang-section-title">{title}</h4>
      {subtitle && <p className="lang-section-subtitle">{subtitle}</p>}
      <div className="voice-lang-grid lang-grid-full">
        {languages.map(l => (
          <LanguageCard
            key={l.code}
            lang={l}
            selected={selected === l.code}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function getDefaultLanguage() {
  return getSelectedLanguage()
}

export default function NewComplaint() {
  const navigate = useNavigate()
  const { success, error: showError } = useNotification()
  const [step, setStep] = useState('language')
  const [language, setLanguage] = useState(getDefaultLanguage)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentLanguages, setRecentLanguages] = useState([])
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
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [similarComplaints, setSimilarComplaints] = useState([])
  const [checkingSimilarity, setCheckingSimilarity] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joinedId, setJoinedId] = useState(null)

  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const similarityTimeoutRef = useRef(null)

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

  useEffect(() => {
    if (similarityTimeoutRef.current) {
      clearTimeout(similarityTimeoutRef.current)
    }
    if (!transcript.trim() || transcript.trim().length < 25) {
      setSimilarComplaints([])
      return
    }
    setCheckingSimilarity(true)
    similarityTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await complaintService.checkSimilarity(transcript, language)
        setSimilarComplaints(res?.similar || [])
      } catch {
        setSimilarComplaints([])
      } finally {
        setCheckingSimilarity(false)
      }
    }, 700)
    return () => {
      if (similarityTimeoutRef.current) clearTimeout(similarityTimeoutRef.current)
    }
  }, [transcript, language])

  const handleJoin = async (complaint) => {
    setLoading(true)
    try {
      await complaintService.joinComplaint(complaint.id)
      await complaintService.supportComplaint(complaint.id)
      setJoined(true)
      setJoinedId(complaint.complaintId)
      success(`You have joined and supported complaint ${complaint.complaintId}`)
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to join complaint')
    } finally {
      setLoading(false)
    }
  }

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
      recognition.lang = getLanguageObject(language).speech
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
    setSimilarComplaints([])
  }

  const handleReset = () => {
    setShowConfirm(false)
    setStep('language')
    setTranscript('')
    setHasRecording(false)
    setImages([])
    setAiResult(null)
    setIsAnonymous(false)
    setSimilarComplaints([])
    setJoined(false)
    setJoinedId(null)
  }

  const handleLanguageSelect = (lang) => {
    setLanguage(lang.code)
    saveSelectedLanguage(lang.code)
    setRecentLanguages(getRecentLanguages())
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
      formData.append('isAnonymous', isAnonymous ? 'true' : 'false')

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
            {aiResult.emotion && (
              <div className="voice-result-item">
                <label>Detected Emotion</label>
                <span className="voice-result-value highlight">
                  {aiResult.emotion}
                  {aiResult.emotionConfidence != null && ` (${Math.round(aiResult.emotionConfidence * 100)}%)`}
                </span>
              </div>
            )}
            {aiResult.emotionReason && (
              <div className="voice-result-item full-width">
                <label>Emotion Reason</label>
                <span className="voice-result-value">{aiResult.emotionReason}</span>
              </div>
            )}
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
          <Button onClick={handleReset}>
            Submit Another
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'language') {
    const query = searchQuery.trim().toLowerCase()
    const filtered = LANGUAGES.filter(l =>
      !query ||
      l.label.toLowerCase().includes(query) ||
      l.native.toLowerCase().includes(query) ||
      l.code.toLowerCase().includes(query)
    )
    const recommended = LANGUAGES.filter(l => RECOMMENDED_LANGUAGES.includes(l.code))
    const recent = recentLanguages
      .map(code => LANGUAGES.find(l => l.code === code))
      .filter(Boolean)
      .filter(l => !RECOMMENDED_LANGUAGES.includes(l.code))
    const rest = filtered.filter(l => !RECOMMENDED_LANGUAGES.includes(l.code))

    return (
      <div className="page-container">
        <div className="page-header">
          <h2>New Complaint</h2>
          <p>Speak your grievance naturally in your preferred language</p>
        </div>
        <Card className="voice-language-card">
          <div className="voice-language-selector">
            <label className="voice-lang-label">Select your language</label>
            <div className="lang-search-wrap">
              <svg className="lang-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="lang-search-input"
                placeholder="Search languages (e.g. Hindi, हिन्दी, hi)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {searchQuery.trim() ? (
              <LanguageSection
                title={`Search results (${filtered.length})`}
                languages={filtered}
                selected={language}
                onSelect={handleLanguageSelect}
              />
            ) : (
              <>
                {recent.length > 0 && (
                  <LanguageSection
                    title="Recently selected"
                    languages={recent}
                    selected={language}
                    onSelect={handleLanguageSelect}
                  />
                )}
                <LanguageSection
                  title="Recommended"
                  languages={recommended}
                  selected={language}
                  onSelect={handleLanguageSelect}
                />
                <LanguageSection
                  title={`All languages (${LANGUAGES.length})`}
                  languages={rest}
                  selected={language}
                  onSelect={handleLanguageSelect}
                />
              </>
            )}
          </div>
          <div className="voice-language-note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Your complaint, AI summary, chatbot replies and notifications will use your selected language automatically.</span>
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
        <div className="voice-anonymous-toggle">
          <label className="anonymous-checkbox">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            <span>
              <strong>Submit Anonymously</strong>
              <small>Your name and contact details will be hidden from officers. You can still track this complaint.</small>
            </span>
          </label>
        </div>
      </Card>

      {similarComplaints.length > 0 && (
        <Card className="similar-complaints-card">
          <div className="similar-complaints-header">
            <span className="similar-complaints-icon">&#9888;</span>
            <div>
              <h3>Similar Complaint Already Exists</h3>
              <p>
                {joined
                  ? `You have joined complaint ${joinedId}. Your support increases its priority, making resolution faster.`
                  : 'We found a complaint matching what you described. Join it instead of filing a duplicate - your support increases its priority and speeds up resolution.'}
              </p>
            </div>
          </div>
          <div className="similar-complaints-list">
            {similarComplaints.map(c => (
              <div key={c.id} className="similar-complaint-item">
                <div className="similar-complaint-info">
                  <div className="similar-complaint-title">
                    <strong>{c.complaintId}</strong>
                    <StatusChip status={c.status} />
                  </div>
                  <p>{truncateText(c.title || c.description, 120)}</p>
                  <small>
                    {c.category} &middot; {formatDate(c.createdAt)} &middot; Similarity {(c.score * 100).toFixed(0)}%
                    {c.supporterCount > 0 && ` &middot; ${c.supporterCount} supporter${c.supporterCount > 1 ? 's' : ''}`}
                  </small>
                </div>
                {!joined ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleJoin(c)}
                    loading={loading}
                  >
                    Join & Support
                  </Button>
                ) : (
                  <span className="joined-badge">Joined &#10003;</span>
                )}
              </div>
            ))}
          </div>
          {!joined && (
            <p className="similar-complaints-note">
              You can still submit as a separate complaint if this is a different issue.
            </p>
          )}
        </Card>
      )}

      <div className="voice-submit-actions">
        <Button variant="secondary" onClick={() => { setStep('language'); deleteRecording() }}>
          Change Language
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!transcript.trim() || checkingSimilarity}
        >
          Submit Complaint
        </Button>
      </div>
    </div>
  )
}
