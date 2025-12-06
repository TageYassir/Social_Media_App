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
import EditIcon from "@mui/icons-material/Edit"

/**
 * Client page that fetches users from your API and re-uses the original filter UI.
 *
 * Notes:
 * - Keeps the original state names: `gender` and `country`.
 * - Expects an API endpoint at /api/users?operation=get-all-users that returns JSON:
 *   { users: [ { _id, id, gender, country, firstName, lastName, email, ... }, ... ] }
 *
 * Added: "Manage Wallet" button per user that opens a dialog allowing:
 * - view wallet (server via GET /api/crypto/user/:userId or local fallback)
 * - create wallet (POST /api/crypto/create-wallet)
 * - top-up (POST /api/crypto/add-balance with { idcrypto, amount })
 * - view transactions (GET /api/crypto/transactions/:idcrypto)
 * - delete wallet (best-effort DELETE /api/crypto/user/:userId; falls back to removing localStorage wallet keys)
 *
 * The backend routes should exist (see app/api/crypto/*). The UI is defensive: it will fall back to localStorage when server endpoints are missing.
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

  // wallet manager dialog state
  const [manageOpen, setManageOpen] = useState(false)
  const [manageLoading, setManageLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [walletError, setWalletError] = useState(null)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [creatingWallet, setCreatingWallet] = useState(false)
  const [deletingWallet, setDeletingWallet] = useState(false)

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

  // Manage wallet helpers

  function openManageDialog(user) {
    const uid = user?._id || user?.id || null
    setSelectedUser(user)
    setWallet(null)
    setTransactions([])
    setWalletError(null)
    setTopUpAmount("")
    setManageOpen(true)
    if (uid) fetchWalletAndTx(uid)
  }

  function closeManageDialog() {
    setManageOpen(false)
    setSelectedUser(null)
    setWallet(null)
    setTransactions([])
    setWalletError(null)
    setTopUpAmount("")
  }

  async function fetchWalletAndTx(userId) {
    setManageLoading(true)
    setWalletError(null)
    setWallet(null)
    setTransactions([])
    try {
      // try server wallet first
      const res = await fetch(`/api/crypto/user/${encodeURIComponent(userId)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data && data.success && data.wallet) {
        const srv = data.wallet
        // normalize server wallet fields (support idcrypto or idCrypto)
        const idcrypto = srv.idcrypto || srv.idCrypto || srv.id || srv.idCrypto
        const normalized = {
          idcrypto,
          walletId: srv.walletId || idcrypto || `wallet-${userId}`,
          owner: srv.userId || userId,
          balance: srv.balance ?? 0,
          currency: srv.currency || "CRYPTO",
          createdAt: srv.createdAt || srv.createdAt || new Date().toISOString(),
        }
        setWallet(normalized)
        // fetch transactions if idcrypto present
        if (normalized.idcrypto) {
          await fetchTransactions(normalized.idcrypto)
        }
      } else {
        // no server wallet — try localStorage fallback
        const local = findLocalWalletForUser(userId)
        if (local) {
          setWallet(local)
          if (local.idcrypto) await fetchTransactions(local.idcrypto)
        } else {
          setWallet(null)
          setWalletError("No wallet found for this user (server/local). You may create one.")
        }
      }
    } catch (e) {
      // network/other error — try local fallback
      const local = findLocalWalletForUser(userId)
      if (local) {
        setWallet(local)
        if (local.idcrypto) await fetchTransactions(local.idcrypto)
      } else {
        setWalletError("Failed to load wallet (network error).")
      }
    } finally {
      setManageLoading(false)
    }
  }

  // find localStorage wallet key for a user (first match) and return parsed wallet
  function findLocalWalletForUser(userId) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith("wallet:")) continue
        // key format supported:
        //  - wallet:<userId>:<idcrypto>   (new, preferred)
        //  - wallet:<userId>:<currency>   (legacy)
        if (!key.startsWith(`wallet:${userId}:`)) continue
        const raw = localStorage.getItem(key)
        if (!raw) continue
        try {
          const parsed = JSON.parse(raw)
          // normalize parsed shape to ensure idcrypto present when possible
          const idcrypto = parsed.idcrypto || parsed.idCrypto || parsed.id || key.split(":")[2] || null
          return {
            idcrypto,
            walletId: parsed.walletId || parsed.walletId || parsed.wallet || idcrypto,
            owner: parsed.owner || parsed.userId || userId,
            balance: parsed.balance ?? 0,
            currency: parsed.currency || "CRYPTO",
            createdAt: parsed.createdAt || new Date().toISOString(),
          }
        } catch (e) {
          // skip parse errors
          continue
        }
      }
    } catch (e) {
      // storage unavailable
    }
    return null
  }

  async function createWalletForSelected() {
    if (!selectedUser) return
    const userId = selectedUser._id || selectedUser.id
    setCreatingWallet(true)
    setWalletError(null)
    try {
      const res = await fetch("/api/crypto/create-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json && json.success && json.wallet) {
        // normalize and set
        const srv = json.wallet
        const idcrypto = srv.idcrypto || srv.idCrypto || srv.id || `c_${Date.now().toString(36)}`
        const normalized = {
          idcrypto,
          walletId: srv.walletId || idcrypto,
          owner: srv.userId || userId,
          balance: srv.balance ?? 0,
          currency: srv.currency || "CRYPTO",
          createdAt: srv.createdAt || new Date().toISOString(),
        }
        // persist locally using standardized key: wallet:<owner>:<idcrypto>
        try {
          localStorage.setItem(`wallet:${normalized.owner}:${normalized.idcrypto}`, JSON.stringify(normalized))
        } catch (e) {}
        setWallet(normalized)
        setWalletError(null)
        await fetchTransactions(normalized.idcrypto)
      } else {
        const msg = json?.error || `Server returned ${res.status}`
        setWalletError(`Could not create wallet: ${msg}`)
      }
    } catch (e) {
      setWalletError("Network error creating wallet.")
    } finally {
      setCreatingWallet(false)
    }
  }

  async function fetchTransactions(idcrypto) {
    setWalletError(null)
    try {
      const res = await fetch(`/api/crypto/transactions/${encodeURIComponent(idcrypto)}`)
      const json = await res.json().catch(() => ({}))
      if (res.ok && json && json.success && Array.isArray(json.transactions)) {
        setTransactions(json.transactions)
      } else if (Array.isArray(json)) {
        setTransactions(json)
      } else {
        // fallback: try localStorage tx key (tx:<idcrypto>)
        const raw = localStorage.getItem(`tx:${idcrypto}`)
        if (raw) {
          try {
            setTransactions(JSON.parse(raw))
            return
          } catch (e) {}
        }
        setTransactions([])
      }
    } catch (e) {
      // network error -> local fallback
      const raw = localStorage.getItem(`tx:${idcrypto}`)
      if (raw) {
        try {
          setTransactions(JSON.parse(raw))
        } catch (e) {
          setTransactions([])
        }
      } else {
        setTransactions([])
      }
    }
  }

  async function topUpWallet() {
    if (!wallet || !wallet.idcrypto) {
      setWalletError("No wallet selected to top-up")
      return
    }
    const amt = Number(topUpAmount)
    if (!amt || isNaN(amt)) {
      setWalletError("Enter a valid amount")
      return
    }
    setManageLoading(true)
    setWalletError(null)
    try {
      // server endpoint expects idcrypto and amount (see app/api/crypto/route.js -> /add-balance)
      const res = await fetch("/api/crypto/add-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcrypto: wallet.idcrypto, amount: amt }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json && json.success && json.wallet) {
        // use server wallet
        const srv = json.wallet
        const normalized = {
          idcrypto: srv.idcrypto || srv.idCrypto || wallet.idcrypto,
          walletId: srv.walletId || srv.idcrypto || wallet.walletId,
          owner: srv.userId || wallet.owner,
          balance: srv.balance ?? wallet.balance + amt,
          currency: srv.currency || wallet.currency,
          createdAt: srv.createdAt || wallet.createdAt,
        }
        // persist locally using standardized key
        try {
          localStorage.setItem(`wallet:${normalized.owner}:${normalized.idcrypto}`, JSON.stringify(normalized))
        } catch (e) {}
        setWallet(normalized)
        await fetchTransactions(normalized.idcrypto)
      } else {
        // server not available — update local only (use standardized key)
        const updated = { ...wallet, balance: Number(wallet.balance) + amt }
        try {
          localStorage.setItem(`wallet:${updated.owner}:${updated.idcrypto}`, JSON.stringify(updated))
          // push a local tx record under tx:<idcrypto>
          const now = new Date().toISOString()
          const tx = { id: Math.random().toString(36).slice(2, 9), from: null, to: updated.walletId, amount: amt, at: now, currency: updated.currency }
          const txKey = `tx:${updated.idcrypto}`
          const raw = localStorage.getItem(txKey)
          const list = raw ? JSON.parse(raw) : []
          list.unshift(tx)
          localStorage.setItem(txKey, JSON.stringify(list))
        } catch (e) {}
        setWallet(updated)
        await fetchTransactions(updated.idcrypto)
      }
      setTopUpAmount("")
    } catch (e) {
      setWalletError("Top-up failed")
    } finally {
      setManageLoading(false)
    }
  }

  async function deleteWallet() {
    if (!selectedUser) return
    const userId = selectedUser._id || selectedUser.id
    setDeletingWallet(true)
    setWalletError(null)
    try {
      // try server delete first (note: you may need to implement this route)
      const res = await fetch(`/api/crypto/user/${encodeURIComponent(userId)}`, { method: "DELETE" })
      if (res.ok) {
        setWallet(null)
        // also attempt to remove local copies (both legacy and new keys)
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (!key) continue
            if (key.startsWith(`wallet:${userId}:`) || key.startsWith(`wallet:${userId}:`)) localStorage.removeItem(key)
          }
        } catch (e) {}
      } else {
        // server didn't support delete or returned error — fallback to local removal
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (key && key.startsWith(`wallet:${userId}:`)) localStorage.removeItem(key)
          }
          setWallet(null)
          setWalletError("Server delete returned an error; wallet removed locally.")
        } catch (e) {
          setWalletError("Delete failed")
        }
      }
    } catch (e) {
      // network error -> local fallback
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key && key.startsWith(`wallet:${userId}:`)) localStorage.removeItem(key)
        }
        setWallet(null)
        setWalletError("Could not reach server; wallet removed locally.")
      } catch (e) {
        setWalletError("Delete failed")
      }
    } finally {
      setDeletingWallet(false)
    }
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

                      {/* New Manage Wallet button */}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openManageDialog(item)}
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

      {/* Manage Wallet Dialog */}
      <Dialog open={manageOpen} onClose={closeManageDialog} fullWidth maxWidth="md">
        <DialogTitle>
          Manage Wallet {selectedUser ? `for ${selectedUser.pseudo || selectedUser.firstName || selectedUser._id}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          {manageLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {wallet ? (
                <Box>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1">Wallet</Typography>
                      <Typography variant="body2">idcrypto: {wallet.idcrypto}</Typography>
                      <Typography variant="body2">walletId: {wallet.walletId}</Typography>
                      <Typography variant="body2">Owner: {wallet.owner}</Typography>
                      <Typography variant="body2">Balance: {Number(wallet.balance).toLocaleString()} {wallet.currency}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Amount"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        sx={{ width: 140 }}
                      />
                      <Button variant="contained" onClick={topUpWallet} disabled={manageLoading || creatingWallet}>
                        Top-up
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={deleteWallet}
                        disabled={deletingWallet}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Transactions
                  </Typography>

                  {transactions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No transactions yet.</Typography>
                  ) : (
                    <List dense sx={{ maxHeight: 280, overflow: "auto" }}>
                      {transactions.map((tx) => {
                        const txId = tx._id || tx.id || Math.random()
                        const mismatch = tx.currency && wallet && wallet.currency && tx.currency !== wallet.currency
                        const primaryText = tx.type
                          ? (tx.type === 'send' ? `Sent ${tx.amount}` : `Received ${tx.amount}`)
                          : (tx.from ? `Received ${tx.amount}` : `Top-up ${tx.amount}`)
                        // include tx currency explicitly
                        const primaryNode = (
                          <>
                            <span>{primaryText} {tx.currency ? `(${tx.currency})` : ''}</span>
                            {mismatch ? (
                              <Chip label="Different currency" size="small" color="warning" sx={{ ml: 1, height: 22 }} />
                            ) : null}
                          </>
                        )
                        const secondaryText = tx.from ? `From: ${tx.from}` : `To: ${tx.to || wallet.walletId}`
                        return (
                          <ListItem key={txId}>
                            <ListItemText
                              primary={primaryNode}
                              secondary={secondaryText}
                            />
                          </ListItem>
                        )
                      })}
                    </List>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {walletError || "No wallet found for this user."}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="contained" onClick={createWalletForSelected} disabled={creatingWallet}>
                      Create wallet
                    </Button>
                    <Button variant="outlined" onClick={() => {
                      // try local create fallback
                      const userId = selectedUser?._id || selectedUser?.id
                      if (!userId) return
                      const localWallet = {
                        idcrypto: `local-${userId}-${Date.now().toString(36)}`,
                        walletId: `local-${userId}-${Math.random().toString(36).slice(2,9)}`,
                        owner: userId,
                        balance: 0,
                        currency: "CRYPTO",
                        createdAt: new Date().toISOString(),
                      }
                      try {
                        localStorage.setItem(`wallet:${userId}:${localWallet.currency}`, JSON.stringify(localWallet))
                        setWallet(localWallet)
                        setWalletError(null)
                      } catch (e) {
                        setWalletError("Failed to create local wallet.")
                      }
                    }}>
                      Create local wallet
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
          {walletError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {walletError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeManageDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}