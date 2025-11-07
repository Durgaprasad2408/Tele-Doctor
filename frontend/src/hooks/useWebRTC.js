import { useState, useRef, useCallback, useEffect } from 'react'

const useWebRTC = (socket, appointmentId) => {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [callInitiated, setCallInitiated] = useState(false)
  
  const peerConnectionRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  }

  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      return stream
    } catch (error) {
      console.error('Failed to access media devices:', error)
      throw error
    }
  }, [])

  const createPeerConnection = useCallback((stream) => {
    const peerConnection = new RTCPeerConnection(configuration)

    // Add local stream tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate')
        socket.emit('ice-candidate', {
          appointmentId,
          candidate: event.candidate
        })
      }
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream')
      const [remoteStream] = event.streams
      setRemoteStream(remoteStream)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      console.log('Connection state:', state)
      
      if (state === 'connected') {
        setIsConnecting(false)
        setIsCallActive(true)
      } else if (state === 'disconnected' || state === 'failed') {
        setIsCallActive(false)
        setIsConnecting(false)
      }
    }

    return peerConnection
  }, [socket, appointmentId])

  const startCall = useCallback(async () => {
    try {
      console.log('Starting WebRTC call...')
      setIsConnecting(true)
      setCallInitiated(true)
      
      let stream = localStream
      if (!stream) {
        stream = await initializeMedia()
      }
      
      const peerConnection = createPeerConnection(stream)
      peerConnectionRef.current = peerConnection

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      
      await peerConnection.setLocalDescription(offer)

      if (socket) {
        console.log('Sending WebRTC offer')
        socket.emit('video-call-offer', {
          appointmentId,
          offer
        })
      }
    } catch (error) {
      console.error('Failed to start call:', error)
      setIsConnecting(false)
      setCallInitiated(false)
    }
  }, [socket, appointmentId, localStream, initializeMedia, createPeerConnection])

  const answerCall = useCallback(async (offer) => {
    try {
      console.log('Answering WebRTC call...')
      setIsConnecting(true)
      setCallInitiated(true)
      
      let stream = localStream
      if (!stream) {
        stream = await initializeMedia()
      }
      
      const peerConnection = createPeerConnection(stream)
      peerConnectionRef.current = peerConnection

      await peerConnection.setRemoteDescription(offer)
      
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      if (socket) {
        console.log('Sending WebRTC answer')
        socket.emit('video-call-answer', {
          appointmentId,
          answer
        })
      }
    } catch (error) {
      console.error('Failed to answer call:', error)
      setIsConnecting(false)
      setCallInitiated(false)
    }
  }, [socket, appointmentId, localStream, initializeMedia, createPeerConnection])

  const handleAnswer = useCallback(async (answer) => {
    if (peerConnectionRef.current) {
      try {
        console.log('Handling WebRTC answer')
        await peerConnectionRef.current.setRemoteDescription(answer)
      } catch (error) {
        console.error('Failed to handle answer:', error)
      }
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate) => {
    if (peerConnectionRef.current) {
      try {
        console.log('Adding ICE candidate')
        await peerConnectionRef.current.addIceCandidate(candidate)
      } catch (error) {
        console.error('Failed to handle ICE candidate:', error)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return videoTrack.enabled
      }
    }
    return false
  }, [localStream])

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return audioTrack.enabled
      }
    }
    return false
  }, [localStream])

  const endCall = useCallback(() => {
    console.log('Ending call...')
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    // Emit end call event
    if (socket) {
      socket.emit('end-call', { appointmentId })
    }

    // Reset state
    setLocalStream(null)
    setRemoteStream(null)
    setIsCallActive(false)
    setIsConnecting(false)
    setCallInitiated(false)
    peerConnectionRef.current = null
  }, [localStream, socket, appointmentId])

  // Auto-start call when socket events are received
  useEffect(() => {
    if (socket) {
      const handleStartWebRTCCall = () => {
        console.log('Auto-starting WebRTC call after acceptance')
        startCall()
      }

      socket.on('start-webrtc-call', handleStartWebRTCCall)

      return () => {
        socket.off('start-webrtc-call', handleStartWebRTCCall)
      }
    }
  }, [socket, startCall])

  return {
    localStream,
    remoteStream,
    isCallActive,
    isConnecting,
    callInitiated,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    handleAnswer,
    handleIceCandidate,
    toggleVideo,
    toggleAudio,
    endCall,
    initializeMedia
  }
}

export default useWebRTC