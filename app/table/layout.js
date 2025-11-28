"use client"

import * as React from "react"
import { CssBaseline } from "@mui/material"

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <CssBaseline />
        {children}
      </body>
    </html>
  )
}