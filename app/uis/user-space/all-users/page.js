'use client'

import React, { useEffect, useState, useRef } from "react"
import { 
  Box, 
  Avatar, 
  Typography, 
  Paper, 
  CircularProgress, 
  Container, 
  TextField, 
  IconButton, 
  InputAdornment, 
  Button, 
  Stack, 
  Chip,
  Divider,
  useTheme,
  useMediaQuery
} from "@mui/material"
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  ChatBubbleOutline as ChatIcon, 
  PersonOutline as PersonIcon,
  ArrowForward as ArrowIcon,
  EmojiPeople as WaveIcon
} from "@mui/icons-material"
import { useRouter } from "next/navigation"

// --- Helper for consistent colors based on gender or random ---
const getAvatarColor = (gender) => {
  if (gender === 'Male') return '#1976d2' // Blue
  if (gender === 'Female') return '#d32f2f' // Red
  return '#7b1fa2' // Purple default
}

export default function AllUsersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const router = useRouter()

  // --- STATE ---
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState("")
  const debounceRef = useRef(null)

  // friends state
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [friendIds, setFriendIds] = useState(new Set())

  // --- LOGIC ---

  const getCurrentUserId = () => {
    try {
      if (typeof window === 'undefined') return null
      const userRaw = window.localStorage.getItem('user') || window.localStorage.getItem('currentUser')
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw)
          if (u && (u._id || u.id)) return u._id || u.id
        } catch (e) { /* ignore */ }
      }
      const idDirect = window.localStorage.getItem('currentUserId') || window.localStorage.getItem('userId')
      if (idDirect) return idDirect
      return null
    } catch (e) {
      return null
    }
  }

  const currentUserId = getCurrentUserId()

  async function fetchUsers(q = "") {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/users?operation=get-all-users${q ? `&q=${encodeURIComponent(q)}` : ""}`
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload?.error || `Server returned ${res.status}`)
        setUsers([])
      } else {
        const list = Array.isArray(payload.users) ? payload.users : []
        setUsers(list)
      }
    } catch (err) {
      setError(err.message || "Failed to load users")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchFriendsForCurrentUser() {
    if (!currentUserId) {
      setFriends([])
      setFriendIds(new Set())
      return
    }
    setLoadingFriends(true)
    try {
      const url = `/api/friends?operation=get-friends&userId=${encodeURIComponent(currentUserId)}`
      const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        setFriends([])
        setFriendIds(new Set())
      } else {
        const list = Array.isArray(payload.friends) ? payload.friends : []
        setFriends(list)
        const ids = new Set(list.map(u => u._id || u.id).filter(Boolean))
        setFriendIds(ids)
      }
    } catch (e) {
      setFriends([])
      setFriendIds(new Set())
    } finally {
      setLoadingFriends(false)
    }
  }

  // Initial loads
  useEffect(() => {
    fetchUsers("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchFriendsForCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchUsers(query.trim())
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleClear = () => setQuery("")
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (debounceRef.current) clearTimeout(debounceRef.current); 
    fetchUsers(query.trim()) 
  }

  // --- NAVIGATION ---
  const navigateToChatWith = (id) => {
    if (!id) return
    router.push(`/uis/user-space/chat/${encodeURIComponent(id)}`)
  }

  const navigateToUserProfile = (id) => {
    if (!id) return
    router.push(`/uis/user-space/profile/${encodeURIComponent(id)}`)
  }

  const navigateToFriendProfile = (id) => {
    if (!id) return
    router.push(`/uis/user-space/profile/${encodeURIComponent(id)}/friend`)
  }

  // --- RENDER ---
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', pb: 8 }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        
        {/* HEADER SECTION */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                Discover
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Connect with people and friends
              </Typography>
            </Box>
            <Chip 
              label={`${users.length} Users`} 
              size="small" 
              sx={{ fontWeight: 600, bgcolor: '#e3f2fd', color: '#1976d2' }} 
            />
          </Box>

          {/* MODERN SEARCH BAR */}
          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '16px',
              border: '1px solid #e0e0e0',
              bgcolor: 'white',
              transition: 'box-shadow 0.2s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                borderColor: 'transparent'
              },
              '&:focus-within': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                borderColor: 'primary.main'
              }
            }}
          >
            <InputAdornment position="start" sx={{ pl: 2 }}>
              <SearchIcon color="action" />
            </InputAdornment>
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                disableUnderline: true,
              }}
              sx={{ px: 1, py: 1.5 }}
            />
            {query && (
              <IconButton onClick={handleClear} sx={{ mr: 1 }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </Paper>
        </Box>

        {/* FRIENDS SECTION (If logged in) */}
        {currentUserId && (
          <Box sx={{ mb: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WaveIcon sx={{ color: '#f57c00' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Your Friends</Typography>
            </Box>
            
            {loadingFriends ? (
               <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
                 {[1,2,3].map(i => <Box key={i} sx={{ width: 140, height: 80, bgcolor: '#e0e0e0', borderRadius: 3 }} />)}
               </Stack>
            ) : friends.length === 0 ? (
              <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', bgcolor: 'white', border: '1px dashed #bdbdbd' }} elevation={0}>
                <Typography variant="body2" color="text.secondary">You haven't added any friends yet.</Typography>
              </Paper>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                overflowX: 'auto', 
                pb: 1, 
                mx: -2, 
                px: 2,
                // Hide scrollbar but keep functionality
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}>
                {friends.map((f) => {
                  const id = f._id || f.id
                  const displayName = f.pseudo || [f.firstName, f.lastName].filter(Boolean).join(" ")
                  const initial = (displayName?.charAt(0) || "?").toUpperCase()
                  
                  return (
                    <Paper
                      key={id || Math.random()}
                      elevation={0}
                      onClick={() => navigateToChatWith(id)}
                      sx={{
                        minWidth: 140,
                        maxWidth: 140,
                        p: 2,
                        borderRadius: 4,
                        border: '1px solid #f0f0f0',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                          borderColor: 'transparent'
                        }
                      }}
                    >
                      <Avatar 
                        sx={{ 
                          width: 48, 
                          height: 48, 
                          bgcolor: getAvatarColor(f.gender), 
                          mx: 'auto', 
                          mb: 1.5,
                          fontSize: 18,
                          fontWeight: 'bold',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {initial}
                      </Avatar>
                      <Typography noWrap variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {displayName}
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1.5 }}>
                        Friend
                      </Typography>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        fullWidth 
                        sx={{ 
                          borderRadius: 4, 
                          fontSize: '0.7rem', 
                          textTransform: 'none', 
                          py: 0.5 
                        }}
                        onClick={(e) => { e.stopPropagation(); navigateToFriendProfile(id) }}
                      >
                        Profile
                      </Button>
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Box>
        )}

        {/* ALL USERS LIST */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>All Members</Typography>

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={32} thickness={5} />
            </Box>
          )}

          {error && (
            <Paper sx={{ p: 3, bgcolor: '#ffebee', color: '#c62828', borderRadius: 2 }} elevation={0}>
              <Typography>{error}</Typography>
            </Paper>
          )}

          {!loading && !error && users.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6, opacity: 0.6 }}>
              <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography>No users found matching "{query}"</Typography>
            </Box>
          )}

          {!loading && !error && users.length > 0 && (
            <Stack spacing={2}>
              {users.map((u) => {
                const id = u._id || u.id
                const displayName = u.pseudo || [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown"
                const initial = (displayName.charAt(0) || "?").toUpperCase()
                const subtitle = u.country || "Global Citizen"
                const isFriend = id && friendIds.has(id)

                return (
                  <Paper
                    key={id || Math.random()}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #eee',
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: 'center',
                      gap: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                        transform: 'scale(1.005)'
                      }
                    }}
                  >
                    {/* Avatar Area */}
                    <Box sx={{ position: 'relative' }}>
                      <Avatar 
                        sx={{ 
                          width: 56, 
                          height: 56, 
                          bgcolor: getAvatarColor(u.gender),
                          fontSize: 20,
                          fontWeight: 'bold'
                        }}
                      >
                        {initial}
                      </Avatar>
                      {isFriend && (
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          right: 0, 
                          width: 16, 
                          height: 16, 
                          bgcolor: u.isOnline ? '#4caf50' : '#f44336', // Green for online, Red for offline
                          borderRadius: '50%', 
                          border: '2px solid white' 
                        }} />
                      )}
                    </Box>

                    {/* Text Area */}
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 0.5 }}>
                        {subtitle}
                      </Typography>
                    </Box>

                    {/* Actions Area */}
                    <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                    
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      width: { xs: '100%', sm: 'auto' }, 
                      justifyContent: 'center' 
                    }}>
                      {isFriend ? (
                        <>
                          <Button
                            variant="contained"
                            disableElevation
                            startIcon={<ChatIcon />}
                            onClick={() => navigateToChatWith(id)}
                            sx={{ borderRadius: 2, textTransform: 'none', flex: { xs: 1, sm: 'none' } }}
                          >
                            Message
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => navigateToFriendProfile(id)}
                            sx={{ borderRadius: 2, minWidth: 0, px: 2, borderColor: '#e0e0e0' }}
                          >
                            <PersonIcon />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outlined"
                          endIcon={<ArrowIcon />}
                          onClick={() => navigateToUserProfile(id)}
                          sx={{ 
                            borderRadius: 2, 
                            textTransform: 'none', 
                            borderWidth: '1.5px',
                            width: { xs: '100%', sm: 'auto' },
                            '&:hover': { borderWidth: '1.5px' }
                          }}
                        >
                          Contact
                        </Button>
                      )}
                    </Box>
                  </Paper>
                )
              })}
            </Stack>
          )}
        </Box>
      </Container>
    </Box>
  )
}