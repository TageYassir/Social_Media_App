'use client'

/** React Imports */
import * as React from 'react'

/** MUI Imports */
import { Box, Button, ThemeProvider } from '@mui/material'

/** Style Import */
import theme from "./style"

/** Layout */
export default function RootLayout({ children }) {
  async function handleLogout() {
    // discover current user id (same fallback as chat)
    let userId = null
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        userId = parsed?.id ?? null
      }
    } catch (e) {
      userId = null
    }

    // Mark user offline on server (best-effort)
    try {
      if (userId) {
        await fetch('/api/users?operation=logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId }),
        }).catch(() => {})
      } else {
        // fallback if you have a session endpoint
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      }
    } catch (e) {
      // ignore server errors
      // console.warn('logout: server call failed', e)
    }

    // clear client-side stored user info
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
        // set a small flag so other pages can detect logout state (optional)
        sessionStorage.setItem('justLoggedOut', '1')
      }
    } catch (e) {
      // ignore
    }

    // Final navigation: replace current history entry with /uis so Back can't return
    if (typeof window !== 'undefined') {
      // Remove the 'justLoggedOut' flag after navigation attempt (best-effort)
      // Use replace to avoid leaving login in history
      window.location.replace('/uis')
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <html lang="fr">
        <body style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
          {/* Header with Logout on the top-right */}
          <Box
            component="header"
            sx={{
              width: '100%',
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Button
              onClick={handleLogout}
              sx={{
                color: 'error.main',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'transparent' },
              }}
            >
              Logout
            </Button>
          </Box>

          {/* Main content grows to fill available space */}
          <main style={{ flex: 1 }}>{children}</main>
        </body>
      </html>
    </ThemeProvider>
  )
}