'use client'

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Box,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Button
} from "@mui/material"
import { colors } from "@mui/material"

/**
 * ConversationsList
 *
 * - Loads current user id
 * - Fetches messages for user (get-by-user)
 * - Groups into conversations and shows the latest message
 * - Renders clickable list that navigates to /uis/chat/<peerId>
 * - Added Back to User Space button in header
 */

export default function ConversationsList() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([]) // { peerId, lastText, lastAt, peer }
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

        // Fetch user info for each peer in parallel
        const details = await Promise.all(peers.map(async (p) => {
          try {
            const r = await fetch(`/api/users?operation=get-user&id=${encodeURIComponent(p.peerId)}`)
            if (!r.ok) return { ...p, peer: null }
            const pl = await r.json()
            return { ...p, peer: pl?.user || null }
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
    router.push(`/uis/chat/${encodeURIComponent(peerId)}`)
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">Conversations</Typography>
        <Box>
          <Link href="/uis/user-space" passHref>
            <Button variant="contained" size="small">Back to User Space</Button>
          </Link>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ height: "65vh", overflowY: "auto", p: 1 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography>No conversations yet. Start one from the Community tab.</Typography>
          </Box>
        ) : (
          <List>
            {conversations.map((c) => {
              const id = c.peerId
              const user = c.peer
              const name = user ? (user.pseudo || user.firstName || user.email) : id
              const initial = (user?.pseudo || user?.email || "?").charAt(0).toUpperCase()
              const bg = user?.gender === "Male" ? colors.blue[800] : colors.red[600]
              return (
                <ListItemButton key={id} onClick={() => openConversation(id)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: bg }}>{initial}</Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary" sx={{ display: "block" }}>
                          {c.lastText.length > 120 ? `${c.lastText.slice(0, 120)}…` : c.lastText}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {c.lastSentAtRaw ? new Date(c.lastSentAtRaw).toLocaleString() : ""}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              )
            })}
          </List>
        )}
      </Paper>
    </Container>
  )
}