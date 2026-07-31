import { useState, useRef, useCallback } from 'react'
import Button from '../common/Button'
import complaintService from '../../services/complaintService'

export default function ImageUpload({ onImages, maxFiles = 5, multiple = true, checkDuplicate = true }) {
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef(null)

  const checkForDuplicate = useCallback(async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await complaintService.checkDuplicateImage(formData)
      if (res && res.isDuplicate) {
        setDuplicateWarning(prev => ({
          fileName: file.name,
          matchedComplaintId: res.duplicates?.[0]?.complaintRef || 'an existing complaint'
        }))
        return true
      }
    } catch {
      // Duplicate check is best-effort; never block upload on failure
    }
    return false
  }, [])

  const processFiles = useCallback(async (files) => {
    setError(null)
    setDuplicateWarning(null)
    const fileArray = Array.from(files)

    if (images.length + fileArray.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} images.`)
      return
    }

    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError(`${file.name} is not a valid format. Use JPG, PNG, or WebP.`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds 5MB limit.`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    if (checkDuplicate) {
      setChecking(true)
      for (const file of validFiles) {
        const isDup = await checkForDuplicate(file)
        if (isDup) break
      }
      setChecking(false)
    }

    setImages(prev => {
      const updated = [...prev, ...validFiles]
      if (onImages) onImages(updated)
      return updated
    })

    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }, [images.length, maxFiles, onImages, checkDuplicate, checkForDuplicate])

  const handleSelect = () => {
    inputRef.current?.click()
  }

  const handleChange = (e) => {
    processFiles(e.target.files)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const removeImage = (index) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      if (onImages) onImages(updated)
      return updated
    })
    setPreviews(prev => prev.filter((_, i) => i !== index))
    setDuplicateWarning(null)
  }

  return (
    <div className="image-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {error && <p className="form-error">{error}</p>}
      {duplicateWarning && (
        <div className="duplicate-warning">
          <span className="duplicate-warning-icon">&#9888;</span>
          <div>
            <strong>Possible duplicate image:</strong>
            <p>{duplicateWarning.fileName} may already be present on {duplicateWarning.matchedComplaintId}. The system will re-check this image.</p>
          </div>
        </div>
      )}
      {checking && <p className="upload-checking">Checking image for duplicates...</p>}
      <div
        className={`upload-area ${isDragging ? 'drag-over' : ''}`}
        onClick={handleSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect() }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p>Click or drag & drop images here (max {maxFiles})</p>
        <p className="upload-hint">JPG, PNG, WebP (max 5MB each)</p>
      </div>
      {previews.length > 0 && (
        <div className="image-previews">
          {previews.map((preview, index) => (
            <div key={index} className="image-preview-item">
              <img src={preview} alt={`Preview ${index + 1}`} />
              <button className="image-remove-btn" onClick={() => removeImage(index)} aria-label="Remove image">&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
