import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { usePWA } from '../hooks/usePWA'

const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
      return
    }

    // Show prompt if app is installable and not already installed
    if (isInstallable && !isInstalled && !isDismissed) {
      // Delay showing the prompt to avoid being intrusive
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled, isDismissed])

  const handleInstall = async () => {
    const outcome = await installApp()
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt || isInstalled) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Smartphone className="text-primary-600" size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Install TeleMed
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Get quick access to your healthcare portal with offline support
              </p>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInstall}
                  className="flex items-center space-x-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  <Download size={14} />
                  <span>Install</span>
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PWAInstallPrompt