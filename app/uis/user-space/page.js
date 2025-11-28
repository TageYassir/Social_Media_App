"use client"

/** React / MUI Imports */
import { Box, Avatar, Typography } from "@mui/material"
import { green, red } from "@mui/material/colors"
import Image from "next/image"
import { useEffect, useState } from "react"

/**
 * Cleaned user-space page:
 * - Shows only the app logo centered
 * - Displays a small online indicator (green if signed-in user present, red otherwise)
 * - Clicking the logo could navigate (handled by footer Home button), but keeping simple view here
 */

export default function Page() {
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      if (raw) {
        setCurrentUser(JSON.parse(raw))
      } else {
        setCurrentUser(null)
      }
    } catch (e) {
      setCurrentUser(null)
    }
  }, [])

  const isOnline = Boolean(currentUser) // treat presence of user in localStorage as signed-in/online

  return (
    <Box sx={{
      minHeight: "70vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 2,
      p: 2
    }}>
      {/* Logo */}
      <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {/* Logo image */}
        <Image src="/images/illustration.jpg" alt="Chocolat Social" width={160} height={160} />

        {/* Online indicator circle */}
        <Box sx={{
          position: "absolute",
          right: 8,
          bottom: 8,
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: isOnline ? green[500] : red[500],
          border: "2px solid white",
        }} />
      </Box>

      {/* Optional: show user pseudo under logo if connected */}
      {currentUser ? (
        <Typography variant="subtitle1">{currentUser.pseudo || currentUser.email}</Typography>
      ) : (
        <Typography variant="subtitle2" color="textSecondary">Not signed in</Typography>
      )}
    </Box>
  )
}