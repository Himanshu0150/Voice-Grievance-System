import { useState, useEffect } from 'react'
import Button from '../common/Button'
import Card from '../common/Card'

export default function LocationPicker({ onLocation, initialLocation }) {
  const [location, setLocation] = useState(initialLocation || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      return data.display_name || ''
    } catch {
      return ''
    }
  }

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        const address = await fetchAddress(loc.latitude, loc.longitude)
        loc.address = address
        setLocation(loc)
        if (onLocation) onLocation(loc)
        setLoading(false)
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Please enable location permissions.')
            break
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.')
            break
          case err.TIMEOUT:
            setError('Location request timed out.')
            break
          default:
            setError('An unknown error occurred.')
        }
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const removeLocation = () => {
    setLocation(null)
    if (onLocation) onLocation(null)
  }

  return (
    <Card className="location-picker">
      <div className="location-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B5ED7" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Current Location</span>
      </div>
      {loading && <p className="location-loading">Getting your location...</p>}
      {error && <p className="location-error">{error}</p>}
      {location && (
        <div className="location-details">
          <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
          <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
          {location.address && <p className="location-address"><strong>Address:</strong> {location.address}</p>}
          <Button variant="secondary" size="sm" onClick={removeLocation}>Remove Location</Button>
        </div>
      )}
      {!location && !loading && (
        <Button variant="outline" size="sm" onClick={getLocation} loading={loading}>
          Use Current Location
        </Button>
      )}
    </Card>
  )
}
