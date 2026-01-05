"use client"

import { Box, Avatar, Typography, Paper, Stack, IconButton, Tooltip } from "@mui/material"
import { green, red, grey } from "@mui/material/colors"
import { AddCircleOutline, Message, Settings, AutoAwesome, Map as MapIcon } from "@mui/icons-material"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [currentUser, setCurrentUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch (e) {
      setCurrentUser(null)
    }
  }, [])

  const isOnline = Boolean(currentUser)

  return (
    <Box sx={{
      minHeight: "80vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      p: 3,
      background: "radial-gradient(circle, #f0f2f5 0%, #f0f2f5 100%)" // Soft warm background
    }}>
      
      {/* 1. Main Visual Section */}
      <Box sx={{ position: "relative", mb: 3 }}>
        <Paper elevation={0} sx={{ 
          p: 1, 
          borderRadius: "50%", 
          border: '2px solid',
          borderColor: isOnline ? green[100] : grey[200],
          bgcolor: 'white'
        }}>
          <Image 
            src="/images/illustration.jpg" 
            alt="Chocolat Social" 
            width={180} 
            height={180} 
            style={{ borderRadius: "50%" }}
          />
        </Paper>

        {/* Pulsing Online Indicator */}
        <Box sx={{
          position: "absolute",
          right: 20,
          bottom: 20,
          width: 22,
          height: 22,
          borderRadius: "50%",
          bgcolor: isOnline ? green[500] : red[500],
          border: "4px solid white",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          animation: isOnline ? "pulse 2s infinite" : "none",
          "@keyframes pulse": {
            "0%": { boxShadow: `0 0 0 0px ${green[200]}` },
            "70%": { boxShadow: `0 0 0 10px rgba(0,0,0,0)` },
            "100%": { boxShadow: `0 0 0 0px rgba(0,0,0,0)` },
          }
        }} />
      </Box>

      {/* 2. Personalized Greeting */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: grey[900] }}>
          {currentUser ? `Hi, ${currentUser.pseudo}!` : "Chocolat Social"}
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <AutoAwesome sx={{ fontSize: 16, color: '#fbc02d' }} />
          {isOnline ? "Your sweet space is ready." : "Sign in to start sharing."}
        </Typography>
      </Box>

      {/* 3. Quick Action Bar (The "Idea") */}
      {isOnline && (
        <Paper elevation={0} sx={{ 
          p: 1.5, 
          px: 3,
          borderRadius: 10, 
          bgcolor: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
        }}>
          <Stack direction="row" spacing={3}>
            <Tooltip title="Create Post">
              <IconButton color="primary" onClick={() => router.push('/uis/user-space/creation/new')}><AddCircleOutline /></IconButton>
            </Tooltip>
            <Tooltip title="Messages">
              <IconButton sx={{ color: grey[700] }} onClick={() => router.push('/uis/user-space/chat')}><Message /></IconButton>
            </Tooltip>
            <Tooltip title="Map">
              <IconButton sx={{ color: grey[700] }} onClick={() => router.push('/uis/user-space/maps')}>
                <MapIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>
      )}
    </Box>
  )
}