'use client'

import React, { useEffect, useState } from 'react'
import { Box, Button, TextField, Typography, Alert, CircularProgress } from '@mui/material'

/**
 * /uis page - Login / welcome page
 *
 * Behavior:
 * - Installs a popstate handler so Back navigation always redirects to /uis (endless loop protection).
 * - Presents a login form (email + password) that calls POST /api/users?operation=login.
 * - On successful login:
 *   - Saves the user response to localStorage as { id, ... } (key: 'user')
 *   - Replaces the current location with /uis/user-space (window.location.replace) to prevent Back to login.
 * - If login fails shows the error message.
 *
 * Note:
 * - For the server-side isOnline flag to be set on login you need an API endpoint that updates the user (e.g. POST /api/users?operation=set-online or a dedicated route).
 *   The current server implementation supports logout (operation=logout) but does not automatically flip isOnline=true on login.
 *   If you want, I can add a server-side handler to set isOnline=true after successful login.
 */

export default function UisLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    // Normalize the current history entry to /uis
    try {
      if (typeof window !== 'undefined' && window.history && window.location) {
        window.history.replaceState(null, '', '/uis')
      }
    } catch (e) {
      // ignore
    }

    // When the user tries to go back (popstate), force a replace to /uis
    function onPopState() {
      if (typeof window !== 'undefined') {
        // Replace so Back navigation remains stuck on /uis
        window.location.replace('/uis')
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users?operation=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = payload?.error || `Login failed (${res.status})`
        setError(msg)
        setLoading(false)
        return
      }

      const user = payload?.user || null
      if (!user) {
        setError('Invalid server response: missing user')
        setLoading(false)
        return
      }

      // Save user to localStorage (same fallback chat uses)
      try {
        const stored = { id: user._id || user.id || user._id || user?.id, ...user }
        localStorage.setItem('user', JSON.stringify(stored))
      } catch (err) {
        // ignore storage errors
      }

      // Optionally inform the user
      setInfo('Login successful — redirecting...')
      // Replace the current page with the user-space to avoid Back to login
      if (typeof window !== 'undefined') {
        // Use replace so Login page is removed from history stack
        window.location.replace('/uis/user-space')
      }
    } catch (err) {
      console.error('Login error', err)
      setError('Network or server error during login.')
      setLoading(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 480, margin: '48px auto', px: 2 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Welcome</Typography>
        <Typography variant="body1" color="text.secondary">Please sign in to continue</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
        />

        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />

        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Sign In'}
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="text"
            onClick={() => {
              // navigate to a registration page if exists — replace with your actual registration route
              window.location.href = '/uis/register-screen'
            }}
          >
            Create account
          </Button>

          <Button
            variant="text"
            onClick={() => {
              // help / forgot password route if you have one
              window.location.href = '/uis/recover'
            }}
          >
            Forgot password?
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">After logging out you will be redirected to this page and cannot go back.</Typography>
      </Box>
    </Box>
  )
}