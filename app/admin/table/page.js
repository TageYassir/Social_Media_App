"use client"

import { useRouter } from "next/navigation";
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
  // validated filter: "" | "validated" | "not"
  const [validatedFilter, setValidatedFilter] = useState("")

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

  // per-wallet management state
  const [selectedWalletId, setSelectedWalletId] = useState(null)
  const [selectedWalletObj, setSelectedWalletObj] = useState(null)
  const [amountToAdd, setAmountToAdd] = useState("")
  const [addingBalance, setAddingBalance] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [txs, setTxs] = useState([])
  const [txsLoading, setTxsLoading] = useState(false)
  const [txsError, setTxsError] = useState(null)
  const [showTxs, setShowTxs] = useState(false)
  
  const [adminChecked, setAdminChecked] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const router = useRouter();

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/me", {
          credentials: "include",
        })
  
        if (!res.ok) {
          router.push("/admin/login") // redirige
          return
        }
  
        const data = await res.json().catch(() => null)
        if (!data?.admin) {
          router.push("/admin/login") // redirige si pas d’admin
          return
        }
  
        setAdminChecked(true) // tout est ok
      } catch (err) {
        console.error("Admin check failed:", err)
        router.push("/admin/login")
      } finally {
        setLoadingAdmin(false)
      }
    }
  
    checkAdmin()
  }, [])
  
  useEffect(() => {
    if (!adminChecked) return
    fetchUsers()
  }, [adminChecked])
  
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
    setSelectedWalletId(null)
    setSelectedWalletObj(null)
    setTxs([])
    setShowTxs(false)

    const encoded = encodeURIComponent(displayId)

    // Try multiple candidate endpoints (including the /api/crypto routes)
    const candidates = [
      `/api/users/${encoded}/wallets`,
      `/api/crypto/wallets?userId=${encoded}`,
      `/api/crypto?operation=get-wallets&userId=${encoded}`,
      `/api/crypto/wallets/${encoded}`,
      `/api/crypto/${encoded}/wallets`,
      `/api/wallets?userId=${encoded}`,
      `/api/wallet/user/${encoded}`,
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
        } else if (payload?.wallet) {
          // single wallet
          list = [payload.wallet]
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
  const handleValidatedChange = function (event) {
    setValidatedFilter(event.target.value)
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
    setSelectedWalletId(null)
    setSelectedWalletObj(null)
    setTxs([])
    setShowTxs(false)
  }

  // per-wallet actions
  function pickWallet(w) {
    const wid = w.walletId || w._id || w.id || w.id_str || w._id?.toString()
    setSelectedWalletId(wid)
    setSelectedWalletObj(w)
    setAmountToAdd("")
    setTxs([])
    setShowTxs(false)
    setTxsError(null)
  }

  async function handleAddBalance() {
    if (!selectedWalletId) return
    const amt = Number(amountToAdd)
    if (!amt || amt <= 0) return alert("Enter a positive amount")

    setAddingBalance(true)
    try {
      const candidates = [
        "/api/crypto/add-balance",
        "/api/wallets/add-balance",
        "/api/crypto/addbalance",
        "/api/crypto/add_balance",
        "/api/crypto?operation=add-balance",
        "/api/crypto?operation=adjust-balance",
        "/api/crypto?operation=topup",
      ]
      let respJson = null
      for (const url of candidates) {
        try {
          const method = url.includes("?") ? "POST" : "POST"
          const target = url.includes("?") ? url : url
          const res = await fetch(target, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletId: selectedWalletId, amount: amt, operation: "add-balance" }),
            credentials: "same-origin",
          })
          if (!res.ok) continue
          respJson = await res.json().catch(() => null)
          break
        } catch (e) {}
      }
      if (!respJson) {
        setWalletsError("Add balance failed (no endpoint responded).")
        return
      }
      // update local wallet object if returned
      const updated = respJson?.wallet || respJson?.data || respJson?.updatedWallet || respJson?.sender || respJson?.receiver || null
      if (updated) {
        const norm = updated.walletId ? updated : { ...updated, walletId: updated.walletId || updated.id || updated._id }
        // replace in wallets list
        setWallets((prev) => prev.map((w) => {
          const wid = w.walletId || w._id || w.id
          if (String(wid) === String(norm.walletId)) return norm
          return w
        }))
        setSelectedWalletObj(norm)
        setAmountToAdd("")
        // refresh transactions (top-up likely recorded)
        await fetchWalletTransactions(norm.walletId)
        return
      }
      // fallback: try refresh wallets from server
      await fetchWalletsForUser(selectedUserId)
    } catch (err) {
      setWalletsError("Add balance failed.")
    } finally {
      setAddingBalance(false)
    }
  }

  // New: remove/subtract balance (uses adjust-balance server op)
  async function handleRemoveBalance() {
    if (!selectedWalletId) return
    const amt = Number(amountToAdd)
    if (!amt || amt <= 0) return alert("Enter a positive amount to remove")
    if (!confirm(`Remove ${amt} from wallet ${selectedWalletId}? This action will decrease the balance.`)) return

    setAddingBalance(true)
    try {
      const candidates = [
        "/api/crypto/adjust-balance",
        "/api/crypto/remove-balance",
        "/api/crypto?operation=adjust-balance",
        "/api/crypto?operation=remove-balance",
        "/api/crypto/adjust",
      ]
      let respJson = null
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // send negative amount to adjust
            body: JSON.stringify({ walletId: selectedWalletId, amount: -Math.abs(amt), operation: "adjust-balance" }),
            credentials: "same-origin",
          })
          if (!res.ok) {
            // capture error body for feedback if available
            try {
              const errBody = await res.json().catch(() => null)
              if (errBody?.error) {
                respJson = errBody
                break
              }
            } catch (e) {}
            continue
          }
          respJson = await res.json().catch(() => null)
          break
        } catch (e) {}
      }
      if (!respJson) {
        setWalletsError("Remove balance failed (no endpoint responded).")
        return
      }
      if (respJson?.error) {
        setWalletsError(respJson.error)
        return
      }
      const updated = respJson?.wallet || respJson?.data || null
      if (updated) {
        const norm = updated.walletId ? updated : { ...updated, walletId: updated.walletId || updated.id || updated._id }
        setWallets((prev) => prev.map((w) => {
          const wid = w.walletId || w._id || w.id
          if (String(wid) === String(norm.walletId)) return norm
          return w
        }))
        setSelectedWalletObj(norm)
        setAmountToAdd("")
        await fetchWalletTransactions(norm.walletId)
        return
      }
      // fallback: refresh list
      await fetchWalletsForUser(selectedUserId)
    } catch (err) {
      setWalletsError("Remove balance failed.")
    } finally {
      setAddingBalance(false)
    }
  }

  async function handleDeleteWallet() {
    if (!selectedWalletId) return
    if (!confirm(`Delete wallet ${selectedWalletId} for user ${selectedUserId}? This cannot be undone.`)) return
    setDeleteLoading(true)
    try {
      const candidates = [
        `/api/crypto/wallets/${encodeURIComponent(selectedWalletId)}`,
        `/api/wallets/${encodeURIComponent(selectedWalletId)}`,
        `/api/crypto/delete-wallet/${encodeURIComponent(selectedWalletId)}`,
        `/api/crypto/wallets/delete/${encodeURIComponent(selectedWalletId)}`,
      ]
      let ok = false
      for (const url of candidates) {
        try {
          const res = await fetch(url, { method: "DELETE", credentials: "same-origin" })
          if (!res.ok) continue
          ok = true
          break
        } catch (e) {}
      }
      if (!ok) {
        setWalletsError("Delete failed (no delete endpoint responded).")
      } else {
        // remove from local list
        setWallets((prev) => prev.filter((w) => {
          const wid = w.walletId || w._id || w.id
          return String(wid) !== String(selectedWalletId)
        }))
        setSelectedWalletId(null)
        setSelectedWalletObj(null)
        setTxs([])
        setShowTxs(false)
      }
    } catch (err) {
      setWalletsError("Delete failed.")
    } finally {
      setDeleteLoading(false)
    }
  }

  async function fetchWalletTransactions(wid) {
    if (!wid) return
    setTxsLoading(true)
    setTxsError(null)
    setTxs([])
    setShowTxs(true)
    try {
      const wEnc = encodeURIComponent(wid)
      const candidates = [
        `/api/crypto/transactions/${wEnc}`,
        `/api/transactions/${wEnc}`,
        `/api/transactions?walletId=${wEnc}`,
        `/api/wallets/transactions/${wEnc}`,
        `/api/wallets/transactions?walletId=${wEnc}`,
        `/api/crypto?operation=get-transactions&walletId=${wEnc}`,
      ]
      let found = null
      for (const url of candidates) {
        try {
          const res = await fetch(url, { credentials: "same-origin" })
          if (!res.ok) continue
          const j = await res.json().catch(() => null)
          const list = Array.isArray(j) ? j : j?.transactions || j?.data || j?.items || null
          if (Array.isArray(list)) {
            found = list
            break
          }
        } catch (e) {}
      }
      if (!found) {
        setTxsError("No transactions endpoint responded or no transactions found.")
        setTxs([])
      } else {
        setTxs(found)
      }
    } catch (err) {
      setTxsError("Failed to load transactions.")
      setTxs([])
    } finally {
      setTxsLoading(false)
    }
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

    // determine validation status for filtering
    const isValidated =
      !!(item.isValidated || item.validated || item.verified || item.emailVerified || item.isVerified || item.activated)
    const validatedOk =
      !validatedFilter ||
      (validatedFilter === "validated" && isValidated) ||
      (validatedFilter === "not" && !isValidated)

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

    return genderOk && countryOk && validatedOk && searchOk
  })

  const clearFilters = () => {
    setGender("")
    setCountry("")
    setQuery("")
  }

  // --- new helpers for country flag and validation chip ---
  const commonCountryMap = {
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
    england: "GB",
    germany: "DE",
    france: "FR",
    spain: "ES",
    italy: "IT",
    canada: "CA",
    australia: "AU",
    brazil: "BR",
    india: "IN",
    mexico: "MX",
  }

  function codeToEmoji(cc) {
    if (!cc || cc.length !== 2) return ""
    const A = 0x1f1e6 - "A".charCodeAt(0)
    return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0)))
  }

  function getCountryInfo(raw) {
    if (!raw) return { code: null, label: "" }
    const val = String(raw).trim()
    // if it's already a 2-letter code
    if (/^[A-Za-z]{2}$/.test(val)) return { code: val.toUpperCase(), label: val.toUpperCase() }
    // try common map
    const lower = val.toLowerCase()
    if (commonCountryMap[lower]) return { code: commonCountryMap[lower], label: prettyLabel(val) }
    // fallback: try first two letters as code
    const fallback = val.substring(0, 2).toUpperCase()
    return { code: fallback, label: prettyLabel(val) }
  }

  function prettyLabel(s) {
    if (!s) return ""
    // capitalize words
    return s
      .toString()
      .split(/[\s_-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  function renderCountryChip(country) {
    const info = getCountryInfo(country)
    const emoji = info.code ? codeToEmoji(info.code) : ""
    const label = info.label || "—"
    return (
      <Chip
        size="small"
        icon={emoji ? <span style={{ fontSize: 16 }}>{emoji}</span> : undefined}
        label={label}
        variant="outlined"
      />
    )
  }

  function renderValidationChip(item) {
    const isValidated =
      !!(item.isValidated || item.validated || item.verified || item.emailVerified || item.isVerified || item.activated)
    return (
      <Chip
        size="small"
        label={isValidated ? "Validated" : "Not validated"}
        sx={{
          bgcolor: isValidated ? (theme) => theme.palette.success.light : (theme) => theme.palette.action.disabledBackground,
          color: isValidated ? (theme) => theme.palette.success.contrastText : (theme) => theme.palette.text.secondary,
          borderRadius: 1,
        }}
      />
    )
  }
  // --- end new helpers ---

  if (loadingAdmin) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }
  
  if (!adminChecked) {
    return null // ou un redirect déjà géré par router.replace
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

        <Button onClick={() => { window.location.href = './dashboard' }} variant="contained" size="small" sx={{ ml: 1 }}>
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
                      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        {/* render small flag emoji + name inside the menu */}
                        <span style={{ fontSize: 16 }}>{codeToEmoji(getCountryInfo(c).code)}</span>
                        <Typography variant="body2">{prettyLabel(c)}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </TableCell>

              {/* Validated filter select in header */}
              <TableCell align="right" sx={{ width: 160 }}>
                <TextField value={validatedFilter} onChange={handleValidatedChange} select variant="outlined" size="small" fullWidth>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="validated">Validated</MenuItem>
                  <MenuItem value="not">Not validated</MenuItem>
                </TextField>
              </TableCell>

              {/* Actions */}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography color="error">{error}</Typography>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
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
                const countryVal = item.country || item.location || item.countryCode || ""
                const isValidated =
                  !!(item.isValidated || item.validated || item.verified || item.emailVerified || item.isVerified || item.activated)

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

                    {/* Country column */}
                    <TableCell align="right">{renderCountryChip(countryVal)}</TableCell>

                    {/* Validated column */}
                    <TableCell align="right">
                      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        {renderValidationChip(item)}
                      </Box>
                    </TableCell>

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

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openWalletManager(item._id || item.id || displayId)}
                      >
                        Manage Wallet
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
      <Dialog open={walletDialogOpen} onClose={closeWalletManager} maxWidth="md" fullWidth>
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
            <Box>
              <List>
                {wallets.map((w) => {
                  const wid = w.walletId || w._id || w.id || "—"
                  const balance = (typeof w.balance !== "undefined") ? w.balance : (w.amount ?? w.value ?? "—")
                  const isSelected = String(wid) === String(selectedWalletId)
                  return (
                    <React.Fragment key={wid}>
                      <ListItem
                        alignItems="flex-start"
                        secondaryAction={
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button size="small" variant={isSelected ? "contained" : "outlined"} onClick={() => pickWallet(w)}>
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                            {/* Transactions button removed as requested */}
                          </Box>
                        }
                      >
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

              {/* Selected wallet controls */}
              {selectedWalletId ? (
                <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="subtitle1">Wallet: {selectedWalletId}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Balance: {selectedWalletObj ? (selectedWalletObj.balance ?? "—") : "—"}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <IconButton onClick={handleDeleteWallet} disabled={deleteLoading} color="error" title="Delete Wallet">
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      sx={{ width: 160 }}
                      inputProps={{ min: 0, step: "any" }}
                    />
                    <Button variant="contained" onClick={handleAddBalance} disabled={addingBalance}>
                      {addingBalance ? "Processing..." : "Add Balance"}
                    </Button>

                    <Button variant="outlined" color="warning" onClick={handleRemoveBalance} disabled={addingBalance}>
                      {addingBalance ? "Processing..." : "Remove Balance"}
                    </Button>

                    <Button variant="outlined" onClick={() => fetchWalletTransactions(selectedWalletId)} disabled={txsLoading}>
                      Refresh Transactions
                    </Button>

                    <Button variant="text" onClick={() => setShowTxs((s) => !s)}>
                      {showTxs ? "Hide Transactions" : "Show Transactions"}
                    </Button>
                  </Box>

                  {/* Transactions area */}
                  {showTxs ? (
                    <Box sx={{ mt: 1 }}>
                      {txsLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                          <CircularProgress size={20} />
                        </Box>
                      ) : txsError ? (
                        <Typography color="error">{txsError}</Typography>
                      ) : txs.length === 0 ? (
                        <Typography color="text.secondary">No transactions found.</Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: "none", maxHeight: 320, overflow: "auto" }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>From</TableCell>
                                <TableCell>To</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {txs.map((t) => {
                                const id = t.id || t._id || (t._id && String(t._id)) || Math.random()
                                const date = t.sentAt || t.createdAt || t.date || t.sent_at || ""
                                return (
                                  <TableRow key={id}>
                                    <TableCell>{date ? new Date(date).toLocaleString() : "-"}</TableCell>
                                    <TableCell>{t.senderWalletId || t.from || "-"}</TableCell>
                                    <TableCell>{t.receiverWalletId || t.to || "-"}</TableCell>
                                    <TableCell>{typeof t.amount === "number" ? t.amount : (t.amount || "-")}</TableCell>
                                    <TableCell>{t.status || "-"}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
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