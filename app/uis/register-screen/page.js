"use client"

/** React MUI Imports */
import { Button, colors, Container, MenuItem, Stack, TextField, Typography, CircularProgress } from "@mui/material"
/** Next Imports */
import Image from "next/image"
/** React Imports */
import { useState, useEffect, useRef } from "react"
/** Next Nagivation */
import { useRouter } from "next/navigation"

export default function Page() {
  /** Navigation Management */
  const router = useRouter()

  /** States */
  let [email, setEmail] = useState("")
  let [password, setPassword] = useState("")
  let [pseudo, setPseudo] = useState("")
  let [country, setCountry] = useState("")
  let [gender, setGender] = useState("")
  let [firstName, setFirstName] = useState("")
  let [lastName, setLastName] = useState("")
  let [error, setError] = useState(null)
  let [loading, setLoading] = useState(false)

  // Pseudo availability states
  const [pseudoChecking, setPseudoChecking] = useState(false)
  const [pseudoAvailable, setPseudoAvailable] = useState(null) // null = unknown, true = available, false = taken
  const debounceRef = useRef(null)

  useEffect(() => {
    // Cleanup debounce on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  /** Handlers */
  const handleEmailChange = function(event){
    setEmail(event.target.value)
  }

  const handlePasswordChange = function(event){
    setPassword(event.target.value)
  }

  const handlePseudoChange = function(event){
    const value = event.target.value
    setPseudo(value)
    setPseudoAvailable(null)
    setError(null)
    // schedule availability check
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      checkPseudo(value)
    }, 500)
  }

  const handleCountryChange = function(event){
    setCountry(event.target.value)
  }

  const handleGenderChange = function(event){
    setGender(event.target.value)
  }

  const handleFirstNameChange = function(event){
    setFirstName(event.target.value)
  }

  const handleLastNameChange = function(event){
    setLastName(event.target.value)
  }

  /** Check pseudo availability (uses GET /api/users?operation=check-pseudo&pseudo=...) */
  async function checkPseudo(value) {
    const v = (value || "").trim()
    if (!v) {
      setPseudoAvailable(null)
      setPseudoChecking(false)
      return
    }

    setPseudoChecking(true)
    setPseudoAvailable(null)
    setError(null)

    try {
      const res = await fetch(`/api/users?operation=check-pseudo&pseudo=${encodeURIComponent(v)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        // credentials: "include", // uncomment if your API needs cookies/session
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        // If server error, conservatively mark as not available
        setError(payload?.error || `Server error (${res.status})`)
        setPseudoAvailable(false)
      } else {
        setPseudoAvailable(Boolean(payload?.available))
      }
    } catch (err) {
      console.error("checkPseudo error", err)
      setError("Network error while checking pseudo")
      setPseudoAvailable(false)
    } finally {
      setPseudoChecking(false)
    }
  }

  /** Actions */
  const create = async function(event){
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Please provide email and password.")
      return
    }

    if (!pseudo || pseudo.trim().length < 2) {
      setError("Please provide a pseudo of at least 2 characters.")
      return
    }

    // If we already know pseudo is taken, short-circuit
    if (pseudoAvailable === false) {
      setError("This pseudo is already taken. Please choose another.")
      return
    }

    // If we haven't checked yet, do a synchronous check before creating
    if (pseudoAvailable === null) {
      setPseudoChecking(true)
      await checkPseudo(pseudo)
      setPseudoChecking(false)
      if (pseudoAvailable === false) {
        setError("This pseudo is already taken. Please choose another.")
        return
      }
    }

    setLoading(true)
    try {
      const response = await fetch("/api/users?operation=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, pseudo: pseudo.trim(), country, gender, firstName, lastName
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 201) {
        // Created successfully — redirect to login page
        router.push("/uis")
        return
      }

      if (response.status === 409) {
        // Conflict: could be email or pseudo
        const msg = data?.error || "An account with this email or pseudo already exists. Please login or choose a different pseudo."
        setError(msg)
        // If server reported pseudo conflict specifically, mark unavailable
        if (/(pseudo|username)/i.test(msg)) {
          setPseudoAvailable(false)
        }
        return
      }

      // other errors
      setError(data?.error || "Registration failed. Please try again.")
    } catch (err) {
      console.error("Registration error", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = function(event){
    event.preventDefault()
    // redirect to login page
    router.push("/uis")
  }

  return(
    <Container maxWidth="sm">
      <Stack direction={"column"} spacing={3} justifyContent={"space-around"} alignItems={"center"} >
        <Stack direction={"column"} spacing={1} alignSelf={"stretch"} >
          <Typography variant="h5" textAlign={"center"}>
            Welcome to Chocolat Social
          </Typography>
          <Typography variant="body2" textAlign={"center"}>
            Welcome to Chocolat Social Welcome to Chocolat Social  Welcome to Chocolat Social Welcome to Chocolat Social Welcome to Chocolat Social 
          </Typography>
          <Typography variant="button" textAlign={"center"}>
            Create an Account
          </Typography>
        </Stack>
        <Stack direction={"column"} spacing={1} alignSelf={"stretch"} component="form" onSubmit={create}>
          <TextField value={email} onChange={handleEmailChange}  variant="outlined" placeholder="Email" name="email" />
          <TextField value={password} onChange={handlePasswordChange} variant="outlined" placeholder="Password" type="password" name="password" />

          <TextField
            value={pseudo}
            onChange={handlePseudoChange}
            variant="outlined"
            placeholder="Pseudo"
            name="pseudo"
            required
            error={pseudoAvailable === false && !pseudoChecking}
            helperText={
              pseudoChecking ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CircularProgress size={14} /> Checking availability…</span>
              ) : pseudoAvailable === true ? (
                <span style={{ color: "green" }}>Pseudo available</span>
              ) : pseudoAvailable === false ? (
                <span style={{ color: "red" }}>Pseudo already taken</span>
              ) : (
                "Choose a pseudonym"
              )
            }
          />

          <TextField value={gender} onChange={handleGenderChange} select variant="outlined" placeholder="Gender" name="gender">
            <MenuItem key={"Female"} value={"Female"} selected>Female</MenuItem>
            <MenuItem key={"Male"} value={"Male"}>Male</MenuItem>
            <MenuItem key={"Unspecified"} value={"Unspecified"}>Unspecified</MenuItem>
          </TextField>
          <TextField value={country} onChange={handleCountryChange} select variant="outlined" placeholder="Country" name="country">
            <MenuItem key={"Morocco"} value={"Morocco"} selected>Morocco</MenuItem>
            <MenuItem key={"USA"} value={"USA"}>USA</MenuItem>
            <MenuItem key={"Singapore"} value={"Singapore"}>Singapore</MenuItem>
          </TextField>
          <TextField value={firstName} onChange={handleFirstNameChange} variant="outlined" placeholder="First Name" name="firstName" />
          <TextField value={lastName} onChange={handleLastNameChange} variant="outlined" placeholder="Last Name" name="lastName" />

          {error && <Typography color="error">{error}</Typography>}

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Button type="submit" variant="contained" size="large" disableElevation disabled={loading || pseudoChecking || pseudoAvailable === false}>
              {loading ? "Creating..." : "Create"}
            </Button>
            <Button variant="outlined" size="large" disableElevation onClick={handleCancel}>Cancel</Button>
          </Stack>
        </Stack>
      </Stack>
    </Container>
  ) 
}