'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react'

export interface AlertConfig {
  title?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface ConfirmOptions {
  title?: string
  variant?: 'warning' | 'info' | 'danger'
  confirmText?: string
  cancelText?: string
}

export interface AlertHandler {
  showAlert: (config: AlertConfig) => void
  showError: (message: string, title?: string) => void
  showSuccess: (message: string, title?: string) => void
  showWarning: (message: string, title?: string) => void
  showInfo: (message: string, title?: string) => void
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
  hideAlert: () => void
}

interface AlertContextType extends AlertHandler {
  alert: AlertConfig | null
}

const AlertContext = createContext<AlertContextType | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertConfig | null>(null)
  const [confirmState, setConfirmState] = useState<{
    message: string
    options?: ConfirmOptions
  } | null>(null)
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null)

  const showAlert = useCallback((config: AlertConfig) => {
    setAlert(config)
    setConfirmState(null)
    if (config.duration !== 0) {
      setTimeout(() => {
        setAlert(null)
      }, config.duration || 3000)
    }
  }, [])

  const showError = useCallback((message: string, title?: string) => {
    showAlert({ message, title, type: 'error' })
  }, [showAlert])

  const showSuccess = useCallback((message: string, title?: string) => {
    showAlert({ message, title, type: 'success' })
  }, [showAlert])

  const showWarning = useCallback((message: string, title?: string) => {
    showAlert({ message, title, type: 'warning' })
  }, [showAlert])

  const showInfo = useCallback((message: string, title?: string) => {
    showAlert({ message, title, type: 'info' })
  }, [showAlert])

  const showConfirm = useCallback((message: string, options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmState({ message, options })
      setAlert({ message, type: 'warning', title: options?.title, duration: 0 })
    })
  }, [])

  const hideAlert = useCallback(() => {
    setAlert(null)
    setConfirmState(null)
  }, [])

  const handleConfirm = useCallback((result: boolean) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result)
      confirmResolverRef.current = null
    }
    hideAlert()
  }, [hideAlert])

  return (
    <AlertContext.Provider value={{ alert, showAlert, showError, showSuccess, showWarning, showInfo, showConfirm, hideAlert }}>
      {children}
      {alert && !confirmState && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            padding: '16px 24px',
            borderRadius: 8,
            backgroundColor:
              alert.type === 'error'
                ? '#ef4444'
                : alert.type === 'success'
                  ? '#22c55e'
                  : alert.type === 'warning'
                    ? '#f59e0b'
                    : '#71717a',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            maxWidth: 400,
          }}
          onClick={hideAlert}
        >
          {alert.title && (
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{alert.title}</div>
          )}
          <div>{alert.message}</div>
        </div>
      )}
      {confirmState && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: 12,
              maxWidth: 400,
              minWidth: 300,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            {confirmState.options?.title && (
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#333', fontSize: 18 }}>
                {confirmState.options.title}
              </div>
            )}
            <div style={{ marginBottom: 20, color: '#555' }}>{confirmState.message}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {confirmState.options?.cancelText || '취소'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor:
                    confirmState.options?.variant === 'danger'
                      ? '#ef4444'
                      : confirmState.options?.variant === 'warning'
                        ? '#f59e0b'
                        : '#71717a',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {confirmState.options?.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  )
}

export function useAlert(): AlertHandler {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
