import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Configure axios defaults with production-ready URL handling
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

axios.defaults.baseURL = API_BASE_URL

console.log('API Base URL configured:', API_BASE_URL)

// Add request interceptor for debugging in development
if (import.meta.env.DEV) {
  axios.interceptors.request.use(
    (config) => {
      console.log('Making request to:', config.url, 'with data:', config.data)
      return config
    },
    (error) => {
      console.error('Request error:', error)
      return Promise.reject(error)
    }
  )
}

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('Response received:', response.status, response.data)
    }
    return response
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('Response error:', error.response?.status, error.response?.data, error.message)
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error: Unable to connect to server. Please check your internet connection.')
      return Promise.reject(new Error('Network error: Server not reachable'))
    }
    
    // Handle authentication errors
    if (error.response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    return Promise.reject(error)
  }
)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Verify token and get user data
      fetchUserProfile()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile')
      setUser(response.data)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      // Don't logout on profile fetch failure during initial load
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Attempting login with:', { email, password: '[HIDDEN]' })
      }
      
      const response = await axios.post('/api/auth/login', { 
        email: email.trim(), 
        password 
      })
      
      if (import.meta.env.DEV) {
        console.log('Login response:', response.data)
      }
      
      const { token, user } = response.data
      
      if (!token || !user) {
        throw new Error('Invalid response from server')
      }
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(user)
      
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      
      // Handle different types of errors
      if (!error.response) {
        const message = 'Unable to connect to server. Please check your internet connection and try again.'
        toast.error(message)
        return { success: false, error: message }
      }
      
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      if (import.meta.env.DEV) {
        console.log('Attempting registration with data:', { ...userData, password: '[HIDDEN]' })
      }
      
      // Validate required fields
      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role']
      for (const field of requiredFields) {
        if (!userData[field] || userData[field].toString().trim() === '') {
          throw new Error(`${field} is required`)
        }
      }
      
      // Role-specific validation
      if (userData.role === 'doctor') {
        const doctorFields = ['specialization', 'licenseNumber', 'experience', 'consultationFee']
        for (const field of doctorFields) {
          if (!userData[field] || userData[field].toString().trim() === '') {
            throw new Error(`${field} is required for doctors`)
          }
        }
      } else if (userData.role === 'patient') {
        const patientFields = ['dateOfBirth', 'gender']
        for (const field of patientFields) {
          if (!userData[field] || userData[field].toString().trim() === '') {
            throw new Error(`${field} is required for patients`)
          }
        }
      }
      
      const response = await axios.post('/api/auth/register', userData)
      
      if (import.meta.env.DEV) {
        console.log('Registration response:', response.data)
      }
      
      const { token, user } = response.data
      
      if (!token || !user) {
        throw new Error('Invalid response from server')
      }
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(user)
      
      toast.success('Registration successful!')
      return { success: true }
    } catch (error) {
      console.error('Registration error:', error)
      
      // Handle different types of errors
      if (!error.response) {
        const message = 'Unable to connect to server. Please check your internet connection and try again.'
        toast.error(message)
        return { success: false, error: message }
      }
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.message || err.msg).join(', ')
        toast.error(`Registration failed: ${errorMessages}`)
        return { success: false, error: errorMessages }
      }
      
      const message = error.response?.data?.message || error.message || 'Registration failed. Please try again.'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateProfile = async (updates) => {
    try {
      const response = await axios.put('/api/users/profile', updates)
      setUser(response.data)
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}