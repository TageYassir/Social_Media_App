'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, CircularProgress, List, ListItem, ListItemText, Typography, Avatar, ListItemAvatar, Divider, Paper, TextField, InputAdornment, IconButton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'

/**
 * ConversationsList
 *
 * - Loads current user id (server endpoint fallback -> localStorage)
 * - Loads messages for user and groups them by peer id keeping last message
 * - Resolves peer user records by id (GET /api/users/:id preferred, fallback to /api/users?operation=get-user&id=...)
 * - Shows peer pseudo (or firstName / email) in the list instead of raw ids
 */

export default function ConversationsList() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([]) // { peerId, lastText, lastAt, lastSentAtRaw, peer }
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/users?operation=get-current")
        if (res.ok) {
          const payload = await res.json()
          const uid = payload?.user?._id || payload?.user?.id || payload?.current?.id || payload?.id || null
          if (uid) { setCurrentUserId(uid); return }
        }
      } catch (e) { /* ignore */ }

      // fallback localStorage
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.id) { setCurrentUserId(parsed.id); return }
        }
      } catch (e) { /* ignore */ }

      setCurrentUserId(null)
    }

    loadCurrentUser()
  }, [])

  useEffect(() => {
    async function loadConversations() {
      if (!currentUserId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const url = `/api/messages?operation=get-by-user&userId=${encodeURIComponent(currentUserId)}`
        const res = await fetch(url)
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          setError(payload?.error || `Server returned ${res.status}`)
          setConversations([])
          setLoading(false)
          return
        }

        const payload = await res.json()
        const msgs = Array.isArray(payload?.messages) ? payload.messages : []

        // Group by peer id and keep the latest message per conversation
        const map = new Map()
        msgs.forEach((m) => {
          const otherId = (String(m.senderId) === String(currentUserId)) ? String(m.receiverId) : String(m.senderId)
          if (!otherId) return
          const existing = map.get(otherId)
          const msgTime = m.sentAt ? new Date(m.sentAt).getTime() : 0
          if (!existing || msgTime > existing.lastAt) {
            map.set(otherId, {
              peerId: otherId,
              lastText: m.text || "",
              lastAt: msgTime,
              lastSentAtRaw: m.sentAt || null,
            })
          }
        })

        const peers = Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt)

        // Fetch user info for each peer in parallel.
        // Prefer RESTful GET /api/users/:id, fallback to /api/users?operation=get-user&id=...
        const details = await Promise.all(peers.map(async (p) => {
          try {
            // Try RESTful route first
            try {
              const r = await fetch(`/api/users/${encodeURIComponent(p.peerId)}`)
              if (r.ok) {
                const pl = await r.json().catch(() => null)
                const user = pl?.user ?? pl ?? null
                return { ...p, peer: user }
              }
            } catch (e) {
              // ignore and try fallback
            }

            // Fallback to query-based endpoint
            try {
              const r2 = await fetch(`/api/users?operation=get-user&id=${encodeURIComponent(p.peerId)}`)
              if (r2.ok) {
                const pl2 = await r2.json().catch(() => null)
                return { ...p, peer: pl2?.user || pl2 || null }
              }
            } catch (e) {
              // ignore
            }

            return { ...p, peer: null }
          } catch (e) {
            return { ...p, peer: null }
          }
        }))

        setConversations(details)
      } catch (err) {
        setError(err.message || "Failed to load conversations")
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [currentUserId])

  const openConversation = (peerId) => {
    if (!peerId) return
    // Prefer route-based chat page
    router.push(`/uis/chat/${encodeURIComponent(peerId)}`)
  }

  // client-side filtering by peer pseudo / firstName
  const filteredConversations = conversations.filter((c) => {
    if (!query.trim()) return true
    const peer = c.peer
    const name = peer ? (peer.pseudo || peer.firstName || '') : ''
    return name.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Conversations</Typography>
        <Button size="small" variant="outlined" onClick={() => router.push('/uis/user-space')}>Back</Button>
      </Box>

      {/* Search bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search conversations by pseudo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {query ? (
                  <IconButton size="small" onClick={() => setQuery("")}><ClearIcon /></IconButton>
                ) : null}
              </InputAdornment>
            )
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : conversations.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>No conversations yet</Typography>
          <Typography variant="body2" color="text.secondary">Start a new chat from the All Users screen.</Typography>
        </Paper>
      ) : (
        <List>
          {filteredConversations.map((c) => {
             const peer = c.peer
             const displayName = peer ? (peer.pseudo || peer.firstName || c.peerId) : (c.peerId || "—")
             const subtitle = c.lastText || ""
             const timeText = c.lastSentAtRaw ? new Date(c.lastSentAtRaw).toLocaleString() : ""
             const initial = (peer ? (peer.pseudo || peer.firstName || '') : '').charAt(0).toUpperCase() || '?'

             return (
               <Box key={c.peerId} sx={{ mb: 1 }}>
                 <Paper
                   onClick={() => openConversation(c.peerId)}
                   elevation={0}
                   sx={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: 2,
                     p: 1.25,
                     cursor: 'pointer',
                     transition: 'background-color 150ms',
                     '&:hover': { backgroundColor: 'action.hover' }
                   }}
                 >
                   <ListItemAvatar>
                     <Avatar sx={{ bgcolor: '#1976d2', width: 44, height: 44, fontWeight: 700 }}>{initial}</Avatar>
                   </ListItemAvatar>

                   <ListItemText
                     primary={
                       <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                         {displayName}
                       </Typography>
                     }
                     secondary={
                       <Typography variant="body2" color="text.secondary" noWrap>
                         {subtitle}
                       </Typography>
                     }
                     sx={{ mr: 2 }}
                   />

                   <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                     <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{timeText}</Typography>
                   </Box>
                 </Paper>
                 <Divider />
               </Box>
             )
           })}
         </List>
       )}
     </Box>
   )
 }