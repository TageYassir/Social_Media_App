'use client'

import { useEffect } from 'react'

export default function EnsureAuthClient() {
  useEffect(() => {
    // If there is no stored user, force navigation to /uis (replace history)
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const justLoggedOut = typeof window !== 'undefined' ? sessionStorage.getItem('justLoggedOut') : null

      // Clear the flag to avoid persistent state
      if (typeof window !== 'undefined' && justLoggedOut) {
        sessionStorage.removeItem('justLoggedOut')
      }

      if (!raw) {
        // No user in localStorage -> force redirect to /uis
        if (typeof window !== 'undefined') {
          window.location.replace('/uis')
        }
      }
    } catch (e) {
      // On any error, fall back to redirect (safer)
      if (typeof window !== 'undefined') {
        window.location.replace('/uis')
      }
    }
  }, [])

  return null
}