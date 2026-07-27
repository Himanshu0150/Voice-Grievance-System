import { useState, useRef, useCallback, useEffect } from 'react'
import Button from '../common/Button'

export const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'or-IN', label: 'Odia' },
  { code: 'en-IN', label: 'English' }
]

function getDefaultLanguage() {
  const browserLang = navigator.language || 'en-IN'
  const match = LANGUAGES.find(l => l.code.startsWith(browserLang.slice(0, 2)))
  return match ? match.code : 'hi-IN'
}

export default function VoiceRecorder({ onTranscript, onAudioBlob, onLanguageChange, disabled }) {
  const [language, setLanguage] = useState(getDefaultLanguage)
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  useEffect(() => {
    if (!SpeechRecognition && !navigator.mediaDevices?.getUserMedia) {
      setIsSupported(false)
    }
  }, [SpeechRecognition])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleStop = useCallback(() => {
    stopTimer()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    setRecordingTime(0)
  }, [stopTimer])

  const handleLanguageChange = (e) => {
    const lang = e.target.value
    setLanguage(lang)
    if (onLanguageChange) onLanguageChange(lang)
  }

  const startRecording = useCallback(async () => {
    setTranscript('')
    setAudioUrl(null)
    setHasRecording(false)
    chunksRef.current = []
    setRecordingTime(0)

    try {
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = language
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (event) => {
          let finalText = ''
          let interimText = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalText += result[0].transcript + ' '
            } else {
              interimText += result[0].transcript
            }
          }
          const fullText = finalText + interimText
          setTranscript(fullText)
          if (onTranscript) onTranscript(fullText)
        }

        recognition.onerror = () => {
          handleStop()
        }

        recognitionRef.current = recognition
        recognition.start()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setHasRecording(true)
        if (onAudioBlob) onAudioBlob(blob)
      }

      mediaRecorder.start()
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      let msg = 'Microphone not available on this device.'
      if (err.name === 'NotAllowedError') msg = 'Microphone access denied. Please allow microphone permissions.'
      alert(msg)
      handleStop()
    }
  }, [SpeechRecognition, language, onTranscript, onAudioBlob, handleStop])

  const handleDelete = () => {
    setTranscript('')
    setAudioUrl(null)
    setHasRecording(false)
    chunksRef.current = []
    if (onTranscript) onTranscript('')
    if (onAudioBlob) onAudioBlob(null)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (!isSupported) {
    return (
      <div className="voice-recorder voice-unsupported">
        <p>Speech recognition is not supported on this browser.</p>
        <p>You can type your complaint manually in the description field.</p>
      </div>
    )
  }

  return (
    <div className="voice-recorder">
      <div className="voice-language-row">
        <label className="voice-language-label" htmlFor="speech-lang">Language:</label>
        <select
          id="speech-lang"
          className="voice-language-select"
          value={language}
          onChange={handleLanguageChange}
          disabled={isRecording}
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
          ))}
        </select>
      </div>
      <div className="voice-controls">
        {!isRecording ? (
          <Button
            variant="primary"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                <path d="M17 11a5 5 0 01-10 0H5a7 7 0 0014 0h-2z" />
              </svg>
            }
            onClick={startRecording}
            disabled={disabled}
          >
            Start Recording
          </Button>
        ) : (
          <>
            <div className="recording-indicator">
              <span className="recording-dot" />
              Recording {formatTime(recordingTime)}
            </div>
            <Button variant="danger" onClick={handleStop}>Stop Recording</Button>
          </>
        )}
      </div>
      {transcript && (
        <div className="voice-transcript">
          <label>Transcript:</label>
          <p>{transcript}</p>
        </div>
      )}
      {audioUrl && (
        <div className="voice-playback">
          <audio controls src={audioUrl} />
        </div>
      )}
      {hasRecording && (
        <div className="voice-actions">
          <Button variant="secondary" size="sm" onClick={handleDelete}>Delete Recording</Button>
        </div>
      )}
    </div>
  )
}
