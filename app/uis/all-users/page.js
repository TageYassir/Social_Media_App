'use client'

import React, { useEffect, useState, useRef } from "react"
import { Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Paper, CircularProgress, Container, Badge, TextField, IconButton, InputAdornment, Button } from "@mui/material"
import { colors } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import Link from "next/link"
import { useRouter } from "next/navigation"

/**
 * All Users page — Contact now navigates directly to /uis/chat/<userId>
 */

export default function AllUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState("")
  const debounceRef = useRef(null)
  const router = useRouter()

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

  // initial load
  useEffect(() => {
    fetchUsers("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchUsers(query.trim())
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleClear = () => setQuery("")
  const handleSubmit = (e) => { e.preventDefault(); if (debounceRef.current) clearTimeout(debounceRef.current); fetchUsers(query.trim()) }

  // Navigate to direct chat path (dynamic route)
  const navigateToChatWith = (id) => {
    if (!id) return
    router.push(`/uis/chat/${encodeURIComponent(id)}`)
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">All Users</Typography>
        <Link href="/uis/user-space" passHref>
          <Button size="small" variant="contained">Back to User Space</Button>
        </Link>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by name or pseudo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {query ? (
                  <IconButton size="small" onClick={() => setQuery("")}><ClearIcon /></IconButton>
                ) : (
                  <SearchIcon />
                )}
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Paper elevation={2} sx={{ height: "75vh", overflowY: "auto", p: 1 }}>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {!loading && !error && users.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography>No users found.</Typography>
          </Box>
        )}

        {!loading && !error && users.length > 0 && (
          <List>
            {users.map((u) => {
              const id = u._id || u.id || null
              // compute a display name without using email
              const displayName = u.pseudo || [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown"
              const initial = (displayName.charAt(0) || "?").toUpperCase()
              const bg = (u.gender === "Male" ? colors.blue[800] : colors.red[600])
              // only show non-email info
              const subtitleParts = []
              if (u.country) subtitleParts.push(u.country)
              const subtitle = subtitleParts.join(" • ")

              const handleOpenConversation = () => navigateToChatWith(id)
              const handleContactClick = (e) => { e.stopPropagation(); navigateToChatWith(id) }

              return (
                <Paper
                  key={id || `${u.pseudo || u.firstName || 'user'}-${Math.random()}`}
                  sx={{ mb: 1, cursor: id ? "pointer" : "default" }}
                  role="button"
                  tabIndex={id ? 0 : -1}
                  onClick={id ? handleOpenConversation : undefined}
                  onKeyDown={(e) => { if (e.key === "Enter" && id) handleOpenConversation() }}
                >
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={handleContactClick} disabled={!id}>
                          Contact
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: bg }}>{initial}</Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {displayName}
                          </Typography>
                        </Box>
                      }
                      secondary={subtitle}
                    />
                  </ListItem>
                </Paper>
              )
            })}
          </List>
        )}
      </Paper>
    </Container>
  )
}