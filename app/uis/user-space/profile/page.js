"use client"

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
  Grid, 
  Card, 
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  IconButton
} from "@mui/material"
/** React Imports */
import { useEffect, useState } from "react"
/** Next Navigation */
import { useRouter } from "next/navigation"
/** Icons Imports */
import { Settings, PhotoLibrary, Edit } from "@mui/icons-material"

// Tab Panel Component
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

// Safe localStorage parser
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

// Edit Profile Modal Component
function EditProfileModal({ open, onClose, user, onUpdate }) {
  const [formData, setFormData] = useState({
    firstName: '',
    LastName: '',
    pseudo: '',
    email: '',
    gender: '',
    country: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && open) {
      setFormData({
        firstName: user.firstName || '',
        LastName: user.LastName || '',
        pseudo: user.pseudo || '',
        email: user.email || '',
        gender: user.gender || '',
        country: user.country || ''
      })
    }
  }, [user, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get current user ID from localStorage for the update
      const currentUser = getStoredUser()
      if (!currentUser || !currentUser.id) {
        setError('User not found. Please log in again.')
        return
      }

      const updateData = {
        ...formData,
        id: currentUser.id // Include user ID for the update
      }

      const response = await fetch('/api/users?operation=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const result = await response.json()
        // Update both state and localStorage
        const updatedUser = { ...currentUser, ...formData }
        onUpdate(updatedUser)
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Profile</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={formData.LastName}
              onChange={handleChange('LastName')}
              fullWidth
              required
            />
            <TextField
              label="Pseudo"
              value={formData.pseudo}
              onChange={handleChange('pseudo')}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
              required
            />
            <TextField
              select
              label="Gender"
              value={formData.gender}
              onChange={handleChange('gender')}
              fullWidth
            >
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Unspecified">Unspecified</MenuItem>
            </TextField>
            <TextField
              select
              label="Country"
              value={formData.country}
              onChange={handleChange('country')}
              fullWidth
            >
              <MenuItem value="Morocco">Morocco</MenuItem>
              <MenuItem value="USA">USA</MenuItem>
              <MenuItem value="Singapore">Singapore</MenuItem>
            </TextField>
          </Box>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [friendsCount, setFriendsCount] = useState(null)

  // robust friends count helper for current user
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

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        
        // Try to get current user from API first
        const response = await fetch('/api/users?operation=get-current')
        
        if (response.ok) {
          const data = await response.json()
          setCurrentUser(data.user)
          
          // Update localStorage with valid data
          if (data.user) {
            try {
              localStorage.setItem('user', JSON.stringify(data.user))
            } catch (storageError) {
              console.warn('Could not save user to localStorage:', storageError)
            }
          }
        } else {
          // Fallback to localStorage with safe parsing
          const storedUser = getStoredUser()
          if (storedUser) {
            setCurrentUser(storedUser)
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        // Fallback to localStorage with safe parsing
        const storedUser = getStoredUser()
        if (storedUser) {
          setCurrentUser(storedUser)
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Fetch friends count for the current user
  useEffect(() => {
    const run = async () => {
      if (!currentUser?._id && !currentUser?.id) return
      try {
        const userId = currentUser.__id || currentUser.id
        const count = await fetchFriendsCountFor(userId)
        setFriendsCount(typeof count === 'number' ? count : 0)
      } catch (e) {
        setFriendsCount(0)
      }
    }
    run()
  }, [currentUser])

  // Load user's posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!currentUser?._id && !currentUser?.id) return
      
      try {
        const userId = currentUser._id || currentUser.id
        const response = await fetch(`/api/posts?operation=get-by-user&userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Failed to load posts:', error)
      }
    }

    loadPosts()
  }, [currentUser])

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser)
    // Update localStorage with safe handling
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (storageError) {
      console.warn('Could not update user in localStorage:', storageError)
    }
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

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6">Please log in to view your profile</Typography>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => router.push('/uis')}
        >
          Go to Login
        </Button>
      </Container>
    )
  }

  const avatarColor = currentUser.gender === "Male" ? '#1976d2' : '#d81b60'
  const userInitial = (currentUser.pseudo || currentUser.email || '?').charAt(0).toUpperCase()

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Profile
        </Typography>
        <IconButton onClick={() => router.push('/uis/user-space/settings')}>
          <Settings />
        </IconButton>
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
              {currentUser.pseudo || currentUser.firstName || 'User'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentUser.firstName} {currentUser.LastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentUser.email}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setEditModalOpen(true)}
          >
            Edit Profile
          </Button>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {posts.length}
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
            <strong>Gender:</strong> {currentUser.gender || 'Not specified'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Country:</strong> {currentUser.country || 'Not specified'}
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
          {posts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PhotoLibrary sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No posts yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Share your first post to get started!
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {posts.map((post, index) => (
                <Grid item xs={12} sm={6} md={4} key={post._id || index}>
                  <Card>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 200,
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" align="center">
                        {post.content || 'Post content'}
                      </Typography>
                    </CardMedia>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={currentUser}
        onUpdate={handleUpdateUser}
      />
    </Container>
  )
}