import { useState } from 'react'
import Modal from './Modal'

export default function ImageViewer({ src, alt = 'Image', className }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`image-viewer-thumb ${className || ''}`}
        onClick={() => setIsOpen(true)}
        style={{ cursor: 'pointer' }}
      />
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Image" size="lg">
        <img src={src} alt={alt} className="image-viewer-full" />
      </Modal>
    </>
  )
}
