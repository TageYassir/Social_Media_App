"use client"

/** React MUI Imports */
import { Button, colors, Container, MenuItem, Stack, TextField, Typography } from "@mui/material"
/** Next Imports */
import Image from "next/image"
/** React Imports */
import { useState } from "react"
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

  /** Handlers */
  const handleEmailChange = function(event){
    setEmail(event.target.value)
  }

  const handlePasswordChange = function(event){
    setPassword(event.target.value)
  }

  const handlePseudoChange = function(event){
    setPseudo(event.target.value)
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

  /** Actions */
const create = async function(event){
  event.preventDefault()
  setError(null)

  if (!email || !password) {
    setError("Please provide email and password.")
    return
  }

  setLoading(true)
  try {
    const response = await fetch("/api/users?operation=create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email, password, pseudo, country, gender, firstName, lastName
      })
    })

    const data = await response.json()

    if (response.status === 201) {
      // Created successfully — redirect to login page
      router.push("/uis")
      return
    }

    if (response.status === 409) {
      // Email already exists — show message and offer to go to login
      setError(data?.error || "An account with this email already exists. Please login.")
      return
    }

    // other errors
    setError(data?.error || "Registration failed. Please try again.")
  } catch (err) {
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
        <Stack direction={"column"} spacing={1} alignSelf={"stretch"} >
          <TextField value={email} onChange={handleEmailChange}  variant="outlined" placeholder="Email"/>
          <TextField value={password} onChange={handlePasswordChange} variant="outlined" placeholder="Password" type="password"/>
          <TextField value={pseudo} onChange={handlePseudoChange}  variant="outlined" placeholder="Pseudo"/>
          <TextField value={gender} onChange={handleGenderChange} select variant="outlined" placeholder="Gender">
            <MenuItem key={"Female"} value={"Female"} selected>Female</MenuItem>
            <MenuItem key={"Male"} value={"Male"}>Male</MenuItem>
            <MenuItem key={"Unspecified"} value={"Unspecified"}>Unspecified</MenuItem>
          </TextField>
          <TextField value={country} onChange={handleCountryChange} select variant="outlined" placeholder="Country">
            <MenuItem key={"Morocco"} value={"Morocco"} selected>Morocco</MenuItem>
            <MenuItem key={"USA"} value={"USA"}>USA</MenuItem>
            <MenuItem key={"Singapore"} value={"Singapore"}>Singapore</MenuItem>
          </TextField>
          <TextField value={firstName} onChange={handleFirstNameChange} variant="outlined" placeholder="First Name"/>
          <TextField value={lastName} onChange={handleLastNameChange} variant="outlined" placeholder="Last Name"/>

          {error && <Typography color="error">{error}</Typography>}

          <Button variant="contained" size="large" disableElevation onClick={create} disabled={loading}>{loading ? "Creating..." : "Create"}</Button>
          <Button variant="outlined" size="large" disableElevation onClick={handleCancel}>Cancel</Button>
        </Stack>
      </Stack>
    </Container>
  ) 
}