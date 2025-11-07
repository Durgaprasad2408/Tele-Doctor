import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import CallNotification from './components/CallNotification'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DoctorsList from './pages/DoctorsList'
import DoctorProfile from './pages/DoctorProfile'
import BookAppointment from './pages/BookAppointment'
import Appointments from './pages/Appointments'
import Chat from './pages/Chat'
import Conversations from './pages/Conversations'
import VideoCall from './pages/VideoCall'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import MedVault from './pages/MedVault'
import Schedule from './pages/Schedule'
import PatientRecords from './pages/PatientRecords'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="doctors" element={<DoctorsList />} />
            <Route path="doctors/:doctorId" element={<DoctorProfile />} />
            <Route path="book-appointment/:doctorId" element={<BookAppointment />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="messages" element={<Conversations />} />
            <Route path="chat/:userId" element={<Chat />} />
            <Route path="video-call/:appointmentId" element={<VideoCall />} />
            <Route path="med-vault" element={<MedVault />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="patient-records" element={<PatientRecords />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
        <CallNotification />
        <PWAInstallPrompt />
      </SocketProvider>
    </AuthProvider>
  )
}

export default App