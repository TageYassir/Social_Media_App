"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Money } from "@mui/icons-material"
import {
  Avatar,
  colors,
  Paper,
  Stack,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
} from "@mui/material"
import InputAdornment from "@mui/material/InputAdornment"
import IconButtonMaterial from "@mui/material/IconButton"
import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import DeleteIcon from "@mui/icons-material/Delete"

/**
 * Client page that fetches users from your API and re-uses the original filter UI.
 *
 * Notes:
 * - Keeps the original state names: `gender` and `country`.
 * - Expects an API endpoint at /api/users?operation=get-all-users that returns JSON:
 *   { users: [ { _id, id, gender, country, firstName, lastName, email, ... }, ... ] }
 */

export default function Page() {
  // keep your original state names
  let [gender, setGender] = useState("")
  let [country, setCountry] = useState("")

  // search state
  const [query, setQuery] = useState("")
  const [searchBy, setSearchBy] = useState("pseudo") // pseudo | email | lastName | firstName | id

  // users coming from API
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Wallet manager state
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [walletsError, setWalletsError] = useState(null)
  const [wallets, setWallets] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/users?operation=get-all-users", {
        headers: { "Content-Type": "application/json" },
      })
      const payload = await res.json().catch(() => ({}))

      // Accept multiple shapes returned by Mongo-based routes:
      // - { users: [...] }
      // - { success: true, data: [...] }
      // - [...] (plain array)
      let list = []
      if (Array.isArray(payload)) {
        list = payload
      } else if (Array.isArray(payload.users)) {
        list = payload.users
      } else if (Array.isArray(payload.data)) {
        list = payload.data
      } else if (payload && payload.success && Array.isArray(payload.items)) {
        list = payload.items
      }

      if (!res.ok && list.length === 0) {
        setError(payload?.error || `Server returned ${res.status}`)
        setUsers([])
      } else {
        setUsers(list)
      }
    } catch (err) {
      setError(err?.message || "Failed to load users")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchWalletsForUser(displayId) {
    if (!displayId) return
    setWalletsLoading(true)
    setWalletsError(null)

    const encoded = encodeURIComponent(displayId)

    // Try multiple candidate endpoints (including the /api/crypto routes)
    const candidates = [
      `/api/users/${encoded}/wallets`,
      `/api/crypto/wallets?userId=${encoded}`,
      `/api/crypto?operation=get-wallets&userId=${encoded}`,
      `/api/crypto/wallets/${encoded}`,
      `/api/crypto/${encoded}/wallets`,
    ]

    let lastError = null

    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
        const payload = await res.json().catch(() => ({}))

        // Normalize possible shapes
        let list = []
        if (Array.isArray(payload)) {
          list = payload
        } else if (Array.isArray(payload.wallets)) {
          list = payload.wallets
        } else if (Array.isArray(payload.data)) {
          list = payload.data
        } else if (Array.isArray(payload.items)) {
          list = payload.items
        }

        if (!res.ok && list.length === 0) {
          // remember error and try next candidate
          lastError = payload?.error || `Server returned ${res.status} at ${url}`
          continue
        }

        // success
        setWallets(list)
        setWalletsLoading(false)
        return
      } catch (err) {
        lastError = err?.message || `Fetch failed for ${url}`
        // try next
        continue
      }
    }

    // all candidates failed
    setWalletsError(lastError || "Failed to load wallets")
    setWallets([])
    setWalletsLoading(false)
  }

  const handleGenderChange = function (event) {
    setGender(event.target.value)
  }
  const handleCountryChange = function (event) {
    setCountry(event.target.value)
  }

  const openWalletManager = (displayId) => {
    setSelectedUserId(displayId)
    setWalletDialogOpen(true)
    fetchWalletsForUser(displayId)
  }

  const closeWalletManager = () => {
    setWalletDialogOpen(false)
    setSelectedUserId(null)
    setWallets([])
    setWalletsError(null)
  }

  // derive unique options from data so UI stays consistent
  const genderOptions = useMemo(() => {
    const s = new Set()
    users.forEach((u) => {
      if (u?.gender) s.add(u.gender)
    })
    return Array.from(s)
  }, [users])

  const countryOptions = useMemo(() => {
    const s = new Set()
    users.forEach((u) => {
      if (u?.country) s.add(u.country)
    })
    return Array.from(s)
  }, [users])

  // filtering: empty string means show all; also apply search filter by selected field
  const filteredUsers = users.filter(function (item) {
    const genderOk = !gender || item.gender === gender
    const countryOk = !country || item.country === country

    // search matching
    const q = (query || "").trim().toLowerCase()
    let searchOk = true
    if (q) {
      if (searchBy === "pseudo") {
        const val = (item.pseudo || item.username || item.handle || "").toString().toLowerCase()
        searchOk = val.includes(q)
      } else if (searchBy === "email") {
        const val = (item.email || "").toString().toLowerCase()
        searchOk = val.includes(q)
      } else if (searchBy === "lastName") {
        const val = (item.lastName || item.familyName || item.surname || "").toString().toLowerCase()
        searchOk = val.includes(q)
      } else if (searchBy === "firstName") {
        const val = (item.firstName || item.name || item.first || "").toString().toLowerCase()
        searchOk = val.includes(q)
      } else if (searchBy === "id") {
        const val = (item._id || item.id || "").toString().toLowerCase()
        searchOk = val.includes(q)
      }
    }

    return genderOk && countryOk && searchOk
  })

  const clearFilters = () => {
    setGender("")
    setCountry("")
    setQuery("")
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Avatar sx={{ bgcolor: colors.indigo[500], width: 40, height: 40 }}>
          <Money />
        </Avatar>

        <Box>
          <Typography variant="h6">Users</Typography>
          <Typography variant="body2" color="text.secondary">
            A simple list with header filters — pulls users from your API.
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Chip label={loading ? "Loading…" : `${filteredUsers.length} / ${users.length}`} color="primary" />

        <Button onClick={() => { window.location.href = '/dash' }} variant="contained" size="small" sx={{ ml: 1 }}>
          Users Dashboard
        </Button>

        <Button onClick={clearFilters} variant="outlined" size="small" sx={{ ml: 1 }}>
          Reset
        </Button>
        {/* Search bar + mode selector (inline, small) */}
        <Box sx={{ minWidth: 320, display: "flex", gap: 1, ml: 1 }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {query ? (
                    <IconButtonMaterial size="small" onClick={() => setQuery("")}>
                      <ClearIcon fontSize="small" />
                    </IconButtonMaterial>
                  ) : null}
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            size="small"
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="pseudo">Pseudo</MenuItem>
            <MenuItem value="firstName">First name</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="lastName">Last name</MenuItem>
            <MenuItem value="id">ID</MenuItem>
          </TextField>
        </Box>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none", maxHeight: "60vh", overflow: "auto" }}>
        <Table stickyHeader sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ "& .MuiTableCell-head": { backgroundColor: (theme) => theme.palette.background.paper, zIndex: 1 } }}>
            <TableRow>
              {/* ID header */}
              <TableCell>ID</TableCell>

              {/* First name */}
              <TableCell>First name</TableCell>

              {/* Pseudo */}
              <TableCell>Pseudo</TableCell>

              {/* Last name */}
              <TableCell>Last name</TableCell>

              {/* Email */}
              <TableCell>Email</TableCell>

              {/* Gender filter select in header */}
              <TableCell align="right" sx={{ width: 220 }}>
                <TextField value={gender} onChange={handleGenderChange} select variant="outlined" size="small" fullWidth>
                  <MenuItem value="">All Genders</MenuItem>
                  {genderOptions.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>

              {/* Country filter select in header */}
              <TableCell align="right" sx={{ width: 220 }}>
                <TextField value={country} onChange={handleCountryChange} select variant="outlined" size="small" fullWidth>
                  <MenuItem value="">All Countries</MenuItem>
                  {countryOptions.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>

              {/* Actions */}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="error">{error}</Typography>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No rows match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(function (item) {
                const displayId = item._id || item.id || "—"
                const firstName = item.firstName || item.name || item.first || "—"
                const pseudo = item.pseudo || item.username || item.handle || "—"
                const lastName = item.lastName || item.familyName || item.surname || "—"
                const email = item.email || "—"

                return (
                  <TableRow key={displayId} hover>
                    <TableCell align="left">
                      <Typography variant="body2" fontWeight={600}>
                        {displayId}
                      </Typography>
                    </TableCell>

                    <TableCell>{firstName}</TableCell>

                    <TableCell>{pseudo}</TableCell>

                    <TableCell>{lastName}</TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {email}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">{item.gender || "—"}</TableCell>

                    <TableCell align="right">{item.country || "—"}</TableCell>

                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          const id = encodeURIComponent(displayId)
                          window.location.href = `/admin/${id}`
                        }}
                        sx={{ mr: 1 }}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Wallet Manager Dialog */}
      <Dialog open={walletDialogOpen} onClose={closeWalletManager} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Wallets — {selectedUserId || "—"}</DialogTitle>
        <DialogContent dividers>
          {walletsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : walletsError ? (
            <Typography color="error">{walletsError}</Typography>
          ) : wallets.length === 0 ? (
            <Typography color="text.secondary">No wallets found for this user.</Typography>
          ) : (
            <List>
              {wallets.map((w) => {
                const wid = w._id || w.id || w.walletId || "—"
                const balance = w.balance ?? w.amount ?? w.value
                return (
                  <React.Fragment key={wid}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={wid}
                        secondary={balance !== undefined ? `Balance: ${balance}` : JSON.stringify(w)}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                )
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => fetchWalletsForUser(selectedUserId)} disabled={walletsLoading}>
            Refresh
          </Button>
          <Button onClick={closeWalletManager}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}