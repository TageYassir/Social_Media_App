'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography, Paper, BottomNavigation, BottomNavigationAction, Badge, Menu, MenuItem, Container } from "@mui/material"
import NotificationsIcon from '@mui/icons-material/Notifications'
import { LocationOn as LocationOnIcon, MessageOutlined, PeopleOutline, CurrencyBitcoin, HomeOutlined, AccountCircle } from "@mui/icons-material"

export default function CryptoLayout({ children }) {
  const router = useRouter()
  const [value, setValue] = useState(5) // default to Crypto tab
  const [anchorEl, setAnchorEl] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If a user lands on /uis, redirect to /uis/user-space
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.replace(/\/+$/, '')
      if (p === '/uis') {
        router.replace('/uis/user-space')
      }
    }
  }, [router])

  const openMenu = (e) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)

  function loadScreen(event, screenURL) {
    event?.preventDefault?.()
    router.push(screenURL)
  }

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
        localStorage.removeItem('userId')
        sessionStorage.setItem('justLoggedOut', '1')
      }
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.location.replace('/uis')
    }
  }

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
        {/* App Bar */}
        <AppBar position="static">
          <Toolbar>
            <Typography sx={{ fontSize: 18, fontWeight: 700, flexGrow: 1 }}>
              User Space — Crypto
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton onClick={openMenu} aria-label="notifications" size="large" color="inherit">
                <Badge badgeContent={invitations.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>

              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                {loading && <MenuItem><Typography>Loading...</Typography></MenuItem>}
                {!loading && invitations.length === 0 && <MenuItem><Typography>No invitations</Typography></MenuItem>}
                <MenuItem>
                  <Button size="small" onClick={() => { closeMenu(); router.push('/uis/all-users') }}>Browse users</Button>
                </MenuItem>
              </Menu>

              <IconButton onClick={(e) => loadScreen(e, "/uis/user-space/profile")} size="large" color="inherit" sx={{ ml: 1 }}>
                <AccountCircle />
              </IconButton>

              <Button onClick={handleLogout} sx={{ color: 'error.main', textTransform: 'none', fontWeight: 600, ml: 1 }}>
                Logout
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, background: '#f5f7fb' }}>
          <Container maxWidth="lg" sx={{ py: 2 }}>
            {/* ...existing code... */}
            {children}
          </Container>
        </Box>

        {/* Bottom Navigation */}
        <Box>
          <Paper elevation={2}>
            <BottomNavigation showLabels value={value} onChange={(event, newValue) => setValue(newValue)}>
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space")} label="Home" icon={<HomeOutlined />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/maps")} label="Maps" icon={<LocationOnIcon />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/all-users")} label="Community" icon={<PeopleOutline />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/chat")} label="Chat" icon={<MessageOutlined />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/profile")} label="Profile" icon={<AccountCircle />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/crypto")} label="Crypto" icon={<CurrencyBitcoin />} />
            </BottomNavigation>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}