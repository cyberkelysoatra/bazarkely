import React, { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
  colorBlindFriendly: boolean
}

interface AccessibilityEnhancementsProps {
  children: React.ReactNode
}

const AccessibilityEnhancements: React.FC<AccessibilityEnhancementsProps> = ({ children }) => {
  const { user } = useAppStore()
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: false,
    focusVisible: true,
    colorBlindFriendly: false
  })
  
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const announcementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Detect user preferences
    detectUserPreferences()
    
    // Setup keyboard navigation detection
    setupKeyboardDetection()
    
    // Setup screen reader detection
    setupScreenReaderDetection()
    
    // Setup focus management
    setupFocusManagement()
    
    // Setup ARIA live regions
    setupLiveRegions()
    
    // Setup color contrast monitoring
    setupColorContrastMonitoring()
    
    // Setup motion preferences
    setupMotionPreferences()
  }, [])

  useEffect(() => {
    // Apply accessibility settings to document
    applyAccessibilitySettings()
  }, [settings])

  const detectUserPreferences = () => {
    // High contrast mode
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      setSettings(prev => ({ ...prev, highContrast: true }))
    }

    // Reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSettings(prev => ({ ...prev, reducedMotion: true }))
    }

    // Large text
    if (window.matchMedia('(prefers-reduced-data: no-preference)').matches) {
      const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
      if (fontSize > 16) {
        setSettings(prev => ({ ...prev, largeText: true }))
      }
    }

    // Load user preferences from localStorage
    const savedSettings = localStorage.getItem('bazarkely-accessibility')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error)
      }
    }
  }

  const setupKeyboardDetection = () => {
    let lastKeyTime = 0
    
    document.addEventListener('keydown', (event) => {
      const now = Date.now()
      
      // Detect keyboard navigation (Tab, Arrow keys, Enter, Space)
      if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
        setIsKeyboardUser(true)
        lastKeyTime = now
      }
    })

    document.addEventListener('mousedown', () => {
      const now = Date.now()
      // If mouse is used within 100ms of last keyboard use, assume mixed input
      if (now - lastKeyTime > 100) {
        setIsKeyboardUser(false)
      }
    })

    // Reset keyboard user detection after 5 seconds of inactivity
    setInterval(() => {
      const now = Date.now()
      if (now - lastKeyTime > 5000) {
        setIsKeyboardUser(false)
      }
    }, 1000)
  }

  const setupScreenReaderDetection = () => {
    // Detect screen reader by checking for specific properties
    const hasScreenReader = !!(
      window.speechSynthesis ||
      window.navigator.userAgent.includes('NVDA') ||
      window.navigator.userAgent.includes('JAWS') ||
      window.navigator.userAgent.includes('VoiceOver') ||
      window.navigator.userAgent.includes('TalkBack')
    )

    if (hasScreenReader) {
      setSettings(prev => ({ ...prev, screenReader: true }))
    }
  }

  const setupFocusManagement = () => {
    // Trap focus in modals
    const trapFocus = (element: HTMLElement) => {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus()
              e.preventDefault()
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus()
              e.preventDefault()
            }
          }
        }
      }

      element.addEventListener('keydown', handleTabKey)
      firstElement?.focus()

      return () => {
        element.removeEventListener('keydown', handleTabKey)
      }
    }

    // Apply focus trap to all modals
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            if (element.classList.contains('modal') || element.querySelector('.modal')) {
              const modal = element.querySelector('.modal') as HTMLElement
              if (modal) {
                trapFocus(modal)
              }
            }
          }
        })
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  const setupLiveRegions = () => {
    // Create ARIA live regions for announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.id = 'live-region'
    document.body.appendChild(liveRegion)
  }

  const setupColorContrastMonitoring = () => {
    // Monitor color contrast ratios
    const checkContrast = () => {
      const elements = document.querySelectorAll('[data-contrast-check]')
      elements.forEach((element) => {
        const computedStyle = getComputedStyle(element as Element)
        const backgroundColor = computedStyle.backgroundColor
        const color = computedStyle.color
        
        // Basic contrast check (simplified)
        if (backgroundColor && color) {
          // This is a simplified check - in production, use a proper contrast ratio calculator
          const isHighContrast = settings.highContrast
          if (isHighContrast) {
            (element as HTMLElement).style.filter = 'contrast(1.5)'
          }
        }
      })
    }

    // Check contrast on initial load and when settings change
    checkContrast()
    const observer = new MutationObserver(checkContrast)
    observer.observe(document.body, { childList: true, subtree: true })
  }

  const setupMotionPreferences = () => {
    if (settings.reducedMotion) {
      // Disable animations for users who prefer reduced motion
      const style = document.createElement('style')
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  const applyAccessibilitySettings = () => {
    const root = document.documentElement
    
    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply large text
    if (settings.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    // Apply color blind friendly
    if (settings.colorBlindFriendly) {
      root.classList.add('color-blind-friendly')
    } else {
      root.classList.remove('color-blind-friendly')
    }

    // Apply keyboard navigation styles
    if (isKeyboardUser || settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation')
    } else {
      root.classList.remove('keyboard-navigation')
    }

    // Apply focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }

    // Save settings
    localStorage.setItem('bazarkely-accessibility', JSON.stringify(settings))
  }

  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message])
    
    // Clear announcement after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1))
    }, 5000)
  }

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    announce(`Paramètre d'accessibilité ${key} ${value ? 'activé' : 'désactivé'}`)
  }

  const resetSettings = () => {
    setSettings({
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false,
      focusVisible: true,
      colorBlindFriendly: false
    })
    announce('Paramètres d\'accessibilité réinitialisés')
  }

  return (
    <div className="accessibility-container">
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Accessibility toolbar */}
      <div className="accessibility-toolbar">
        <button
          onClick={() => updateSetting('highContrast', !settings.highContrast)}
          className={`accessibility-toggle ${settings.highContrast ? 'active' : ''}`}
          aria-label="Basculer le contraste élevé"
          title="Contraste élevé"
        >
          <span className="sr-only">Contraste élevé</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button
          onClick={() => updateSetting('largeText', !settings.largeText)}
          className={`accessibility-toggle ${settings.largeText ? 'active' : ''}`}
          aria-label="Basculer le texte agrandi"
          title="Texte agrandi"
        >
          <span className="sr-only">Texte agrandi</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 4v3h5v6h3V4H9zm-2 0H2v3h5V4zm0 5H2v3h5V9zm0 5H2v3h5v-3zm7 0h-3v3h3v-3z"/>
          </svg>
        </button>

        <button
          onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
          className={`accessibility-toggle ${settings.reducedMotion ? 'active' : ''}`}
          aria-label="Basculer la réduction des animations"
          title="Réduction des animations"
        >
          <span className="sr-only">Réduction des animations</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button
          onClick={() => updateSetting('colorBlindFriendly', !settings.colorBlindFriendly)}
          className={`accessibility-toggle ${settings.colorBlindFriendly ? 'active' : ''}`}
          aria-label="Basculer le mode daltonien"
          title="Mode daltonien"
        >
          <span className="sr-only">Mode daltonien</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>

        <button
          onClick={resetSettings}
          className="accessibility-reset"
          aria-label="Réinitialiser les paramètres d'accessibilité"
          title="Réinitialiser"
        >
          <span className="sr-only">Réinitialiser</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className={`accessibility-content ${isKeyboardUser ? 'keyboard-user' : ''}`}>
        {children}
      </div>

      {/* Accessibility styles */}
      <style jsx>{`
        .accessibility-container {
          position: relative;
        }

        .accessibility-toolbar {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .accessibility-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .accessibility-toggle:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .accessibility-toggle.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .accessibility-reset {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 2px solid #ef4444;
          border-radius: 6px;
          background: white;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.2s;
        }

        .accessibility-reset:hover {
          background: #ef4444;
          color: white;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* High contrast mode */
        .high-contrast {
          filter: contrast(1.5) brightness(1.2);
        }

        .high-contrast * {
          border-color: currentColor !important;
        }

        /* Large text mode */
        .large-text {
          font-size: 1.2em;
        }

        .large-text h1 { font-size: 2.5em; }
        .large-text h2 { font-size: 2em; }
        .large-text h3 { font-size: 1.75em; }
        .large-text h4 { font-size: 1.5em; }
        .large-text h5 { font-size: 1.25em; }
        .large-text h6 { font-size: 1.1em; }

        /* Reduced motion */
        .reduced-motion *,
        .reduced-motion *::before,
        .reduced-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* Color blind friendly */
        .color-blind-friendly {
          --color-primary: #1f2937;
          --color-secondary: #6b7280;
          --color-success: #059669;
          --color-warning: #d97706;
          --color-error: #dc2626;
        }

        /* Keyboard navigation */
        .keyboard-navigation .focus-visible:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }

        .keyboard-user .focus-visible:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Focus management */
        .accessibility-content.keyboard-user *:focus {
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }

        /* Screen reader optimizations */
        @media (prefers-reduced-motion: reduce) {
          .accessibility-toolbar {
            transition: none;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .accessibility-toolbar {
            top: 10px;
            right: 10px;
            flex-wrap: wrap;
            max-width: calc(100vw - 20px);
          }
        }
      `}</style>
    </div>
  )
}

export default AccessibilityEnhancements
