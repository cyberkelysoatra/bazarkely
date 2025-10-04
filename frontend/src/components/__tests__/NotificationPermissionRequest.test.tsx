import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NotificationPermissionRequest from '../NotificationPermissionRequest'

// Mock the notification service
vi.mock('../../services/notificationService', () => ({
  default: {
    requestPermission: vi.fn(),
    isPermissionGranted: vi.fn()
  }
}))

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  writable: true
})

Object.defineProperty(window, 'Notification', {
  value: {
    ...window.Notification,
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted')
  },
  writable: true
})

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  },
  writable: true
})

const MockedNotificationPermissionRequest = (props: any) => (
  <BrowserRouter>
    <NotificationPermissionRequest {...props} />
  </BrowserRouter>
)

describe('NotificationPermissionRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when notifications are not supported', () => {
    it('should not render when notifications are not supported', () => {
      // Mock unsupported environment
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.queryByText('Activer les Notifications')).not.toBeInTheDocument()
    })
  })

  describe('when permission is already granted', () => {
    it('should not render when permission is already granted', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.queryByText('Activer les Notifications')).not.toBeInTheDocument()
    })
  })

  describe('when permission is default', () => {
    it('should render permission request', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.getByText('Activer les Notifications')).toBeInTheDocument()
      expect(screen.getByText('Recevez des alertes de budget, des rappels d\'objectifs et des notifications importantes pour mieux gérer vos finances familiales.')).toBeInTheDocument()
    })

    it('should request permission when button is clicked', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      const mockNotificationService = await import('../../services/notificationService')
      vi.mocked(mockNotificationService.default.requestPermission).mockImplementation(mockRequestPermission)

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      
      const button = screen.getByText('Activer les Notifications')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled()
      })
    })

    it('should show loading state while requesting permission', async () => {
      const mockRequestPermission = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('granted'), 100))
      )
      const mockNotificationService = await import('../../services/notificationService')
      vi.mocked(mockNotificationService.default.requestPermission).mockImplementation(mockRequestPermission)

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      
      const button = screen.getByText('Activer les Notifications')
      fireEvent.click(button)

      expect(screen.getByText('Activation...')).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should call onPermissionGranted when permission is granted', async () => {
      const mockOnPermissionGranted = vi.fn()
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      const mockNotificationService = await import('../../services/notificationService')
      vi.mocked(mockNotificationService.default.requestPermission).mockImplementation(mockRequestPermission)

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest onPermissionGranted={mockOnPermissionGranted} />)
      
      const button = screen.getByText('Activer les Notifications')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnPermissionGranted).toHaveBeenCalled()
      })
    })

    it('should call onPermissionDenied when permission is denied', async () => {
      const mockOnPermissionDenied = vi.fn()
      const mockRequestPermission = vi.fn().mockResolvedValue('denied')
      const mockNotificationService = await import('../../services/notificationService')
      vi.mocked(mockNotificationService.default.requestPermission).mockImplementation(mockRequestPermission)

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest onPermissionDenied={mockOnPermissionDenied} />)
      
      const button = screen.getByText('Activer les Notifications')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnPermissionDenied).toHaveBeenCalled()
      })
    })

    it('should call onDismiss when dismiss button is clicked', () => {
      const mockOnDismiss = vi.fn()

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest onDismiss={mockOnDismiss} />)
      
      const dismissButton = screen.getByText('Plus tard')
      fireEvent.click(dismissButton)

      expect(mockOnDismiss).toHaveBeenCalled()
    })

    it('should not show dismiss button when showDismiss is false', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest showDismiss={false} />)
      
      expect(screen.queryByText('Plus tard')).not.toBeInTheDocument()
    })
  })

  describe('when permission is denied', () => {
    it('should render denied state', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'denied'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.getByText('Notifications Désactivées')).toBeInTheDocument()
      expect(screen.getByText('Les notifications sont désactivées. Pour recevoir des alertes de budget et des rappels, veuillez les activer dans les paramètres de votre navigateur.')).toBeInTheDocument()
    })

    it('should show settings button when permission is denied', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'denied'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.getByText('Ouvrir les Paramètres')).toBeInTheDocument()
    })

    it('should show instructions for re-enabling notifications', () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'denied'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      expect(screen.getByText('Comment réactiver les notifications')).toBeInTheDocument()
      expect(screen.getByText('Cliquez sur l\'icône de cadenas ou de notification dans la barre d\'adresse')).toBeInTheDocument()
    })

    it('should open browser settings when settings button is clicked', () => {
      const mockOpen = vi.fn()
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true
      })

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'denied'
        },
        writable: true
      })

      // Mock Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Chrome',
        writable: true
      })

      render(<MockedNotificationPermissionRequest />)
      
      const settingsButton = screen.getByText('Ouvrir les Paramètres')
      fireEvent.click(settingsButton)

      expect(mockOpen).toHaveBeenCalledWith('chrome://settings/content/notifications', '_blank')
    })
  })

  describe('error handling', () => {
    it('should handle request permission errors', async () => {
      const mockOnPermissionDenied = vi.fn()
      const mockRequestPermission = vi.fn().mockRejectedValue(new Error('Permission denied'))
      const mockNotificationService = await import('../../services/notificationService')
      vi.mocked(mockNotificationService.default.requestPermission).mockImplementation(mockRequestPermission)

      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'default'
        },
        writable: true
      })

      render(<MockedNotificationPermissionRequest onPermissionDenied={mockOnPermissionDenied} />)
      
      const button = screen.getByText('Activer les Notifications')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnPermissionDenied).toHaveBeenCalled()
      })
    })
  })
})
