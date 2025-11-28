// ...existing code...
"use client"

/** React MUI Imports */
import { List, Avatar, Typography, ListItem, ListItemAvatar, Paper, Badge, ListItemText, colors, IconButton } from "@mui/material"
/** React Imports */
import { useEffect, useState, useRef } from "react"
/** Next Navigation */
import { useRouter } from "next/navigation"
/** Icons Imports */
import { Circle, MailOutline, Refresh } from "@mui/icons-material"
/** Moment Imports */
import moment from "moment"

export default function Page() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollingRef = useRef(null)

  async function fetchOnline() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users?operation=online', {
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include' // enable if you use cookies
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      // Expect array of users: [{ id/_id, pseudo, gender, country, unreadMessages, lastSeen, avatarUrl }, ...]
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setUsers([])
      setError(err.message || 'Failed to load online users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOnline()
    pollingRef.current = setInterval(fetchOnline, 5000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  return (
    <main style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography variant="h6">Online Users ({users.length})</Typography>
        <div>
          <IconButton size="small" onClick={fetchOnline} title="Refresh">
            <Refresh />
          </IconButton>
        </div>
      </header>

      {loading && <Typography>Loading online users…</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && users.length === 0 && !error && <Typography>No users online right now.</Typography>}

      <List sx={{ py: 0 }}>
        {users.map((u) => {
          const id = u.id || u._id || u.pseudo
          const mainInfos = `${u.pseudo || 'Unknown'} - ${u.country || ''}`
          const unreadBadge = (u.unreadMessages > 0) && <Badge badgeContent={u.unreadMessages} color="secondary"><MailOutline color="action" /></Badge>
          const bg = (u.gender === "Male" ? colors.blue[800] : colors.red[600])
          return (
            <Paper key={id} sx={{ mb: 1 }}>
              <ListItem
                secondaryAction={unreadBadge}
                button
                onClick={() => router.push(`/uis/user-space/conversations/${id}`)}
              >
                <ListItemAvatar>
                  <Avatar variant="rounded" sx={{ bgcolor: bg }}>
                    { (u.pseudo || '?').charAt(0).toUpperCase() }
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{mainInfos}</Typography>
                      <Circle sx={{ color: u.isOnline ? 'green' : '#ccc', fontSize: 12 }} />
                    </div>
                  }
                  secondary={u.lastSeen ? moment(u.lastSeen).format("DD/MM/YYYY HH:mm") : 'online'}
                />
              </ListItem>
            </Paper>
          )
        })}
      </List>
    </main>
  )
}
// ...existing code...