import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Mail, Lock, User, Calendar, Eye, EyeOff, ArrowLeft, ArrowRight, Clock, RefreshCw, ShieldCheck, Phone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'patient',
    // Common fields
    phone: '',
    // Patient fields
    dateOfBirth: '',
    gender: '',
    // Doctor fields
    specialization: '',
    licenseNumber: '',
    experience: '',
    consultationFee: ''
  })
  const [otpData, setOtpData] = useState({
    otp: ['', '', '', '', '', ''],
    timeLeft: 0,
    isExpired: false,
    isVerifying: false,
    canResend: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { register, user } = useAuth()

  // Redirect if user is authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  // Countdown timer for OTP expiration
  useEffect(() => {
    let interval = null
    if (step === 3 && otpData.timeLeft > 0) {
      interval = setInterval(() => {
        setOtpData(prev => {
          const newTimeLeft = prev.timeLeft - 1
          return {
            ...prev,
            timeLeft: newTimeLeft,
            isExpired: newTimeLeft <= 0,
            canResend: newTimeLeft <= 0
          }
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, otpData.timeLeft])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await register(formData)
    
    if (!result.success) {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const nextStep = () => {
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

  const specializations = [
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Psychiatry',
    'Orthopedics',
    'Gynecology',
    'Neurology',
    'Oncology',
    'Ophthalmology'
  ]

  // OTP Functions
  const sendOTP = async () => {
    setOtpLoading(true)
    setOtpError('')
    setSuccess('')
    
    try {
      const response = await fetch('http://localhost:5000/api/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Verification code sent successfully!')
        setOtpData(prev => ({
          ...prev,
          timeLeft: 600, // 10 minutes
          isExpired: false,
          canResend: false,
          otp: ['', '', '', '', '', '']
        }))
        setStep(3) // Move to OTP verification step
      } else {
        setOtpError(data.message || 'Failed to send verification code')
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      setOtpError('Failed to send verification code. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const resendOTP = async () => {
    if (otpData.canResend) {
      await sendOTP()
    }
  }

  const verifyOTP = async () => {
    const otpString = otpData.otp.join('')
    
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits')
      return
    }

    setOtpData(prev => ({ ...prev, isVerifying: true }))
    setOtpError('')
    
    try {
      const response = await fetch('http://localhost:5000/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          otp: otpString 
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Email verified successfully!')
        // Proceed with registration after OTP verification
        setTimeout(async () => {
          setOtpData(prev => ({ ...prev, isVerifying: false }))
          await handleFinalRegistration()
        }, 1500)
      } else {
        setOtpError(data.message || 'Invalid verification code')
        setOtpData(prev => ({ ...prev, isVerifying: false }))
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      setOtpError('Failed to verify code. Please try again.')
      setOtpData(prev => ({ ...prev, isVerifying: false }))
    }
  }

  const handleFinalRegistration = async () => {
    setLoading(true)
    const result = await register(formData)
    setLoading(false)
    
    if (!result.success) {
      setOtpError(result.message || 'Registration failed. Please try again.')
    } else {
      // Registration successful - the auth context will update user state
      // and trigger redirect via the useEffect
      setSuccess('Account created successfully! Redirecting to dashboard...')
      console.log('Registration successful, user should be redirected to dashboard')
    }
  }

  const handleOTPCheck = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otpData.otp]
      newOtp[index] = value
      
      setOtpData(prev => ({
        ...prev,
        otp: newOtp,
        isExpired: false
      }))

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        if (nextInput) {
          nextInput.focus()
        }
      }

      // Auto-verify when all digits are entered
      if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
        setTimeout(verifyOTP, 100)
      }
    }
  }

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpData.otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) {
        prevInput.focus()
      }
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary-600 rounded-full mb-4">
              <Heart className="text-white" size={24} />
            </div>
            <h1 className="text-responsive-xl font-bold text-gray-800">Join TeleMed</h1>
            <p className="text-gray-600 mt-2 text-responsive-sm">Create your healthcare account</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-12 sm:w-16 h-1 transition-colors ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`w-12 sm:w-16 h-1 transition-colors ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {otpError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {otpError}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
              <ShieldCheck className="mr-2" size={16} />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mobile-form">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Role Selection */}
                <div className="form-group">
                  <label>I am a</label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'patient' })}
                      className={`p-2 sm:p-3 border-2 rounded-lg text-center transition-colors touch-target ${
                        formData.role === 'patient'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-responsive-base">Patient</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'doctor' })}
                      className={`p-2 sm:p-3 border-2 rounded-lg text-center transition-colors touch-target ${
                        formData.role === 'doctor'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                       <span className="font-medium text-responsive-base">Doctor</span>
                    </button>
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="relative w-full flex">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="relative w-full flex">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-target"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full btn-primary py-3 sm:py-4 text-responsive-base font-semibold flex items-center justify-center"
                >
                  Continue
                  <ArrowRight className="ml-2" size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Phone Number Field - Common for both roles */}
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="relative w-full flex">
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                      autoComplete="tel"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                {formData.role === 'patient' ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="dateOfBirth">Date of Birth</label>
                      <div className="relative">
                        <input
                          id="dateOfBirth"
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="gender">Gender</label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label htmlFor="specialization">Specialization</label>
                      <select
                        id="specialization"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Specialization</option>
                        {specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="licenseNumber">License Number</label>
                      <input
                        id="licenseNumber"
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="experience">Years of Experience</label>
                      <input
                        id="experience"
                        type="number"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        min="0"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="consultationFee">Consultation Fee ($)</label>
                      <input
                        id="consultationFee"
                        type="number"
                        name="consultationFee"
                        value={formData.consultationFee}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 sm:space-x-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 btn-secondary py-3 sm:py-4 text-responsive-base font-semibold flex items-center justify-center"
                  >
                    <ArrowLeft className="mr-2" size={20} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={sendOTP}
                    disabled={otpLoading}
                    className="flex-1 btn-primary py-3 sm:py-4 text-responsive-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {otpLoading ? (
                      <>
                        <div className="spinner h-4 w-4 mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2" size={16} />
                        Send OTP
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <Mail className="mx-auto mb-3 text-primary-600" size={48} />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Verify Your Email
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    We're sending a verification code to
                  </p>
                  <p className="font-semibold text-primary-600 mb-4">
                    {formData.email}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Please check your email and enter the 6-digit code below
                  </p>
                </div>

                {/* OTP Input */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 text-center">
                    Enter Verification Code
                  </label>
                  
                  <div className="flex justify-center space-x-2">
                    {otpData.otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOTPCheck(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-600 focus:outline-none transition-colors"
                        disabled={otpData.isVerifying}
                      />
                    ))}
                  </div>

                  {/* Timer and Resend */}
                  <div className="text-center space-y-2">
                    {otpData.timeLeft > 0 ? (
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <Clock className="mr-1" size={14} />
                        Resend in {formatTime(otpData.timeLeft)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={resendOTP}
                        disabled={otpLoading}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center mx-auto disabled:opacity-50"
                      >
                        <RefreshCw className="mr-1" size={14} />
                        {otpLoading ? 'Sending...' : 'Resend Code'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Verify Button */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={verifyOTP}
                    disabled={otpData.isVerifying || otpData.otp.join('').length !== 6}
                    className="w-full btn-primary py-3 sm:py-4 text-responsive-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {otpData.isVerifying ? (
                      <>
                        <div className="spinner h-4 w-4 mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2" size={16} />
                        Verify & Create Account
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-full btn-secondary py-3 sm:py-4 text-responsive-base font-semibold flex items-center justify-center"
                  >
                    <ArrowLeft className="mr-2" size={16} />
                    Back to Edit Info
                  </button>
                </div>
              </motion.div>
            )}
          </form>

          {step < 3 && (
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-responsive-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Register