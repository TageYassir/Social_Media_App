// File: app/uis/user-space/profile/[id]/friend/page.js
'use client'

/** React MUI Imports */
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Avatar, 
  Paper, 
  Tabs, 
  Tab, 
  CircularProgress,
  IconButton
} from "@mui/material"
/** React Imports */
import { useEffect, useState } from "react"
/** Next Navigation */
import { useRouter } from "next/navigation"
/** Icons Imports */
import { PhotoLibrary } from "@mui/icons-material"
/** Components */
import PostCard from "@/components/Creation/PostCard"

/**
 * Friend profile page
 * - Duplicate of the provided profile page but intended for when the viewer is a FRIEND of the profile user
 * - Differences:
 *   - No Edit button / Edit modal
 *   - No Settings button
 *   - Shows a Message button to directly open the chat with this user
 *
 * NOTE:
 * - This is a client component that extracts the target user id from the current pathname.
 * - It calls /api/users?operation=get-by-id&userId=<id> to fetch the profile. If your API uses a different operation name,
 *   adjust the fetch URL accordingly.
 */

/* Tab Panel Component */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

// Safe localStorage parser (used as fallback only)
const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('user')
    if (!stored || stored === 'undefined' || stored === 'null') {
      return null
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error parsing stored user:', error)
    localStorage.removeItem('user')
    return null
  }
}

export default function FriendProfilePage() {
  const router = useRouter()
  const [profileUser, setProfileUser] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [friendsCount, setFriendsCount] = useState(null)

  // resilient friends count helper
  async function fetchFriendsCountFor(id) {
    if (!id) return 0
    const endpoints = [
      `/api/friends?operation=count&userId=${encodeURIComponent(id)}`,
      `/api/friends?operation=get-friends&userId=${encodeURIComponent(id)}`,
      `/api/friends?operation=list&userId=${encodeURIComponent(id)}`,
      `/api/friends?operation=get&userId=${encodeURIComponent(id)}`,
      `/api/friends?userId=${encodeURIComponent(id)}`,
      `/api/users/${encodeURIComponent(id)}/friends`,
    ]
    const parseCount = (json) => {
      if (json == null) return null
      if (Array.isArray(json)) return json.length
      const candidates = [
        json.count,
        json.total,
        json.friendsCount,
        json.totalCount,
        json.length,
        json.meta?.total,
        json.meta?.count,
        json.data?.length,
        json.friends?.length,
        json.items?.length
      ]
      for (const c of candidates) {
        if (typeof c === 'number' && !Number.isNaN(c)) return c
        if (typeof c === 'string' && !Number.isNaN(Number(c))) return Number(c)
      }
      return null
    }
    for (const url of endpoints) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const json = await res.json().catch(() => null)
        const c = parseCount(json)
        if (c != null) return c
      } catch (e) { /* try next */ }
    }
    return 0
  }

  // derive the id from the pathname: expected /uis/user-space/profile/<id>/friend
  const getTargetIdFromPath = () => {
    if (typeof window === 'undefined') return null
    const parts = window.location.pathname.split('/').filter(Boolean)
    // find 'profile' then take the next segment as id
    const profileIndex = parts.indexOf('profile')
    if (profileIndex >= 0 && parts.length > profileIndex + 1) {
      return parts[profileIndex + 1]
    }
    return null
  }

  const targetId = getTargetIdFromPath()

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true)
      try {
        if (!targetId) {
          setProfileUser(null)
          return
        }

        // Try API first: adjust operation name if your API differs
        const response = await fetch(`/api/users?operation=get-by-id&userId=${encodeURIComponent(targetId)}`)
        if (response.ok) {
          const data = await response.json().catch(() => null)
          setProfileUser(data?.user || null)
        } else {
          // fallback to localStorage or null
          const storedUser = getStoredUser()
          if (storedUser && (storedUser._id === targetId || storedUser.id === targetId)) {
            setProfileUser(storedUser)
          } else {
            // try a secondary API that might return the user in a list
            const allRes = await fetch(`/api/users?operation=get-all-users`)
            const allPayload = await allRes.json().catch(() => null)
            if (Array.isArray(allPayload?.users)) {
              const found = allPayload.users.find(u => String(u._id || u.id) === String(targetId))
              setProfileUser(found || null)
            } else {
              setProfileUser(null)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load profile user:', error)
        const storedUser = getStoredUser()
        if (storedUser && (storedUser._id === targetId || storedUser.id === targetId)) {
          setProfileUser(storedUser)
        } else {
          setProfileUser(null)
        }
      } finally {
        setLoading(false)
      }
    }
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  // Fetch friends count for the profile user
  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!profileUser && !targetId) {
        if (mounted) setFriendsCount(null)
        return
      }
      try {
        const userId = profileUser?._id || profileUser?.id || targetId
        if (!userId) {
          if (mounted) setFriendsCount(0)
          return
        }
        const count = await fetchFriendsCountFor(userId)
        if (mounted) setFriendsCount(typeof count === 'number' ? count : 0)
      } catch (e) {
        if (mounted) setFriendsCount(0)
      }
    }
    run()
    return () => { mounted = false }
  }, [profileUser, targetId])

  // Load user's posts - UPDATED API CALL
  useEffect(() => {
    const loadPosts = async () => {
      if (!targetId) return
      setLoadingPosts(true)
      try {
        // Updated API call to use new endpoint
        const response = await fetch(`/api/posts/user/${targetId}`)
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        } else {
          setPosts([])
        }
      } catch (error) {
        console.error('Failed to load posts:', error)
        setPosts([])
      } finally {
        setLoadingPosts(false)
      }
    }
    loadPosts()
  }, [targetId])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const openChat = () => {
    if (!targetId) return
    router.push(`/uis/user-space/chat/${encodeURIComponent(targetId)}`)
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading profile...
        </Typography>
      </Container>
    )
  }

  if (!profileUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6">Profile not found</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => router.push('/uis/user-space/all-users')}
        >
          Back to All Users
        </Button>
      </Container>
    )
  }

  const avatarColor = profileUser.gender === "Male" ? '#1976d2' : '#d81b60'
  const userInitial = (profileUser.pseudo || profileUser.email || '?').charAt(0).toUpperCase()
  const displayName = profileUser.pseudo || [profileUser.firstName, profileUser.LastName].filter(Boolean).join(' ') || 'User'

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Profile
        </Typography>
        {/* No Settings button for friend view */}
      </Box>

      {/* Profile Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
          <Avatar
            sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: avatarColor,
              fontSize: '2rem'
            }}
          >
            {userInitial}
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {profileUser.firstName} {profileUser.LastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profileUser.email}
            </Typography>
          </Box>

          {/* Message button shown for friend view */}
          <Button
            variant="contained"
            onClick={openChat}
          >
            Message
          </Button>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {loadingPosts ? <CircularProgress size={18} /> : posts.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Posts
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {friendsCount == null ? '—' : friendsCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Friends
            </Typography>
          </Box>
        </Box>

        {/* User Info */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Gender:</strong> {profileUser.gender || 'Not specified'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Country:</strong> {profileUser.country || 'Not specified'}
          </Typography>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            icon={<PhotoLibrary />} 
            label="POSTS" 
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {loadingPosts ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading posts...
              </Typography>
            </Box>
          ) : posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PhotoLibrary sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No posts yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Share something to get noticed!
              </Typography>
            </Box>
          ) : (
            <Box>
              {posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  )
}