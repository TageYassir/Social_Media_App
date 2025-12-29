// File: app/uis/user-space/profile/[id]/page.js
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Avatar, Typography, Button, CircularProgress, Stack } from '@mui/material'
import PostCard from '@/components/Creation/PostCard'

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const idFromRoute = params?.id

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [relationship, setRelationship] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [friendsCount, setFriendsCount] = useState(null)
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  async function resolveCurrentUserId() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const payload = await res.json().catch(() => null)
        const id = payload?.user?._id || payload?.user?.id || payload?.id || null
        if (id) return id
      }
    } catch (err) {}
    try {
      const res2 = await fetch('/api/users?operation=get-current')
      if (res2.ok) {
        const payload2 = await res2.json().catch(() => null)
        const id2 = payload2?.user?._id || payload2?.user?.id || payload2?.id || null
        if (id2) return id2
      }
    } catch (err) {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('user')
        if (raw) {
          const parsed = JSON.parse(raw)
          const lid = parsed?.id || parsed?._id || null
          if (lid) return lid
        }
      }
    } catch (err) {}
    return null
  }

  // Add: robust friends count fetch helper
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
      // common fields
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
      } catch (e) {
        // ignore and try next
      }
    }
    return 0
  }

  // Load user's posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!idFromRoute) return
      setLoadingPosts(true)
      try {
        // Updated API call to use new endpoint
        const response = await fetch(`/api/posts/user/${idFromRoute}`)
        if (response.ok) {
          const data = await response.json()
          setPosts(data.posts || [])
        }
      } catch (error) {
        console.error('Failed to load posts:', error)
        setPosts([])
      } finally {
        setLoadingPosts(false)
      }
    }
    
    if (idFromRoute) {
      loadPosts()
    }
  }, [idFromRoute])

  useEffect(() => {
    let mounted = true

    const fetchProfile = async (targetId) => {
      setLoading(true)
      setError(null)
      try {
        if (!targetId) {
          setError('No user id provided in route')
          setUser(null)
          return
        }
        const res = await fetch(`/api/users/${encodeURIComponent(targetId)}`, { headers: { 'Content-Type': 'application/json' } })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload?.error || `Server returned ${res.status}`)
        }
        const payload = await res.json().catch(() => null)
        if (mounted) {
          const resolvedUser = payload?.user || payload || null
          setUser(resolvedUser)

          // Fetch friends count for this profile (resilient)
          try {
            const resolvedId = resolvedUser?._id || resolvedUser?.id || targetId
            if (resolvedId) {
              const count = await fetchFriendsCountFor(resolvedId)
              if (mounted) setFriendsCount(typeof count === 'number' ? count : 0)
            } else {
              if (mounted) setFriendsCount(0)
            }
          } catch (e) {
            if (mounted) setFriendsCount(0)
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const boot = async () => {
      const me = await resolveCurrentUserId()
      if (!mounted) return
      setCurrentUserId(me)

      const targetId = idFromRoute
      await fetchProfile(targetId)

      if (me && targetId) {
        try {
          const relRes = await fetch(`/api/friends?operation=get-relationship&userA=${encodeURIComponent(me)}&userB=${encodeURIComponent(targetId)}`)
          if (relRes.ok) {
            const relJson = await relRes.json().catch(() => null)
            if (mounted) setRelationship(relJson?.relationship || null)
          }
        } catch (e) { /* ignore */ }
      }
    }

    boot()
    return () => { mounted = false }
  }, [idFromRoute])

  const sendRequest = async () => {
    if (!currentUserId) return alert('Not authenticated')
    if (!idFromRoute) return alert('No target user id')
    if (String(currentUserId) === String(idFromRoute)) return alert('Cannot send request to yourself')
    setProcessing(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, receiverId: idFromRoute }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to send request')
      const savedReq = payload?.request || payload
      setRelationship(savedReq)

      // Dispatch an event so layouts and other UI can refresh
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('friend-request-changed', { detail: { action: 'sent', request: savedReq } }))
          console.debug('Dispatched friend-request-changed sent', savedReq)
        }
      } catch (e) {
        console.warn('Could not dispatch event', e)
      }
    } catch (err) {
      alert(err.message || 'Failed to send friend request')
    } finally {
      setProcessing(false)
    }
  }

  const respondRequest = async (action) => {
    if (!relationship || !relationship._id) return
    setProcessing(true)
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: relationship._id, action }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || 'Failed to update request')
      const updated = payload?.request || payload
      setRelationship(updated)

      // Dispatch event so layout can update invitations count
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('friend-request-changed', { detail: { action: action, request: updated } }))
          console.debug('Dispatched friend-request-changed', action, updated)
        }
      } catch (e) {
        console.warn('Could not dispatch event', e)
      }
    } catch (err) {
      alert(err.message || 'Failed to update request')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="contained" size="small" onClick={() => router.push('/uis/all-users')}>Back to All Users</Button>
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ mb: 2 }}>User not found for "{idFromRoute}"</Typography>
        <Button variant="contained" size="small" onClick={() => router.push('/uis/all-users')}>Back to All Users</Button>
      </Box>
    )
  }

  const displayName = user.pseudo || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown'
  const avatarSrc = user.avatar || null
  const userId = user._id || user.id || idFromRoute

  const relationshipStatus = relationship?.status || null
  const amSender = relationship && String(relationship.senderId) === String(currentUserId)
  const amReceiver = relationship && String(relationship.receiverId) === String(currentUserId)
  const viewingOwnProfile = currentUserId && String(currentUserId) === String(idFromRoute)

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <Avatar src={avatarSrc} sx={{ width: 96, height: 96, bgcolor: avatarSrc ? 'transparent' : 'primary.main' }}>
          {!avatarSrc && (displayName.charAt(0) || '?').toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{displayName}</Typography>
          {user.username && <Typography color="text.secondary">@{user.username}</Typography>}

          {/* Replace followers/following with friends count */}
          <Typography sx={{ mt: 1 }} color="text.secondary">
            Friends: {friendsCount == null ? '—' : friendsCount}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {relationshipStatus === 'accepted' ? (
            <Button variant="contained" onClick={() => router.push(`/uis/chat/${encodeURIComponent(userId)}`)}>Message</Button>
          ) : relationshipStatus === 'pending' && amSender ? (
            <Button variant="outlined" disabled>Request Sent</Button>
          ) : relationshipStatus === 'pending' && amReceiver ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="success" onClick={() => respondRequest('accept')} disabled={processing}>Accept</Button>
              <Button variant="outlined" color="error" onClick={() => respondRequest('refuse')} disabled={processing}>Refuse</Button>
            </Box>
          ) : viewingOwnProfile ? (
            <Button variant="outlined" disabled>You (profile)</Button>
          ) : (
            <Button variant="contained" onClick={sendRequest} disabled={processing || !currentUserId}>Add Friend</Button>
          )}
        </Stack>
      </Box>

      {/* Posts Section - RESTORED */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Posts ({posts.length})
        </Typography>
        
        {loadingPosts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No posts yet
            </Typography>
          </Box>
        ) : (
          <Box>
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}