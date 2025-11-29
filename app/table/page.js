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
} from "@mui/material"

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

  // users coming from API
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
      const payload = await res.json()
      if (!res.ok) {
        setError(payload?.error || `Server returned ${res.status}`)
        setUsers([])
      } else {
        const list = Array.isArray(payload.users) ? payload.users : []
        setUsers(list)
      }
    } catch (err) {
      setError(err?.message || "Failed to load users")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenderChange = function (event) {
    setGender(event.target.value)
  }
  const handleCountryChange = function (event) {
    setCountry(event.target.value)
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

  // filtering: empty string means show all
  const filteredUsers = users.filter(function (item) {
    const genderOk = !gender || item.gender === gender
    const countryOk = !country || item.country === country
    return genderOk && countryOk
  })

  const clearFilters = () => {
    setGender("")
    setCountry("")
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

        <Button onClick={clearFilters} variant="outlined" size="small" sx={{ ml: 1 }}>
          Reset
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
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
    </Paper>
  )
}