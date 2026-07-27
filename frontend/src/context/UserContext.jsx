import { createContext, useContext, useState, useCallback } from 'react'
import userService from '../services/userService'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userService.getProfile()
      setProfile(data)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    setLoading(true)
    setError(null)
    try {
      const data = await userService.updateProfile(profileData)
      setProfile(data)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <UserContext.Provider value={{
      profile,
      loading,
      error,
      fetchProfile,
      updateProfile
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within UserProvider')
  return context
}
