import { createContext, useContext, useState, useCallback } from 'react'
import complaintService from '../services/complaintService'

const ComplaintContext = createContext(null)

export function ComplaintProvider({ children }) {
  const [complaints, setComplaints] = useState([])
  const [currentComplaint, setCurrentComplaint] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchComplaints = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.getAll(params)
      setComplaints(data.complaints || data)
      if (data.total) setTotalCount(data.total)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch complaints')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchComplaintById = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.getById(id)
      setCurrentComplaint(data)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch complaint')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createComplaint = useCallback(async (complaintData) => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.create(complaintData)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create complaint')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateComplaintStatus = useCallback(async (id, statusData) => {
    setLoading(true)
    setError(null)
    try {
      const data = await complaintService.updateStatus(id, statusData)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update complaint')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearCurrent = useCallback(() => {
    setCurrentComplaint(null)
  }, [])

  return (
    <ComplaintContext.Provider value={{
      complaints,
      currentComplaint,
      totalCount,
      loading,
      error,
      fetchComplaints,
      fetchComplaintById,
      createComplaint,
      updateComplaintStatus,
      clearCurrent
    }}>
      {children}
    </ComplaintContext.Provider>
  )
}

export function useComplaints() {
  const context = useContext(ComplaintContext)
  if (!context) throw new Error('useComplaints must be used within ComplaintProvider')
  return context
}
