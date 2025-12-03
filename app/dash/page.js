"use client";

import React, { useEffect, useMemo, useState } from "react"
import { Money } from "@mui/icons-material";
import {
  Avatar,
  colors,
  Grid,
  Paper,
  Stack,
  Typography,
  Box,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { PieChart } from "@mui/x-charts";
import { BarChart } from "@mui/x-charts/BarChart";

/* 
  Enhanced dashboard:
  - Shows totals: accounts, online, offline, created last 7 days
  - Interactive chart area: choose chart type (pie/bar) and column to group by
  - Aggregates users client-side and renders charts
*/

export default function Page() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Online users dialog state
  const [openOnlineList, setOpenOnlineList] = useState(false)
  const handleOpenOnline = () => setOpenOnlineList(true)
  const handleCloseOnline = () => setOpenOnlineList(false)

  // Helper to inform server the current user is online (best-effort)
  async function markUserOnline(userId) {
    if (!userId) return false
    const url = "/api/users?operation=set-online"
    const body = JSON.stringify({ id: userId, isOnline: true })
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" })
        if (navigator.sendBeacon(url, blob)) return true
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      return res.ok
    } catch (e) {
      return false
    }
  }

  // chart controls
  const [chartType, setChartType] = useState("pie") // pie | bar
  const [groupBy, setGroupBy] = useState("country") // which user field to group by
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/users?operation=get-all-users")
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          setError(payload?.error || `Server returned ${res.status}`)
          setUsers([])
        } else {
          // Normalize users: add computed isOnlineComputed so UI doesn't flip purely based on server isOnline field.
          const raw = Array.isArray(payload?.users) ? payload.users : []
          const now = Date.now()
          const normalized = raw.map((u) => {
            const last = u?.lastActive || u?.lastSeen || u?.updatedAt || u?.lastLogin
            const recentlyActive = last ? (now - new Date(last).getTime() < 5 * 60 * 1000) : false
            const explicitOn = u?.online === true || u?.isOnline === true
            const explicitOff = u?.online === false || u?.isOnline === false
            // If server explicitly marks user offline, respect that. Otherwise use explicit true or recent activity.
            const isOnlineComputed = explicitOff ? false : (explicitOn || recentlyActive)
            return { ...u, isOnlineComputed }
          })
          setUsers(normalized)
          // Best-effort: tell server current local user we're online (so server-side flag has better chance to stay true)
          try {
            const rawStored = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null
            if (rawStored) {
              const stored = JSON.parse(rawStored)
              const uid = stored?.id || stored?._id || stored?.userId
              if (uid) {
                // fire-and-forget
                markUserOnline(uid)
              }
            }
          } catch (e) {
            // ignore storage errors
          }
        }
      } catch (e) {
        setError(e?.message || "Failed to load users")
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [refreshKey])

  // heuristics for online: explicit boolean or lastActive within 5 minutes
  const onlineCount = useMemo(() => {
    if (!Array.isArray(users)) return 0
    return users.reduce((acc, u) => {
      // If normalization produced an explicit computed flag, use it strictly.
      if (typeof u?.isOnlineComputed !== "undefined") {
        return acc + (u.isOnlineComputed ? 1 : 0)
      }
      // Fallback heuristics if no computed flag present
      const now = Date.now()
      const on = u?.online === true || u?.isOnline === true
      const last = u?.lastActive || u?.lastSeen || u?.updatedAt || u?.lastLogin
      const recentlyActive = last ? (now - new Date(last).getTime() < 5 * 60 * 1000) : false
      return acc + (on || recentlyActive ? 1 : 0)
    }, 0)
  }, [users])

  const totalCount = users?.length || 0
  const offlineCount = Math.max(0, totalCount - onlineCount)

  // created last 7 days
  const createdLast7Days = useMemo(() => {
    if (!Array.isArray(users)) return 0
    const now = Date.now()
    return users.reduce((acc, u) => {
      const created = u?.createdAt || u?.created || u?.created_on || u?.created_at
      if (!created) return acc
      const diff = now - new Date(created).getTime()
      return diff <= 7 * 24 * 60 * 60 * 1000 ? acc + 1 : acc
    }, 0)
  }, [users])

  // available grouping fields (restricted to only country and gender)
  const fieldOptions = ["country", "gender"]

  // aggregated data by selected groupBy field (counts)
  const aggregated = useMemo(() => {
    const map = new Map()
    if (!Array.isArray(users)) return []
    users.forEach((u) => {
      // only handle country and gender grouping
      let key = ""
      if (groupBy === "country") key = u.country || "Unknown"
      else if (groupBy === "gender") key = u.gender || "Unknown"
      else key = "Unknown"
      key = String(key)
      map.set(key, (map.get(key) || 0) + 1)
    })
    const arr = Array.from(map.entries()).map(([key, count]) => ({ key, count }))
    // sort by count desc
    arr.sort((a, b) => b.count - a.count)
    return arr
  }, [users, groupBy])

  // chart data builders
  const pieSeries = useMemo(() => {
    return [
      {
        data: aggregated.map((d, idx) => ({ id: idx, value: d.count, label: d.key })),
      },
    ]
  }, [aggregated])

  const barXAxis = useMemo(() => [{ data: aggregated.map((d) => d.key) }], [aggregated])
  const barSeries = useMemo(() => aggregated.length ? [{ data: aggregated.map((d) => d.count) }] : [{ data: [] }], [aggregated])

  // derive online users list (respect explicit false from server via isOnlineComputed)
  const onlineUsers = useMemo(() => {
    if (!Array.isArray(users)) return []
    return users.filter((u) => {
      if (typeof u?.isOnlineComputed !== "undefined") return u.isOnlineComputed === true
      // fallback: keep previous heuristics
      const now = Date.now()
      const on = u?.online === true || u?.isOnline === true
      const last = u?.lastActive || u?.lastSeen || u?.updatedAt || u?.lastLogin
      const recentlyActive = last ? now - new Date(last).getTime() < 5 * 60 * 1000 : false
      return on || recentlyActive
    })
  }, [users])

  return (
    <Grid container spacing={2} sx={{ padding: 2 }}>
      {/* Stats row */}
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">Total Accounts</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalCount}</Typography>
          </Paper>

          {/* clickable Online card */}
          <Paper
            sx={{ p: 2, minWidth: 160, cursor: "pointer", "&:hover": { boxShadow: 3 } }}
            onClick={handleOpenOnline}
            role="button"
            aria-label="Show online users"
          >
            <Typography variant="subtitle2" color="text.secondary">Online</Typography>
            <Typography variant="h5" sx={{ color: colors.green[700], fontWeight: 700 }}>{onlineCount}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">Offline</Typography>
            <Typography variant="h5" sx={{ color: colors.grey[700], fontWeight: 700 }}>{offlineCount}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">Created (last 7 days)</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{createdLast7Days}</Typography>
          </Paper>

          <Box sx={{ flex: 1 }} />

          <Button variant="contained" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</Button>
        </Stack>
      </Grid>

      {/* Controls + Chart */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ bgcolor: colors.indigo[500] }}><Money /></Avatar>
              <Box>
                <Typography variant="subtitle1">Visualize Users</Typography>
                <Typography variant="caption" color="text.secondary">Choose chart type and grouping column</Typography>
              </Box>
            </Stack>

            <TextField select size="small" label="Chart type" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <MenuItem value="pie">Pie</MenuItem>
              <MenuItem value="bar">Bar</MenuItem>
            </TextField>

            <TextField select size="small" label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {fieldOptions.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </TextField>

            <Typography variant="body2" color="text.secondary">
              Showing top {aggregated.length} groups
            </Typography>

            <Box>
              <Button variant="outlined" size="small" onClick={() => { setChartType("pie"); setGroupBy("country") }}>
                Quick: Country (Pie)
              </Button>
              <Button sx={{ ml: 1 }} variant="outlined" size="small" onClick={() => { setChartType("bar"); setGroupBy("gender") }}>
                Quick: Gender (Bar)
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, minHeight: 360 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{chartType === "pie" ? "Distribution (Pie)" : "Distribution (Bar)"}</Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : aggregated.length === 0 ? (
            <Typography color="text.secondary">No data to display.</Typography>
          ) : chartType === "pie" ? (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <PieChart series={pieSeries} width={360} height={320} />
            </Box>
          ) : (
            <Box>
              <BarChart xAxis={barXAxis} series={barSeries} height={320} />
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Recent users preview */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent accounts (latest 10)</Typography>
          <Box>
            {loading ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : (
              users.slice().reverse().slice(0, 10).map((u) => (
                <Stack key={u._id || u.id || JSON.stringify(u).slice(0,8)} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Avatar sx={{ bgcolor: colors.blue[500], width: 36, height: 36 }}>{(u.pseudo || u.firstName || "U").charAt(0)}</Avatar>
                  <Box sx={{ minWidth: 220 }}>
                    <Typography variant="subtitle2">
                      {u.pseudo || u.firstName || u.email || (u._id || u.id)}
                      {u?.isOnlineComputed ? (
                        <Typography component="span" sx={{ ml: 1, color: colors.green[700], fontWeight: 600 }} variant="caption">• online</Typography>
                      ) : null}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{u.country || "—"} — {u.gender || "—"}</Typography>
                  </Box>
                  <Box sx={{ ml: "auto" }}>
                    <Typography variant="caption" color="text.secondary">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}</Typography>
                  </Box>
                </Stack>
              ))
            )}
          </Box>
        </Paper>
      </Grid>

      {/* Online users dialog */}
      <Dialog open={openOnlineList} onClose={handleCloseOnline} fullWidth maxWidth="sm">
        <DialogTitle>
          Online users ({onlineUsers.length})
          <IconButton
            aria-label="close"
            onClick={handleCloseOnline}
            sx={{ position: "absolute", right: 8, top: 8 }}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {onlineUsers.length === 0 ? (
            <Typography color="text.secondary">No users online</Typography>
          ) : (
            <List>
              {onlineUsers.map((u) => (
                <ListItem key={u._id || u.id || JSON.stringify(u).slice(0,8)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: colors.blue[500], width: 36, height: 36 }}>
                      {(u.pseudo || u.firstName || "U").charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.pseudo || u.firstName || u.email || (u._id || u.id)}
                    secondary={u.country ? `${u.country} — ${u.gender || "—"}` : (u.gender || "—")}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Grid>
  );
}
