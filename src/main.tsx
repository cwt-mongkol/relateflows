import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PWAUpdateNotice } from './components/PWAUpdateNotice'
import './index.css'
import App from './App.tsx'

// @react-oauth/google's useGoogleLogin hook throws synchronously on mount when clientId is an empty
// string, which crashes the whole app (LoginPage renders unconditionally) before the user even sees a
// login screen. Fall back to a placeholder so the provider initializes; LoginPage checks the raw env
// var itself to disable the Google button with a clear message when OAuth isn't actually configured.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'not-configured.apps.googleusercontent.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <ToastProvider>
          <PWAUpdateNotice />
          <AuthProvider>
            <SettingsProvider>
              <App />
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
