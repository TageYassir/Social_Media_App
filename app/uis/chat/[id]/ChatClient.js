'use client'

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useSearchParams, useParams } from "next/navigation"
import { Box, Typography, Container, TextField, Button, List, ListItem } from "@mui/material"

/**
 * ChatClient updated to accept:
 *  - receiver (object) provided by the server page (preferred)
 *  - receiverId prop (if provided by a dynamic page)
 *  - OR `?receiver=<id>` search param (so All Users can navigate to /uis/chat?receiver=<id>)
 *
 * This ensures that when you click "Contact" in All Users the chat receives the correct receiverId.
 *
 * It also keeps the existing logic for loading/sending messages.
 */

export default function ChatClient({ receiver: receiverFromServer = null, receiverId: receiverProp = null }) {
  const searchParams = useSearchParams()
  const receiverFromQuery = searchParams ? searchParams.get("receiver") : null

  // Try to read the dynamic route param as a fallback (page path /uis/chat/[id])
  const params = useParams ? useParams() : {}
  const routeId = params?.id ?? null

  // Determine receiverId: prefer server-provided receiver, else prop, query, or route param
  const receiverId = receiverFromServer ? (receiverFromServer._id || receiverFromServer.id || null) : (receiverProp || receiverFromQuery || routeId || null)

  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [receiver, setReceiver] = useState(receiverFromServer || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/users?operation=get-current")
        if (!res.ok) {
          const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
          if (raw) {
            try {
              const parsed = JSON.parse(raw)
              if (parsed?.id) { setCurrentUserId(parsed.id); setCurrentUser(parsed || null); return }
            } catch (e) { /* ignore parse error */ }
          }
          setCurrentUserId(null)
          setCurrentUser(null)
          return
        }
        const payload = await res.json()
        const uid = payload?.user?._id || payload?.user?.id || payload?.current?.id || payload?.id || null
        if (uid) {
          setCurrentUserId(uid)
          // try to fetch the full current user record so we can show pseudo
          try {
            const r2 = await fetch(`/api/users/${encodeURIComponent(uid)}`)
            if (r2.ok) {
              const p2 = await r2.json()
              const usr = p2?.user ?? p2
              setCurrentUser(usr || null)
            } else {
              // as fallback, try to use payload.user if present
              setCurrentUser(payload?.user || null)
            }
          } catch (e) {
            setCurrentUser(payload?.user || null)
          }
          return
        } else {
          setCurrentUser(null)
           const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
           if (raw) {
             try {
               const parsed = JSON.parse(raw)
               if (parsed?.id) setCurrentUserId(parsed.id)
               else setCurrentUserId(null)
             } catch (e) { setCurrentUserId(null) }
           } else {
             setCurrentUserId(null)
           }
        }
      } catch (err) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed?.id) { setCurrentUserId(parsed.id); setCurrentUser(parsed || null) }
            else { setCurrentUserId(null); setCurrentUser(null) }
          } catch (e) { setCurrentUserId(null); setCurrentUser(null) }
        } else {
          setCurrentUserId(null)
          setCurrentUser(null)
        }
      }
    }

    async function loadReceiver() {
      // If server already provided the receiver object, use it.
      if (receiverFromServer) {
        setReceiver(receiverFromServer)
        return
      }

      if (!receiverId) {
        setReceiver(null)
        return
      }
      try {
        // First try RESTful route if available
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(receiverId)}`)
          if (res.ok) {
            const payload = await res.json()
            setReceiver(payload?.user || payload || null)
            return
          }
        } catch (e) {
          // ignore and fall back to query-based endpoint
        }

        // Fallback to older query-style endpoint used elsewhere in the app
        const res2 = await fetch(`/api/users?operation=get-user&id=${encodeURIComponent(receiverId)}`)
        if (!res2.ok) {
          setReceiver(null)
          return
        }
        const payload2 = await res2.json()
        setReceiver(payload2?.user || payload2 || null)
      } catch (err) {
        setReceiver(null)
      }
    }

    loadCurrentUser()
    loadReceiver()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId, receiverFromServer])

  // fetch conversation whenever we have both currentUserId and receiverId
  useEffect(() => {
    async function fetchConversation() {
      if (!receiverId) {
        setMessages([])
        return
      }

      let userA = currentUserId
      if (!userA) {
        const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed?.id) userA = parsed.id
          } catch (e) { /* ignore */ }
        }
      }
      if (!userA) return

      setLoadingMessages(true)
      setError(null)
      try {
        const url = `/api/messages?operation=get-conversation&userA=${encodeURIComponent(userA)}&userB=${encodeURIComponent(receiverId)}`
        const res = await fetch(url)
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          setError(payload?.error || `Server returned ${res.status}`)
          setMessages([])
        } else {
          const payload = await res.json()
          const msgs = Array.isArray(payload?.messages) ? payload.messages : []
          setMessages(msgs)
          setTimeout(() => scrollToBottom(), 50)
        }
      } catch (err) {
        setError(err.message || "Failed to load conversation")
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchConversation()
  }, [currentUserId, receiverId])

  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
      }
    } catch (e) { /* ignore */ }
  }

  const handleSend = async () => {
    if (!text || text.trim() === "") return
    if (!receiverId) { setError("No receiver selected."); return }
    setSending(true)
    setError(null)

    const sentAt = new Date().toISOString()
    const senderIdFinal = (currentUserId) ? currentUserId : (() => {
      const raw = typeof window !== 'undefined' ? localStorage.getItem("user") : null
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          return parsed?.id || null
        } catch (e) { return null }
      }
      return null
    })()

    if (!senderIdFinal) {
      setError("Unable to determine current user id. Please login again.")
      setSending(false)
      return
    }

    const message = {
      senderId: senderIdFinal,
      receiverId,
      text: text.trim(),
      sentAt,
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      })

      if (res.ok) {
        const payload = await res.json()
        const saved = payload?.message || message
        setMessages((m) => [...m, saved])
        setText("")

        // refetch conversation to ensure persisted ordering
        try {
          const refetchUrl = `/api/messages?operation=get-conversation&userA=${encodeURIComponent(senderIdFinal)}&userB=${encodeURIComponent(receiverId)}`
          const r2 = await fetch(refetchUrl)
          if (r2.ok) {
            const payload2 = await r2.json()
            const msgs = Array.isArray(payload2?.messages) ? payload2.messages : []
            setMessages(msgs)
          }
        } catch (e) { /* ignore */ }
      } else {
        setMessages((m) => [...m, message])
        setText("")
        const payload = await res.json().catch(() => null)
        setError(payload?.error || `Server returned ${res.status}`)
      }
      setTimeout(() => scrollToBottom(), 50)
    } catch (err) {
      setMessages((m) => [...m, message])
      setText("")
      setError(err.message || "Failed to send message")
      setTimeout(() => scrollToBottom(), 50)
    } finally {
      setSending(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h6">
            Conversation with {receiver ? (receiver.pseudo || receiver.firstName || receiver.email) : (receiverId || "—")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You: {currentUser ? (currentUser.pseudo || currentUser.firstName || currentUserId) : (currentUserId || "—")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Link href="/uis/chat" passHref>
            <Button size="small" variant="outlined">Back to Chat List</Button>
          </Link>
          <Link href="/uis/user-space" passHref>
            <Button size="small" variant="contained">Back to User Space</Button>
          </Link>
        </Box>
      </Box>

      <Box sx={{ height: "50vh", overflowY: "auto", p: 1, mb: 2 }}>
        {loadingMessages ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Loading messages...</Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">No messages yet. Write a message below to start the conversation.</Typography>
          </Box>
        ) : (
          <List>
            {messages.map((m, idx) => {
              const isMine = (String(m.senderId) === String(currentUserId))
              const key = m._id || m.id || `${m.sentAt}-${idx}`
              return (
                <ListItem key={key} sx={{ display: "block", py: 1 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "text.primary",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      textAlign: isMine ? "right" : "left",
                    }}
                  >
                    {m.text}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: "text.secondary",
                      mt: 0.5,
                      textAlign: isMine ? "right" : "left",
                    }}
                  >
                    {m.sentAt ? new Date(m.sentAt).toLocaleString() : ""}
                  </Typography>
                </ListItem>
              )
            })}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Write your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={1}
          maxRows={4}
        />
        <Button variant="contained" onClick={handleSend} disabled={sending || !text.trim()}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </Box>

      {error && (
        <Box sx={{ mt: 1 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Container>
  )
}