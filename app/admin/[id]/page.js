"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material"

/**
 * Client-side admin page for /admin/:id
 *
 * - Loads the user, shows editable fields including a 'pseudo' field.
 * - Editable raw JSON editor with Apply and Reset actions.
 * - Save sends the full `user` object; Delete removes the user.
 * - Defensive: handles non-JSON responses, missing id, and always clears the loading state.
 */

export default function AdminPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id

  const [user, setUser] = useState(null)
  const [rawJson, setRawJson] = useState("") // text in the JSON editor
  const [jsonError, setJsonError] = useState("") // validation error for JSON editor
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      console.warn("AdminPage: no id param available")
      setLoading(false)
      return
    }
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function safeJson(res) {
    try {
      return await res.json()
    } catch {
      const txt = await res.text().catch(() => "")
      return { __rawText: txt }
    }
  }

  async function fetchUser() {
    setLoading(true)
    setError("")
    setUser(null)
    setRawJson("")
    setJsonError("")
    try {
      let res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        // credentials: "include",
      })

      if (!res.ok) {
        console.info("GET /api/users/:id failed with", res.status, res.statusText, "- trying fallback")
        res = await fetch(`/api/users?operation=get-user&id=${encodeURIComponent(id)}`, {
          headers: { Accept: "application/json" },
          // credentials: "include",
        })
      } else {
        console.info("GET /api/users/:id succeeded", res.status)
      }

      const payload = await safeJson(res)

      if (!res.ok) {
        const serverMsg = payload?.error || payload?.message || payload?.__rawText || JSON.stringify(payload)
        throw new Error(`Failed to load user: ${res.status} ${serverMsg}`)
      }

      const u = payload?.user ?? payload
      if (!u || Object.keys(u).length === 0) throw new Error("Empty user payload")
      setUser(u)
      setRawJson(JSON.stringify(u, null, 2))
    } catch (err) {
      console.error("fetchUser error:", err)
      setError(err?.message || "Failed to load user")
      setUser(null)
      setRawJson("")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    // update user shallowly for form fields
    setUser((prev) => ({ ...(prev || {}), [name]: value }))
    // also keep rawJson in sync lightly (don't overwrite user edits)
    setRawJson((prevRaw) => {
      try {
        const parsed = JSON.parse(prevRaw || "{}")
        parsed[name] = value
        return JSON.stringify(parsed, null, 2)
      } catch {
        // if rawJson isn't valid JSON, leave it alone
        return prevRaw
      }
    })
  }

  // Apply edited JSON into the form
  function applyJsonToForm() {
    setJsonError("")
    try {
      const parsed = JSON.parse(rawJson)
      if (!parsed || typeof parsed !== "object") {
        setJsonError("JSON must be an object")
        return
      }
      setUser(parsed)
      setJsonError("")
      // feedback briefly
      console.info("Applied JSON to form")
    } catch (err) {
      setJsonError(err.message || "Invalid JSON")
    }
  }

  // Reset the JSON editor to current user state
  function resetJsonEditor() {
    setJsonError("")
    setRawJson(JSON.stringify(user || {}, null, 2))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError("")
    try {
      // If the JSON editor is different and valid, apply it before saving:
      if (rawJson && rawJson.trim()) {
        try {
          const parsed = JSON.parse(rawJson)
          // prefer parsed object as the saved payload (keeps user's JSON edits)
          setUser(parsed)
        } catch {
          // ignore: we'll attempt to save whatever `user` currently holds
        }
      }

      let res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(user),
        // credentials: "include",
      })

      if (!res.ok) {
        console.info("PUT failed, trying fallback update endpoint")
        res = await fetch(`/api/users?operation=update&id=${encodeURIComponent(id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(user),
          // credentials: "include",
        })
      }

      const payload = await safeJson(res)
      if (!res.ok) {
        const serverMsg = payload?.error || payload?.message || payload?.__rawText || JSON.stringify(payload)
        throw new Error(`Save failed: ${res.status} ${serverMsg}`)
      }

      // If API returns updated user, use it
      const updated = payload?.user ?? payload
      if (updated && typeof updated === "object") {
        setUser(updated)
        setRawJson(JSON.stringify(updated, null, 2))
      }
      alert("Saved")
    } catch (err) {
      console.error("handleSave error:", err)
      setError(err?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!user) return
    setDeleting(true)
    setError("")
    try {
      let res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "DELETE",
        // credentials: "include",
      })

      if (!res.ok) {
        console.info("DELETE REST failed, trying fallback")
        res = await fetch(`/api/users?operation=delete&id=${encodeURIComponent(id)}`, {
          method: "POST",
          // credentials: "include",
        })
      }

      const payload = await safeJson(res)
      if (!res.ok) {
        const serverMsg = payload?.error || payload?.message || payload?.__rawText || JSON.stringify(payload)
        throw new Error(`Delete failed: ${res.status} ${serverMsg}`)
      }

      alert("Deleted")
      router.push("/table")
    } catch (err) {
      console.error("handleDelete error:", err)
      setError(err?.message || "Delete failed")
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading user…</Typography>
      </Box>
    )
  }

  if (!id) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Missing user id in URL.</Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => router.push("/table")}>
          Back to users
        </Button>
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">No user loaded. {error ? `Error: ${error}` : ""}</Typography>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => fetchUser()}>
          Retry
        </Button>
        <Button variant="text" sx={{ mt: 2, ml: 1 }} onClick={() => router.push("/table")}>
          Back
        </Button>
      </Box>
    )
  }

  // guess common field keys
  const firstNameKey = user.firstName !== undefined ? "firstName" : user.name !== undefined ? "name" : "firstName"
  const lastNameKey =
    user.lastName !== undefined ? "lastName" : user.last !== undefined ? "last" : user.familyName !== undefined ? "familyName" : "lastName"
  const emailKey = user.email !== undefined ? "email" : "email"
  // pseudo field: many apps call it pseudo/username/displayName/nick - prefer `pseudo`, fallback to `username`
  const pseudoKey = user.pseudo !== undefined ? "pseudo" : user.username !== undefined ? "username" : "pseudo"

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6">Manage user</Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {user._id ?? user.id ?? "(unknown)"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => router.push("/table")}>
              Back
            </Button>
            <Button color="error" variant="contained" onClick={() => setConfirmOpen(true)} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Box component="form" onSubmit={handleSave}>
          <Stack spacing={2}>
            <TextField label="Pseudo" name={pseudoKey} value={user[pseudoKey] ?? ""} onChange={handleChange} fullWidth />

            <TextField label="First name" name={firstNameKey} value={user[firstNameKey] ?? ""} onChange={handleChange} fullWidth />
            <TextField label="Last name" name={lastNameKey} value={user[lastNameKey] ?? ""} onChange={handleChange} fullWidth />
            <TextField label="Email" name={emailKey} value={user[emailKey] ?? ""} onChange={handleChange} fullWidth />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Gender" name="gender" value={user.gender ?? ""} onChange={handleChange} fullWidth />
              <TextField label="Country" name="country" value={user.country ?? ""} onChange={handleChange} fullWidth />
            </Stack>

            <Typography variant="subtitle2">Raw JSON (advanced)</Typography>
            <TextField
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value)
                // live-validate small JSON errors
                try {
                  JSON.parse(e.target.value)
                  setJsonError("")
                } catch (err) {
                  setJsonError(err.message)
                }
              }}
              multiline
              minRows={8}
              fullWidth
              placeholder='Edit the entire user object as JSON, then click "Apply JSON" to update the form.'
            />

            <Stack direction="row" spacing={1} justifyContent="flex-start">
              <Button variant="contained" size="small" onClick={applyJsonToForm}>
                Apply JSON
              </Button>
              <Button variant="outlined" size="small" onClick={resetJsonEditor}>
                Reset JSON
              </Button>
              {jsonError && (
                <Box sx={{ ml: 2 }}>
                  <Alert severity="error">{jsonError}</Alert>
                </Box>
              )}
            </Stack>

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => router.push("/table")} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to permanently delete this user? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}