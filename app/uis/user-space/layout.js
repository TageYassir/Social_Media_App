'use client'

import { LocationOn as LocationOnIcon, MessageOutlined, PeopleOutline, CurrencyBitcoin, HomeOutlined, AccountCircle } from "@mui/icons-material";
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography, Paper, BottomNavigation, BottomNavigationAction, Badge, Menu, MenuItem } from "@mui/material";
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export default function RootLayout({ children }) {
  const router = useRouter();

  // Notifications / invitations state (improved)
  const [anchorEl, setAnchorEl] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [value, setValue] = useState(0);

  // ---------------------------------------------------------------------------
  // Helpers: resolve current user id from server/local state
  // ---------------------------------------------------------------------------
  const resolveCurrentUserId = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const payload = await res.json().catch(() => null)
        const id = payload?.user?._id || payload?.user?.id || payload?.id || null
        if (id) return id
      }
    } catch (e) {}
    try {
      const res2 = await fetch('/api/users?operation=get-current')
      if (res2.ok) {
        const p2 = await res2.json().catch(() => null)
        const id2 = p2?.user?._id || p2?.user?.id || p2?.id || null
        if (id2) return id2
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('user')
        if (raw) {
          const parsed = JSON.parse(raw)
          const lid = parsed?.id || parsed?._id || null
          if (lid) return lid
        }
        const uid = localStorage.getItem('userId')
        if (uid) return uid
      }
    } catch (e) {}
    return null
  }

  // ---------------------------------------------------------------------------
  // Invitations
  // ---------------------------------------------------------------------------
  const fetchInvitations = useCallback(async (uid) => {
    if (!uid) return setInvitations([])
    try {
      const invRes = await fetch(`/api/friends?operation=get-invitations&userId=${encodeURIComponent(uid)}`)
      if (!invRes.ok) {
        const body = await invRes.json().catch(() => null)
        console.warn('Failed to fetch invitations', body)
        setInvitations([])
        return
      }
      const payload = await invRes.json().catch(() => null)
      setInvitations(payload?.invitations || [])
    } catch (e) {
      console.warn('fetchInvitations error', e)
      setInvitations([])
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const boot = async () => {
      setLoading(true)
      const me = await resolveCurrentUserId()
      if (!mounted) return
      setCurrentUserId(me)
      if (me) await fetchInvitations(me)
      setLoading(false)
    }
    boot()
    return () => { mounted = false }
  }, [fetchInvitations])

  // re-fetch when other parts of the app dispatch this event
  useEffect(() => {
    const handler = (e) => {
      try {
        if (currentUserId) fetchInvitations(currentUserId)
      } catch (err) {
        console.warn('friend-request-changed handler error', err)
      }
    }
    window.addEventListener('friend-request-changed', handler)
    return () => window.removeEventListener('friend-request-changed', handler)
  }, [currentUserId, fetchInvitations])

  const openMenu = (e) => setAnchorEl(e.currentTarget)
  const closeMenu = () => setAnchorEl(null)

  const respond = async (requestId, action) => {
    setProcessingId(requestId)
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to update invitation')
      setInvitations((prev) => prev.filter(i => String(i._id) !== String(requestId)))
      try { window.dispatchEvent(new CustomEvent('friend-request-changed', { detail: { action, requestId } })) } catch (e) {}
    } catch (err) {
      alert(err.message || 'Failed to update invitation')
    } finally {
      setProcessingId(null)
    }
  }

  // navigation helper
  function loadScreen(event, screenURL) {
    event?.preventDefault?.();
    router.push(screenURL);
  }

  // ---------------------------------------------------------------------------
  // Wallet disconnect helper (attempts to disconnect common providers + clear cache)
  // ---------------------------------------------------------------------------
  const signOutWallet = async () => {
    try {
      if (typeof window === 'undefined') return;
      const eth = window.ethereum;
      try { if (eth && typeof eth.disconnect === 'function') await eth.disconnect().catch(() => {}); } catch (e) {}
      try { if (eth && typeof eth.close === 'function') await eth.close().catch(() => {}); } catch (e) {}
      try { if (eth?.connector?.disconnect) await eth.connector.disconnect().catch(() => {}); } catch (e) {}
      try { if (eth?.connector?.close) await eth.connector.close().catch(() => {}); } catch (e) {}
      try { if (eth?.wc?.disconnect) await eth.wc.disconnect().catch(() => {}); } catch (e) {}
    } catch (e) {
      // ignore provider disconnect errors
    }

    // remove common cached keys used by WalletConnect / connectors / libs
    try {
      const cachedKeys = [
        'walletconnect',
        'WALLETCONNECT_DEEPLINK_CHOICE',
        'WALLET_CONNECT_CACHED_PROVIDER',
        'connectedWallet',
        'connectorId',
        'wagmi.wallet',
        'web3auth',
        'connectedWalletAddress'
      ];
      cachedKeys.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) {}

    try { window.dispatchEvent(new CustomEvent('wallet-disconnected')); } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // local cleanup: remove wallet and tx keys from localStorage (all or for specific user)
  // ---------------------------------------------------------------------------
  function clearWalletLocalKeysForUser(optionalUserId) {
    try {
      if (typeof window === 'undefined') return;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (optionalUserId) {
          if (key.startsWith(`wallet:${optionalUserId}:`) || key.startsWith(`tx:${optionalUserId}`) || key.startsWith(`tx:`)) {
            localStorage.removeItem(key);
          }
        } else {
          if (key.startsWith('wallet:') || key.startsWith('tx:')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  // ---------------------------------------------------------------------------
  // Logout handler — improved to clear client-side wallet artifacts and broadcast logout
  // ---------------------------------------------------------------------------
  async function handleLogout() {
    // discover current user id (same fallback as earlier)
    let userId = null
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        userId = parsed?.id ?? parsed?._id ?? null
      }
      if (!userId) {
        const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
        if (uid) userId = uid
      }
    } catch (e) {
      userId = null
    }

    // attempt server logout (best-effort)
    try {
      if (userId) {
        await fetch('/api/users?operation=logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId }),
        }).catch(() => {})
      } else {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      }
    } catch (e) {
      // ignore
    }

    // disconnect wallet providers and clear related cached keys
    try {
      await signOutWallet()
    } catch (e) {}

    // Clear local app state and wallet artifacts
    try {
      localStorage.removeItem('user')
    } catch (e) {}
    try {
      localStorage.removeItem('userId')
    } catch (e) {}
    try {
      sessionStorage.setItem('justLoggedOut', '1')
    } catch (e) {}

    // Clear wallet and tx keys (prefer per-user, if available)
    try {
      if (userId) clearWalletLocalKeysForUser(userId)
      else clearWalletLocalKeysForUser()
    } catch (e) {}

    // Broadcast logout so other tabs / components can react
    try {
      localStorage.setItem('user-logout-ts', String(Date.now()));
      // also dispatch a custom event for in-tab listeners
      try { window.dispatchEvent(new CustomEvent('user-logout', { detail: { userId } })) } catch (e) {}
    } catch (e) {}

    // Redirect to public area
    try {
      window.location.replace('/uis')
    } catch (e) {
      try { router.replace('/uis') } catch (er) {}
    }
  }

  // Expose sign-out helper and listen for external logout broadcasts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try { window.appSignOut = handleLogout } catch (e) {}

    function onStorage(e) {
      try {
        if (!e) return;
        // When another tab signals logout, clear local wallet and user keys locally
        if (e.key === 'user-logout-ts') {
          try { localStorage.removeItem('user'); } catch (er) {}
          try { localStorage.removeItem('userId'); } catch (er) {}
          clearWalletLocalKeysForUser();
          setCurrentUserId(null);
        }

        // If userId was removed in another tab, clear wallet keys
        if (e.key === 'userId') {
          const oldVal = e.oldValue;
          const newVal = e.newValue;
          if (!newVal) {
            // user cleared -> remove all wallet keys and reset currentUserId
            clearWalletLocalKeysForUser();
            setCurrentUserId(null);
          } else if (oldVal && oldVal !== newVal) {
            // user switched accounts in another tab: remove previous user's wallet keys and update currentUserId
            try { clearWalletLocalKeysForUser(oldVal); } catch (er) {}
            setCurrentUserId(newVal);
            fetchInvitations(newVal);
          } else if (!oldVal && newVal) {
            // fresh login in another tab
            setCurrentUserId(newVal);
            fetchInvitations(newVal);
          }
        }

        // If full user object changed (e.g. login), attempt to read and update currentUserId
        if (e.key === 'user') {
          try {
            const parsed = e.newValue ? JSON.parse(e.newValue) : null;
            const newId = parsed?.id || parsed?._id || null;
            if (newId) {
              setCurrentUserId(newId);
              fetchInvitations(newId);
            }
            if (!e.newValue) {
              // removed user
              setCurrentUserId(null);
            }
          } catch (err) {}
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('storage', onStorage)
    return () => {
      try { delete window.appSignOut } catch (e) {}
      window.removeEventListener('storage', onStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInvitations])

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}>
      <Box sx={{ position: "relative", top: 0, left: 0, bottom: 0, right: 0, display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
        {/* App Bar (minimal) */}
        <Box>
          <AppBar position="static">
            <Toolbar>
              <Typography sx={{ fontSize: 18, fontWeight: 700, flexGrow: 1 }}>
                Mini-Map
              </Typography>
              <Stack direction={"row"} spacing={1} alignItems="center">
                {/* Notifications */}
                <Box>
                  <IconButton onClick={openMenu} aria-label="notifications" size="large">
                    <Badge badgeContent={invitations.length} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>

                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                    {loading && <MenuItem><Typography>Loading...</Typography></MenuItem>}
                    {!loading && invitations.length === 0 && <MenuItem><Typography>No invitations</Typography></MenuItem>}
                    {!loading && invitations.map((inv) => (
                      <MenuItem key={inv._id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2">{inv.senderId?.pseudo || `${inv.senderId?.firstName || ''} ${inv.senderId?.lastName || ''}`}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" onClick={() => respond(inv._id, 'accept')} disabled={processingId === inv._id}>Accept</Button>
                          <Button size="small" variant="outlined" onClick={() => respond(inv._id, 'refuse')} disabled={processingId === inv._id}>Refuse</Button>
                        </Box>
                      </MenuItem>
                    ))}
                    <MenuItem>
                      <Button size="small" onClick={() => { closeMenu(); router.push('/uis/user-space/all-users') }}>Browse users</Button>
                    </MenuItem>
                  </Menu>
                </Box>

                <IconButton onClick={(e) => loadScreen(e, "/uis/user-space/profile")} size="large" edge="end" sx={{ ml: 1 }}>
                  {/* tiny profile button remains optional */}
                </IconButton>

                {/* Logout placed in User Space app bar */}
                <Button onClick={handleLogout} sx={{ color: 'error.main', textTransform: 'none', fontWeight: 600 }}>
                  Logout
                </Button>
              </Stack>
            </Toolbar>
          </AppBar>
        </Box>

        {/* Children */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          {children}
        </Box>

        {/* Bottom Navigation - Maps, Chat, Crypto (currency) and Community */}
        <Box>
          <Paper elevation={2}>
            <BottomNavigation showLabels value={value} onChange={(event, newValue) => setValue(newValue)}>
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space")} label="Home" icon={<HomeOutlined />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/maps")} label="Maps" icon={<LocationOnIcon />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/all-users")} label="Community" icon={<PeopleOutline />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/chat")} label="Chat" icon={<MessageOutlined />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/profile")} label="Profile" icon={<AccountCircle />} />
              <BottomNavigationAction onClick={(e) => loadScreen(e, "/uis/user-space/crypto-ethers")} label="Crypto" icon={<CurrencyBitcoin />} />
            </BottomNavigation>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
