'use client'

/** React Imports */
import * as React from 'react'

/** MUI Imports */
import { ThemeProvider } from '@mui/material'

/** Style Import */
import theme from "./style"

/** Minimal UIs layout with NO header/logout so it doesn't appear on any page */
export default function RootLayout({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <html lang="fr">
        <body style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
          {/* Intentionally minimal: no header or logout button here */}
          <main style={{ flex: 1 }}>{children}</main>
        </body>
      </html>
    </ThemeProvider>
  )
}